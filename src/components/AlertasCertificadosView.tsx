import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { formatRutVisual } from '../lib/rut';

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
  alertaRef?: AlertaToken;
  emailDestino: string;
  remitenteSmtp?: string;
  funcionarioNombre: string;
  serialNumber: string;
  diasRestantes: number;
  asunto: string;
  cuerpoCorreo: string;
  htmlCorreo?: string;
  enviadoSmtp?: boolean;
  esSoloPreview?: boolean;
  motivoSmtp?: string;
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
  const [modoPreviewCorreo, setModoPreviewCorreo] = useState<'HTML' | 'TEXTO'>('HTML');

  const cargarAlertas = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/usuarios/alertas-vencimiento', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
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

  const handleEnviarCorreoAviso = async (alerta: AlertaToken, soloPreview = false) => {
    setNotificandoId(soloPreview ? `PREVIEW-${alerta.id}` : alerta.id);
    const ahoraStr = new Date().toLocaleString('es-CL');
    let asunto = `Aviso importante: Su certificado de Firma Electrónica está por caducar (${alerta.diasRestantes} días)`;
    let cuerpoCorreo = `Estimado(a) ${alerta.usuario.nombre},\n\nSu certificado de Firma Electrónica Avanzada (RUT: ${alerta.usuario.rut}) presenta fecha de vencimiento ${alerta.fechaExpiracion} (${alerta.tiempoExpiracionTexto}).`;
    let htmlCorreo: string | undefined;
    let enviadoSmtp = false;
    let remitenteSmtp = 'datrigob@gmail.com';
    let motivoSmtp = soloPreview ? 'Vista previa lista para enviar' : 'Vista previa local';

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/usuarios/alertas-vencimiento/despachar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          certificadoId: alerta.id,
          serialNumber: alerta.serialNumberToken,
          email: alerta.usuario.email,
          nombre: alerta.usuario.nombre,
          rut: formatRutVisual(alerta.usuario.rut),
          fechaExpiracion: alerta.fechaExpiracion,
          diasRestantes: alerta.diasRestantes,
          soloPreview,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.asunto) asunto = data.asunto;
        if (data?.cuerpoCorreo) cuerpoCorreo = data.cuerpoCorreo;
        if (data?.htmlCorreo) htmlCorreo = data.htmlCorreo;
        if (data?.remitenteSmtp) remitenteSmtp = data.remitenteSmtp;
        enviadoSmtp = Boolean(data?.enviadoSmtp);
        motivoSmtp = data?.motivoSmtp || motivoSmtp;
      }
    } catch {
      // Usa plantilla institucional local si no hay respuesta
    }

    if (!soloPreview) {
      setAvisosEnviadosMap((prev) => ({ ...prev, [alerta.id]: ahoraStr }));
      cargarMetricas();
    }
    setCorreoPreview({
      alertaRef: alerta,
      emailDestino: alerta.usuario.email,
      remitenteSmtp,
      funcionarioNombre: alerta.usuario.nombre,
      serialNumber: alerta.serialNumberToken,
      diasRestantes: alerta.diasRestantes,
      asunto,
      cuerpoCorreo,
      htmlCorreo,
      enviadoSmtp,
      esSoloPreview: soloPreview,
      motivoSmtp,
      timestamp: ahoraStr,
    });
    setNotificandoId(null);
  };

  const handleDespachoMasivo = async () => {
    setNotificandoId('MASIVO');
    const ahoraStr = new Date().toLocaleString('es-CL');
    const token = localStorage.getItem('access_token');
    let enviadosReales = 0;

    for (const alerta of alertasFiltradas) {
      try {
        const res = await fetch('/api/v1/usuarios/alertas-vencimiento/despachar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            certificadoId: alerta.id,
            serialNumber: alerta.serialNumberToken,
            email: alerta.usuario.email,
            nombre: alerta.usuario.nombre,
            rut: formatRutVisual(alerta.usuario.rut),
            fechaExpiracion: alerta.fechaExpiracion,
            diasRestantes: alerta.diasRestantes,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.enviadoSmtp) enviadosReales += 1;
        }
      } catch {
        // Continuar con el siguiente
      }
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
      funcionarioNombre: 'Despacho Masivo con Plantilla Institucional',
      serialNumber: 'Múltiples Tokens en Umbral',
      diasRestantes: 60,
      asunto: 'Aviso importante: Su certificado de Firma Electrónica está por caducar',
      cuerpoCorreo: `Se procesaron ${alertasFiltradas.length} correos con la plantilla institucional personalizada para cada titular (${enviadosReales} enviados por SMTP).\n\nDestinatarios incluidos:\n${alertasFiltradas
        .map((a) => `• ${a.usuario.nombre} (${a.usuario.email}) — Token ${a.serialNumberToken} — ${a.tiempoExpiracionTexto}`)
        .join('\n')}`,
      enviadoSmtp: enviadosReales > 0,
      motivoSmtp:
        enviadosReales > 0
          ? `${enviadosReales} de ${alertasFiltradas.length} correos enviados vía SMTP`
          : 'Plantillas generadas (configure SMTP_HOST/SMTP_USER/SMTP_PASS en .env para envío real)',
      timestamp: ahoraStr,
      esMasivo: true,
    });
    setNotificandoId(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Panel Superior de Vigilancia de Vencimiento a 15, 30 y 60 Días (Req 4) */}
      <Card className="border-border/80 bg-card">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
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

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={cargarAlertas}
              className="h-9 text-xs font-semibold flex-1 sm:flex-none"
            >
              ↻ Actualizar Vigencias
            </Button>
            <Button
              onClick={handleDespachoMasivo}
              size="sm"
              disabled={alertasFiltradas.length === 0 || notificandoId === 'MASIVO'}
              className="font-bold text-xs h-9 px-4 flex-1 sm:flex-none shadow-sm"
            >
              {notificandoId === 'MASIVO'
                ? 'Enviando Correos...'
                : `Enviar Aviso por Correo a Todos (${alertasFiltradas.length})`}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Tarjetas por Tramo: 15 días, 30 días, 60 días y Expirados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div
              onClick={() => setFiltroTramo('15_DIAS')}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all space-y-1 ${
                filtroTramo === '15_DIAS'
                  ? 'border-rose-500 bg-rose-500/15 shadow-sm'
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
                  ? 'border-amber-500 bg-amber-500/15 shadow-sm'
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
                  ? 'border-blue-500 bg-blue-500/15 shadow-sm'
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
                  ? 'border-rose-600 bg-rose-600/15 shadow-sm'
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
              className="h-8 text-xs w-full sm:w-72"
            />
          </div>
        </CardContent>
      </Card>

      {/* Confirmación y Vista Previa del Correo Electrónico Enviado */}
      {correoPreview && (
        <Card className="border-2 border-emerald-500/60 bg-emerald-500/5 shadow-lg">
          <CardHeader className="p-4 pb-2 border-b flex flex-row items-center justify-between gap-2 flex-wrap">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-semibold flex items-center gap-1.5 ${
                    correoPreview.enviadoSmtp
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      correoPreview.enviadoSmtp ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  {correoPreview.enviadoSmtp ? 'Enviado por SMTP' : correoPreview.motivoSmtp || 'Plantilla generada'}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  • {correoPreview.timestamp}
                </span>
              </div>
              <CardTitle className="text-sm font-bold text-foreground">
                Comprobante y Vista Previa de Correo de Aviso de Caducidad
              </CardTitle>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {correoPreview.esSoloPreview && correoPreview.alertaRef && (
                <Button
                  size="sm"
                  variant="default"
                  disabled={notificandoId === correoPreview.alertaRef.id}
                  onClick={() => handleEnviarCorreoAviso(correoPreview.alertaRef!, false)}
                  className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {notificandoId === correoPreview.alertaRef.id ? 'Enviando...' : 'Enviar Correo'}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCorreoPreview(null)}
                className="h-7 text-xs font-bold"
              >
                Cerrar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded bg-background/80 border font-mono text-[11px]">
              <div className="min-w-0">
                <span className="text-muted-foreground block text-[10px]">PARA (DESTINATARIO):</span>
                <span className="font-bold text-foreground break-all">{correoPreview.emailDestino}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground block text-[10px]">FUNCIONARIO / ALCANCE:</span>
                <span className="font-bold text-foreground break-words">{correoPreview.funcionarioNombre}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground block text-[10px]">TOKEN NOTIFICADO:</span>
                <span className="font-bold text-primary break-all">{correoPreview.serialNumber}</span>
              </div>
            </div>
            <div className="p-3 rounded bg-background border space-y-2">
              <div className="text-[11px] font-semibold text-foreground border-b pb-1 break-words">
                Asunto: {correoPreview.asunto}
              </div>
              {correoPreview.htmlCorreo ? (
                <div className="overflow-x-auto bg-zinc-100 p-3 rounded border max-h-[540px] overflow-y-auto">
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
                <pre className="text-[11px] font-mono whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {correoPreview.cuerpoCorreo}
                </pre>
              )}
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
        <Card className="border-border/80 bg-card overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40 text-[11px]">
                <TableRow>
                  <TableHead className="min-w-[190px]">Funcionario / RUT</TableHead>
                  <TableHead className="min-w-[180px]">Correo</TableHead>
                  <TableHead className="min-w-[160px]">Token / Modelo</TableHead>
                  <TableHead className="min-w-[150px]">Vencimiento</TableHead>
                  <TableHead className="min-w-[110px]">Estado Aviso</TableHead>
                  <TableHead className="text-right min-w-[130px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {alertasFiltradas.map((alerta) => {
                  const isExpirado = alerta.diasRestantes <= 0 || alerta.tramoAlerta === 'EXPIRADO';
                  const is15 = !isExpirado && (alerta.diasRestantes <= 15 || alerta.tramoAlerta === '15_DIAS');
                  const is30 = !isExpirado && !is15 && (alerta.diasRestantes <= 30 || alerta.tramoAlerta === '30_DIAS');
                  const avisoHora = avisosEnviadosMap[alerta.id] || alerta.ultimoAvisoEnviado;

                  return (
                    <TableRow key={alerta.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="font-bold text-foreground">{alerta.usuario.nombre}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {formatRutVisual(alerta.usuario.rut)}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-foreground">
                        {alerta.usuario.email}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-[11px] font-semibold text-foreground">
                          {alerta.serialNumberToken}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{alerta.hardwareModelo}</div>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-[11px] font-mono">
                        {avisoHora ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            ✓ Notificado
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Sin notificar</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={notificandoId === `PREVIEW-${alerta.id}`}
                            onClick={() => handleEnviarCorreoAviso(alerta, true)}
                            className="text-xs font-semibold h-7 px-2.5"
                            title="Ver vista previa del correo antes de enviar"
                          >
                            {notificandoId === `PREVIEW-${alerta.id}` ? 'Cargando...' : 'Vista Previa'}
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            disabled={notificandoId === alerta.id}
                            onClick={() => handleEnviarCorreoAviso(alerta, false)}
                            className="text-xs font-bold h-7 px-3 shadow-sm"
                          >
                            {notificandoId === alerta.id ? 'Enviando...' : 'Enviar Aviso'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Vista en tarjetas para móviles */}
          <div className="block md:hidden divide-y divide-border/70">
            {alertasFiltradas.map((alerta) => {
              const isExpirado = alerta.diasRestantes <= 0 || alerta.tramoAlerta === 'EXPIRADO';
              const is15 = !isExpirado && (alerta.diasRestantes <= 15 || alerta.tramoAlerta === '15_DIAS');
              const is30 = !isExpirado && !is15 && (alerta.diasRestantes <= 30 || alerta.tramoAlerta === '30_DIAS');
              const avisoHora = avisosEnviadosMap[alerta.id] || alerta.ultimoAvisoEnviado;

              return (
                <div key={`mobile-${alerta.id}`} className="p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-foreground break-words">{alerta.usuario.nombre}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {formatRutVisual(alerta.usuario.rut)}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground break-all mt-0.5">
                        {alerta.usuario.email}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {avisoHora ? (
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          ✓ Notificado
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-muted-foreground">Sin notificar</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-md bg-muted/20 border border-border/50 text-[11px]">
                    <div className="min-w-0">
                      <span className="text-[10px] text-muted-foreground block">Token / Modelo</span>
                      <span className="font-mono font-bold text-foreground break-all">{alerta.serialNumberToken}</span>
                      <span className="text-[10px] text-muted-foreground block truncate">{alerta.hardwareModelo}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-muted-foreground block">Vencimiento</span>
                      <span
                        className={`inline-flex items-center gap-1.5 font-bold ${
                          isExpirado || is15
                            ? 'text-rose-600 dark:text-rose-400'
                            : is30
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isExpirado || is15
                              ? 'bg-rose-500'
                              : is30
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        <span>{alerta.tiempoExpiracionTexto}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={notificandoId === `PREVIEW-${alerta.id}`}
                      onClick={() => handleEnviarCorreoAviso(alerta, true)}
                      className="text-xs font-semibold h-7 px-2.5"
                    >
                      {notificandoId === `PREVIEW-${alerta.id}` ? 'Cargando...' : 'Vista Previa'}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={notificandoId === alerta.id}
                      onClick={() => handleEnviarCorreoAviso(alerta, false)}
                      className="text-xs font-bold h-7 px-3 shadow-sm"
                    >
                      {notificandoId === alerta.id ? 'Enviando...' : 'Enviar Aviso'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
