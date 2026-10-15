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
  onSelectTab?: (tab: NavTab) => void;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  LANDING: {
    title: 'Portada de Bienvenida Institucional',
    subtitle: 'Plataforma oficial de gestión de firmas electrónicas avanzadas (FEA) de Coquimbo',
  },
  MIS_DOCUMENTOS: {
    title: 'Bandeja de Documentos Asignados',
    subtitle: 'Gestión personal y firma digital de decretos, resoluciones y memorándums',
  },
  FE_PUBLICA: {
    title: 'Despacho de Decretos y Fe Pública Municipal',
    subtitle: 'Sección Exclusiva: Toma de razón, visación legal y estampillado ministerial',
  },
  DASHBOARD: {
    title: 'Dashboard de Supervisión de Telemetría de Tokens',
    subtitle: 'Monitoreo en tiempo real de estaciones de trabajo y tokens criptográficos físicos',
  },
  FIRMAS: {
    title: 'Orquestación de Firma Masiva por Lotes',
    subtitle: 'Procesamiento paralelo asíncrono en segundo plano',
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
  CONFIGURACION: {
    title: 'Configuración del Sistema y Parámetros de Red',
    subtitle: 'Gestión técnica de topología, puertos y directivas criptográficas',
  },
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  tabActiva,
  onOpenMobileSidebar,
  onGoToLanding,
  onOpenLogin,
  onSelectTab,
}) => {
  const { wsConectado, cargarEstaciones } = useTelemetriaStore();
  const { usuario, isAutenticado, logout, vistaGeneralActiva, setVistaGeneralActiva } = useAuthStore();
  const current = TAB_TITLES[tabActiva] || TAB_TITLES.DASHBOARD;
  const puedeAlternarVistas = usuario.rol === 'ADMIN' || usuario.rol === 'SUPERVISOR';

  const alternarVista = () => {
    const nuevaVista = vistaGeneralActiva === 'ADMIN' ? 'FUNCIONARIO' : 'ADMIN';
    setVistaGeneralActiva(nuevaVista);
    if (onSelectTab) {
      onSelectTab(nuevaVista === 'ADMIN' ? 'DASHBOARD' : 'MIS_DOCUMENTOS');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 backdrop-blur-md px-4 sm:px-6">
      {/* Botón Menú Móvil, Logo Municipal y Títulos */}
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

        <div className="cursor-pointer" onClick={onGoToLanding} title="Ir a la portada de bienvenida">
          <LogoMunicipalidad variant="header" />
        </div>

        <div className="hidden sm:block border-l border-border pl-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
              {current.title}
            </h1>
            <Badge variant="outline" className="text-[9px] font-mono py-0 h-4 border-amber-500/40 text-amber-600 dark:text-amber-400">
              ROL: {usuario.rol}
            </Badge>
            <Badge variant="secondary" className="text-[9px] font-mono py-0 h-4">
              {vistaGeneralActiva === 'ADMIN' ? 'VISTA ADMIN' : 'VISTA FUNCIONARIO'}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground truncate max-w-md">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Acciones Superiores: Conmutador de Vista General, Conexión WS, Login y Tema */}
      <div className="flex items-center space-x-2">
        {puedeAlternarVistas && (
          <Button
            variant="outline"
            size="sm"
            onClick={alternarVista}
            className="text-xs h-8 px-2.5 font-semibold hidden md:inline-flex"
            title="Alternar entre la Vista de Administrador y la Vista de Funcionario"
          >
            {vistaGeneralActiva === 'ADMIN' ? '👤 Ver como Funcionario' : '🏢 Ver como Admin'}
          </Button>
        )}

        {vistaGeneralActiva === 'ADMIN' && (
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
              <span className="hidden lg:inline">
                {wsConectado ? 'WS ONLINE' : 'WS OFFLINE'}
              </span>
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={() => cargarEstaciones()}
              className="text-xs h-8 px-2 font-medium hidden xl:inline-flex"
              title="Actualizar datos de telemetría"
            >
              Recargar
            </Button>
          </>
        )}

        {isAutenticado && (
          <div className="hidden 2xl:flex flex-col text-right text-[11px] px-2 border-r border-border">
            <span className="font-semibold text-foreground truncate max-w-[180px]">
              {usuario.nombre}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]">
              {usuario.cargo}
            </span>
          </div>
        )}

        <ThemeToggle />

        {onOpenLogin && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenLogin}
            className="text-xs h-8 px-2.5 font-mono text-muted-foreground hover:text-foreground"
            title="Cambiar credenciales o simular otro rol de backend"
          >
            Cambiar Rol
          </Button>
        )}

        {isAutenticado && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              onGoToLanding();
            }}
            className="text-xs h-8 px-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
            title="Cerrar sesión institucional"
          >
            Salir
          </Button>
        )}
      </div>
    </header>
  );
};
export default TopHeader;
