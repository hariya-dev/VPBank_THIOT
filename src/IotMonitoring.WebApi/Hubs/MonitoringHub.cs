using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace IotMonitoring.WebApi.Hubs;

[Authorize]
public class MonitoringHub : Hub
{
    private readonly ILogger<MonitoringHub> _logger;

    public MonitoringHub(ILogger<MonitoringHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var user = Context.User?.Identity?.Name ?? "Unknown";
        _logger.LogInformation("Client connected: {ConnectionId}, User: {User}", Context.ConnectionId, user);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>Join a specific device group to receive its telemetry</summary>
    public async Task JoinDeviceGroup(string gatewayId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"device:{gatewayId}");
        _logger.LogDebug("Client {ConnectionId} joined device group: {GatewayId}", Context.ConnectionId, gatewayId);
    }

    /// <summary>Join a province group to receive all devices' telemetry within</summary>
    public async Task JoinProvinceGroup(int provinceId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"province:{provinceId}");
        _logger.LogDebug("Client {ConnectionId} joined province group: {ProvinceId}", Context.ConnectionId, provinceId);
    }

    /// <summary>Join all group to receive every telemetry update</summary>
    public async Task JoinAllGroup()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "all");
        _logger.LogDebug("Client {ConnectionId} joined ALL group", Context.ConnectionId);
    }

    /// <summary>Leave a specific group</summary>
    public async Task LeaveGroup(string groupName)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        _logger.LogDebug("Client {ConnectionId} left group: {Group}", Context.ConnectionId, groupName);
    }
}
