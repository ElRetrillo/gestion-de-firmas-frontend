import React, { useEffect, useState } from 'react';
import { useTelemetriaStore, MetricasTrazabilidadResponse } from '../store/useTelemetriaStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';

interface MetricasTrazabilidadPanelProps {
  vistaOrigen?: 'DISPOSITIVOS' | 'CUSTODIA' | 'AUDITORIA';
  compacto?: boolean;
}

export const MetricasTrazabilidadPanel: React.FC<MetricasTrazabilidadPanelProps> = ({
  vistaOrigen = 'DISPOSITIVOS',
  compacto = false,
}) => {
  const {
    metricas,
    cargandoMetricas,
    modoReporte,
    mesSeleccionado,
    cargarMetricas,
    setPeriodoReporte,
  } = useTelemetriaStore();

  const [tabTrazabilidad, setTabTrazabilidad] = useState<'DISPOSITIVOS' | 'ESTACIONES' | 'EVOLUCION'>(
    vistaOrigen === 'CUSTODIA' ? 'DISPOSITIVOS' : 'ESTACIONES',
  );

  useEffect(() => {
    if (!metricas) {
      cargarMetricas();
    }
  }, [metricas, cargarMetricas]);

  const handleExportarCsv = () => {
    if (!metricas) return;

    const m: MetricasTrazabilidadResponse = metricas;
    const filas: string[][] = [];

    filas.push(['REPORTE OFICIAL DE METRICAS DE TRAZABILIDAD Y ESTADISTICAS - I. MUNICIPALIDAD DE COQUIMBO']);
    filas.push(['Periodo Evaluado', m.periodo.etiquetaPeriodo]);
    filas.push(['Modalidad', m.periodo.modo === 'POR_MES' ? `Por Mes (${m.periodo.mesSeleccionado})` : 'Ultimos 30 dias']);
    filas.push(['Fecha Inicio', m.periodo.fechaInicio]);
    filas.push(['Fecha Fin', m.periodo.fechaFin]);
    filas.push([]);

    filas.push(['1. INDICADORES Y PORCENTAJES DE DISPOSITIVOS Y TELEMETRIA USB']);
    filas.push(['Indicador', 'Valor', 'Porcentaje / Detalle']);
    filas.push(['Total Equipos Municipales', String(m.telemetria.totalEstaciones), `${m.telemetria.porcentajeDisponibilidad}% Disponibilidad Activa`]);
    filas.push(['Equipos Conectados / Firmando', String(m.telemetria.estacionesConectadas), `Firmando en vivo: ${m.telemetria.estacionesFirmando}`]);
    filas.push(['Equipos Desconectados', String(m.telemetria.estacionesDesconectadas), `${Math.max(0, 100 - m.telemetria.porcentajeDisponibilidad).toFixed(1)}% Offline`]);
    filas.push(['Tokens USB Registrados', String(m.telemetria.tokensRegistrados), `${m.telemetria.porcentajeTokensOperativos}% Operativos (${m.telemetria.tokensOperativos})`]);
    filas.push(['Total Eventos Telemetria en Periodo', String(m.telemetria.totalEventosPeriodo), '100%']);
    filas.push(['Eventos CONECTADO', String(m.telemetria.eventosConectado), `${m.telemetria.porcentajeEventosConectado}%`]);
    filas.push(['Eventos FIRMANDO', String(m.telemetria.eventosFirmando), `${m.telemetria.porcentajeEventosFirmando}%`]);
    filas.push(['Eventos DESCONECTADO', String(m.telemetria.eventosDesconectado), `${m.telemetria.porcentajeEventosDesconectado}%`]);
    filas.push([]);

    filas.push(['2. EFECTIVIDAD DE FIRMA Y CUMPLIMIENTO ADMINISTRATIVO']);
    filas.push(['Solicitudes de Firma en Periodo', String(m.firmas.totalSolicitudesPeriodo), `${m.firmas.tasaExitoFirmaPct}% Tasa de Exito`]);
    filas.push(['Documentos Firmados', String(m.firmas.firmadas), `${m.firmas.tasaExitoFirmaPct}%`]);
    filas.push(['Documentos Pendientes', String(m.firmas.pendientes), `${m.firmas.tasaPendientesPct}%`]);
    filas.push(['Documentos Rechazados', String(m.firmas.rechazadas), `${m.firmas.tasaRechazoPct}%`]);
    filas.push(['Cumplimiento Fe Publica', String(m.firmas.fePublicaOtorgada), `${m.firmas.porcentajeFePublica}% Otorgada`]);
    filas.push(['Certificados Vigentes', `${m.administracion.certificadosVigentes}/${m.administracion.totalCertificados}`, `${m.administracion.porcentajeVigenciaCertificados}% Vigencia`]);
    filas.push(['Custodia Token Fisico vs Cloud', `Token: ${m.administracion.custodiaTokenFisico} / Cloud: ${m.administracion.custodiaCloud}`, `${m.administracion.porcentajeTokenFisico}% Token Fisico`]);
    filas.push(['Actas de Custodia en Periodo', String(m.administracion.actasPeriodo), `Entrega: ${m.administracion.actasPorTipo.ENTREGA} | Devolucion: ${m.administracion.actasPorTipo.DEVOLUCION} | Traspaso: ${m.administracion.actasPorTipo.TRASPASO} | Baja: ${m.administracion.actasPorTipo.BAJA}`]);
    filas.push([]);

    filas.push(['3. TRAZABILIDAD POR DISPOSITIVO CRIPTOGRAFICO (TOKEN USB)']);
    filas.push(['N Serie', 'Marca / Modelo', 'Estado Patrimonial', 'Funcionario Asignado', 'RUT', 'Unidad', 'Estacion Actual', 'Estado en Vivo', 'Eventos Periodo', 'Conexiones', 'Firmas', 'Desconexiones', '% Uso Periodo']);
    for (const dev of m.telemetria.trazabilidadDispositivos || []) {
      filas.push([
        dev.serialNumber,
        `${dev.marca} ${dev.modelo}`,
        dev.estadoPatrimonial,
        dev.funcionarioAsignado?.nombre || 'Sin asignar',
        dev.funcionarioAsignado?.rut || '-',
        dev.funcionarioAsignado?.unidad || '-',
        dev.estacionActual || '-',
        dev.estadoEnVivo,
        String(dev.totalEventosPeriodo),
        String(dev.conexionesPeriodo),
        String(dev.firmasPeriodo),
        String(dev.desconexionesPeriodo),
        `${dev.porcentajeUsoPeriodo}%`,
      ]);
    }
    filas.push([]);

    filas.push(['4. TRAZABILIDAD POR ESTACION DE TRABAJO']);
    filas.push(['Codigo PC', 'Dependencia Fisica', 'IP Asignada', 'Estado Actual', 'Token Activo', 'Total Eventos', 'Conexiones', 'Firmas', 'Desconexiones', '% Actividad', '% Tasa Exito Conexion']);
    for (const est of m.telemetria.rankingEstaciones || []) {
      filas.push([
        est.codigoPc,
        est.dependenciaFisica,
        est.ipAsignada,
        est.estadoActual,
        est.serialTokenActivo || '-',
        String(est.totalEventos),
        String(est.conexiones),
        String(est.firmas),
        String(est.desconexiones),
        `${est.porcentajeActividad}%`,
        `${est.tasaExitoConexion}%`,
      ]);
    }
    filas.push([]);

    filas.push(['5. SERIE TEMPORAL DIARIA DEL PERIODO']);
    filas.push(['Fecha', 'Etiqueta', 'Eventos Telemetria', 'Conexiones USB', 'Firmas Realizadas', 'Operaciones Auditoria', 'Total Actividad']);
    for (const dia of m.serieTemporal || []) {
      filas.push([
        dia.fecha,
        dia.etiqueta,
        String(dia.eventosTelemetria),
        String(dia.conexionesUsb),
        String(dia.firmasRealizadas),
        String(dia.operacionesAuditoria),
        String(dia.totalActividad),
      ]);
    }

    const csvContent =
      '\uFEFF' +
      filas
        .map((row) =>
          row
            .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
            .join(';'),
        )
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const sufijo = m.periodo.modo === 'POR_MES' ? m.periodo.mesSeleccionado : 'ultimos-30-dias';
    a.href = url;
    a.download = `Reporte-Trazabilidad-Dispositivos-${sufijo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const mesesDisponibles = metricas?.periodo?.mesesDisponibles || [];
  const etiquetaPeriodo = metricas?.periodo?.etiquetaPeriodo || (modoReporte === 'POR_MES' ? mesSeleccionado : 'Últimos 30 días');

  const tel = metricas?.telemetria;
  const fir = metricas?.firmas;
  const adm = metricas?.administracion;
  const serie = metricas?.serieTemporal || [];
  const maxActividadDia = Math.max(1, ...serie.map((d) => d.totalActividad));

  return (
    <Card className="border-primary/30 bg-card/90 shadow-sm overflow-hidden">
      {/* Cabecera con Selector de Modo de Reporte ("Últimos 30 días" / "Por Mes") y Exportación CSV */}
      <CardHeader className="p-4 border-b bg-muted/20 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary bg-primary/5">
              TRAZABILIDAD Y ESTADÍSTICAS
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-mono">
              Período: {etiquetaPeriodo}
            </Badge>
            {cargandoMetricas && (
              <span className="text-[10px] text-muted-foreground font-mono animate-pulse">
                Actualizando métricas...
              </span>
            )}
          </div>
          <CardTitle className="text-sm sm:text-base font-bold text-foreground pt-1">
            Panel de Métricas de Trazabilidad y Rendimiento de Dispositivos
          </CardTitle>
          <CardDescription className="text-xs">
            Estadísticas porcentuales de disponibilidad de hardware USB, custodia patrimonial, efectividad de firma y auditoría.
          </CardDescription>
        </div>

        {/* Controles de Período y Exportación */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex items-center rounded-lg border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setPeriodoReporte('ULTIMOS_30_DIAS')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                modoReporte === 'ULTIMOS_30_DIAS'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Últimos 30 días
            </button>
            <button
              type="button"
              onClick={() => setPeriodoReporte('POR_MES', mesSeleccionado)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                modoReporte === 'POR_MES'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Por Mes
            </button>
          </div>

          {modoReporte === 'POR_MES' && (
            <select
              value={mesSeleccionado}
              onChange={(e) => setPeriodoReporte('POR_MES', e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-mono text-foreground"
              title="Seleccionar mes de reporte"
            >
              {mesesDisponibles.length > 0 ? (
                mesesDisponibles.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.etiqueta}
                  </option>
                ))
              ) : (
                <option value={mesSeleccionado}>{mesSeleccionado}</option>
              )}
            </select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarMetricas()}
            disabled={cargandoMetricas}
            className="h-8 px-2.5 text-xs"
            title="Recalcular métricas en tiempo real"
          >
            ↻
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExportarCsv}
            disabled={!metricas}
            className="h-8 px-3 text-xs font-bold"
          >
            📥 Exportar CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-5">
        {/* 1. Fila de Indicadores Porcentuales Clave */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Disponibilidad de Equipos y Tokens */}
          <div className="p-3.5 rounded-lg border bg-background/70 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
              <span>Disponibilidad Equipos</span>
              <Badge variant="success" className="text-[10px] font-mono">
                {tel?.porcentajeDisponibilidad ?? 0}%
              </Badge>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-foreground">
                {tel?.estacionesConectadas ?? 0}/{tel?.totalEstaciones ?? 0}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                Tokens op.: {tel?.porcentajeTokensOperativos ?? 0}% ({tel?.tokensOperativos ?? 0}/{tel?.tokensRegistrados ?? 0})
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(100, tel?.porcentajeDisponibilidad ?? 0)}%` }}
              />
            </div>
          </div>

          {/* Distribución Porcentual de Eventos USB */}
          <div className="p-3.5 rounded-lg border bg-background/70 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
              <span>Eventos Telemetría USB</span>
              <span className="font-mono text-xs font-bold text-foreground">
                {tel?.totalEventosPeriodo ?? 0} ev.
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
              <div className="text-amber-600 dark:text-amber-400">
                Con: <strong>{tel?.porcentajeEventosConectado ?? 0}%</strong>
              </div>
              <div className="text-emerald-600 dark:text-emerald-400">
                Firm: <strong>{tel?.porcentajeEventosFirmando ?? 0}%</strong>
              </div>
              <div className="text-rose-600 dark:text-rose-400">
                Desc: <strong>{tel?.porcentajeEventosDesconectado ?? 0}%</strong>
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
              <div
                className="h-full bg-amber-500"
                style={{ width: `${tel?.porcentajeEventosConectado ?? 0}%` }}
                title={`Conectado: ${tel?.eventosConectado ?? 0} (${tel?.porcentajeEventosConectado ?? 0}%)`}
              />
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${tel?.porcentajeEventosFirmando ?? 0}%` }}
                title={`Firmando: ${tel?.eventosFirmando ?? 0} (${tel?.porcentajeEventosFirmando ?? 0}%)`}
              />
              <div
                className="h-full bg-rose-500"
                style={{ width: `${tel?.porcentajeEventosDesconectado ?? 0}%` }}
                title={`Desconectado: ${tel?.eventosDesconectado ?? 0} (${tel?.porcentajeEventosDesconectado ?? 0}%)`}
              />
            </div>
          </div>

          {/* Efectividad de Firma Documental */}
          <div className="p-3.5 rounded-lg border bg-background/70 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
              <span>Efectividad de Firma</span>
              <Badge variant="info" className="text-[10px] font-mono">
                {fir?.tasaExitoFirmaPct ?? 0}% Éxito
              </Badge>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-foreground">
                {fir?.firmadas ?? 0}/{fir?.totalSolicitudesPeriodo ?? 0}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                Fe Pública: {fir?.porcentajeFePublica ?? 0}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${fir?.tasaExitoFirmaPct ?? 0}%` }}
                title={`Firmadas: ${fir?.firmadas ?? 0} (${fir?.tasaExitoFirmaPct ?? 0}%)`}
              />
              <div
                className="h-full bg-amber-500"
                style={{ width: `${fir?.tasaPendientesPct ?? 0}%` }}
                title={`Pendientes: ${fir?.pendientes ?? 0} (${fir?.tasaPendientesPct ?? 0}%)`}
              />
              <div
                className="h-full bg-rose-500"
                style={{ width: `${fir?.tasaRechazoPct ?? 0}%` }}
                title={`Rechazadas: ${fir?.rechazadas ?? 0} (${fir?.tasaRechazoPct ?? 0}%)`}
              />
            </div>
          </div>

          {/* Custodia Patrimonial y Vigencia de Certificados */}
          <div className="p-3.5 rounded-lg border bg-background/70 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
              <span>Custodia y Vigencia FEA</span>
              <Badge variant="warning" className="text-[10px] font-mono">
                {adm?.porcentajeVigenciaCertificados ?? 0}% Vigentes
              </Badge>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-foreground">
                {adm?.actasPeriodo ?? 0} <span className="text-xs font-normal text-muted-foreground">actas</span>
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                USB: {adm?.porcentajeTokenFisico ?? 0}% • Cloud: {adm?.porcentajeCloud ?? 0}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
              <div
                className="h-full bg-primary"
                style={{ width: `${adm?.porcentajeTokenFisico ?? 0}%` }}
                title={`Custodia Token Físico: ${adm?.custodiaTokenFisico ?? 0} (${adm?.porcentajeTokenFisico ?? 0}%)`}
              />
              <div
                className="h-full bg-blue-400"
                style={{ width: `${adm?.porcentajeCloud ?? 0}%` }}
                title={`Custodia Cloud: ${adm?.custodiaCloud ?? 0} (${adm?.porcentajeCloud ?? 0}%)`}
              />
            </div>
          </div>
        </div>

        {/* 2. Pestañas de Desglose de Trazabilidad (Dispositivos Token, Estaciones PC y Evolución Diaria) */}
        {!compacto && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant={tabTrazabilidad === 'DISPOSITIVOS' ? 'default' : 'outline'}
                  onClick={() => setTabTrazabilidad('DISPOSITIVOS')}
                  className="h-7 text-xs font-bold"
                >
                  Trazabilidad por Dispositivo Token ({tel?.trazabilidadDispositivos?.length ?? 0})
                </Button>
                <Button
                  size="sm"
                  variant={tabTrazabilidad === 'ESTACIONES' ? 'default' : 'outline'}
                  onClick={() => setTabTrazabilidad('ESTACIONES')}
                  className="h-7 text-xs font-bold"
                >
                  Rendimiento por Estación PC ({tel?.rankingEstaciones?.length ?? 0})
                </Button>
                <Button
                  size="sm"
                  variant={tabTrazabilidad === 'EVOLUCION' ? 'default' : 'outline'}
                  onClick={() => setTabTrazabilidad('EVOLUCION')}
                  className="h-7 text-xs font-bold"
                >
                  Evolución Diaria ({serie.length} días)
                </Button>
              </div>

              <div className="text-[11px] font-mono text-muted-foreground">
                Auditoría período: <strong className="text-foreground">{adm?.totalEventosAuditoriaPeriodo ?? 0}</strong> registros •
                Usuarios activos: <strong className="text-foreground">{adm?.porcentajeUsuariosActivos ?? 0}%</strong>
              </div>
            </div>

            {/* Vista A: Trazabilidad por Dispositivo Token USB */}
            {tabTrazabilidad === 'DISPOSITIVOS' && (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/40 text-[11px]">
                    <TableRow>
                      <TableHead>Dispositivo / N° Serie</TableHead>
                      <TableHead>Estado Patrimonial</TableHead>
                      <TableHead>Funcionario Custodio</TableHead>
                      <TableHead>Estación / Estado en Vivo</TableHead>
                      <TableHead>Eventos (Con / Firm / Desc)</TableHead>
                      <TableHead className="w-44">% Uso en Período</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {!tel?.trazabilidadDispositivos || tel.trazabilidadDispositivos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-20 text-center text-xs text-muted-foreground">
                          No hay dispositivos criptográficos registrados para mostrar trazabilidad.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tel.trazabilidadDispositivos.map((dev) => (
                        <TableRow key={dev.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="font-mono font-bold text-foreground">{dev.serialNumber}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {dev.marca} {dev.modelo} • VID: {dev.vendorId}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                dev.estadoPatrimonial === 'OPERATIVO' || dev.estadoPatrimonial === 'ASIGNADO'
                                  ? 'success'
                                  : dev.estadoPatrimonial === 'EN_REVISION'
                                  ? 'warning'
                                  : 'danger'
                              }
                              className="text-[10px] font-mono"
                            >
                              {dev.estadoPatrimonial}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {dev.funcionarioAsignado ? (
                              <div>
                                <div className="font-semibold text-foreground">{dev.funcionarioAsignado.nombre}</div>
                                <div className="text-[10px] font-mono text-muted-foreground">
                                  {dev.funcionarioAsignado.rut} • {dev.funcionarioAsignado.unidad}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">En bodega TICs (Sin asignar)</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant={
                                  dev.estadoEnVivo === 'FIRMANDO'
                                    ? 'success'
                                    : dev.estadoEnVivo === 'CONECTADO'
                                    ? 'warning'
                                    : 'danger'
                                }
                                className="text-[9px] font-mono"
                              >
                                {dev.estadoEnVivo}
                              </Badge>
                              {dev.estacionActual && (
                                <span className="text-[11px] font-mono font-semibold text-foreground">
                                  {dev.estacionActual}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-[11px]">
                            <span className="font-bold text-foreground">{dev.totalEventosPeriodo}</span> total{' '}
                            <span className="text-muted-foreground">
                              ({dev.conexionesPeriodo}C / {dev.firmasPeriodo}F / {dev.desconexionesPeriodo}D)
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono">
                                <span className="font-bold text-foreground">{dev.porcentajeUsoPeriodo}%</span>
                                <span className="text-muted-foreground">
                                  {new Date(dev.ultimaActividad).toLocaleDateString('es-CL')}
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${Math.min(100, dev.porcentajeUsoPeriodo)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Vista B: Trazabilidad por Estación de Trabajo */}
            {tabTrazabilidad === 'ESTACIONES' && (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/40 text-[11px]">
                    <TableRow>
                      <TableHead>Estación (Código PC / IP)</TableHead>
                      <TableHead>Dependencia Física</TableHead>
                      <TableHead>Estado / Token Activo</TableHead>
                      <TableHead>Desglose Eventos</TableHead>
                      <TableHead>% Actividad Período</TableHead>
                      <TableHead>% Tasa Éxito Conexión</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {!tel?.rankingEstaciones || tel.rankingEstaciones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-20 text-center text-xs text-muted-foreground">
                          Sin actividad de estaciones registrada en el período seleccionado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tel.rankingEstaciones.map((est) => (
                        <TableRow key={est.codigoPc} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="font-mono font-bold text-foreground">{est.codigoPc}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">IP: {est.ipAsignada}</div>
                          </TableCell>
                          <TableCell className="text-[11px] text-foreground">{est.dependenciaFisica}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant={
                                  est.estadoActual === 'FIRMANDO'
                                    ? 'success'
                                    : est.estadoActual === 'CONECTADO'
                                    ? 'warning'
                                    : 'danger'
                                }
                                className="text-[9px] font-mono"
                              >
                                {est.estadoActual}
                              </Badge>
                              {est.serialTokenActivo && (
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  SN: {est.serialTokenActivo}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-[11px]">
                            <span className="font-bold">{est.totalEventos}</span> ev.{' '}
                            <span className="text-muted-foreground">
                              ({est.conexiones} Con • {est.firmas} Firm • {est.desconexiones} Desc)
                            </span>
                          </TableCell>
                          <TableCell className="w-40">
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono font-bold">{est.porcentajeActividad}%</span>
                              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-amber-500"
                                  style={{ width: `${Math.min(100, est.porcentajeActividad)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="w-40">
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {est.tasaExitoConexion}%
                              </span>
                              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500"
                                  style={{ width: `${Math.min(100, est.tasaExitoConexion)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Vista C: Evolución Diaria de Actividad (Serie Temporal) */}
            {tabTrazabilidad === 'EVOLUCION' && (
              <div className="p-3.5 rounded-lg border bg-background/50 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">
                    Actividad Diaria Registrada ({etiquetaPeriodo})
                  </span>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Conexiones USB
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Firmas FEA
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Auditoría
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-30 gap-1 items-end h-28 pt-4 px-1 border-b pb-2 overflow-x-auto">
                  {serie.map((dia) => {
                    const alturaPct = dia.totalActividad > 0 ? Math.max(12, Math.round((dia.totalActividad / maxActividadDia) * 100)) : 4;
                    return (
                      <div
                        key={dia.fecha}
                        className="flex flex-col items-center justify-end h-full group min-w-[16px]"
                        title={`${dia.etiqueta} (${dia.fecha})\nTotal: ${dia.totalActividad}\nTelemetría USB: ${dia.eventosTelemetria}\nFirmas: ${dia.firmasRealizadas}\nAuditoría: ${dia.operacionesAuditoria}`}
                      >
                        <div className="text-[8px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mb-0.5">
                          {dia.totalActividad}
                        </div>
                        <div
                          className={`w-full max-w-[14px] rounded-t transition-all ${
                            dia.totalActividad > 0
                              ? 'bg-primary/80 group-hover:bg-primary'
                              : 'bg-muted'
                          }`}
                          style={{ height: `${alturaPct}%` }}
                        />
                        <span className="text-[8px] font-mono text-muted-foreground mt-1 truncate max-w-[26px]">
                          {dia.etiqueta.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
