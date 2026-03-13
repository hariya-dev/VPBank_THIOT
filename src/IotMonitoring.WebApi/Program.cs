using IotMonitoring.Application;
using IotMonitoring.Infrastructure;
using IotMonitoring.Infrastructure.Persistence;
using IotMonitoring.WebApi.Hubs;
using Microsoft.EntityFrameworkCore;
using Serilog;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

// ── Serilog ────────────────────────────────────────────────
builder.Host.UseSerilog((context, config) =>
    config.ReadFrom.Configuration(context.Configuration));

// ── Layers DI ──────────────────────────────────────────────
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// ── SignalR + Redis Backplane ──────────────────────────────
var signalRBuilder = builder.Services.AddSignalR();
var redisConn = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrEmpty(redisConn))
{
    signalRBuilder.AddStackExchangeRedis(redisConn, options =>
    {
        options.Configuration.ChannelPrefix = RedisChannel.Literal("IotMonitoring");
    });
}

// ── Controllers & Swagger ──────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new() { Title = "IoT Monitoring API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter JWT token"
    });
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ── CORS ───────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "https://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials(); // Required for SignalR
    });
});

// ── Health Checks ──────────────────────────────────────────
builder.Services.AddHealthChecks()
    .AddSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")!, name: "mssql")
    .AddRedis(builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379", name: "redis");

// ── Background Workers ─────────────────────────────────────
builder.Services.AddSingleton<IotMonitoring.WebApi.Workers.TelemetryChannel>();
builder.Services.AddHostedService<IotMonitoring.WebApi.Workers.MqttReceiverWorker>();
builder.Services.AddHostedService<IotMonitoring.WebApi.Workers.TelemetryProcessorWorker>();
builder.Services.AddHostedService<IotMonitoring.WebApi.Workers.WatchdogWorker>();
builder.Services.AddHostedService<IotMonitoring.WebApi.Workers.BulkLogWorker>();

var app = builder.Build();

// ── Middleware Pipeline ────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI();

app.UseSerilogRequestLogging();
app.UseCors("AllowAngular");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<MonitoringHub>("/hubs/monitoring");
app.MapHealthChecks("/health");

// ── Auto Migrate & Seed ───────────────────────────────────
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<SqlDbContext>();
    await dbContext.Database.MigrateAsync();
    await SeedDatabase(dbContext);
}

Log.Information("IoT Monitoring API started successfully");
app.Run();

// ═══════════════════════════════════════════════════════════
// Database Seed Method
// ═══════════════════════════════════════════════════════════
static async Task SeedDatabase(SqlDbContext db)
{
    // ── Users ──
    if (!db.Users.Any())
    {
        db.Users.AddRange(
            new IotMonitoring.Domain.Entities.User
            {
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                FullName = "System Administrator",
                Email = "admin@vpbank.com",
                Role = IotMonitoring.Domain.Enums.UserRole.Admin,
                IsActive = true
            },
            new IotMonitoring.Domain.Entities.User
            {
                Username = "operator",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("operator123"),
                FullName = "System Operator",
                Email = "operator@vpbank.com",
                Role = IotMonitoring.Domain.Enums.UserRole.Operator,
                IsActive = true
            }
        );
        await db.SaveChangesAsync();
        Log.Information("Seeded 2 users (admin/admin123, operator/operator123)");
    }

    // ── Provinces ──
    if (!db.Provinces.Any())
    {
        var provinces = new (string Name, string Code)[]
        {
            ("Hà Nội", "HN"), ("Hồ Chí Minh", "HCM"), ("Đà Nẵng", "DN"),
            ("Hải Phòng", "HP"), ("Cần Thơ", "CT"), ("Bình Dương", "BD"),
            ("Đồng Nai", "DNG"), ("Khánh Hòa", "KH"), ("Nghệ An", "NA"),
            ("Thanh Hóa", "TH"), ("Quảng Ninh", "QN"), ("Bắc Ninh", "BN"),
            ("Thừa Thiên Huế", "TTH"), ("Bà Rịa-Vũng Tàu", "BRVT"), ("Lâm Đồng", "LD")
        };
        foreach (var (name, code) in provinces)
        {
            db.Provinces.Add(new IotMonitoring.Domain.Entities.Province
            {
                Name = name, Code = code, IsActive = true
            });
        }
        await db.SaveChangesAsync();
        Log.Information("Seeded {Count} provinces", provinces.Length);
    }

    // ── Devices ──
    if (!db.Devices.Any())
    {
        var provinceIds = db.Provinces.Select(p => p.Id).ToList();
        var rng = new Random(42);

        for (int i = 1; i <= 315; i++)
        {
            var gwId = $"GW-{i:D4}";
            var device = new IotMonitoring.Domain.Entities.Device
            {
                Name = $"Device {gwId}",
                GatewayIdentify = gwId,
                MqttTopic = $"devices/{gwId}/telemetry",
                ProvinceId = provinceIds[(i - 1) % provinceIds.Count],
                Latitude = 10.0 + rng.NextDouble() * 12,
                Longitude = 104.0 + rng.NextDouble() * 5,
                Status = IotMonitoring.Domain.Enums.DeviceStatus.Offline,
                IsActive = true,
                Setting = new IotMonitoring.Domain.Entities.DeviceSetting
                {
                    TempHigh = 35, TempLow = 10,
                    HumiHigh = 80, HumiLow = 30,
                    LogCycleSeconds = 300, OfflineTimeout = 120
                }
            };
            db.Devices.Add(device);
        }
        await db.SaveChangesAsync();
        Log.Information("Seeded 315 devices with default settings");
    }
}
