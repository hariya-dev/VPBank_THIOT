using IotMonitoring.Domain.Common;
using IotMonitoring.Domain.Enums;

namespace IotMonitoring.Domain.Entities;

public class User : BaseEntity<Guid>
{
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public UserRole Role { get; set; } = UserRole.Viewer;
    public int? ProvinceId { get; set; }
    public bool IsActive { get; set; } = true;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }

    // Navigation
    public Province? Province { get; set; }
    public ICollection<UserDevice> UserDevices { get; set; } = new List<UserDevice>();
}
