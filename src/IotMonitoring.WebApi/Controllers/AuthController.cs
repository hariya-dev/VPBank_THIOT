using System.Security.Claims;
using IotMonitoring.Domain.Entities;
using IotMonitoring.Domain.Enums;
using IotMonitoring.Domain.Interfaces.Repositories;
using IotMonitoring.Domain.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IotMonitoring.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUserRepository _userRepo;
    private readonly ITokenService _tokenService;
    private readonly IConfiguration _config;

    public AuthController(IUserRepository userRepo, ITokenService tokenService, IConfiguration config)
    {
        _userRepo = userRepo;
        _tokenService = tokenService;
        _config = config;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userRepo.GetByUsernameAsync(request.Username);
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid username or password" });

        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(
            int.Parse(_config["Jwt:RefreshTokenExpiryDays"] ?? "7"));
        await _userRepo.UpdateAsync(user);

        return Ok(new
        {
            accessToken,
            refreshToken,
            user = new { user.Id, user.Username, user.FullName, user.Email, Role = user.Role.ToString() }
        });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        var principal = _tokenService.GetPrincipalFromExpiredToken(request.AccessToken);
        if (principal == null) return Unauthorized();

        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null || !Guid.TryParse(userId, out var guid)) return Unauthorized();

        var user = await _userRepo.GetByIdAsync(guid);
        if (user == null || user.RefreshToken != request.RefreshToken || user.RefreshTokenExpiry <= DateTime.UtcNow)
            return Unauthorized(new { message = "Invalid refresh token" });

        var newAccessToken = _tokenService.GenerateAccessToken(user);
        var newRefreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(
            int.Parse(_config["Jwt:RefreshTokenExpiryDays"] ?? "7"));
        await _userRepo.UpdateAsync(user);

        return Ok(new { accessToken = newAccessToken, refreshToken = newRefreshToken });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var existing = await _userRepo.GetByUsernameAsync(request.Username);
        if (existing != null) return Conflict(new { message = "Username already exists" });

        var user = new User
        {
            Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            Email = request.Email,
            Role = Enum.Parse<UserRole>(request.Role ?? "Viewer")
        };

        await _userRepo.AddAsync(user);
        return Ok(new { user.Id, user.Username, user.FullName, Role = user.Role.ToString() });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null || !Guid.TryParse(userId, out var guid)) return Unauthorized();

        var user = await _userRepo.GetByIdAsync(guid);
        if (user == null) return NotFound();

        return Ok(new { user.Id, user.Username, user.FullName, user.Email, Role = user.Role.ToString() });
    }
}

public record LoginRequest(string Username, string Password);
public record RefreshRequest(string AccessToken, string RefreshToken);
public record RegisterRequest(string Username, string Password, string FullName, string? Email, string? Role);
