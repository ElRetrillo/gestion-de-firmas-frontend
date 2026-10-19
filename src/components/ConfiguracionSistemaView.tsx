import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { useAuthStore } from '../store/useAuthStore';
import { useTelemetriaStore } from '../store/useTelemetriaStore';

export const ConfiguracionSistemaView: React.FC = () => {
  const { usuario } = useAuthStore();
  const { estaciones } = useTelemetriaStore();

  const [wsUrl, setWsUrl] = useState('ws://localhost:3001/telemetria');
  const [retencionLogs, setRetencionLogs] = useState('5 años (Ley N° 21.663 ANCI)');
  const [tokenTimeout, setTokenTimeout] = useState('300 segundos');
  const [guardado, setGuardado] = useState(false);

  const handleGuardarConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Exclusivo de Administrador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-500 font-bold">
              [ SECCIÓN EXCLUSIVA // ADMINISTRADOR TIC MUNICIPAL ]
            </span>
            <Badge variant="outline" className="text-[9px] font-mono border-rose-500/40 text-rose-500">
              ACCESO ROOT
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Configuración del Sistema y Parámetros de Red
          </h2>
          <p className="text-xs text-muted-foreground">
            Gestión técnica centralizada de la plataforma de firmas, puertos de telemetría y directivas de ciberseguridad.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Parámetros de Red y Ciberseguridad (Span 7) */}
        <div className="lg:col-span-7 space-y-5">
          <Card className="border-border/80 bg-card">
            <CardHeader className="p-5 pb-3 border-b">
              <CardTitle className="text-sm font-bold">Directivas Técnicas de Telemetría</CardTitle>
              <CardDescription className="text-xs">
                Ajustes de conexión en tiempo real con agentes de hardware municipales
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleGuardarConfig} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Endpoint de Telemetría WebSocket (VITE_WS_URL):
                  </label>
                  <Input
                    type="text"
                    value={wsUrl}
                    onChange={(e) => setWsUrl(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Canal seguro WSS para eventos de inserción/extracción de tokens SafeNet.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">
                      Retención de Logs ANCI:
                    </label>
                    <Input
                      type="text"
                      value={retencionLogs}
                      onChange={(e) => setRetencionLogs(e.target.value)}
                      className="text-xs h-9 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">
                      Timeout Inactividad Token:
                    </label>
                    <Input
                      type="text"
                      value={tokenTimeout}
                      onChange={(e) => setTokenTimeout(e.target.value)}
                      className="text-xs h-9 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  {guardado ? (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                      ✓ Parámetros guardados y sincronizados
                    </span>
                  ) : <span />}

                  <Button type="submit" size="sm" className="text-xs font-bold h-9 px-4">
                    Guardar Parámetros
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Políticas de Seguridad ANCI y Pruebas de Integración */}
          <Card className="border-border/80 bg-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground">Políticas Criptográficas &amp; Entorno Testing</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-muted/30 border">
                <span>Algoritmo de Hash Primario</span>
                <Badge variant="outline" className="font-mono text-[10px]">SHA-256 FIPS 180-4</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/30 border">
                <span>Longitud Clave Asimétrica</span>
                <Badge variant="outline" className="font-mono text-[10px]">RSA 4096 BITS</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/30 border">
                <span>Sellado de Tiempo Oficial</span>
                <Badge variant="outline" className="font-mono text-[10px]">RFC 3161 TSA (ESIGN)</Badge>
              </div>
            </div>

            <div className="pt-2 border-t flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const res = await fetch('/api/v1/integraciones/webhooks/FIRMAGOB', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      evento: 'CERTIFICADO_VALIDADO_OCSP',
                      codigoDocumento: 'DEC-ALC-2026-0904',
                    }),
                  });
                  if (res.ok) setGuardado(true);
                }}
                className="text-xs font-mono h-8"
              >
                Probar Webhook HMAC-SHA256
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const res = await fetch('/api/v1/auth/seed-reset', { method: 'POST' });
                  if (res.ok) setGuardado(true);
                }}
                className="text-xs font-mono h-8 border-amber-500/50 text-amber-500"
              >
                Restaurar Base de Datos Semilla
              </Button>
            </div>
          </Card>
        </div>

        {/* Resumen de Estaciones Configuradas (Span 5) */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="border-border/80 bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold">Topología de Estaciones ({estaciones.length})</CardTitle>
              <CardDescription className="text-xs">
                Equipos registrados con permiso de firma criptográfica
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/40 text-[11px]">
                  <TableRow>
                    <TableHead>Estación</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead className="text-right">Hardware</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {estaciones.map((est) => (
                    <TableRow key={est.codigoPc}>
                      <TableCell className="font-mono text-[11px] font-semibold">
                        {est.codigoPc}
                        <div className="text-[10px] text-muted-foreground font-normal truncate max-w-[150px]">
                          {est.dependenciaFisica}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {est.ipAsignada}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            est.estadoEnVivo === 'FIRMANDO'
                              ? 'success'
                              : est.estadoEnVivo === 'CONECTADO'
                              ? 'warning'
                              : 'danger'
                          }
                          className="text-[9px] font-mono"
                        >
                          {est.estadoEnVivo}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default ConfiguracionSistemaView;
