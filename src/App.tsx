import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { LandingPage } from './components/LandingPage';
import { DashboardSupervisores } from './components/DashboardSupervisores';
import { FirmaLotesView } from './components/FirmaLotesView';
import { ChecksignView } from './components/ChecksignView';
import { AlertasCertificadosView } from './components/AlertasCertificadosView';
import { AuditoriaView } from './components/AuditoriaView';
import { useTelemetriaStore } from './store/useTelemetriaStore';
import { useThemeStore } from './store/useThemeStore';

export const App: React.FC = () => {
  const [tabActiva, setTabActiva] = useState<NavTab>('LANDING');
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const { inicializarSocket, cargarEstaciones } = useTelemetriaStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    inicializarSocket();
    cargarEstaciones();
  }, [inicializarSocket, cargarEstaciones]);

  // Si la pestaña seleccionada es LANDING, renderizamos la portada pública institucional completa
  if (tabActiva === 'LANDING') {
    return (
      <LandingPage
        onGoToDashboard={() => setTabActiva('DASHBOARD')}
        onGoToChecksign={() => setTabActiva('CHECKSIGN')}
      />
    );
  }

  // Si está en el entorno operativo (DASHBOARD, FIRMAS, CHECKSIGN, ALERTAS, AUDITORIA),
  // se muestra la barra lateral sobria y el contenedor de trabajo con elementos de cards de Shadcn UI
  return (
    <div className="min-h-screen flex w-full bg-background text-foreground transition-colors duration-200">
      {/* Barra Lateral Sobria con Apartado de Dashboard */}
      <Sidebar
        tabActiva={tabActiva}
        onSelectTab={setTabActiva}
        isOpenMobile={sidebarMobileOpen}
        onCloseMobile={() => setSidebarMobileOpen(false)}
      />

      {/* Contenedor Principal (Header con Espacio de Logo Municipal + Vistas en Cards) */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Encabezado con Espacio para Foto/Logo de la Municipalidad */}
        <TopHeader
          tabActiva={tabActiva}
          onOpenMobileSidebar={() => setSidebarMobileOpen(true)}
          onGoToLanding={() => setTabActiva('LANDING')}
        />

        {/* Área de Visualización */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
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
              <span>Ley N° 19.799</span>
              <span>•</span>
              <span>ISO/IEC 27001</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
