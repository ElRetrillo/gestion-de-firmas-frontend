import React, { useState } from 'react';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';

export const DashboardSupervisores: React.FC = () => {
  const {
    estaciones,
    metricas,
    registrarAccionFirma,
  } = useTelemetriaStore();

  const [busquedaFirmas, setBusquedaFirmas] = useState('');
  const [filtroEstadoFirma, setFiltroEstadoFirma] = useState<'TODOS' | 'ACTIVO' | 'POR_VENCER' | 'EXPIRADO'>('TODOS');
  const [filtroEstadoSesion, setFiltroEstadoSesion] = useState<string>('TODOS');
  const [registrandoAccionId, setRegistrandoAccionId] = useState<string | null>(null);
  const [mensajeAccion, setMensajeAccion] = useState<string | null>(null);

  // 1. Dispositivos Existentes (Total, Activos, Expirados) y Estado en Sesión
  const dispExistentes =
    metricas?.resumenDispositivos?.totalExistentes ?? metricas?.telemetria?.tokensRegistrados ?? 8;
  const dispActivos =
    metricas?.resumenDispositivos?.activos ?? metricas?.telemetria?.tokensOperativos ?? 6;
  const dispExpirados =
    metricas?.resumenDispositivos?.expirados ??
    metricas?.telemetria?.tokensExpirados ??
    Math.max(0, dispExistentes - dispActivos);

  const conectados = estaciones.filter((e) => e.estadoEnVivo === 'CONECTADO').length;
  const firmando = estaciones.filter((e) => e.estadoEnVivo === 'FIRMANDO').length;
  const desconectados = estaciones.filter((e) => e.estadoEnVivo === 'DESCONECTADO').length;

  // 2. Firmas Asignadas
  const listadoFirmas = metricas?.firmasAsignadas?.listado || [];
  const firmasTotal = metricas?.firmasAsignadas?.totalAsignadas ?? listadoFirmas.length;
  const firmasVigentes =
    metricas?.firmasAsignadas?.vigentes ?? listadoFirmas.filter((f) => f.estado === 'ACTIVO').length;
  const firmasPorVencer =
    metricas?.firmasAsignadas?.porVencer ?? listadoFirmas.filter((f) => f.estado === 'POR_VENCER').length;
  const firmasExpiradas =
    metricas?.firmasAsignadas?.expiradas ?? listadoFirmas.filter((f) => f.estado === 'EXPIRADO').length;

  // 3. Acciones por Funcionario (1 acción = 1 firma, excluyendo conexiones/desconexiones)
  const listadoAccionesFuncionarios = metricas?.accionesFuncionarios?.listadoPorFuncionario || [];
  const totalAccionesPeriodo =
    metricas?.accionesFuncionarios?.totalAccionesFirmaPeriodo ??
    listadoAccionesFuncionarios.reduce((acc, item) => acc + item.accionesFirmaPeriodo, 0);
  const totalAccionesHistorico =
    metricas?.accionesFuncionarios?.totalAccionesFirmaHistorico ??
    listadoAccionesFuncionarios.reduce((acc, item) => acc + item.accionesFirmaHistorico, 0);
  const conexionesExcluidas = metricas?.accionesFuncionarios?.conexionesExcluidasPeriodo ?? 0;
  const desconexionesExcluidas = metricas?.accionesFuncionarios?.desconexionesExcluidasPeriodo ?? 0;

  const firmasFiltradas = listadoFirmas.filter((f) => {
    const q = busquedaFirmas.trim().toLowerCase();
    const coincideTexto =
      !q ||
      f.funcionario.nombre.toLowerCase().includes(q) ||
      f.funcionario.rut.toLowerCase().includes(q) ||
      f.funcionario.unidad.toLowerCase().includes(q) ||
      f.serialNumberToken.toLowerCase().includes(q);
    const coincideEstado = filtroEstadoFirma === 'TODOS' || f.estado === filtroEstadoFirma;
    return coincideTexto && coincideEstado;
  });

  const estacionesFiltradas = estaciones.filter(
    (est) => filtroEstadoSesion === 'TODOS' || est.estadoEnVivo === filtroEstadoSesion,
  );

  const handleSimularAccionFirma = async (params: {
    idKey: string;
    rutFuncionario?: string;
    nombreFuncionario?: string;
    serialNumber?: string;
    codigoPc?: string;
  }) => {
    setRegistrandoAccionId(params.idKey);
    await registrarAccionFirma({
      rutFuncionario: params.rutFuncionario,
      serialNumber: params.serialNumber,
      codigoPc: params.codigoPc,
      glosaAccion: 'Firma realizada con token desde sesión activa',
    });
    setRegistrandoAccionId(null);
    setMensajeAccion(
      `+1 acción de firma registrada para ${params.nombreFuncionario || params.serialNumber || 'el token'}.`,
    );
    setTimeout(() => setMensajeAccion(null), 3500);
  };

  return (
    <div className="space-y-5">
      {mensajeAccion && (
        <div className="p-2.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-xs font-mono text-foreground flex items-center justify-between">
          <span>✓ {mensajeAccion}</span>
          <button
            onClick={() => setMensajeAccion(null)}
            className="text-[10px] underline ml-4 text-muted-foreground hover:text-foreground"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* 1. Fila Compacta de KPIs Esenciales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="p-3.5">
          <div className="text-[10px] font-bold uppercase text-muted-foreground">
            Dispositivos Existentes
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">{dispExistentes}</div>
          <div className="text-[11px] text-muted-foreground font-mono">
            Total en inventario
          </div>
        </Card>

        <Card className="p-3.5 border-emerald-500/30 bg-emerald-500/5">
          <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
            Dispositivos Activos
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {dispActivos}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            {conectados} conectados • {firmando} firmando
          </div>
        </Card>

        <Card className="p-3.5 border-rose-500/30 bg-rose-500/5">
          <div className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">
            Dispositivos Expirados
          </div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">
            {dispExpirados}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            Vigencia caducada
          </div>
        </Card>

        <Card className="p-3.5 border-amber-500/30 bg-amber-500/5">
          <div className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
            Firmas Asignadas
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {firmasTotal}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            {firmasVigentes} act. • {firmasPorVencer} por vencer • {firmasExpiradas} exp.
          </div>
        </Card>

        <Card className="p-3.5 border-primary/40 bg-primary/5 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold uppercase text-primary">
            Acciones Firma (Período)
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {totalAccionesPeriodo}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            1 acción = 1 firma (Hist.: {totalAccionesHistorico})
          </div>
        </Card>
      </div>

      {/* 2. Tabla de Firmas Asignadas (Titular, Estado y Tiempo de Expiración) */}
      <Card className="border-border/80 bg-card overflow-hidden">
        <CardHeader className="p-3.5 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <CardTitle className="text-sm font-bold">
            Firmas Asignadas ({firmasFiltradas.length})
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={busquedaFirmas}
              onChange={(e) => setBusquedaFirmas(e.target.value)}
              placeholder="Buscar funcionario, RUT o N° serie..."
              className="h-8 text-xs w-full sm:w-56 bg-background"
            />
            <div className="inline-flex rounded-md border bg-background p-0.5">
              {(['TODOS', 'ACTIVO', 'POR_VENCER', 'EXPIRADO'] as const).map((est) => (
                <button
                  key={est}
                  type="button"
                  onClick={() => setFiltroEstadoFirma(est)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold ${
                    filtroEstadoFirma === est
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {est === 'TODOS' ? 'Todas' : est === 'POR_VENCER' ? 'Por Vencer' : est}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 text-[11px]">
              <TableRow>
                <TableHead>Funcionario Titular / RUT</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Token (N° Serie)</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Expiración / Tiempo Restante</TableHead>
                <TableHead>Conexión en Sesión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {firmasFiltradas.map((firma) => (
                <TableRow key={firma.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="font-bold text-foreground">{firma.funcionario.nombre}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {firma.funcionario.rut}
                    </div>
                  </TableCell>
                  <TableCell className="text-[11px]">{firma.funcionario.unidad}</TableCell>
                  <TableCell>
                    <div className="font-mono font-bold text-foreground">{firma.serialNumberToken}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {firma.marca} {firma.modelo}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        firma.estado === 'ACTIVO'
                          ? 'success'
                          : firma.estado === 'POR_VENCER'
                          ? 'warning'
                          : 'danger'
                      }
                      className="text-[10px] font-mono font-bold"
                    >
                      {firma.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-[11px] font-semibold text-foreground">
                      {firma.fechaExpiracion}
                    </div>
                    <div
                      className={`text-[10px] font-mono font-bold ${
                        firma.diasRestantes <= 15
                          ? 'text-rose-500'
                          : firma.diasRestantes <= 60
                          ? 'text-amber-500'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {firma.tiempoExpiracionTexto}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          firma.estadoConexion === 'FIRMANDO'
                            ? 'success'
                            : firma.estadoConexion === 'CONECTADO'
                            ? 'warning'
                            : 'danger'
                        }
                        className="text-[9px] font-mono"
                      >
                        {firma.estadoConexion}
                      </Badge>
                      {firma.estacionActual && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {firma.estacionActual}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 3. Tabla de Acciones por Funcionario con su Token (1 acción = 1 firma) */}
      <Card className="border-border/80 bg-card overflow-hidden">
        <CardHeader className="p-3.5 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-sm font-bold">
              Acciones por Funcionario con su Token
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono">
              1 acción = 1 firma • Excluye {conexionesExcluidas} conex. y {desconexionesExcluidas} desconex.
            </Badge>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
            Total período: {totalAccionesPeriodo} firmas
          </span>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 text-[11px]">
              <TableRow>
                <TableHead>Funcionario / RUT</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Token Asignado</TableHead>
                <TableHead>Firmas Período</TableHead>
                <TableHead>Firmas Histórico</TableHead>
                <TableHead>Conex./Desconex. Ignoradas</TableHead>
                <TableHead className="text-right">Registrar Firma</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {listadoAccionesFuncionarios.map((func) => (
                <TableRow key={func.usuarioId} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="font-bold text-foreground">{func.nombre}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{func.rut}</div>
                  </TableCell>
                  <TableCell className="text-[11px]">{func.unidad}</TableCell>
                  <TableCell className="font-mono font-bold">{func.serialNumberToken}</TableCell>
                  <TableCell>
                    <Badge variant="success" className="text-xs font-mono font-bold px-2">
                      {func.accionesFirmaPeriodo}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-semibold">
                    {func.accionesFirmaHistorico}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {func.conexionesIgnoradasPeriodo}C / {func.desconexionesIgnoradasPeriodo}D
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={registrandoAccionId === func.usuarioId}
                      onClick={() =>
                        handleSimularAccionFirma({
                          idKey: func.usuarioId,
                          rutFuncionario: func.rut,
                          nombreFuncionario: func.nombre,
                          serialNumber: func.serialNumberToken,
                          codigoPc: func.codigoPcUltimaSesion || undefined,
                        })
                      }
                      className="h-7 px-2.5 text-[11px] font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    >
                      +1 Firma
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 4. Estado de Conexión de Dispositivos en Sesión */}
      <Card className="border-border/80 bg-card overflow-hidden">
        <CardHeader className="p-3.5 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold">
            Estado de Conexión en Sesión ({estacionesFiltradas.length})
          </CardTitle>

          <div className="flex items-center gap-1.5">
            <Button
              variant={filtroEstadoSesion === 'TODOS' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstadoSesion('TODOS')}
              className="h-7 text-xs"
            >
              Todos ({estaciones.length})
            </Button>
            <Button
              variant={filtroEstadoSesion === 'FIRMANDO' ? 'success' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstadoSesion('FIRMANDO')}
              className="h-7 text-xs"
            >
              Firmando ({firmando})
            </Button>
            <Button
              variant={filtroEstadoSesion === 'CONECTADO' ? 'warning' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstadoSesion('CONECTADO')}
              className="h-7 text-xs"
            >
              Conectados ({conectados})
            </Button>
            <Button
              variant={filtroEstadoSesion === 'DESCONECTADO' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstadoSesion('DESCONECTADO')}
              className="h-7 text-xs"
            >
              Sin Token ({desconectados})
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {estacionesFiltradas.map((est) => (
              <div
                key={est.codigoPc}
                className="p-3 rounded-lg border bg-background/70 flex flex-col justify-between gap-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-foreground truncate">{est.codigoPc}</span>
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
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{est.dependenciaFisica}</div>
                <div className="text-[11px] font-mono text-foreground truncate">
                  {est.tokenInfo?.serialNumber ? `SN: ${est.tokenInfo.serialNumber}` : 'Sin token conectado'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
