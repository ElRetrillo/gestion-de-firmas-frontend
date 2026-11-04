import React, { useState } from 'react';
import { useTelemetriaStore, EstadoHardwareType } from '../store/useTelemetriaStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { MetricasTrazabilidadPanel } from './MetricasTrazabilidadPanel';

export const DashboardSupervisores: React.FC = () => {
  const { estaciones, historialEventos, wsConectado, cargarEstaciones, limpiarMalla } = useTelemetriaStore();
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  // Estadísticas operacionales
  const total = estaciones.length;
  const desconectados = estaciones.filter((e) => e.estadoEnVivo === 'DESCONECTADO').length;
  const conectados = estaciones.filter((e) => e.estadoEnVivo === 'CONECTADO').length;
  const firmando = estaciones.filter((e) => e.estadoEnVivo === 'FIRMANDO').length;
  const porcentajeActivos = total > 0 ? Math.round(((conectados + firmando) / total) * 100) : 0;

  // Filtrado de estaciones
  const estacionesFiltradas = estaciones.filter((est) => {
    const coincideTexto =
      est.codigoPc.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      est.dependenciaFisica.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      (est.tokenInfo?.serialNumber && est.tokenInfo.serialNumber.toLowerCase().includes(filtroTexto.toLowerCase()));

    const coincideEstado = filtroEstado === 'TODOS' || est.estadoEnVivo === filtroEstado;

    return coincideTexto && coincideEstado;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header de Estado de Telemetría Dinámico */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-xs shadow-xs">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                ESTADO DE DISPOSITIVOS Y EQUIPOS
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Supervisa en tiempo real de equipos municipales y dispositivos de firma conectados.
            </p>
          </div>

          {/* Ratio de Operatividad y Descarga de Agente en 1 Clic */}
          <div className="flex items-center space-x-4 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-5 w-full md:w-auto justify-between md:justify-start">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                EQUIPOS ACTIVOS
              </span>
              <span className="text-lg font-bold text-foreground">
                {porcentajeActivos}% <span className="text-xs text-emerald-600 dark:text-emerald-400 font-normal">({conectados + firmando}/{total})</span>
              </span>
            </div>
            <a
              href="/api/v1/telemetria/descargar-agente"
              className="inline-flex items-center justify-center rounded-md border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary px-3 h-8 text-xs font-bold transition-colors"
            >
              Descargar Agente USB
            </a>
          </div>
        </CardContent>
      </Card>

      {/* 2. Tarjetas KPI Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Estaciones */}
        <Card className="hover:border-primary/40 transition-colors overflow-hidden">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-tight flex-1 min-w-0">
                TOTAL EQUIPOS MUNICIPALES
              </span>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground mt-1">
              {total}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-[11px] text-muted-foreground truncate">
              {total > 0
                ? `${conectados + firmando} de ${total} equipo(s) con actividad`
                : 'Equipos registrados'}
            </p>
          </CardContent>
        </Card>

        {/* Conectados (Reposo) */}
        <Card className="border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 transition-colors overflow-hidden">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 leading-tight flex-1 min-w-0">
                DISPOSITIVOS CONECTADOS
              </span>
              <Badge variant="warning" className="text-[10px] shrink-0 font-bold whitespace-nowrap">
                CONECTADO
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
              {conectados}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-[11px] text-muted-foreground truncate">
              Dispositivo listo para firmar
            </p>
          </CardContent>
        </Card>

        {/* Firmando (Activo) */}
        <Card className="border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 transition-colors overflow-hidden">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 leading-tight flex-1 min-w-0">
                FIRMANDO ACTUALMENTE
              </span>
              <Badge variant="success" className="text-[10px] shrink-0 font-bold whitespace-nowrap">
                EN USO
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
              {firmando}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-[11px] text-muted-foreground truncate">
              Firma de documentos en proceso
            </p>
          </CardContent>
        </Card>

        {/* Desconectados (Offline) */}
        <Card className="border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50 transition-colors overflow-hidden">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 leading-tight flex-1 min-w-0">
                DISPOSITIVOS SIN CONECTAR
              </span>
              <Badge variant="danger" className="text-[10px] shrink-0 font-bold whitespace-nowrap">
                DESCONECTADO
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">
              {desconectados}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-[11px] text-muted-foreground truncate">
              Sin dispositivo de firma conectado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2.5. Panel de Métricas de Trazabilidad y Estadísticas (Por Mes / Últimos 30 días) */}
      <MetricasTrazabilidadPanel vistaOrigen="DISPOSITIVOS" />

      {/* 3. Barra de Búsqueda y Filtros */}
      <Card>
        <CardContent className="p-3.5 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-96">
            <Input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por equipo (ej: PC-SECMUN), usuario o serie..."
              className="text-xs h-9"
            />
          </div>

          <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-1">
              FILTRAR:
            </span>
            <Button
              variant={filtroEstado === 'TODOS' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado('TODOS')}
              className="h-8 text-xs"
            >
              Todos ({total})
            </Button>
            <Button
              variant={filtroEstado === 'CONECTADO' ? 'warning' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado('CONECTADO')}
              className="h-8 text-xs"
            >
              Conectados ({conectados})
            </Button>
            <Button
              variant={filtroEstado === 'FIRMANDO' ? 'success' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado('FIRMANDO')}
              className="h-8 text-xs"
            >
              Firmando ({firmando})
            </Button>
            <Button
              variant={filtroEstado === 'DESCONECTADO' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado('DESCONECTADO')}
              className="h-8 text-xs"
            >
              Desconectados ({desconectados})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 4. Grid Principal: Equipos y Eventos en Vivo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Malla de Equipos */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              EQUIPOS REGISTRADOS ({estacionesFiltradas.length})
            </h2>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => cargarEstaciones()}
                className="h-7 px-2 text-[11px]"
                title="Actualizar estado de los equipos"
              >
                ↻ Actualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => limpiarMalla()}
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                title="Limpiar vista de pantalla"
              >
                Limpiar Vista
              </Button>
            </div>
          </div>

          {estacionesFiltradas.length === 0 ? (
            <Card className="p-8 text-center border-dashed bg-card/40">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground">
                  No hay equipos registrados actualmente
                </div>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  No hay equipos reportando actividad en este momento. Los equipos conectados aparecerán aquí automáticamente.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
              {estacionesFiltradas.map((est) => {
                const isConectado = est.estadoEnVivo === 'CONECTADO';
                const isFirmando = est.estadoEnVivo === 'FIRMANDO';
                const isDesconectado = est.estadoEnVivo === 'DESCONECTADO';

                return (
                  <Card
                    key={est.codigoPc}
                    className={`overflow-hidden transition-all hover:shadow-md ${isFirmando
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : isConectado
                        ? 'border-amber-500/40'
                        : 'border-rose-500/30 bg-rose-500/5'
                      }`}
                  >
                    <CardHeader className="p-3.5 sm:p-4 pb-2">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="font-bold text-sm tracking-wide text-foreground truncate">
                              {est.codigoPc}
                            </span>
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">
                              {est.ipAsignada}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate" title={est.dependenciaFisica}>
                            {est.dependenciaFisica}
                          </p>
                        </div>

                        {/* Badge de Estado */}
                        <div className="shrink-0">
                          {isFirmando && (
                            <Badge variant="success" className="text-[10px] font-bold whitespace-nowrap">
                              FIRMANDO
                            </Badge>
                          )}
                          {isConectado && (
                            <Badge variant="warning" className="text-[10px] font-bold whitespace-nowrap">
                              CONECTADO
                            </Badge>
                          )}
                          {isDesconectado && (
                            <Badge variant="danger" className="text-[10px] font-bold whitespace-nowrap">
                              DESCONECTADO
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3.5 sm:p-4 pt-1 text-xs space-y-3 min-w-0">
                      {/* Visualización de Dispositivo */}
                      {!isDesconectado && est.tokenInfo?.serialNumber ? (
                        <div className="bg-muted/40 p-2.5 rounded-md border space-y-1 text-[11px] min-w-0">
                          <div className="flex justify-between items-center gap-2 min-w-0">
                            <span className="text-muted-foreground shrink-0">Dispositivo:</span>
                            <span className="font-semibold text-foreground truncate text-right flex-1" title={`${est.tokenInfo.marca} (${est.tokenInfo.modelo})`}>
                              {est.tokenInfo.marca} ({est.tokenInfo.modelo})
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-2 min-w-0">
                            <span className="text-muted-foreground shrink-0">N° Serie:</span>
                            <span className="text-foreground font-mono truncate text-right flex-1">{est.tokenInfo.serialNumber}</span>
                          </div>
                          <div className="flex justify-between items-center gap-2 min-w-0">
                            <span className="text-muted-foreground shrink-0">Fabricante:</span>
                            <span className="text-muted-foreground text-[10px] truncate text-right flex-1">{est.tokenInfo.vendorId}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-rose-500/5 p-2.5 rounded-md border border-dashed border-rose-500/30 text-rose-600 dark:text-rose-400 text-center italic text-[11px] truncate">
                          [ Sin dispositivo de firma conectado ]
                        </div>
                      )}

                      <Separator />

                      {/* Estado en Vivo y Conexión */}
                      <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-muted-foreground pt-0.5 min-w-0">
                        <span className="text-[10px] truncate min-w-0">
                          Última conexión: {new Date(est.ultimoPing).toLocaleTimeString('es-CL')}
                        </span>

                        <div className="flex items-center space-x-1.5 shrink-0 ml-auto">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded border font-medium whitespace-nowrap ${isFirmando
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : isConectado
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              }`}
                          >
                            {isFirmando
                              ? 'FIRMANDO'
                              : isConectado
                                ? 'CONECTADO'
                                : 'DESCONECTADO'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna Derecha: Actividad Reciente */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              ACTIVIDAD RECIENTE
            </h2>
            <Badge variant="outline" className="text-[10px]">
              En vivo
            </Badge>
          </div>

          <Card className="max-h-[620px] overflow-y-auto border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b bg-muted/20">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  REGISTRO DE EVENTOS
                </CardTitle>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {historialEventos.length} EVENTOS
                </span>
              </div>
              <CardDescription className="text-[11px]">
                Registro de conexiones y desconexiones en tiempo real
              </CardDescription>
            </CardHeader>

            <CardContent className="p-3 divide-y divide-border">
              {historialEventos.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  [ Esperando actividad de dispositivos ]
                </p>
              ) : (
                historialEventos.map((log) => (
                  <div key={log.id} className="py-2.5 first:pt-0 last:pb-0 text-xs flex items-start space-x-2.5">
                    <div className="mt-1">
                      <span
                        className={`w-2 h-2 rounded-full inline-block ${log.estado === 'FIRMANDO'
                          ? 'bg-emerald-500'
                          : log.estado === 'CONECTADO'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                          }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 min-w-0">
                        <span className="font-bold text-foreground font-mono truncate flex-1 min-w-0">{log.codigoPc}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono shrink-0">
                          {log.fecha && <span>{log.fecha}</span>}
                          <span>{log.timestamp}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Estado:{' '}
                        <span
                          className={`font-semibold ${log.estado === 'FIRMANDO'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : log.estado === 'CONECTADO'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                            }`}
                        >
                          {log.estado}
                        </span>
                        {log.serialNumber &&
                          (log.estado === 'DESCONECTADO'
                            ? ` • Extraído: ${log.serialNumber}`
                            : ` • SN: ${log.serialNumber}`)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>

            <CardFooter className="p-3 border-t bg-muted/10 text-[10px] text-muted-foreground flex items-center justify-between gap-2 flex-wrap">
              <span>Canal de comunicación seguro</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">● Conexión activa</span>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};
