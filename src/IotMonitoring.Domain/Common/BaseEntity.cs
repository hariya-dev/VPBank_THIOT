using IotMonitoring.Domain.Common;

namespace IotMonitoring.Domain.Common;

public abstract class BaseEntity
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = TimeHelper.VnNow;
    public DateTime? UpdatedAt { get; set; }
}

public abstract class BaseEntity<TKey>
{
    public TKey Id { get; set; } = default!;
    public DateTime CreatedAt { get; set; } = TimeHelper.VnNow;
    public DateTime? UpdatedAt { get; set; }
}
