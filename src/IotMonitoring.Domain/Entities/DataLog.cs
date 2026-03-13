using IotMonitoring.Domain.Common;
using IotMonitoring.Domain.Enums;

namespace IotMonitoring.Domain.Entities;

public class DataLog
{
    public long Id { get; set; }
    public int DeviceId { get; set; }
    public double? Temperature { get; set; }
    public double? Humidity { get; set; }
    public DataQuality Quality { get; set; } = DataQuality.Good;
    public DateTime CreatedAt { get; set; } = TimeHelper.VnNow;

    // Navigation
    public Device Device { get; set; } = null!;
}
