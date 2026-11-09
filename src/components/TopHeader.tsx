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
    subtitle: 'Sistema de Control y Seguimiento de Tokens de Firma Electrónica — Municipalidad de Coquimbo',
  },
  DASHBOARD: {
    title: 'Control de Tokens y Firmas Asignadas',
    subtitle: 'Dispositivos existentes/activos/expirados, firmas asignadas, acciones por funcionario y estado en sesión',
  },
  ALERTAS: {
    title: 'Vigencia y Vencimientos de Tokens (15, 30 y 60 días)',
    subtitle: 'Seguimiento de tokens próximos a vencer y despacho de avisos preventivos por correo electrónico',
  },
  METRICAS: {
    title: 'Estadísticas, Métricas y Summary PDF (LaTeX)',
    subtitle: 'Indicadores integrales por período (7, 15, 30 días, Mes y Año) con previsualización LaTeX y descarga PDF',
  },
  USUARIOS_CUSTODIA: {
    title: 'Contratos de Obtención de Tokens, Asignación y Custodia',
    subtitle: 'Control de caducidad de contratos (con visor PDF), asignación de firmas/tokens a funcionarios y actas',
  },
  AUDITORIA: {
    title: 'Bitácora de Actividad de Tokens',
    subtitle: 'Registro inalterable de acciones de firma, entregas y telemetría desde sesión y dispositivo',
  },
  CONFIGURACION: {
    title: 'Parámetros de Control de Tokens',
    subtitle: 'Configuración de alertas de vigencia, agente USB y parámetros del entorno de test',
  },
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  tabActiva,
  onOpenMobileSidebar,
  onGoToLanding,
}) => {
  const { cargarEstaciones, cargarMetricas } = useTelemetriaStore();
  const { usuario, logout } = useAuthStore();
  const current = TAB_TITLES[tabActiva] || TAB_TITLES.DASHBOARD;

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
            <Badge variant="outline" className="text-[9px] font-mono border-primary/40 text-primary hidden xl:inline-flex">
              CONTROL DE TOKENS
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground truncate max-w-xl">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Acciones Superiores: Sincronizar Telemetría, Perfil Real, Tema y Logout */}
      <div className="flex items-center space-x-2.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            cargarEstaciones();
            cargarMetricas();
          }}
          className="text-xs h-8 px-2.5 font-medium hidden sm:inline-flex"
          title="Sincronizar estado de tokens y métricas desde sesión/dispositivo"
        >
          ↻ Sincronizar Tokens
        </Button>

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
