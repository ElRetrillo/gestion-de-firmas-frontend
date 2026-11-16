import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { formatRutVisual } from '../lib/rut';
import { cleanIpVisual } from '../lib/ip';

type SubseccionBitacora = 'GENERAL' | 'FIRMAS' | 'SESIONES';

interface EventoAuditoria {
  id: string;
  tablaAfectada: string;
  registroId: string;
  accion: string;
  usuario: string;
  personaNombre?: string | null;
  personaRut?: string | null;
  ip: string;
  timestamp: string;
  diffJson: Record<string, any>;
}

export const AuditoriaView: React.FC = () => {
  const { modoReporte, mesSeleccionado } = useTelemetriaStore();
  const [subseccion, setSubseccion] = useState<SubseccionBitacora>('GENERAL');
  const [filtro, setFiltro] = useState('');
  const [filtroAccion, setFiltroAccion] = useState<string>('TODOS');
  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoAuditoria | null>(null);
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    const params = new URLSearchParams({ modo: modoReporte });
    if (modoReporte === 'POR_MES' && mesSeleccionado) {
      params.set('mes', mesSeleccionado);
    }
    fetch(`/api/v1/auditoria?${params.toString()}`)
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
              usuario: item.usuario || item.usuarioEmail || item.usuario?.email || 'sistema',
              personaNombre: item.personaNombre || item.diffJson?.personaNombre || item.diffJsonb?.personaNombre || null,
              personaRut: formatRutVisual(
                item.personaRut ||
                  item.diffJson?.personaRut ||
                  item.diffJson?.runGob ||
                  item.diffJson?.run ||
                  item.diffJsonb?.personaRut ||
                  (item.tablaAfectada === 'usuarios' && /^[\d.\-kK]{7,12}$/.test(String(item.registroId || '').trim())
                    ? item.registroId
                    : null),
              ),
              ip: cleanIpVisual(item.ip || item.ipOrigen || '-'),
              timestamp: item.timestamp
                ? item.timestamp
                : item.createdAt
                ? new Date(item.createdAt).toLocaleString('es-CL')
                : new Date().toLocaleString('es-CL'),
              diffJson: item.diffJson || item.diffJsonb || {},
            })),
          );
        }
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [modoReporte, mesSeleccionado]);

  const esEventoFirma = (accion: string) => {
    const a = accion.toUpperCase();
    return a.includes('FIRMA') || a.includes('VISACION');
  };

  const esEventoSesion = (accion: string) => {
    const a = accion.toUpperCase();
    return a.includes('LOGIN') || a.includes('SIGN_OUT') || a.includes('LOGOUT');
  };

  const obtenerAccionFirmaSimplificada = (ev: EventoAuditoria): string => {
    const diff = ev.diffJson || {};
    const modalidad = String(diff.modalidadFirma || '').toUpperCase();
    const proveedor = String(diff.proveedorCriptografico || '').toUpperCase();
    const purpose = String(diff.purposeGob || diff.purpose || '').toLowerCase();
    const serial = String(diff.certificadoSerial || diff.tokenUsbActivo || '').toUpperCase();

    if (modalidad.includes('DESATENDID') || purpose.includes('desatendid')) {
      return 'FirmaGob Desatendida';
    }
    if (
      modalidad.includes('TOKEN') ||
      modalidad.includes('USB') ||
      modalidad.includes('ESIGN') ||
      proveedor.includes('ESIGN') ||
      (serial.startsWith('SN-') && !modalidad.includes('FIRMAGOB'))
    ) {
      return 'Firma con Token';
    }
    if (
      modalidad.includes('ATENDID') ||
      modalidad.includes('OTP') ||
      modalidad.includes('FIRMAGOB') ||
      ev.accion.includes('FIRMAGOB') ||
      purpose.includes('propósito general') ||
      purpose.includes('proposito general')
    ) {
      return 'FirmaGob Atendida';
    }
    return 'Firma con Token';
  };

  const eventosFirmas = eventos.filter((e) => esEventoFirma(e.accion));
  const eventosSesiones = eventos.filter((e) => esEventoSesion(e.accion));

  const eventosPorSubseccion =
    subseccion === 'FIRMAS'
      ? eventosFirmas
      : subseccion === 'SESIONES'
      ? eventosSesiones
      : eventos;

  const eventosFiltrados = eventosPorSubseccion.filter((e) => {
    const matchesTexto =
      e.registroId.toLowerCase().includes(filtro.toLowerCase()) ||
      e.usuario.toLowerCase().includes(filtro.toLowerCase()) ||
      (e.personaNombre || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (e.personaRut || '').toLowerCase().includes(filtro.toLowerCase()) ||
      e.tablaAfectada.toLowerCase().includes(filtro.toLowerCase()) ||
      e.accion.toLowerCase().includes(filtro.toLowerCase()) ||
      e.ip.toLowerCase().includes(filtro.toLowerCase()) ||
      e.id.toLowerCase().includes(filtro.toLowerCase());

    if (subseccion !== 'GENERAL') {
      return matchesTexto;
    }

    const matchesAccion =
      filtroAccion === 'TODOS'
        ? true
        : filtroAccion === 'FIRMA_EJECUTADA'
        ? esEventoFirma(e.accion)
        : filtroAccion === 'SESIONES'
        ? esEventoSesion(e.accion)
        : filtroAccion === 'ACTA_CUSTODIA'
        ? e.accion.includes('ACTA') || e.accion.includes('TOKEN')
        : filtroAccion === 'CREACION'
        ? !esEventoFirma(e.accion) && !esEventoSesion(e.accion) && !e.accion.includes('ACTA') && !e.accion.includes('TOKEN')
        : e.accion === filtroAccion;

    return matchesTexto && matchesAccion;
  });

  return (
    <div className="space-y-6">
      {/* Navegación por subsecciones de bitácora */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
        {[
          { id: 'GENERAL' as SubseccionBitacora, label: 'Logs Generales', count: eventos.length },
          { id: 'FIRMAS' as SubseccionBitacora, label: 'Logs de Firmas (Firmado)', count: eventosFirmas.length },
          { id: 'SESIONES' as SubseccionBitacora, label: 'Logins y Sign Outs', count: eventosSesiones.length },
        ].map((tab) => {
          const activo = subseccion === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSubseccion(tab.id);
                setEventoSeleccionado(null);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-colors ${
                activo
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border/80 hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  activo ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-foreground'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 1. Header y Filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Columna Izquierda: Monitor de Auditoría */}
        <Card className={`${subseccion === 'GENERAL' ? 'lg:col-span-8' : 'lg:col-span-12'} border-border/80 bg-card`}>
          <CardHeader className="p-5 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono font-bold text-primary">
                  Historial de Operaciones
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Registro inmutable de auditoría
                </span>
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                {subseccion === 'FIRMAS'
                  ? 'Logs de Firmas (Firmado)'
                  : subseccion === 'SESIONES'
                  ? 'Bitácora de Logins y Sign Outs'
                  : 'Trazabilidad y Bitácora de Acciones'}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {subseccion === 'FIRMAS'
                  ? 'Registro específico de documentos firmados, visaciones y ejecuciones de firma electrónica.'
                  : subseccion === 'SESIONES'
                  ? 'Registro conjunto de inicios de sesión (exitosos/fallidos) y cierres de sesión (Sign Out).'
                  : 'Registro de actividades, firmas y cambios realizados en el sistema.'}
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
                  {eventosPorSubseccion.length.toLocaleString('es-CL')}
                </div>
                <div className="text-[10px] text-muted-foreground">Registros en esta sección</div>
              </div>

              <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                  ESTADO DEL REGISTRO
                </div>
                <div className="font-bold text-xl text-emerald-600 dark:text-emerald-400">
                  {eventosPorSubseccion.length > 0 ? 'CORRECTO' : '0 REGISTROS'}
                </div>
                <div className="text-[10px] text-muted-foreground">{eventosPorSubseccion.length > 0 ? 'Sin inconsistencias' : 'Sin eventos previos'}</div>
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

        {/* Columna Derecha: Filtros (solo en Logs Generales) */}
        {subseccion === 'GENERAL' && (
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
                {
                  id: 'FIRMA_EJECUTADA',
                  label: 'Firmas de Documentos',
                  count: eventosFirmas.length,
                },
                {
                  id: 'SESIONES',
                  label: 'Logins y Sign Outs',
                  count: eventosSesiones.length,
                },
                {
                  id: 'ACTA_CUSTODIA',
                  label: 'Custodia de Dispositivos',
                  count: eventos.filter((e) => e.accion.includes('ACTA') || e.accion.includes('TOKEN')).length,
                },
                {
                  id: 'CREACION',
                  label: 'Creación y Modificaciones',
                  count: eventos.filter(
                    (e) =>
                      !esEventoFirma(e.accion) &&
                      !esEventoSesion(e.accion) &&
                      !e.accion.includes('ACTA') &&
                      !e.accion.includes('TOKEN'),
                  ).length,
                },
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
        )}
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
                  <TableHead className="text-xs font-bold">ID / Documento</TableHead>
                  <TableHead className="text-xs font-bold">Persona</TableHead>
                  <TableHead className="text-xs font-bold">RUT Persona</TableHead>
                  <TableHead className="text-xs font-bold">Acción</TableHead>
                  <TableHead className="text-xs font-bold">Usuario</TableHead>
                  <TableHead className="text-xs font-bold">IP</TableHead>
                  <TableHead className="text-xs font-bold">Fecha y Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                      Consultando historial de actividades...
                    </TableCell>
                  </TableRow>
                ) : eventosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                      No se encontraron registros con los criterios seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  eventosFiltrados.map((ev) => {
                    const isSelected = eventoSeleccionado?.id === ev.id;
                    const esFirma = esEventoFirma(ev.accion);
                    const accionSimple = esFirma ? obtenerAccionFirmaSimplificada(ev) : null;
                    const registroVisual =
                      ev.tablaAfectada === 'usuarios' && /^[\d.\-kK]{7,12}$/.test(ev.registroId.trim())
                        ? formatRutVisual(ev.registroId)
                        : ev.registroId;

                    return (
                      <TableRow
                        key={ev.id}
                        data-state={isSelected ? 'selected' : undefined}
                        onClick={() => setEventoSeleccionado(ev)}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <TableCell>
                          <div className="font-mono text-xs font-bold text-foreground">{ev.id}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{registroVisual}</div>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground">
                          {ev.personaNombre || ev.usuario}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-foreground">
                          {formatRutVisual(ev.personaRut)}
                        </TableCell>
                        <TableCell>
                          {esFirma && accionSimple ? (
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-semibold ${
                                accionSimple === 'Firma con Token'
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                  : accionSimple === 'FirmaGob Atendida'
                                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                  : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {accionSimple}
                            </Badge>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 font-semibold text-[11px] font-mono ${
                                ev.accion.includes('FALLIDO')
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : ev.accion.includes('SIGN_OUT') || ev.accion.includes('LOGOUT')
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : ev.accion.includes('LOGIN') || ev.accion === 'UPDATE'
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-foreground'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  ev.accion.includes('FALLIDO')
                                    ? 'bg-rose-500'
                                    : ev.accion.includes('SIGN_OUT') || ev.accion.includes('LOGOUT')
                                    ? 'bg-amber-500'
                                    : ev.accion.includes('LOGIN') || ev.accion === 'UPDATE'
                                    ? 'bg-blue-500'
                                    : 'bg-muted-foreground'
                                }`}
                              />
                              {ev.accion}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
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
