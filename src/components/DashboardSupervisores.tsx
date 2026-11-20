import React, { useState, useEffect } from 'react';
import { User, Download, Mail, CheckCircle2, Eye, X } from 'lucide-react';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { useAuthStore } from '../store/useAuthStore';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { formatRutVisual } from '../lib/rut';
import { cleanIpVisual } from '../lib/ip';

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
  const [ahoraMs, setAhoraMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setAhoraMs(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const calcularMinutosEnVivo = (est?: { estadoEnVivo?: string; minutosConectado?: number; conectadoDesde?: string }) => {
    if (!est || est.estadoEnVivo !== 'CONECTADO') return 0;
    const desdeMs = est.conectadoDesde ? new Date(est.conectadoDesde).getTime() : NaN;
    const calc = !Number.isNaN(desdeMs) ? Math.max(0, Math.floor((ahoraMs - desdeMs) / 60000)) : 0;
    return Math.max(est.minutosConectado || 0, calc);
  };

  const [enviandoAvisoId, setEnviandoAvisoId] = useState<string | null>(null);
  const [avisosEnviadosMap, setAvisosEnviadosMap] = useState<Record<string, string>>({});
  const [correoPreview, setCorreoPreview] = useState<{
    funcionarioNombre: string;
    emailDestino: string;
    serialNumber: string;
    asunto: string;
    cuerpoCorreo: string;
    htmlCorreo?: string;
    enviadoSmtp: boolean;
    motivoSmtp?: string;
    timestamp: string;
    filaRef?: FilaCentralizada;
  } | null>(null);

  const handleDescargarAgenteBat = () => {
    window.location.href = '/api/v1/telemetria/descargar-agente?unidad=Red%20Interna%20Municipal';
    setMensajeAccion('Descargando script autoinstalador .bat del Agente USB para probar en vivo...');
  };

  const conectados = estaciones.filter((e) => e.estadoEnVivo === 'CONECTADO').length;
  const listadoFirmas = metricas?.firmasAsignadas?.listado || [];
  const listadoAccionesFuncionarios = metricas?.accionesFuncionarios?.listadoPorFuncionario || [];
  const trazabilidadDispositivos = metricas?.telemetria?.trazabilidadDispositivos || [];

  const formatearHorasMinutos = (totalMinutos?: number): string => {
    const mins = Math.max(0, Math.round(totalMinutos || 0));
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs} hrs ${String(remMins).padStart(2, '0')} mins`;
  };

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

  const mapaFilas = new Map<string, FilaCentralizada>();

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
      minutosSesionEnVivo: calcularMinutosEnVivo(estacionEnVivo),
    });
  });

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
        minutosSesionEnVivo: calcularMinutosEnVivo(estacionEnVivo),
      });
    }
  });

  // Sincroniza estaciones activas por N° de serie sin sobrescribir otros tokens de la misma PC
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
      minutosSesionEnVivo: calcularMinutosEnVivo(est) || prevRow?.minutosSesionEnVivo,
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

  const handleEnviarAvisoCorreo = async (fila: FilaCentralizada, soloPreview = false) => {
    setEnviandoAvisoId(fila.id);
    const ahoraStr = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const emailDestino =
      fila.funcionario.email ||
      `${fila.funcionario.rut.toLowerCase().replace(/[^0-9k]/g, '')}@municoquimbo.cl`;

    let asunto = `Aviso Institucional: Estado y Vigencia de Token Firma Electrónica (${fila.token.serialNumber})`;
    let cuerpoCorreo = `Estimado(a) ${fila.funcionario.nombre},\n\nLe informamos que su dispositivo de Firma Electrónica Avanzada (N° Serie: ${fila.token.serialNumber}) asignado a la unidad ${fila.funcionario.unidad} se encuentra actualmente registrado en la plataforma de control y trazabilidad municipal.\n\nEstado de Vigencia: ${fila.tiempoExpiracionTexto || fila.estadoFirma}\nFecha Expiración Certificado: ${fila.fechaExpiracion || 'Por determinar'}\n\nPor favor mantenga su dispositivo en custodia y conéctelo únicamente durante la jornada laboral en su estación autorizada.\n\nAtentamente,\nUnidad de Transformación Digital\nIlustre Municipalidad de Coquimbo`;
    let htmlCorreo: string | undefined;
    let enviadoSmtp = false;
    let motivoSmtp = soloPreview ? 'Vista previa generada' : 'Aviso despachado al servidor de correo';

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/usuarios/alertas-vencimiento/despachar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          certificadoId: fila.id,
          serialNumber: fila.token.serialNumber,
          email: emailDestino,
          nombre: fila.funcionario.nombre,
          rut: formatRutVisual(fila.funcionario.rut),
          fechaExpiracion: fila.fechaExpiracion || '2027-01-01',
          diasRestantes: fila.diasRestantes ?? 365,
          soloPreview,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.asunto) asunto = data.asunto;
        if (data?.cuerpoCorreo) cuerpoCorreo = data.cuerpoCorreo;
        if (data?.htmlCorreo) htmlCorreo = data.htmlCorreo;
        enviadoSmtp = Boolean(data?.enviadoSmtp);
        motivoSmtp = data?.motivoSmtp || motivoSmtp;
      }
    } catch {
      // Fallback local optimista
    }

    if (!soloPreview) {
      setAvisosEnviadosMap((prev) => ({ ...prev, [fila.id]: ahoraStr }));
      setMensajeAccion(`Aviso por correo despachado con éxito a ${fila.funcionario.nombre} (${emailDestino})`);
    }

    setCorreoPreview({
      funcionarioNombre: fila.funcionario.nombre,
      emailDestino,
      serialNumber: fila.token.serialNumber,
      asunto,
      cuerpoCorreo,
      htmlCorreo,
      enviadoSmtp,
      motivoSmtp,
      timestamp: ahoraStr,
      filaRef: fila,
    });

    setEnviandoAvisoId(null);
  };

  return (
    <div className="space-y-5">
      {mensajeAccion && (
        <div className="p-2.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-xs font-mono text-foreground flex flex-wrap items-center justify-between gap-2">
          <span className="break-words">✓ {mensajeAccion}</span>
          <button
            onClick={() => setMensajeAccion(null)}
            className="text-[10px] underline ml-auto text-muted-foreground hover:text-foreground shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3.5 min-w-0">
          <div className="text-[10px] font-bold uppercase text-muted-foreground">
            Dispositivos Existentes
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">{dispExistentes}</div>
          <div className="text-[11px] text-muted-foreground font-mono">
            Registro total
          </div>
        </Card>

        <Card className="p-3.5 min-w-0 border-emerald-500/30 bg-emerald-500/5">
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

        <Card className="p-3.5 min-w-0 border-rose-500/30 bg-rose-500/5">
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

        <Card className="p-3.5 min-w-0 border-sky-500/30 bg-sky-500/5">
          <div className="text-[10px] font-bold uppercase text-sky-600 dark:text-sky-400">
            Promedio Uso Diario
          </div>
          <div className="text-lg sm:text-xl font-bold text-foreground mt-1 font-mono truncate">
            {formatearHorasMinutos(promedioUsoDiarioGeneralMinutos)}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            Promedio diario por token
          </div>
        </Card>
      </div>

      {correoPreview && (
        <Card className="border-2 border-emerald-500/60 bg-emerald-500/5 shadow-lg overflow-hidden animate-in fade-in-50 duration-200">
          <CardHeader className="p-4 pb-2 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-semibold flex items-center gap-1.5 ${
                    correoPreview.enviadoSmtp
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      correoPreview.enviadoSmtp ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  {correoPreview.enviadoSmtp ? 'Despachado por SMTP Institucional' : correoPreview.motivoSmtp || 'Aviso preparado'}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  • {correoPreview.timestamp}
                </span>
              </div>
              <CardTitle className="text-sm font-bold text-foreground">
                Comprobante y Detalle del Aviso por Correo al Titular del Token
              </CardTitle>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {correoPreview.filaRef && !avisosEnviadosMap[correoPreview.filaRef.id] && (
                <Button
                  size="sm"
                  variant="default"
                  disabled={enviandoAvisoId === correoPreview.filaRef.id}
                  onClick={() => handleEnviarAvisoCorreo(correoPreview.filaRef!, false)}
                  className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  <Mail className="w-3 h-3" />
                  <span>{enviandoAvisoId === correoPreview.filaRef.id ? 'Despachando...' : 'Confirmar Envío'}</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCorreoPreview(null)}
                className="h-7 text-xs font-bold gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cerrar</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded bg-background/80 border font-mono text-[11px]">
              <div className="min-w-0">
                <span className="text-muted-foreground block text-[10px]">CORREO DESTINATARIO:</span>
                <span className="font-bold text-foreground break-all">{correoPreview.emailDestino}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground block text-[10px]">TITULAR NOTIFICADO:</span>
                <span className="font-bold text-foreground break-words">{correoPreview.funcionarioNombre}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground block text-[10px]">TOKEN ASOCIADO:</span>
                <span className="font-bold text-primary break-all">{correoPreview.serialNumber}</span>
              </div>
            </div>
            <div className="p-3 rounded bg-background border space-y-2">
              <div className="text-[11px] font-semibold text-foreground border-b pb-1 break-words">
                Asunto: {correoPreview.asunto}
              </div>
              {correoPreview.htmlCorreo ? (
                <div className="overflow-x-auto bg-zinc-50 dark:bg-zinc-900 p-3 rounded border max-h-[400px] overflow-y-auto">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: correoPreview.htmlCorreo.replace(
                        /cid:escudo_municoquimbo/g,
                        '/logo-municipalidad.png',
                      ),
                    }}
                  />
                </div>
              ) : (
                <pre className="text-[11px] font-mono whitespace-pre-wrap text-muted-foreground leading-relaxed bg-muted/20 p-3 rounded border">
                  {correoPreview.cuerpoCorreo}
                </pre>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/80 bg-card overflow-hidden">
        <CardHeader className="p-3.5 border-b bg-muted/20 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm font-bold flex flex-wrap items-center gap-2">
              <span>Supervisión Centralizada de Tokens y Trazabilidad USB</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {filasFiltradas.length} de {todasLasFilas.length} registros
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Panel integrado con titular extraído del certificado del token, vigencia, trazabilidad en sesión y métricas de uso.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por funcionario, RUT, unidad o N° serie..."
              className="h-8 text-xs w-full sm:w-64 bg-background"
            />

            <div className="inline-flex flex-wrap rounded-md border bg-background p-0.5 w-full sm:w-auto" title="Filtrar por estado de vigencia del token">
              {(['TODOS', 'ACTIVO', 'POR_VENCER', 'EXPIRADO'] as const).map((est) => (
                <button
                  key={est}
                  type="button"
                  onClick={() => setFiltroEstadoFirma(est)}
                  className={`flex-1 sm:flex-initial px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                    filtroEstadoFirma === est
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {est === 'TODOS' ? 'Todas' : est === 'POR_VENCER' ? 'Por Vencer' : est}
                </button>
              ))}
            </div>

            <div className="inline-flex flex-wrap rounded-md border bg-background p-0.5 w-full sm:w-auto" title="Filtrar por estado de conexión física">
              {(['TODOS', 'CONECTADO', 'DESCONECTADO'] as const).map((cEst) => (
                <button
                  key={cEst}
                  type="button"
                  onClick={() => setFiltroEstadoConexion(cEst)}
                  className={`flex-1 sm:flex-initial px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
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

            <Button
              size="sm"
              variant="outline"
              onClick={handleDescargarAgenteBat}
              className="h-8 w-full sm:w-auto justify-center text-xs font-semibold gap-1.5 text-primary border-primary/40 hover:bg-primary/10 shadow-sm"
              title="Descargar instalador para el agente de telemetría USB en esta máquina"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar agente USB</span>
            </Button>
          </div>
        </CardHeader>

        <div className="hidden md:block overflow-x-auto">
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
                <TableHead className="text-right min-w-[150px]">Aviso por Correo</TableHead>
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
                      fila.funcionario.extraidoDeToken || (usuario?.rut && fila.funcionario.rut === usuario.rut)
                        ? 'bg-primary/5 border-l-4 border-l-primary hover:bg-primary/10'
                        : 'hover:bg-muted/30'
                    }`}
                  >
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

                    <TableCell>
                      <div className="text-[11px] font-medium text-foreground">{fila.funcionario.unidad}</div>
                      {fila.funcionario.cargo && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[180px]" title={fila.funcionario.cargo}>
                          {fila.funcionario.cargo}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="font-mono font-bold text-foreground">{fila.token.serialNumber}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {[fila.token.marca, fila.token.modelo].filter(Boolean).join(' ') || 'SafeNet / eToken'}
                      </div>
                    </TableCell>

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

                    <TableCell className="text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {avisosEnviadosMap[fila.id] ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Enviado ({avisosEnviadosMap[fila.id]})</span>
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEnviarAvisoCorreo(fila, true)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="Ver vista previa del correo enviado"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={enviandoAvisoId === fila.id}
                              onClick={() => handleEnviarAvisoCorreo(fila, true)}
                              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                              title="Ver vista previa antes de despachar"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              <span>Ver</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              disabled={enviandoAvisoId === fila.id}
                              onClick={() => handleEnviarAvisoCorreo(fila, false)}
                              className="h-7 text-xs font-semibold px-2.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-1"
                              title={`Enviar aviso formal por correo a ${fila.funcionario.nombre}`}
                            >
                              <Mail className="w-3 h-3" />
                              <span>{enviandoAvisoId === fila.id ? 'Enviando...' : 'Aviso Correo'}</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="block md:hidden divide-y divide-border/70">
          {filasFiltradas.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-muted-foreground italic">
              No se encontraron funcionarios o dispositivos con los filtros seleccionados.
            </div>
          ) : (
            filasFiltradas.map((fila) => (
              <div
                key={`mobile-${fila.id}`}
                className={`p-3.5 space-y-2.5 text-xs ${
                  fila.funcionario.extraidoDeToken || (usuario?.rut && fila.funcionario.rut === usuario.rut)
                    ? 'bg-primary/5 border-l-4 border-l-primary'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                      <User className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="break-words">{fila.funcionario.nombre}</span>
                      {fila.funcionario.extraidoDeToken && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-600 text-white uppercase tracking-wider">
                          Titular Token USB
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      {fila.funcionario.rut.includes('@')
                        ? fila.funcionario.rut
                        : formatRutVisual(fila.funcionario.rut)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
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
                    <Badge
                      variant={fila.estadoConexion === 'CONECTADO' ? 'success' : 'danger'}
                      className="text-[9px] font-mono font-bold"
                    >
                      {fila.estadoConexion}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/20 p-2.5 rounded-md border border-border/50">
                  <div className="min-w-0">
                    <span className="text-[10px] text-muted-foreground block">Token / Modelo</span>
                    <span className="font-mono font-bold text-foreground break-all">{fila.token.serialNumber}</span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {[fila.token.marca, fila.token.modelo].filter(Boolean).join(' ') || 'SafeNet / eToken'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-muted-foreground block">Unidad</span>
                    <span className="font-medium text-foreground block break-words">{fila.funcionario.unidad}</span>
                    {fila.estacionActual && (
                      <span className="text-[10px] font-mono text-muted-foreground block truncate">
                        {fila.estacionActual}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Vigencia</span>
                    <span className="font-mono font-semibold text-foreground block">
                      {fila.fechaExpiracion || '-'}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        fila.diasRestantes !== undefined && fila.diasRestantes <= 15
                          ? 'text-rose-500'
                          : fila.diasRestantes !== undefined && fila.diasRestantes <= 60
                          ? 'text-amber-500'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {fila.tiempoExpiracionTexto || (fila.diasRestantes !== undefined ? `${fila.diasRestantes} días` : 'Vigente')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Uso y Trazabilidad</span>
                    <span className="font-mono font-bold text-foreground block">
                      {formatearHorasMinutos(
                        Math.max(fila.tiempoUsoMinutos, fila.estadoConexion === 'CONECTADO' ? (fila.minutosSesionEnVivo || 0) : 0),
                      )}
                    </span>
                    {fila.estadoConexion === 'CONECTADO' && (
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold block">
                        Sesión actual: {formatearHorasMinutos(fila.minutosSesionEnVivo || 0)}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {fila.conexiones} conex. / {fila.desconexiones} desc.
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-0.5">
                  {avisosEnviadosMap[fila.id] ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Enviado ({avisosEnviadosMap[fila.id]})</span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEnviarAvisoCorreo(fila, true)}
                        className="h-7 px-2 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        <span>Ver</span>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={enviandoAvisoId === fila.id}
                        onClick={() => handleEnviarAvisoCorreo(fila, true)}
                        className="h-7 text-xs px-2.5"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        <span>Ver</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        disabled={enviandoAvisoId === fila.id}
                        onClick={() => handleEnviarAvisoCorreo(fila, false)}
                        className="h-7 text-xs font-semibold px-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-1"
                      >
                        <Mail className="w-3 h-3" />
                        <span>{enviandoAvisoId === fila.id ? 'Enviando...' : 'Aviso Correo'}</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
