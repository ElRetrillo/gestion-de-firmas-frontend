import React from 'react';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { useAuthStore } from '../store/useAuthStore';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { LogoMunicipalidad } from './LogoMunicipalidad';

export type NavTab = 'LANDING' | 'PORTAL_CIUDADANO' | 'DASHBOARD' | 'FIRMAS' | 'CHECKSIGN' | 'ALERTAS' | 'AUDITORIA';

interface SidebarProps {
  tabActiva: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onOpenLogin?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tabActiva,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onOpenLogin,
}) => {
  const { estaciones, wsConectado } = useTelemetriaStore();
  const { usuario, isAutenticado, logout } = useAuthStore();

  const total = estaciones.length;
  const conectados = estaciones.filter((e) => e.estadoEnVivo === 'CONECTADO').length;
  const firmando = estaciones.filter((e) => e.estadoEnVivo === 'FIRMANDO').length;
  const desconectados = estaciones.filter((e) => e.estadoEnVivo === 'DESCONECTADO').length;

  const esCiudadano = usuario.rol === 'CIUDADANO';

  // Navegación diferenciada según vista/rol
  const navItems: Array<{
    id: NavTab;
    tag: string;
    label: string;
    badge?: string;
    badgeVariant?: 'default' | 'secondary' | 'warning' | 'outline' | 'success' | 'danger';
    description: string;
    soloGestor?: boolean;
  }> = [
    {
      id: 'LANDING',
      tag: '00',
      label: 'Inicio / Portada',
      description: 'Página de inicio institucional',
    },
    {
      id: 'PORTAL_CIUDADANO',
      tag: '01',
      label: 'Portal Ciudadano',
      description: 'Trámites y validación para el vecino',
    },
    {
      id: 'CHECKSIGN',
      tag: '02',
      label: 'Verificador Checksign',
      description: 'Comprobación Ley N° 19.799',
    },
    {
      id: 'DASHBOARD',
      tag: '03',
      label: 'Dashboard Telemetría',
      badge: `${conectados + firmando}/${total}`,
      description: 'Estado de hardware en vivo',
      soloGestor: true,
    },
    {
      id: 'FIRMAS',
      tag: '04',
      label: 'Firma por Lotes',
      description: 'Motor asíncrono BullMQ',
      soloGestor: true,
    },
    {
      id: 'ALERTAS',
      tag: '05',
      label: 'Alertas Certificados',
      badge: '3',
      badgeVariant: 'warning',
      description: 'Vigencia a 60, 30 y 15 días',
      soloGestor: true,
    },
    {
      id: 'AUDITORIA',
      tag: '06',
      label: 'Auditoría Forense ANCI',
      description: 'Trazabilidad Ley N° 21.663',
      soloGestor: true,
    },
  ];

  const filteredItems = navItems.filter((item) => {
    if (esCiudadano && item.soloGestor) return false;
    return true;
  });

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Overlay para pantallas móviles */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Espacio para Foto/Logo de la Municipalidad en Barra Lateral */}
        <div className="flex h-16 items-center px-4 border-b border-sidebar-border bg-sidebar gap-3">
          <LogoMunicipalidad variant="sidebar" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 truncate">
              Muni Coquimbo
            </span>
            <span className="text-xs font-semibold text-sidebar-foreground truncate">
              {esCiudadano ? 'Portal Ciudadano' : 'Gestión de Firmas'}
            </span>
          </div>
        </div>

        {/* Solo mostrar semáforo de hardware en vista Gestor */}
        {!esCiudadano && (
          <div className="p-3 mx-3 my-3 rounded-lg bg-sidebar-accent/50 border border-sidebar-border/80">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-sidebar-foreground/90 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    wsConectado ? 'bg-emerald-400 live-indicator' : 'bg-rose-400'
                  }`}
                />
                {wsConectado ? 'Telemetría en Vivo' : 'Desconectado'}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">{total} Estaciones</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="p-1 rounded bg-sidebar-background/60 border border-sidebar-border">
                <div className="font-bold text-emerald-400">{firmando}</div>
                <div className="text-muted-foreground text-[8px] uppercase">Firmando</div>
              </div>
              <div className="p-1 rounded bg-sidebar-background/60 border border-sidebar-border">
                <div className="font-bold text-amber-400">{conectados}</div>
                <div className="text-muted-foreground text-[8px] uppercase">Conectados</div>
              </div>
              <div className="p-1 rounded bg-sidebar-background/60 border border-sidebar-border">
                <div className="font-bold text-rose-400">{desconectados}</div>
                <div className="text-muted-foreground text-[8px] uppercase">Offline</div>
              </div>
            </div>
          </div>
        )}

        {/* Menú de Navegación */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
            <span>{esCiudadano ? 'Menú Ciudadano' : 'Módulos Operacionales'}</span>
            <Badge variant="outline" className="text-[8px] font-mono">
              {esCiudadano ? 'VISTA VECINO' : 'VISTA GESTOR'}
            </Badge>
          </div>

          {filteredItems.map((item) => {
            const isSelected = tabActiva === item.id;

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
                <div className="flex items-center space-x-2.5 truncate">
                  <span
                    className={`font-mono text-[10px] px-1 py-0.5 rounded border ${
                      isSelected
                        ? 'border-amber-400/40 text-amber-400 bg-amber-400/10'
                        : 'border-sidebar-border text-muted-foreground'
                    }`}
                  >
                    {item.tag}
                  </span>
                  <div className="flex flex-col text-left truncate">
                    <span className="truncate">{item.label}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {item.badge && (
                    <Badge
                      variant={item.badgeVariant || (isSelected ? 'default' : 'secondary')}
                      className="text-[10px] px-1.5 py-0 h-4 font-mono"
                    >
                      {item.badge}
                    </Badge>
                  )}
                  {isSelected && (
                    <span className="text-amber-400 font-bold text-xs">●</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Perfil del Usuario / Vecino / Funcionario */}
        <div className="p-3 bg-sidebar-accent/30 m-3 rounded-lg border border-sidebar-border space-y-2">
          <div className="text-left">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-semibold text-sidebar-foreground truncate">
                {usuario.nombre}
              </span>
              <Badge variant="outline" className="text-[9px] font-mono px-1 py-0">
                {usuario.rol}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              RUT: {usuario.rut}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {usuario.cargo}
            </p>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-sidebar-border/60">
            {onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="text-[10px] text-amber-400 hover:underline font-mono"
              >
                Cambiar Rol / Login
              </button>
            )}
            {isAutenticado && (
              <button
                type="button"
                onClick={logout}
                className="text-[10px] text-rose-400 hover:underline font-mono"
              >
                Cerrar Sesión
              </button>
            )}
          </div>
        </div>

        <div className="p-2 pt-0 text-[9px] text-muted-foreground text-center font-mono">
          Ley N° 21.663 • ANCI Ready
        </div>
      </aside>
    </>
  );
};
