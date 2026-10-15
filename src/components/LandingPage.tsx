import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ThemeToggle } from './ThemeToggle';
import { LogoMunicipalidad } from './LogoMunicipalidad';
import { useAuthStore } from '../store/useAuthStore';

interface LandingPageProps {
  onGoToApp: () => void;
  onOpenLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToApp,
  onOpenLogin,
}) => {
  const { isAutenticado, usuario, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col bg-tech-grid transition-colors">
      {/* 1. Header Institucional Sobrio */}
      <header className="border-b bg-background/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <LogoMunicipalidad variant="header" />
            <div className="hidden sm:block border-l border-border pl-3">
              <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase block leading-tight font-bold">
                ILUSTRE MUNICIPALIDAD DE COQUIMBO
              </span>
              <span className="text-xs font-bold tracking-tight text-foreground">
                Sistema Interno de Gestión de Firmas y Trazabilidad
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <ThemeToggle />

            {isAutenticado ? (
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-[11px] font-mono hidden md:inline-flex px-2 py-1">
                  {usuario.rol} • {usuario.nombre}
                </Badge>
                <Button
                  onClick={onGoToApp}
                  size="sm"
                  className="font-bold text-xs px-4 h-9 shadow-sm"
                >
                  Ir al Sistema →
                </Button>
                <Button
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="text-xs px-3 h-9 font-mono text-muted-foreground hover:text-foreground"
                >
                  Salir
                </Button>
              </div>
            ) : (
              <Button
                onClick={onOpenLogin}
                size="sm"
                className="font-bold text-xs px-4 h-9 shadow-sm flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4 text-primary-foreground/90"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>Acceso</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero / Portada de Bienvenida Institucional (Sin datos ni accesos para consultar) */}
      <main className="flex-1 flex flex-col justify-center px-4 sm:px-6 py-12 lg:py-16 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Mensaje de Bienvenida Institucional */}
          <div className="lg:col-span-7 space-y-6 text-left">

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.15]">
              Bienvenido a la Plataforma de Gestión y Firma Electrónica Avanzada
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Gestiona tus firmas, realiza solicitudes y revisa tus documentos de forma rápida y segura.
            </p>

            {/* Llamado a la Acción Único: Login / Acceso */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {isAutenticado ? (
                <Button
                  size="lg"
                  onClick={onGoToApp}
                  className="font-bold text-sm h-12 px-6 shadow-md flex items-center justify-center gap-2"
                >
                  <span>Ingresar al Entorno de Trabajo ({usuario.rol})</span>
                  <span>→</span>
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={onOpenLogin}
                  className="font-bold text-sm h-12 px-7 shadow-md flex items-center justify-center gap-2.5"
                >
                  <svg
                    className="w-5 h-5 text-primary-foreground/90"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span>Acceder</span>
                </Button>
              )}
            </div>

            {/* Aviso de confidencialidad institucional */}
            <div className="p-3.5 rounded-lg border border-border/70 bg-muted/30 text-xs text-muted-foreground flex items-start gap-3">
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground block">Sistema interno</span>
                <p className="text-[11px] leading-relaxed">
                  Sistema de gestión y firma electrónica avanzada de uso exclusivo para funcionarios y autoridades de la Ilustre Municipalidad de Coquimbo. Esta plataforma centraliza la orquestación, custodia criptográfica y firma digital de decretos, resoluciones y expedientes oficiales con plena validez jurídica.
                </p>
              </div>
            </div>
          </div>

          {/* Tarjeta Visual de Portada Institucional */}
          <div className="lg:col-span-5">
            <Card className="border-border/80 shadow-2xl bg-card/95 backdrop-blur-md overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              <div className="p-6 border-b bg-muted/20 flex items-center gap-4">
                <LogoMunicipalidad variant="sidebar" className="h-12 w-12 shrink-0" />
                <div>
                  <h3 className="font-bold text-foreground text-sm">
                    Ilustre Municipalidad de Coquimbo
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Dirección de Gestión Documental y Tecnologías de la Información
                  </p>
                </div>
              </div>

              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-background/60">
                    <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      01
                    </div>
                    <div className="space-y-0.5 text-xs">
                      <div className="font-semibold text-foreground">Acceso Individual por Rol</div>
                      <p className="text-muted-foreground text-[11px]">
                        Accede según tu rol: Administrador, Supervisor, Ministro de Fe, Funcionario.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-background/60">
                    <div className="w-8 h-8 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                      02
                    </div>
                    <div className="space-y-0.5 text-xs">
                      <div className="font-semibold text-foreground">Firma digital avanzada (FEA)</div>
                      <p className="text-muted-foreground text-[11px]">
                        Orquestación, custodia criptográfica y firma digital de decretos, resoluciones y expedientes oficiales con plena validez jurídica.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-background/60">
                    <div className="w-8 h-8 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                      03
                    </div>
                    <div className="space-y-0.5 text-xs">
                      <div className="font-semibold text-foreground">Ciberseguridad y Trazabilidad (Ley N° 21.663)</div>
                      <p className="text-muted-foreground text-[11px]">
                        Registro inalterable de auditoría forense para telemetría de hardware, firma por lotes y revocación de certificados.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Sistema en proceso de prueba (BETA)</span>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* 3. Footer Institucional */}
      <footer className="border-t bg-card py-6 px-4 sm:px-6 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <LogoMunicipalidad variant="sidebar" className="h-8 w-8" />
            <div>
              <p className="font-bold text-foreground">Ilustre Municipalidad de Coquimbo</p>
              <p className="text-[11px] text-muted-foreground">
                Departamento de Gestión de Sistemas y TICs • Plataforma Corporativa Interna
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono">
            <span>LEY N° 19.799 (FEA)</span>
            <span>•</span>
            <span>LEY N° 21.663 (ANCI / CSIRT)</span>
            <span>•</span>
            <span>LEY N° 21.180 (TRANSFORMACIÓN DIGITAL DEL ESTADO)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default LandingPage;
