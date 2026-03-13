using System.Security.Claims;
using IotMonitoring.Domain.Interfaces.Repositories;
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
    private readonly IUserDeviceRepository _userDeviceRepo;
    private readonly IDeviceRepository _deviceRepo;

    public TelemetryController(ICacheService cache, IUserDeviceRepository userDeviceRepo, IDeviceRepository deviceRepo)
    {
        _cache = cache;
        _userDeviceRepo = userDeviceRepo;
        _deviceRepo = deviceRepo;
    }

    /// <summary>Get all devices' current telemetry from Redis</summary>
    [HttpGet("live")]
    public async Task<IActionResult> GetAllLive()
    {
        var allTelemetry = await _cache.GetAllTelemetryAsync();
        var onlineDevices = await _cache.GetOnlineDevicesAsync();

        // Permission filter for Viewer
        var allowedGatewayIds = await GetAllowedGatewayIdsAsync();
        var filtered = allTelemetry.AsEnumerable();
        if (allowedGatewayIds != null)
            filtered = filtered.Where(kv => allowedGatewayIds.Contains(kv.Key));

        var result = filtered.Select(kv => new
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
        // Permission check
        var allowedGatewayIds = await GetAllowedGatewayIdsAsync();
        if (allowedGatewayIds != null && !allowedGatewayIds.Contains(gatewayId))
            return Forbid();

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

        // Permission filter for Viewer
        var allowedGatewayIds = await GetAllowedGatewayIdsAsync();
        int totalDevices, onlineCount;
        if (allowedGatewayIds != null)
        {
            totalDevices = allowedGatewayIds.Count;
            onlineCount = onlineDevices.Count(g => allowedGatewayIds.Contains(g));
        }
        else
        {
            totalDevices = allTelemetry.Count;
            onlineCount = onlineDevices.Count;
        }

        return Ok(new
        {
            TotalDevices = totalDevices,
            OnlineCount = onlineCount,
            OfflineCount = totalDevices - onlineCount
        });
    }

    /// <summary>Returns null for Admin/Operator, set of allowed gateway IDs for Viewer</summary>
    private async Task<HashSet<string>?> GetAllowedGatewayIdsAsync()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role == "Admin" || role == "Operator") return null;

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null || !Guid.TryParse(userId, out var guid)) return new HashSet<string>();

        var deviceIds = await _userDeviceRepo.GetDeviceIdsForUserAsync(guid);
        var devices = await _deviceRepo.GetByIdsAsync(deviceIds);
        return devices.Select(d => d.GatewayIdentify).ToHashSet();
    }
}
