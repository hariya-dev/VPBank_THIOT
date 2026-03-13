namespace IotMonitoring.WebApi.Workers;

/// <summary>
/// Lightweight struct for zero-allocation MQTT telemetry parsing.
/// Passed through System.Threading.Channels from MQTT receiver to processor.
/// </summary>
public readonly struct TelemetryRaw
{
    public string GatewayId { get; init; }
    public double? Temperature { get; init; }
    public double? Humidity { get; init; }
    public long ReceivedTimestamp { get; init; }

    public TelemetryRaw(string gatewayId, double? temperature, double? humidity)
    {
        GatewayId = gatewayId;
        Temperature = temperature;
        Humidity = humidity;
        ReceivedTimestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
    }
}
