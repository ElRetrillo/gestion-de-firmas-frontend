# Frontend - Sistema de Gestión de Firmas y Telemetría USB
### Ilustre Municipalidad de Coquimbo

Frontend institucional para la supervisión en tiempo real de tokens criptográficos físicos (SafeNet, ePass2003) y orquestación de firmas masivas de decretos (FirmaGob / ESIGN), construido con **React 18 + TypeScript + Vite + Tailwind CSS** y componentes de **[ui.shadcn.com](https://ui.shadcn.com)**.

---

## 🚀 Requisitos Previos

* **Node.js**: v18 o superior (v20 recomendado)
* **npm**: v9 o superior
* **Backend Core**: En ejecución en `http://localhost:3001` (mediante Docker en el repositorio `gestion-de-firmas`).

---

## 🛠️ Instalación y Puesta en Marcha

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno (Opcional):**
   ```bash
   copy .env.example .env
   ```

3. **Iniciar servidor de desarrollo (Vite):**
   ```bash
   npm run dev
   ```
   * La aplicación estará disponible en: `http://localhost:3000`
   * Vite está configurado con proxy inverso local automático para redirigir `/api` y `/socket.io` directamente hacia `http://localhost:3001` sin conflictos de CORS.

4. **Compilar para producción:**
   ```bash
   npm run build
   ```

---

## 📦 Estructura del Proyecto

```
gestion-de-firmas-frontend/
├── public/                 # Logotipos institucionales (PNG/SVG)
├── src/
│   ├── components/         # Vistas y componentes de UI
│   │   ├── ui/             # Primitivas de diseño de ui.shadcn.com (Card, Badge, Button, Table, etc.)
│   │   ├── LandingPage.tsx # Portada institucional interactiva (Zig.ai style)
│   │   ├── DashboardSupervisores.tsx # Bento Grid de telemetría de hardware USB
│   │   ├── FirmaLotesView.tsx # Pipeline visual BullMQ + Redis
│   │   ├── ChecksignView.tsx # Portal de verificación criptográfica Ley 19.799
│   │   ├── AlertasCertificadosView.tsx # Radar preventivo a 60, 30 y 15 días
│   │   ├── AuditoriaView.tsx # Trazabilidad inalterable forense (Ley 21.663)
│   │   ├── Sidebar.tsx     # Barra lateral sobria institucional
│   │   └── TopHeader.tsx   # Header con espacio de foto y selector de tema claro/oscuro
│   ├── store/              # Gestión de estado (Zustand: telemetría, auth, tema)
│   ├── types/              # Tipados TypeScript estrictos
│   └── App.tsx             # Enrutador principal de módulos
├── tailwind.config.js      # Configuración de paleta institucional HSL
└── vite.config.ts          # Configuración de proxy y puerto
```

---

## ⚖️ Cumplimiento Normativo
* **Ley N° 19.799**: Sobre Documentos Electrónicos, Firma Electrónica y Servicios de Certificación.
* **Ley N° 21.180**: Transformación Digital del Estado.
* **Ley N° 21.663**: Ley Marco de Ciberseguridad e Infraestructura Crítica de la Información (ANCI).
