import React, { useState } from 'react';
import { Info, User, Download, Terminal, Usb, Laptop } from 'lucide-react';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { useAuthStore } from '../store/useAuthStore';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { formatRutVisual } from '../lib/rut';
import { cleanIpVisual } from '../lib/ip';

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

  // 1. Estado de conexión en vivo
  const conectados = estaciones.filter((e) => e.estadoEnVivo === 'CONECTADO').length;

  // 2. Firmas Asignadas y Acciones
  const listadoFirmas = metricas?.firmasAsignadas?.listado || [];
  const listadoAccionesFuncionarios = metricas?.accionesFuncionarios?.listadoPorFuncionario || [];
  const trazabilidadDispositivos = metricas?.telemetria?.trazabilidadDispositivos || [];
  const totalAccionesPeriodo =
    metricas?.accionesFuncionarios?.totalAccionesFirmaPeriodo ??
    listadoAccionesFuncionarios.reduce((acc, item) => acc + item.accionesFirmaPeriodo, 0);
  const totalAccionesHistorico =
    metricas?.accionesFuncionarios?.totalAccionesFirmaHistorico ??
    listadoAccionesFuncionarios.reduce((acc, item) => acc + item.accionesFirmaHistorico, 0);
  const periodoEtiqueta = metricas?.periodo?.etiquetaPeriodo || 'Últimos 30 días';

  const formatearHorasMinutos = (totalMinutos?: number): string => {
    const mins = Math.max(0, Math.round(totalMinutos || 0));
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs} hrs ${String(remMins).padStart(2, '0')} mins`;
  };

  // Consolidación de datos unificados por Funcionario/Token
  interface FilaCentralizada {
    id: string;
    funcionario: {
      id?: string;
      nombre: string;
      rut: string;
      email?: string;
      unidad: string;
      cargo?: string;
      extraidoDeToken?: boolean;
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
    conexiones: number;
    desconexiones: number;
    tiempoUsoMinutos: number;
    promedioUsoDiarioMinutos: number;
    minutosSesionEnVivo?: number;
  }

  // Mapa combinado
  const mapaFilas = new Map<string, FilaCentralizada>();

  // 1. Poblamos desde listadoFirmas
  listadoFirmas.forEach((f) => {
    const key = f.serialNumberToken || f.funcionario?.rut || f.id;
    const estacionEnVivo = estaciones.find(
      (e) =>
        e.estadoEnVivo === 'CONECTADO' &&
        e.tokenInfo?.serialNumber &&
        e.tokenInfo.serialNumber.toLowerCase() === f.serialNumberToken.toLowerCase()
    );

    const accionData = listadoAccionesFuncionarios.find(
      (a) =>
        (f.funcionario?.rut && a.rut === f.funcionario.rut) ||
        (f.serialNumberToken && a.serialNumberToken === f.serialNumberToken)
    );
    const trazaData = trazabilidadDispositivos.find(
      (t) =>
        (f.serialNumberToken && t.serialNumber.toLowerCase() === f.serialNumberToken.toLowerCase()) ||
        (f.funcionario?.rut && t.funcionarioAsignado?.rut === f.funcionario.rut)
    );

    const estadoConexionFinal = estacionEnVivo
      ? estacionEnVivo.estadoEnVivo
      : f.estadoConexion || 'DESCONECTADO';

    const titularTokenVivo = estacionEnVivo?.tokenInfo?.titularNombre || trazaData?.funcionarioAsignado?.nombre;
    const extraidoDeToken = Boolean(
      estacionEnVivo?.tokenInfo?.titularNombre || trazaData?.funcionarioAsignado?.origenCertificado
    );

    mapaFilas.set(key, {
      id: f.id || key,
      funcionario: {
        id: f.funcionario?.id,
        nombre: titularTokenVivo || f.funcionario?.nombre || 'Funcionario Municipal',
        rut: f.funcionario?.rut || trazaData?.funcionarioAsignado?.rut || 'Sin RUT',
        email: estacionEnVivo?.tokenInfo?.titularEmail || trazaData?.funcionarioAsignado?.email || f.funcionario?.email,
        unidad:
          estacionEnVivo?.tokenInfo?.titularUnidad ||
          trazaData?.funcionarioAsignado?.unidad ||
          f.funcionario?.unidad ||
          'Municipalidad',
        cargo:
          estacionEnVivo?.tokenInfo?.titularCargo ||
          trazaData?.funcionarioAsignado?.cargo ||
          f.funcionario?.cargo,
        extraidoDeToken,
      },
      token: {
        serialNumber: f.serialNumberToken || 'SN-SIN-TOKEN',
        marca: estacionEnVivo?.tokenInfo?.marca || f.marca,
        modelo: estacionEnVivo?.tokenInfo?.modelo || f.modelo,
      },
      estadoFirma: (f.estado as any) === 'POR VENCER' ? 'POR_VENCER' : f.estado,
      fechaExpiracion: f.fechaExpiracion,
      diasRestantes: f.diasRestantes,
      tiempoExpiracionTexto: f.tiempoExpiracionTexto,
      estadoConexion: estadoConexionFinal,
      estacionActual: estacionEnVivo?.codigoPc || f.estacionActual || null,
      ipEstacion: estacionEnVivo?.ipAsignada || null,
      dependenciaFisica: estacionEnVivo?.dependenciaFisica || null,
      conexiones: trazaData?.conexionesPeriodo ?? accionData?.conexionesIgnoradasPeriodo ?? 0,
      desconexiones: trazaData?.desconexionesPeriodo ?? accionData?.desconexionesIgnoradasPeriodo ?? 0,
      tiempoUsoMinutos: trazaData?.tiempoUsoMinutos ?? f.tiempoUsoMinutos ?? 0,
      promedioUsoDiarioMinutos: trazaData?.promedioUsoDiarioMinutos ?? f.promedioUsoDiarioMinutos ?? 0,
      minutosSesionEnVivo: estacionEnVivo?.minutosConectado,
    });
  });

  // 2. Complementamos desde trazabilidadDispositivos (incluye tokens físicos detectados por Ghost App)
  trazabilidadDispositivos.forEach((t) => {
    const yaExiste = Array.from(mapaFilas.values()).some(
      (f) => f.token.serialNumber.toLowerCase() === t.serialNumber.toLowerCase()
    );
    if (!yaExiste) {
      const estacionEnVivo = estaciones.find(
        (e) =>
          e.estadoEnVivo === 'CONECTADO' &&
          e.tokenInfo?.serialNumber &&
          e.tokenInfo.serialNumber.toLowerCase() === t.serialNumber.toLowerCase()
      );
      const tokenVivo = estacionEnVivo?.tokenInfo;
      const nombreTitular =
        tokenVivo?.titularNombre ||
        t.funcionarioAsignado?.nombre ||
        'Token Detectado (Sin Asignar)';
      const emailTitular = tokenVivo?.titularEmail || t.funcionarioAsignado?.email;
      const fechaExp = tokenVivo?.certNotAfter
        ? tokenVivo.certNotAfter.slice(0, 10)
        : t.fechaExpiracion;
      const diasRest =
        fechaExp && t.diasRestantes === undefined
          ? Math.ceil((new Date(fechaExp).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : t.diasRestantes;

      mapaFilas.set(t.serialNumber, {
        id: t.id || t.serialNumber,
        funcionario: {
          nombre: nombreTitular,
          rut: t.funcionarioAsignado?.rut || emailTitular || 'Certificado del Token',
          email: emailTitular,
          unidad:
            tokenVivo?.titularUnidad ||
            t.funcionarioAsignado?.unidad ||
            estacionEnVivo?.dependenciaFisica ||
            'Ilustre Municipalidad de Coquimbo',
          cargo: tokenVivo?.titularCargo || t.funcionarioAsignado?.cargo || 'Titular Certificado FEA',
          extraidoDeToken: Boolean(tokenVivo?.titularNombre || t.funcionarioAsignado?.origenCertificado),
        },
        token: {
          serialNumber: t.serialNumber,
          marca: tokenVivo?.marca || t.marca,
          modelo: tokenVivo?.modelo || t.modelo,
        },
        estadoFirma:
          diasRest !== undefined && diasRest <= 0
            ? 'EXPIRADO'
            : diasRest !== undefined && diasRest <= 60
            ? 'POR_VENCER'
            : 'ACTIVO',
        fechaExpiracion: fechaExp,
        diasRestantes: diasRest,
        tiempoExpiracionTexto:
          t.tiempoExpiracionTexto ||
          (diasRest !== undefined
            ? diasRest <= 0
              ? `Expirado hace ${Math.abs(diasRest)} días`
              : `${diasRest} días restantes`
            : 'Vigente'),
        estadoConexion: estacionEnVivo?.estadoEnVivo || t.estadoEnVivo || 'DESCONECTADO',
        estacionActual: estacionEnVivo?.codigoPc || t.estacionActual || null,
        ipEstacion: cleanIpVisual(estacionEnVivo?.ipAsignada || t.ultimaIp || null),
        dependenciaFisica: estacionEnVivo?.dependenciaFisica || t.dependenciaFisica || null,
        conexiones: t.conexionesPeriodo ?? 0,
        desconexiones: t.desconexionesPeriodo ?? 0,
        tiempoUsoMinutos: t.tiempoUsoMinutos ?? 0,
        promedioUsoDiarioMinutos: t.promedioUsoDiarioMinutos ?? 0,
        minutosSesionEnVivo: estacionEnVivo?.minutosConectado,
      });
    }
  });

  // 3. Sincronizar dinámicamente TODAS las estaciones activas (solo por N° de serie del token activo, sin pisar otros tokens de la misma PC)
  estaciones.forEach((est) => {
    const tokenVivo = est.tokenInfo;
    if (!tokenVivo?.serialNumber) return;
    const serialDetectado = tokenVivo.serialNumber;
    if (serialDetectado.startsWith('SN-WIN-') && serialDetectado.endsWith('-UNKNOWN')) return;

    const trazaPorSerial = trazabilidadDispositivos.find(
      (t) => t.serialNumber.toLowerCase() === serialDetectado.toLowerCase()
    );

    const nombreTitular =
      tokenVivo.titularNombre ||
      trazaPorSerial?.funcionarioAsignado?.nombre;
    const rutTitular =
      tokenVivo.titularRut ||
      trazaPorSerial?.funcionarioAsignado?.rut;
    const emailTitular =
      tokenVivo.titularEmail ||
      trazaPorSerial?.funcionarioAsignado?.email;
    const cargoTitular =
      tokenVivo.titularCargo ||
      trazaPorSerial?.funcionarioAsignado?.cargo;
    const unidadTitular =
      tokenVivo.titularUnidad ||
      trazaPorSerial?.funcionarioAsignado?.unidad;
    const fechaExpCert = tokenVivo.certNotAfter
      ? tokenVivo.certNotAfter.slice(0, 10)
      : trazaPorSerial?.fechaExpiracion;

    // Buscar fila existente únicamente por N° de serie del token
    const existingEntry = Array.from(mapaFilas.entries()).find(
      ([, val]) => val.token.serialNumber.toLowerCase() === serialDetectado.toLowerCase()
    );

    const keyTarget = existingEntry ? existingEntry[0] : serialDetectado;
    const prevRow = existingEntry ? existingEntry[1] : undefined;

    const diasRest =
      fechaExpCert
        ? Math.ceil((new Date(fechaExpCert).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : prevRow?.diasRestantes;

    const esExtraidoCert = Boolean(
      tokenVivo?.titularNombre ||
      trazaPorSerial?.funcionarioAsignado?.origenCertificado ||
      prevRow?.funcionario.extraidoDeToken
    );

    mapaFilas.set(keyTarget, {
      id: prevRow?.id || serialDetectado,
      funcionario: {
        id: prevRow?.funcionario.id,
        nombre: nombreTitular || prevRow?.funcionario.nombre || 'Token Criptográfico Detectado',
        rut: rutTitular || prevRow?.funcionario.rut || emailTitular || 'Certificado del Token',
        email: emailTitular || prevRow?.funcionario.email,
        unidad: unidadTitular || prevRow?.funcionario.unidad || est.dependenciaFisica || 'Ilustre Municipalidad de Coquimbo',
        cargo: cargoTitular || prevRow?.funcionario.cargo || 'Profesional',
        extraidoDeToken: esExtraidoCert,
      },
      token: {
        serialNumber: serialDetectado,
        marca: tokenVivo?.marca || prevRow?.token.marca || trazaPorSerial?.marca || 'Thales / SafeNet',
        modelo: tokenVivo?.modelo || prevRow?.token.modelo || trazaPorSerial?.modelo || 'Token USB',
      },
      estadoFirma:
        diasRest !== undefined && diasRest <= 0
          ? 'EXPIRADO'
          : diasRest !== undefined && diasRest <= 60
          ? 'POR_VENCER'
          : prevRow?.estadoFirma || 'ACTIVO',
      fechaExpiracion: fechaExpCert || prevRow?.fechaExpiracion,
      diasRestantes: diasRest,
      tiempoExpiracionTexto:
        prevRow?.tiempoExpiracionTexto ||
        (diasRest !== undefined
          ? diasRest <= 0
            ? `Expirado hace ${Math.abs(diasRest)} días`
            : `${diasRest} días restantes`
          : 'Vigente'),
      estadoConexion: est.estadoEnVivo,
      estacionActual: est.codigoPc,
      ipEstacion: cleanIpVisual(est.ipAsignada || prevRow?.ipEstacion || null),
      dependenciaFisica: est.dependenciaFisica || prevRow?.dependenciaFisica || null,
      conexiones:
        trazaPorSerial?.conexionesPeriodo ??
        prevRow?.conexiones ??
        (est.estadoEnVivo === 'CONECTADO' ? 1 : 0),
      desconexiones:
        trazaPorSerial?.desconexionesPeriodo ??
        prevRow?.desconexiones ??
        0,
      tiempoUsoMinutos:
        trazaPorSerial?.tiempoUsoMinutos ??
        prevRow?.tiempoUsoMinutos ??
        0,
      promedioUsoDiarioMinutos:
        trazaPorSerial?.promedioUsoDiarioMinutos ??
        prevRow?.promedioUsoDiarioMinutos ??
        0,
      minutosSesionEnVivo: est.minutosConectado ?? prevRow?.minutosSesionEnVivo,
    });
  });

  const todasLasFilas = Array.from(mapaFilas.values())
    .filter((f) => !(f.token.serialNumber.startsWith('SN-WIN-') && f.token.serialNumber.endsWith('-UNKNOWN')))
    .sort((a, b) => {
      // Priorizar en la parte superior los tokens detectados por certificado X.509 o conectados en vivo
      const aScore = (a.funcionario.extraidoDeToken ? 2 : 0) + (a.estadoConexion === 'CONECTADO' ? 1 : 0);
      const bScore = (b.funcionario.extraidoDeToken ? 2 : 0) + (b.estadoConexion === 'CONECTADO' ? 1 : 0);
      return bScore - aScore;
    });

  const dispExistentes = todasLasFilas.length;
  const dispExpirados = todasLasFilas.filter((f) => f.estadoFirma === 'EXPIRADO').length;
  const dispActivos = Math.max(0, dispExistentes - dispExpirados);
  const promedioUsoDiarioGeneralMinutos =
    metricas?.telemetria?.promedioUsoDiarioGeneralMinutos ??
    (todasLasFilas.length > 0
      ? Math.round(
          todasLasFilas.reduce((acc, f) => acc + f.promedioUsoDiarioMinutos, 0) /
            todasLasFilas.length,
        )
      : 0);

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

      {/* 1. Fila Compacta de KPIs Esenciales de Trazabilidad de Tokens */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            {conectados} Conectados en vivo
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
            Expirados históricamente
          </div>
        </Card>

        <Card className="p-3.5 border-sky-500/30 bg-sky-500/5">
          <div className="text-[10px] font-bold uppercase text-sky-600 dark:text-sky-400">
            Promedio Uso Diario
          </div>
          <div className="text-xl font-bold text-foreground mt-1 font-mono">
            {formatearHorasMinutos(promedioUsoDiarioGeneralMinutos)}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            Promedio diario por token
          </div>
        </Card>
      </div>

      {/* 2. Tabla Centralizada Unificada de Supervisión */}
      <Card className="border-border/80 bg-card overflow-hidden">
        <CardHeader className="p-3.5 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span>Supervisión Centralizada de Tokens y Trazabilidad USB</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {filasFiltradas.length} de {todasLasFilas.length} registros
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Panel integrado con titular extraído del certificado del token, vigencia, trazabilidad en sesión y métricas de uso.
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
            <div className="inline-flex rounded-md border bg-background p-0.5" title="Filtrar por estado de vigencia del token">
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

            {/* Botón Descarga Agente USB */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleDescargarAgenteBat}
              className="h-8 text-xs font-semibold gap-1.5 text-primary border-primary/40 hover:bg-primary/10 shadow-xs"
              title="Descargar instalador para el agente de telemetría USB en esta máquina"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar agente USB</span>
            </Button>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 text-[11px]">
              <TableRow>
                <TableHead className="min-w-[200px]">Funcionario Titular / Identificación</TableHead>
                <TableHead className="min-w-[160px]">Unidad / Cargo</TableHead>
                <TableHead className="min-w-[175px]">Token (Info)</TableHead>
                <TableHead className="min-w-[115px]">Estado del Token</TableHead>
                <TableHead className="min-w-[140px]">Vigencia Actual</TableHead>
                <TableHead className="min-w-[155px]">Estado de Conexión</TableHead>
                <TableHead className="min-w-[175px]">Trazabilidad (Conex. / Desconex.)</TableHead>
                <TableHead className="min-w-[165px]">Tiempo de Uso (Total / Prom.)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {filasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground italic">
                    No se encontraron funcionarios o dispositivos con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                filasFiltradas.map((fila) => (
                  <TableRow
                    key={fila.id}
                    className={`transition-colors ${
                      fila.funcionario.extraidoDeToken || (usuario?.rut && fila.funcionario.rut === usuario.rut)
                        ? 'bg-primary/5 border-l-4 border-l-primary hover:bg-primary/10'
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    {/* 1. Funcionario Titular / Identificación */}
                    <TableCell>
                      <div className="font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                        <User className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{fila.funcionario.nombre}</span>
                        {fila.funcionario.extraidoDeToken && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-emerald-600 text-white uppercase tracking-wider">
                            Titular Token USB
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground ml-5">
                        {fila.funcionario.rut.includes('@')
                          ? fila.funcionario.rut
                          : formatRutVisual(fila.funcionario.rut)}
                      </div>
                    </TableCell>

                    {/* 2. Unidad / Cargo */}
                    <TableCell>
                      <div className="text-[11px] font-medium text-foreground">{fila.funcionario.unidad}</div>
                      {fila.funcionario.cargo && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[180px]" title={fila.funcionario.cargo}>
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

                    {/* 4. Estado del Token */}
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

                    {/* 6. Estado de Conexión y Red */}
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
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {fila.ipEstacion
                            ? `${fila.estadoConexion === 'CONECTADO' ? 'IP' : 'Última IP'}: ${fila.ipEstacion}`
                            : 'Red Municipal'}
                          {fila.dependenciaFisica ? ` • ${fila.dependenciaFisica}` : ''}
                        </div>
                      </div>
                    </TableCell>

                    {/* 7. Contador de Trazabilidad (Conexiones / Desconexiones) */}
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

                    {/* 8. Tiempo de uso total en el período y promedio diario (hrs; mins) */}
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      <div className="font-bold text-foreground">
                        Total: {formatearHorasMinutos(
                          Math.max(fila.tiempoUsoMinutos, fila.estadoConexion === 'CONECTADO' ? (fila.minutosSesionEnVivo || 0) : 0),
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Prom. día: {formatearHorasMinutos(fila.promedioUsoDiarioMinutos)}
                      </div>
                      {fila.estadoConexion === 'CONECTADO' && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Sesión actual: {formatearHorasMinutos(fila.minutosSesionEnVivo || 0)}
                        </div>
                      )}
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
