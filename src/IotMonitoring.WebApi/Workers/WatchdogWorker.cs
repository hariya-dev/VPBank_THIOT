using IotMonitoring.Domain.Enums;
using IotMonitoring.Domain.Interfaces.Repositories;
using IotMonitoring.Domain.Interfaces.Services;
using IotMonitoring.WebApi.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace IotMonitoring.WebApi.Workers;

/// <summary>
/// Watchdog: Runs every 60s, scans Redis LastSeen for all devices.
/// If Time.Now - LastSeen > OfflineTimeout → mark Offline, write AlarmLog, push SignalR.
/// </summary>
public class WatchdogWorker : BackgroundService
{
    private readonly ILogger<WatchdogWorker> _logger;
    private readonly ICacheService _cache;
    private readonly IHubContext<MonitoringHub> _hubContext;
    private readonly IServiceScopeFactory _scopeFactory;

    public WatchdogWorker(
        ILogger<WatchdogWorker> logger,
        ICacheService cache,
        IHubContext<MonitoringHub> hubContext,
        IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _cache = cache;
        _hubContext = hubContext;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Wait for system to stabilize
        await Task.Delay(10_000, stoppingToken);
        _logger.LogInformation("Watchdog started. Scanning every 60s.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ScanDevicesAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Watchdog scan error");
            }

            await Task.Delay(60_000, stoppingToken); // Every 60 seconds
        }
    }

    private async Task ScanDevicesAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var deviceRepo = scope.ServiceProvider.GetRequiredService<IDeviceRepository>();
        var alarmRepo = scope.ServiceProvider.GetRequiredService<IAlarmLogRepository>();

        var devices = await deviceRepo.GetActiveDevicesAsync(ct);
        var allTelemetry = await _cache.GetAllTelemetryAsync();
        var onlineDevices = await _cache.GetOnlineDevicesAsync();
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        int offlineCount = 0, onlineCount = 0;

        foreach (var device in devices)
        {
            var gw = device.GatewayIdentify;
            var timeout = device.Setting?.OfflineTimeout ?? 120;

            if (allTelemetry.TryGetValue(gw, out var telemetry))
            {
                var elapsed = now - telemetry.LastSeen;

                if (elapsed > timeout && onlineDevices.Contains(gw))
                {
                    // Device went OFFLINE
                    await _cache.SetDeviceOfflineAsync(gw);
                    offlineCount++;

                    // Write alarm log
                    await alarmRepo.AddAsync(new Domain.Entities.AlarmLog
                    {
                        DeviceId = device.Id,
                        AlarmType = AlarmType.Offline,
                        Severity = AlarmSeverity.Critical,
                        Message = $"Device {gw} offline. Last seen {elapsed}s ago."
                    }, ct);

                    // Push SignalR
                    var statusDto = new
                    {
                        GatewayId = gw,
                        DeviceId = device.Id,
                        Status = DeviceStatus.Offline.ToString(),
                        LastSeen = telemetry.LastSeen
                    };
                    await _hubContext.Clients.Group("all")
                        .SendAsync("DeviceStatusChanged", statusDto, ct);
                    await _hubContext.Clients.Group($"device:{gw}")
                        .SendAsync("DeviceStatusChanged", statusDto, ct);

                    _logger.LogWarning("Device {GatewayId} went OFFLINE (last seen {Elapsed}s ago)", gw, elapsed);
                }
                else if (elapsed <= timeout)
                {
                    onlineCount++;

                    // Check if device was previously offline and just came back
                    if (!onlineDevices.Contains(gw))
                    {
                        await _cache.SetDeviceOnlineAsync(gw);

                        // Write restored alarm
                        await alarmRepo.AddAsync(new Domain.Entities.AlarmLog
                        {
                            DeviceId = device.Id,
                            AlarmType = AlarmType.Restored,
                            Severity = AlarmSeverity.Info,
                            Message = $"Device {gw} came back online."
                        }, ct);

                        var statusDto = new
                        {
                            GatewayId = gw,
                            DeviceId = device.Id,
                            Status = DeviceStatus.Online.ToString(),
                            LastSeen = telemetry.LastSeen
                        };
                        await _hubContext.Clients.Group("all")
                            .SendAsync("DeviceStatusChanged", statusDto, ct);

                        _logger.LogInformation("Device {GatewayId} came back ONLINE", gw);
                    }
                }
            }
            else
            {
                // No telemetry ever received — device is unknown/offline
                if (onlineDevices.Contains(gw))
                {
                    await _cache.SetDeviceOfflineAsync(gw);
                    offlineCount++;
                }
            }
        }

        _logger.LogDebug("Watchdog scan: {Online} online, {Offline} went offline", onlineCount, offlineCount);
    }
}
