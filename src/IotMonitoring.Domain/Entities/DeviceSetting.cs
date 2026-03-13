namespace IotMonitoring.Domain.Entities;

public class DeviceSetting
{
    public int DeviceId { get; set; }
    public double TempHigh { get; set; } = 35;
    public double TempLow { get; set; } = 10;
    public double HumiHigh { get; set; } = 80;
    public double HumiLow { get; set; } = 30;
    public int LogCycleSeconds { get; set; } = 300; // Default 5 minutes
    public int OfflineTimeout { get; set; } = 120;  // Default 2 minutes
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Device Device { get; set; } = null!;
}
