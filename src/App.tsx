import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { LandingPage } from './components/LandingPage';
import { LoginModal } from './components/LoginModal';
import { DashboardSupervisores } from './components/DashboardSupervisores';
import { AlertasCertificadosView } from './components/AlertasCertificadosView';
import { MetricasTrazabilidadPanel } from './components/MetricasTrazabilidadPanel';
import { AuditoriaView } from './components/AuditoriaView';
import { ConfiguracionSistemaView } from './components/ConfiguracionSistemaView';
import { GestionUsuariosEquipamientoView } from './components/GestionUsuariosEquipamientoView';
import { useTelemetriaStore } from './store/useTelemetriaStore';
import { useAuthStore } from './store/useAuthStore';

export const App: React.FC = () => {
  const [tabActiva, setTabActiva] = useState<NavTab>('LANDING');
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const { inicializarSocket, cargarEstaciones, cargarMetricas } = useTelemetriaStore();
  const { isAutenticado, usuario, verificarSesion, cargandoSesion, debeCambiarPassword } = useAuthStore();

  // Verificar si hay sesión activa almacenada al cargar
  useEffect(() => {
    verificarSesion();
  }, [verificarSesion]);

  // Si está autenticado, conectar telemetría en tiempo real y cargar métricas de tokens
  useEffect(() => {
    if (isAutenticado) {
      inicializarSocket();
      cargarEstaciones();
      cargarMetricas();
    }
  }, [isAutenticado, inicializarSocket, cargarEstaciones, cargarMetricas]);

  // Pantalla de carga inicial si hay token previo
  if (cargandoSesion && localStorage.getItem('access_token')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-muted-foreground">Verificando sesión y telemetría de tokens...</span>
        </div>
      </div>
    );
  }

  // 1. Si la pestaña seleccionada es LANDING o no está autenticado
  if (tabActiva === 'LANDING' || !isAutenticado) {
    return (
      <>
        <LandingPage
          onGoToApp={() => {
            if (isAutenticado && usuario) {
              setTabActiva('DASHBOARD');
            } else {
              setLoginModalOpen(true);
            }
          }}
          onOpenLogin={() => setLoginModalOpen(true)}
        />

        <LoginModal
          isOpen={loginModalOpen || debeCambiarPassword}
          onClose={() => setLoginModalOpen(false)}
          onLoginSuccess={() => {
            setTabActiva('DASHBOARD');
          }}
        />
      </>
    );
  }

  // 2. Vista interna enfocada exclusivamente en Control y Seguimiento de Tokens
  return (
    <div className="min-h-screen flex w-full bg-background text-foreground transition-colors duration-200">
      {/* Barra Lateral de Control y Seguimiento de Tokens */}
      <Sidebar
        tabActiva={tabActiva}
        onSelectTab={setTabActiva}
        isOpenMobile={sidebarMobileOpen}
        onCloseMobile={() => setSidebarMobileOpen(false)}
      />

      {/* Contenedor Principal */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Encabezado Institucional */}
        <TopHeader
          tabActiva={tabActiva}
          onOpenMobileSidebar={() => setSidebarMobileOpen(true)}
          onGoToLanding={() => setTabActiva('LANDING')}
          onSelectTab={setTabActiva}
        />

        {/* Área de Contenido Principal */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            {tabActiva === 'DASHBOARD' && <DashboardSupervisores onNavigateTab={setTabActiva} />}
            {tabActiva === 'ALERTAS' && <AlertasCertificadosView />}
            {tabActiva === 'METRICAS' && <MetricasTrazabilidadPanel vistaOrigen="DISPOSITIVOS" vistaCompleta />}
            {tabActiva === 'USUARIOS_CUSTODIA' && <GestionUsuariosEquipamientoView />}
            {tabActiva === 'AUDITORIA' && <AuditoriaView />}
            {tabActiva === 'CONFIGURACION' && <ConfiguracionSistemaView />}
          </div>
        </main>

        {/* Footer Institucional */}
        <footer className="border-t bg-card py-3 px-6 text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              © 2026 Ilustre Municipalidad de Coquimbo — Control y Seguimiento de Tokens de Firma Electrónica
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <span>Telemetría de Sesión y Dispositivo</span>
              <span>•</span>
              <span>Vigencia 15/30/60 Días</span>
              <span>•</span>
              <span>Summary LaTeX / PDF</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Modal de cambio forzado de contraseña si aplica */}
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
