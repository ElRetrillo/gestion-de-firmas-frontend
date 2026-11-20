# Frontend — Monitoreo y Telemetría de Tokens USB

**Ilustre Municipalidad de Coquimbo**

Aplicación web administrativa para el monitoreo en tiempo real, control de vigencia, estadísticas de trazabilidad y auditoría de tokens criptográficos USB. Construida con **React 18 + TypeScript + Vite + Tailwind CSS + Zustand**.

## Vistas Activas

- **Portada e Inicio de Sesión** (`LandingPage`, `LoginModal`): acceso administrativo con RUT, PIN de 6 caracteres y verificación MFA (TOTP / Authenticator con código QR).
- **Control de Tokens** (`DashboardSupervisores`): supervisión en vivo vía WebSocket de tokens conectados/desconectados, titular detectado desde certificado X.509, vigencia, tiempo de uso, envío de avisos por correo y descarga del agente USB.
- **Alertas de Vencimientos** (`AlertasCertificadosView`): control preventivo por tramos (`≤ 15`, `≤ 30`, `≤ 60` días y expirados) con vista previa y despacho individual o masivo vía SMTP.
- **Estadísticas** (`MetricasTrazabilidadPanel`, `ReporteHistoricoEsign`): indicadores porcentuales por período, evolución temporal, detección de tokens sin uso, previsualización/exportación de resumen en LaTeX/PDF y reporte histórico E-Sign 2025–2026.
- **Bitácora de Acciones** (`AuditoriaView`): registro de auditoría general y sesiones (`Logins y Sign Outs`) con filtros, inspector de cambios y exportación CSV/JSON.
- **Accesos Admin** (`GestionAdminsView`): generación de credenciales iniciales y revocación de cuentas administradoras.

## Requisitos Previos

- **Node.js** 18+ (recomendado v20) y **npm** 9+.
- **Backend Core** en ejecución en `http://localhost:3001` (repositorio `gestion-de-firmas`).

## Desarrollo Local

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. (Opcional) Configurar variables de entorno copiando `.env.example` a `.env`:

   ```bash
   cp .env.example .env
   ```

3. Iniciar servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Disponible en `http://localhost:3000`. Vite redirige automáticamente `/api` y `/socket.io` hacia `http://localhost:3001`.

## Compilación para Producción

```bash
npm run build
```

Genera los artefactos estáticos optimizados en `dist/` tras validar los tipos con `tsc`.

## Despliegue con Docker Compose en VM

El proyecto incluye un `Dockerfile` multi-stage (`node:20-alpine` → `nginx:1.27-alpine`) que compila el frontend y sirve `dist/` sobre el puerto `80` con fallback SPA (`try_files $uri $uri/ /index.html`).

En entorno productivo (VM), el servicio frontend se despliega junto al backend y PostgreSQL mediante el `docker-compose.yml` del repositorio backend (`gestion-de-firmas`), donde Nginx enruta el tráfico de la aplicación y delega `/api` y `/socket.io` al servicio backend.
