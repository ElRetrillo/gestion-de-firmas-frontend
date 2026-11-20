import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { LoginModal } from './components/LoginModal';
import { LandingPage } from './components/LandingPage';
import { DashboardSupervisores } from './components/DashboardSupervisores';
import { AlertasCertificadosView } from './components/AlertasCertificadosView';
import { MetricasTrazabilidadPanel } from './components/MetricasTrazabilidadPanel';
import { ReporteHistoricoEsign } from './components/ReporteHistoricoEsign';
import { GestionAdminsView } from './components/GestionAdminsView';
import { AuditoriaView } from './components/AuditoriaView';
import { useTelemetriaStore } from './store/useTelemetriaStore';
import { useAuthStore } from './store/useAuthStore';

export const App: React.FC = () => {
  const [tabActiva, setTabActiva] = useState<NavTab>('DASHBOARD');
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [mostrarLoginModal, setMostrarLoginModal] = useState(false);

  const { inicializarSocket, cargarEstaciones, cargarEventosRecientes, cargarMetricas } = useTelemetriaStore();
  const { usuario, isAutenticado, verificarSesion, cargandoSesion, debeCambiarPassword } = useAuthStore();

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
      <>
        <LandingPage
          onOpenLogin={() => setMostrarLoginModal(true)}
          onGoToApp={() => setMostrarLoginModal(true)}
        />
        <LoginModal
          isOpen={mostrarLoginModal}
          onClose={() => setMostrarLoginModal(false)}
          onLoginSuccess={() => {
            setMostrarLoginModal(false);
            setTabActiva('DASHBOARD');
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex w-full max-w-[100vw] overflow-x-clip bg-background text-foreground">
      <Sidebar
        tabActiva={tabActiva}
        onSelectTab={setTabActiva}
        isOpenMobile={sidebarMobileOpen}
        onCloseMobile={() => setSidebarMobileOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <TopHeader
          tabActiva={tabActiva}
          onOpenMobileSidebar={() => setSidebarMobileOpen(true)}
        />

        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-6 bg-background">
          <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-5 min-w-0">
            {tabActiva === 'DASHBOARD' && <DashboardSupervisores />}
            {tabActiva === 'ALERTAS' && <AlertasCertificadosView />}
            {tabActiva === 'METRICAS' && (
              <>
                <MetricasTrazabilidadPanel vistaCompleta />
                <ReporteHistoricoEsign />
              </>
            )}
            {tabActiva === 'AUDITORIA' && <AuditoriaView />}
            {tabActiva === 'ADMINS' && usuario?.rol === 'ADMIN' && <GestionAdminsView />}
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
