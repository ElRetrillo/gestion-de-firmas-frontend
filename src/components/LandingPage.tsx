import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { ThemeToggle } from './ThemeToggle';
import { LogoMunicipalidad } from './LogoMunicipalidad';
import { useTelemetriaStore } from '../store/useTelemetriaStore';

interface LandingPageProps {
  onGoToDashboard: () => void;
  onGoToChecksign: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToDashboard,
  onGoToChecksign,
}) => {
  const { wsConectado } = useTelemetriaStore();

  // Estados interactivos para el Hero Simulator (estilo Zig.ai "Show, Don't Tell")
  const [heroTokenStatus, setHeroTokenStatus] = useState<'CONECTADO' | 'FIRMANDO' | 'DESCONECTADO'>('CONECTADO');
  const [liveHash, setLiveHash] = useState('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  const [liveLatency, setLiveLatency] = useState(14);
  const [codigoConsulta, setCodigoConsulta] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [resultadoRapido, setResultadoRapido] = useState<any | null>(null);

  // Simulación dinámica periódica para efecto de interfaz viva
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveLatency(Math.floor(10 + Math.random() * 8));
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const handleSimularHero = (status: 'CONECTADO' | 'FIRMANDO' | 'DESCONECTADO') => {
    setHeroTokenStatus(status);
    if (status === 'FIRMANDO') {
      const randomHash = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join('');
      setLiveHash(randomHash);
    }
  };

  const handleVerificarRapido = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoConsulta.trim()) return;

    setVerificando(true);
    setTimeout(() => {
      setResultadoRapido({
        codigo: codigoConsulta,
        valido: true,
        firmante: 'Patricio Reyes Morales',
        cargo: 'Secretario Municipal (Ministro de Fe)',
        normativa: 'Conforme a Ley N° 19.799 y Ley N° 21.663',
        tsa: new Date().toISOString(),
      });
      setVerificando(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col bg-tech-grid transition-colors">
      {/* 1. Header con Espacio de Logo Municipal, Indicadores de Estado y Tema */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <LogoMunicipalidad variant="header" />
            <div className="hidden sm:block border-l border-border pl-3">
              <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase block leading-tight">
                MUNICIPALIDAD DE COQUIMBO
              </span>
              <span className="text-xs font-bold tracking-tight text-foreground">
                Gestión de Firmas & Telemetría USB
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Badge de Red y Telemetría */}
            <Badge
              variant={wsConectado ? 'success' : 'danger'}
              className="text-[10px] font-mono py-0.5 px-2.5 hidden sm:inline-flex gap-1.5"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  wsConectado ? 'bg-emerald-500 live-indicator' : 'bg-rose-500'
                }`}
              />
              {wsConectado ? `ONLINE // ${liveLatency}ms` : 'OFFLINE'}
            </Badge>

            <ThemeToggle />

            <Button
              onClick={onGoToDashboard}
              size="sm"
              className="font-semibold text-xs px-4"
            >
              Ir al Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Hero Dinámico (Inspirado en Zig.ai: "Show, Don't Tell" con Actividad en Vivo) */}
      <section className="pt-10 pb-14 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Columna Izquierda: Mensaje Central */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider py-0.5 px-2.5">
                LEY N° 21.663 • ANCI COMPLIANT
              </Badge>
              <Badge variant="secondary" className="font-mono text-[10px] py-0.5 px-2">
                RFC 3161 TSA CERTIFIED
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.12]">
              Supervisión en tiempo real de tokens USB y orquestación de firmas.
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
              Infraestructura criptográfica municipal de 3 capas. Intercepta la presencia física de hardware SafeNet y ePass2003 en estaciones Windows, previene el fraude documental y automatiza lotes masivos de firma electrónica avanzada.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                size="default"
                onClick={onGoToDashboard}
                className="font-bold text-xs h-10 px-5 shadow-sm"
              >
                Abrir Dashboard Operacional
              </Button>

              <Button
                variant="outline"
                size="default"
                onClick={onGoToChecksign}
                className="font-medium text-xs h-10 px-5"
              >
                Validador Público Checksign
              </Button>
            </div>

            {/* Micro métricas en vivo */}
            <div className="pt-4 grid grid-cols-3 gap-3 border-t max-w-lg">
              <div>
                <span className="font-mono text-xs text-muted-foreground uppercase block text-[10px]">
                  LATENCIA WS
                </span>
                <span className="font-mono font-bold text-base text-foreground">
                  ~{liveLatency} ms
                </span>
              </div>
              <div>
                <span className="font-mono text-xs text-muted-foreground uppercase block text-[10px]">
                  TTL EXPIRACIÓN
                </span>
                <span className="font-mono font-bold text-base text-foreground">
                  3600 s
                </span>
              </div>
              <div>
                <span className="font-mono text-xs text-muted-foreground uppercase block text-[10px]">
                  ALGORITMO
                </span>
                <span className="font-mono font-bold text-base text-foreground">
                  SHA-256 + RSA
                </span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta de Telemetría Dinámica en Vivo (Sandbox Interactivo) */}
          <div className="lg:col-span-5">
            <Card className="border-border/80 shadow-lg bg-card/90 backdrop-blur-md overflow-hidden">
              <CardHeader className="p-4 pb-3 border-b bg-muted/30 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      heroTokenStatus === 'FIRMANDO'
                        ? 'bg-emerald-500 live-indicator'
                        : heroTokenStatus === 'CONECTADO'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span className="font-mono text-xs font-bold text-foreground">
                    PC-SECMUN-01 // TELEMETRÍA
                  </span>
                </div>
                <Badge variant="outline" className="font-mono text-[9px]">
                  WEBHID AGENT
                </Badge>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">
                {/* Visualizador de Hardware USB */}
                <div className="p-3 rounded-md bg-muted/40 border space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground font-medium">Ranura Criptográfica USB:</span>
                    <Badge
                      variant={
                        heroTokenStatus === 'FIRMANDO'
                          ? 'success'
                          : heroTokenStatus === 'CONECTADO'
                          ? 'warning'
                          : 'danger'
                      }
                      className="font-mono text-[9px] uppercase font-bold"
                    >
                      {heroTokenStatus}
                    </Badge>
                  </div>

                  <div className="font-mono text-[11px] text-foreground space-y-0.5">
                    <div>TOKEN: SafeNet eToken 5110 (FIPS 140-2)</div>
                    <div className="text-muted-foreground text-[10px]">VENDOR ID: 0x04B9 • SN: SN-SAF-98214</div>
                  </div>
                </div>

                {/* Ledger de Hash Criptográfico en Vivo */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                    <span>DIGEST FORENSE (SHA-256)</span>
                    <span>RFC 3161 TSA</span>
                  </div>
                  <pre className="p-2 bg-muted/60 rounded text-[10px] font-mono break-all border text-foreground/90 select-all">
                    {liveHash}
                  </pre>
                </div>

                {/* Simulador Interactivo Rápido (estilo Zig.ai interactivo) */}
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                    Simular Mutación:
                  </span>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant={heroTokenStatus === 'CONECTADO' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSimularHero('CONECTADO')}
                      className="h-6 px-2 text-[10px] font-mono"
                    >
                      Conectar
                    </Button>
                    <Button
                      variant={heroTokenStatus === 'FIRMANDO' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSimularHero('FIRMANDO')}
                      className="h-6 px-2 text-[10px] font-mono"
                    >
                      Firmar
                    </Button>
                    <Button
                      variant={heroTokenStatus === 'DESCONECTADO' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSimularHero('DESCONECTADO')}
                      className="h-6 px-2 text-[10px] font-mono text-rose-500"
                    >
                      Retirar
                    </Button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-3 bg-muted/20 border-t flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>ESTACIÓN: 10.20.1.10</span>
                <span>AUDIT RECORD: #EVT-2026</span>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. Bento Grid Asimétrico (Estructura de Alto Impacto visual inspirada en Zig.ai) */}
      <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">
              ARQUITECTURA DE DOMINIOS
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Módulos Operacionales & Seguridad Crítica
            </h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-md text-left sm:text-right font-mono">
            Integraciones certificadas con FirmaGob (SEGPRES) y ESIGN Chile
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Card A (Grande Span 8): Pipeline de Firma Masiva por Lotes */}
          <Card className="md:col-span-8 hover:border-primary/50 transition-colors flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-[9px] uppercase">
                  BULLMQ PIPELINE // ASYNC WORKER
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground">REDIS 7+ INSTANCE</span>
              </div>
              <CardTitle className="text-base font-bold mt-1">
                Motor de Firma Masiva y Despacho Asíncrono
              </CardTitle>
              <CardDescription className="text-xs">
                Orquestación en segundo plano de decretos alcaldicios, contratos de honorarios y resoluciones con visación jerárquica.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4">
              {/* Visualización de Pipeline de 4 Fases */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <div className="p-2.5 rounded bg-muted/40 border text-xs">
                  <span className="font-mono text-[9px] text-muted-foreground block">PASO 01</span>
                  <span className="font-bold text-foreground">Ingesta</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Payload REST DTO</p>
                </div>
                <div className="p-2.5 rounded bg-muted/40 border text-xs">
                  <span className="font-mono text-[9px] text-muted-foreground block">PASO 02</span>
                  <span className="font-bold text-foreground">Visación</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Validación RBAC</p>
                </div>
                <div className="p-2.5 rounded bg-muted/40 border text-xs">
                  <span className="font-mono text-[9px] text-muted-foreground block">PASO 03</span>
                  <span className="font-bold text-foreground">Estampado TSA</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">RFC 3161 TSA</p>
                </div>
                <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs">
                  <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400 block font-bold">PASO 04</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">MinIO S3</span>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Evidencia Cifrada</p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-5 pt-2 border-t flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Reintentos automáticos con política de exponential backoff
              </span>
              <Button variant="ghost" size="sm" onClick={onGoToDashboard} className="text-xs p-0 h-auto font-semibold text-primary hover:underline">
                Gestionar Lotes →
              </Button>
            </CardFooter>
          </Card>

          {/* Card B (Span 4): Auditoría Forense ANCI */}
          <Card className="md:col-span-4 hover:border-primary/50 transition-colors flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-[9px] uppercase">
                  FORENSIC RECORD
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground">JSONB + GIN</span>
              </div>
              <CardTitle className="text-base font-bold mt-1">
                Trazabilidad ANCI y CGR
              </CardTitle>
              <CardDescription className="text-xs">
                Cumplimiento de la Ley N° 21.663 contra accesos no autorizados o modificaciones.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-2">
              <div className="p-3 bg-muted/50 rounded border font-mono text-[10px] space-y-1 text-muted-foreground">
                <div className="text-foreground">TABLE: historial_cambios</div>
                <div>DIFF: &#123; "action": "FIRMA_BATCH", "sha": "e3b0c..." &#125;</div>
                <div>OPERATOR: ministro_de_fe@municoquimbo.cl</div>
              </div>
            </CardContent>

            <CardFooter className="p-5 pt-2 border-t flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">ISO/IEC 27001</span>
              <Button variant="ghost" size="sm" onClick={onGoToDashboard} className="text-xs p-0 h-auto font-semibold text-primary hover:underline">
                Ver Logs →
              </Button>
            </CardFooter>
          </Card>

          {/* Card C (Span 5): Telemetría USB con TTL */}
          <Card className="md:col-span-5 hover:border-primary/50 transition-colors flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-[9px] uppercase">
                  HARDWARE INTERCEPTION
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground">REDIS PRESENCE</span>
              </div>
              <CardTitle className="text-base font-bold mt-1">
                Telemetría USB de Tres Capas
              </CardTitle>
              <CardDescription className="text-xs">
                La Ghost App en Windows notifica a Redis con llave temporal `pc:status:{'{'}codigoPC{'}'}`.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-0 text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                Elimina los falsos positivos ante apagados abruptos gracias al TTL de 3600s con refresco continuo por ping de telemetría.
              </p>
              <div className="flex gap-2 font-mono text-[10px] pt-1">
                <span className="px-2 py-0.5 bg-muted rounded border">SafeNet / Gemalto</span>
                <span className="px-2 py-0.5 bg-muted rounded border">ePass2003</span>
                <span className="px-2 py-0.5 bg-muted rounded border">Athena</span>
              </div>
            </CardContent>

            <CardFooter className="p-5 pt-2 border-t flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">WebHID API</span>
              <Button variant="ghost" size="sm" onClick={onGoToDashboard} className="text-xs p-0 h-auto font-semibold text-primary hover:underline">
                Monitor en Vivo →
              </Button>
            </CardFooter>
          </Card>

          {/* Card D (Span 7): Verificador Documental Inmediato Checksign */}
          <Card className="md:col-span-7 hover:border-primary/50 transition-colors flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-[9px] uppercase">
                  CHECKSIGN PUBLIC PORTAL
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground">LEY N° 19.799</span>
              </div>
              <CardTitle className="text-base font-bold mt-1">
                Terminal de Validación Documental
              </CardTitle>
              <CardDescription className="text-xs">
                Comprobación ciudadana e institucional de autenticidad para decretos y actos administrativos.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-3">
              <form onSubmit={handleVerificarRapido} className="flex gap-2">
                <Input
                  type="text"
                  value={codigoConsulta}
                  onChange={(e) => setCodigoConsulta(e.target.value)}
                  placeholder="Ingrese código o hash (ej: DEC-ALCALDIA-2026-904)..."
                  className="text-xs h-9 font-mono"
                />
                <Button type="submit" disabled={verificando} size="sm" className="shrink-0 text-xs font-semibold px-4">
                  {verificando ? 'Consultando...' : 'Comprobar'}
                </Button>
              </form>

              {resultadoRapido && (
                <div className="p-3 bg-muted/40 rounded border text-xs space-y-1">
                  <div className="flex justify-between items-center font-mono text-[10px]">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      [VÁLIDO] FEA COMPROBADA
                    </span>
                    <span className="text-muted-foreground">{resultadoRapido.tsa}</span>
                  </div>
                  <p className="text-foreground">
                    Firmado por: <strong>{resultadoRapido.firmante}</strong> ({resultadoRapido.cargo})
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter className="p-5 pt-2 border-t flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Acreditado ante el Ministerio de Economía
              </span>
              <Button variant="ghost" size="sm" onClick={onGoToChecksign} className="text-xs p-0 h-auto font-semibold text-primary hover:underline">
                Portal Completo →
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* 4. Pie de Página Sobrio Institucional */}
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
            <span>LEY N° 21.663 (ANCI)</span>
            <span>•</span>
            <span>LEY N° 19.799 (FEA)</span>
            <span>•</span>
            <span>LEY N° 21.180</span>
            <span>•</span>
            <span>ISO/IEC 27001</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
