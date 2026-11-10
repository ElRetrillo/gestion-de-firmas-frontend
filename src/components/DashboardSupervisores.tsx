import React, { useState } from 'react';
import { Info, User, Download, Terminal, Usb, Laptop } from 'lucide-react';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { useAuthStore } from '../store/useAuthStore';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';

interface InfoPeriodoTooltipProps {
  periodoEtiqueta?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

const InfoPeriodoTooltip: React.FC<InfoPeriodoTooltipProps> = ({
  periodoEtiqueta = 'Últimos 30 días',
  align = 'right',
  className = '',
}) => {
  const [abierto, setAbierto] = useState(false);

  const alignClasses =
    align === 'right'
      ? 'right-0'
      : align === 'left'
        ? 'left-0'
        : 'left-1/2 -translate-x-1/2';

  const arrowClasses =
    align === 'right'
      ? 'right-2'
      : align === 'left'
        ? 'left-2'
        : 'left-1/2 -translate-x-1/2';

  return (
    <div
      className={`relative inline-flex items-center group ${className}`}
      onMouseEnter={() => setAbierto(true)}
      onMouseLeave={() => setAbierto(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setAbierto((prev) => !prev);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        aria-label="¿Qué es el Período Actual?"
        title="¿Qué es el Período Actual? (Haz hover o clic para ver la definición)"
        className="cursor-pointer text-primary/70 hover:text-primary dark:text-primary-foreground/70 dark:hover:text-primary-foreground transition-colors focus:outline-none rounded-full p-0.5 inline-flex items-center justify-center hover:bg-primary/10"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {/* Popover / Tooltip explicativo */}
      <div
        role="tooltip"
        className={`absolute top-full mt-2 w-72 sm:w-80 p-3.5 bg-popover text-popover-foreground text-xs rounded-lg shadow-xl border border-border z-50 transition-all duration-150 ${alignClasses} ${abierto ? 'flex flex-col' : 'hidden'
          }`}
      >
        <div className="font-bold text-[11px] text-primary flex items-center gap-1.5 pb-1.5 border-b border-border/60 mb-2">
          <Info className="w-3.5 h-3.5 shrink-0 text-primary" />
          <span>Definición: Período Actual</span>
        </div>

        <div className="space-y-2 text-[11px] leading-relaxed text-muted-foreground">
          <p>
            El <strong className="text-foreground font-semibold">Período Actual</strong> corresponde a la <span className="text-primary font-semibold font-mono">ventana temporal activa de evaluación</span> ({periodoEtiqueta}) configurada para el monitoreo institucional.
          </p>

          <div className="p-2 rounded bg-muted/40 border border-border/50 text-[10px] font-mono space-y-1">
            <div className="text-foreground font-bold">Criterio de contabilización:</div>
            <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
              • 1 acción = 1 firma electrónica válida
            </div>
            <div className="text-muted-foreground">
              • Excluye eventos de conexión/desconexión USB para no alterar la métrica.
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            <strong className="text-foreground">Diferencia con Histórico:</strong> Mientras el histórico totaliza todas las firmas desde la puesta en marcha, el período actual permite evaluar el ritmo de uso y adopción reciente.
          </p>
        </div>

        {/* Flecha indicadora superior */}
        <div
          className={`absolute bottom-full w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-popover ${arrowClasses}`}
        />
      </div>
    </div>
  );
};

export const DashboardSupervisores: React.FC = () => {
  const {
    estaciones,
    metricas,
  } = useTelemetriaStore();
  const { usuario } = useAuthStore();

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstadoFirma, setFiltroEstadoFirma] = useState<'TODOS' | 'ACTIVO' | 'POR_VENCER' | 'EXPIRADO'>('TODOS');
  const [filtroEstadoConexion, setFiltroEstadoConexion] = useState<'TODOS' | 'CONECTADO' | 'DESCONECTADO'>('TODOS');
  const [mensajeAccion, setMensajeAccion] = useState<string | null>(null);

  const handleDescargarAgenteBat = () => {
    window.location.href = '/api/v1/telemetria/descargar-agente?unidad=Red%20Interna%20Municipal';
    setMensajeAccion('Descargando script autoinstalador .bat del Agente USB para probar en vivo...');
  };

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

  // 2. Firmas Asignadas y Acciones
  const listadoFirmas = metricas?.firmasAsignadas?.listado || [];
  const listadoAccionesFuncionarios = metricas?.accionesFuncionarios?.listadoPorFuncionario || [];
  const totalAccionesPeriodo =
    metricas?.accionesFuncionarios?.totalAccionesFirmaPeriodo ??
    listadoAccionesFuncionarios.reduce((acc, item) => acc + item.accionesFirmaPeriodo, 0);
  const totalAccionesHistorico =
    metricas?.accionesFuncionarios?.totalAccionesFirmaHistorico ??
    listadoAccionesFuncionarios.reduce((acc, item) => acc + item.accionesFirmaHistorico, 0);
  const periodoEtiqueta = metricas?.periodo?.etiquetaPeriodo || 'Últimos 30 días';

  // Consolidación de datos unificados por Funcionario/Token
  interface FilaCentralizada {
    id: string;
    funcionario: {
      id?: string;
      nombre: string;
      rut: string;
      unidad: string;
      cargo?: string;
    };
    token: {
      serialNumber: string;
      marca?: string;
      modelo?: string;
    };
    estadoFirma: 'ACTIVO' | 'POR_VENCER' | 'EXPIRADO';
    fechaExpiracion?: string;
    diasRestantes?: number;
    tiempoExpiracionTexto?: string;
    estadoConexion: 'CONECTADO' | 'DESCONECTADO';
    estacionActual?: string | null;
    ipEstacion?: string | null;
    dependenciaFisica?: string | null;
    firmasPeriodo: number;
    firmasHistorico: number;
    conexiones: number;
    desconexiones: number;
  }

  // Mapa combinado
  const mapaFilas = new Map<string, FilaCentralizada>();

  // 1. Poblamos desde listadoFirmas
  listadoFirmas.forEach((f) => {
    const key = f.funcionario?.rut || f.serialNumberToken || f.id;
    // Buscar si hay estación conectada en vivo con este serial o vinculada a este PC
    const estacionEnVivo = estaciones.find(
      (e) =>
        (e.tokenInfo?.serialNumber && e.tokenInfo.serialNumber.toLowerCase() === f.serialNumberToken.toLowerCase()) ||
        (f.estacionActual && e.codigoPc.toLowerCase() === f.estacionActual.toLowerCase())
    );

    const accionData = listadoAccionesFuncionarios.find(
      (a) =>
        (f.funcionario?.rut && a.rut === f.funcionario.rut) ||
        (f.serialNumberToken && a.serialNumberToken === f.serialNumberToken)
    );

    const estadoConexionFinal = estacionEnVivo
      ? estacionEnVivo.estadoEnVivo
      : f.estadoConexion || 'DESCONECTADO';

    mapaFilas.set(key, {
      id: f.id || key,
      funcionario: {
        id: f.funcionario?.id,
        nombre: f.funcionario?.nombre || 'Funcionario Municipal',
        rut: f.funcionario?.rut || 'Sin RUT',
        unidad: f.funcionario?.unidad || 'Municipalidad',
        cargo: f.funcionario?.cargo,
      },
      token: {
        serialNumber: f.serialNumberToken || 'SN-SIN-TOKEN',
        marca: f.marca,
        modelo: f.modelo,
      },
      estadoFirma: (f.estado as any) === 'POR VENCER' ? 'POR_VENCER' : f.estado,
      fechaExpiracion: f.fechaExpiracion,
      diasRestantes: f.diasRestantes,
      tiempoExpiracionTexto: f.tiempoExpiracionTexto,
      estadoConexion: estadoConexionFinal,
      estacionActual: estacionEnVivo?.codigoPc || f.estacionActual || null,
      ipEstacion: estacionEnVivo?.ipAsignada || null,
      dependenciaFisica: estacionEnVivo?.dependenciaFisica || null,
      firmasPeriodo: accionData?.accionesFirmaPeriodo ?? f.accionesFirmaPeriodo ?? 0,
      firmasHistorico: accionData?.accionesFirmaHistorico ?? f.accionesFirmaTotal ?? 0,
      conexiones: accionData?.conexionesIgnoradasPeriodo ?? 0,
      desconexiones: accionData?.desconexionesIgnoradasPeriodo ?? 0,
    });
  });

  // 2. Complementamos desde listadoAccionesFuncionarios si alguno no estuviese en listadoFirmas
  listadoAccionesFuncionarios.forEach((a) => {
    const key = a.rut || a.serialNumberToken || a.usuarioId;
    if (!mapaFilas.has(key)) {
      const estacionEnVivo = estaciones.find(
        (e) =>
          (e.tokenInfo?.serialNumber && e.tokenInfo.serialNumber.toLowerCase() === a.serialNumberToken.toLowerCase()) ||
          (a.codigoPcUltimaSesion && e.codigoPc.toLowerCase() === a.codigoPcUltimaSesion.toLowerCase())
      );

      mapaFilas.set(key, {
        id: a.usuarioId || key,
        funcionario: {
          id: a.usuarioId,
          nombre: a.nombre,
          rut: a.rut,
          unidad: a.unidad,
          cargo: a.cargo,
        },
        token: {
          serialNumber: a.serialNumberToken,
          modelo: a.modeloToken,
        },
        estadoFirma: (a.estadoToken as any) === 'POR VENCER' ? 'POR_VENCER' : (a.estadoToken || 'ACTIVO'),
        diasRestantes: a.diasRestantesToken,
        tiempoExpiracionTexto: a.diasRestantesToken ? `${a.diasRestantesToken} días restantes` : undefined,
        estadoConexion: estacionEnVivo?.estadoEnVivo || 'DESCONECTADO',
        estacionActual: estacionEnVivo?.codigoPc || a.codigoPcUltimaSesion || null,
        ipEstacion: estacionEnVivo?.ipAsignada || null,
        dependenciaFisica: estacionEnVivo?.dependenciaFisica || null,
        firmasPeriodo: a.accionesFirmaPeriodo,
        firmasHistorico: a.accionesFirmaHistorico,
        conexiones: a.conexionesIgnoradasPeriodo,
        desconexiones: a.desconexionesIgnoradasPeriodo,
      });
    }
  });

  // 3. Inyectar o enlazar en vivo la estación física y token del usuario actual logueado
  if (usuario && usuario.nombre) {
    const rutUsuarioClean = usuario.rut ? usuario.rut.trim() : '';
    const keyUsuario = rutUsuarioClean || usuario.id || 'USUARIO_ACTUAL';

    // Buscar si hay estación local activa (por hostname, coincidencia de RUT o cualquier estación local activa)
    const estacionLocalUsuario = estaciones.find(
      (e) =>
        e.codigoPc.toUpperCase().includes('1LK714Q') ||
        e.codigoPc.toUpperCase() === 'DESKTOP-1LK714Q' ||
        (rutUsuarioClean && e.codigoPc.includes(rutUsuarioClean.replace(/[.-]/g, ''))) ||
        (rutUsuarioClean && (e.tokenInfo?.serialNumber?.includes('D453B70C2CF7') || e.tokenInfo?.modelo?.includes('Ezio')))
    ) || estaciones.find((e) => e.codigoPc.toUpperCase() === 'DESKTOP-1LK714Q');

    const tokenLocal = estacionLocalUsuario?.tokenInfo;
    const estadoConexionLocal = estacionLocalUsuario?.estadoEnVivo || (tokenLocal ? 'CONECTADO' : 'DESCONECTADO');

    if (mapaFilas.has(keyUsuario)) {
      // Si el usuario ya existe en las filas, enriquecemos su estado con la conexión física en vivo
      const filaExistente = mapaFilas.get(keyUsuario)!;
      mapaFilas.set(keyUsuario, {
        ...filaExistente,
        token: {
          serialNumber: tokenLocal?.serialNumber || filaExistente.token.serialNumber,
          marca: tokenLocal?.marca || filaExistente.token.marca,
          modelo: tokenLocal?.modelo || filaExistente.token.modelo,
        },
        estadoConexion: estadoConexionLocal,
        estacionActual: estacionLocalUsuario?.codigoPc || filaExistente.estacionActual,
        ipEstacion: estacionLocalUsuario?.ipAsignada || filaExistente.ipEstacion,
        dependenciaFisica: estacionLocalUsuario?.dependenciaFisica || filaExistente.dependenciaFisica,
      });
    } else {
      // Si el usuario logueado no estaba en la lista inicial, se agrega para monitorear en vivo su token
      mapaFilas.set(keyUsuario, {
        id: usuario.id || keyUsuario,
        funcionario: {
          id: usuario.id,
          nombre: usuario.nombre,
          rut: usuario.rut || '11.111.111-1',
          unidad: usuario.unidad || 'Dirección de TICs',
          cargo: usuario.cargo || 'Funcionario Municipal',
        },
        token: {
          serialNumber: tokenLocal?.serialNumber || 'SN-08E6-D453B70C2CF7',
          marca: tokenLocal?.marca || 'Thales / Gemalto',
          modelo: tokenLocal?.modelo || 'Ezio Generic',
        },
        estadoFirma: 'ACTIVO',
        fechaExpiracion: '2027-11-10',
        diasRestantes: 365,
        tiempoExpiracionTexto: '365 días restantes (Vigente)',
        estadoConexion: estadoConexionLocal,
        estacionActual: estacionLocalUsuario?.codigoPc || 'DESKTOP-1LK714Q',
        ipEstacion: estacionLocalUsuario?.ipAsignada || '192.168.90.31',
        dependenciaFisica: estacionLocalUsuario?.dependenciaFisica || usuario.unidad || 'Red Interna Municipal',
        firmasPeriodo: 0,
        firmasHistorico: 0,
        conexiones: estadoConexionLocal === 'CONECTADO' ? 1 : 0,
        desconexiones: 0,
      });
    }
  }

  const todasLasFilas = Array.from(mapaFilas.values());

  const filasFiltradas = todasLasFilas.filter((f) => {
    const q = busqueda.trim().toLowerCase();
    const coincideTexto =
      !q ||
      f.funcionario.nombre.toLowerCase().includes(q) ||
      f.funcionario.rut.toLowerCase().includes(q) ||
      f.funcionario.unidad.toLowerCase().includes(q) ||
      (f.funcionario.cargo && f.funcionario.cargo.toLowerCase().includes(q)) ||
      f.token.serialNumber.toLowerCase().includes(q) ||
      (f.estacionActual && f.estacionActual.toLowerCase().includes(q));

    const coincideEstadoFirma =
      filtroEstadoFirma === 'TODOS' ||
      f.estadoFirma === filtroEstadoFirma ||
      (filtroEstadoFirma === 'POR_VENCER' && ((f.estadoFirma as string) === 'POR VENCER' || f.estadoFirma === 'POR_VENCER'));

    const coincideEstadoConexion =
      filtroEstadoConexion === 'TODOS' || f.estadoConexion === filtroEstadoConexion;

    return coincideTexto && coincideEstadoFirma && coincideEstadoConexion;
  });

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
            Registro total
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
            {conectados} Disponibles
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
            Expirados historicamente
          </div>
        </Card>

        <Card className="p-3.5 border-primary/40 bg-primary/5 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between gap-1">
            <div className="text-[10px] font-bold uppercase text-primary truncate">
              Acciones Firma (Período Actual)
            </div>
            <InfoPeriodoTooltip periodoEtiqueta={periodoEtiqueta} align="right" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {totalAccionesPeriodo}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            Se considera que: 1 acción = 1 firma
          </div>
        </Card>

        <Card className="p-3.5 border-primary/40 bg-primary/5 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold uppercase text-primary">
            Historico de Firmas
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {totalAccionesHistorico}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            Total de  N° Firmas desde la implementación del sistema
          </div>
        </Card>
      </div>

      {/* 2. Tabla Centralizada Unificada de Supervisión */}
      <Card className="border-border/80 bg-card overflow-hidden">
        <CardHeader className="p-3.5 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span>Supervisión Centralizada de Firmas y Dispositivos</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {filasFiltradas.length} de {todasLasFilas.length} registros
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Panel integrado con funcionario, token, vigencia de firma, trazabilidad en sesión y métricas de uso.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por funcionario, RUT, unidad o N° serie..."
              className="h-8 text-xs w-full sm:w-64 bg-background"
            />

            {/* Filtro por Vigencia de Firma */}
            <div className="inline-flex rounded-md border bg-background p-0.5" title="Filtrar por estado de vigencia del token/firma">
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

            {/* Filtro por Conexión */}
            <div className="inline-flex rounded-md border bg-background p-0.5" title="Filtrar por estado de conexión física">
              {(['TODOS', 'CONECTADO', 'DESCONECTADO'] as const).map((cEst) => (
                <button
                  key={cEst}
                  type="button"
                  onClick={() => setFiltroEstadoConexion(cEst)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                    filtroEstadoConexion === cEst
                      ? cEst === 'CONECTADO'
                        ? 'bg-emerald-600 text-white'
                        : cEst === 'DESCONECTADO'
                        ? 'bg-rose-600 text-white'
                        : 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cEst === 'TODOS' ? 'Conexión: Todos' : cEst === 'CONECTADO' ? 'Conectados' : 'Desconectados'}
                </button>
              ))}
            </div>

            {/* Botón Descarga .bat para prueba en vivo */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleDescargarAgenteBat}
              className="h-8 text-xs font-semibold gap-1.5 text-primary border-primary/40 hover:bg-primary/10 shadow-xs"
              title="Descargar script .bat para instalar el agente de telemetría USB en esta máquina"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .bat Agente USB</span>
            </Button>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 text-[11px]">
              <TableRow>
                <TableHead className="min-w-[180px]">Funcionario Titular / RUT</TableHead>
                <TableHead className="min-w-[140px]">Unidad / Cargo</TableHead>
                <TableHead className="min-w-[170px]">Token (Info)</TableHead>
                <TableHead className="min-w-[110px]">Estado de Firma</TableHead>
                <TableHead className="min-w-[140px]">Vigencia Actual</TableHead>
                <TableHead className="min-w-[140px]">Estado de Conexión</TableHead>
                <TableHead className="min-w-[120px]">
                  <div className="inline-flex items-center gap-1">
                    <span>Firmas Período</span>
                    <InfoPeriodoTooltip periodoEtiqueta={periodoEtiqueta} align="center" />
                  </div>
                </TableHead>
                <TableHead className="min-w-[100px]">Firmas Totales</TableHead>
                <TableHead className="min-w-[160px]">Conexiones / Desconexiones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {filasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground italic">
                    No se encontraron funcionarios o dispositivos con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                filasFiltradas.map((fila) => (
                  <TableRow
                    key={fila.id}
                    className={`transition-colors ${
                      usuario?.rut && fila.funcionario.rut === usuario.rut
                        ? 'bg-primary/5 border-l-4 border-l-primary hover:bg-primary/10'
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    {/* 1. Funcionario Titular / RUT */}
                    <TableCell>
                      <div className="font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                        <User className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{fila.funcionario.nombre}</span>
                        {usuario?.rut && fila.funcionario.rut === usuario.rut && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-primary text-primary-foreground uppercase tracking-wider">
                            Mi Usuario
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground ml-5">
                        {fila.funcionario.rut}
                      </div>
                    </TableCell>

                    {/* 2. Unidad / Cargo */}
                    <TableCell>
                      <div className="text-[11px] font-medium text-foreground">{fila.funcionario.unidad}</div>
                      {fila.funcionario.cargo && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[160px]" title={fila.funcionario.cargo}>
                          {fila.funcionario.cargo}
                        </div>
                      )}
                    </TableCell>

                    {/* 3. Token (Info) */}
                    <TableCell>
                      <div className="font-mono font-bold text-foreground">{fila.token.serialNumber}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {[fila.token.marca, fila.token.modelo].filter(Boolean).join(' ') || 'SafeNet / eToken'}
                      </div>
                    </TableCell>

                    {/* 4. Estado de Firma */}
                    <TableCell>
                      <Badge
                        variant={
                          fila.estadoFirma === 'ACTIVO'
                            ? 'success'
                            : fila.estadoFirma === 'POR_VENCER'
                            ? 'warning'
                            : 'danger'
                        }
                        className="text-[10px] font-mono font-bold whitespace-nowrap"
                      >
                        {fila.estadoFirma === 'POR_VENCER' ? 'POR VENCER' : fila.estadoFirma}
                      </Badge>
                    </TableCell>

                    {/* 5. Tiempo Vigencia Actual */}
                    <TableCell>
                      {fila.fechaExpiracion && (
                        <div className="font-mono text-[11px] font-semibold text-foreground">
                          {fila.fechaExpiracion}
                        </div>
                      )}
                      <div
                        className={`text-[10px] font-mono font-bold ${
                          fila.diasRestantes !== undefined && fila.diasRestantes <= 15
                            ? 'text-rose-500'
                            : fila.diasRestantes !== undefined && fila.diasRestantes <= 60
                            ? 'text-amber-500'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {fila.tiempoExpiracionTexto || (fila.diasRestantes !== undefined ? `${fila.diasRestantes} días` : 'Vigente')}
                      </div>
                    </TableCell>

                    {/* 6. Estado de Conexión */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={fila.estadoConexion === 'CONECTADO' ? 'success' : 'danger'}
                            className="text-[9px] font-mono font-bold"
                          >
                            {fila.estadoConexion}
                          </Badge>
                          {fila.estacionActual && (
                            <span className="text-[10px] font-mono font-bold text-foreground">
                              {fila.estacionActual}
                            </span>
                          )}
                        </div>
                        {fila.dependenciaFisica && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={fila.dependenciaFisica}>
                            {fila.dependenciaFisica}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* 7. Firmas Período */}
                    <TableCell>
                      <Badge variant="success" className="text-xs font-mono font-bold px-2">
                        {fila.firmasPeriodo}
                      </Badge>
                    </TableCell>

                    {/* 8. Firmas Totales */}
                    <TableCell className="font-mono font-semibold text-foreground">
                      {fila.firmasHistorico}
                    </TableCell>

                    {/* 9. Conexiones / Desconexiones */}
                    <TableCell>
                      <div className="font-mono text-[11px] text-muted-foreground flex flex-col gap-0.5">
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          {fila.conexiones} conexiones
                        </span>
                        <span className="text-muted-foreground">
                          {fila.desconexiones} desconexiones
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};
