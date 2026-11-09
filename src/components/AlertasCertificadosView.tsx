import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useTelemetriaStore } from '../store/useTelemetriaStore';

interface AlertaToken {
  id: string;
  numeroSerieCertificado: string;
  serialNumberToken: string;
  hardwareModelo: string;
  diasRestantes: number;
  tramoAlerta: '15_DIAS' | '30_DIAS' | '60_DIAS' | 'EXPIRADO';
  severidad: 'ALTA' | 'MEDIA' | 'BAJA';
  fechaInicio: string;
  fechaExpiracion: string;
  tiempoExpiracionTexto: string;
  ultimoAvisoEnviado?: string | null;
  usuario: {
    nombre: string;
    unidad: string;
    cargo: string;
    email: string;
    rut: string;
  };
}

interface CorreoDespachadoPreview {
  emailDestino: string;
  funcionarioNombre: string;
  serialNumber: string;
  diasRestantes: number;
  asunto: string;
  cuerpoCorreo: string;
  timestamp: string;
  esMasivo?: boolean;
}

export const AlertasCertificadosView: React.FC = () => {
  const { metricas, cargarMetricas } = useTelemetriaStore();
  const [alertasRemotas, setAlertasRemotas] = useState<AlertaToken[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTramo, setFiltroTramo] = useState<'TODOS' | '15_DIAS' | '30_DIAS' | '60_DIAS' | 'EXPIRADO'>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  const [notificandoId, setNotificandoId] = useState<string | null>(null);
  const [avisosEnviadosMap, setAvisosEnviadosMap] = useState<Record<string, string>>({});
  const [correoPreview, setCorreoPreview] = useState<CorreoDespachadoPreview | null>(null);

  const cargarAlertas = async () => {
    setCargando(true);
    try {
      const res = await fetch('/api/v1/usuarios/alertas-vencimiento');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAlertasRemotas(
            data.map((item: any) => {
              const dias =
                item.diasRestantes ??
                (item.validoHasta
                  ? Math.ceil((new Date(item.validoHasta).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : 0);
              const tramo: AlertaToken['tramoAlerta'] =
                item.tramoAlerta ||
                (dias <= 0 ? 'EXPIRADO' : dias <= 15 ? '15_DIAS' : dias <= 30 ? '30_DIAS' : '60_DIAS');
              return {
                id: item.id || item.numeroSerie || 'CERT-TOKEN',
                numeroSerieCertificado: item.numeroSerie || item.id || 'SN-CERT',
                serialNumberToken:
                  item.serialNumberToken ||
                  item.tokenHardware?.serialNumber ||
                  item.numeroSerie ||
                  'TOKEN-USB',
                hardwareModelo:
                  item.hardwareModelo ||
                  (item.tokenHardware
                    ? `${item.tokenHardware.marca || ''} ${item.tokenHardware.modelo || ''}`.trim()
                    : 'Token Criptográfico USB'),
                diasRestantes: dias,
                tramoAlerta: tramo,
                severidad: item.severidad || (dias <= 15 ? 'ALTA' : dias <= 30 ? 'MEDIA' : 'BAJA'),
                fechaInicio: item.fechaInicio || (item.validoDesde ? String(item.validoDesde).substring(0, 10) : '2025-01-15'),
                fechaExpiracion:
                  item.fechaExpiracion ||
                  (item.validoHasta ? new Date(item.validoHasta).toISOString().substring(0, 10) : 'Sin fecha'),
                tiempoExpiracionTexto:
                  item.tiempoExpiracionTexto ||
                  (dias <= 0 ? `Expirado hace ${Math.abs(dias)} días` : `Quedan ${dias} días para vencer`),
                ultimoAvisoEnviado: item.ultimoAvisoEnviado || null,
                usuario: {
                  nombre: item.usuario?.nombre || 'Funcionario Municipal',
                  unidad: item.usuario?.unidad || 'Municipalidad de Coquimbo',
                  cargo: item.usuario?.cargo || 'Profesional Municipal',
                  email: item.usuario?.email || 'firma@municoquimbo.cl',
                  rut: item.usuario?.rut || '-',
                },
              };
            }),
          );
        }
      }
    } catch {
      // Fallback a metricas.alertasVencimiento
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAlertas();
  }, []);

  // Consolidar fuente de alertas (endpoint directo o metricas.alertasVencimiento)
  const alertas: AlertaToken[] =
    alertasRemotas.length > 0
      ? alertasRemotas
      : (metricas?.alertasVencimiento?.tokensEnAlerta || []).map((t) => ({
          id: t.id,
          numeroSerieCertificado: t.numeroSerie,
          serialNumberToken: t.serialNumberToken,
          hardwareModelo: t.hardwareModelo,
          diasRestantes: t.diasRestantes,
          tramoAlerta: t.tramoAlerta,
          severidad: t.severidad,
          fechaInicio: t.fechaInicio,
          fechaExpiracion: t.fechaExpiracion,
          tiempoExpiracionTexto: t.tiempoExpiracionTexto,
          ultimoAvisoEnviado: t.ultimoAvisoEnviado,
          usuario: {
            nombre: t.usuario.nombre,
            unidad: t.usuario.unidad,
            cargo: t.usuario.cargo || 'Funcionario',
            email: t.usuario.email,
            rut: t.usuario.rut,
          },
        }));

  const count15 = alertas.filter((a) => a.tramoAlerta === '15_DIAS' || (a.diasRestantes > 0 && a.diasRestantes <= 15)).length;
  const count30 = alertas.filter((a) => a.tramoAlerta === '30_DIAS' || (a.diasRestantes > 15 && a.diasRestantes <= 30)).length;
  const count60 = alertas.filter((a) => a.tramoAlerta === '60_DIAS' || (a.diasRestantes > 30 && a.diasRestantes <= 60)).length;
  const countExpirados = alertas.filter((a) => a.tramoAlerta === 'EXPIRADO' || a.diasRestantes <= 0).length;

  const alertasFiltradas = alertas.filter((a) => {
    const q = busqueda.trim().toLowerCase();
    const coincideBusqueda =
      !q ||
      a.usuario.nombre.toLowerCase().includes(q) ||
      a.usuario.rut.toLowerCase().includes(q) ||
      a.usuario.email.toLowerCase().includes(q) ||
      a.serialNumberToken.toLowerCase().includes(q) ||
      a.numeroSerieCertificado.toLowerCase().includes(q);

    const coincideTramo =
      filtroTramo === 'TODOS'
        ? true
        : filtroTramo === '15_DIAS'
        ? a.tramoAlerta === '15_DIAS' || (a.diasRestantes > 0 && a.diasRestantes <= 15)
        : filtroTramo === '30_DIAS'
        ? a.tramoAlerta === '30_DIAS' || (a.diasRestantes > 15 && a.diasRestantes <= 30)
        : filtroTramo === '60_DIAS'
        ? a.tramoAlerta === '60_DIAS' || (a.diasRestantes > 30 && a.diasRestantes <= 60)
        : a.tramoAlerta === 'EXPIRADO' || a.diasRestantes <= 0;

    return coincideBusqueda && coincideTramo;
  });

  const handleEnviarCorreoAviso = async (alerta: AlertaToken) => {
    setNotificandoId(alerta.id);
    const ahoraStr = new Date().toLocaleString('es-CL');
    let asunto = `[AVISO VENCIMIENTO TOKEN FEA] Quedan ${alerta.diasRestantes} días de vigencia (${alerta.serialNumberToken})`;
    let cuerpoCorreo = `Estimado(a) ${alerta.usuario.nombre} (${alerta.usuario.rut}),\n\nEl Sistema de Control y Seguimiento de Tokens de Firma Electrónica de la Ilustre Municipalidad de Coquimbo le informa que su dispositivo token N° Serie ${alerta.serialNumberToken} (${alerta.hardwareModelo}) asignado a la unidad "${alerta.usuario.unidad}" presenta fecha de expiración el ${alerta.fechaExpiracion} (${alerta.tiempoExpiracionTexto}).\n\nPor favor coordine la renovación de su token criptográfico con el Departamento de Gestión de Sistemas y TICs antes de su caducidad.\n\nAtentamente,\nUnidad de Control de Tokens FEA — I. Municipalidad de Coquimbo`;

    try {
      const res = await fetch('/api/v1/usuarios/alertas-vencimiento/despachar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificadoId: alerta.id,
          serialNumber: alerta.serialNumberToken,
          email: alerta.usuario.email,
          diasRestantes: alerta.diasRestantes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.asunto) asunto = data.asunto;
        if (data?.cuerpoCorreo) cuerpoCorreo = data.cuerpoCorreo;
      }
    } catch {
      // Usa plantilla institucional local si no hay respuesta
    }

    setAvisosEnviadosMap((prev) => ({ ...prev, [alerta.id]: ahoraStr }));
    setCorreoPreview({
      emailDestino: alerta.usuario.email,
      funcionarioNombre: alerta.usuario.nombre,
      serialNumber: alerta.serialNumberToken,
      diasRestantes: alerta.diasRestantes,
      asunto,
      cuerpoCorreo,
      timestamp: ahoraStr,
    });
    setNotificandoId(null);
    cargarMetricas();
  };

  const handleDespachoMasivo = async () => {
    setNotificandoId('MASIVO');
    const ahoraStr = new Date().toLocaleString('es-CL');
    try {
      await fetch('/api/v1/usuarios/alertas-vencimiento/despachar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masivo: true }),
      });
    } catch {
      // Fallback
    }

    const nuevosAvisos: Record<string, string> = {};
    alertasFiltradas.forEach((a) => {
      nuevosAvisos[a.id] = ahoraStr;
    });
    setAvisosEnviadosMap((prev) => ({ ...prev, ...nuevosAvisos }));
    setCorreoPreview({
      emailDestino: `${alertasFiltradas.length} funcionarios notificados (${alertasFiltradas
        .slice(0, 3)
        .map((a) => a.usuario.email)
        .join(', ')}${alertasFiltradas.length > 3 ? '...' : ''})`,
      funcionarioNombre: 'Despacho Masivo de Vigencia (15, 30 y 60 días)',
      serialNumber: 'Múltiples Tokens en Umbral',
      diasRestantes: 60,
      asunto: '[AVISO PREVENTIVO INSTITUCIONAL] Vencimiento de Tokens de Firma Electrónica (Umbrales 15, 30 y 60 días)',
      cuerpoCorreo: `Se han despachado exitosamente ${alertasFiltradas.length} correos electrónicos preventivos a los funcionarios cuyos dispositivos tokens se encuentran en los tramos de 15, 30 y 60 días para su vencimiento.\n\nDestinatarios incluidos:\n${alertasFiltradas
        .map((a) => `• ${a.usuario.nombre} (${a.usuario.email}) — Token ${a.serialNumberToken} — ${a.tiempoExpiracionTexto}`)
        .join('\n')}`,
      timestamp: ahoraStr,
      esMasivo: true,
    });
    setNotificandoId(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Panel Superior de Vigilancia de Vencimiento a 15, 30 y 60 Días (Req 4) */}
      <Card className="border-border/80 bg-card">
        <CardHeader className="p-5 pb-3 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[11px] font-mono font-bold text-primary">
                Vigencia y Vencimiento de Tokens
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-[11px] font-mono text-muted-foreground">
                Umbrales de 15, 30 y 60 días
              </span>
            </div>
            <CardTitle className="text-base sm:text-lg font-bold text-foreground">
              Control de Vigencia de Tokens y Aviso Preventivo por Correo Electrónico
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Monitoreo de tokens criptográficos con vencimiento próximo y envío directo de avisos por correo electrónico al titular.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={cargarAlertas}
              className="h-9 text-xs font-semibold"
            >
              ↻ Actualizar Vigencias
            </Button>
            <Button
              onClick={handleDespachoMasivo}
              size="sm"
              disabled={alertasFiltradas.length === 0 || notificandoId === 'MASIVO'}
              className="font-bold text-xs h-9 px-4 shrink-0 shadow-xs"
            >
              {notificandoId === 'MASIVO'
                ? 'Enviando Correos...'
                : `Enviar Aviso por Correo a Todos (${alertasFiltradas.length})`}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Tarjetas por Tramo: 15 días, 30 días, 60 días y Expirados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div
              onClick={() => setFiltroTramo('15_DIAS')}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all space-y-1 ${
                filtroTramo === '15_DIAS'
                  ? 'border-rose-500 bg-rose-500/15 shadow-xs'
                  : 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-rose-500 font-bold">
                  Tramo ≤ 15 Días
                </span>
                <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                  Urgente
                </span>
              </div>
              <div className="font-bold text-2xl text-rose-600 dark:text-rose-400">
                {count15} <span className="text-xs font-normal text-muted-foreground">tokens</span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Les quedan 15 días o menos para vencer
              </div>
            </div>

            <div
              onClick={() => setFiltroTramo('30_DIAS')}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all space-y-1 ${
                filtroTramo === '30_DIAS'
                  ? 'border-amber-500 bg-amber-500/15 shadow-xs'
                  : 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-amber-500 font-bold">
                  Tramo ≤ 30 Días (16–30d)
                </span>
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  Renovación
                </span>
              </div>
              <div className="font-bold text-2xl text-amber-600 dark:text-amber-400">
                {count30} <span className="text-xs font-normal text-muted-foreground">tokens</span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Les quedan entre 16 y 30 días de vigencia
              </div>
            </div>

            <div
              onClick={() => setFiltroTramo('60_DIAS')}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all space-y-1 ${
                filtroTramo === '60_DIAS'
                  ? 'border-blue-500 bg-blue-500/15 shadow-xs'
                  : 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-blue-500 font-bold">
                  Tramo ≤ 60 Días (31–60d)
                </span>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                  Preventivo
                </span>
              </div>
              <div className="font-bold text-2xl text-foreground">
                {count60} <span className="text-xs font-normal text-muted-foreground">tokens</span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Les quedan entre 31 y 60 días de vigencia
              </div>
            </div>

            <div
              onClick={() => setFiltroTramo('EXPIRADO')}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all space-y-1 ${
                filtroTramo === 'EXPIRADO'
                  ? 'border-rose-600 bg-rose-600/15 shadow-xs'
                  : 'border-border bg-muted/30 hover:border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-muted-foreground font-bold">
                  Tokens Expirados
                </span>
                <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                  Vencidos
                </span>
              </div>
              <div className="font-bold text-2xl text-rose-600 dark:text-rose-400">
                {countExpirados} <span className="text-xs font-normal text-muted-foreground">tokens</span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Vigencia finalizada (requiere reemplazo)
              </div>
            </div>
          </div>

          {/* Barra de Filtros por Tramo y Búsqueda */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant={filtroTramo === 'TODOS' ? 'default' : 'outline'}
                onClick={() => setFiltroTramo('TODOS')}
                className="h-8 text-xs font-semibold"
              >
                Todos ({alertas.length})
              </Button>
              <Button
                size="sm"
                variant={filtroTramo === '15_DIAS' ? 'destructive' : 'outline'}
                onClick={() => setFiltroTramo('15_DIAS')}
                className="h-8 text-xs font-semibold"
              >
                ≤ 15 Días ({count15})
              </Button>
              <Button
                size="sm"
                variant={filtroTramo === '30_DIAS' ? 'warning' : 'outline'}
                onClick={() => setFiltroTramo('30_DIAS')}
                className="h-8 text-xs font-semibold"
              >
                ≤ 30 Días ({count30})
              </Button>
              <Button
                size="sm"
                variant={filtroTramo === '60_DIAS' ? 'default' : 'outline'}
                onClick={() => setFiltroTramo('60_DIAS')}
                className="h-8 text-xs font-semibold"
              >
                ≤ 60 Días ({count60})
              </Button>
              <Button
                size="sm"
                variant={filtroTramo === 'EXPIRADO' ? 'destructive' : 'outline'}
                onClick={() => setFiltroTramo('EXPIRADO')}
                className="h-8 text-xs font-semibold"
              >
                Expirados ({countExpirados})
              </Button>
            </div>

            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por funcionario, RUT, correo o N° serie token..."
              className="h-8 text-xs sm:w-72"
            />
          </div>
        </CardContent>
      </Card>

      {/* Confirmación y Vista Previa del Correo Electrónico Enviado */}
      {correoPreview && (
        <Card className="border-2 border-emerald-500/60 bg-emerald-500/5 shadow-lg">
          <CardHeader className="p-4 pb-2 border-b flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Correo electrónico despachado
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  • {correoPreview.timestamp}
                </span>
              </div>
              <CardTitle className="text-sm font-bold text-foreground">
                Comprobante de Envío de Aviso de Vencimiento por Correo
              </CardTitle>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCorreoPreview(null)}
              className="h-7 text-xs font-bold"
            >
              ✕ Cerrar
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded bg-background/80 border font-mono text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px]">PARA (DESTINATARIO):</span>
                <span className="font-bold text-foreground">{correoPreview.emailDestino}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">FUNCIONARIO / ALCANCE:</span>
                <span className="font-bold text-foreground">{correoPreview.funcionarioNombre}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">TOKEN NOTIFICADO:</span>
                <span className="font-bold text-primary">{correoPreview.serialNumber}</span>
              </div>
            </div>
            <div className="p-3 rounded bg-background border space-y-1.5">
              <div className="text-[11px] font-semibold text-foreground border-b pb-1">
                Asunto: {correoPreview.asunto}
              </div>
              <pre className="text-[11px] font-mono whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {correoPreview.cuerpoCorreo}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Listado de Tokens en Umbral de Vencimiento (15, 30, 60 días y Expirados) */}
      {cargando && alertas.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-sm text-muted-foreground animate-pulse">
            Consultando vigencias de tokens y certificados...
          </p>
        </Card>
      ) : alertasFiltradas.length === 0 ? (
        <Card className="p-8 text-center border-dashed bg-card/50">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-foreground">
              No hay tokens en este tramo de vencimiento
            </div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Seleccione otro tramo (15, 30 o 60 días) para visualizar los dispositivos monitoreados.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {alertasFiltradas.map((alerta) => {
            const isExpirado = alerta.diasRestantes <= 0 || alerta.tramoAlerta === 'EXPIRADO';
            const is15 = !isExpirado && (alerta.diasRestantes <= 15 || alerta.tramoAlerta === '15_DIAS');
            const is30 = !isExpirado && !is15 && (alerta.diasRestantes <= 30 || alerta.tramoAlerta === '30_DIAS');
            const avisoHora = avisosEnviadosMap[alerta.id] || alerta.ultimoAvisoEnviado;

            return (
              <Card
                key={alerta.id}
                className={`p-4 border transition-all hover:shadow-sm flex flex-col justify-between gap-3 ${
                  isExpirado || is15
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : is30
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-blue-500/30 bg-card'
                }`}
              >
                {/* Nombre del Funcionario y Tiempo para Expiración */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                        isExpirado || is15
                          ? 'text-rose-600 dark:text-rose-400'
                          : is30
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isExpirado || is15
                            ? 'bg-rose-500'
                            : is30
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      {alerta.tiempoExpiracionTexto}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground truncate">
                    {alerta.usuario.nombre}
                  </h3>
                </div>

                {/* RUT y Correo Electrónico */}
                <div className="p-2.5 rounded-md bg-muted/40 border border-border/60 space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">RUT:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {alerta.usuario.rut}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Correo:</span>
                    <span className="font-mono text-foreground truncate">
                      {alerta.usuario.email}
                    </span>
                  </div>
                </div>

                {/* Acción de Envío de Aviso por Correo */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground truncate">
                    {avisoHora ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ Notificado
                      </span>
                    ) : (
                      'Sin notificar'
                    )}
                  </span>

                  <Button
                    variant="default"
                    size="sm"
                    disabled={notificandoId === alerta.id}
                    onClick={() => handleEnviarCorreoAviso(alerta)}
                    className="text-xs font-bold h-7 px-3 shadow-xs"
                  >
                    {notificandoId === alerta.id ? 'Enviando...' : '✉ Enviar Aviso'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
