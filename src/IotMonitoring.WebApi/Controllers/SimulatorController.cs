using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MQTTnet;
using MQTTnet.Client;
using System.Text;
using System.Text.Json;

namespace IotMonitoring.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SimulatorController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILogger<SimulatorController> _logger;

    public SimulatorController(IConfiguration config, ILogger<SimulatorController> logger)
    {
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// Simulate MQTT telemetry for all devices. Sends a single batch.
    /// </summary>
    [HttpPost("publish")]
    [AllowAnonymous]
    public async Task<IActionResult> PublishBatch(
        [FromQuery] int deviceCount = 315,
        [FromQuery] double tempMin = 18,
        [FromQuery] double tempMax = 32,
        [FromQuery] double humiMin = 40,
        [FromQuery] double humiMax = 75)
    {
        var mqttServer = _config["Mqtt:Server"] ?? "113.161.76.105";
        var mqttPort = int.Parse(_config["Mqtt:Port"] ?? "1883");
        var mqttUser = _config["Mqtt:Username"] ?? "admin";
        var mqttPass = _config["Mqtt:Password"] ?? "public";

        var factory = new MqttFactory();
        using var client = factory.CreateMqttClient();

        var options = new MqttClientOptionsBuilder()
            .WithTcpServer(mqttServer, mqttPort)
            .WithCredentials(mqttUser, mqttPass)
            .WithClientId($"Simulator_{Guid.NewGuid():N}")
            .WithCleanSession()
            .Build();

        await client.ConnectAsync(options);
        _logger.LogInformation("Simulator connected to MQTT broker {Server}:{Port}", mqttServer, mqttPort);

        var rng = new Random();
        var sent = 0;
        var errors = 0;
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        for (int i = 1; i <= deviceCount; i++)
        {
            try
            {
                var gwId = $"GW-{i:D4}";
                var temp = Math.Round(tempMin + rng.NextDouble() * (tempMax - tempMin), 1);
                var humi = Math.Round(humiMin + rng.NextDouble() * (humiMax - humiMin), 1);

                var payload = JsonSerializer.Serialize(new
                {
                    temperature = temp,
                    humidity = humi,
                    timestamp = ts
                });

                var msg = new MqttApplicationMessageBuilder()
                    .WithTopic($"devices/{gwId}/telemetry")
                    .WithPayload(Encoding.UTF8.GetBytes(payload))
                    .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtMostOnce)
                    .Build();

                await client.PublishAsync(msg);
                sent++;
            }
            catch (Exception ex)
            {
                errors++;
                _logger.LogWarning(ex, "Failed to publish for device {Index}", i);
            }
        }

        await client.DisconnectAsync();

        _logger.LogInformation("Simulator batch complete: {Sent}/{Total} sent, {Errors} errors", sent, deviceCount, errors);

        return Ok(new
        {
            status = "completed",
            sent,
            errors,
            deviceCount,
            tempRange = $"{tempMin}-{tempMax}°C",
            humiRange = $"{humiMin}-{humiMax}%",
            timestamp = ts
        });
    }

    /// <summary>
    /// Simulate alarm-triggering data (temperature > 35°C or < 10°C)
    /// </summary>
    [HttpPost("publish-alarm")]
    [AllowAnonymous]
    public async Task<IActionResult> PublishAlarmTrigger(
        [FromQuery] int deviceCount = 10,
        [FromQuery] double temperature = 42.5,
        [FromQuery] double humidity = 85.0)
    {
        var mqttServer = _config["Mqtt:Server"] ?? "113.161.76.105";
        var mqttPort = int.Parse(_config["Mqtt:Port"] ?? "1883");

        var factory = new MqttFactory();
        using var client = factory.CreateMqttClient();

        var options = new MqttClientOptionsBuilder()
            .WithTcpServer(mqttServer, mqttPort)
            .WithCredentials(_config["Mqtt:Username"] ?? "admin", _config["Mqtt:Password"] ?? "public")
            .WithClientId($"AlarmSim_{Guid.NewGuid():N}")
            .WithCleanSession()
            .Build();

        await client.ConnectAsync(options);

        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var sent = 0;

        for (int i = 1; i <= deviceCount; i++)
        {
            var gwId = $"GW-{i:D4}";
            var payload = JsonSerializer.Serialize(new
            {
                temperature,
                humidity,
                timestamp = ts
            });

            var msg = new MqttApplicationMessageBuilder()
                .WithTopic($"devices/{gwId}/telemetry")
                .WithPayload(Encoding.UTF8.GetBytes(payload))
                .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtMostOnce)
                .Build();

            await client.PublishAsync(msg);
            sent++;
        }

        await client.DisconnectAsync();

        _logger.LogInformation("Alarm simulation: {Sent} devices with temp={Temp}°C, humi={Humi}%", sent, temperature, humidity);

        return Ok(new
        {
            status = "alarm_triggered",
            sent,
            temperature,
            humidity,
            message = $"Sent {sent} devices with values exceeding thresholds (TempHigh=35, HumiHigh=80)"
        });
    }

    /// <summary>
    /// Start continuous simulation (background task publishing every N seconds)
    /// </summary>
    [HttpPost("start-continuous")]
    [AllowAnonymous]
    public async Task<IActionResult> StartContinuous(
        [FromQuery] int deviceCount = 315,
        [FromQuery] int intervalSeconds = 30,
        [FromQuery] int durationMinutes = 5)
    {
        var mqttServer = _config["Mqtt:Server"] ?? "113.161.76.105";
        var mqttPort = int.Parse(_config["Mqtt:Port"] ?? "1883");

        // Run in background
        _ = Task.Run(async () =>
        {
            var factory = new MqttFactory();
            using var client = factory.CreateMqttClient();

            var options = new MqttClientOptionsBuilder()
                .WithTcpServer(mqttServer, mqttPort)
                .WithCredentials(_config["Mqtt:Username"] ?? "admin", _config["Mqtt:Password"] ?? "public")
                .WithClientId($"ContinuousSim_{Guid.NewGuid():N}")
                .WithCleanSession()
                .Build();

            await client.ConnectAsync(options);
            _logger.LogInformation("Continuous simulator started: {Count} devices every {Interval}s for {Duration}min",
                deviceCount, intervalSeconds, durationMinutes);

            var endTime = DateTime.UtcNow.AddMinutes(durationMinutes);
            var rng = new Random();
            var totalSent = 0;

            while (DateTime.UtcNow < endTime)
            {
                var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                for (int i = 1; i <= deviceCount; i++)
                {
                    var gwId = $"GW-{i:D4}";
                    var temp = Math.Round(20.0 + rng.NextDouble() * 10 + (rng.NextDouble() - 0.5) * 4, 1);
                    var humi = Math.Round(50.0 + rng.NextDouble() * 20 + (rng.NextDouble() - 0.5) * 10, 1);

                    var payload = JsonSerializer.Serialize(new { temperature = temp, humidity = humi, timestamp = ts });
                    var msg = new MqttApplicationMessageBuilder()
                        .WithTopic($"devices/{gwId}/telemetry")
                        .WithPayload(Encoding.UTF8.GetBytes(payload))
                        .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtMostOnce)
                        .Build();

                    await client.PublishAsync(msg);
                    totalSent++;
                }

                _logger.LogInformation("Continuous sim batch: {Count} msgs sent (total: {Total})", deviceCount, totalSent);
                await Task.Delay(intervalSeconds * 1000);
            }

            await client.DisconnectAsync();
            _logger.LogInformation("Continuous simulator finished. Total messages: {Total}", totalSent);
        });

        return Ok(new
        {
            status = "started",
            deviceCount,
            intervalSeconds,
            durationMinutes,
            estimatedMessages = deviceCount * (durationMinutes * 60 / intervalSeconds),
            message = $"Background simulation running for {durationMinutes} minutes"
        });
    }
}
