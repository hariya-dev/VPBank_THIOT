# ── Build stage ───────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Copy csproj first for layer caching
COPY src/IotMonitoring.Domain/IotMonitoring.Domain.csproj IotMonitoring.Domain/
COPY src/IotMonitoring.Application/IotMonitoring.Application.csproj IotMonitoring.Application/
COPY src/IotMonitoring.Infrastructure/IotMonitoring.Infrastructure.csproj IotMonitoring.Infrastructure/
COPY src/IotMonitoring.WebApi/IotMonitoring.WebApi.csproj IotMonitoring.WebApi/
RUN dotnet restore IotMonitoring.WebApi/IotMonitoring.WebApi.csproj

# Copy everything and publish
COPY src/ .
RUN dotnet publish IotMonitoring.WebApi/IotMonitoring.WebApi.csproj \
    -c Release -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ── Runtime stage ─────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

# Install ICU for globalization support + curl for healthcheck
RUN apk add --no-cache icu-libs curl

ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
    ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

COPY --from=build --chown=appuser:appgroup /app/publish .

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "IotMonitoring.WebApi.dll"]
