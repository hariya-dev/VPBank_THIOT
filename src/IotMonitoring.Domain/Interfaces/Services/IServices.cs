namespace IotMonitoring.Domain.Interfaces.Services;

/// <summary>
/// Redis cache service interface for IoT telemetry operations
/// </summary>
public interface ICacheService
{
    // Telemetry
    Task SetTelemetryAsync(string gatewayId, double? temp, double? humi, long timestamp);
    Task SetTelemetryBatchAsync(IEnumerable<(string GatewayId, double? Temp, double? Humi, long Timestamp)> items);
    Task<(double? Temp, double? Humi, long LastSeen)?> GetTelemetryAsync(string gatewayId);
    Task<Dictionary<string, (double? Temp, double? Humi, long LastSeen)>> GetAllTelemetryAsync();

    // Device Config (cached from DB)
    Task SetDeviceConfigAsync(string gatewayId, double tempH, double tempL, double humiH, double humiL, int logCycle, int timeout);
    Task<(double TempH, double TempL, double HumiH, double HumiL, int LogCycle, int Timeout)?> GetDeviceConfigAsync(string gatewayId);

    // Online/Offline Status
    Task SetDeviceOnlineAsync(string gatewayId);
    Task SetDeviceOfflineAsync(string gatewayId);
    Task<bool> IsDeviceOnlineAsync(string gatewayId);
    Task<HashSet<string>> GetOnlineDevicesAsync();

    // Alarm State (for hysteresis)
    Task SetAlarmStateAsync(string gatewayId, string alarmType, bool isAlarming);
    Task<bool> GetAlarmStateAsync(string gatewayId, string alarmType);
}

/// <summary>
/// Bulk insert service for high-performance batch writes
/// </summary>
public interface IBulkInsertService
{
    Task BulkInsertDataLogsAsync(IEnumerable<Entities.DataLog> logs, CancellationToken ct = default);
}

/// <summary>
/// JWT token service
/// </summary>
public interface ITokenService
{
    string GenerateAccessToken(Entities.User user);
    string GenerateRefreshToken();
    System.Security.Claims.ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
}
