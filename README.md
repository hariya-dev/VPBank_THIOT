# IoT Monitoring System - Real-time Dashboard
# ====================================================
# Clean Architecture | .NET 8 | Angular 18 | MSSQL | Redis | MQTT | SignalR

## Quick Start

### Prerequisites
- .NET 8 SDK
- Node.js 18+
- Docker & Docker Compose (for Redis & MSSQL)

### Run Infrastructure
```bash
docker-compose up -d mssql redis
```

### Run Backend
```bash
cd src/IotMonitoring.WebApi
dotnet run
```

### Run Frontend (after Sprint 4)
```bash
cd src/frontend/iot-dashboard
npm install
ng serve
```

## Architecture
```
Domain Layer → Application Layer → Infrastructure Layer → Presentation Layer
     ↑              ↑                    ↑                      ↑
  Entities      MediatR/CQRS       EF Core, Redis,        Controllers,
  Enums         Validators         Dapper, MQTT           SignalR Hub,
  Interfaces    Event Handlers     JWT Auth               Workers
```

## API Documentation
Visit: http://localhost:5000/swagger
