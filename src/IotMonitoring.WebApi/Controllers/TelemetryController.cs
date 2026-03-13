using IotMonitoring.Domain.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IotMonitoring.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TelemetryController : ControllerBase
{
    private readonly ICacheService _cache;

    public TelemetryController(ICacheService cache) => _cache = cache;

    /// <summary>Get all devices' current telemetry from Redis</summary>
    [HttpGet("live")]
    public async Task<IActionResult> GetAllLive()
    {
        var allTelemetry = await _cache.GetAllTelemetryAsync();
        var onlineDevices = await _cache.GetOnlineDevicesAsync();

        var result = allTelemetry.Select(kv => new
        {
            GatewayId = kv.Key,
            Temperature = kv.Value.Temp,
            Humidity = kv.Value.Humi,
            LastSeen = kv.Value.LastSeen,
            IsOnline = onlineDevices.Contains(kv.Key)
        });

        return Ok(result);
    }

    /// <summary>Get a specific device's current telemetry from Redis</summary>
    [HttpGet("live/{gatewayId}")]
    public async Task<IActionResult> GetDeviceLive(string gatewayId)
    {
        var telemetry = await _cache.GetTelemetryAsync(gatewayId);
        if (telemetry == null) return NotFound();

        var isOnline = await _cache.IsDeviceOnlineAsync(gatewayId);
        return Ok(new
        {
            GatewayId = gatewayId,
            Temperature = telemetry.Value.Temp,
            Humidity = telemetry.Value.Humi,
            LastSeen = telemetry.Value.LastSeen,
            IsOnline = isOnline
        });
    }

    /// <summary>Dashboard summary: total, online, offline, alarm count</summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var allTelemetry = await _cache.GetAllTelemetryAsync();
        var onlineDevices = await _cache.GetOnlineDevicesAsync();

        return Ok(new
        {
            TotalDevices = allTelemetry.Count,
            OnlineCount = onlineDevices.Count,
            OfflineCount = allTelemetry.Count - onlineDevices.Count
        });
    }
}
