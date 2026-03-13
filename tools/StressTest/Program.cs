// ============================================================
// IoT Monitoring — MQTT Stress Test Tool
// Simulates 315 devices publishing telemetry every 30 seconds
//
// Usage:
//   dotnet run -- [deviceCount] [intervalMs] [durationMinutes]
//   dotnet run -- 315 30000 10
// ============================================================

using System.Text;
using System.Text.Json;
using MQTTnet;
using MQTTnet.Client;

var deviceCount = args.Length > 0 ? int.Parse(args[0]) : 315;
var intervalMs  = args.Length > 1 ? int.Parse(args[1]) : 30000;
var durationMin = args.Length > 2 ? int.Parse(args[2]) : 10;

Console.WriteLine($"""
╔══════════════════════════════════════════════════╗
║      IoT MQTT Stress Test                        ║
╠══════════════════════════════════════════════════╣
║  Devices:    {deviceCount,6}                              ║
║  Interval:   {intervalMs,6} ms                            ║
║  Duration:   {durationMin,6} min                          ║
║  Total msgs: {(long)deviceCount * (durationMin * 60000 / intervalMs),6}                              ║
╚══════════════════════════════════════════════════╝
""");

// Generate device metadata
var devices = Enumerable.Range(1, deviceCount).Select(i => new
{
    GatewayId = $"GW-{i:D4}",
    Topic = $"devices/GW-{i:D4}/telemetry",
    BaseTemp = 20.0 + Random.Shared.NextDouble() * 13, // 20-33°C base
    BaseHumi = 50.0 + Random.Shared.NextDouble() * 20  // 50-70% base
}).ToArray();

var factory = new MqttFactory();
var client = factory.CreateMqttClient();

var options = new MqttClientOptionsBuilder()
    .WithTcpServer("113.161.76.105", 1883)
    .WithCredentials("admin", "public")
    .WithClientId($"StressTest_{Environment.MachineName}_{Guid.NewGuid():N}")
    .WithCleanSession()
    .WithKeepAlivePeriod(TimeSpan.FromSeconds(60))
    .Build();

Console.Write("Connecting to MQTT broker... ");
await client.ConnectAsync(options);
Console.WriteLine($"✓ Connected");

var cts = new CancellationTokenSource(TimeSpan.FromMinutes(durationMin));
var totalSent = 0L;
var totalErrors = 0L;
var startTime = DateTime.UtcNow;

Console.WriteLine($"Starting publish loop at {DateTime.Now:HH:mm:ss}...\n");

try
{
    while (!cts.Token.IsCancellationRequested)
    {
        var batchStart = DateTime.UtcNow;
        var batchSent = 0;
        var batchErrors = 0;

        // Publish all devices in parallel (batched)
        var tasks = devices.Select(async device =>
        {
            try
            {
                var temp = device.BaseTemp + (Random.Shared.NextDouble() - 0.5) * 4; // ±2°C drift
                var humi = device.BaseHumi + (Random.Shared.NextDouble() - 0.5) * 10; // ±5% drift

                var payload = JsonSerializer.Serialize(new
                {
                    temperature = Math.Round(temp, 1),
                    humidity = Math.Round(Math.Clamp(humi, 0, 100), 1),
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                });

                var message = new MqttApplicationMessageBuilder()
                    .WithTopic(device.Topic)
                    .WithPayload(Encoding.UTF8.GetBytes(payload))
                    .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtMostOnce)
                    .Build();

                await client.PublishAsync(message, cts.Token);
                Interlocked.Increment(ref totalSent);
                Interlocked.Increment(ref batchSent);
            }
            catch (Exception ex)
            {
                Interlocked.Increment(ref totalErrors);
                Interlocked.Increment(ref batchErrors);
            }
        });

        await Task.WhenAll(tasks);

        var batchDuration = (DateTime.UtcNow - batchStart).TotalMilliseconds;
        var elapsed = DateTime.UtcNow - startTime;
        var rate = totalSent / elapsed.TotalSeconds;

        Console.Write($"\r[{DateTime.Now:HH:mm:ss}] Batch: {batchSent}/{deviceCount} in {batchDuration:F0}ms | Total: {totalSent:N0} | Errors: {totalErrors} | Rate: {rate:F0} msg/s | Elapsed: {elapsed:mm\\:ss}    ");

        // Wait until next interval
        var waitMs = intervalMs - (int)batchDuration;
        if (waitMs > 0)
            await Task.Delay(waitMs, cts.Token);
    }
}
catch (OperationCanceledException) { }

var totalElapsed = DateTime.UtcNow - startTime;
Console.WriteLine($"""

╔══════════════════════════════════════════════════╗
║      Stress Test Complete                        ║
╠══════════════════════════════════════════════════╣
║  Duration:   {totalElapsed.TotalMinutes:F1} minutes                       ║
║  Total sent: {totalSent:N0}                              ║
║  Errors:     {totalErrors:N0}                              ║
║  Avg rate:   {totalSent / totalElapsed.TotalSeconds:F1} msg/s                       ║
╚══════════════════════════════════════════════════╝
""");

await client.DisconnectAsync();
