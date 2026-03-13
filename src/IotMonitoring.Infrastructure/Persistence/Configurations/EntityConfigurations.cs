using IotMonitoring.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace IotMonitoring.Infrastructure.Persistence.Configurations;

public class ProvinceConfiguration : IEntityTypeConfiguration<Province>
{
    public void Configure(EntityTypeBuilder<Province> builder)
    {
        builder.ToTable("Provinces");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Name).IsRequired().HasMaxLength(100);
        builder.Property(p => p.Code).HasMaxLength(10);
        builder.Property(p => p.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
    }
}

public class DeviceConfiguration : IEntityTypeConfiguration<Device>
{
    public void Configure(EntityTypeBuilder<Device> builder)
    {
        builder.ToTable("Devices");
        builder.HasKey(d => d.Id);
        builder.Property(d => d.GatewayIdentify).IsRequired().HasMaxLength(100);
        builder.HasIndex(d => d.GatewayIdentify).IsUnique();
        builder.Property(d => d.MqttTopic).IsRequired().HasMaxLength(200);
        builder.Property(d => d.Name).IsRequired().HasMaxLength(200);
        builder.Property(d => d.Description).HasMaxLength(500);
        builder.Property(d => d.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.HasIndex(d => d.ProvinceId);
        builder.HasIndex(d => d.Status).HasFilter("[IsActive] = 1");

        builder.HasOne(d => d.Province)
            .WithMany(p => p.Devices)
            .HasForeignKey(d => d.ProvinceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Setting)
            .WithOne(s => s.Device)
            .HasForeignKey<DeviceSetting>(s => s.DeviceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class DeviceSettingConfiguration : IEntityTypeConfiguration<DeviceSetting>
{
    public void Configure(EntityTypeBuilder<DeviceSetting> builder)
    {
        builder.ToTable("DeviceSettings");
        builder.HasKey(s => s.DeviceId);
    }
}

public class DataLogConfiguration : IEntityTypeConfiguration<DataLog>
{
    public void Configure(EntityTypeBuilder<DataLog> builder)
    {
        builder.ToTable("DataLogs");
        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).UseIdentityColumn();
        builder.Property(d => d.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.HasIndex(d => new { d.DeviceId, d.CreatedAt })
            .IsDescending(false, true);

        builder.HasOne(d => d.Device)
            .WithMany(dev => dev.DataLogs)
            .HasForeignKey(d => d.DeviceId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class AlarmLogConfiguration : IEntityTypeConfiguration<AlarmLog>
{
    public void Configure(EntityTypeBuilder<AlarmLog> builder)
    {
        builder.ToTable("AlarmLogs");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).UseIdentityColumn();
        builder.Property(a => a.Message).IsRequired().HasMaxLength(500);
        builder.Property(a => a.AcknowledgedBy).HasMaxLength(100);
        builder.Property(a => a.ResolvedBy).HasMaxLength(100);
        builder.Property(a => a.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.HasIndex(a => new { a.DeviceId, a.CreatedAt }).IsDescending(false, true);
        builder.HasIndex(a => new { a.IsResolved, a.IsAcknowledged }).HasFilter("[IsResolved] = 0");

        builder.HasOne(a => a.Device)
            .WithMany(d => d.AlarmLogs)
            .HasForeignKey(a => a.DeviceId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
        builder.Property(u => u.Username).IsRequired().HasMaxLength(50);
        builder.HasIndex(u => u.Username).IsUnique();
        builder.Property(u => u.PasswordHash).IsRequired().HasMaxLength(500);
        builder.Property(u => u.FullName).IsRequired().HasMaxLength(100);
        builder.Property(u => u.Email).HasMaxLength(200);
        builder.Property(u => u.RefreshToken).HasMaxLength(500);
        builder.Property(u => u.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
    }
}
