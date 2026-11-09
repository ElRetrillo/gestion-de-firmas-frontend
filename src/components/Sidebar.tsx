import React from 'react';
import {
  Monitor,
  Users,
  BellRing,
  History,
  Settings,
  BarChart3,
  Home,
  LucideIcon,
} from 'lucide-react';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { useAuthStore } from '../store/useAuthStore';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { LogoMunicipalidad } from './LogoMunicipalidad';
import { Button } from './ui/button';

export type NavTab =
  | 'LANDING'
  | 'DASHBOARD'
  | 'ALERTAS'
  | 'METRICAS'
  | 'USUARIOS_CUSTODIA'
  | 'AUDITORIA'
  | 'CONFIGURACION';

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
  badgeVariant?: 'default' | 'secondary' | 'warning' | 'outline' | 'success' | 'danger';
  description: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tabActiva,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { estaciones, wsConectado, metricas } = useTelemetriaStore();
  const { usuario, logout } = useAuthStore();

  const totalEstaciones = estaciones.length;
  const conectados = estaciones.filter((e) => e.estadoEnVivo === 'CONECTADO').length;
  const firmando = estaciones.filter((e) => e.estadoEnVivo === 'FIRMANDO').length;
  const desconectados = estaciones.filter((e) => e.estadoEnVivo === 'DESCONECTADO').length;

  const totalDispositivos = metricas?.resumenDispositivos?.totalExistentes ?? metricas?.telemetria?.tokensRegistrados ?? 0;
  const dispositivosActivos = metricas?.resumenDispositivos?.activos ?? metricas?.telemetria?.tokensOperativos ?? 0;
  const alertasCount = metricas?.alertasVencimiento?.totalEnUmbral60Dias ?? 0;
  const contratosCount = metricas?.contratosResumen?.totalContratos ?? 0;

  const rol = usuario?.rol || 'FUNCIONARIO';
  const esAdmin = rol === 'ADMIN';
  const esSupervisor = rol === 'SUPERVISOR';

  const itemsControlTokens: NavItemConfig[] = [
    {
      id: 'DASHBOARD',
      icon: Monitor,
      label: 'Control de Tokens y Firmas',
      badge: totalDispositivos > 0 ? `${dispositivosActivos}/${totalDispositivos}` : (totalEstaciones > 0 ? `${conectados + firmando}/${totalEstaciones}` : undefined),
      description: 'Firmas asignadas, dispositivos existentes/activos/expirados y acciones por funcionario',
    },
    {
      id: 'ALERTAS',
      icon: BellRing,
      label: 'Vigencia (15, 30 y 60 días)',
      badge: alertasCount > 0 ? String(alertasCount) : '15/30/60d',
      description: 'Tokens próximos a vencer y envío de avisos por correo electrónico',
    },
    {
      id: 'METRICAS',
      icon: BarChart3,
      label: 'Estadísticas y Summary PDF',
      badge: 'LaTeX',
      description: 'Métricas integrales (7d, 15d, 30d, Mes, Año) y exportación LaTeX / PDF',
    },
    {
      id: 'USUARIOS_CUSTODIA',
      icon: Users,
      label: 'Contratos y Asignación',
      badge: contratosCount > 0 ? `${contratosCount} Cont.` : undefined,
      description: 'Contratos de obtención de tokens (visor PDF), asignación a funcionarios y custodia',
    },
    {
      id: 'AUDITORIA',
      icon: History,
      label: 'Bitácora de Actividad',
      description: 'Historial de firmas y eventos de tokens desde sesión y dispositivo',
    },
    {
      id: 'CONFIGURACION',
      icon: Settings,
      label: 'Parámetros de Control',
      description: 'Configuración de umbrales de vigencia y agente de sesión USB',
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
        {/* Encabezado del Menú */}
        <div className="flex h-16 items-center px-4 border-b border-sidebar-border bg-sidebar-accent/20">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNavClick('LANDING')}>
            <LogoMunicipalidad variant="sidebar" className="h-9 w-9 shrink-0" />
            <div className="flex flex-col text-left">
              <span className="font-bold text-xs tracking-tight text-sidebar-foreground truncate max-w-[175px]">
                Municipalidad de Coquimbo
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Control y Seguimiento de Tokens
              </span>
            </div>
          </div>
        </div>

        {/* Información del Rol del Usuario */}
        <div className="p-3 mx-3 mt-3 rounded-lg bg-sidebar-accent/50 border border-sidebar-border/80 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>SESIÓN ACTIVA:</span>
            <Badge
              variant="outline"
              className={`text-[9px] font-mono font-bold ${
                esAdmin
                  ? 'border-amber-400 text-amber-400 bg-amber-400/10'
                  : esSupervisor
                  ? 'border-blue-400 text-blue-400 bg-blue-400/10'
                  : 'border-emerald-400 text-emerald-400 bg-emerald-400/10'
              }`}
            >
              {rol}
            </Badge>
          </div>
          <div className="text-xs font-semibold text-sidebar-foreground truncate">
            {usuario?.nombre || 'Usuario Municipal'}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            RUT: {usuario?.rut || 'Sin RUT'}
          </div>
        </div>

        {/* Semáforo de hardware USB desde sesión/dispositivo */}
        <div className="px-3 py-2 mx-3 mt-2 rounded-lg bg-sidebar-accent/30 border border-sidebar-border/60">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-sidebar-foreground/90 flex items-center gap-1.5 text-[11px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  wsConectado ? 'bg-emerald-400 live-indicator' : 'bg-rose-400'
                }`}
              />
              {wsConectado ? 'Telemetría de Tokens' : 'Sin conexión'}
            </span>
            <span className="text-[9px] text-muted-foreground">{totalEstaciones} Sesiones</span>
          </div>

          <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
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
              <div className="text-muted-foreground text-[8px] uppercase">Sin Token</div>
            </div>
          </div>
        </div>

        {/* Menú de Navegación Exclusivo de Control y Seguimiento de Tokens */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 mt-1">
          <div className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
              <span>Control y Seguimiento Tokens</span>
              <span className="text-[9px] font-mono text-amber-400/80">{itemsControlTokens.length}</span>
            </div>
            {itemsControlTokens.map((item) => {
              const isSelected = tabActiva === item.id;
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={item.description}
                  className={`group flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <span
                      className={`flex items-center justify-center w-6 h-6 rounded border shrink-0 ${
                        isSelected
                          ? 'border-amber-400/40 text-amber-400 bg-amber-400/10'
                          : 'border-sidebar-border text-muted-foreground group-hover:text-sidebar-foreground'
                      }`}
                    >
                      <IconComponent className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Enlace a Portada de Bienvenida */}
          <div className="pt-2 border-t border-sidebar-border/40">
            <button
              onClick={() => handleNavClick('LANDING')}
              className={`flex w-full items-center space-x-2.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-all ${
                tabActiva === 'LANDING' ? 'bg-sidebar-accent/50 text-sidebar-foreground' : ''
              }`}
            >
              <span className="flex items-center justify-center w-6 h-6 rounded border border-sidebar-border shrink-0">
                <Home className="h-3.5 w-3.5" />
              </span>
              <span>Portada Institucional</span>
            </button>
          </div>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Perfil del Operador y Botón de Cerrar Sesión */}
        <div className="p-3 bg-sidebar-accent/30 m-3 rounded-lg border border-sidebar-border space-y-2">
          <div className="text-left space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sidebar-foreground truncate" title={usuario?.nombre}>
                {usuario?.nombre || 'Usuario Municipal'}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate" title={usuario?.cargo}>
              {usuario?.cargo || 'Funcionario'}
            </p>
            <p className="text-[9px] text-muted-foreground/80 truncate font-mono" title={usuario?.unidad}>
              {usuario?.unidad || 'Municipalidad de Coquimbo'}
            </p>
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

        <div className="p-2 pt-0 text-[9px] text-muted-foreground text-center font-mono">
          Municipalidad de Coquimbo • Entorno Test 2026
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
