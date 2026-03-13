using IotMonitoring.Domain.Common;

namespace IotMonitoring.Domain.Entities;

public class Province : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<Device> Devices { get; set; } = new List<Device>();
}
