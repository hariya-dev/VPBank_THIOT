using IotMonitoring.Domain.Enums;
using IotMonitoring.Domain.Events;
using IotMonitoring.Domain.Interfaces.Repositories;
using IotMonitoring.Domain.Interfaces.Services;
using IotMonitoring.WebApi.Hubs;
using MediatR;
using Microsoft.AspNetCore.SignalR;

namespace IotMonitoring.WebApi.Workers;

/// <summary>
/// Consumer worker: Reads TelemetryRaw from Channel, updates Redis, checks alarms, and pushes SignalR.
/// This is the heart of the real-time processing pipeline.
/// </summary>
public class TelemetryProcessorWorker : BackgroundService
{
    private readonly ILogger<TelemetryProcessorWorker> _logger;
    private readonly TelemetryChannel _channel;
    private readonly ICacheService _cache;
    private readonly IHubContext<MonitoringHub> _hubContext;
    private readonly IServiceScopeFactory _scopeFactory;

    // In-memory map: gateway_id → deviceId (loaded from DB)
    private Dictionary<string, int> _gatewayToDeviceId = new();
    // In-memory map: gateway_id → provinceId (for SignalR group routing)
    private Dictionary<string, int> _gatewayToProvinceId = new();

    public TelemetryProcessorWorker(
        ILogger<TelemetryProcessorWorker> logger,
        TelemetryChannel channel,
        ICacheService cache,
        IHubContext<MonitoringHub> hubContext,
        IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _channel = channel;
        _cache = cache;
        _hubContext = hubContext;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Load device mappings from DB
        await LoadDeviceMappingsAsync(stoppingToken);

        _logger.LogInformation("TelemetryProcessor started. Listening on Channel...");

        await foreach (var raw in _channel.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await ProcessTelemetryAsync(raw, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing telemetry for {GatewayId}", raw.GatewayId);
            }
        }
    }

    private async Task ProcessTelemetryAsync(TelemetryRaw raw, CancellationToken ct)
    {
        // 1. Update Redis telemetry hash
        await _cache.SetTelemetryAsync(raw.GatewayId, raw.Temperature, raw.Humidity, raw.ReceivedTimestamp);

        // 2. Mark device online
        await _cache.SetDeviceOnlineAsync(raw.GatewayId);

        // 3. Get device info for alarm check and SignalR routing
        if (!_gatewayToDeviceId.TryGetValue(raw.GatewayId, out var deviceId))
        {
            // Device not in cache, try to reload
            await LoadDeviceMappingsAsync(ct);
            _gatewayToDeviceId.TryGetValue(raw.GatewayId, out deviceId);
        }

        // 4. Alarm check (cross-reference with thresholds in Redis)
        if (deviceId > 0)
        {
            await CheckAlarmsAsync(raw, deviceId, ct);
        }

        // 5. Push SignalR to subscribed clients
        var telemetryDto = new
        {
            raw.GatewayId,
            DeviceId = deviceId,
            raw.Temperature,
            raw.Humidity,
            Timestamp = raw.ReceivedTimestamp,
            Status = DeviceStatus.Online.ToString()
        };

        // Push to device-specific group
        await _hubContext.Clients.Group($"device:{raw.GatewayId}")
            .SendAsync("ReceiveTelemetry", telemetryDto, ct);

        // Push to province group
        if (_gatewayToProvinceId.TryGetValue(raw.GatewayId, out var provinceId))
        {
            await _hubContext.Clients.Group($"province:{provinceId}")
                .SendAsync("ReceiveTelemetry", telemetryDto, ct);
        }

        // Push to "all" group
        await _hubContext.Clients.Group("all")
            .SendAsync("ReceiveTelemetry", telemetryDto, ct);
    }

    private async Task CheckAlarmsAsync(TelemetryRaw raw, int deviceId, CancellationToken ct)
    {
        var config = await _cache.GetDeviceConfigAsync(raw.GatewayId);
        if (config == null) return;

        var (tempH, tempL, humiH, humiL, _, _) = config.Value;
        var hysteresis = 2.0; // Could be loaded from config

        // Check Temperature High
        if (raw.Temperature.HasValue)
        {
            await EvaluateAlarmAsync(raw, deviceId, "TempHigh",
                raw.Temperature.Value, tempH, hysteresis,
                raw.Temperature.Value >= tempH,
                raw.Temperature.Value <= (tempH - hysteresis),
                AlarmType.TempHigh, AlarmSeverity.Critical, ct);

            // Check Temperature Low
            await EvaluateAlarmAsync(raw, deviceId, "TempLow",
                raw.Temperature.Value, tempL, hysteresis,
                raw.Temperature.Value <= tempL,
                raw.Temperature.Value >= (tempL + hysteresis),
                AlarmType.TempLow, AlarmSeverity.Warning, ct);
        }

        // Check Humidity High
        if (raw.Humidity.HasValue)
        {
            await EvaluateAlarmAsync(raw, deviceId, "HumiHigh",
                raw.Humidity.Value, humiH, hysteresis,
                raw.Humidity.Value >= humiH,
                raw.Humidity.Value <= (humiH - hysteresis),
                AlarmType.HumiHigh, AlarmSeverity.Warning, ct);

            // Check Humidity Low
            await EvaluateAlarmAsync(raw, deviceId, "HumiLow",
                raw.Humidity.Value, humiL, hysteresis,
                raw.Humidity.Value <= humiL,
                raw.Humidity.Value >= (humiL + hysteresis),
                AlarmType.HumiLow, AlarmSeverity.Warning, ct);
        }
    }

    private async Task EvaluateAlarmAsync(
        TelemetryRaw raw, int deviceId, string alarmKey,
        double currentValue, double threshold, double hysteresis,
        bool triggerCondition, bool clearCondition,
        AlarmType alarmType, AlarmSeverity severity, CancellationToken ct)
    {
        var isCurrentlyAlarming = await _cache.GetAlarmStateAsync(raw.GatewayId, alarmKey);

        if (!isCurrentlyAlarming && triggerCondition)
        {
            // SET alarm (transition 0→1)
            await _cache.SetAlarmStateAsync(raw.GatewayId, alarmKey, true);

            // Write to DB
            using var scope = _scopeFactory.CreateScope();
            var alarmRepo = scope.ServiceProvider.GetRequiredService<IAlarmLogRepository>();
            await alarmRepo.AddAsync(new Domain.Entities.AlarmLog
            {
                DeviceId = deviceId,
                AlarmType = alarmType,
                Severity = severity,
                Value = currentValue,
                Threshold = threshold,
                Message = $"{alarmType}: Value={currentValue:F1}, Threshold={threshold:F1}"
            }, ct);

            // Push alarm via SignalR
            var alarmDto = new
            {
                raw.GatewayId,
                DeviceId = deviceId,
                AlarmType = alarmType.ToString(),
                Severity = severity.ToString(),
                Value = currentValue,
                Threshold = threshold,
                Timestamp = raw.ReceivedTimestamp
            };
            await _hubContext.Clients.Group("all").SendAsync("ReceiveAlarm", alarmDto, ct);
            await _hubContext.Clients.Group($"device:{raw.GatewayId}").SendAsync("ReceiveAlarm", alarmDto, ct);

            _logger.LogWarning("ALARM {AlarmType} for {GatewayId}: Value={Value:F1}, Threshold={Threshold:F1}",
                alarmType, raw.GatewayId, currentValue, threshold);
        }
        else if (isCurrentlyAlarming && clearCondition)
        {
            // CLEAR alarm (transition 1→0) — Hysteresis applied
            await _cache.SetAlarmStateAsync(raw.GatewayId, alarmKey, false);

            _logger.LogInformation("ALARM CLEARED {AlarmType} for {GatewayId}: Value={Value:F1}",
                alarmType, raw.GatewayId, currentValue);
        }
    }

    private async Task LoadDeviceMappingsAsync(CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var deviceRepo = scope.ServiceProvider.GetRequiredService<IDeviceRepository>();
            var devices = await deviceRepo.GetActiveDevicesAsync(ct);

            var gwToId = new Dictionary<string, int>();
            var gwToProvince = new Dictionary<string, int>();
            foreach (var d in devices)
            {
                gwToId[d.GatewayIdentify] = d.Id;
                gwToProvince[d.GatewayIdentify] = d.ProvinceId;
            }

            _gatewayToDeviceId = gwToId;
            _gatewayToProvinceId = gwToProvince;

            _logger.LogInformation("Loaded {Count} device mappings", devices.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load device mappings");
        }
    }
}
