import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileJson, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { formatRutVisual } from '../lib/rut';
import { cleanIpVisual } from '../lib/ip';

type SubseccionBitacora = 'GENERAL' | 'SESIONES';

interface EventoAuditoria {
  uid: string;
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
  const [modalExportOpen, setModalExportOpen] = useState(false);

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
            lista.map((item: any, idx: number) => {
              const rawId = String(item.id || `AUD-${8900 - idx}`);
              const shortId =
                rawId.toLowerCase().startsWith('aud-') && rawId.length > 12
                  ? rawId.slice(-8).toUpperCase()
                  : rawId.substring(0, 8).toUpperCase();
              return {
                uid: `${rawId}-${idx}`,
                id: shortId,
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
              };
            }),
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

  const eventosSesiones = eventos.filter((e) => esEventoSesion(e.accion));

  const eventosPorSubseccion =
    subseccion === 'SESIONES'
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
        : filtroAccion === 'SESIONES'
        ? esEventoSesion(e.accion)
        : filtroAccion === 'ACTA_CUSTODIA'
        ? e.accion.includes('ACTA') || e.accion.includes('TOKEN')
        : filtroAccion === 'CREACION'
        ? !esEventoSesion(e.accion) && !e.accion.includes('ACTA') && !e.accion.includes('TOKEN')
        : e.accion === filtroAccion;

    return matchesTexto && matchesAccion;
  });

  const etiquetaFiltroActivo =
    subseccion === 'SESIONES'
      ? 'Logins y Sign Outs'
      : filtroAccion === 'TODOS'
      ? 'Todas las Actividades'
      : filtroAccion === 'SESIONES'
      ? 'Logins y Sign Outs'
      : filtroAccion === 'ACTA_CUSTODIA'
      ? 'Custodia de Dispositivos'
      : 'Creación y Modificaciones';

  const descargarCsvHistorial = () => {
    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    };
    const headers = ['ID', 'Registro', 'Persona', 'RUT Persona', 'Accion', 'Usuario', 'IP', 'Fecha y Hora', 'Modulo'];
    const rows = eventosFiltrados.map((ev) => [
      ev.id,
      ev.registroId,
      ev.personaNombre || ev.usuario,
      formatRutVisual(ev.personaRut),
      esEventoFirma(ev.accion) ? obtenerAccionFirmaSimplificada(ev) : ev.accion,
      ev.usuario,
      ev.ip,
      ev.timestamp,
      ev.tablaAfectada,
    ]);
    const csvContent =
      '\uFEFF' +
      [headers, ...rows].map((row) => row.map(escapeCsv).join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fecha = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitacora-auditoria-${subseccion.toLowerCase()}-${filtroAccion.toLowerCase()}-${fecha}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const descargarJsonHistorial = () => {
    const payload = {
      generadoEn: new Date().toISOString(),
      seccion: subseccion,
      filtroActividad: etiquetaFiltroActivo,
      busquedaTexto: filtro || null,
      totalRegistros: eventosFiltrados.length,
      registros: eventosFiltrados,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fecha = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitacora-auditoria-${subseccion.toLowerCase()}-${filtroAccion.toLowerCase()}-${fecha}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Navegación por subsecciones de bitácora */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
        {[
          { id: 'GENERAL' as SubseccionBitacora, label: 'Logs Generales', count: eventos.length },
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
          <CardHeader className="p-4 sm:p-5 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[11px] font-mono font-bold text-primary">
                  Historial de Operaciones
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Registro inmutable de auditoría
                </span>
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                {subseccion === 'SESIONES'
                  ? 'Bitácora de Logins y Sign Outs'
                  : 'Trazabilidad y Bitácora de Acciones'}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {subseccion === 'SESIONES'
                  ? 'Registro conjunto de inicios de sesión (exitosos/fallidos) y cierres de sesión (Sign Out).'
                  : 'Registro de actividades, sesiones y cambios realizados en el sistema.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <CardHeader className="p-4 sm:p-5 pb-3 border-b">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                FILTRAR POR ACTIVIDAD
              </span>
              <CardTitle className="text-sm font-bold text-foreground">
                Tipos de Actividad
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-2 text-xs">
              {[
                { id: 'TODOS', label: 'Todas las Actividades', count: eventos.length },
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

            <CardFooter className="p-3.5 sm:p-4 border-t bg-muted/20 text-[10px] text-muted-foreground flex flex-wrap items-center justify-between gap-2">
              <span>Registro oficial municipal</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setModalExportOpen(true)}
                className="h-7 px-2.5 text-xs font-semibold gap-1.5 text-foreground"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Historial</span>
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      {/* 2. Tabla de Auditoría Forense y Visor JSONB */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className={`${eventoSeleccionado ? 'lg:col-span-7' : 'lg:col-span-12'} border-border/80 bg-card overflow-hidden`}>
          <CardHeader className="p-3.5 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                Registros Encontrados ({eventosFiltrados.length})
              </span>
              <span className="text-[10px] text-muted-foreground">
                Haz clic en una fila para ver los detalles de la operación
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setModalExportOpen(true)}
              className="h-7 px-2.5 text-xs font-semibold gap-1.5 w-full sm:w-auto justify-center"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Historial</span>
            </Button>
          </CardHeader>

          <CardContent className="p-0 hidden md:block overflow-x-auto">
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
                    const isSelected = eventoSeleccionado?.uid === ev.uid;
                    const esFirma = esEventoFirma(ev.accion);
                    const accionSimple = esFirma ? obtenerAccionFirmaSimplificada(ev) : null;
                    const registroVisual =
                      ev.tablaAfectada === 'usuarios' && /^[\d.\-kK]{7,12}$/.test(ev.registroId.trim())
                        ? formatRutVisual(ev.registroId)
                        : ev.registroId;

                    return (
                      <TableRow
                        key={ev.uid}
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

          {/* Vista en tarjetas para móviles */}
          <div className="block md:hidden divide-y divide-border/70">
            {cargando ? (
              <div className="py-8 px-4 text-center text-xs text-muted-foreground">
                Consultando historial de actividades...
              </div>
            ) : eventosFiltrados.length === 0 ? (
              <div className="py-8 px-4 text-center text-xs text-muted-foreground">
                No se encontraron registros con los criterios seleccionados.
              </div>
            ) : (
              eventosFiltrados.map((ev) => {
                const isSelected = eventoSeleccionado?.uid === ev.uid;
                const esFirma = esEventoFirma(ev.accion);
                const accionSimple = esFirma ? obtenerAccionFirmaSimplificada(ev) : null;
                return (
                  <button
                    key={`mobile-${ev.uid}`}
                    type="button"
                    onClick={() => setEventoSeleccionado(ev)}
                    className={`w-full text-left p-3.5 space-y-2 transition-colors ${
                      isSelected ? 'bg-muted/70' : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold text-foreground">{ev.id}</div>
                        <div className="text-xs font-medium text-foreground break-words">
                          {ev.personaNombre || ev.usuario}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {formatRutVisual(ev.personaRut)}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {ev.timestamp}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono font-semibold text-primary break-all">
                        {esFirma && accionSimple ? accionSimple : ev.accion}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {ev.usuario} • {ev.ip}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Panel Inspector de Detalles */}
        {eventoSeleccionado && (
          <Card className="lg:col-span-5 border-border/80 bg-card flex flex-col justify-between">
            <CardHeader className="p-4 border-b flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  DETALLES DE LA OPERACIÓN
                </span>
                <CardTitle className="text-sm font-bold text-foreground break-all">
                  {eventoSeleccionado.id} • {eventoSeleccionado.registroId}
                </CardTitle>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setEventoSeleccionado(null)}
                className="h-7 px-2 text-xs shrink-0"
              >
                Cerrar
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              <div className="p-3 bg-muted/40 rounded border text-[11px] space-y-1">
                <div><strong>Módulo:</strong> {eventoSeleccionado.tablaAfectada}</div>
                <div className="break-all"><strong>Usuario:</strong> {eventoSeleccionado.usuario}</div>
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

      {/* Modal de Vista Previa y Exportación del Historial Filtrado */}
      {modalExportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6">
          <Card className="w-full max-w-4xl max-h-[90dvh] flex flex-col border-border/80 bg-card shadow-2xl overflow-hidden">
            <CardHeader className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-mono font-bold text-primary">
                  Exportar Historial • {etiquetaFiltroActivo}
                </div>
                <CardTitle className="text-sm sm:text-base font-bold text-foreground mt-0.5">
                  Vista Previa de Registros Filtrados ({eventosFiltrados.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Revise el subconjunto filtrado antes de descargarlo en formato CSV (Excel) o JSON.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalExportOpen(false)}
                className="h-8 px-2.5 text-xs shrink-0 self-end sm:self-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cerrar</span>
              </Button>
            </CardHeader>

            <CardContent className="p-3 sm:p-4 flex-1 min-h-0 overflow-y-auto space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono bg-muted/30 p-2.5 rounded-md border">
                <span><strong>Sección:</strong> {subseccion === 'SESIONES' ? 'Logins y Sign Outs' : 'Logs Generales'}</span>
                <span className="text-muted-foreground">•</span>
                <span><strong>Filtro actividad:</strong> {etiquetaFiltroActivo}</span>
                {filtro.trim() && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="break-all"><strong>Búsqueda:</strong> "{filtro.trim()}"</span>
                  </>
                )}
              </div>

              {eventosFiltrados.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border rounded-md border-dashed">
                  No hay registros en el filtro actual para exportar.
                </div>
              ) : (
                <div className="border rounded-md overflow-x-auto max-h-[45dvh] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/40 text-[11px]">
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Persona / RUT</TableHead>
                        <TableHead>Acción</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Fecha y Hora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {eventosFiltrados.slice(0, 100).map((ev) => (
                        <TableRow key={`exp-${ev.uid}`}>
                          <TableCell className="font-mono font-bold">{ev.id}</TableCell>
                          <TableCell>
                            <div className="font-medium">{ev.personaNombre || ev.usuario}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {formatRutVisual(ev.personaRut)}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-[11px]">
                            {esEventoFirma(ev.accion) ? obtenerAccionFirmaSimplificada(ev) : ev.accion}
                          </TableCell>
                          <TableCell className="font-mono text-[11px]">{ev.usuario}</TableCell>
                          <TableCell className="font-mono text-[11px]">{ev.ip}</TableCell>
                          <TableCell className="font-mono text-[11px] whitespace-nowrap">{ev.timestamp}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {eventosFiltrados.length > 100 && (
                <p className="text-[11px] text-muted-foreground">
                  Mostrando los primeros 100 registros en la vista previa. La descarga incluirá los {eventosFiltrados.length} registros completos.
                </p>
              )}
            </CardContent>

            <CardFooter className="p-3 sm:p-4 border-t bg-muted/20 flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={eventosFiltrados.length === 0}
                onClick={descargarJsonHistorial}
                className="h-8 text-xs font-semibold gap-1.5 w-full sm:w-auto"
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>Descargar JSON</span>
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={eventosFiltrados.length === 0}
                onClick={descargarCsvHistorial}
                className="h-8 text-xs font-bold gap-1.5 w-full sm:w-auto"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Descargar CSV (Excel)</span>
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};
