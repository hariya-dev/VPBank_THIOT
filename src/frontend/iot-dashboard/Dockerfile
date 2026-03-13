# ── Build stage ───────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY src/frontend/iot-dashboard/package*.json ./
RUN npm ci --legacy-peer-deps

COPY src/frontend/iot-dashboard/ .
RUN npx ng build --configuration production

# ── Runtime stage ─────────────────────────────────────
FROM nginx:alpine AS runtime

# Custom nginx config for Angular SPA
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Angular app
COPY --from=build /app/dist/iot-dashboard/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1
