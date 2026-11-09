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

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToApp, onOpenLogin }) => {
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
                Sistema de Control y Seguimiento de Tokens de Firma Electrónica
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <ThemeToggle />

            {isAutenticado && usuario ? (
              <div className="flex items-center space-x-2">
                <div className="hidden md:flex flex-col text-right text-xs">
                  <span className="font-bold text-foreground truncate max-w-[160px]">{usuario.nombre}</span>
                  <span className="text-[10px] text-amber-500 font-mono font-bold">{usuario.rol}</span>
                </div>
                <Button
                  onClick={onGoToApp}
                  size="sm"
                  className="font-bold text-xs px-4 h-9 shadow-sm"
                >
                  Ir al Panel de Control →
                </Button>
                <Button
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                >
                  Salir
                </Button>
              </div>
            ) : (
              <Button
                onClick={onOpenLogin}
                size="sm"
                className="font-bold text-xs px-4 h-9 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Iniciar Sesión
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero / Portada de Bienvenida Institucional */}
      <main className="flex-1 flex flex-col justify-center px-4 sm:px-6 py-12 lg:py-16 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Mensaje de Bienvenida Institucional */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-mono border-primary/50 text-primary bg-primary/5">
                TELEMETRÍA DE SESIÓN Y DISPOSITIVOS USB
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-mono">
                ENTORNO DE CONTROL DE TOKENS FEA
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.15]">
              Control y Seguimiento de Tokens de Firma Electrónica
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Plataforma institucional dedicada al monitoreo de dispositivos criptográficos (existentes, activos y expirados), control de firmas asignadas por funcionario, conteo exacto de acciones de firma realizadas desde la sesión activa, alertas de vencimiento a 15, 30 y 60 días, y gestión de contratos de obtención de tokens.
            </p>

            {/* Llamado a la Acción Directo al Sistema */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {isAutenticado && usuario ? (
                <Button
                  size="lg"
                  onClick={onGoToApp}
                  className="font-bold text-sm h-12 px-7 shadow-md flex items-center justify-center gap-2.5"
                >
                  <span>Ingresar al Control de Tokens ({usuario.nombre})</span>
                  <span>→</span>
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={onOpenLogin}
                  className="font-bold text-sm h-12 px-7 shadow-md flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <span>Iniciar Sesión Institucional</span>
                </Button>
              )}
            </div>

            {/* Aviso institucional */}
            <div className="p-3.5 rounded-lg border border-border/70 bg-muted/30 text-xs text-muted-foreground flex items-start gap-3">
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground block">Trazabilidad desde la sesión y el dispositivo</span>
                <p className="text-[11px] leading-relaxed">
                  Los datos de estado, vigencia y acciones de firma son capturados desde la sesión activa y el token conectado al equipo municipal, contabilizando exclusivamente las firmas efectuadas como acciones operativas.
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
                    Departamento de Gestión de Sistemas y TICs • Unidad de Control de Tokens FEA
                  </p>
                </div>
              </div>

              <CardContent className="p-6 space-y-3.5">
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-background/60">
                    <div className="space-y-0.5 text-xs">
                      <div className="font-semibold text-foreground">1. Firmas Asignadas y Dispositivos (Total / Activos / Expirados)</div>
                      <p className="text-muted-foreground text-[11px]">
                        Visualización de titularidad, estado de vigencia, tiempo restante de expiración y conexión en vivo desde la sesión.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-background/60">
                    <div className="space-y-0.5 text-xs">
                      <div className="font-semibold text-foreground">2. Acciones por Funcionario (1 Acción = 1 Firma)</div>
                      <p className="text-muted-foreground text-[11px]">
                        Métrica depurada de firmas realizadas con cada token, excluyendo eventos de conexión y desconexión USB.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-background/60">
                    <div className="space-y-0.5 text-xs">
                      <div className="font-semibold text-foreground">3. Alertas de Vencimiento (15, 30 y 60 días) y Contratos</div>
                      <p className="text-muted-foreground text-[11px]">
                        Despacho de avisos por correo electrónico, control de caducidad de contratos con visor PDF y exportación de Summary en LaTeX / PDF.
                      </p>
                    </div>
                  </div>
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
                Departamento de Gestión de Sistemas y TICs • Control y Seguimiento de Tokens
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span>Control de Tokens FEA</span>
            <span>•</span>
            <span>Vigencia 15/30/60 Días</span>
            <span>•</span>
            <span>Summary PDF / LaTeX</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
