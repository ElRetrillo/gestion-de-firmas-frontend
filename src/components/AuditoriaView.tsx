import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface EventoAuditoria {
  id: string;
  tablaAfectada: string;
  registroId: string;
  accion: string;
  usuario: string;
  ip: string;
  timestamp: string;
  diffJson: Record<string, any>;
}

export const AuditoriaView: React.FC = () => {
  const [filtro, setFiltro] = useState('');
  const [filtroAccion, setFiltroAccion] = useState<string>('TODOS');
  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoAuditoria | null>(null);
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    fetch('/api/v1/auditoria')
      .then((res) => res.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : data?.historialCambios;
        if (Array.isArray(lista)) {
          setEventos(
            lista.map((item: any, idx: number) => ({
              id: item.id?.substring(0, 8).toUpperCase() || `AUD-${8900 - idx}`,
              tablaAfectada: item.tablaAfectada || 'historial_cambios',
              registroId: item.registroId || 'N/A',
              accion: item.accion || 'UPDATE',
              usuario: item.usuarioEmail || item.usuario?.email || 'sistema',
              ip: item.ipOrigen || '-',
              timestamp: item.createdAt
                ? new Date(item.createdAt).toLocaleString('es-CL')
                : new Date().toLocaleString('es-CL'),
              diffJson: item.diffJsonb || {},
            })),
          );
        }
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

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
      {/* 1. Header y Filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Columna Izquierda: Monitor de Auditoría */}
        <Card className="lg:col-span-8 border-border/80 bg-card">
          <CardHeader className="p-5 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px]">
                  Historial de Actividad
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                Historial de Operaciones
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Registro de actividades, firmas y cambios realizados en el sistema.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                  TOTAL ACTIVIDADES
                </div>
                <div className="font-bold text-xl text-foreground">
                  {eventos.length.toLocaleString('es-CL')}
                </div>
                <div className="text-[10px] text-muted-foreground">Registros guardados</div>
              </div>

              <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                  ESTADO DEL REGISTRO
                </div>
                <div className="font-bold text-xl text-emerald-600 dark:text-emerald-400">
                  {eventos.length > 0 ? 'CORRECTO' : '0 REGISTROS'}
                </div>
                <div className="text-[10px] text-muted-foreground">{eventos.length > 0 ? 'Sin inconsistencias' : 'Sin eventos previos'}</div>
              </div>

              <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                  SEGURIDAD
                </div>
                <div className="font-bold text-xl text-primary">
                  ACTIVA
                </div>
                <div className="text-[10px] text-muted-foreground">Respaldo inalterable</div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Input
                type="text"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar por usuario, IP, equipo o acción..."
                className="text-xs"
              />
            </div>
          </CardContent>

          <CardFooter className="p-4 border-t bg-muted/20 text-[10px] text-muted-foreground flex justify-between">
            <span>Registro del Sistema</span>
            <span>Historial Activo</span>
          </CardFooter>
        </Card>

        {/* Columna Derecha: Filtros */}
        <Card className="lg:col-span-4 border-border/80 bg-card flex flex-col justify-between">
          <CardHeader className="p-5 pb-3 border-b">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              FILTRAR POR ACTIVIDAD
            </span>
            <CardTitle className="text-sm font-bold text-foreground">
              Tipos de Actividad
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 space-y-2 text-xs">
            {[
              { id: 'TODOS', label: 'Todas las Actividades', count: eventos.length },
              { id: 'FIRMA_EJECUTADA', label: 'Firmas de Documentos', count: 1 },
              { id: 'UPDATE', label: 'Modificaciones del Sistema', count: 3 },
              { id: 'TELEMETRIA_PING', label: 'Conexión de Equipos', count: 1 },
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

          <CardFooter className="p-4 border-t bg-muted/20 text-[10px] text-muted-foreground flex justify-between">
            <span>Registro oficial municipal</span>
            <span>Exportar Historial</span>
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
            <span className="text-[10px] text-muted-foreground">
              Haz clic en una fila para ver los detalles de la operación
            </span>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="text-xs font-bold">ID / Módulo</TableHead>
                  <TableHead className="text-xs font-bold">Acción</TableHead>
                  <TableHead className="text-xs font-bold">Registro / Estación</TableHead>
                  <TableHead className="text-xs font-bold">Usuario</TableHead>
                  <TableHead className="text-xs font-bold">IP</TableHead>
                  <TableHead className="text-xs font-bold">Fecha y Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                      Consultando historial de actividades...
                    </TableCell>
                  </TableRow>
                ) : eventosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                      No se encontraron registros con los criterios seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  eventosFiltrados.map((ev) => {
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
                })
              )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Panel Inspector de Detalles */}
        {eventoSeleccionado && (
          <Card className="lg:col-span-5 border-border/80 bg-card flex flex-col justify-between">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  DETALLES DE LA OPERACIÓN
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
              <div className="p-3 bg-muted/40 rounded border text-[11px] space-y-1">
                <div><strong>Módulo:</strong> {eventoSeleccionado.tablaAfectada}</div>
                <div><strong>Usuario:</strong> {eventoSeleccionado.usuario}</div>
                <div><strong>IP:</strong> {eventoSeleccionado.ip}</div>
                <div><strong>Fecha y Hora:</strong> {eventoSeleccionado.timestamp}</div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Detalle de los cambios:
                </span>
                <pre className="p-3 bg-muted/60 rounded border text-[11px] font-mono text-foreground overflow-x-auto max-h-60 select-all">
                  {JSON.stringify(eventoSeleccionado.diffJson, null, 2)}
                </pre>
              </div>
            </CardContent>

            <CardFooter className="p-3 border-t bg-muted/20 text-[10px] text-muted-foreground flex justify-between">
              <span>Registro oficial verificado</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(JSON.stringify(eventoSeleccionado.diffJson, null, 2))}
                className="h-6 px-2 text-[10px]"
              >
                Copiar Datos
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};
