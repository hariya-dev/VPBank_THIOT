using System.Threading.Channels;

namespace IotMonitoring.WebApi.Workers;

/// <summary>
/// Singleton Channel for the Producer-Consumer pipeline.
/// MqttReceiverWorker (Producer) → TelemetryProcessorWorker (Consumer)
/// BoundedCapacity = 2000 provides backpressure when 315 devices fire simultaneously.
/// </summary>
public class TelemetryChannel
{
    private readonly Channel<TelemetryRaw> _channel;

    public TelemetryChannel()
    {
        _channel = Channel.CreateBounded<TelemetryRaw>(new BoundedChannelOptions(2000)
        {
            FullMode = BoundedChannelFullMode.DropOldest, // Never block MQTT client
            SingleReader = false,
            SingleWriter = false
        });
    }

    public ChannelWriter<TelemetryRaw> Writer => _channel.Writer;
    public ChannelReader<TelemetryRaw> Reader => _channel.Reader;
}
