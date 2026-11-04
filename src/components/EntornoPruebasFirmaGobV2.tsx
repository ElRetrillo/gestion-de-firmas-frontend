import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { useAuthStore } from '../store/useAuthStore';
import { useTelemetriaStore } from '../store/useTelemetriaStore';

export const EntornoPruebasFirmaGobV2: React.FC = () => {
  const { usuario } = useAuthStore();
  const { estaciones } = useTelemetriaStore();

  const [testConfig, setTestConfig] = useState<any | null>(null);
  const [cargandoConfig, setCargandoConfig] = useState(false);
  const [presetSeleccionado, setPresetSeleccionado] = useState<'ATENDIDA' | 'DESATENDIDA' | 'FUNCIONARIO'>('ATENDIDA');

  // Parámetros JWT
  const [jwtRun, setJwtRun] = useState('11111111');
  const [jwtEntity, setJwtEntity] = useState('Subsecretaría General de la Presidencia');
  const [jwtPurpose, setJwtPurpose] = useState('Propósito General');
  const [jwtTokenGenerado, setJwtTokenGenerado] = useState('');
  const [apiTokenKey, setApiTokenKey] = useState('sandbox');

  // OTP y Headers
  const [otpHeader, setOtpHeader] = useState('');
  const [mensajeOtp, setMensajeOtp] = useState<string | null>(null);

  // Archivo y Layout XML
  const [nombreArchivo, setNombreArchivo] = useState('resolucion-prueba.pdf');
  const [archivoBase64, setArchivoBase64] = useState<string>('');
  const [archivoTamanoKb, setArchivoTamanoKb] = useState<number>(0);
  const [layoutXml, setLayoutXml] = useState<string>('');

  // Petición y Respuesta
  const [ejecutando, setEjecutando] = useState(false);
  const [requestEnviado, setRequestEnviado] = useState<any | null>(null);
  const [responseRecibido, setResponseRecibido] = useState<any | null>(null);
  const [codigoHttp, setCodigoHttp] = useState<number | null>(null);
  const [errorEjecucion, setErrorEjecucion] = useState<string | null>(null);
  const [pdfFirmadoDescargable, setPdfFirmadoDescargable] = useState<{ nombre: string; url: string } | null>(null);

  const cargarConfiguracion = async () => {
    setCargandoConfig(true);
    try {
      const res = await fetch(`/api/v1/firmas/v2/test-config?rut=${usuario.rut}`);
      if (res.ok) {
        const data = await res.json();
        setTestConfig(data);

        // Inicializar layout XML y OTP si no estaban
        if (!layoutXml && data.layoutXmlAnexoB) {
          setLayoutXml(data.layoutXmlAnexoB);
        }
        if (data.otpSandboxEnVivo?.otpActual && !otpHeader) {
          setOtpHeader(data.otpSandboxEnVivo.otpActual);
        }

        // Aplicar preset según selección
        aplicarPresetData(presetSeleccionado, data);
      }
    } catch {
      // Ignorar fallback
    } finally {
      setCargandoConfig(false);
    }
  };

  const aplicarPresetData = (preset: 'ATENDIDA' | 'DESATENDIDA' | 'FUNCIONARIO', cfg: any) => {
    if (!cfg?.presets) return;
    if (preset === 'ATENDIDA') {
      const p = cfg.presets.firmaAtendida;
      setJwtRun(p.jwtPayload.run);
      setJwtEntity(p.jwtPayload.entity);
      setJwtPurpose(p.jwtPayload.purpose);
      setJwtTokenGenerado(p.jwtToken);
      setOtpHeader(cfg.otpSandboxEnVivo?.otpActual || '123456');
    } else if (preset === 'DESATENDIDA') {
      const p = cfg.presets.firmaDesatendida;
      setJwtRun(p.jwtPayload.run);
      setJwtEntity(p.jwtPayload.entity);
      setJwtPurpose(p.jwtPayload.purpose);
      setJwtTokenGenerado(p.jwtToken);
      setOtpHeader(''); // Desatendida NO lleva header OTP según el manual
    } else {
      const p = cfg.presets.firmaFuncionarioActual;
      setJwtRun(p.jwtPayload.run);
      setJwtEntity(p.jwtPayload.entity);
      setJwtPurpose(p.jwtPayload.purpose);
      setJwtTokenGenerado(p.jwtToken);
      setOtpHeader(cfg.otpSandboxEnVivo?.otpActual || '1908');
    }
  };

  useEffect(() => {
    cargarConfiguracion();
    const interval = setInterval(() => {
      cargarConfiguracion();
    }, 10000); // Actualizar OTP cada 10s
    return () => clearInterval(interval);
  }, [presetSeleccionado]);

  const handleCambiarPreset = (nuevoPreset: 'ATENDIDA' | 'DESATENDIDA' | 'FUNCIONARIO') => {
    setPresetSeleccionado(nuevoPreset);
    if (testConfig) {
      aplicarPresetData(nuevoPreset, testConfig);
    }
  };

  const handleGenerarJwt = async () => {
    try {
      const res = await fetch('/api/v1/firmas/v2/generar-jwt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run: jwtRun,
          entity: jwtEntity,
          purpose: jwtPurpose,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setJwtTokenGenerado(data.token);
      }
    } catch {
      // Ignorar
    }
  };

  const handleResetearOtp = async () => {
    try {
      const res = await fetch('/api/v1/firmas/v2/reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run: jwtRun }),
      });
      if (res.ok) {
        const data = await res.json();
        setMensajeOtp(`✓ ${data.mensaje}. Nuevo OTP válido: ${data.otpActualValido}`);
        setOtpHeader(data.otpActualValido);
        cargarConfiguracion();
      }
    } catch {
      // Ignorar
    }
  };

  const handleSeleccionarPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorEjecucion('El archivo supera el límite de 5MB estipulado por el manual FirmaGob v2.');
      return;
    }

    setNombreArchivo(file.name);
    setArchivoTamanoKb(Math.round(file.size / 1024));

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Clean = result.split(',')[1] || result;
      setArchivoBase64(base64Clean);
    };
    reader.readAsDataURL(file);
  };

  const handleEjecutarLlamadaV2 = async () => {
    setEjecutando(true);
    setErrorEjecucion(null);
    setRequestEnviado(null);
    setResponseRecibido(null);
    setCodigoHttp(null);
    setPdfFirmadoDescargable(null);

    try {
      // Si no se cargó un PDF, usar un Base64 simulado o dejar que el backend genere uno
      let contentBase64 = archivoBase64;
      if (!contentBase64) {
        // Breve PDF A4 mínimo en base64 para pruebas
        contentBase64 = 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA1OTUuMjggODQxLjg5XQo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyMSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjIwNwolJUVPRg==';
      }

      const bodyPayload = {
        token: jwtTokenGenerado,
        api_token_key: apiTokenKey,
        files: [
          {
            'content-type': 'application/pdf',
            content: contentBase64,
            description: nombreArchivo,
            checksum: 'auto-sha256',
            layout: layoutXml || undefined,
          },
        ],
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (otpHeader.trim()) {
        headers['OTP'] = otpHeader.trim();
      }

      setRequestEnviado({
        endpoint: '/api/v1/firmas/v2/files/tickets',
        method: 'POST',
        headers,
        body: {
          ...bodyPayload,
          files: [
            {
              ...bodyPayload.files[0],
              content: `[Base64 length: ${contentBase64.length} chars...]`,
            },
          ],
        },
      });

      const res = await fetch('/api/v1/firmas/v2/files/tickets', {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
      });

      setCodigoHttp(res.status);
      const data = await res.json();
      setResponseRecibido(data);

      if (!res.ok) {
        throw new Error(data.message || `Error HTTP ${res.status} devuelto por FirmaGob v2`);
      }

      // Si retornó archivo firmado en Base64, crear URL descargable
      const fileFirmado = data.files?.[0];
      if (fileFirmado && fileFirmado.content) {
        const byteCharacters = atob(fileFirmado.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfFirmadoDescargable({
          nombre: `FIRMADO_${nombreArchivo}`,
          url,
        });
      }

      cargarConfiguracion();
    } catch (err: any) {
      setErrorEjecucion(err.message || 'Error de ejecución en FirmaGob v2');
    } finally {
      setEjecutando(false);
    }
  };

  const estacionConectada = estaciones.find((e) => e.estadoEnVivo === 'CONECTADO' || e.estadoEnVivo === 'FIRMANDO');
  const tokenActivo = estacionConectada?.tokenInfo;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/40">
              MANUAL INTEGRACIÓN FIRMAGOB • VERSIÓN 18 (FEB 2026)
            </Badge>
            <Badge variant="success" className="font-mono text-[10px]">
              Sandbox Local & Oficial Activo
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
            Entorno de Pruebas de Firma con Token y FirmaGob v2
          </h2>
          <p className="text-xs text-muted-foreground">
            Simulador interactivo del protocolo REST v2 para Firma Atendida (con Token USB / OTP) y Desatendida, conforme al manual oficial de SEGPRES.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={cargarConfiguracion}
          disabled={cargandoConfig}
          className="text-xs font-mono h-9 shrink-0"
        >
          ↻ Actualizar Config
        </Button>
      </div>

      {/* Selector de Presets Oficiales del Manual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => handleCambiarPreset('ATENDIDA')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            presetSeleccionado === 'ATENDIDA'
              ? 'border-primary bg-primary/10 shadow-xs'
              : 'border-border/70 hover:bg-muted/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-foreground">Preset 1: Firma Atendida</span>
            <Badge variant="warning" className="text-[9px] font-mono">OTP REQUERIDO</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Propósito General (run: 11111111). Requiere enviar header <code className="font-mono text-primary font-bold">OTP: &lt;6 dígitos&gt;</code>.
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleCambiarPreset('DESATENDIDA')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            presetSeleccionado === 'DESATENDIDA'
              ? 'border-primary bg-primary/10 shadow-xs'
              : 'border-border/70 hover:bg-muted/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-foreground">Preset 2: Firma Desatendida</span>
            <Badge variant="success" className="text-[9px] font-mono">SIN OTP</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Desatendido (run: 22222222). Firma en lote o procesos automáticos. NO requiere OTP.
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleCambiarPreset('FUNCIONARIO')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            presetSeleccionado === 'FUNCIONARIO'
              ? 'border-primary bg-primary/10 shadow-xs'
              : 'border-border/70 hover:bg-muted/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-foreground">Preset 3: Token del Funcionario</span>
            <Badge variant={tokenActivo ? 'success' : 'outline'} className="text-[9px] font-mono">
              {tokenActivo ? 'TOKEN CONECTADO' : 'TOKEN NO DETECTADO'}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            RUT de {usuario.nombre} ({usuario.rut}). Valida estación de telemetría y PIN/OTP.
          </p>
        </button>
      </div>

      {/* Monitor de OTP en Vivo y Token USB */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Panel OTP Sandbox */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="p-4 pb-2 border-b bg-muted/20 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                Monitor OTP Sandbox en Vivo (TOTP 30s)
              </CardTitle>
              <CardDescription className="text-[11px]">
                Códigos temporales para Firma Atendida conforme a RFC 6238 y regla de 5 intentos fallidos (HTTP 429).
              </CardDescription>
            </div>
            <div className="font-mono text-xs font-bold text-primary">
              {testConfig?.otpSandboxEnVivo?.segundosRestantes ?? 30}s
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
              <div>
                <span className="text-[10px] text-muted-foreground block font-mono">CÓDIGO OTP ACTIVO:</span>
                <span className="text-2xl font-bold font-mono tracking-widest text-emerald-600 dark:text-emerald-400">
                  {testConfig?.otpSandboxEnVivo?.otpActual || '123456'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block font-mono">INTENTOS FALLIDOS:</span>
                <span className={`text-base font-bold font-mono ${
                  (testConfig?.otpSandboxEnVivo?.intentosFallidosRegistrados || 0) >= 5
                    ? 'text-rose-600 dark:text-rose-400 animate-pulse'
                    : 'text-foreground'
                }`}>
                  {testConfig?.otpSandboxEnVivo?.intentosFallidosRegistrados || 0} / 5
                </span>
              </div>
            </div>

            {testConfig?.otpSandboxEnVivo?.bloqueado429 && (
              <div className="p-2.5 rounded border border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[11px]">
                [ALERTA HTTP 429] RUN bloqueado por superar 5 intentos erróneos de OTP (Manual v18). Requiere desbloqueo.
              </div>
            )}

            {mensajeOtp && (
              <div className="p-2 rounded bg-muted text-[11px] font-mono text-muted-foreground">
                {mensajeOtp}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
              <span className="text-[10px] text-muted-foreground">
                Ingrese el código de 6 dígitos que figura en su aplicación móvil o el código de prueba superior.
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleResetearOtp}
                className="text-xs h-7 ml-auto font-semibold"
              >
                Desbloquear RUN (HTTP 429)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Panel Token Físico USB */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="p-4 pb-2 border-b bg-muted/20 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                Estado del Token USB Criptográfico
              </CardTitle>
              <CardDescription className="text-[11px]">
                Detección por canal de telemetría Ghost App en tu estación de trabajo.
              </CardDescription>
            </div>
            <Badge variant={tokenActivo ? 'success' : 'outline'} className="text-[10px] font-mono">
              {tokenActivo ? 'CONECTADO' : 'SIN DISPOSITIVO'}
            </Badge>
          </CardHeader>

          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 rounded-lg border font-mono text-[11px]">
              <div>
                <span className="text-muted-foreground text-[10px] block">Estación de Trabajo:</span>
                <span className="font-bold text-foreground">{estacionConectada?.codigoPc || 'Local / Web'}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">IP Asignada:</span>
                <span className="text-foreground">{estacionConectada?.ipAsignada || '127.0.0.1'}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">Número de Serie S/N:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {tokenActivo?.serialNumber || 'FEA-PKCS11-EMULADO'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">Marca y Modelo:</span>
                <span className="text-foreground">
                  {tokenActivo ? `${tokenActivo.marca} ${tokenActivo.modelo}` : 'Token Criptográfico USB FIPS 140-2'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Al invocar la firma con el preset del funcionario, el backend actualiza el estado de la estación a <strong className="text-foreground font-mono">FIRMANDO</strong> por WebSocket y sella la operación con el serial del hardware.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Editor de Petición v2: JWT, Headers, Archivo y Layout XML */}
      <Card className="border-border/80 bg-card">
        <CardHeader className="p-4 pb-2 border-b bg-muted/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
            Configuración de la Petición al Protocolo FirmaGob v2 (POST /files/tickets)
          </CardTitle>
          <CardDescription className="text-[11px]">
            Especificación oficial de la llamada JSON y headers obligatorios del manual.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 space-y-4 text-xs">
          {/* JWT Payload */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">RUN Firmante (sin puntos/guion/DV):</label>
              <Input
                value={jwtRun}
                onChange={(e) => setJwtRun(e.target.value)}
                placeholder="Ej: 11111111"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="font-semibold text-foreground">Institución / Entidad (entity):</label>
              <Input
                value={jwtEntity}
                onChange={(e) => setJwtEntity(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Propósito (purpose):</label>
              <select
                value={jwtPurpose}
                onChange={(e) => {
                  setJwtPurpose(e.target.value);
                  if (e.target.value === 'Desatendido') {
                    setOtpHeader('');
                  }
                }}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
              >
                <option value="Propósito General">Propósito General</option>
                <option value="Desatendido">Desatendido</option>
              </select>
            </div>
          </div>

          {/* Token JWT y Headers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground">Token JWT (HS256):</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerarJwt}
                  className="h-6 text-[10px] font-mono text-primary"
                >
                  Regenerar JWT
                </Button>
              </div>
              <Input
                value={jwtTokenGenerado}
                onChange={(e) => setJwtTokenGenerado(e.target.value)}
                className="h-8 text-[11px] font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground flex items-center justify-between">
                <span>Header OTP (6 dígitos):</span>
                <span className="text-[10px] text-muted-foreground">
                  {jwtPurpose === 'Desatendido' ? '(No enviar)' : '(Obligatorio)'}
                </span>
              </label>
              <Input
                value={otpHeader}
                onChange={(e) => setOtpHeader(e.target.value)}
                placeholder={jwtPurpose === 'Desatendido' ? 'Sin OTP' : '6 dígitos OTP'}
                disabled={jwtPurpose === 'Desatendido'}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>
          </div>

          {/* Archivo PDF y Layout XML */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-2 p-3 rounded-lg border bg-muted/20">
              <label className="font-semibold text-foreground flex items-center justify-between">
                <span>Archivo PDF a Enviar:</span>
                <span className="text-[10px] text-muted-foreground">Máx 5MB</span>
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleSeleccionarPdf}
                className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border file:border-border file:text-xs file:font-semibold file:bg-background hover:file:bg-muted cursor-pointer"
              />
              <div className="text-[11px] font-mono text-muted-foreground">
                Documento actual: <strong className="text-foreground">{nombreArchivo}</strong>{' '}
                {archivoTamanoKb > 0 ? `(${archivoTamanoKb} KB)` : '(Plantilla A4 por defecto)'}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground">
                  Layout XML &lt;AgileSignerConfig&gt; (Anexo B):
                </label>
                <span className="text-[10px] font-mono text-muted-foreground">Opcional para estampado</span>
              </div>
              <textarea
                value={layoutXml}
                onChange={(e) => setLayoutXml(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background p-2 font-mono text-[10px] text-foreground leading-tight"
                placeholder="<AgileSignerConfig>...</AgileSignerConfig>"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-[11px] font-mono text-muted-foreground">
              Endpoint: <code className="text-foreground font-bold">POST /api/v1/firmas/v2/files/tickets</code>
            </div>
            <Button
              type="button"
              onClick={handleEjecutarLlamadaV2}
              disabled={ejecutando}
              className="text-xs font-bold h-9 px-5 shadow-xs"
            >
              {ejecutando ? 'Ejecutando FirmaGob v2...' : 'Ejecutar Protocolo FirmaGob v2'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados de la Ejecución: JSON Request / Response y Descarga */}
      {(requestEnviado || responseRecibido || errorEjecucion) && (
        <Card className="border-border/80 bg-card overflow-hidden">
          <CardHeader className="p-4 pb-2 border-b bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                Inspección de Tráfico HTTP FirmaGob v2
              </CardTitle>
              {codigoHttp && (
                <Badge
                  variant={codigoHttp === 200 ? 'success' : codigoHttp === 429 ? 'danger' : 'warning'}
                  className="font-mono text-[10px] font-bold"
                >
                  HTTP {codigoHttp}
                </Badge>
              )}
            </div>

            {pdfFirmadoDescargable && (
              <a
                href={pdfFirmadoDescargable.url}
                download={pdfFirmadoDescargable.nombre}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-600 text-white text-xs font-bold shadow hover:bg-emerald-700 transition-colors"
              >
                Descargar PDF Firmado Oficial
              </a>
            )}
          </CardHeader>

          <CardContent className="p-4 space-y-4 text-xs">
            {errorEjecucion && (
              <div className="p-3 rounded border border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[11px]">
                [ERROR DE LLAMADA] {errorEjecucion}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Request JSON */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground font-mono">
                  REQUEST ENVIADO (HEADERS + BODY):
                </span>
                <pre className="p-3 rounded-lg border bg-muted/50 font-mono text-[11px] overflow-x-auto max-h-72 text-foreground select-all">
                  {JSON.stringify(requestEnviado, null, 2)}
                </pre>
              </div>

              {/* Response JSON */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground font-mono">
                  RESPONSE RECIBIDO (FIRMAGOB V2):
                </span>
                <pre className="p-3 rounded-lg border bg-muted/50 font-mono text-[11px] overflow-x-auto max-h-72 text-foreground select-all">
                  {JSON.stringify(
                    responseRecibido
                      ? {
                          ...responseRecibido,
                          files: responseRecibido.files?.map((f: any) => ({
                            ...f,
                            content: f.content ? `[Base64 firmado length: ${f.content.length} chars...]` : undefined,
                          })),
                        }
                      : null,
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guía de Códigos HTTP del Manual v18 */}
      <Card className="border-border/80 bg-card">
        <CardHeader className="p-4 pb-2 border-b">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tabla de Códigos de Respuesta HTTP - Manual FirmaGob v18
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded border bg-emerald-500/5 border-emerald-500/30">
              <strong className="text-emerald-600 dark:text-emerald-400">200 OK:</strong> Archivo firmado correctamente con SHA-256 original y firmado.
            </div>
            <div className="p-2 rounded border bg-amber-500/5 border-amber-500/30">
              <strong className="text-amber-600 dark:text-amber-400">400 Bad Request:</strong> JSON malformado o campos obligatorios faltantes.
            </div>
            <div className="p-2 rounded border bg-rose-500/5 border-rose-500/30">
              <strong className="text-rose-600 dark:text-rose-400">413 Payload Too Large:</strong> Archivo supera los 5 MB permitidos por el protocolo.
            </div>
            <div className="p-2 rounded border bg-rose-500/5 border-rose-500/30">
              <strong className="text-rose-600 dark:text-rose-400">429 Too Many Requests:</strong> RUN bloqueado por superar 5 intentos erróneos de OTP.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default EntornoPruebasFirmaGobV2;
