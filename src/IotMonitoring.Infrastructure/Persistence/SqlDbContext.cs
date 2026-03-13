using IotMonitoring.Domain.Common;
using IotMonitoring.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace IotMonitoring.Infrastructure.Persistence;

public class SqlDbContext : DbContext
{
    public SqlDbContext(DbContextOptions<SqlDbContext> options) : base(options) { }

    public DbSet<Province> Provinces => Set<Province>();
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<DeviceSetting> DeviceSettings => Set<DeviceSetting>();
    public DbSet<DataLog> DataLogs => Set<DataLog>();
    public DbSet<AlarmLog> AlarmLogs => Set<AlarmLog>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserDevice> UserDevices => Set<UserDevice>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(SqlDbContext).Assembly);

        // UserDevice composite key
        modelBuilder.Entity<UserDevice>(e =>
        {
            e.HasKey(ud => new { ud.UserId, ud.DeviceId });
            e.HasOne(ud => ud.User).WithMany(u => u.UserDevices).HasForeignKey(ud => ud.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(ud => ud.Device).WithMany().HasForeignKey(ud => ud.DeviceId).OnDelete(DeleteBehavior.Cascade);
        });

        // User → Province (optional)
        modelBuilder.Entity<User>(e =>
        {
            e.HasOne(u => u.Province).WithMany().HasForeignKey(u => u.ProvinceId).IsRequired(false);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<Domain.Common.BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = TimeHelper.VnNow;
        }

        foreach (var entry in ChangeTracker.Entries<Domain.Common.BaseEntity<Guid>>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = TimeHelper.VnNow;
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
