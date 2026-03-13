-- ============================================================
-- IoT Monitoring — SQL Performance Optimization Script
-- Run against IotMonitoring database after initial migration
-- ============================================================

USE [IotMonitoring];
GO

-- ─────────────────────────────────────────────────────────────
-- 1. INDEXES for DataLogs (high-volume time-series table)
-- ─────────────────────────────────────────────────────────────

-- Primary query pattern: filter by DeviceId + time range
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_DataLogs_DeviceId_CreatedAt')
CREATE NONCLUSTERED INDEX IX_DataLogs_DeviceId_CreatedAt
    ON DataLogs (DeviceId, CreatedAt DESC)
    INCLUDE (Temperature, Humidity, DataQuality)
    WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- Report aggregation: time-bucket queries
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_DataLogs_CreatedAt_DeviceId')
CREATE NONCLUSTERED INDEX IX_DataLogs_CreatedAt_DeviceId
    ON DataLogs (CreatedAt DESC, DeviceId)
    INCLUDE (Temperature, Humidity)
    WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- ─────────────────────────────────────────────────────────────
-- 2. INDEXES for AlarmLogs
-- ─────────────────────────────────────────────────────────────

-- Active alarms query (not resolved)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AlarmLogs_Active')
CREATE NONCLUSTERED INDEX IX_AlarmLogs_Active
    ON AlarmLogs (IsResolved, CreatedAt DESC)
    INCLUDE (DeviceId, AlarmType, Severity, Value, Threshold, IsAcknowledged)
    WHERE IsResolved = 0
    WITH (ONLINE = ON);
GO

-- Alarm history by device
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AlarmLogs_DeviceId_CreatedAt')
CREATE NONCLUSTERED INDEX IX_AlarmLogs_DeviceId_CreatedAt
    ON AlarmLogs (DeviceId, CreatedAt DESC)
    INCLUDE (AlarmType, Severity, IsResolved, IsAcknowledged)
    WITH (ONLINE = ON);
GO

-- ─────────────────────────────────────────────────────────────
-- 3. INDEXES for Devices
-- ─────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Devices_GatewayIdentify')
CREATE UNIQUE NONCLUSTERED INDEX IX_Devices_GatewayIdentify
    ON Devices (GatewayIdentify)
    WHERE IsDeleted = 0
    WITH (ONLINE = ON);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Devices_ProvinceId_Status')
CREATE NONCLUSTERED INDEX IX_Devices_ProvinceId_Status
    ON Devices (ProvinceId, Status)
    INCLUDE (Name, GatewayIdentify, MqttTopic)
    WHERE IsDeleted = 0
    WITH (ONLINE = ON);
GO

-- ─────────────────────────────────────────────────────────────
-- 4. TABLE PARTITIONING for DataLogs (monthly partitions)
-- ─────────────────────────────────────────────────────────────

-- Create partition function: monthly boundaries for 2 years
IF NOT EXISTS (SELECT 1 FROM sys.partition_functions WHERE name = 'pf_DataLogs_Monthly')
BEGIN
    CREATE PARTITION FUNCTION pf_DataLogs_Monthly (DATETIME2)
    AS RANGE RIGHT FOR VALUES (
        '2025-01-01', '2025-02-01', '2025-03-01', '2025-04-01',
        '2025-05-01', '2025-06-01', '2025-07-01', '2025-08-01',
        '2025-09-01', '2025-10-01', '2025-11-01', '2025-12-01',
        '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01',
        '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01',
        '2026-09-01', '2026-10-01', '2026-11-01', '2026-12-01',
        '2027-01-01'
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.partition_schemes WHERE name = 'ps_DataLogs_Monthly')
BEGIN
    CREATE PARTITION SCHEME ps_DataLogs_Monthly
    AS PARTITION pf_DataLogs_Monthly
    ALL TO ([PRIMARY]);
END
GO

-- NOTE: To apply partitioning to existing DataLogs table, run:
-- 1. Create new partitioned table
-- 2. INSERT INTO ... SELECT FROM old table
-- 3. Rename tables
-- For a NEW deployment, modify the EF migration to use the partition scheme.

-- ─────────────────────────────────────────────────────────────
-- 5. AUTO-MAINTENANCE: Cleanup old data (> 90 days)
-- ─────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'sp_CleanupOldDataLogs'))
BEGIN
    EXEC('
    CREATE PROCEDURE sp_CleanupOldDataLogs
        @RetentionDays INT = 90,
        @BatchSize INT = 10000
    AS
    BEGIN
        SET NOCOUNT ON;
        DECLARE @CutoffDate DATETIME2 = DATEADD(DAY, -@RetentionDays, GETUTCDATE());
        DECLARE @Deleted INT = 1;

        WHILE @Deleted > 0
        BEGIN
            DELETE TOP (@BatchSize) FROM DataLogs
            WHERE CreatedAt < @CutoffDate;

            SET @Deleted = @@ROWCOUNT;

            -- Avoid lock escalation
            IF @Deleted > 0 WAITFOR DELAY ''00:00:01'';
        END

        -- Log cleanup result
        PRINT ''DataLogs cleanup complete. Cutoff: '' + CAST(@CutoffDate AS VARCHAR(30));
    END
    ');
END
GO

-- ─────────────────────────────────────────────────────────────
-- 6. AUTO-MAINTENANCE: Update statistics
-- ─────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'sp_UpdateAllStatistics'))
BEGIN
    EXEC('
    CREATE PROCEDURE sp_UpdateAllStatistics
    AS
    BEGIN
        SET NOCOUNT ON;
        EXEC sp_updatestats;
        PRINT ''Statistics updated at '' + CAST(GETUTCDATE() AS VARCHAR(30));
    END
    ');
END
GO

-- ─────────────────────────────────────────────────────────────
-- 7. DATABASE SETTINGS for performance
-- ─────────────────────────────────────────────────────────────

-- Enable Read Committed Snapshot for non-blocking reads
ALTER DATABASE [IotMonitoring] SET READ_COMMITTED_SNAPSHOT ON;
GO

-- Auto-shrink OFF (performance anti-pattern)
ALTER DATABASE [IotMonitoring] SET AUTO_SHRINK OFF;
GO

-- Auto-create statistics
ALTER DATABASE [IotMonitoring] SET AUTO_CREATE_STATISTICS ON;
GO
ALTER DATABASE [IotMonitoring] SET AUTO_UPDATE_STATISTICS ON;
GO

PRINT '========================================';
PRINT 'IoT Monitoring SQL Optimization Complete';
PRINT '========================================';
GO
