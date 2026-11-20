import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { ThemeToggle } from './ThemeToggle';
import { LogoMunicipalidad } from './LogoMunicipalidad';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { NavTab } from './Sidebar';
import { Usb, Menu } from 'lucide-react';

interface TopHeaderProps {
  tabActiva: NavTab;
  onOpenMobileSidebar: () => void;
  onSelectTab?: (tab: NavTab) => void;
}

const TAB_TITLES: Record<NavTab, string> = {
  DASHBOARD: 'Control y Trazabilidad de Tokens Criptográficos',
  FIRMAR: 'Firma Electrónica Avanzada con Token USB',
  DOCUMENTOS: 'Repositorio de Documentos Firmados',
  ALERTAS: 'Alertas de Vencimientos de Tokens',
  METRICAS: 'Estadisticas de Trazabilidad',
  USUARIOS_CUSTODIA: 'Contratos de Obtención de Tokens y Asignación a Funcionarios',
  AUDITORIA: 'Bitácora de Acciones y Telemetría',
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  tabActiva,
  onOpenMobileSidebar,
}) => {
  const { usuario, logout } = useAuthStore();
  const { estaciones, metricas } = useTelemetriaStore();
  const currentTitle = TAB_TITLES[tabActiva] || TAB_TITLES.DASHBOARD;

  // Buscar dinámicamente cualquier estación con un token físico conectado (priorizando aquel con titular identificado por Ghost App)
  const estacionUsuario =
    estaciones.find((e) => e.estadoEnVivo === 'CONECTADO' && Boolean(e.tokenInfo?.titularNombre)) ||
    estaciones.find(
      (e) =>
        e.estadoEnVivo === 'CONECTADO' &&
        (e.codigoPc.toUpperCase().includes('1LK714Q') ||
          (usuario?.rut && e.tokenInfo?.titularRut === usuario.rut))
    ) ||
    estaciones.find((e) => e.estadoEnVivo === 'CONECTADO' && Boolean(e.tokenInfo?.serialNumber));

  const estaConectado = estacionUsuario?.estadoEnVivo === 'CONECTADO';
  const infoToken = estacionUsuario?.tokenInfo;

  // Obtener la última persona que conectó un token si actualmente no hay ninguno en línea
  const ultimaPersonaConectada = (() => {
    // 1. Si hay alguna estación con token o metadatos previos
    const estConTitular = estaciones.find((e) => Boolean(e.tokenInfo?.titularNombre));
    if (estConTitular?.tokenInfo?.titularNombre) {
      return estConTitular.tokenInfo.titularNombre;
    }
    // 2. Si no, revisar en trazabilidad de dispositivos (el más reciente activo)
    const traza = metricas?.telemetria?.trazabilidadDispositivos || [];
    const conTitular = traza.find((t) => Boolean(t.funcionarioAsignado?.nombre));
    if (conTitular?.funcionarioAsignado?.nombre) {
      return conTitular.funcionarioAsignado.nombre;
    }
    // 3. Fallback al usuario autenticado actual si es funcionario
    return usuario?.nombre || null;
  })();

  const textoUltimoToken = estaConectado
    ? infoToken?.titularNombre
      ? `Último token: ${infoToken.titularNombre}`
      : 'Último token: Conectado'
    : ultimaPersonaConectada
      ? `Último token: ${ultimaPersonaConectada}`
      : 'Último token: Desconectado';

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur-md">
      <div className="flex h-14 w-full items-center justify-between gap-2 px-3 sm:px-5 lg:px-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenMobileSidebar}
            aria-label="Abrir menú lateral"
            className="lg:hidden h-8 px-2 gap-1.5 text-xs font-semibold shrink-0"
          >
            <Menu className="w-4 h-4" />
            <span className="hidden sm:inline">Menú</span>
          </Button>

          <LogoMunicipalidad variant="header" className="h-8 w-8 sm:h-9 sm:w-9" />

          <div className="min-w-0 flex-1 border-l border-border pl-2.5 sm:pl-3">
            <h1 className="text-xs sm:text-sm font-bold tracking-tight text-foreground truncate">
              {currentTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {usuario && (
            <div className="flex items-center gap-2">
              {/* Indicador de Token Físico / Último Token Detectado */}
              <div
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono max-w-[220px] xl:max-w-[320px] transition-colors ${
                  estaConectado
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border/60 bg-muted/30 text-muted-foreground'
                }`}
                title={
                  estaConectado
                    ? `Token Criptográfico Conectado en ${estacionUsuario?.codigoPc || 'Estación'} — Titular: ${infoToken?.titularNombre || 'Detectado'} (S/N: ${infoToken?.serialNumber || 'Detectado'})`
                    : `${textoUltimoToken} — Ningún Token Criptográfico físico conectado actualmente`
                }
              >
                <Usb className={`w-3.5 h-3.5 shrink-0 ${estaConectado ? 'animate-pulse text-emerald-500' : 'text-muted-foreground'}`} />
                <span className="font-semibold text-[11px] truncate">
                  {textoUltimoToken}
                </span>
                {estaConectado && infoToken?.serialNumber && (
                  <span className="text-[10px] opacity-80 hidden xl:inline shrink-0">
                    ({infoToken.serialNumber})
                  </span>
                )}
              </div>

              <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-muted/40 border border-border/60 text-xs">
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
              className="text-xs h-8 px-2 sm:px-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
            >
              Salir
            </Button>
          )}
        </div>
      </div>

      {/* Barra compacta en móviles/tablets para mantener visible el último token y usuario */}
      {usuario && (
        <div className="md:hidden flex items-center justify-between gap-2 px-3 py-1.5 border-t border-border/60 bg-muted/20 text-[11px]">
          <div
            className={`flex items-center gap-1.5 min-w-0 font-mono ${
              estaConectado
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-muted-foreground'
            }`}
          >
            <Usb className={`w-3 h-3 shrink-0 ${estaConectado ? 'animate-pulse text-emerald-500' : 'text-muted-foreground'}`} />
            <span className="truncate">{textoUltimoToken}</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase shrink-0 truncate max-w-[42%]">
            {usuario.nombre ? `${usuario.nombre.split(' ')[0]} • ${usuario.rol}` : usuario.rol}
          </span>
        </div>
      )}
    </header>
  );
};

export default TopHeader;
