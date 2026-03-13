-- Migration: Add User-Device Permissions
-- Run this against your SQL Server database

-- 1. Add ProvinceId to Users table
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'ProvinceId')
BEGIN
    ALTER TABLE Users ADD ProvinceId INT NULL;
    ALTER TABLE Users ADD CONSTRAINT FK_Users_Province 
        FOREIGN KEY (ProvinceId) REFERENCES Provinces(Id);
END
GO

-- 2. Create UserDevices junction table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserDevices')
BEGIN
    CREATE TABLE UserDevices (
        UserId UNIQUEIDENTIFIER NOT NULL,
        DeviceId INT NOT NULL,
        AssignedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_UserDevices PRIMARY KEY (UserId, DeviceId),
        CONSTRAINT FK_UserDevices_User FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
        CONSTRAINT FK_UserDevices_Device FOREIGN KEY (DeviceId) REFERENCES Devices(Id) ON DELETE CASCADE
    );

    CREATE INDEX IX_UserDevices_UserId ON UserDevices (UserId);
    CREATE INDEX IX_UserDevices_DeviceId ON UserDevices (DeviceId);
END
GO

PRINT 'Migration completed: UserDevices table and User.ProvinceId added.';
GO
