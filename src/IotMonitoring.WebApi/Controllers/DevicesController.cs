using IotMonitoring.Domain.Entities;
using IotMonitoring.Domain.Interfaces.Repositories;
using IotMonitoring.Domain.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IotMonitoring.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DevicesController : ControllerBase
{
    private readonly IDeviceRepository _deviceRepo;
    private readonly IDeviceSettingRepository _settingRepo;
    private readonly ICacheService _cache;

    public DevicesController(IDeviceRepository deviceRepo, IDeviceSettingRepository settingRepo, ICacheService cache)
    {
        _deviceRepo = deviceRepo;
        _settingRepo = settingRepo;
        _cache = cache;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? provinceId, [FromQuery] string? status, [FromQuery] string? search)
    {
        var devices = await _deviceRepo.GetAllAsync(provinceId);

        if (!string.IsNullOrEmpty(search))
            devices = devices.Where(d => d.Name.Contains(search, StringComparison.OrdinalIgnoreCase)
                || d.GatewayIdentify.Contains(search, StringComparison.OrdinalIgnoreCase)).ToList();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<Domain.Enums.DeviceStatus>(status, out var s))
            devices = devices.Where(d => d.Status == s).ToList();

        return Ok(devices.Select(d => MapDeviceDto(d)));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var device = await _deviceRepo.GetByIdAsync(id);
        return device == null ? NotFound() : Ok(MapDeviceDto(device));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<IActionResult> Create([FromBody] DeviceRequest request)
    {
        var device = new Device
        {
            ProvinceId = request.ProvinceId,
            GatewayIdentify = request.GatewayIdentify,
            MqttTopic = request.MqttTopic,
            Name = request.Name,
            Description = request.Description,
            Latitude = request.Latitude,
            Longitude = request.Longitude
        };

        await _deviceRepo.AddAsync(device);

        // Create default settings
        var setting = new DeviceSetting { DeviceId = device.Id };
        await _settingRepo.UpsertAsync(setting);

        // Sync config to Redis
        await _cache.SetDeviceConfigAsync(device.GatewayIdentify,
            setting.TempHigh, setting.TempLow, setting.HumiHigh, setting.HumiLow,
            setting.LogCycleSeconds, setting.OfflineTimeout);

        return CreatedAtAction(nameof(GetById), new { id = device.Id }, MapDeviceDto(device));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<IActionResult> Update(int id, [FromBody] DeviceRequest request)
    {
        var device = await _deviceRepo.GetByIdAsync(id);
        if (device == null) return NotFound();

        device.ProvinceId = request.ProvinceId;
        device.GatewayIdentify = request.GatewayIdentify;
        device.MqttTopic = request.MqttTopic;
        device.Name = request.Name;
        device.Description = request.Description;
        device.Latitude = request.Latitude;
        device.Longitude = request.Longitude;
        await _deviceRepo.UpdateAsync(device);

        return Ok(MapDeviceDto(device));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _deviceRepo.DeleteAsync(id);
        return NoContent();
    }

    // ── Settings ──────────────────────────────────────────────

    [HttpGet("{id}/settings")]
    public async Task<IActionResult> GetSettings(int id)
    {
        var setting = await _settingRepo.GetByDeviceIdAsync(id);
        return setting == null ? NotFound() : Ok(setting);
    }

    [HttpPut("{id}/settings")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<IActionResult> UpdateSettings(int id, [FromBody] DeviceSettingRequest request)
    {
        var device = await _deviceRepo.GetByIdAsync(id);
        if (device == null) return NotFound();

        var setting = new DeviceSetting
        {
            DeviceId = id,
            TempHigh = request.TempHigh,
            TempLow = request.TempLow,
            HumiHigh = request.HumiHigh,
            HumiLow = request.HumiLow,
            LogCycleSeconds = request.LogCycleSeconds,
            OfflineTimeout = request.OfflineTimeout
        };

        await _settingRepo.UpsertAsync(setting);

        // Sync to Redis immediately
        await _cache.SetDeviceConfigAsync(device.GatewayIdentify,
            setting.TempHigh, setting.TempLow, setting.HumiHigh, setting.HumiLow,
            setting.LogCycleSeconds, setting.OfflineTimeout);

        return Ok(setting);
    }

    private static object MapDeviceDto(Device d) => new
    {
        d.Id, d.ProvinceId, d.GatewayIdentify, d.MqttTopic,
        d.Name, d.Description, d.Latitude, d.Longitude,
        Status = d.Status.ToString(), d.IsActive,
        Province = d.Province != null ? new { d.Province.Id, d.Province.Name } : null,
        Setting = d.Setting != null ? new
        {
            d.Setting.TempHigh, d.Setting.TempLow,
            d.Setting.HumiHigh, d.Setting.HumiLow,
            d.Setting.LogCycleSeconds, d.Setting.OfflineTimeout
        } : null
    };
}

public record DeviceRequest(int ProvinceId, string GatewayIdentify, string MqttTopic, string Name,
    string? Description = null, double? Latitude = null, double? Longitude = null);

public record DeviceSettingRequest(double TempHigh = 35, double TempLow = 10,
    double HumiHigh = 80, double HumiLow = 30, int LogCycleSeconds = 300, int OfflineTimeout = 120);
