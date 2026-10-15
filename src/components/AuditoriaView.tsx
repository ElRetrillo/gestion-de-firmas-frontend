import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface EventoAuditoria {
  id: string;
  tablaAfectada: string;
  registroId: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE' | 'FIRMA_EJECUTADA' | 'TELEMETRIA_PING';
  usuario: string;
  ip: string;
  timestamp: string;
  diffJson: Record<string, any>;
}

export const AuditoriaView: React.FC = () => {
  const [filtro, setFiltro] = useState('');
  const [filtroAccion, setFiltroAccion] = useState<string>('TODOS');
  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoAuditoria | null>(null);

  const eventos: EventoAuditoria[] = [
    {
      id: 'AUD-8821',
      tablaAfectada: 'telemetria_eventos',
      registroId: 'PC-DOM-05',
      accion: 'FIRMA_EJECUTADA',
      usuario: 'mgomez@municoquimbo.cl',
      ip: '10.20.2.45',
      timestamp: '2026-10-15 10:25:12',
      diffJson: {
        hardware: 'Feitian ePass2003 Auto',
        estado: 'FIRMANDO',
        loteId: 'BATCH-2026-DOM',
        sha256Digest: 'a1f938c9284bd09831a2...74e2',
        tsaToken: 'RFC3161_VERIFIED',
      },
    },
    {
      id: 'AUD-8820',
      tablaAfectada: 'estaciones_trabajo',
      registroId: 'PC-SECMUN-01',
      accion: 'UPDATE',
      usuario: 'ghost-app-agent',
      ip: '10.20.1.10',
      timestamp: '2026-10-15 10:24:45',
      diffJson: {
        estadoHardware: 'CONECTADO',
        vendorId: '0x04B9',
        productId: '0x5110',
        serialNumber: 'SN-SAF-98214',
      },
    },
    {
      id: 'AUD-8819',
      tablaAfectada: 'solicitudes_firma',
      registroId: 'SOL-1004',
      accion: 'UPDATE',
      usuario: 'preyes@municoquimbo.cl',
      ip: '10.20.0.5',
      timestamp: '2026-10-15 10:15:00',
      diffJson: {
        estadoAprobacion: 'FIRMADA',
        documentoFirmadoUrl: 's3://firmados/pago-23.pdf',
        firmanteRut: '12.894.120-3',
      },
    },
    {
      id: 'AUD-8818',
      tablaAfectada: 'usuarios',
      registroId: '16.541.228-9',
      accion: 'UPDATE',
      usuario: 'admin-rrhh',
      ip: '10.20.1.88',
      timestamp: '2026-10-15 09:30:10',
      diffJson: {
        estado: 'ACTIVO',
        rol: 'SUPERVISOR',
        unidad: 'Dirección de Adm. y Finanzas',
      },
    },
    {
      id: 'AUD-8817',
      tablaAfectada: 'telemetria_eventos',
      registroId: 'PC-DAF-02',
      accion: 'TELEMETRIA_PING',
      usuario: 'agent-heartbeat',
      ip: '10.20.1.12',
      timestamp: '2026-10-15 09:00:00',
      diffJson: {
        latenciaMs: 14,
        ttlRedis: 3600,
        estado: 'HEARTBEAT_OK',
      },
    },
  ];

  const eventosFiltrados = eventos.filter((e) => {
    const matchesTexto =
      e.registroId.toLowerCase().includes(filtro.toLowerCase()) ||
      e.usuario.toLowerCase().includes(filtro.toLowerCase()) ||
      e.tablaAfectada.toLowerCase().includes(filtro.toLowerCase()) ||
      e.id.toLowerCase().includes(filtro.toLowerCase());

    const matchesAccion = filtroAccion === 'TODOS' || e.accion === filtroAccion;

    return matchesTexto && matchesAccion;
  });

  return (
    <div className="space-y-6">
      {/* 1. Bento Asimétrico: Monitor Forense ANCI & Filtros de Seguridad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Columna Izquierda (Span 8): Monitor de Auditoría Inalterable */}
        <Card className="lg:col-span-8 border-border/80 bg-card">
          <CardHeader className="p-5 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-[9px]">
                  [ ANCI // LEY 21.663 ]
                </Badge>
                <Badge variant="secondary" className="font-mono text-[9px]">
                  TABLAS CON AUDIT TRAIL GIN
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                Trazabilidad y Auditoría Forense
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Bitácora criptográfica inalterable en PostgreSQL con índices GIN e inspección forense de mutaciones JSONB.
              </CardDescription>
            </div>

            <Badge variant="outline" className="text-xs font-mono py-1 px-3 shrink-0">
              CGR &amp; ANCI READY
            </Badge>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                <div className="text-[10px] font-mono text-muted-foreground uppercase">
                  EVENTOS AUDITADOS
                </div>
                <div className="font-mono font-bold text-xl text-foreground">
                  14,892
                </div>
                <div className="text-[10px] text-muted-foreground">Últimos 30 días</div>
              </div>

              <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                <div className="text-[10px] font-mono text-muted-foreground uppercase">
                  INTEGRIDAD DEL LEDGER
                </div>
                <div className="font-mono font-bold text-xl text-emerald-600 dark:text-emerald-400">
                  100% ÍNTEGRO
                </div>
                <div className="text-[10px] text-muted-foreground">Sin discrepancias hash</div>
              </div>

              <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                <div className="text-[10px] font-mono text-muted-foreground uppercase">
                  LATENCIA DE BÚSQUEDA
                </div>
                <div className="font-mono font-bold text-xl text-primary">
                  0.4 ms
                </div>
                <div className="text-[10px] text-muted-foreground">PostgreSQL GIN index</div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Input
                type="text"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar por usuario, IP, estación o tabla afectada..."
                className="text-xs font-mono"
              />
            </div>
          </CardContent>

          <CardFooter className="p-4 border-t bg-muted/20 text-[10px] font-mono text-muted-foreground flex justify-between">
            <span>NORMATIVA: LEY N° 21.663</span>
            <span>POLÍTICA DE RETENCIÓN: 5 AÑOS</span>
          </CardFooter>
        </Card>

        {/* Columna Derecha (Span 4): Filtros Rápidos de Severidad */}
        <Card className="lg:col-span-4 border-border/80 bg-card flex flex-col justify-between">
          <CardHeader className="p-5 pb-3 border-b">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              SEGMENTACIÓN DE EVENTOS
            </span>
            <CardTitle className="text-sm font-bold text-foreground">
              Tipología de Registro
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 space-y-2 text-xs">
            {[
              { id: 'TODOS', label: 'Todos los Eventos', count: eventos.length },
              { id: 'FIRMA_EJECUTADA', label: 'Firmas Criptográficas (FEA)', count: 1 },
              { id: 'UPDATE', label: 'Mutaciones de Base de Datos', count: 3 },
              { id: 'TELEMETRIA_PING', label: 'Pings de Telemetría WebHID', count: 1 },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFiltroAccion(cat.id)}
                className={`w-full flex items-center justify-between p-2 rounded border text-left text-xs transition-colors ${
                  filtroAccion === cat.id
                    ? 'border-primary bg-primary/10 text-foreground font-semibold'
                    : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <span>{cat.label}</span>
                <span className="font-mono text-[10px]">{cat.count}</span>
              </button>
            ))}
          </CardContent>

          <CardFooter className="p-4 border-t bg-muted/20 text-[10px] font-mono text-muted-foreground flex justify-between">
            <span>HASH LEDGER: SHA-256</span>
            <span>EXPORTAR: JSON / CSV</span>
          </CardFooter>
        </Card>
      </div>

      {/* 2. Tabla de Auditoría Forense y Visor JSONB */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className={`${eventoSeleccionado ? 'lg:col-span-7' : 'lg:col-span-12'} border-border/80 bg-card`}>
          <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Registros Encontrados ({eventosFiltrados.length})
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              Haga clic en una fila para inspeccionar el payload JSONB
            </span>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="text-xs font-bold">ID / Tabla</TableHead>
                  <TableHead className="text-xs font-bold">Acción</TableHead>
                  <TableHead className="text-xs font-bold">Registro / Estación</TableHead>
                  <TableHead className="text-xs font-bold">Usuario / Agente</TableHead>
                  <TableHead className="text-xs font-bold">IP</TableHead>
                  <TableHead className="text-xs font-bold">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventosFiltrados.map((ev) => {
                  const isSelected = eventoSeleccionado?.id === ev.id;

                  return (
                    <TableRow
                      key={ev.id}
                      data-state={isSelected ? 'selected' : undefined}
                      onClick={() => setEventoSeleccionado(ev)}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <TableCell>
                        <div className="font-mono text-xs font-bold text-foreground">{ev.id}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{ev.tablaAfectada}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ev.accion === 'FIRMA_EJECUTADA'
                              ? 'success'
                              : ev.accion === 'UPDATE'
                              ? 'info'
                              : 'default'
                          }
                          className="text-[9px] font-mono"
                        >
                          {ev.accion}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium text-foreground">
                        {ev.registroId}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-foreground">
                        {ev.usuario}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {ev.ip}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {ev.timestamp}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Panel Inspector JSONB */}
        {eventoSeleccionado && (
          <Card className="lg:col-span-5 border-border/80 bg-card flex flex-col justify-between">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  PAYLOAD JSONB AUDITADO
                </span>
                <CardTitle className="text-sm font-bold text-foreground">
                  {eventoSeleccionado.id} • {eventoSeleccionado.registroId}
                </CardTitle>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setEventoSeleccionado(null)}
                className="h-7 px-2 text-xs"
              >
                Cerrar
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              <div className="p-3 bg-muted/40 rounded border font-mono text-[11px] space-y-1">
                <div><strong>Tabla:</strong> {eventoSeleccionado.tablaAfectada}</div>
                <div><strong>Usuario:</strong> {eventoSeleccionado.usuario}</div>
                <div><strong>IP Origen:</strong> {eventoSeleccionado.ip}</div>
                <div><strong>Timestamp:</strong> {eventoSeleccionado.timestamp}</div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  Mutación Completa (Diff JSON):
                </span>
                <pre className="p-3 bg-muted/60 rounded border text-[11px] font-mono text-foreground overflow-x-auto max-h-60 select-all">
                  {JSON.stringify(eventoSeleccionado.diffJson, null, 2)}
                </pre>
              </div>
            </CardContent>

            <CardFooter className="p-3 border-t bg-muted/20 text-[10px] font-mono text-muted-foreground flex justify-between">
              <span>FIRMA SHA-256 VERIFICADA</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(JSON.stringify(eventoSeleccionado.diffJson, null, 2))}
                className="h-6 px-2 text-[10px] font-mono"
              >
                Copiar JSON
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};
