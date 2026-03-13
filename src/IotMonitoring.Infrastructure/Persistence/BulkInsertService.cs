using IotMonitoring.Domain.Entities;
using IotMonitoring.Domain.Interfaces.Services;
using Microsoft.Data.SqlClient;

namespace IotMonitoring.Infrastructure.Persistence;

public class BulkInsertService : IBulkInsertService
{
    private readonly string _connectionString;

    public BulkInsertService(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task BulkInsertDataLogsAsync(IEnumerable<DataLog> logs, CancellationToken ct = default)
    {
        var dataTable = new System.Data.DataTable("DataLogs");
        dataTable.Columns.Add("DeviceId", typeof(int));
        dataTable.Columns.Add("Temperature", typeof(double));
        dataTable.Columns.Add("Humidity", typeof(double));
        dataTable.Columns.Add("Quality", typeof(byte));
        dataTable.Columns.Add("CreatedAt", typeof(DateTime));

        foreach (var log in logs)
        {
            var row = dataTable.NewRow();
            row["DeviceId"] = log.DeviceId;
            row["Temperature"] = (object?)log.Temperature ?? DBNull.Value;
            row["Humidity"] = (object?)log.Humidity ?? DBNull.Value;
            row["Quality"] = (byte)log.Quality;
            row["CreatedAt"] = log.CreatedAt;
            dataTable.Rows.Add(row);
        }

        if (dataTable.Rows.Count == 0) return;

        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(ct);

        using var bulkCopy = new SqlBulkCopy(connection)
        {
            DestinationTableName = "DataLogs",
            BatchSize = 1000,
            BulkCopyTimeout = 30
        };

        bulkCopy.ColumnMappings.Add("DeviceId", "DeviceId");
        bulkCopy.ColumnMappings.Add("Temperature", "Temperature");
        bulkCopy.ColumnMappings.Add("Humidity", "Humidity");
        bulkCopy.ColumnMappings.Add("Quality", "Quality");
        bulkCopy.ColumnMappings.Add("CreatedAt", "CreatedAt");

        await bulkCopy.WriteToServerAsync(dataTable, ct);
    }
}
