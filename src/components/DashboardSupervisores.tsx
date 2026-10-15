import React, { useState } from 'react';
import { useTelemetriaStore, EstadoHardwareType } from '../store/useTelemetriaStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';

export const DashboardSupervisores: React.FC = () => {
  const { estaciones, historialEventos, simularEventoHardware, wsConectado } = useTelemetriaStore();
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
      {/* 1. Header de Estado de Telemetría Dinámico (Inspirado en Zig.ai) */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-xs shadow-xs">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  wsConectado ? 'bg-emerald-500 live-indicator' : 'bg-rose-500'
                }`}
              />
              <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
                MALLA DE TELEMETRÍA MUNICIPAL // ANCI-2026
              </span>
              <Badge variant="outline" className="font-mono text-[9px] py-0 h-4">
                WEBSOCKETS V4
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Supervisión en vivo de agentes Ghost App en estaciones de trabajo y custodia de tokens criptográficos USB.
            </p>
          </div>

          {/* Ratio de Operatividad y TTL */}
          <div className="flex items-center space-x-4 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-5 w-full md:w-auto justify-between md:justify-start">
            <div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase block">
                OPERATIVIDAD FÍSICA
              </span>
              <span className="text-lg font-bold font-mono text-foreground">
                {porcentajeActivos}% <span className="text-xs text-emerald-600 dark:text-emerald-400 font-normal">({conectados + firmando}/{total})</span>
              </span>
            </div>
            <Separator orientation="vertical" className="h-8 hidden sm:block" />
            <div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase block">
                TTL REDIS
              </span>
              <span className="text-lg font-bold font-mono text-foreground">
                3600 <span className="text-xs text-muted-foreground font-normal">seg</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Tarjetas KPI Bento (Estructura de tarjetas Shadcn UI con tipografía técnica) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Estaciones */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                ESTACIONES HOST
              </span>
              <Badge variant="outline" className="font-mono text-[9px]">
                WINDOWS GPO
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-foreground mt-1">
              {total}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-[11px] text-muted-foreground">
              100% de agentes en línea reportando ping
            </p>
          </CardContent>
        </Card>

        {/* 🟡 Conectados (Reposo) */}
        <Card className="border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 transition-colors">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                TOKENS EN REPOSO
              </span>
              <Badge variant="warning" className="font-mono text-[9px]">
                USB DETECTED
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-1">
              {conectados}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-[11px] text-muted-foreground">
              Dispositivo validado en espera de visación
            </p>
          </CardContent>
        </Card>

        {/* 🟢 Firmando (Activo) */}
        <Card className="border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 transition-colors">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                PROCESO ACTIVO
              </span>
              <Badge variant="success" className="font-mono text-[9px]">
                FIRMANDO
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1">
              {firmando}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-[11px] text-muted-foreground">
              Operación criptográfica en ejecución
            </p>
          </CardContent>
        </Card>

        {/* 🔴 Desconectados (Offline) */}
        <Card className="border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50 transition-colors">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                SIN DISPOSITIVO
              </span>
              <Badge variant="danger" className="font-mono text-[9px]">
                DISCONNECTED
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-400 mt-1">
              {desconectados}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-[11px] text-muted-foreground">
              Ranura USB libre / Token extraído
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Barra de Búsqueda y Filtros con Estilo Minimalista Shadcn */}
      <Card>
        <CardContent className="p-3.5 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-96">
            <Input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por Hostname (ej: PC-SECMUN), IP, dependencia o serie..."
              className="text-xs h-9 font-mono"
            />
          </div>

          <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground mr-1">
              FILTRAR:
            </span>
            <Button
              variant={filtroEstado === 'TODOS' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado('TODOS')}
              className="h-8 text-xs font-mono"
            >
              Todos ({total})
            </Button>
            <Button
              variant={filtroEstado === 'CONECTADO' ? 'warning' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado('CONECTADO')}
              className="h-8 text-xs font-mono"
            >
              Conectados ({conectados})
            </Button>
            <Button
              variant={filtroEstado === 'FIRMANDO' ? 'success' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado('FIRMANDO')}
              className="h-8 text-xs font-mono"
            >
              Firmando ({firmando})
            </Button>
            <Button
              variant={filtroEstado === 'DESCONECTADO' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado('DESCONECTADO')}
              className="h-8 text-xs font-mono"
            >
              Offline ({desconectados})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 4. Grid Principal Asimétrico: Malla de Estaciones y Terminal de Eventos en Vivo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda (Span 8): Malla de Estaciones */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
              ESTACIONES DETECTADAS ({estacionesFiltradas.length})
            </h2>
            <span className="text-[10px] text-muted-foreground font-mono">
              PROTOCOLO: WEBHID API
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {estacionesFiltradas.map((est) => {
              const isConectado = est.estadoEnVivo === 'CONECTADO';
              const isFirmando = est.estadoEnVivo === 'FIRMANDO';
              const isDesconectado = est.estadoEnVivo === 'DESCONECTADO';

              return (
                <Card
                  key={est.codigoPc}
                  className={`transition-all hover:shadow-md ${
                    isFirmando
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : isConectado
                      ? 'border-amber-500/40'
                      : 'border-border'
                  }`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm tracking-wide text-foreground font-mono">
                            {est.codigoPc}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {est.ipAsignada}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {est.dependenciaFisica}
                        </p>
                      </div>

                      {/* Badge Semafórico Oficial */}
                      <div>
                        {isFirmando && (
                          <Badge variant="success" className="text-[9px] font-mono font-bold">
                            FIRMANDO
                          </Badge>
                        )}
                        {isConectado && (
                          <Badge variant="warning" className="text-[9px] font-mono font-bold">
                            CONECTADO
                          </Badge>
                        )}
                        {isDesconectado && (
                          <Badge variant="danger" className="text-[9px] font-mono font-bold">
                            DESCONECTADO
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 text-xs space-y-3">
                    {/* Visualización de Hardware USB */}
                    {est.tokenInfo?.serialNumber ? (
                      <div className="bg-muted/40 p-2.5 rounded-md border space-y-1 text-[11px] font-mono">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">TOKEN:</span>
                          <span className="font-semibold text-foreground truncate max-w-[160px] text-right">
                            {est.tokenInfo.marca} ({est.tokenInfo.modelo})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SERIE:</span>
                          <span className="text-foreground">{est.tokenInfo.serialNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">VENDOR:</span>
                          <span className="text-muted-foreground text-[10px]">{est.tokenInfo.vendorId}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted/20 p-2.5 rounded-md border border-dashed text-muted-foreground text-center italic text-[11px] font-mono">
                        [ SIN TOKEN INSERTADO EN RANURA ]
                      </div>
                    )}

                    <Separator />

                    {/* Acciones de Simulación y Ping */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span className="font-mono text-[10px]">
                        PING: {new Date(est.ultimoPing).toLocaleTimeString('es-CL')}
                      </span>

                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => simularEventoHardware(est.codigoPc, 'CONECTADO')}
                          className="h-6 px-1.5 text-[10px] font-mono text-amber-600 dark:text-amber-400 font-medium"
                          title="Simular Conexión"
                        >
                          Conectar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => simularEventoHardware(est.codigoPc, 'FIRMANDO')}
                          className="h-6 px-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium"
                          title="Simular Firma Activa"
                        >
                          Firmar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => simularEventoHardware(est.codigoPc, 'DESCONECTADO')}
                          className="h-6 px-1.5 text-[10px] font-mono text-rose-600 dark:text-rose-400 font-medium"
                          title="Simular Retiro"
                        >
                          Retirar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha (Span 4): Terminal de Auditoría y Eventos en Vivo (Zig.ai Activity Feed) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
              TRAZABILIDAD EN VIVO
            </h2>
            <Badge variant="outline" className="text-[9px] font-mono">
              EVENT DISPATCH
            </Badge>
          </div>

          <Card className="max-h-[620px] overflow-y-auto border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b bg-muted/20">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  FEED DE EVENTOS
                </CardTitle>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {historialEventos.length} EVENTOS
                </span>
              </div>
              <CardDescription className="text-[11px]">
                Eventos transmitidos en tiempo real por Socket.io v4
              </CardDescription>
            </CardHeader>

            <CardContent className="p-3 divide-y divide-border">
              {historialEventos.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 font-mono">
                  [ ESPERANDO EVENTOS DE HARDWARE ]
                </p>
              ) : (
                historialEventos.map((log) => (
                  <div key={log.id} className="py-2.5 first:pt-0 last:pb-0 text-xs flex items-start space-x-2.5">
                    <div className="mt-1">
                      <span
                        className={`w-2 h-2 rounded-full inline-block ${
                          log.estado === 'FIRMANDO'
                            ? 'bg-emerald-500'
                            : log.estado === 'CONECTADO'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground font-mono truncate">{log.codigoPc}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{log.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        STATUS:{' '}
                        <span
                          className={`font-semibold font-mono ${
                            log.estado === 'FIRMANDO'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : log.estado === 'CONECTADO'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {log.estado}
                        </span>
                        {log.serialNumber && ` • SN: ${log.serialNumber}`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>

            <CardFooter className="p-3 border-t bg-muted/10 text-[10px] font-mono text-muted-foreground flex justify-between">
              <span>CANAL: /socket.io</span>
              <span>CGR COMPLIANT</span>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};
