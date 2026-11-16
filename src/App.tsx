import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { LoginModal } from './components/LoginModal';
import { DashboardSupervisores } from './components/DashboardSupervisores';
import { AlertasCertificadosView } from './components/AlertasCertificadosView';
import { MetricasTrazabilidadPanel } from './components/MetricasTrazabilidadPanel';
import { AuditoriaView } from './components/AuditoriaView';
import { GestionUsuariosEquipamientoView } from './components/GestionUsuariosEquipamientoView';
import { VistaFirmaUsuario } from './components/VistaFirmaUsuario';
import { LogoMunicipalidad } from './components/LogoMunicipalidad';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { formatRutVisual } from './lib/rut';
import { useTelemetriaStore } from './store/useTelemetriaStore';
import { useAuthStore } from './store/useAuthStore';

export const App: React.FC = () => {
  const [tabActiva, setTabActiva] = useState<NavTab>('DASHBOARD');
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const { inicializarSocket, cargarEstaciones, cargarEventosRecientes, cargarMetricas } = useTelemetriaStore();
  const { usuario, isAutenticado, verificarSesion, cargandoSesion, debeCambiarPassword, logout } = useAuthStore();
  const esSupervisorOAdmin = usuario?.rol === 'ADMIN' || usuario?.rol === 'SUPERVISOR';

  useEffect(() => {
    verificarSesion();
  }, [verificarSesion]);

  useEffect(() => {
    if (isAutenticado) {
      inicializarSocket();
      cargarEstaciones();
      cargarEventosRecientes();
      cargarMetricas();

      const intervalId = window.setInterval(() => {
        cargarEstaciones();
        cargarEventosRecientes();
        cargarMetricas();
      }, 10000);

      return () => window.clearInterval(intervalId);
    }
  }, [isAutenticado, inicializarSocket, cargarEstaciones, cargarEventosRecientes, cargarMetricas]);

  if (cargandoSesion && localStorage.getItem('access_token')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-7 h-7 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-muted-foreground">Cargando sesión...</span>
        </div>
      </div>
    );
  }

  if (!isAutenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <LoginModal
          isOpen={true}
          onClose={() => {}}
          onLoginSuccess={() => {
            setTabActiva('DASHBOARD');
          }}
        />
      </div>
    );
  }

  if (!esSupervisorOAdmin) {
    return (
      <div className="min-h-screen flex flex-col w-full bg-background text-foreground">
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            <LogoMunicipalidad variant="sidebar" className="h-8 w-8 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                Portal de Firma Electrónica
              </span>
              <span className="text-[10px] font-mono text-muted-foreground truncate">
                {usuario?.nombre} • {formatRutVisual(usuario?.rut)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-mono">
              {usuario?.rbac?.etiquetaRol || usuario?.cargo || 'Funcionario'}
            </Badge>
            <Button
              onClick={logout}
              variant="outline"
              size="sm"
              className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/30 font-semibold"
            >
              Cerrar Sesión
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 bg-background">
          <VistaFirmaUsuario />
        </main>

        {debeCambiarPassword && (
          <LoginModal
            isOpen={true}
            onClose={() => {}}
            onLoginSuccess={() => {
              setTabActiva('FIRMAR');
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <Sidebar
        tabActiva={tabActiva}
        onSelectTab={setTabActiva}
        isOpenMobile={sidebarMobileOpen}
        onCloseMobile={() => setSidebarMobileOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <TopHeader
          tabActiva={tabActiva}
          onOpenMobileSidebar={() => setSidebarMobileOpen(true)}
          onSelectTab={setTabActiva}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-5">
            {tabActiva === 'DASHBOARD' && <DashboardSupervisores />}
            {tabActiva === 'FIRMAR' && <VistaFirmaUsuario />}
            {tabActiva === 'ALERTAS' && <AlertasCertificadosView />}
            {tabActiva === 'METRICAS' && <MetricasTrazabilidadPanel vistaCompleta />}
            {tabActiva === 'USUARIOS_CUSTODIA' && <GestionUsuariosEquipamientoView />}
            {tabActiva === 'AUDITORIA' && <AuditoriaView />}
          </div>
        </main>
      </div>

      {debeCambiarPassword && (
        <LoginModal
          isOpen={true}
          onClose={() => {}}
          onLoginSuccess={() => {
            setTabActiva('DASHBOARD');
          }}
        />
      )}
    </div>
  );
};

export default App;
