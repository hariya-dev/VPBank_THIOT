using IotMonitoring.Domain.Interfaces.Services;
using IotMonitoring.Domain.Entities;
using StackExchange.Redis;

namespace IotMonitoring.Infrastructure.Cache;

public class RedisCacheService : ICacheService
{
    private readonly IConnectionMultiplexer _redis;
    private IDatabase Db => _redis.GetDatabase();

    private const string TelemetryPrefix = "iot:telemetry:";
    private const string ConfigPrefix = "iot:config:";
    private const string AlarmStatePrefix = "iot:alarm:state:";
    private const string OnlineSetKey = "iot:status:online_devices";

    public RedisCacheService(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    // ── Telemetry ──────────────────────────────────────────

    public async Task SetTelemetryAsync(string gatewayId, double? temp, double? humi, long timestamp)
    {
        var key = TelemetryPrefix + gatewayId;
        var entries = new HashEntry[]
        {
            new("Temp", temp?.ToString("F2") ?? ""),
            new("Humi", humi?.ToString("F2") ?? ""),
            new("LastSeen", timestamp.ToString())
        };
        await Db.HashSetAsync(key, entries);
    }

    public async Task SetTelemetryBatchAsync(IEnumerable<(string GatewayId, double? Temp, double? Humi, long Timestamp)> items)
    {
        var batch = Db.CreateBatch();
        var tasks = new List<Task>();

        foreach (var (gatewayId, temp, humi, timestamp) in items)
        {
            var key = TelemetryPrefix + gatewayId;
            var entries = new HashEntry[]
            {
                new("Temp", temp?.ToString("F2") ?? ""),
                new("Humi", humi?.ToString("F2") ?? ""),
                new("LastSeen", timestamp.ToString())
            };
            tasks.Add(batch.HashSetAsync(key, entries));
        }

        batch.Execute();
        await Task.WhenAll(tasks);
    }

    public async Task<(double? Temp, double? Humi, long LastSeen)?> GetTelemetryAsync(string gatewayId)
    {
        var key = TelemetryPrefix + gatewayId;
        var hash = await Db.HashGetAllAsync(key);
        if (hash.Length == 0) return null;

        var dict = hash.ToDictionary(h => h.Name.ToString(), h => h.Value.ToString());
        double? temp = dict.TryGetValue("Temp", out var t) && double.TryParse(t, out var tv) ? tv : null;
        double? humi = dict.TryGetValue("Humi", out var h) && double.TryParse(h, out var hv) ? hv : null;
        long lastSeen = dict.TryGetValue("LastSeen", out var ls) && long.TryParse(ls, out var lsv) ? lsv : 0;

        return (temp, humi, lastSeen);
    }

    public async Task<Dictionary<string, (double? Temp, double? Humi, long LastSeen)>> GetAllTelemetryAsync()
    {
        var result = new Dictionary<string, (double? Temp, double? Humi, long LastSeen)>();
        var server = _redis.GetServer(_redis.GetEndPoints().First());
        var keys = server.Keys(pattern: TelemetryPrefix + "*").ToArray();

        var batch = Db.CreateBatch();
        var tasks = keys.Select(k => (Key: k.ToString(), Task: batch.HashGetAllAsync(k))).ToList();
        batch.Execute();
        await Task.WhenAll(tasks.Select(t => t.Task));

        foreach (var (key, task) in tasks)
        {
            var hash = task.Result;
            if (hash.Length == 0) continue;

            var dict = hash.ToDictionary(h => h.Name.ToString(), h => h.Value.ToString());
            double? temp = dict.TryGetValue("Temp", out var t) && double.TryParse(t, out var tv) ? tv : null;
            double? humi = dict.TryGetValue("Humi", out var h) && double.TryParse(h, out var hv) ? hv : null;
            long lastSeen = dict.TryGetValue("LastSeen", out var ls) && long.TryParse(ls, out var lsv) ? lsv : 0;

            var gwId = key.Replace(TelemetryPrefix, "");
            result[gwId] = (temp, humi, lastSeen);
        }

        return result;
    }

    // ── Device Config ──────────────────────────────────────

    public async Task SetDeviceConfigAsync(string gatewayId, double tempH, double tempL, double humiH, double humiL, int logCycle, int timeout)
    {
        var key = ConfigPrefix + gatewayId;
        var entries = new HashEntry[]
        {
            new("TempH", tempH.ToString("F1")),
            new("TempL", tempL.ToString("F1")),
            new("HumiH", humiH.ToString("F1")),
            new("HumiL", humiL.ToString("F1")),
            new("LogCycle", logCycle.ToString()),
            new("Timeout", timeout.ToString())
        };
        await Db.HashSetAsync(key, entries);
    }

    public async Task<(double TempH, double TempL, double HumiH, double HumiL, int LogCycle, int Timeout)?> GetDeviceConfigAsync(string gatewayId)
    {
        var key = ConfigPrefix + gatewayId;
        var hash = await Db.HashGetAllAsync(key);
        if (hash.Length == 0) return null;

        var dict = hash.ToDictionary(h => h.Name.ToString(), h => h.Value.ToString());

        return (
            double.TryParse(dict.GetValueOrDefault("TempH"), out var th) ? th : 35,
            double.TryParse(dict.GetValueOrDefault("TempL"), out var tl) ? tl : 10,
            double.TryParse(dict.GetValueOrDefault("HumiH"), out var hh) ? hh : 80,
            double.TryParse(dict.GetValueOrDefault("HumiL"), out var hl) ? hl : 30,
            int.TryParse(dict.GetValueOrDefault("LogCycle"), out var lc) ? lc : 300,
            int.TryParse(dict.GetValueOrDefault("Timeout"), out var to) ? to : 120
        );
    }

    // ── Online/Offline ─────────────────────────────────────

    public async Task SetDeviceOnlineAsync(string gatewayId)
        => await Db.SetAddAsync(OnlineSetKey, gatewayId);

    public async Task SetDeviceOfflineAsync(string gatewayId)
        => await Db.SetRemoveAsync(OnlineSetKey, gatewayId);

    public async Task<bool> IsDeviceOnlineAsync(string gatewayId)
        => await Db.SetContainsAsync(OnlineSetKey, gatewayId);

    public async Task<HashSet<string>> GetOnlineDevicesAsync()
    {
        var members = await Db.SetMembersAsync(OnlineSetKey);
        return members.Select(m => m.ToString()).ToHashSet();
    }

    // ── Alarm State (Hysteresis) ───────────────────────────

    public async Task SetAlarmStateAsync(string gatewayId, string alarmType, bool isAlarming)
        => await Db.HashSetAsync(AlarmStatePrefix + gatewayId, alarmType, isAlarming ? "1" : "0");

    public async Task<bool> GetAlarmStateAsync(string gatewayId, string alarmType)
    {
        var val = await Db.HashGetAsync(AlarmStatePrefix + gatewayId, alarmType);
        return val == "1";
    }
}
