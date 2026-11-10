import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { ThemeToggle } from './ThemeToggle';
import { LogoMunicipalidad } from './LogoMunicipalidad';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { NavTab } from './Sidebar';
import { Usb } from 'lucide-react';

interface TopHeaderProps {
  tabActiva: NavTab;
  onOpenMobileSidebar: () => void;
  onSelectTab?: (tab: NavTab) => void;
}

const TAB_TITLES: Record<NavTab, string> = {
  DASHBOARD: 'Control de Tokens, Firmas Asignadas y Acciones por Funcionario',
  FIRMAR: 'Firma Electrónica Avanzada con Token USB',
  ALERTAS: 'Alertas de Vencimientos',
  METRICAS: 'Estadisticas',
  USUARIOS_CUSTODIA: 'Contratos de Obtención de Tokens y Asignación a Funcionarios',
  AUDITORIA: 'Bitácora de Acciones de Firma',
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  tabActiva,
  onOpenMobileSidebar,
}) => {
  const { usuario, logout } = useAuthStore();
  const { estaciones } = useTelemetriaStore();
  const currentTitle = TAB_TITLES[tabActiva] || TAB_TITLES.DASHBOARD;

  // Buscar si la estación local o asignada al usuario tiene un token físico conectado
  const estacionUsuario = estaciones.find(
    (e) =>
      e.codigoPc.toUpperCase().includes('1LK714Q') ||
      e.codigoPc.toUpperCase() === 'DESKTOP-1LK714Q' ||
      (usuario?.rut && e.codigoPc.includes(usuario.rut.replace(/[.-]/g, ''))) ||
      (e.tokenInfo && (e.tokenInfo.serialNumber?.includes('D453B70C2CF7') || e.tokenInfo.modelo?.includes('Ezio')))
  ) || estaciones.find((e) => e.estadoEnVivo === 'CONECTADO');

  const estaConectado = estacionUsuario?.estadoEnVivo === 'CONECTADO';
  const infoToken = estacionUsuario?.tokenInfo;

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
        {usuario && (
          <div className="flex items-center gap-2">
            {/* Indicador de Token Físico en Vivo del Usuario */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono transition-colors ${
                estaConectado
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-border/60 bg-muted/30 text-muted-foreground'
              }`}
              title={
                estaConectado
                  ? `Token Criptográfico Conectado en ${estacionUsuario?.codigoPc || 'Estación'}: ${infoToken?.marca || ''} ${infoToken?.modelo || ''} (S/N: ${infoToken?.serialNumber || 'Detectado'})`
                  : 'Ningún Token Criptográfico físico detectado en su estación de trabajo'
              }
            >
              <Usb className={`w-3.5 h-3.5 ${estaConectado ? 'animate-pulse text-emerald-500' : 'text-muted-foreground'}`} />
              <span className="font-semibold text-[11px]">
                {estaConectado ? 'Token USB Conectado' : 'Token USB: Desconectado'}
              </span>
              {estaConectado && infoToken?.serialNumber && (
                <span className="text-[10px] opacity-80 hidden lg:inline">
                  ({infoToken.serialNumber})
                </span>
              )}
            </div>

            <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-muted/40 border border-border/60 text-xs">
              <span className="font-bold text-foreground truncate max-w-[150px]">
                {usuario.nombre}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                • {usuario.rol}
              </span>
            </div>
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
