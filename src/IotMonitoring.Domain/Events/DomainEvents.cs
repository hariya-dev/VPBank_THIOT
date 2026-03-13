using MediatR;

namespace IotMonitoring.Domain.Events;

public record TelemetryReceivedEvent(
    string GatewayId,
    int DeviceId,
    double? Temperature,
    double? Humidity,
    long Timestamp
) : INotification;

public record AlarmTriggeredEvent(
    int DeviceId,
    string GatewayId,
    Enums.AlarmType AlarmType,
    Enums.AlarmSeverity Severity,
    double Value,
    double Threshold,
    string Message
) : INotification;

public record DeviceStatusChangedEvent(
    int DeviceId,
    string GatewayId,
    Enums.DeviceStatus OldStatus,
    Enums.DeviceStatus NewStatus
) : INotification;
