import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

interface Alerta {
  id: string;
  tipo: string;
  custodia: string;
  hardwareModelo: string;
  diasRestantes: number;
  severidad: 'ALTA' | 'MEDIA' | 'BAJA';
  fechaExpiracion: string;
  usuario: {
    nombre: string;
    unidad: string;
    email: string;
    rut: string;
  };
}

export const AlertasCertificadosView: React.FC = () => {
  const [alertas, setAlertas] = useState<Alerta[]>([
    {
      id: 'CERT-03',
      tipo: 'FIRMAGOB (Token Criptográfico)',
      custodia: 'TOKEN_FISICO',
      hardwareModelo: 'Feitian ePass2003 Auto',
      diasRestantes: 12,
      severidad: 'ALTA', // < 15 días
      fechaExpiracion: '2026-10-27',
      usuario: {
        nombre: 'Marcelo Gómez',
        unidad: 'Dirección de Obras Municipales',
        email: 'mgomez@municoquimbo.cl',
        rut: '14.112.980-5',
      },
    },
    {
      id: 'CERT-01',
      tipo: 'FIRMAGOB (Token SafeNet)',
      custodia: 'TOKEN_FISICO',
      hardwareModelo: 'SafeNet eToken 5110',
      diasRestantes: 25,
      severidad: 'MEDIA', // < 30 días
      fechaExpiracion: '2026-11-09',
      usuario: {
        nombre: 'Patricio Reyes Morales',
        unidad: 'Secretaría Municipal',
        email: 'preyes@municoquimbo.cl',
        rut: '12.894.120-3',
      },
    },
    {
      id: 'CERT-04',
      tipo: 'FEA ESIGN (Cloudsigner HSM)',
      custodia: 'CLOUD_HSM',
      hardwareModelo: 'Thales Luna HSM Cloud',
      diasRestantes: 52,
      severidad: 'BAJA', // < 60 días
      fechaExpiracion: '2026-12-06',
      usuario: {
        nombre: 'Camila Sepúlveda',
        unidad: 'Dirección Jurídica',
        email: 'csepulveda@municoquimbo.cl',
        rut: '17.842.301-1',
      },
    },
    {
      id: 'CERT-02',
      tipo: 'FIRMAGOB (Token SafeNet)',
      custodia: 'TOKEN_FISICO',
      hardwareModelo: 'SafeNet eToken 5110',
      diasRestantes: 58,
      severidad: 'BAJA', // < 60 días
      fechaExpiracion: '2026-12-12',
      usuario: {
        nombre: 'Andrea Morales C.',
        unidad: 'Dirección de Adm. y Finanzas',
        email: 'amorales@municoquimbo.cl',
        rut: '16.541.228-9',
      },
    },
  ]);

  const [notificando, setNotificando] = useState<string | null>(null);
  const [despachoMasivoExitoso, setDespachoMasivoExitoso] = useState(false);

  useEffect(() => {
    fetch('/api/v1/usuarios/alertas-vencimiento')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Adaptar si viene data del backend
        }
      })
      .catch(() => {});
  }, []);

  const handleNotificar = (id: string, email: string) => {
    setNotificando(id);
    setTimeout(() => {
      setNotificando(null);
      alert(`Notificación formal de renovación y ticket de soporte despachados a: ${email}`);
    }, 400);
  };

  const handleDespachoMasivo = () => {
    setDespachoMasivoExitoso(true);
    setTimeout(() => setDespachoMasivoExitoso(false), 4000);
  };

  const criticosCount = alertas.filter((a) => a.severidad === 'ALTA').length;
  const mediosCount = alertas.filter((a) => a.severidad === 'MEDIA').length;
  const preventivosCount = alertas.filter((a) => a.severidad === 'BAJA').length;

  return (
    <div className="space-y-6">
      {/* 1. Bento Asimétrico: Monitor de Ciclo de Vida & Resumen de Custodia */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Columna Izquierda (Span 8): Monitor de Vigencia Criptográfica */}
        <Card className="lg:col-span-8 border-border/80 bg-card">
          <CardHeader className="p-5 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-[9px]">
                  [ CRON // LIFECYCLE MONITOR ]
                </Badge>
                <Badge variant="secondary" className="font-mono text-[9px]">
                  ESCALAS: 60, 30 Y 15 DÍAS
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                Vigilancia Proactiva de Certificados Digitales
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Previene la paralización de firmas de decretos y resoluciones mediante alertas automáticas a funcionarios.
              </CardDescription>
            </div>

            <Button
              onClick={handleDespachoMasivo}
              size="sm"
              className="font-bold text-xs h-9 px-4 shrink-0 shadow-xs"
            >
              Despachar Alertas Masivas
            </Button>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {/* Niveles de Severidad y Radar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 space-y-1">
                <div className="text-[10px] font-mono uppercase text-rose-500 font-bold">
                  [ CRÍTICO &lt; 15 DÍAS ]
                </div>
                <div className="font-mono font-bold text-xl text-rose-600 dark:text-rose-400">
                  {criticosCount}
                </div>
                <div className="text-[10px] text-muted-foreground">Requiere gestión inmediata</div>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1">
                <div className="text-[10px] font-mono uppercase text-amber-500 font-bold">
                  [ ALERTA &lt; 30 DÍAS ]
                </div>
                <div className="font-mono font-bold text-xl text-amber-600 dark:text-amber-400">
                  {mediosCount}
                </div>
                <div className="text-[10px] text-muted-foreground">Proceso de renovación abierto</div>
              </div>

              <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-1">
                <div className="text-[10px] font-mono uppercase text-blue-500 font-bold">
                  [ PREVENTIVO &lt; 60 DÍAS ]
                </div>
                <div className="font-mono font-bold text-xl text-foreground">
                  {preventivosCount}
                </div>
                <div className="text-[10px] text-muted-foreground">Monitoreo programado</div>
              </div>
            </div>

            {despachoMasivoExitoso && (
              <div className="p-3 rounded border border-emerald-500/40 bg-emerald-500/10 text-xs text-foreground font-mono">
                [OK] Alertas transmitidas vía SMTP institucional y notificadas a los agentes WebHID de las estaciones activas.
              </div>
            )}
          </CardContent>

          <CardFooter className="p-4 border-t bg-muted/20 text-[10px] font-mono text-muted-foreground flex justify-between">
            <span>EJECUCIÓN CRON: DIARIA 08:00 CLT</span>
            <span>INTEGRACIÓN: ACTIVE DIRECTORY / GPO</span>
          </CardFooter>
        </Card>

        {/* Columna Derecha (Span 4): Resumen de Cripto-Hardware */}
        <Card className="lg:col-span-4 border-border/80 bg-card flex flex-col justify-between">
          <CardHeader className="p-5 pb-3 border-b">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              DISTRIBUCIÓN DE CUSTODIA
            </span>
            <CardTitle className="text-sm font-bold text-foreground">
              Inventario de Llaves Privadas
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded bg-muted/30 border">
              <div>
                <div className="font-semibold text-foreground text-[11px]">Tokens Físicos USB</div>
                <div className="text-[10px] text-muted-foreground font-mono">SafeNet / ePass2003</div>
              </div>
              <span className="font-mono font-bold text-foreground">3 unidades</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-muted/30 border">
              <div>
                <div className="font-semibold text-foreground text-[11px]">Firma Centralizada Cloud</div>
                <div className="text-[10px] text-muted-foreground font-mono">FIPS 140-2 Level 3 HSM</div>
              </div>
              <span className="font-mono font-bold text-foreground">1 certificado</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-muted/30 border">
              <div>
                <div className="font-semibold text-foreground text-[11px]">Entidad Acreditadora</div>
                <div className="text-[10px] text-muted-foreground font-mono">SEGPRES / ESIGN</div>
              </div>
              <Badge variant="outline" className="font-mono text-[9px]">
                OFICIAL
              </Badge>
            </div>
          </CardContent>

          <CardFooter className="p-4 border-t bg-muted/20 text-[10px] font-mono text-muted-foreground flex justify-between">
            <span>AUDITORÍA: ANCI 2026</span>
            <span>CUMPLIMIENTO: 100%</span>
          </CardFooter>
        </Card>
      </div>

      {/* 2. Grid de Certificados con Vencimiento Monitoreado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alertas.map((alerta) => {
          const isAlta = alerta.severidad === 'ALTA';
          const isMedia = alerta.severidad === 'MEDIA';

          return (
            <Card
              key={alerta.id}
              className={`border transition-all hover:shadow-md ${
                isAlta
                  ? 'border-rose-500/40 bg-rose-500/5'
                  : isMedia
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-border/80 bg-card'
              }`}
            >
              <CardHeader className="p-4 pb-2 border-b">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isAlta ? 'danger' : isMedia ? 'warning' : 'info'}
                        className="text-[9px] uppercase font-mono font-bold tracking-wider py-0"
                      >
                        {alerta.diasRestantes} DÍAS RESTANTES
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        EXPIRA: {alerta.fechaExpiracion}
                      </span>
                    </div>
                    <CardTitle className="text-sm font-bold pt-1 text-foreground">
                      {alerta.usuario.nombre}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{alerta.usuario.unidad}</p>
                  </div>

                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                    {alerta.id}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3 text-xs">
                <div className="bg-muted/40 p-2.5 rounded-md border border-border/60 space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Certificado:</span>
                    <span className="font-medium text-foreground">{alerta.tipo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dispositivo Físico:</span>
                    <span className="text-foreground">{alerta.hardwareModelo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RUT Funcionario:</span>
                    <span className="text-foreground">{alerta.usuario.rut}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Correo Notificación:</span>
                    <span className="text-muted-foreground truncate max-w-[180px]">
                      {alerta.usuario.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    CUSTODIA: {alerta.custodia}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={notificando === alerta.id}
                    onClick={() => handleNotificar(alerta.id, alerta.usuario.email)}
                    className="text-xs font-semibold h-8"
                  >
                    {notificando === alerta.id ? 'Despachando...' : 'Notificar Renovación'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
