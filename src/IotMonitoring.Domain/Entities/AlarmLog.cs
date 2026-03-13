using IotMonitoring.Domain.Enums;

namespace IotMonitoring.Domain.Entities;

public class AlarmLog
{
    public long Id { get; set; }
    public int DeviceId { get; set; }
    public AlarmType AlarmType { get; set; }
    public AlarmSeverity Severity { get; set; } = AlarmSeverity.Warning;
    public string Message { get; set; } = string.Empty;
    public double? Value { get; set; }
    public double? Threshold { get; set; }
    public bool IsAcknowledged { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public string? AcknowledgedBy { get; set; }
    public bool IsResolved { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? ResolvedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Device Device { get; set; } = null!;
}
