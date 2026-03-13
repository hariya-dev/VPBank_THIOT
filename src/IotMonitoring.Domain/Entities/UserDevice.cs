using IotMonitoring.Domain.Common;

namespace IotMonitoring.Domain.Entities;

/// <summary>
/// Junction table: User ↔ Device (many-to-many assignment)
/// </summary>
public class UserDevice
{
    public Guid UserId { get; set; }
    public int DeviceId { get; set; }
    public DateTime AssignedAt { get; set; } = TimeHelper.VnNow;

    // Navigation
    public User User { get; set; } = null!;
    public Device Device { get; set; } = null!;
}
