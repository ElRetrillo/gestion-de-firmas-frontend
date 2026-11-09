import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { useAuthStore } from '../store/useAuthStore';
import { useTelemetriaStore } from '../store/useTelemetriaStore';

interface ProveedorAdaptador {
  servicio: string;
  nombre: string;
  modoOperacion: 'SANDBOX_LOCAL' | 'PRODUCCION_OFICIAL';
  endpointConfigurado: string;
  variablesRequeridas: string[];
  operativo: boolean;
}

export const ConfiguracionSistemaView: React.FC = () => {
  const { usuario } = useAuthStore();
  const { estaciones } = useTelemetriaStore();

  const [wsUrl, setWsUrl] = useState('ws://localhost:3001/telemetria');
  const [retencionLogs, setRetencionLogs] = useState('5 años');
  const [tokenTimeout, setTokenTimeout] = useState('300 segundos');
  const [guardado, setGuardado] = useState(false);
  const [adaptadores, setAdaptadores] = useState<ProveedorAdaptador[]>([]);
  const [mensajeConector, setMensajeConector] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/integraciones/estado-adaptadores')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.proveedores)) {
          setAdaptadores(data.proveedores);
        }
      })
      .catch(() => {});
  }, []);

  const handleGuardarConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              CONFIGURACIÓN GENERAL
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Configuración del Sistema
          </h2>
          <p className="text-xs text-muted-foreground">
            Gestión centralizada de preferencias de la plataforma, conexión de equipos y parámetros de seguridad.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Parámetros de Conexión */}
        <div className="lg:col-span-7 space-y-5">
          <Card className="border-border/80 bg-card">
            <CardHeader className="p-5 pb-3 border-b">
              <CardTitle className="text-sm font-bold">Directivas de Conexión</CardTitle>
              <CardDescription className="text-xs">
                Ajustes de enlace en tiempo real con los equipos municipales
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleGuardarConfig} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Dirección del Servidor de Conexión:
                  </label>
                  <Input
                    type="text"
                    value={wsUrl}
                    onChange={(e) => setWsUrl(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Canal seguro para la detección automática de dispositivos de firma.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">
                      Retención del Historial:
                    </label>
                    <Input
                      type="text"
                      value={retencionLogs}
                      onChange={(e) => setRetencionLogs(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">
                      Tiempo de Inactividad Permitido:
                    </label>
                    <Input
                      type="text"
                      value={tokenTimeout}
                      onChange={(e) => setTokenTimeout(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  {guardado ? (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ Parámetros guardados correctamente
                    </span>
                  ) : <span />}

                  <Button type="submit" size="sm" className="text-xs font-bold h-9 px-4">
                    Guardar Parámetros
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Políticas de Seguridad */}
          <Card className="border-border/80 bg-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground">Estándares de Seguridad de la Plataforma</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-muted/30 border">
                <span>Comprobación de Integridad</span>
                <Badge variant="outline" className="text-[10px]">Alta Seguridad (SHA-256)</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/30 border">
                <span>Nivel de Cifrado</span>
                <Badge variant="outline" className="text-[10px]">Oficial Certificado</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/30 border">
                <span>Sellado de Tiempo Oficial</span>
                <Badge variant="outline" className="text-[10px]">Fecha Legal Acreditada</Badge>
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
                      evento: 'TEST_WEBHOOK_PING',
                      timestamp: new Date().toISOString(),
                    }),
                  });
                  if (res.ok) setGuardado(true);
                }}
                className="text-xs h-8"
              >
                Probar Conexión de Notificación
              </Button>
            </div>
          </Card>

          {/* Módulo 6: Adaptadores Dual-Mode (Sandbox Local vs Producción Oficial) y Conectores DOM/SECPLAN */}
          <Card className="border-border/80 bg-card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Pasarela de Integraciones Externas (Dual-Mode Adapter)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Opera automáticamente en modo Sandbox Criptográfico Local mientras no existan credenciales externas en .env, y conmuta sin cambios de código al configurar las llaves de producción.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              {adaptadores.map((ad) => (
                <div
                  key={ad.servicio}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded bg-muted/30 border"
                >
                  <div>
                    <div className="font-bold text-foreground">{ad.nombre}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {ad.endpointConfigurado}
                    </div>
                  </div>
                  <Badge
                    variant={ad.modoOperacion === 'PRODUCCION_OFICIAL' ? 'success' : 'warning'}
                    className="text-[10px] shrink-0"
                  >
                    {ad.modoOperacion}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t space-y-2">
              <div className="text-[11px] font-semibold text-foreground">
                Conectores de Sistemas Municipales (SDK Embebible: <code className="font-mono">/api/v1/integraciones/conectores/sdk.js</code>)
              </div>
              <div className="flex flex-wrap gap-2">
                {(['DOM', 'SECPLAN', 'DECRETOS'] as const).map((sis) => (
                  <Button
                    key={sis}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setMensajeConector(null);
                      const res = await fetch(`/api/v1/integraciones/conectores/${sis}/solicitar-firma`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          rutSolicitante: usuario?.rut || '',
                          tituloDocumento: `Expediente Electrónico ${sis} - Coquimbo`,
                          tipoTramite: `EXPEDIENTE_${sis}`,
                          clasificacion: sis === 'DECRETOS' ? 'CRITICA' : 'INTERNA',
                        }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setMensajeConector(
                          `✓ Conector ${sis}: Documento ${data.codigoDocumento} inyectado en bandeja de firmas.`,
                        );
                      }
                    }}
                    className="text-xs h-8"
                  >
                    Simular Ingesta {sis}
                  </Button>
                ))}
              </div>
              {mensajeConector && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  {mensajeConector}
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Resumen de Estaciones Configuradas */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="border-border/80 bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold">Equipos Registrados ({estaciones.length})</CardTitle>
              <CardDescription className="text-xs">
                Equipos habilitados para operaciones de firma
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/40 text-[11px]">
                  <TableRow>
                    <TableHead>Equipo</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {estaciones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-28 text-center text-xs text-muted-foreground">
                        No hay equipos registrados actualmente
                      </TableCell>
                    </TableRow>
                  ) : (
                    estaciones.map((est) => (
                    <TableRow key={est.codigoPc}>
                      <TableCell className="text-[11px] font-semibold">
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
                            est.estadoEnVivo === 'CONECTADO'
                              ? 'success'
                              : 'danger'
                          }
                          className="text-[10px]"
                        >
                          {est.estadoEnVivo}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )))}
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
