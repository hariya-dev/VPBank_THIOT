using IotMonitoring.Domain.Common;
using IotMonitoring.Domain.Enums;

namespace IotMonitoring.Domain.Entities;

public class Device : BaseEntity
{
    public int ProvinceId { get; set; }
    public string GatewayIdentify { get; set; } = string.Empty;
    public string MqttTopic { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DeviceStatus Status { get; set; } = DeviceStatus.Offline;
    public bool IsActive { get; set; } = true;

    // Navigation
    public Province Province { get; set; } = null!;
    public DeviceSetting? Setting { get; set; }
    public ICollection<DataLog> DataLogs { get; set; } = new List<DataLog>();
    public ICollection<AlarmLog> AlarmLogs { get; set; } = new List<AlarmLog>();
}
