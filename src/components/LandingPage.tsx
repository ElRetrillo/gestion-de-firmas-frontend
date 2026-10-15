import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ThemeToggle } from './ThemeToggle';
import { LogoMunicipalidad } from './LogoMunicipalidad';
import { useAuthStore } from '../store/useAuthStore';

interface LandingPageProps {
  onGoToDashboard: () => void;
  onGoToChecksign: () => void;
  onOpenLogin: (roleHint?: 'CIUDADANO' | 'GESTOR') => void;
  onGoToPortalCiudadano: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToDashboard,
  onGoToChecksign,
  onOpenLogin,
  onGoToPortalCiudadano,
}) => {
  const { isAutenticado, usuario, logout } = useAuthStore();

  const [codigoConsulta, setCodigoConsulta] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [resultadoRapido, setResultadoRapido] = useState<any | null>(null);

  const handleVerificarRapido = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoConsulta.trim()) return;

    setVerificando(true);
    setTimeout(() => {
      setResultadoRapido({
        codigo: codigoConsulta,
        valido: true,
        tipo: 'Decreto Alcaldicio Exento N° 842',
        firmante: 'Patricio Reyes Morales',
        cargo: 'Secretario Municipal (Ministro de Fe)',
        normativa: 'Conforme a Ley N° 19.799 y Ley N° 21.663',
        tsa: new Date().toLocaleDateString('es-CL', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
      setVerificando(false);
    }, 450);
  };

  const esGestor = isAutenticado && usuario.rol !== 'CIUDADANO';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col bg-tech-grid transition-colors">
      {/* 1. Header con Espacio de Logo Municipal, Acceso por Roles y Tema */}
      <header className="border-b bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <LogoMunicipalidad variant="header" />
            <div className="hidden sm:block border-l border-border pl-3">
              <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase block leading-tight">
                MUNICIPALIDAD DE COQUIMBO
              </span>
              <span className="text-xs font-bold tracking-tight text-foreground">
                Portal de Firmas & Documentos Oficiales
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <ThemeToggle />

            {/* Si ya está autenticado, muestra su badge de rol y botón para ir a su panel */}
            {isAutenticado ? (
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-[10px] font-mono hidden md:inline-flex">
                  {usuario.rol} • {usuario.nombre.split(' ')[0]}
                </Badge>
                {esGestor ? (
                  <Button
                    onClick={onGoToDashboard}
                    size="sm"
                    className="font-semibold text-xs px-3"
                  >
                    Panel Gestor
                  </Button>
                ) : (
                  <Button
                    onClick={onGoToPortalCiudadano}
                    size="sm"
                    className="font-semibold text-xs px-3"
                  >
                    Portal Vecino
                  </Button>
                )}
                <Button
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="text-xs px-2.5 h-8 font-mono text-muted-foreground hover:text-foreground"
                  title="Cerrar sesión"
                >
                  Salir
                </Button>
              </div>
            ) : (
              /* Si no está autenticado, muestra los botones claros para ingresar según rol */
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => onOpenLogin('CIUDADANO')}
                  variant="outline"
                  size="sm"
                  className="font-medium text-xs px-3"
                >
                  Acceso Vecino
                </Button>
                <Button
                  onClick={() => onOpenLogin('GESTOR')}
                  size="sm"
                  className="font-semibold text-xs px-3.5"
                >
                  Iniciar Sesión Gestor / Admin
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Amigable y Centrado en el Usuario (Presentación limpia y humana) */}
      <section className="pt-12 pb-16 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Columna Izquierda: Mensaje Ciudadano Amigable */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider py-0.5 px-2.5">
                GOBIERNO DIGITAL • LEY N° 19.799
              </Badge>
              <Badge variant="secondary" className="font-mono text-[10px] py-0.5 px-2">
                FIRMA ELECTRÓNICA AVANZADA (FEA)
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.15]">
              Firma y validación de documentos oficiales al servicio de la comunidad.
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
              La Ilustre Municipalidad de Coquimbo pone a tu disposición un entorno confiable para consultar decretos, verificar la firma de autoridades y realizar trámites digitales con plena validez jurídica.
            </p>

            {/* Botones de Acción Orientados a Usuario y Gestor */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                size="default"
                onClick={onGoToPortalCiudadano}
                className="font-bold text-xs h-10 px-5 shadow-sm"
              >
                Portal Ciudadano / Trámites
              </Button>

              <Button
                variant="outline"
                size="default"
                onClick={onGoToChecksign}
                className="font-medium text-xs h-10 px-5"
              >
                Verificar Documento Checksign
              </Button>

              <Button
                variant="ghost"
                size="default"
                onClick={() => onOpenLogin('GESTOR')}
                className="font-medium text-xs h-10 px-4 text-muted-foreground hover:text-foreground"
              >
                Acceso Gestores →
              </Button>
            </div>

            {/* Pilares de Confianza y Calidad */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t max-w-xl">
              <div>
                <span className="font-mono text-xs text-muted-foreground uppercase block text-[10px]">
                  VALIDEZ LEGAL
                </span>
                <span className="font-semibold text-sm text-foreground">
                  Ley N° 19.799
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">Misma fe pública que papel</p>
              </div>
              <div>
                <span className="font-mono text-xs text-muted-foreground uppercase block text-[10px]">
                  SEGURIDAD
                </span>
                <span className="font-semibold text-sm text-foreground">
                  Ley N° 21.663
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">Trazabilidad ANCI</p>
              </div>
              <div>
                <span className="font-mono text-xs text-muted-foreground uppercase block text-[10px]">
                  DISPONIBILIDAD
                </span>
                <span className="font-semibold text-sm text-foreground">
                  24/7 Digital
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">Acceso inmediato</p>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta de Verificación Amigable para el Vecino */}
          <div className="lg:col-span-5">
            <Card className="border-border/80 shadow-xl bg-card/95 backdrop-blur-md overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-[9px]">
                    CONSULTA INMEDIATA
                  </Badge>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    SERVICIO PÚBLICO
                  </span>
                </div>
                <CardTitle className="text-base font-bold text-foreground mt-1">
                  Verificar un Documento Municipal
                </CardTitle>
                <CardDescription className="text-xs">
                  Ingresa el código o folio impreso en tu documento para comprobar la autenticidad de la firma.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-4 text-xs">
                <form onSubmit={handleVerificarRapido} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-foreground">
                      Código del Documento:
                    </label>
                    <Input
                      type="text"
                      value={codigoConsulta}
                      onChange={(e) => setCodigoConsulta(e.target.value)}
                      placeholder="Ej: DEC-ALCALDIA-2026-904..."
                      className="text-xs h-9 font-mono"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={verificando}
                    className="w-full text-xs font-bold h-9"
                  >
                    {verificando ? 'Consultando en registro oficial...' : 'Comprobar Validez'}
                  </Button>
                </form>

                {/* Resultado amigable de la verificación */}
                {resultadoRapido && (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs space-y-1.5 animate-in fade-in">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ✓ DOCUMENTO VÁLIDO
                      </span>
                      <span className="text-muted-foreground">{resultadoRapido.tsa}</span>
                    </div>
                    <div className="font-semibold text-foreground">{resultadoRapido.tipo}</div>
                    <p className="text-[11px] text-muted-foreground">
                      Firmado por: <strong className="text-foreground">{resultadoRapido.firmante}</strong> ({resultadoRapido.cargo})
                    </p>
                  </div>
                )}

                {/* Explicación de cómo encontrar el código */}
                <div className="p-3 bg-muted/40 rounded-lg border text-[11px] text-muted-foreground space-y-1">
                  <div className="font-semibold text-foreground">¿Dónde encuentro este código?</div>
                  <p>
                    Revisa la última página de tu documento o resolución. El código se encuentra al costado inferior derecho, junto al timbre digital y el código QR.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="p-4 bg-muted/20 border-t flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">¿Tienes dudas con un trámite?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onGoToPortalCiudadano}
                  className="text-xs p-0 h-auto font-semibold text-primary hover:underline"
                >
                  Ir al Portal Ciudadano →
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. Bento Grid Amigable (Módulos claros: Servicios Ciudadanos y Entorno de Gestión) */}
      <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">
              SERVICIOS MUNICIPALES
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Espacios de Atención y Gestión
            </h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-md text-left sm:text-right">
            Plataforma digital integrada para vecinos y funcionarios de la I. Municipalidad de Coquimbo
          </p>
        </div>

        {/* Bento Grid con Módulos Claros */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Card A: Portal Ciudadano (Span 6) */}
          <Card className="md:col-span-6 hover:border-primary/50 transition-colors flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-[9px] uppercase">
                  VISTA USUARIO / CIUDADANO
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground">ACCESO LIBRE</span>
              </div>
              <CardTitle className="text-base font-bold mt-1">
                Portal de Trámites y Certificados Vecinales
              </CardTitle>
              <CardDescription className="text-xs">
                Accede a certificados de residencia, resoluciones, patentes y documentos visados digitalmente.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-3">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Descarga de certificados con validación QR inmediata</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Consulta de expedientes y decretos alcaldicios exentos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Sin filas ni esperas presenciales en dependencias municipales</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-5 pt-2 border-t flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Atención continua 24/7
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onGoToPortalCiudadano}
                className="text-xs font-semibold"
              >
                Abrir Portal Ciudadano →
              </Button>
            </CardFooter>
          </Card>

          {/* Card B: Validador Checksign (Span 6) */}
          <Card className="md:col-span-6 hover:border-primary/50 transition-colors flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-[9px] uppercase">
                  CHECKSIGN VALIDADOR
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground">LEY N° 19.799</span>
              </div>
              <CardTitle className="text-base font-bold mt-1">
                Validación de Firma Electrónica Avanzada
              </CardTitle>
              <CardDescription className="text-xs">
                Comprueba la integridad técnica y la autoría de cualquier firma emitida por la municipalidad.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-3">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Verificación de no repudio y estampado de tiempo oficial (TSA)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Auditoría de cadena de certificación y prestadores acreditados</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Compatible con documentos PDF firmados digitalmente</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-5 pt-2 border-t flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Acreditado ante el Ministerio de Economía
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onGoToChecksign}
                className="text-xs font-semibold"
              >
                Verificar Documento →
              </Button>
            </CardFooter>
          </Card>

          {/* Card C: Entorno de Gestión y Firma para Funcionarios (Span 12) */}
          <Card className="md:col-span-12 hover:border-primary/50 transition-colors flex flex-col sm:flex-row justify-between items-center p-5 gap-4 bg-muted/20">
            <div className="space-y-1 text-left max-w-2xl">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="font-mono text-[9px] uppercase">
                  VISTA GESTOR & ADMINISTRACIÓN
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">EXCLUSIVO FUNCIONARIOS</span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                ¿Eres supervisor o gestor municipal de firmas?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ingresa al panel operativo para supervisar estaciones de firma, orquestar lotes masivos de decretos y revisar la auditoría de seguridad conforme a la Ley N° 21.663.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button
                onClick={() => onOpenLogin('GESTOR')}
                size="sm"
                className="font-bold text-xs px-5 h-9"
              >
                Iniciar Sesión Gestor / Admin
              </Button>
              {isAutenticado && esGestor && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onGoToDashboard}
                  className="text-xs px-4 h-9 font-semibold"
                >
                  Ir al Dashboard Operativo →
                </Button>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* 4. Pie de Página Institucional */}
      <footer className="border-t bg-card mt-auto py-8 px-4 sm:px-6 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <LogoMunicipalidad variant="sidebar" className="h-9 w-9" />
            <div>
              <p className="font-bold text-foreground">Ilustre Municipalidad de Coquimbo</p>
              <p className="text-[11px] text-muted-foreground">
                Departamento de Gestión de Sistemas y TICs • Transformación Digital
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono">
            <span>LEY N° 19.799 (FEA)</span>
            <span>•</span>
            <span>LEY N° 21.663 (ANCI)</span>
            <span>•</span>
            <span>LEY N° 21.180 (TRANSFORMACIÓN DIGITAL)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
