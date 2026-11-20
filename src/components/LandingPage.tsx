import React from 'react';
import { LogIn } from 'lucide-react';
import { Button } from './ui/button';
import { ThemeToggle } from './ThemeToggle';
import { LogoMunicipalidad } from './LogoMunicipalidad';
import { useAuthStore } from '../store/useAuthStore';

interface LandingPageProps {
  onGoToApp: () => void;
  onOpenLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToApp, onOpenLogin }) => {
  const { isAutenticado, usuario } = useAuthStore();

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background text-foreground flex flex-col bg-tech-grid transition-colors">
      {/* Barra superior compacta */}
      <header className="border-b border-border/60 bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <LogoMunicipalidad variant="header" />
            <span className="text-xs font-bold tracking-tight text-foreground truncate">
              I. Municipalidad de Coquimbo
            </span>
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* Área central enfocada: sin badges ni ruido visual */}
      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:px-5 sm:py-8">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center gap-7">
          <LogoMunicipalidad variant="sidebar" className="h-16 w-16" />

          <div className="space-y-2">
            <h1 className="text-[clamp(1.625rem,1.2rem+2.5vw,2.25rem)] font-black tracking-tight text-foreground leading-tight">
              Control y Trazabilidad de Tokens
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Plataforma administrativa de monitoreo, vigencia y alertas de dispositivos criptográficos USB — I. Municipalidad de Coquimbo.
            </p>
          </div>

          {isAutenticado && usuario ? (
            <Button
              size="lg"
              onClick={onGoToApp}
              className="w-full h-14 sm:h-16 rounded-2xl text-base sm:text-lg font-extrabold shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <LogIn className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Ingresar ({usuario.nombre.split(' ')[0]})</span>
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={onOpenLogin}
              className="w-full h-14 sm:h-16 rounded-2xl text-base sm:text-lg font-extrabold shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <LogIn className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Iniciar Sesión</span>
            </Button>
          )}
        </div>
      </main>

      <footer className="py-3 px-4 text-center text-[11px] text-muted-foreground">
        Ilustre Municipalidad de Coquimbo
      </footer>
    </div>
  );
};

export default LandingPage;
