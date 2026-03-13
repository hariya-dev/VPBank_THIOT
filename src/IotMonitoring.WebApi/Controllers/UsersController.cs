using System.Security.Claims;
using IotMonitoring.Domain.Entities;
using IotMonitoring.Domain.Enums;
using IotMonitoring.Domain.Interfaces.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IotMonitoring.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _userRepo;
    private readonly IUserDeviceRepository _userDeviceRepo;
    private readonly IDeviceRepository _deviceRepo;

    public UsersController(IUserRepository userRepo, IUserDeviceRepository userDeviceRepo, IDeviceRepository deviceRepo)
    {
        _userRepo = userRepo;
        _userDeviceRepo = userDeviceRepo;
        _deviceRepo = deviceRepo;
    }

    /// <summary>List all users</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userRepo.GetAllAsync();
        var result = new List<object>();
        foreach (var u in users)
        {
            var deviceIds = await _userDeviceRepo.GetDeviceIdsForUserAsync(u.Id);
            result.Add(new
            {
                u.Id, u.Username, u.FullName, u.Email,
                Role = u.Role.ToString(), u.ProvinceId, u.IsActive,
                AssignedDeviceCount = deviceIds.Count,
                AssignedDeviceIds = deviceIds
            });
        }
        return Ok(result);
    }

    /// <summary>Get user detail with assigned devices</summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _userRepo.GetByIdAsync(id);
        if (user == null) return NotFound();

        var userDevices = await _userDeviceRepo.GetByUserIdAsync(id);
        return Ok(new
        {
            user.Id, user.Username, user.FullName, user.Email,
            Role = user.Role.ToString(), user.ProvinceId, user.IsActive,
            AssignedDevices = userDevices.Select(ud => new
            {
                ud.DeviceId,
                ud.Device.Name,
                ud.Device.GatewayIdentify,
                Province = ud.Device.Province?.Name,
                ud.AssignedAt
            })
        });
    }

    /// <summary>Update user info</summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request)
    {
        var user = await _userRepo.GetByIdAsync(id);
        if (user == null) return NotFound();

        user.FullName = request.FullName ?? user.FullName;
        user.Email = request.Email ?? user.Email;
        user.ProvinceId = request.ProvinceId;
        if (!string.IsNullOrEmpty(request.Role) && Enum.TryParse<UserRole>(request.Role, out var role))
            user.Role = role;
        if (!string.IsNullOrEmpty(request.Password))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        await _userRepo.UpdateAsync(user);
        return Ok(new { user.Id, user.Username, user.FullName, Role = user.Role.ToString() });
    }

    /// <summary>Delete user</summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _userRepo.DeleteAsync(id);
        return NoContent();
    }

    /// <summary>Get assigned devices for a user</summary>
    [HttpGet("{id}/devices")]
    public async Task<IActionResult> GetDevices(Guid id)
    {
        var userDevices = await _userDeviceRepo.GetByUserIdAsync(id);
        return Ok(userDevices.Select(ud => new
        {
            ud.DeviceId,
            ud.Device.Name,
            ud.Device.GatewayIdentify,
            Province = ud.Device.Province?.Name,
            ud.AssignedAt
        }));
    }

    /// <summary>Replace all assigned devices for a user</summary>
    [HttpPut("{id}/devices")]
    public async Task<IActionResult> SetDevices(Guid id, [FromBody] DeviceAssignmentRequest request)
    {
        var user = await _userRepo.GetByIdAsync(id);
        if (user == null) return NotFound();

        await _userDeviceRepo.ReplaceDevicesAsync(id, request.DeviceIds);
        return Ok(new { message = $"Assigned {request.DeviceIds.Length} devices to user {user.Username}" });
    }

    /// <summary>Add devices to user assignment</summary>
    [HttpPost("{id}/devices")]
    public async Task<IActionResult> AddDevices(Guid id, [FromBody] DeviceAssignmentRequest request)
    {
        var user = await _userRepo.GetByIdAsync(id);
        if (user == null) return NotFound();

        await _userDeviceRepo.AssignDevicesAsync(id, request.DeviceIds);
        return Ok(new { message = $"Added {request.DeviceIds.Length} devices" });
    }

    /// <summary>Remove devices from user assignment</summary>
    [HttpDelete("{id}/devices")]
    public async Task<IActionResult> RemoveDevices(Guid id, [FromBody] DeviceAssignmentRequest request)
    {
        await _userDeviceRepo.RemoveDevicesAsync(id, request.DeviceIds);
        return Ok(new { message = $"Removed {request.DeviceIds.Length} devices" });
    }
}

public record UpdateUserRequest(string? FullName, string? Email, string? Role, string? Password, int? ProvinceId);
public record DeviceAssignmentRequest(int[] DeviceIds);
