import React, { useState } from 'react';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { MetricasTrazabilidadPanel } from './MetricasTrazabilidadPanel';
import { NavTab } from './Sidebar';

interface DashboardSupervisoresProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const DashboardSupervisores: React.FC<DashboardSupervisoresProps> = ({ onNavigateTab }) => {
  const {
    estaciones,
    historialEventos,
    metricas,
    cargarEstaciones,
    cargarMetricas,
    registrarAccionFirma,
    limpiarMalla,
  } = useTelemetriaStore();

  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [busquedaFirmas, setBusquedaFirmas] = useState('');
  const [filtroEstadoFirma, setFiltroEstadoFirma] = useState<'TODOS' | 'ACTIVO' | 'POR_VENCER' | 'EXPIRADO'>('TODOS');
  const [registrandoAccionId, setRegistrandoAccionId] = useState<string | null>(null);
  const [mensajeAccion, setMensajeAccion] = useState<string | null>(null);

  // Estadísticas de Sesiones / Equipos en vivo
  const totalEstaciones = estaciones.length;
  const desconectados = estaciones.filter((e) => e.estadoEnVivo === 'DESCONECTADO').length;
  const conectados = estaciones.filter((e) => e.estadoEnVivo === 'CONECTADO').length;
  const firmando = estaciones.filter((e) => e.estadoEnVivo === 'FIRMANDO').length;

  // Estadísticas de Dispositivos Existentes (Req 2: Total, Activos, Expirados)
  const dispExistentes =
    metricas?.resumenDispositivos?.totalExistentes ?? metricas?.telemetria?.tokensRegistrados ?? 0;
  const dispActivos =
    metricas?.resumenDispositivos?.activos ?? metricas?.telemetria?.tokensOperativos ?? 0;
  const dispExpirados =
    metricas?.resumenDispositivos?.expirados ??
    metricas?.telemetria?.tokensExpirados ??
    Math.max(0, dispExistentes - dispActivos);
  const pctDispositivosActivos =
    metricas?.resumenDispositivos?.porcentajeActivos ??
    (dispExistentes > 0 ? Math.round((dispActivos / dispExistentes) * 100) : 0);

  // Estadísticas de Firmas Asignadas (Req 1)
  const firmasTotal =
    metricas?.firmasAsignadas?.totalAsignadas ?? metricas?.administracion?.totalCertificados ?? 0;
  const firmasVigentes =
    metricas?.firmasAsignadas?.vigentes ?? metricas?.administracion?.certificadosVigentes ?? 0;
  const firmasPorVencer =
    metricas?.firmasAsignadas?.porVencer ?? metricas?.administracion?.certificadosPorVencer ?? 0;
  const firmasExpiradas =
    metricas?.firmasAsignadas?.expiradas ?? metricas?.administracion?.certificadosRevocadosVencidos ?? 0;
  const listadoFirmas = metricas?.firmasAsignadas?.listado || [];

  // Estadísticas de Acciones por Funcionario (Req 3: 1 acción = 1 firma, excluyendo conexiones/desconexiones)
  const totalAccionesPeriodo =
    metricas?.accionesFuncionarios?.totalAccionesFirmaPeriodo ?? metricas?.telemetria?.eventosFirmando ?? 0;
  const totalAccionesHistorico =
    metricas?.accionesFuncionarios?.totalAccionesFirmaHistorico ?? totalAccionesPeriodo;
  const conexionesExcluidas =
    metricas?.accionesFuncionarios?.conexionesExcluidasPeriodo ?? metricas?.telemetria?.eventosConectado ?? 0;
  const desconexionesExcluidas =
    metricas?.accionesFuncionarios?.desconexionesExcluidasPeriodo ?? metricas?.telemetria?.eventosDesconectado ?? 0;
  const listadoAccionesFuncionarios = metricas?.accionesFuncionarios?.listadoPorFuncionario || [];

  // Filtrado de firmas asignadas
  const firmasFiltradas = listadoFirmas.filter((f) => {
    const q = busquedaFirmas.trim().toLowerCase();
    const coincideTexto =
      !q ||
      f.funcionario.nombre.toLowerCase().includes(q) ||
      f.funcionario.rut.toLowerCase().includes(q) ||
      f.funcionario.unidad.toLowerCase().includes(q) ||
      f.serialNumberToken.toLowerCase().includes(q) ||
      f.numeroSerieCertificado.toLowerCase().includes(q);
    const coincideEstado = filtroEstadoFirma === 'TODOS' || f.estado === filtroEstadoFirma;
    return coincideTexto && coincideEstado;
  });

  // Filtrado de estaciones en sesión
  const estacionesFiltradas = estaciones.filter((est) => {
    const coincideTexto =
      est.codigoPc.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      est.dependenciaFisica.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      (est.tokenInfo?.serialNumber && est.tokenInfo.serialNumber.toLowerCase().includes(filtroTexto.toLowerCase()));

    const coincideEstado = filtroEstado === 'TODOS' || est.estadoEnVivo === filtroEstado;

    return coincideTexto && coincideEstado;
  });

  const handleSimularAccionFirma = async (params: {
    idKey: string;
    rutFuncionario?: string;
    nombreFuncionario?: string;
    serialNumber?: string;
    codigoPc?: string;
  }) => {
    setRegistrandoAccionId(params.idKey);
    setMensajeAccion(null);
    const ok = await registrarAccionFirma({
      rutFuncionario: params.rutFuncionario,
      serialNumber: params.serialNumber,
      codigoPc: params.codigoPc,
      glosaAccion: 'Firma electrónica registrada desde sesión activa y token del dispositivo',
    });
    setRegistrandoAccionId(null);
    if (ok) {
      setMensajeAccion(
        `Acción de firma (+1) registrada desde la sesión activa para ${
          params.nombreFuncionario || params.rutFuncionario || params.serialNumber || 'el token seleccionado'
        }. (Las conexiones y desconexiones no se contabilizan como acciones).`,
      );
      setTimeout(() => setMensajeAccion(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Cabecera Operativa de Control y Seguimiento de Tokens */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-xs shadow-xs">
        <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                CONTROL Y SEGUIMIENTO DE TOKENS DE FIRMA ELECTRÓNICA
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-500">
                1 ACCIÓN = 1 FIRMA REALIZADA CON EL TOKEN
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Monitoreo unificado de firmas asignadas, dispositivos existentes (total, activos y expirados), acciones de firma por funcionario y estado de conexión desde la sesión y el dispositivo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 border-t lg:border-t-0 lg:border-l pt-3 lg:pt-0 lg:pl-5 w-full lg:w-auto justify-between lg:justify-start">
            {onNavigateTab && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateTab('ALERTAS')}
                  className="h-8 text-xs font-semibold"
                >
                  Vigencia 15/30/60d ({metricas?.alertasVencimiento?.totalEnUmbral60Dias ?? 0})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateTab('USUARIOS_CUSTODIA')}
                  className="h-8 text-xs font-semibold"
                >
                  Contratos de Tokens ({metricas?.contratosResumen?.totalContratos ?? 0})
                </Button>
              </>
            )}
            <a
              href="/api/v1/telemetria/descargar-agente"
              className="inline-flex items-center justify-center rounded-md border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary px-3 h-8 text-xs font-bold transition-colors"
            >
              Descargar Agente de Sesión USB
            </a>
          </div>
        </CardContent>
      </Card>

      {mensajeAccion && (
        <div className="p-3.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-xs font-mono text-foreground flex items-center justify-between">
          <span>✓ {mensajeAccion}</span>
          <button
            onClick={() => setMensajeAccion(null)}
            className="text-[10px] underline ml-4 text-muted-foreground hover:text-foreground"
          >
            [Cerrar]
          </button>
        </div>
      )}

      {/* 2. Tarjetas KPI Principales: Dispositivos Existentes (Total, Activos, Expirados), Firmas Asignadas y Acciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {/* Req 2: Dispositivos Existentes en Total */}
        <Card className="hover:border-primary/40 transition-colors overflow-hidden">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">
                DISPOSITIVOS EXISTENTES
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                TOTAL
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground mt-1">
              {dispExistentes}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-[11px] text-muted-foreground truncate">
              Inventario total de tokens registrados
            </p>
          </CardContent>
        </Card>

        {/* Req 2: Dispositivos Activos */}
        <Card className="border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 transition-colors overflow-hidden">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 leading-tight">
                DISPOSITIVOS ACTIVOS
              </span>
              <Badge variant="success" className="text-[10px] shrink-0 font-bold">
                {pctDispositivosActivos}%
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
              {dispActivos}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-[11px] text-muted-foreground truncate">
              En sesión: {conectados} conectados / {firmando} firmando
            </p>
          </CardContent>
        </Card>

        {/* Req 2: Dispositivos Expirados */}
        <Card className="border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50 transition-colors overflow-hidden">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 leading-tight">
                DISPOSITIVOS EXPIRADOS
              </span>
              <Badge variant="danger" className="text-[10px] shrink-0 font-bold">
                CADUCADOS
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">
              {dispExpirados}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-[11px] text-muted-foreground truncate">
              Tokens con vigencia vencida o dados de baja
            </p>
          </CardContent>
        </Card>

        {/* Req 1: Firmas Asignadas */}
        <Card className="border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 transition-colors overflow-hidden">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 leading-tight">
                FIRMAS ASIGNADAS
              </span>
              <Badge variant="warning" className="text-[10px] shrink-0 font-bold">
                {firmasVigentes} VIGENTES
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
              {firmasTotal}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-[11px] text-muted-foreground truncate">
              Por vencer: {firmasPorVencer} • Expiradas: {firmasExpiradas}
            </p>
          </CardContent>
        </Card>

        {/* Req 3: Acciones Realizadas con Tokens (1 acción = 1 firma) */}
        <Card className="border-primary/40 bg-primary/5 hover:border-primary/60 transition-colors overflow-hidden">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary leading-tight">
                ACCIONES (FIRMAS TOKEN)
              </span>
              <Badge variant="info" className="text-[9px] shrink-0 font-mono">
                1 ACCIÓN = 1 FIRMA
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground mt-1">
              {totalAccionesPeriodo}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-[11px] text-muted-foreground truncate">
              Excluye {conexionesExcluidas} conex. y {desconexionesExcluidas} desconex.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Apartado Req 1: Listado de Firmas Asignadas (Titular, Estado y Tiempo de Expiración) */}
      <Card className="border-border/80 bg-card overflow-hidden">
        <CardHeader className="p-4 border-b bg-muted/20 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono">
                APARTADO 1 • TITULARIDAD Y VIGENCIA
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {firmasFiltradas.length} de {firmasTotal} firmas asignadas
              </Badge>
            </div>
            <CardTitle className="text-sm sm:text-base font-bold mt-1">
              Firmas Asignadas a Funcionarios, Estado y Tiempo Restante de Expiración
            </CardTitle>
            <CardDescription className="text-xs">
              Detalle de cada firma electrónica asignada, funcionario responsable, número de serie del token, estado operativo y cuenta regresiva de expiración.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={busquedaFirmas}
              onChange={(e) => setBusquedaFirmas(e.target.value)}
              placeholder="Buscar por funcionario, RUT, unidad o N° serie..."
              className="h-8 text-xs w-full sm:w-64 bg-background"
            />
            <div className="inline-flex rounded-md border bg-background p-0.5">
              {(['TODOS', 'ACTIVO', 'POR_VENCER', 'EXPIRADO'] as const).map((est) => (
                <button
                  key={est}
                  type="button"
                  onClick={() => setFiltroEstadoFirma(est)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
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
                <TableHead>Funcionario Asignado (Titular)</TableHead>
                <TableHead>Unidad / Cargo</TableHead>
                <TableHead>Token USB / Certificado</TableHead>
                <TableHead>Estado Firma</TableHead>
                <TableHead>Fecha Expiración y Tiempo Restante</TableHead>
                <TableHead>Estado en Sesión / Equipo</TableHead>
                <TableHead className="text-right">Acciones (Firmas)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {firmasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-20 text-center text-xs text-muted-foreground">
                    No se encontraron firmas asignadas con el filtro seleccionado.
                  </TableCell>
                </TableRow>
              ) : (
                firmasFiltradas.map((firma) => (
                  <TableRow key={firma.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-bold text-foreground">{firma.funcionario.nombre}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        RUT: {firma.funcionario.rut} • {firma.funcionario.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-[11px] font-medium text-foreground">{firma.funcionario.unidad}</div>
                      <div className="text-[10px] text-muted-foreground">{firma.funcionario.cargo}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono font-bold text-foreground">{firma.serialNumberToken}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {firma.marca} {firma.modelo} • Cert: {firma.numeroSerieCertificado}
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
                        Expira: {firma.fechaExpiracion}
                      </div>
                      <div
                        className={`text-[10px] font-mono font-bold ${
                          firma.diasRestantes <= 0
                            ? 'text-rose-500'
                            : firma.diasRestantes <= 15
                            ? 'text-rose-500'
                            : firma.diasRestantes <= 30
                            ? 'text-amber-500'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        ⏱ {firma.tiempoExpiracionTexto}
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="text-right font-mono">
                          <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {firma.accionesFirmaPeriodo}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Hist.: {firma.accionesFirmaTotal}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={registrandoAccionId === firma.id}
                          onClick={() =>
                            handleSimularAccionFirma({
                              idKey: firma.id,
                              rutFuncionario: firma.funcionario.rut,
                              nombreFuncionario: firma.funcionario.nombre,
                              serialNumber: firma.serialNumberToken,
                              codigoPc: firma.estacionActual || undefined,
                            })
                          }
                          className="h-7 px-2 text-[10px] font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                          title="Simular / Registrar 1 acción de firma desde la sesión activa con este token"
                        >
                          {registrandoAccionId === firma.id ? '...' : '+1 Firma'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 4. Apartado Req 3: Acciones Realizadas por cada Funcionario con su Token */}
      <Card className="border-emerald-500/30 bg-card overflow-hidden">
        <CardHeader className="p-4 border-b bg-emerald-500/5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="success" className="text-[10px] font-mono">
                APARTADO 3 • CONTEO DE ACCIONES DE FIRMA POR FUNCIONARIO
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono">
                Conexiones ({conexionesExcluidas}) y Desconexiones ({desconexionesExcluidas}) EXCLUIDAS
              </Badge>
            </div>
            <CardTitle className="text-sm sm:text-base font-bold mt-1">
              Cantidad de Acciones Realizadas por cada Funcionario con su Token
            </CardTitle>
            <CardDescription className="text-xs">
              Cada acción contabilizada corresponde exclusivamente a <strong>1 firma electrónica realizada con el token</strong> desde la sesión activa (no se cuentan conexiones ni desconexiones USB).
            </CardDescription>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono bg-background/80 px-3 py-2 rounded-lg border">
            <div>
              <span className="text-[10px] text-muted-foreground block">TOTAL FIRMAS PERÍODO</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {totalAccionesPeriodo} acciones
              </span>
            </div>
            <Separator orientation="vertical" className="h-7" />
            <div>
              <span className="text-[10px] text-muted-foreground block">ACUMULADO HISTÓRICO</span>
              <span className="font-bold text-foreground text-sm">
                {totalAccionesHistorico} acciones
              </span>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 text-[11px]">
              <TableRow>
                <TableHead>Funcionario / RUT</TableHead>
                <TableHead>Unidad Municipal</TableHead>
                <TableHead>Token Utilizado (N° Serie)</TableHead>
                <TableHead>Acciones en Período (1 Acción = 1 Firma)</TableHead>
                <TableHead>Total Histórico Firmas</TableHead>
                <TableHead>Eventos USB Excluidos (Con / Desc)</TableHead>
                <TableHead>Última Sesión / Estación</TableHead>
                <TableHead className="text-right">Probar Firma en Sesión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {listadoAccionesFuncionarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-20 text-center text-xs text-muted-foreground">
                    Cargando registro de acciones de firma por funcionario...
                  </TableCell>
                </TableRow>
              ) : (
                listadoAccionesFuncionarios.map((func) => (
                  <TableRow key={func.usuarioId} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-bold text-foreground">{func.nombre}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        RUT: {func.rut} • {func.cargo}
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px]">{func.unidad}</TableCell>
                    <TableCell>
                      <div className="font-mono font-bold text-foreground">{func.serialNumberToken}</div>
                      <div className="text-[10px] text-muted-foreground">{func.modeloToken}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="success" className="text-xs font-mono font-bold px-2.5 py-0.5">
                          {func.accionesFirmaPeriodo} firmas
                        </Badge>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          ({func.porcentajeParticipacionFirmas}%)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-foreground">
                      {func.accionesFirmaHistorico} firmas
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {func.conexionesIgnoradasPeriodo} conex. / {func.desconexionesIgnoradasPeriodo} desconex.
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">
                      <div>{func.codigoPcUltimaSesion || 'PC-MUNICIPAL'}</div>
                      {func.ultimaAccionFirma && (
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(func.ultimaAccionFirma).toLocaleString('es-CL')}
                        </div>
                      )}
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
                        className="h-7 px-2.5 text-[11px] font-bold border-primary/40 text-primary hover:bg-primary/10"
                      >
                        {registrandoAccionId === func.usuarioId ? 'Firmando...' : 'Registrar Firma (+1)'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 5. Panel de Estadísticas Integrales y Exportación Summary PDF / LaTeX (Req 5 y Req 6) */}
      <MetricasTrazabilidadPanel vistaOrigen="DISPOSITIVOS" />

      {/* 6. Monitoreo en Vivo de Sesiones y Dispositivos Conectados */}
      <Card>
        <CardContent className="p-3.5 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-96">
            <Input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Filtrar sesiones por equipo (ej: PC-SECMUN) o serie de token..."
              className="text-xs h-9"
            />
          </div>

          <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-1">
              ESTADO EN SESIÓN:
            </span>
            <Button
              variant={filtroEstado === 'TODOS' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado('TODOS')}
              className="h-8 text-xs"
            >
              Todos ({totalEstaciones})
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
              Sin Token ({desconectados})
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Malla de Sesiones / Equipos con Token */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              SESIONES Y DISPOSITIVOS REPORTANDO ({estacionesFiltradas.length})
            </h2>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  cargarEstaciones();
                  cargarMetricas();
                }}
                className="h-7 px-2 text-[11px]"
              >
                ↻ Actualizar Sesiones
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => limpiarMalla()}
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
              >
                Limpiar Vista
              </Button>
            </div>
          </div>

          {estacionesFiltradas.length === 0 ? (
            <Card className="p-8 text-center border-dashed bg-card/40">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground">
                  No hay sesiones de equipos reportando en este filtro
                </div>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Los tokens conectados en sesión activa aparecerán automáticamente aquí junto con su número de serie.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {estacionesFiltradas.map((est) => {
                const isConectado = est.estadoEnVivo === 'CONECTADO';
                const isFirmando = est.estadoEnVivo === 'FIRMANDO';
                const isDesconectado = est.estadoEnVivo === 'DESCONECTADO';

                return (
                  <Card
                    key={est.codigoPc}
                    className={`overflow-hidden transition-all hover:shadow-md ${
                      isFirmando
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
                      {!isDesconectado && est.tokenInfo?.serialNumber ? (
                        <div className="bg-muted/40 p-2.5 rounded-md border space-y-1 text-[11px] min-w-0">
                          <div className="flex justify-between items-center gap-2 min-w-0">
                            <span className="text-muted-foreground shrink-0">Token en Sesión:</span>
                            <span className="font-semibold text-foreground truncate text-right flex-1">
                              {est.tokenInfo.marca} ({est.tokenInfo.modelo})
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-2 min-w-0">
                            <span className="text-muted-foreground shrink-0">N° Serie:</span>
                            <span className="text-foreground font-mono truncate text-right flex-1">
                              {est.tokenInfo.serialNumber}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-rose-500/5 p-2.5 rounded-md border border-dashed border-rose-500/30 text-rose-600 dark:text-rose-400 text-center italic text-[11px] truncate">
                          [ Sin token criptográfico conectado en sesión ]
                        </div>
                      )}

                      <Separator />

                      <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-muted-foreground pt-0.5">
                        <span className="text-[10px] truncate">
                          Último reporte: {new Date(est.ultimoPing).toLocaleTimeString('es-CL')}
                        </span>
                        {!isDesconectado && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={registrandoAccionId === est.codigoPc}
                            onClick={() =>
                              handleSimularAccionFirma({
                                idKey: est.codigoPc,
                                serialNumber: est.tokenInfo?.serialNumber,
                                codigoPc: est.codigoPc,
                              })
                            }
                            className="h-6 px-2 text-[10px] font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                          >
                            +1 Acción Firma
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna Derecha: Actividad Reciente desde Sesión y Dispositivo */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              TELEMETRÍA EN VIVO (SESIÓN + TOKEN)
            </h2>
            <Badge variant="outline" className="text-[10px]">
              Tiempo Real
            </Badge>
          </div>

          <Card className="max-h-[620px] overflow-y-auto border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b bg-muted/20">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                   FLUJO DE EVENTOS
                </CardTitle>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {historialEventos.length} EVENTOS
                </span>
              </div>
              <CardDescription className="text-[11px]">
                Solo los eventos FIRMANDO cuentan como acciones de firma
              </CardDescription>
            </CardHeader>

            <CardContent className="p-3 divide-y divide-border">
              {historialEventos.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  [ Esperando telemetría de dispositivos ]
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
                      <div className="flex items-center justify-between gap-1 min-w-0">
                        <span className="font-bold text-foreground font-mono truncate flex-1 min-w-0">
                          {log.codigoPc}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono shrink-0">
                          {log.fecha && <span>{log.fecha}</span>}
                          <span>{log.timestamp}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Evento:{' '}
                        <span
                          className={`font-semibold ${
                            log.estado === 'FIRMANDO'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : log.estado === 'CONECTADO'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {log.estado === 'FIRMANDO' ? 'FIRMA REALIZADA (+1 ACCIÓN)' : `${log.estado} (Sin acción)`}
                        </span>
                        {log.serialNumber && ` • SN: ${log.serialNumber}`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>

            <CardFooter className="p-3 border-t bg-muted/10 text-[10px] text-muted-foreground flex items-center justify-between gap-2 flex-wrap">
              <span>Telemetría desde sesión y dispositivo</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">● Activo</span>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};
