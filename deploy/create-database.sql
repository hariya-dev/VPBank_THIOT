IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312161441_InitialCreate'
)
BEGIN
    CREATE TABLE [Provinces] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(100) NOT NULL,
        [Code] nvarchar(10) NULL,
        [SortOrder] int NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_Provinces] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312161441_InitialCreate'
)
BEGIN
    CREATE TABLE [Users] (
        [Id] uniqueidentifier NOT NULL DEFAULT (NEWSEQUENTIALID()),
        [Username] nvarchar(50) NOT NULL,
        [PasswordHash] nvarchar(500) NOT NULL,
        [FullName] nvarchar(100) NOT NULL,
        [Email] nvarchar(200) NULL,
        [Role] tinyint NOT NULL,
        [IsActive] bit NOT NULL,
        [RefreshToken] nvarchar(500) NULL,
        [RefreshTokenExpiry] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312161441_InitialCreate'
)
BEGIN
    CREATE TABLE [Devices] (
        [Id] int NOT NULL IDENTITY,
        [ProvinceId] int NOT NULL,
        [GatewayIdentify] nvarchar(100) NOT NULL,
        [MqttTopic] nvarchar(200) NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [Description] nvarchar(500) NULL,
        [Latitude] float NULL,
        [Longitude] float NULL,
        [Status] tinyint NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_Devices] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Devices_Provinces_ProvinceId] FOREIGN KEY ([ProvinceId]) REFERENCES [Provinces] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312161441_InitialCreate'
)
BEGIN
    CREATE TABLE [AlarmLogs] (
        [Id] bigint NOT NULL IDENTITY,
        [DeviceId] int NOT NULL,
        [AlarmType] tinyint NOT NULL,
        [Severity] tinyint NOT NULL,
        [Message] nvarchar(500) NOT NULL,
        [Value] float NULL,
        [Threshold] float NULL,
        [IsAcknowledged] bit NOT NULL,
        [AcknowledgedAt] datetime2 NULL,
        [AcknowledgedBy] nvarchar(100) NULL,
        [IsResolved] bit NOT NULL,
        [ResolvedAt] datetime2 NULL,
        [ResolvedBy] nvarchar(100) NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_AlarmLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AlarmLogs_Devices_DeviceId] FOREIGN KEY ([DeviceId]) REFERENCES [Devices] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312161441_InitialCreate'
)
BEGIN
    CREATE TABLE [DataLogs] (
        [Id] bigint NOT NULL IDENTITY,
        [DeviceId] int NOT NULL,
        [Temperature] float NULL,
        [Humidity] float NULL,
        [Quality] tinyint NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_DataLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DataLogs_Devices_DeviceId] FOREIGN KEY ([DeviceId]) REFERENCES [Devices] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312161441_InitialCreate'
)
BEGIN
    CREATE TABLE [DeviceSettings] (
        [DeviceId] int NOT NULL,
        [TempHigh] float NOT NULL,
        [TempLow] float NOT NULL,
        [HumiHigh] float NOT NULL,
        [HumiLow] float NOT NULL,
        [LogCycleSeconds] int NOT NULL,
        [OfflineTimeout] int NOT NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_DeviceSettings] PRIMARY KEY ([DeviceId]),
        CONSTRAINT [FK_DeviceSettings_Devices_DeviceId] FOREIGN KEY ([DeviceId]) REFERENCES [Devices] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312161441_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AlarmLogs_DeviceId_CreatedAt] ON [AlarmLogs] ([DeviceId], [CreatedAt] DESC);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312161441_InitialCreate'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_AlarmLogs_IsResolved_IsAcknowledged] ON [AlarmLogs] ([IsResolved], [IsAcknowledged]) WHERE [IsResolved] = 0');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312161441_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_DataLogs_DeviceId_CreatedAt] ON [DataLogs] ([DeviceId], [CreatedAt] DESC);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312161441_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Devices_GatewayIdentify] ON [Devices] ([GatewayIdentify]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312161441_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Devices_ProvinceId] ON [Devices] ([ProvinceId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312161441_InitialCreate'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_Devices_Status] ON [Devices] ([Status]) WHERE [IsActive] = 1');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312161441_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Users_Username] ON [Users] ([Username]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260312161441_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260312161441_InitialCreate', N'8.0.12');
END;
GO

COMMIT;
GO

