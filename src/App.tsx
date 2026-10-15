import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { LandingPage } from './components/LandingPage';
import { MisDocumentosFuncionarioView } from './components/MisDocumentosFuncionarioView';
import { FePublicaDecretosView } from './components/FePublicaDecretosView';
import { DashboardSupervisores } from './components/DashboardSupervisores';
import { FirmaLotesView } from './components/FirmaLotesView';
import { ChecksignView } from './components/ChecksignView';
import { AlertasCertificadosView } from './components/AlertasCertificadosView';
import { AuditoriaView } from './components/AuditoriaView';
import { ConfiguracionSistemaView } from './components/ConfiguracionSistemaView';
import { LoginModal } from './components/LoginModal';
import { useTelemetriaStore } from './store/useTelemetriaStore';
import { useAuthStore, UserRole } from './store/useAuthStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';

// Matriz de permisos por rol autenticado devuelto por el backend
const ROLE_ALLOWED_TABS: Record<UserRole, NavTab[]> = {
  ADMIN: [
    'DASHBOARD',
    'FIRMAS',
    'CHECKSIGN',
    'ALERTAS',
    'AUDITORIA',
    'CONFIGURACION',
    'MIS_DOCUMENTOS',
    'FE_PUBLICA',
    'LANDING',
  ],
  SUPERVISOR: [
    'DASHBOARD',
    'FIRMAS',
    'CHECKSIGN',
    'ALERTAS',
    'MIS_DOCUMENTOS',
    'LANDING',
  ],
  MINISTRO_DE_FE: [
    'MIS_DOCUMENTOS',
    'FE_PUBLICA',
    'CHECKSIGN',
    'ALERTAS',
    'LANDING',
  ],
  FUNCIONARIO: [
    'MIS_DOCUMENTOS',
    'CHECKSIGN',
    'LANDING',
  ],
  CIUDADANO: [
    'CHECKSIGN',
    'LANDING',
  ],
};

export const App: React.FC = () => {
  const [tabActiva, setTabActiva] = useState<NavTab>('LANDING');
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const { inicializarSocket, cargarEstaciones } = useTelemetriaStore();
  const { usuario, isAutenticado, vistaGeneralActiva } = useAuthStore();

  useEffect(() => {
    inicializarSocket();
    cargarEstaciones();
  }, [inicializarSocket, cargarEstaciones]);

  // Al autenticarse, el backend determina el rol y el frontend asigna la vista inicial idónea
  const handleLoginSuccess = (rol: UserRole) => {
    if (rol === 'ADMIN' || rol === 'SUPERVISOR') {
      setTabActiva('DASHBOARD');
    } else if (rol === 'MINISTRO_DE_FE') {
      setTabActiva('MIS_DOCUMENTOS');
    } else {
      setTabActiva('MIS_DOCUMENTOS');
    }
  };

  // Validar si el rol actual tiene acceso al módulo seleccionado
  const allowedTabs = ROLE_ALLOWED_TABS[usuario.rol] || ['MIS_DOCUMENTOS', 'LANDING'];
  const hasAccess = allowedTabs.includes(tabActiva);

  // Si la pestaña seleccionada es LANDING, renderizamos la portada de bienvenida institucional
  if (tabActiva === 'LANDING') {
    return (
      <>
        <LandingPage
          onGoToApp={() => {
            if (isAutenticado) {
              handleLoginSuccess(usuario.rol);
            } else {
              setLoginModalOpen(true);
            }
          }}
          onOpenLogin={() => setLoginModalOpen(true)}
        />
        <LoginModal
          isOpen={loginModalOpen}
          onClose={() => setLoginModalOpen(false)}
          onSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  // Vista interna corporativa con menú lateral y encabezado
  return (
    <div className="min-h-screen flex w-full bg-background text-foreground transition-colors duration-200">
      {/* Barra Lateral con 2 Vistas Generales y Secciones por Rol */}
      <Sidebar
        tabActiva={tabActiva}
        onSelectTab={setTabActiva}
        isOpenMobile={sidebarMobileOpen}
        onCloseMobile={() => setSidebarMobileOpen(false)}
        onOpenLogin={() => setLoginModalOpen(true)}
      />

      {/* Contenedor Principal */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Encabezado con Identidad Municipal, Conmutador y Estado de Sesión */}
        <TopHeader
          tabActiva={tabActiva}
          onOpenMobileSidebar={() => setSidebarMobileOpen(true)}
          onGoToLanding={() => setTabActiva('LANDING')}
          onOpenLogin={() => setLoginModalOpen(true)}
          onSelectTab={setTabActiva}
        />

        {/* Área de Visualización según Rol y Vista General */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            {!hasAccess ? (
              <Card className="border-destructive/30 bg-destructive/5 text-left p-6">
                <CardHeader className="p-0 pb-3">
                  <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                    <span>Módulo Restringido por Rol Institucional</span>
                  </div>
                  <CardTitle className="text-base font-bold text-foreground mt-1">
                    Acceso No Autorizado ({usuario.rol})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    El backend no ha concedido permisos a tu perfil ({usuario.rol} - {usuario.cargo}) para interactuar con esta sección.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 pt-2 space-y-3 text-xs">
                  <p className="text-muted-foreground">
                    Conforme al principio de mínimo privilegio estipulado en la Ley N° 21.663 (ANCI / CSIRT) y las directivas internas de la I. Municipalidad de Coquimbo, solo los roles autorizados pueden acceder a este entorno.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleLoginSuccess(usuario.rol)}
                      className="text-xs font-semibold"
                    >
                      Ir a mi módulo principal ({vistaGeneralActiva === 'ADMIN' ? 'Dashboard' : 'Mis Documentos'})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLoginModalOpen(true)}
                      className="text-xs font-semibold"
                    >
                      Cambiar de Cuenta / Rol
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Vistas de Funcionario */}
                {tabActiva === 'MIS_DOCUMENTOS' && <MisDocumentosFuncionarioView />}
                {tabActiva === 'FE_PUBLICA' && <FePublicaDecretosView />}

                {/* Vistas de Administrador */}
                {tabActiva === 'DASHBOARD' && <DashboardSupervisores />}
                {tabActiva === 'FIRMAS' && <FirmaLotesView />}
                {tabActiva === 'ALERTAS' && <AlertasCertificadosView />}
                {tabActiva === 'AUDITORIA' && <AuditoriaView />}
                {tabActiva === 'CONFIGURACION' && <ConfiguracionSistemaView />}

                {/* Compartida */}
                {tabActiva === 'CHECKSIGN' && <ChecksignView />}
              </>
            )}
          </div>
        </main>

        {/* Footer Institucional */}
        <footer className="border-t bg-card py-3 px-6 text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              © 2026 Ilustre Municipalidad de Coquimbo • Departamento de Gestión de Sistemas y TICs
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-mono">
              <span>Ley N° 21.663 (ANCI / CSIRT)</span>
              <span>•</span>
              <span>Ley N° 19.799 (FEA)</span>
              <span>•</span>
              <span>ISO/IEC 27001</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Modal de Login Único Institucional */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default App;
