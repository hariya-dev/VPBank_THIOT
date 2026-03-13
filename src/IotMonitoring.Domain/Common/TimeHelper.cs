namespace IotMonitoring.Domain.Common;

/// <summary>
/// Centralized time helper — always returns Vietnam time (UTC+7).
/// </summary>
public static class TimeHelper
{
    private static readonly TimeZoneInfo VnZone = GetVnTimeZone();

    /// <summary>Current Vietnam time (UTC+7)</summary>
    public static DateTime VnNow => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, VnZone);

    private static TimeZoneInfo GetVnTimeZone()
    {
        // Windows
        try { return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"); } catch { }
        // Linux / macOS
        try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh"); } catch { }
        // Fallback
        return TimeZoneInfo.CreateCustomTimeZone("VN", TimeSpan.FromHours(7), "Vietnam", "Vietnam");
    }
}
