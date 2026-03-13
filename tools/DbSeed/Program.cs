// ============================================================
// IoT Monitoring — Database Seed Script
// Creates initial admin user and sample provinces/devices
//
// Usage: dotnet run
// ============================================================

using System.Text;
using System.Text.Json;
using Microsoft.Data.SqlClient;
using BCrypt.Net;

var connectionString = args.Length > 0
    ? args[0]
    : "Server=localhost,1433;Database=IotMonitoring;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true;";

Console.WriteLine("IoT Monitoring — Database Seed Tool");
Console.WriteLine($"Connection: {connectionString.Split(';')[0]}");

using var conn = new SqlConnection(connectionString);
await conn.OpenAsync();

// ── 1. Create Admin User ──
var adminPassword = BCrypt.Net.BCrypt.HashPassword("admin123");
await ExecuteAsync(conn, $"""
    IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = 'admin')
    INSERT INTO Users (Username, PasswordHash, FullName, Email, Role, IsActive, CreatedAt, UpdatedAt)
    VALUES ('admin', '{adminPassword}', 'System Administrator', 'admin@vpbank.com', 0, 1, GETUTCDATE(), GETUTCDATE());
""");
Console.WriteLine("✓ Admin user created (admin / admin123)");

// ── 2. Create Operator User ──
var operatorPassword = BCrypt.Net.BCrypt.HashPassword("operator123");
await ExecuteAsync(conn, $"""
    IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = 'operator')
    INSERT INTO Users (Username, PasswordHash, FullName, Email, Role, IsActive, CreatedAt, UpdatedAt)
    VALUES ('operator', '{operatorPassword}', 'System Operator', 'operator@vpbank.com', 1, 1, GETUTCDATE(), GETUTCDATE());
""");
Console.WriteLine("✓ Operator user created (operator / operator123)");

// ── 3. Create Provinces ──
var provinces = new[]
{
    ("Hà Nội", "HN"), ("Hồ Chí Minh", "HCM"), ("Đà Nẵng", "DN"),
    ("Hải Phòng", "HP"), ("Cần Thơ", "CT"), ("Bình Dương", "BD"),
    ("Đồng Nai", "DNG"), ("Khánh Hòa", "KH"), ("Nghệ An", "NA"),
    ("Thanh Hóa", "TH"), ("Quảng Ninh", "QN"), ("Bắc Ninh", "BN"),
    ("Thừa Thiên Huế", "TTH"), ("Bà Rịa-Vũng Tàu", "BRVT"), ("Lâm Đồng", "LD")
};

foreach (var (name, code) in provinces)
{
    await ExecuteAsync(conn, $"""
        IF NOT EXISTS (SELECT 1 FROM Provinces WHERE Code = '{code}')
        INSERT INTO Provinces (Name, Code, IsActive, CreatedAt, UpdatedAt)
        VALUES (N'{name}', '{code}', 1, GETUTCDATE(), GETUTCDATE());
    """);
}
Console.WriteLine($"✓ {provinces.Length} provinces created");

// ── 4. Create Sample Devices ──
// Get province IDs
var provinceIds = new List<int>();
using (var cmd = new SqlCommand("SELECT Id FROM Provinces ORDER BY Id", conn))
using (var reader = await cmd.ExecuteReaderAsync())
{
    while (await reader.ReadAsync()) provinceIds.Add(reader.GetInt32(0));
}

var deviceCount = 0;
for (int i = 1; i <= 315; i++)
{
    var gwId = $"GW-{i:D4}";
    var provinceId = provinceIds[(i - 1) % provinceIds.Count];
    var lat = 10.0 + Random.Shared.NextDouble() * 12; // Vietnam lat range
    var lng = 104.0 + Random.Shared.NextDouble() * 5;  // Vietnam lng range

    await ExecuteAsync(conn, $"""
        IF NOT EXISTS (SELECT 1 FROM Devices WHERE GatewayIdentify = '{gwId}')
        BEGIN
            INSERT INTO Devices (Name, GatewayIdentify, MqttTopic, ProvinceId, Latitude, Longitude, Status, IsDeleted, CreatedAt, UpdatedAt)
            VALUES (N'Device {gwId}', '{gwId}', 'devices/{gwId}/telemetry', {provinceId}, {lat:F6}, {lng:F6}, 0, 0, GETUTCDATE(), GETUTCDATE());

            DECLARE @deviceId_{i} INT = SCOPE_IDENTITY();
            INSERT INTO DeviceSettings (DeviceId, TempHighThreshold, TempLowThreshold, HumiHighThreshold, HumiLowThreshold, LogCycleSeconds, OfflineTimeoutSeconds, CreatedAt, UpdatedAt)
            VALUES (@deviceId_{i}, 35.0, 10.0, 80.0, 30.0, 300, 120, GETUTCDATE(), GETUTCDATE());
        END
    """);
    deviceCount++;
}
Console.WriteLine($"✓ {deviceCount} devices created with settings");

Console.WriteLine("\n========================================");
Console.WriteLine("Database seed complete!");
Console.WriteLine("========================================");

static async Task ExecuteAsync(SqlConnection conn, string sql)
{
    using var cmd = new SqlCommand(sql, conn);
    cmd.CommandTimeout = 30;
    await cmd.ExecuteNonQueryAsync();
}
