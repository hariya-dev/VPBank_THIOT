using IotMonitoring.Domain.Entities;
using IotMonitoring.Domain.Interfaces.Repositories;
using IotMonitoring.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace IotMonitoring.Infrastructure.Repositories;

public class ProvinceRepository : IProvinceRepository
{
    private readonly SqlDbContext _db;
    public ProvinceRepository(SqlDbContext db) => _db = db;

    public async Task<List<Province>> GetAllAsync(CancellationToken ct = default)
        => await _db.Provinces.Where(p => p.IsActive).OrderBy(p => p.SortOrder).ThenBy(p => p.Name).ToListAsync(ct);

    public async Task<Province?> GetByIdAsync(int id, CancellationToken ct = default)
        => await _db.Provinces.Include(p => p.Devices.Where(d => d.IsActive)).FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<Province> AddAsync(Province province, CancellationToken ct = default)
    {
        _db.Provinces.Add(province);
        await _db.SaveChangesAsync(ct);
        return province;
    }

    public async Task UpdateAsync(Province province, CancellationToken ct = default)
    {
        _db.Provinces.Update(province);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var entity = await _db.Provinces.FindAsync(new object[] { id }, ct);
        if (entity != null) { entity.IsActive = false; await _db.SaveChangesAsync(ct); }
    }
}

public class DeviceRepository : IDeviceRepository
{
    private readonly SqlDbContext _db;
    public DeviceRepository(SqlDbContext db) => _db = db;

    public async Task<List<Device>> GetAllAsync(int? provinceId = null, CancellationToken ct = default)
    {
        var q = _db.Devices.Include(d => d.Setting).Include(d => d.Province).Where(d => d.IsActive);
        if (provinceId.HasValue) q = q.Where(d => d.ProvinceId == provinceId.Value);
        return await q.OrderBy(d => d.Name).ToListAsync(ct);
    }

    public async Task<Device?> GetByIdAsync(int id, CancellationToken ct = default)
        => await _db.Devices.Include(d => d.Setting).Include(d => d.Province).FirstOrDefaultAsync(d => d.Id == id, ct);

    public async Task<Device?> GetByGatewayIdAsync(string gatewayId, CancellationToken ct = default)
        => await _db.Devices.Include(d => d.Setting).FirstOrDefaultAsync(d => d.GatewayIdentify == gatewayId, ct);

    public async Task<List<Device>> GetActiveDevicesAsync(CancellationToken ct = default)
        => await _db.Devices.Include(d => d.Setting).Where(d => d.IsActive).ToListAsync(ct);

    public async Task<Device> AddAsync(Device device, CancellationToken ct = default)
    {
        _db.Devices.Add(device);
        await _db.SaveChangesAsync(ct);
        return device;
    }

    public async Task UpdateAsync(Device device, CancellationToken ct = default)
    {
        _db.Devices.Update(device);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var entity = await _db.Devices.FindAsync(new object[] { id }, ct);
        if (entity != null) { entity.IsActive = false; await _db.SaveChangesAsync(ct); }
    }
}

public class DeviceSettingRepository : IDeviceSettingRepository
{
    private readonly SqlDbContext _db;
    public DeviceSettingRepository(SqlDbContext db) => _db = db;

    public async Task<DeviceSetting?> GetByDeviceIdAsync(int deviceId, CancellationToken ct = default)
        => await _db.DeviceSettings.FindAsync(new object[] { deviceId }, ct);

    public async Task<List<DeviceSetting>> GetAllAsync(CancellationToken ct = default)
        => await _db.DeviceSettings.ToListAsync(ct);

    public async Task UpsertAsync(DeviceSetting setting, CancellationToken ct = default)
    {
        var existing = await _db.DeviceSettings.FindAsync(new object[] { setting.DeviceId }, ct);
        if (existing == null)
        {
            _db.DeviceSettings.Add(setting);
        }
        else
        {
            existing.TempHigh = setting.TempHigh;
            existing.TempLow = setting.TempLow;
            existing.HumiHigh = setting.HumiHigh;
            existing.HumiLow = setting.HumiLow;
            existing.LogCycleSeconds = setting.LogCycleSeconds;
            existing.OfflineTimeout = setting.OfflineTimeout;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync(ct);
    }
}

public class AlarmLogRepository : IAlarmLogRepository
{
    private readonly SqlDbContext _db;
    public AlarmLogRepository(SqlDbContext db) => _db = db;

    public async Task<List<AlarmLog>> GetActiveAlarmsAsync(CancellationToken ct = default)
        => await _db.AlarmLogs.Include(a => a.Device).Where(a => !a.IsResolved).OrderByDescending(a => a.CreatedAt).ToListAsync(ct);

    public async Task<List<AlarmLog>> GetByDeviceIdAsync(int deviceId, DateTime? from, DateTime? to, int page, int pageSize, CancellationToken ct = default)
    {
        var q = _db.AlarmLogs.Where(a => a.DeviceId == deviceId);
        if (from.HasValue) q = q.Where(a => a.CreatedAt >= from.Value);
        if (to.HasValue) q = q.Where(a => a.CreatedAt <= to.Value);
        return await q.OrderByDescending(a => a.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
    }

    public async Task<int> GetTotalCountAsync(int? deviceId, bool? isResolved, DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var q = _db.AlarmLogs.AsQueryable();
        if (deviceId.HasValue) q = q.Where(a => a.DeviceId == deviceId.Value);
        if (isResolved.HasValue) q = q.Where(a => a.IsResolved == isResolved.Value);
        if (from.HasValue) q = q.Where(a => a.CreatedAt >= from.Value);
        if (to.HasValue) q = q.Where(a => a.CreatedAt <= to.Value);
        return await q.CountAsync(ct);
    }

    public async Task AddAsync(AlarmLog alarm, CancellationToken ct = default)
    {
        _db.AlarmLogs.Add(alarm);
        await _db.SaveChangesAsync(ct);
    }

    public async Task AcknowledgeAsync(long id, string acknowledgedBy, CancellationToken ct = default)
    {
        var alarm = await _db.AlarmLogs.FindAsync(new object[] { id }, ct);
        if (alarm != null)
        {
            alarm.IsAcknowledged = true;
            alarm.AcknowledgedAt = DateTime.UtcNow;
            alarm.AcknowledgedBy = acknowledgedBy;
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task ResolveAsync(long id, string resolvedBy, CancellationToken ct = default)
    {
        var alarm = await _db.AlarmLogs.FindAsync(new object[] { id }, ct);
        if (alarm != null)
        {
            alarm.IsResolved = true;
            alarm.ResolvedAt = DateTime.UtcNow;
            alarm.ResolvedBy = resolvedBy;
            await _db.SaveChangesAsync(ct);
        }
    }
}

public class UserRepository : IUserRepository
{
    private readonly SqlDbContext _db;
    public UserRepository(SqlDbContext db) => _db = db;

    public async Task<User?> GetByUsernameAsync(string username, CancellationToken ct = default)
        => await _db.Users.FirstOrDefaultAsync(u => u.Username == username && u.IsActive, ct);

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.IsActive, ct);

    public async Task<List<User>> GetAllAsync(CancellationToken ct = default)
        => await _db.Users.Where(u => u.IsActive).OrderBy(u => u.FullName).ToListAsync(ct);

    public async Task<User> AddAsync(User user, CancellationToken ct = default)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        return user;
    }

    public async Task UpdateAsync(User user, CancellationToken ct = default)
    {
        _db.Users.Update(user);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Users.FindAsync(new object[] { id }, ct);
        if (entity != null) { entity.IsActive = false; await _db.SaveChangesAsync(ct); }
    }
}
