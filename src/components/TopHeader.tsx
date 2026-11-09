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
  onSelectTab?: (tab: NavTab) => void;
}

const TAB_TITLES: Record<NavTab, string> = {
  DASHBOARD: 'Control de Tokens, Firmas Asignadas y Acciones por Funcionario',
  ALERTAS: 'Vigencia de Tokens (15, 30 y 60 días) y Avisos por Correo',
  METRICAS: 'Estadísticas y Exportación Summary PDF / LaTeX',
  USUARIOS_CUSTODIA: 'Contratos de Obtención de Tokens y Asignación a Funcionarios',
  AUDITORIA: 'Bitácora de Acciones de Firma',
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  tabActiva,
  onOpenMobileSidebar,
}) => {
  const { cargarEstaciones, cargarMetricas } = useTelemetriaStore();
  const { usuario, logout } = useAuthStore();
  const currentTitle = TAB_TITLES[tabActiva] || TAB_TITLES.DASHBOARD;

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b bg-background/95 backdrop-blur-md px-4 sm:px-6">
      <div className="flex items-center space-x-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenMobileSidebar}
          className="lg:hidden text-xs px-2 h-8 font-semibold"
        >
          Menú
        </Button>

        <LogoMunicipalidad variant="header" />

        <div className="hidden sm:block border-l border-border pl-3">
          <h1 className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
            {currentTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            cargarEstaciones();
            cargarMetricas();
          }}
          className="text-xs h-8 px-2.5 font-medium hidden sm:inline-flex"
        >
          ↻ Sincronizar
        </Button>

        {usuario && (
          <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-muted/40 border border-border/60 text-xs">
            <span className="font-bold text-foreground truncate max-w-[150px]">
              {usuario.nombre}
            </span>
            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
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
          >
            Salir
          </Button>
        )}
      </div>
    </header>
  );
};

export default TopHeader;
