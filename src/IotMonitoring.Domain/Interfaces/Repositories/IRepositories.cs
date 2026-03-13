using IotMonitoring.Domain.Entities;

namespace IotMonitoring.Domain.Interfaces.Repositories;

public interface IProvinceRepository
{
    Task<List<Province>> GetAllAsync(CancellationToken ct = default);
    Task<Province?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Province> AddAsync(Province province, CancellationToken ct = default);
    Task UpdateAsync(Province province, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public interface IDeviceRepository
{
    Task<List<Device>> GetAllAsync(int? provinceId = null, CancellationToken ct = default);
    Task<Device?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Device?> GetByGatewayIdAsync(string gatewayId, CancellationToken ct = default);
    Task<List<Device>> GetActiveDevicesAsync(CancellationToken ct = default);
    Task<Device> AddAsync(Device device, CancellationToken ct = default);
    Task UpdateAsync(Device device, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public interface IDeviceSettingRepository
{
    Task<DeviceSetting?> GetByDeviceIdAsync(int deviceId, CancellationToken ct = default);
    Task<List<DeviceSetting>> GetAllAsync(CancellationToken ct = default);
    Task UpsertAsync(DeviceSetting setting, CancellationToken ct = default);
}

public interface IAlarmLogRepository
{
    Task<List<AlarmLog>> GetActiveAlarmsAsync(CancellationToken ct = default);
    Task<List<AlarmLog>> GetByDeviceIdAsync(int deviceId, DateTime? from, DateTime? to, int page, int pageSize, CancellationToken ct = default);
    Task<int> GetTotalCountAsync(int? deviceId, bool? isResolved, DateTime? from, DateTime? to, CancellationToken ct = default);
    Task AddAsync(AlarmLog alarm, CancellationToken ct = default);
    Task AcknowledgeAsync(long id, string acknowledgedBy, CancellationToken ct = default);
    Task ResolveAsync(long id, string resolvedBy, CancellationToken ct = default);
}

public interface IDataLogRepository
{
    Task<(List<DataLog> Items, int TotalCount)> GetHistoryAsync(int? deviceId, DateTime from, DateTime to, int page, int pageSize, CancellationToken ct = default);
    Task<List<DataLog>> GetChartDataAsync(int deviceId, DateTime from, DateTime to, CancellationToken ct = default);
}

public interface IUserRepository
{
    Task<User?> GetByUsernameAsync(string username, CancellationToken ct = default);
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<User>> GetAllAsync(CancellationToken ct = default);
    Task<User> AddAsync(User user, CancellationToken ct = default);
    Task UpdateAsync(User user, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
