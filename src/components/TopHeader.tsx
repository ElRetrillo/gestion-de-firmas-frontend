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
  onSelectTab?: (tab: NavTab) => void;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  LANDING: {
    title: 'Portada Institucional',
    subtitle: 'Plataforma oficial de gestión y firma electrónica de Coquimbo',
  },
  MIS_DOCUMENTOS: {
    title: 'Mis Documentos',
    subtitle: 'Gestión personal y firma de decretos, resoluciones y oficios',
  },
  FE_PUBLICA: {
    title: 'Fe Pública y Decretos',
    subtitle: 'Revisión, visación y certificación oficial de documentos',
  },
  DASHBOARD: {
    title: 'Dispositivos Conectados',
    subtitle: 'Supervisión en tiempo real de los equipos y dispositivos de firma',
  },
  FIRMAS: {
    title: 'Firma Masiva de Documentos',
    subtitle: 'Firma simultánea de múltiples documentos en segundo plano',
  },
  USUARIOS_CUSTODIA: {
    title: 'Gestión de Funcionarios y Custodia',
    subtitle: 'Administración de usuarios y registro de entrega de dispositivos',
  },
  CHECKSIGN: {
    title: 'Verificación de Documentos',
    subtitle: 'Comprobación de autenticidad y validez de firmas en documentos PDF',
  },
  ALERTAS: {
    title: 'Alertas y Vencimientos',
    subtitle: 'Avisos preventivos sobre la vigencia de certificados digitales',
  },
  AUDITORIA: {
    title: 'Historial de Actividad',
    subtitle: 'Registro y seguimiento de todas las acciones realizadas en la plataforma',
  },
  CONFIGURACION: {
    title: 'Configuración del Sistema',
    subtitle: 'Parámetros generales y preferencias de la plataforma',
  },
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  tabActiva,
  onOpenMobileSidebar,
  onGoToLanding,
  onSelectTab,
}) => {
  const { wsConectado, cargarEstaciones } = useTelemetriaStore();
  const { usuario, logout } = useAuthStore();
  const current = TAB_TITLES[tabActiva] || TAB_TITLES.DASHBOARD;

  const esAdmin = usuario?.rol === 'ADMIN' || usuario?.rol === 'SUPERVISOR';

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
          </div>
          <p className="text-[10px] text-muted-foreground truncate max-w-md">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Acciones Superiores: Perfil Real, Recargar Telemetría, Tema y Logout */}
      <div className="flex items-center space-x-2.5">
        {esAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarEstaciones()}
            className="text-xs h-8 px-2.5 font-medium hidden sm:inline-flex"
            title="Actualizar estado de conexión"
          >
            Actualizar Estado
          </Button>
        )}

        {usuario && (
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-muted/40 border border-border/60">
            <div className="hidden md:flex flex-col text-right text-xs">
              <span className="font-bold text-foreground truncate max-w-[170px]" title={usuario.nombre}>
                {usuario.nombre}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[170px]">
                {usuario.rut}
              </span>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-mono font-bold px-1.5 py-0 ${
                usuario.rol === 'ADMIN'
                  ? 'border-amber-400 text-amber-400 bg-amber-400/10'
                  : 'border-emerald-400 text-emerald-400 bg-emerald-400/10'
              }`}
            >
              {usuario.rol}
            </Badge>
          </div>
        )}

        <ThemeToggle />

        {usuario && (
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-xs h-8 px-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
            title="Cerrar sesión actual"
          >
            Cerrar Sesión
          </Button>
        )}
      </div>
    </header>
  );
};

export default TopHeader;
