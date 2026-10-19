import React from 'react';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { useAuthStore, UserRole, VistaGeneral } from '../store/useAuthStore';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { LogoMunicipalidad } from './LogoMunicipalidad';

export type NavTab =
  | 'LANDING'
  | 'MIS_DOCUMENTOS'
  | 'FE_PUBLICA'
  | 'DASHBOARD'
  | 'FIRMAS'
  | 'USUARIOS_CUSTODIA'
  | 'CHECKSIGN'
  | 'ALERTAS'
  | 'AUDITORIA'
  | 'CONFIGURACION';

interface SidebarProps {
  tabActiva: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onOpenLogin?: () => void;
}

interface NavItemConfig {
  id: NavTab;
  tag: string;
  label: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'warning' | 'outline' | 'success' | 'danger';
  description: string;
  exclusivoRol?: string;
  rolesPermitidos: UserRole[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  tabActiva,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onOpenLogin,
}) => {
  const { estaciones, wsConectado } = useTelemetriaStore();
  const { usuario, isAutenticado, logout, vistaGeneralActiva, setVistaGeneralActiva } = useAuthStore();

  const total = estaciones.length;
  const conectados = estaciones.filter((e) => e.estadoEnVivo === 'CONECTADO').length;
  const firmando = estaciones.filter((e) => e.estadoEnVivo === 'FIRMANDO').length;
  const desconectados = estaciones.filter((e) => e.estadoEnVivo === 'DESCONECTADO').length;

  const puedeAlternarVistas = usuario.rol === 'ADMIN' || usuario.rol === 'SUPERVISOR';

  // 1. Módulos de la Vista Administrador
  const navItemsAdmin: NavItemConfig[] = [
    {
      id: 'DASHBOARD',
      tag: '01',
      label: 'Telemetría de Tokens',
      badge: `${conectados + firmando}/${total}`,
      description: 'Monitoreo en vivo de hardware criptográfico',
      rolesPermitidos: ['ADMIN', 'SUPERVISOR'],
    },
    {
      id: 'FIRMAS',
      tag: '02',
      label: 'Orquestador de Lotes',
      description: 'Supervisión de colas asíncronas de firma',
      rolesPermitidos: ['ADMIN', 'SUPERVISOR'],
    },
    {
      id: 'USUARIOS_CUSTODIA',
      tag: '03',
      label: 'RRHH & Actas Custodia',
      badge: '<48h',
      badgeVariant: 'default',
      description: 'Revocación RRHH, desbloqueo PUK y actas PDF',
      rolesPermitidos: ['ADMIN', 'SUPERVISOR'],
    },
    {
      id: 'ALERTAS',
      tag: '04',
      label: 'Alertas Certificados',
      description: 'Vigencia preventiva municipal (60/30/15 días)',
      rolesPermitidos: ['ADMIN', 'SUPERVISOR'],
    },
    {
      id: 'CHECKSIGN',
      tag: '05',
      label: 'Verificador Checksign',
      description: 'Comprobación técnica y legal Ley 19.799',
      rolesPermitidos: ['ADMIN', 'SUPERVISOR'],
    },
    {
      id: 'AUDITORIA',
      tag: '06',
      label: 'Auditoría Forense ANCI',
      description: 'Trazabilidad inalterable Ley N° 21.663',
      exclusivoRol: 'ADMIN',
      rolesPermitidos: ['ADMIN'],
    },
    {
      id: 'CONFIGURACION',
      tag: '07',
      label: 'Configuración y Red',
      description: 'Directivas técnicas y topología',
      exclusivoRol: 'ADMIN',
      rolesPermitidos: ['ADMIN'],
    },
  ];

  // 2. Módulos de la Vista Funcionario
  const navItemsFuncionario: NavItemConfig[] = [
    {
      id: 'MIS_DOCUMENTOS',
      tag: '01',
      label: 'Mis Documentos y Firma',
      description: 'Bandeja personal de decretos asignados',
      rolesPermitidos: ['FUNCIONARIO', 'MINISTRO_DE_FE', 'SUPERVISOR', 'ADMIN'],
    },
    {
      id: 'CHECKSIGN',
      tag: '02',
      label: 'Verificar Documento',
      description: 'Checkeo de firmas y validez',
      rolesPermitidos: ['FUNCIONARIO', 'MINISTRO_DE_FE', 'SUPERVISOR', 'ADMIN'],
    },
    {
      id: 'FE_PUBLICA',
      tag: '03',
      label: 'Decretos y Fe Pública',
      description: 'Visación y atestación de fe pública ministerial',
      exclusivoRol: 'MINISTRO_FE',
      rolesPermitidos: ['MINISTRO_DE_FE', 'ADMIN'],
    },
    {
      id: 'ALERTAS',
      tag: '04',
      label: 'Mi Certificado Digital',
      description: 'Vigencia de firma personal',
      exclusivoRol: 'MINISTRO_FE',
      rolesPermitidos: ['MINISTRO_DE_FE'],
    },
  ];

  const currentNavItems = vistaGeneralActiva === 'ADMIN' ? navItemsAdmin : navItemsFuncionario;
  const filteredItems = currentNavItems.filter((item) =>
    item.rolesPermitidos.includes(usuario.rol)
  );

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const handleToggleVista = (nuevaVista: VistaGeneral) => {
    setVistaGeneralActiva(nuevaVista);
    if (nuevaVista === 'ADMIN') {
      onSelectTab('DASHBOARD');
    } else {
      onSelectTab('MIS_DOCUMENTOS');
    }
  };

  return (
    <>
      {/* Overlay para móviles */}
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
        {/* Identidad Institucional Municipal */}
        <div className="flex h-16 items-center px-4 border-b border-sidebar-border bg-sidebar gap-3">
          <LogoMunicipalidad variant="sidebar" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 truncate">
              Muni Coquimbo
            </span>
            <span className="text-xs font-semibold text-sidebar-foreground truncate">
              Gestión de Firmas Electrónicas
            </span>
          </div>
        </div>

        {/* Selector de las 2 Vistas Generales */}
        <div className="p-3 mx-3 mt-3 rounded-lg bg-sidebar-accent/50 border border-sidebar-border/80 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>VISTA GENERAL:</span>
            <Badge variant="outline" className="text-[8px] font-mono border-amber-400/40 text-amber-300">
              ROL: {usuario.rol}
            </Badge>
          </div>

          {puedeAlternarVistas ? (
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-sidebar-background rounded-md border border-sidebar-border text-[11px]">
              <button
                type="button"
                onClick={() => handleToggleVista('ADMIN')}
                className={`py-1.5 px-2 rounded font-semibold transition-all text-center truncate ${
                  vistaGeneralActiva === 'ADMIN'
                    ? 'bg-amber-500/20 text-amber-300 font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-sidebar-foreground'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleToggleVista('FUNCIONARIO')}
                className={`py-1.5 px-2 rounded font-semibold transition-all text-center truncate ${
                  vistaGeneralActiva === 'FUNCIONARIO'
                    ? 'bg-amber-500/20 text-amber-300 font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-sidebar-foreground'
                }`}
              >
                Funcionario
              </button>
            </div>
          ) : (
            <div className="py-1 px-2 rounded bg-sidebar-background text-xs font-semibold text-sidebar-foreground border border-sidebar-border flex items-center justify-between">
              <span>{vistaGeneralActiva === 'ADMIN' ? 'Vista Administrador' : 'Vista Funcionario'}</span>
              <span className="text-[9px] font-mono text-muted-foreground">ASIGNADA</span>
            </div>
          )}
        </div>

        {/* Semáforo de hardware USB en Vista Administrador */}
        {vistaGeneralActiva === 'ADMIN' && (
          <div className="px-3 py-2 mx-3 mt-2 rounded-lg bg-sidebar-accent/30 border border-sidebar-border/60">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-sidebar-foreground/90 flex items-center gap-1.5 text-[11px]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    wsConectado ? 'bg-emerald-400 live-indicator' : 'bg-rose-400'
                  }`}
                />
                {wsConectado ? 'Telemetría Tokens' : 'Offline'}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">{total} Estaciones</span>
            </div>

            <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
              <div className="p-1 rounded bg-sidebar-background/60 border border-sidebar-border">
                <div className="font-bold text-emerald-400">{firmando}</div>
                <div className="text-muted-foreground text-[8px] uppercase">Firmando</div>
              </div>
              <div className="p-1 rounded bg-sidebar-background/60 border border-sidebar-border">
                <div className="font-bold text-amber-400">{conectados}</div>
                <div className="text-muted-foreground text-[8px] uppercase">Online</div>
              </div>
              <div className="p-1 rounded bg-sidebar-background/60 border border-sidebar-border">
                <div className="font-bold text-rose-400">{desconectados}</div>
                <div className="text-muted-foreground text-[8px] uppercase">Offline</div>
              </div>
            </div>
          </div>
        )}

        {/* Menú de Navegación según Vista General y Secciones Exclusivas de Rol */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 mt-1">
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
            <span>
              {vistaGeneralActiva === 'ADMIN' ? 'Módulos de Gestión' : 'Módulos de Trabajo'}
            </span>
            <span className="text-[9px] font-mono text-amber-400/80">
              {filteredItems.length} Secciones
            </span>
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
                    {item.exclusivoRol && (
                      <span className="text-[8px] font-mono text-amber-400/80 uppercase">
                        ★ Exclusivo {item.exclusivoRol}
                      </span>
                    )}
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

          {/* Enlace a Portada de Bienvenida */}
          <div className="pt-2 border-t border-sidebar-border/40 mt-2">
            <button
              onClick={() => handleNavClick('LANDING')}
              className={`flex w-full items-center space-x-2.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-all ${
                tabActiva === 'LANDING' ? 'bg-sidebar-accent/50 text-sidebar-foreground' : ''
              }`}
            >
              <span className="font-mono text-[10px] px-1 py-0.5 rounded border border-sidebar-border">
                00
              </span>
              <span>Portada de Bienvenida</span>
            </button>
          </div>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Perfil del Funcionario Municipal Autenticado */}
        <div className="p-3 bg-sidebar-accent/30 m-3 rounded-lg border border-sidebar-border space-y-2">
          <div className="text-left">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-semibold text-sidebar-foreground truncate" title={usuario.nombre}>
                {usuario.nombre}
              </span>
              <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 border-amber-400/30 text-amber-300">
                {usuario.rol}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              RUT: {usuario.rut}
            </p>
            <p className="text-[10px] text-muted-foreground truncate" title={usuario.cargo}>
              {usuario.cargo}
            </p>
            <p className="text-[9px] text-muted-foreground/80 truncate font-mono" title={usuario.unidad}>
              {usuario.unidad}
            </p>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-sidebar-border/60">
            {onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="text-[10px] text-amber-400 hover:underline font-mono"
              >
                Cambiar Rol / Cuenta
              </button>
            )}
            {isAutenticado && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  onSelectTab('LANDING');
                }}
                className="text-[10px] text-rose-400 hover:underline font-mono"
              >
                Cerrar Sesión
              </button>
            )}
          </div>
        </div>

        <div className="p-2 pt-0 text-[9px] text-muted-foreground text-center font-mono">
          Ley N° 21.663 (ANCI / CSIRT)
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
