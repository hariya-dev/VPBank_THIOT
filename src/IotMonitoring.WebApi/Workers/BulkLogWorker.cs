using IotMonitoring.Domain.Entities;
using IotMonitoring.Domain.Enums;
using IotMonitoring.Domain.Interfaces.Repositories;
using IotMonitoring.Domain.Interfaces.Services;

namespace IotMonitoring.WebApi.Workers;

/// <summary>
/// Configurable Bulk Log Worker: Periodically reads Redis telemetry snapshots
/// and bulk-inserts them into MSSQL DataLogs using SqlBulkCopy.
/// Each device has its own LogCycleSeconds — worker ticks every 10s and checks per-device timers.
/// </summary>
public class BulkLogWorker : BackgroundService
{
    private readonly ILogger<BulkLogWorker> _logger;
    private readonly ICacheService _cache;
    private readonly IBulkInsertService _bulkInsert;
    private readonly IServiceScopeFactory _scopeFactory;

    // Per-device last log time tracker
    private readonly Dictionary<string, DateTime> _lastLogTime = new();
    // Per-device log cycle (seconds), loaded from Redis config
    private Dictionary<string, int> _logCycles = new();
    // gateway → deviceId mapping
    private Dictionary<string, int> _gatewayToDeviceId = new();

    private DateTime _lastConfigRefresh = DateTime.MinValue;

    public BulkLogWorker(
        ILogger<BulkLogWorker> logger,
        ICacheService cache,
        IBulkInsertService bulkInsert,
        IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _cache = cache;
        _bulkInsert = bulkInsert;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(15_000, stoppingToken); // Wait for system init
        _logger.LogInformation("BulkLogWorker started. Tick every 10s.");

        await RefreshConfigAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Refresh config every 5 minutes
                if ((DateTime.UtcNow - _lastConfigRefresh).TotalMinutes >= 5)
                {
                    await RefreshConfigAsync(stoppingToken);
                }

                await ProcessBulkLogAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "BulkLogWorker error");
            }

            await Task.Delay(10_000, stoppingToken); // Tick every 10 seconds
        }
    }

    private async Task ProcessBulkLogAsync(CancellationToken ct)
    {
        var now = IotMonitoring.Domain.Common.TimeHelper.VnNow;
        var allTelemetry = await _cache.GetAllTelemetryAsync();
        var batch = new List<DataLog>();

        foreach (var (gatewayId, telemetry) in allTelemetry)
        {
            if (!_gatewayToDeviceId.TryGetValue(gatewayId, out var deviceId)) continue;

            var logCycle = _logCycles.GetValueOrDefault(gatewayId, 300); // Default 5 min
            var lastLog = _lastLogTime.GetValueOrDefault(gatewayId, DateTime.MinValue);

            if ((now - lastLog).TotalSeconds >= logCycle)
            {
                batch.Add(new DataLog
                {
                    DeviceId = deviceId,
                    Temperature = telemetry.Temp,
                    Humidity = telemetry.Humi,
                    Quality = DataQuality.Good,
                    CreatedAt = now
                });
                _lastLogTime[gatewayId] = now;
            }
        }

        if (batch.Count > 0)
        {
            try
            {
                await _bulkInsert.BulkInsertDataLogsAsync(batch, ct);
                _logger.LogInformation("BulkLog inserted {Count} records", batch.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "BulkLog insert failed for {Count} records. Writing to dead-letter.", batch.Count);
                await WriteDeadLetterAsync(batch);
            }
        }
    }

    private async Task RefreshConfigAsync(CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var deviceRepo = scope.ServiceProvider.GetRequiredService<IDeviceRepository>();
            var devices = await deviceRepo.GetActiveDevicesAsync(ct);

            var cycles = new Dictionary<string, int>();
            var gwToId = new Dictionary<string, int>();

            foreach (var device in devices)
            {
                var gw = device.GatewayIdentify;
                gwToId[gw] = device.Id;
                cycles[gw] = device.Setting?.LogCycleSeconds ?? 300;

                // Also sync config to Redis
                if (device.Setting != null)
                {
                    await _cache.SetDeviceConfigAsync(gw,
                        device.Setting.TempHigh, device.Setting.TempLow,
                        device.Setting.HumiHigh, device.Setting.HumiLow,
                        device.Setting.LogCycleSeconds, device.Setting.OfflineTimeout);
                }
            }

            _logCycles = cycles;
            _gatewayToDeviceId = gwToId;
            _lastConfigRefresh = DateTime.UtcNow;

            _logger.LogInformation("BulkLogWorker config refreshed: {Count} devices", devices.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh BulkLogWorker config");
        }
    }

    private async Task WriteDeadLetterAsync(List<DataLog> failedBatch)
    {
        try
        {
            var dir = Path.Combine(AppContext.BaseDirectory, "dead-letters");
            Directory.CreateDirectory(dir);
            var fileName = $"bulk_{DateTime.UtcNow:yyyyMMdd_HHmmss}.json";
            var json = System.Text.Json.JsonSerializer.Serialize(failedBatch.Select(l => new
            {
                l.DeviceId,
                l.Temperature,
                l.Humidity,
                l.Quality,
                l.CreatedAt
            }));
            await File.WriteAllTextAsync(Path.Combine(dir, fileName), json);
            _logger.LogWarning("Dead letter written: {FileName} ({Count} records)", fileName, failedBatch.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write dead letter file");
        }
    }
}
