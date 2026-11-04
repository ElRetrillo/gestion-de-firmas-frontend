import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { LandingPage } from './components/LandingPage';
import { LoginModal } from './components/LoginModal';
import { MisDocumentosFuncionarioView } from './components/MisDocumentosFuncionarioView';
import { EntornoPruebasFirmaGobV2 } from './components/EntornoPruebasFirmaGobV2';
import { FePublicaDecretosView } from './components/FePublicaDecretosView';
import { DashboardSupervisores } from './components/DashboardSupervisores';
import { FirmaLotesView } from './components/FirmaLotesView';
import { ChecksignView } from './components/ChecksignView';
import { AlertasCertificadosView } from './components/AlertasCertificadosView';
import { AuditoriaView } from './components/AuditoriaView';
import { ConfiguracionSistemaView } from './components/ConfiguracionSistemaView';
import { GestionUsuariosEquipamientoView } from './components/GestionUsuariosEquipamientoView';
import { useTelemetriaStore } from './store/useTelemetriaStore';
import { useAuthStore } from './store/useAuthStore';

export const App: React.FC = () => {
  const [tabActiva, setTabActiva] = useState<NavTab>('LANDING');
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const { inicializarSocket, cargarEstaciones } = useTelemetriaStore();
  const { isAutenticado, usuario, verificarSesion, cargandoSesion, debeCambiarPassword } = useAuthStore();

  const esAdmin = usuario?.rol === 'ADMIN';
  const esSupervisor = usuario?.rol === 'SUPERVISOR';
  const esMinistro = usuario?.rol === 'MINISTRO_DE_FE';
  const tieneAccesoGestion = esAdmin || esSupervisor;

  // Garantizar que la pestaña activa corresponda a los permisos del rol (RBAC)
  useEffect(() => {
    if (isAutenticado && usuario) {
      if (!tieneAccesoGestion) {
        // Rutas no permitidas para FUNCIONARIO sin permisos de gestión
        const rutasGestion: NavTab[] = [
          'DASHBOARD',
          'FIRMAS',
          'USUARIOS_CUSTODIA',
          'ALERTAS',
          'AUDITORIA',
          'CONFIGURACION',
        ];
        if (rutasGestion.includes(tabActiva)) {
          setTabActiva('MIS_DOCUMENTOS');
        }
        if (tabActiva === 'FE_PUBLICA' && !esMinistro && !esAdmin) {
          setTabActiva('MIS_DOCUMENTOS');
        }
      }
    }
  }, [tabActiva, isAutenticado, usuario, tieneAccesoGestion, esMinistro, esAdmin]);

  // Verificar si hay sesión activa almacenada al cargar
  useEffect(() => {
    verificarSesion();
  }, [verificarSesion]);

  // Si está autenticado, conectar telemetría en tiempo real
  useEffect(() => {
    if (isAutenticado) {
      inicializarSocket();
      cargarEstaciones();
    }
  }, [isAutenticado, inicializarSocket, cargarEstaciones]);

  // Pantalla de carga inicial si hay token previo
  if (cargandoSesion && localStorage.getItem('access_token')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-muted-foreground">Verificando credenciales institucionales...</span>
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
              const esAdmin = usuario.rol === 'ADMIN' || usuario.rol === 'SUPERVISOR';
              setTabActiva(esAdmin ? 'DASHBOARD' : 'MIS_DOCUMENTOS');
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
            const u = useAuthStore.getState().usuario;
            const esAdmin = u?.rol === 'ADMIN' || u?.rol === 'SUPERVISOR';
            setTabActiva(esAdmin ? 'DASHBOARD' : 'MIS_DOCUMENTOS');
          }}
        />
      </>
    );
  }

  // 2. Vista interna corporativa con navegación según rol
  return (
    <div className="min-h-screen flex w-full bg-background text-foreground transition-colors duration-200">
      {/* Barra Lateral con Navegación filtrada por Rol Real */}
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
            {/* Vistas Personales del Funcionario */}
            {tabActiva === 'MIS_DOCUMENTOS' && <MisDocumentosFuncionarioView />}
            {tabActiva === 'FIRMAGOB_V2' && esAdmin && <EntornoPruebasFirmaGobV2 />}
            {tabActiva === 'FE_PUBLICA' && (esMinistro || esAdmin) && <FePublicaDecretosView />}

            {/* Vistas de Administrador / Supervisor protegidas con RBAC */}
            {tabActiva === 'DASHBOARD' && tieneAccesoGestion && <DashboardSupervisores />}
            {tabActiva === 'FIRMAS' && tieneAccesoGestion && <FirmaLotesView />}
            {tabActiva === 'USUARIOS_CUSTODIA' && tieneAccesoGestion && <GestionUsuariosEquipamientoView />}
            {tabActiva === 'ALERTAS' && tieneAccesoGestion && <AlertasCertificadosView />}
            {tabActiva === 'AUDITORIA' && tieneAccesoGestion && <AuditoriaView />}
            {tabActiva === 'CONFIGURACION' && tieneAccesoGestion && <ConfiguracionSistemaView />}

            {/* Compartida */}
            {tabActiva === 'CHECKSIGN' && <ChecksignView />}
          </div>
        </main>

        {/* Footer Institucional */}
        <footer className="border-t bg-card py-3 px-6 text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              © 2026 Ilustre Municipalidad de Coquimbo
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <span>Plataforma Oficial de Firma Electrónica</span>
              <span>•</span>
              <span>Seguridad Institucional</span>
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
            const u = useAuthStore.getState().usuario;
            const esAdmin = u?.rol === 'ADMIN' || u?.rol === 'SUPERVISOR';
            setTabActiva(esAdmin ? 'DASHBOARD' : 'MIS_DOCUMENTOS');
          }}
        />
      )}
    </div>
  );
};

export default App;
