import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { LandingPage } from './components/LandingPage';
import { PortalCiudadano } from './components/PortalCiudadano';
import { DashboardSupervisores } from './components/DashboardSupervisores';
import { FirmaLotesView } from './components/FirmaLotesView';
import { ChecksignView } from './components/ChecksignView';
import { AlertasCertificadosView } from './components/AlertasCertificadosView';
import { AuditoriaView } from './components/AuditoriaView';
import { LoginModal } from './components/LoginModal';
import { useTelemetriaStore } from './store/useTelemetriaStore';
import { useAuthStore, UserRole } from './store/useAuthStore';

export const App: React.FC = () => {
  const [tabActiva, setTabActiva] = useState<NavTab>('LANDING');
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginInitialRole, setLoginInitialRole] = useState<'CIUDADANO' | 'GESTOR'>('GESTOR');

  const { inicializarSocket, cargarEstaciones } = useTelemetriaStore();
  const { usuario } = useAuthStore();

  useEffect(() => {
    inicializarSocket();
    cargarEstaciones();
  }, [inicializarSocket, cargarEstaciones]);

  const handleOpenLogin = (roleHint: 'CIUDADANO' | 'GESTOR' = 'GESTOR') => {
    setLoginInitialRole(roleHint);
    setLoginModalOpen(true);
  };

  const handleLoginSuccess = (rol: UserRole) => {
    if (rol === 'CIUDADANO') {
      setTabActiva('PORTAL_CIUDADANO');
    } else {
      setTabActiva('DASHBOARD');
    }
  };

  // Si la pestaña seleccionada es LANDING, renderizamos la portada pública institucional completa
  if (tabActiva === 'LANDING') {
    return (
      <>
        <LandingPage
          onGoToDashboard={() => setTabActiva('DASHBOARD')}
          onGoToChecksign={() => setTabActiva('CHECKSIGN')}
          onOpenLogin={handleOpenLogin}
          onGoToPortalCiudadano={() => setTabActiva('PORTAL_CIUDADANO')}
        />
        <LoginModal
          isOpen={loginModalOpen}
          initialRole={loginInitialRole}
          onClose={() => setLoginModalOpen(false)}
          onSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  // Vista operativa / portal ciudadano con barra lateral y topheader
  return (
    <div className="min-h-screen flex w-full bg-background text-foreground transition-colors duration-200">
      {/* Barra Lateral Sobria diferenciada por rol */}
      <Sidebar
        tabActiva={tabActiva}
        onSelectTab={setTabActiva}
        isOpenMobile={sidebarMobileOpen}
        onCloseMobile={() => setSidebarMobileOpen(false)}
        onOpenLogin={() => handleOpenLogin('GESTOR')}
      />

      {/* Contenedor Principal */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Encabezado con Espacio para Foto/Logo de la Municipalidad y Botón de Login */}
        <TopHeader
          tabActiva={tabActiva}
          onOpenMobileSidebar={() => setSidebarMobileOpen(true)}
          onGoToLanding={() => setTabActiva('LANDING')}
          onOpenLogin={() => handleOpenLogin(usuario.rol === 'CIUDADANO' ? 'CIUDADANO' : 'GESTOR')}
        />

        {/* Área de Visualización */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            {tabActiva === 'PORTAL_CIUDADANO' && (
              <PortalCiudadano
                onGoToChecksign={() => setTabActiva('CHECKSIGN')}
                onOpenLogin={() => handleOpenLogin('GESTOR')}
              />
            )}
            {tabActiva === 'DASHBOARD' && <DashboardSupervisores />}
            {tabActiva === 'FIRMAS' && <FirmaLotesView />}
            {tabActiva === 'CHECKSIGN' && <ChecksignView />}
            {tabActiva === 'ALERTAS' && <AlertasCertificadosView />}
            {tabActiva === 'AUDITORIA' && <AuditoriaView />}
          </div>
        </main>

        {/* Footer Institucional Sobrio */}
        <footer className="border-t bg-card py-3 px-6 text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              © 2026 Ilustre Municipalidad de Coquimbo • Departamento de Gestión de Sistemas y TICs
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-mono">
              <span>Ley N° 21.663 (ANCI)</span>
              <span>•</span>
              <span>Ley N° 19.799 (FEA)</span>
              <span>•</span>
              <span>ISO/IEC 27001</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Modal Global de Login y Cambio de Rol */}
      <LoginModal
        isOpen={loginModalOpen}
        initialRole={loginInitialRole}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default App;
