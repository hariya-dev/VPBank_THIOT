using Dapper;
using IotMonitoring.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace IotMonitoring.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DataLogsController : ControllerBase
{
    private readonly IConfiguration _config;

    public DataLogsController(IConfiguration config) => _config = config;

    /// <summary>Get DataLogs with server-side pagination (using Dapper for speed)</summary>
    [HttpGet]
    public async Task<IActionResult> GetHistory(
        [FromQuery] int? deviceId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var connStr = _config.GetConnectionString("DefaultConnection")!;
        using var conn = new SqlConnection(connStr);

        var whereClause = "WHERE 1=1";
        var parameters = new DynamicParameters();

        if (deviceId.HasValue)
        {
            whereClause += " AND dl.DeviceId = @DeviceId";
            parameters.Add("DeviceId", deviceId.Value);
        }
        if (from.HasValue)
        {
            whereClause += " AND dl.CreatedAt >= @From";
            parameters.Add("From", from.Value);
        }
        if (to.HasValue)
        {
            whereClause += " AND dl.CreatedAt <= @To";
            parameters.Add("To", to.Value);
        }

        // Count query
        var countSql = $"SELECT COUNT(*) FROM DataLogs dl {whereClause}";
        var totalCount = await conn.ExecuteScalarAsync<int>(countSql, parameters);

        // Data query with pagination
        var offset = (page - 1) * pageSize;
        parameters.Add("Offset", offset);
        parameters.Add("PageSize", pageSize);

        var dataSql = $@"
            SELECT dl.Id, dl.DeviceId, dl.Temperature, dl.Humidity, dl.Quality, dl.CreatedAt,
                   d.Name AS DeviceName, d.GatewayIdentify
            FROM DataLogs dl
            INNER JOIN Devices d ON d.Id = dl.DeviceId
            {whereClause}
            ORDER BY dl.CreatedAt DESC
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY";

        var items = await conn.QueryAsync(dataSql, parameters);

        return Ok(new { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize });
    }

    /// <summary>Get chart data for a specific device (aggregated by interval)</summary>
    [HttpGet("chart")]
    public async Task<IActionResult> GetChartData(
        [FromQuery] int deviceId,
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        [FromQuery] string interval = "hour") // hour, day
    {
        var connStr = _config.GetConnectionString("DefaultConnection")!;
        using var conn = new SqlConnection(connStr);

        var dateFormat = interval switch
        {
            "day" => "CONVERT(DATE, CreatedAt)",
            _ => "DATEADD(HOUR, DATEDIFF(HOUR, 0, CreatedAt), 0)" // Default: hourly
        };

        var sql = $@"
            SELECT {dateFormat} AS TimeBucket,
                   AVG(Temperature) AS AvgTemp,
                   MIN(Temperature) AS MinTemp,
                   MAX(Temperature) AS MaxTemp,
                   AVG(Humidity) AS AvgHumi,
                   MIN(Humidity) AS MinHumi,
                   MAX(Humidity) AS MaxHumi,
                   COUNT(*) AS SampleCount
            FROM DataLogs
            WHERE DeviceId = @DeviceId AND CreatedAt >= @From AND CreatedAt <= @To
            GROUP BY {dateFormat}
            ORDER BY TimeBucket";

        var data = await conn.QueryAsync(sql, new { DeviceId = deviceId, From = from, To = to });
        return Ok(data);
    }

    /// <summary>Export data to Excel-compatible JSON (client-side XLSX generation)</summary>
    [HttpGet("export")]
    public async Task<IActionResult> ExportData(
        [FromQuery] int? deviceId,
        [FromQuery] DateTime from,
        [FromQuery] DateTime to)
    {
        var connStr = _config.GetConnectionString("DefaultConnection")!;
        using var conn = new SqlConnection(connStr);

        var sql = @"
            SELECT d.Name AS DeviceName, d.GatewayIdentify,
                   dl.Temperature, dl.Humidity, dl.Quality, dl.CreatedAt
            FROM DataLogs dl
            INNER JOIN Devices d ON d.Id = dl.DeviceId
            WHERE dl.CreatedAt >= @From AND dl.CreatedAt <= @To";

        if (deviceId.HasValue)
            sql += " AND dl.DeviceId = @DeviceId";

        sql += " ORDER BY dl.CreatedAt DESC";

        var data = await conn.QueryAsync(sql, new { DeviceId = deviceId, From = from, To = to });
        return Ok(data);
    }

    /// <summary>Advanced report: province-filtered, aggregated, with thresholds</summary>
    [HttpGet("report")]
    public async Task<IActionResult> GetReport(
        [FromQuery] int? deviceId,
        [FromQuery] int? provinceId,
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        [FromQuery] string interval = "hour")
    {
        var connStr = _config.GetConnectionString("DefaultConnection")!;
        using var conn = new SqlConnection(connStr);

        var dateFormat = interval switch
        {
            "day" => "CONVERT(DATE, dl.CreatedAt)",
            _ => "DATEADD(HOUR, DATEDIFF(HOUR, 0, dl.CreatedAt), 0)"
        };

        var whereClause = "WHERE dl.CreatedAt >= @From AND dl.CreatedAt <= @To";
        var parameters = new DynamicParameters();
        parameters.Add("From", from);
        parameters.Add("To", to);

        if (deviceId.HasValue)
        {
            whereClause += " AND dl.DeviceId = @DeviceId";
            parameters.Add("DeviceId", deviceId.Value);
        }
        if (provinceId.HasValue)
        {
            whereClause += " AND d.ProvinceId = @ProvinceId";
            parameters.Add("ProvinceId", provinceId.Value);
        }

        var sql = $@"
            SELECT d.Id AS DeviceId, d.Name AS DeviceName, d.GatewayIdentify,
                   p.Name AS Province,
                   ds.TempHigh, ds.TempLow, ds.HumiHigh, ds.HumiLow,
                   {dateFormat} AS TimeBucket,
                   AVG(dl.Temperature) AS AvgTemp,
                   MIN(dl.Temperature) AS MinTemp,
                   MAX(dl.Temperature) AS MaxTemp,
                   AVG(dl.Humidity) AS AvgHumi,
                   MIN(dl.Humidity) AS MinHumi,
                   MAX(dl.Humidity) AS MaxHumi,
                   COUNT(*) AS SampleCount
            FROM DataLogs dl
            INNER JOIN Devices d ON d.Id = dl.DeviceId
            LEFT JOIN Provinces p ON p.Id = d.ProvinceId
            LEFT JOIN DeviceSettings ds ON ds.DeviceId = d.Id
            {whereClause}
            GROUP BY d.Id, d.Name, d.GatewayIdentify, p.Name,
                     ds.TempHigh, ds.TempLow, ds.HumiHigh, ds.HumiLow,
                     {dateFormat}
            ORDER BY d.Name, TimeBucket";

        var data = await conn.QueryAsync(sql, parameters);
        return Ok(data);
    }

    /// <summary>Per-device summary stats with threshold violation counts</summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] int? deviceId,
        [FromQuery] int? provinceId,
        [FromQuery] DateTime from,
        [FromQuery] DateTime to)
    {
        var connStr = _config.GetConnectionString("DefaultConnection")!;
        using var conn = new SqlConnection(connStr);

        var whereClause = "WHERE dl.CreatedAt >= @From AND dl.CreatedAt <= @To";
        var parameters = new DynamicParameters();
        parameters.Add("From", from);
        parameters.Add("To", to);

        if (deviceId.HasValue)
        {
            whereClause += " AND dl.DeviceId = @DeviceId";
            parameters.Add("DeviceId", deviceId.Value);
        }
        if (provinceId.HasValue)
        {
            whereClause += " AND d.ProvinceId = @ProvinceId";
            parameters.Add("ProvinceId", provinceId.Value);
        }

        var sql = $@"
            SELECT d.Id AS DeviceId, d.Name AS DeviceName, d.GatewayIdentify,
                   p.Name AS Province,
                   ds.TempHigh, ds.TempLow, ds.HumiHigh, ds.HumiLow,
                   AVG(dl.Temperature) AS AvgTemp,
                   MIN(dl.Temperature) AS MinTemp,
                   MAX(dl.Temperature) AS MaxTemp,
                   AVG(dl.Humidity) AS AvgHumi,
                   MIN(dl.Humidity) AS MinHumi,
                   MAX(dl.Humidity) AS MaxHumi,
                   COUNT(*) AS SampleCount,
                   SUM(CASE WHEN dl.Temperature > ds.TempHigh THEN 1 ELSE 0 END) AS OverTempCount,
                   SUM(CASE WHEN dl.Temperature < ds.TempLow THEN 1 ELSE 0 END) AS UnderTempCount,
                   SUM(CASE WHEN dl.Humidity > ds.HumiHigh THEN 1 ELSE 0 END) AS OverHumiCount,
                   SUM(CASE WHEN dl.Humidity < ds.HumiLow THEN 1 ELSE 0 END) AS UnderHumiCount
            FROM DataLogs dl
            INNER JOIN Devices d ON d.Id = dl.DeviceId
            LEFT JOIN Provinces p ON p.Id = d.ProvinceId
            LEFT JOIN DeviceSettings ds ON ds.DeviceId = d.Id
            {whereClause}
            GROUP BY d.Id, d.Name, d.GatewayIdentify, p.Name,
                     ds.TempHigh, ds.TempLow, ds.HumiHigh, ds.HumiLow
            ORDER BY d.Name";

        var data = await conn.QueryAsync(sql, parameters);
        return Ok(data);
    }

    /// <summary>Alarm report with device info, week/day/hour breakdown</summary>
    [HttpGet("alarm-report")]
    public async Task<IActionResult> GetAlarmReport(
        [FromQuery] int? deviceId,
        [FromQuery] int? provinceId,
        [FromQuery] bool? isResolved,
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100)
    {
        var connStr = _config.GetConnectionString("DefaultConnection")!;
        using var conn = new SqlConnection(connStr);

        var whereClause = "WHERE a.CreatedAt >= @From AND a.CreatedAt <= @To";
        var parameters = new DynamicParameters();
        parameters.Add("From", from);
        parameters.Add("To", to);

        if (deviceId.HasValue)
        {
            whereClause += " AND a.DeviceId = @DeviceId";
            parameters.Add("DeviceId", deviceId.Value);
        }
        if (provinceId.HasValue)
        {
            whereClause += " AND d.ProvinceId = @ProvinceId";
            parameters.Add("ProvinceId", provinceId.Value);
        }
        if (isResolved.HasValue)
        {
            whereClause += " AND a.IsResolved = @IsResolved";
            parameters.Add("IsResolved", isResolved.Value);
        }

        // Count
        var countSql = $@"SELECT COUNT(*) FROM AlarmLogs a
            INNER JOIN Devices d ON d.Id = a.DeviceId {whereClause}";
        var totalCount = await conn.ExecuteScalarAsync<int>(countSql, parameters);

        // Data
        var offset = (page - 1) * pageSize;
        parameters.Add("Offset", offset);
        parameters.Add("PageSize", pageSize);

        var sql = $@"
            SELECT a.Id, a.DeviceId, d.Name AS DeviceName, d.GatewayIdentify,
                   p.Name AS Province,
                   a.AlarmType, a.Message, a.Value, a.Threshold,
                   a.IsAcknowledged, a.AcknowledgedBy, a.AcknowledgedAt,
                   a.IsResolved, a.ResolvedBy, a.ResolvedAt,
                   a.CreatedAt,
                   DATEPART(ISO_WEEK, a.CreatedAt) AS WeekNo,
                   CONVERT(DATE, a.CreatedAt) AS DateOnly,
                   DATEPART(HOUR, a.CreatedAt) AS HourOfDay,
                   DATENAME(WEEKDAY, a.CreatedAt) AS DayOfWeek
            FROM AlarmLogs a
            INNER JOIN Devices d ON d.Id = a.DeviceId
            LEFT JOIN Provinces p ON p.Id = d.ProvinceId
            {whereClause}
            ORDER BY a.CreatedAt DESC
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY";

        var data = await conn.QueryAsync(sql, parameters);

        // Summary counts
        var summarySql = $@"
            SELECT
                COUNT(*) AS TotalAlarms,
                SUM(CASE WHEN a.IsResolved = 1 THEN 1 ELSE 0 END) AS ResolvedCount,
                SUM(CASE WHEN a.IsResolved = 0 THEN 1 ELSE 0 END) AS ActiveCount,
                SUM(CASE WHEN a.IsAcknowledged = 1 THEN 1 ELSE 0 END) AS AckedCount
            FROM AlarmLogs a
            INNER JOIN Devices d ON d.Id = a.DeviceId
            {whereClause}";
        var summaryParams = new DynamicParameters();
        summaryParams.Add("From", from);
        summaryParams.Add("To", to);
        if (deviceId.HasValue) summaryParams.Add("DeviceId", deviceId.Value);
        if (provinceId.HasValue) summaryParams.Add("ProvinceId", provinceId.Value);
        if (isResolved.HasValue) summaryParams.Add("IsResolved", isResolved.Value);

        var summary = await conn.QueryFirstOrDefaultAsync(summarySql, summaryParams);

        return Ok(new { Items = data, Summary = summary, TotalCount = totalCount, Page = page, PageSize = pageSize });
    }
}
