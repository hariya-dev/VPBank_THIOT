using System.Text;
using System.Text.Json;
using IotMonitoring.Domain.Interfaces.Repositories;
using MQTTnet;
using MQTTnet.Client;
using MQTTnet.Protocol;

namespace IotMonitoring.WebApi.Workers;

/// <summary>
/// Background service that connects to MQTT broker, subscribes to per-device topics,
/// and parses incoming JSON payloads using Utf8JsonReader (zero-allocation).
/// Parsed data is pushed into TelemetryChannel for downstream processing.
/// </summary>
public class MqttReceiverWorker : BackgroundService
{
    private readonly ILogger<MqttReceiverWorker> _logger;
    private readonly IConfiguration _config;
    private readonly TelemetryChannel _channel;
    private readonly IServiceScopeFactory _scopeFactory;
    private IMqttClient? _mqttClient;

    // Maps MQTT topic → gateway_id for fast lookup
    private readonly Dictionary<string, string> _topicToGateway = new();

    public MqttReceiverWorker(
        ILogger<MqttReceiverWorker> logger,
        IConfiguration config,
        TelemetryChannel channel,
        IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _config = config;
        _channel = channel;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Wait a bit for other services to initialize
        await Task.Delay(2000, stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ConnectAndSubscribeAsync(stoppingToken);

                // Keep alive until cancellation or disconnect
                while (_mqttClient?.IsConnected == true && !stoppingToken.IsCancellationRequested)
                {
                    await Task.Delay(5000, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MQTT connection error. Reconnecting in 5s...");
                await Task.Delay(5000, stoppingToken);
            }
        }
    }

    private async Task ConnectAndSubscribeAsync(CancellationToken ct)
    {
        var factory = new MqttFactory();
        _mqttClient = factory.CreateMqttClient();

        var server = _config["Mqtt:Server"] ?? "113.161.76.105";
        var port = int.Parse(_config["Mqtt:Port"] ?? "1883");
        var username = _config["Mqtt:Username"] ?? "admin";
        var password = _config["Mqtt:Password"] ?? "public";
        var clientId = _config["Mqtt:ClientId"] ?? $"IotMonitoring_{Environment.MachineName}";

        var options = new MqttClientOptionsBuilder()
            .WithTcpServer(server, port)
            .WithCredentials(username, password)
            .WithClientId(clientId)
            .WithCleanSession(true)
            .WithKeepAlivePeriod(TimeSpan.FromSeconds(30))
            .Build();

        // Handle incoming messages
        _mqttClient.ApplicationMessageReceivedAsync += OnMessageReceivedAsync;

        // Handle disconnection
        _mqttClient.DisconnectedAsync += e =>
        {
            if (e.ClientWasConnected)
                _logger.LogWarning("MQTT disconnected: {Reason}", e.Reason);
            return Task.CompletedTask;
        };

        _logger.LogInformation("Connecting to MQTT broker {Server}:{Port}...", server, port);
        await _mqttClient.ConnectAsync(options, ct);
        _logger.LogInformation("MQTT connected successfully");

        // Load all active devices and subscribe to their topics
        await SubscribeToDeviceTopicsAsync(ct);
    }

    private async Task SubscribeToDeviceTopicsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var deviceRepo = scope.ServiceProvider.GetRequiredService<IDeviceRepository>();
        var devices = await deviceRepo.GetActiveDevicesAsync(ct);

        _topicToGateway.Clear();

        var subscribeBuilder = new MqttFactory().CreateSubscribeOptionsBuilder();
        foreach (var device in devices)
        {
            if (!string.IsNullOrEmpty(device.MqttTopic))
            {
                _topicToGateway[device.MqttTopic] = device.GatewayIdentify;
                subscribeBuilder.WithTopicFilter(f => f
                    .WithTopic(device.MqttTopic)
                    .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtMostOnce));
            }
        }

        if (_topicToGateway.Count > 0 && _mqttClient != null)
        {
            await _mqttClient.SubscribeAsync(subscribeBuilder.Build(), ct);
            _logger.LogInformation("Subscribed to {Count} device topics", _topicToGateway.Count);
        }
        else
        {
            _logger.LogWarning("No active devices found to subscribe");
        }
    }

    private Task OnMessageReceivedAsync(MqttApplicationMessageReceivedEventArgs e)
    {
        try
        {
            var topic = e.ApplicationMessage.Topic;
            var payload = e.ApplicationMessage.PayloadSegment;

            if (payload.Array == null || payload.Count == 0) return Task.CompletedTask;

            // Resolve gateway_id from topic map
            string? gatewayId = null;
            if (_topicToGateway.TryGetValue(topic, out var mappedGw))
            {
                gatewayId = mappedGw;
            }

            // Zero-allocation JSON parsing with Utf8JsonReader
            var reader = new Utf8JsonReader(payload);
            double? temp = null;
            double? humi = null;
            string? parsedGateway = null;

            while (reader.Read())
            {
                if (reader.TokenType == JsonTokenType.PropertyName)
                {
                    var propName = reader.GetString();
                    if (!reader.Read()) break;

                    switch (propName)
                    {
                        case "gateway_indentify":
                        case "gateway_identify":
                        case "gatewayId":
                            parsedGateway = reader.GetString();
                            break;
                        case "Temp":
                        case "temp":
                        case "temperature":
                            if (reader.TokenType == JsonTokenType.Number)
                                temp = reader.GetDouble();
                            break;
                        case "Humi":
                        case "humi":
                        case "humidity":
                            if (reader.TokenType == JsonTokenType.Number)
                                humi = reader.GetDouble();
                            break;
                    }
                }
            }

            // Use parsed gateway or topic-mapped gateway
            gatewayId ??= parsedGateway;
            if (string.IsNullOrEmpty(gatewayId)) return Task.CompletedTask;

            // Push to Channel (non-blocking due to DropOldest)
            var raw = new TelemetryRaw(gatewayId, temp, humi);
            _channel.Writer.TryWrite(raw);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing MQTT message from topic {Topic}", e.ApplicationMessage.Topic);
        }

        return Task.CompletedTask;
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_mqttClient?.IsConnected == true)
        {
            await _mqttClient.DisconnectAsync(cancellationToken: cancellationToken);
            _logger.LogInformation("MQTT client disconnected gracefully");
        }
        _mqttClient?.Dispose();
        await base.StopAsync(cancellationToken);
    }
}
