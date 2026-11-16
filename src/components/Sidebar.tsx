import React from 'react';
import {
  Monitor,
  Users,
  BellRing,
  History,
  BarChart3,
  FileCheck2,
  PenTool,
  LucideIcon,
} from 'lucide-react';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { useAuthStore } from '../store/useAuthStore';
import { Badge } from './ui/badge';
import { LogoMunicipalidad } from './LogoMunicipalidad';
import { Button } from './ui/button';
import { formatRutVisual } from '../lib/rut';

export type NavTab =
  | 'DASHBOARD'
  | 'FIRMAR'
  | 'ALERTAS'
  | 'METRICAS'
  | 'USUARIOS_CUSTODIA'
  | 'AUDITORIA';

interface SidebarProps {
  tabActiva: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: 'danger' | 'warning';
  statusDot?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tabActiva,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { metricas, estaciones } = useTelemetriaStore();
  const { usuario, logout } = useAuthStore();

  const alertasVencimientos =
    (metricas?.alertasVencimiento?.totalEnUmbral60Dias ?? 0) +
    (metricas?.alertasVencimiento?.expirados ?? 0);
  const contratosAlerta =
    (metricas?.contratosResumen?.contratosPorCaducar ?? 0) +
    (metricas?.contratosResumen?.contratosCaducados ?? 0);
  const conectadosEnVivo = estaciones.filter((e) => e.estadoEnVivo === 'CONECTADO').length;

  const formatearBadge = (count: number): string | undefined => {
    if (count <= 0) return undefined;
    return count > 99 ? '99+' : String(count);
  };

  const itemsControlTokens: NavItemConfig[] = [
    {
      id: 'DASHBOARD',
      icon: Monitor,
      label: 'Control de Tokens y Firmas',
    },
    {
      id: 'FIRMAR',
      icon: PenTool,
      label: 'Firmar Documento',
      statusDot: conectadosEnVivo > 0,
    },
    {
      id: 'ALERTAS',
      icon: BellRing,
      label: 'Alertas de Vencimientos',
      badge: formatearBadge(alertasVencimientos),
      badgeVariant: 'danger',
    },
    {
      id: 'METRICAS',
      icon: BarChart3,
      label: 'Estadisticas',
    },
    {
      id: 'USUARIOS_CUSTODIA',
      icon: Users,
      label: 'Contratos y Asignación',
      badge: formatearBadge(contratosAlerta),
      badgeVariant: 'warning',
    },
    {
      id: 'AUDITORIA',
      icon: History,
      label: 'Bitácora de Acciones',
    },
  ];

  const handleNavClick = (id: NavTab) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-2.5">
            <LogoMunicipalidad variant="sidebar" className="h-8 w-8 shrink-0" />
            <div className="flex flex-col text-left">
              <span className="font-bold text-xs tracking-tight text-sidebar-foreground truncate">
                Municipalidad de Coquimbo
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Control de Tokens FEA
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {itemsControlTokens.map((item) => {
            const isSelected = tabActiva === item.id;
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`group flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded border shrink-0 ${
                      isSelected
                        ? 'border-amber-400/40 text-amber-400 bg-amber-400/10'
                        : 'border-sidebar-border text-muted-foreground group-hover:text-sidebar-foreground'
                    }`}
                  >
                    <IconComponent className="h-3.5 w-3.5" />
                  </span>
                  <span className="leading-snug text-left">{item.label}</span>
                </div>
                {item.statusDot && (
                  <span
                    title="Token USB conectado y listo"
                    className="shrink-0 ml-2 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/25"
                  />
                )}
                {item.badge && (
                  <span
                    className={`shrink-0 ml-2 min-w-[22px] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[11px] font-bold tabular-nums shadow-xs ${
                      item.badgeVariant === 'danger'
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-sidebar-foreground truncate">
              {usuario?.nombre || 'Operador Municipal'}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              • {usuario?.rol || 'ADMIN'}
            </span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            RUT: {formatRutVisual(usuario?.rut || '11.111.111-1')}
          </div>
          <Button
            onClick={logout}
            variant="outline"
            size="sm"
            className="w-full text-xs h-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/30 font-semibold"
          >
            Cerrar Sesión
          </Button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
