namespace IotMonitoring.Domain.Enums;

public enum AlarmType : byte
{
    TempHigh = 0,
    TempLow = 1,
    HumiHigh = 2,
    HumiLow = 3,
    Offline = 4,
    Restored = 5
}
