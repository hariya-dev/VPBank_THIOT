using System.Text;
using IotMonitoring.Domain.Interfaces.Repositories;
using IotMonitoring.Domain.Interfaces.Services;
using IotMonitoring.Infrastructure.Auth;
using IotMonitoring.Infrastructure.Cache;
using IotMonitoring.Infrastructure.Persistence;
using IotMonitoring.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;

namespace IotMonitoring.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // ── EF Core (SQL Server) ───────────────────────────
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

        services.AddDbContext<SqlDbContext>(options =>
            options.UseSqlServer(connectionString, sql =>
            {
                sql.MigrationsAssembly(typeof(SqlDbContext).Assembly.FullName);
                sql.CommandTimeout(30);
                sql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null);
            }));

        // ── Redis ──────────────────────────────────────────
        var redisConnection = configuration.GetConnectionString("Redis") ?? "localhost:6379";
        services.AddSingleton<IConnectionMultiplexer>(sp =>
            ConnectionMultiplexer.Connect(redisConnection));
        services.AddSingleton<ICacheService, RedisCacheService>();

        // ── Repositories ───────────────────────────────────
        services.AddScoped<IProvinceRepository, ProvinceRepository>();
        services.AddScoped<IDeviceRepository, DeviceRepository>();
        services.AddScoped<IDeviceSettingRepository, DeviceSettingRepository>();
        services.AddScoped<IAlarmLogRepository, AlarmLogRepository>();
        services.AddScoped<IUserRepository, UserRepository>();

        // ── Services ───────────────────────────────────────
        services.AddSingleton<IBulkInsertService>(sp =>
            new BulkInsertService(connectionString));
        services.AddSingleton<ITokenService, JwtTokenService>();

        // ── JWT Authentication ─────────────────────────────
        var jwtSecret = configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT Secret not configured.");

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = configuration["Jwt:Issuer"],
                ValidAudience = configuration["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                ClockSkew = TimeSpan.Zero
            };

            // SignalR JWT support (token in query string)
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                }
            };
        });

        services.AddAuthorization();

        return services;
    }
}
