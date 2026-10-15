import React from 'react';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { useAuthStore } from '../store/useAuthStore';
import { ThemeToggle } from './ThemeToggle';
import { LogoMunicipalidad } from './LogoMunicipalidad';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { NavTab } from './Sidebar';

interface TopHeaderProps {
  tabActiva: NavTab;
  onOpenMobileSidebar: () => void;
  onGoToLanding: () => void;
  onOpenLogin?: () => void;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  LANDING: {
    title: 'Portal Institucional',
    subtitle: 'Bienvenido a la plataforma de gestión de firmas y documentos oficiales',
  },
  PORTAL_CIUDADANO: {
    title: 'Portal Ciudadano y Trámites Digitales',
    subtitle: 'Validación de documentos, certificados y atención para vecinos de Coquimbo',
  },
  DASHBOARD: {
    title: 'Dashboard de Supervisión de Telemetría USB',
    subtitle: 'Monitoreo en tiempo real de estaciones de trabajo y tokens criptográficos físicos',
  },
  FIRMAS: {
    title: 'Orquestación de Firma Masiva por Lotes',
    subtitle: 'Procesamiento asíncrono en segundo plano mediante BullMQ y Redis',
  },
  CHECKSIGN: {
    title: 'Portal de Verificación Documental Checksign',
    subtitle: 'Comprobación de autenticidad criptográfica e integridad (Ley N° 19.799)',
  },
  ALERTAS: {
    title: 'Alertas Preventivas de Vencimiento de Certificados',
    subtitle: 'Monitoreo proactivo de vigencia a escalas de 60, 30 y 15 días',
  },
  AUDITORIA: {
    title: 'Registro de Auditoría Forense ANCI',
    subtitle: 'Trazabilidad inalterable de eventos y mutaciones según Ley N° 21.663',
  },
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  tabActiva,
  onOpenMobileSidebar,
  onGoToLanding,
  onOpenLogin,
}) => {
  const { wsConectado, cargarEstaciones } = useTelemetriaStore();
  const { usuario, isAutenticado, logout } = useAuthStore();
  const current = TAB_TITLES[tabActiva] || TAB_TITLES.DASHBOARD;
  const esCiudadano = usuario.rol === 'CIUDADANO';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 backdrop-blur-md px-4 sm:px-6">
      {/* Botón Menú Móvil, Espacio para Logo Municipal y Títulos */}
      <div className="flex items-center space-x-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenMobileSidebar}
          className="lg:hidden text-xs px-2 h-8 font-semibold"
          aria-label="Abrir menú"
        >
          Menú
        </Button>

        {/* Espacio para Foto/Logo de la Municipalidad en el Header */}
        <div className="cursor-pointer" onClick={onGoToLanding} title="Ir a la portada">
          <LogoMunicipalidad variant="header" />
        </div>

        <div className="hidden sm:block border-l border-border pl-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
              {current.title}
            </h1>
            <Badge variant="outline" className="text-[9px] font-mono py-0 h-4">
              {esCiudadano ? 'VISTA VECINO' : 'VISTA GESTOR'}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground truncate max-w-md">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Acciones Superiores: Conexión WS (solo gestor), Login y Tema */}
      <div className="flex items-center space-x-2">
        {/* Solo mostrar badge técnico WS a gestores */}
        {!esCiudadano && (
          <>
            <Badge
              variant={wsConectado ? 'success' : 'danger'}
              className="flex items-center gap-1.5 py-1 px-2.5 text-[10px] font-mono"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  wsConectado ? 'bg-emerald-500 live-indicator' : 'bg-rose-500'
                }`}
              />
              <span className="hidden md:inline">
                {wsConectado ? 'WS ONLINE' : 'WS OFFLINE'}
              </span>
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={() => cargarEstaciones()}
              className="text-xs h-8 px-2.5 font-medium hidden sm:inline-flex"
              title="Actualizar datos de telemetría"
            >
              Recargar
            </Button>
          </>
        )}

        {/* Botón de Login / Roles */}
        {onOpenLogin && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenLogin}
            className="text-xs h-8 px-3 font-semibold text-primary"
          >
            {isAutenticado ? `Rol: ${usuario.rol}` : 'Iniciar Sesión'}
          </Button>
        )}

        {/* Alternador de Modo Claro/Oscuro */}
        <ThemeToggle />
      </div>
    </header>
  );
};
