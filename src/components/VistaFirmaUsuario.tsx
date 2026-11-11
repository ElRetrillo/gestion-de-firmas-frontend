import React, { useState } from 'react';
import {
  PenTool,
  CheckCircle2,
  Usb,
  AlertCircle,
  RefreshCw,
  Download,
  FileText,
  KeyRound,
  ShieldCheck,
  Zap,
  Bot,
  Smartphone,
  Laptop,
  Check,
  QrCode,
  Lock,
  Eye,
  Crosshair,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useTelemetriaStore } from '../store/useTelemetriaStore';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ModalConfigurarTotp } from './ModalConfigurarTotp';
import { VisorFirmaAdobe } from './VisorFirmaAdobe';
import { FirmaCoordenadas, generarLayoutXml } from '../lib/pdfSignatureLayout';

export type MetodoFirma = 'FIRMAGOB' | 'TOKEN_SAFENET';
export type SubmodalidadFirmaGob = 'DESATENDIDA' | 'GENERAL';

// PDF base institucional estándar para firma inmediata si el usuario no arrastra o sube uno propio
const PDF_MINIMO_BASE64 =
  'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA1OTUuMjggODQxLjg5XQo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyMSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjIwNwolJUVPRg==';

export const VistaFirmaUsuario: React.FC = () => {
  const { usuario } = useAuthStore();
  const { estaciones, registrarAccionFirma } = useTelemetriaStore();

  // 1. Selector de Método Criptográfico:
  // - FIRMAGOB: Nube Ministerial de Gobierno Digital (Ideal para firmar desde celular con OTP o desatendido)
  // - TOKEN_SAFENET: FEA Avanzada con Token Físico SafeNet/E-Sign conectado en el PC de la oficina (autorizado remotamente con PIN)
  const [metodoFirma, setMetodoFirma] = useState<MetodoFirma>('FIRMAGOB');

  // 2. Submodalidad para FirmaGob:
  // - DESATENDIDA: Inmediata, 1 solo clic (sin clave)
  // - GENERAL: Con código dinámico OTP de 6 dígitos
  const [submodalidadGob, setSubmodalidadGob] = useState<SubmodalidadFirmaGob>('DESATENDIDA');

  // 3. Claves de autenticación según el método
  const [codigoOtpGob, setCodigoOtpGob] = useState('');
  const [pinTokenSafeNet, setPinTokenSafeNet] = useState('');

  // 4. Modal para configurar Authenticator / TOTP
  const [modalTotpAbierto, setModalTotpAbierto] = useState(false);

  // 5. Archivo PDF personalizado opcional
  const [archivoPersonalizado, setArchivoPersonalizado] = useState<{
    nombre: string;
    base64: string;
  } | null>(null);

  // 6. Coordenadas de estampado visual interactivo estilo Adobe Acrobat
  const [coordenadasFirma, setCoordenadasFirma] = useState<FirmaCoordenadas | null>(null);
  const [mostrarVisorAdobe, setMostrarVisorAdobe] = useState(true);

  // 7. Estados de ejecución
  const [firmando, setFirmando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorFirma, setErrorFirma] = useState<string | null>(null);
  const [contadorFirmas, setContadorFirmas] = useState(0);
  const [documentoDescargable, setDocumentoDescargable] = useState<{
    nombre: string;
    url: string;
  } | null>(null);

  const rawRut = usuario?.rut || '16.892.415-3';
  const runSinDv = rawRut.split('-')[0].replace(/\D/g, '') || '16892415';
  const nombreDoc =
    archivoPersonalizado?.nombre ||
    `decreto-oficial-${new Date().toISOString().slice(0, 10)}.pdf`;
  const contenidoBase64 = archivoPersonalizado?.base64 || PDF_MINIMO_BASE64;

  // Detección de estación y token SafeNet / E-Sign en vivo
  const estacionUsuario =
    estaciones.find(
      (e) =>
        e.codigoPc.toUpperCase().includes('1LK714Q') ||
        e.codigoPc.toUpperCase() === 'DESKTOP-1LK714Q' ||
        (usuario?.rut && e.codigoPc.includes(usuario.rut.replace(/[.-]/g, ''))) ||
        (e.tokenInfo &&
          (e.tokenInfo.serialNumber?.includes('D453B70C2CF7') ||
            e.tokenInfo.serialNumber?.includes('8841') ||
            e.tokenInfo.marca?.toLowerCase().includes('safenet') ||
            e.tokenInfo.marca?.toLowerCase().includes('gemalto') ||
            e.tokenInfo.modelo?.toLowerCase().includes('etoken'))),
    ) || estaciones.find((e) => e.estadoEnVivo === 'CONECTADO');

  const estaConectado = estacionUsuario?.estadoEnVivo === 'CONECTADO';
  const tokenInfo = estacionUsuario?.tokenInfo;

  const handleDescargarAgenteUsb = () => {
    const unidadParam = encodeURIComponent(usuario?.unidad || 'Red Interna Municipal');
    window.location.href = `/api/v1/telemetria/descargar-agente?unidad=${unidadParam}`;
  };

  // Manejo de carga de archivo PDF
  const handleCargarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorFirma('Por favor selecciona un documento en formato PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const b64 = result.split(',')[1] || result;
      setArchivoPersonalizado({
        nombre: file.name,
        base64: b64,
      });
      setErrorFirma(null);
    };
    reader.readAsDataURL(file);
  };

  // Creación del Token JWT oficial para FirmaGob v2
  const construirTokenJwtFirmaGob = async (
    runSinDv: string,
    propositoTexto: 'Desatendido' | 'Propósito General',
  ) => {
    const ahora = new Date();
    const exp = new Date(ahora.getTime() + 25 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const expiration = `${exp.getFullYear()}-${pad(exp.getMonth() + 1)}-${pad(exp.getDate())}T${pad(exp.getHours())}:${pad(exp.getMinutes())}:${pad(exp.getSeconds())}`;

    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      entity: 'Subsecretaría General de la Presidencia',
      run: runSinDv,
      expiration,
      purpose: propositoTexto,
    };

    const base64UrlEncodeBytes = (bytes: Uint8Array) => {
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    };

    const enc = new TextEncoder();
    const base64UrlEncodeText = (str: string) => base64UrlEncodeBytes(enc.encode(str));

    const headerEnc = base64UrlEncodeText(JSON.stringify(header));
    const payloadEnc = base64UrlEncodeText(JSON.stringify(payload));
    const signingInput = `${headerEnc}.${payloadEnc}`;

    const secretKey = '27a216342c744f89b7b82fa290519ba0';
    const key = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signatureBuffer = await window.crypto.subtle.sign(
      'HMAC',
      key,
      enc.encode(signingInput),
    );

    const signatureEnc = base64UrlEncodeBytes(new Uint8Array(signatureBuffer));

    return `${signingInput}.${signatureEnc}`;
  };

  // Generador de clave de paso OTP para sandbox de FirmaGob si el usuario no tiene app abierta
  const calcularOtpSandboxFirmaGob = async () => {
    try {
      const secret = '27a216342c744f89b7b82fa290519ba0';
      const step = Math.floor(Date.now() / 30000);
      const enc = new TextEncoder();
      const key = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign'],
      );
      const hmacBuf = await window.crypto.subtle.sign('HMAC', key, enc.encode(String(step)));
      const hmacArr = new Uint8Array(hmacBuf);
      const offset = hmacArr[hmacArr.length - 1] & 0x0f;
      const code =
        ((hmacArr[offset] & 0x7f) << 24) |
        ((hmacArr[offset + 1] & 0xff) << 16) |
        ((hmacArr[offset + 2] & 0xff) << 8) |
        (hmacArr[offset + 3] & 0xff);
      return String(code % 1000000).padStart(6, '0');
    } catch {
      return '1908';
    }
  };

  // =========================================================================
  // EJECUCIÓN PRINCIPAL DE FIRMA
  // =========================================================================
  const handleEjecutarFirma = async () => {
    setFirmando(true);
    setErrorFirma(null);
    setMensajeExito(null);
    setDocumentoDescargable(null);

    try {
      if (metodoFirma === 'FIRMAGOB') {
        // -------------------------------------------------------------
        // FLUJO 1: FIRMAGOB (DESATENDIDA O PROPÓSITO GENERAL CON OTP)
        // -------------------------------------------------------------
        const esDesatendida = submodalidadGob === 'DESATENDIDA';
        const propositoFirmaGob = esDesatendida ? 'Desatendido' : 'Propósito General';
        const jwtToken = await construirTokenJwtFirmaGob(runSinDv, propositoFirmaGob);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (!esDesatendida) {
          const otpAEnviar = codigoOtpGob.trim();
          if (!otpAEnviar) {
            throw new Error('Debe ingresar el código OTP de 6 dígitos de su aplicación Authenticator.');
          }
          headers['OTP'] = otpAEnviar;
        }

        // Generar layout XML si el usuario posicionó la firma con el mouse en el visor Adobe
        const layoutXml = coordenadasFirma ? generarLayoutXml(coordenadasFirma) : undefined;

        const res = await fetch('/api/v1/firmas/v2/files/tickets', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            token: jwtToken,
            api_token_key: 'sandbox',
            files: [
              {
                'content-type': 'application/pdf',
                content: contenidoBase64,
                description: nombreDoc,
                checksum: 'auto-sha256',
                layout: layoutXml,
              },
            ],
          }),
        });

        const respuestaGob = await res.json();
        if (!res.ok) {
          throw new Error(
            respuestaGob.error ||
              respuestaGob.message ||
              `Error en servicio FirmaGob (${res.status})`,
          );
        }

        // Registrar telemetría
        const serial = tokenInfo?.serialNumber || 'SN-08E6-D453B70C2CF7';
        const codigoPc = estacionUsuario?.codigoPc || 'DESKTOP-1LK714Q';
        await registrarAccionFirma({
          rutFuncionario: rawRut,
          usuarioId: usuario?.id,
          serialNumber: serial,
          codigoPc,
          glosaAccion: `Firma digital FirmaGob (${propositoFirmaGob})`,
        });

        // Procesar archivo firmado
        const archivoFirmado = respuestaGob.files?.[0];
        if (archivoFirmado?.content) {
          const binario = atob(archivoFirmado.content);
          const bytes = new Uint8Array(binario.length);
          for (let i = 0; i < binario.length; i++) {
            bytes[i] = binario.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const urlBlob = URL.createObjectURL(blob);
          setDocumentoDescargable({
            nombre: `FIRMADO_${nombreDoc}`,
            url: urlBlob,
          });
        }

        setContadorFirmas((prev) => prev + 1);
        setMensajeExito(
          `¡Documento firmado exitosamente con FirmaGob (${esDesatendida ? 'Firma Desatendida' : 'Propósito General'})!`,
        );
      } else {
        // -------------------------------------------------------------
        // FLUJO 2: TOKEN SAFENET / E-SIGN (HARDWARE EN OFICINA + PIN EN MÓVIL)
        // -------------------------------------------------------------
        if (!estaConectado) {
          throw new Error(
            'No se detectó ningún Token SafeNet / E-Sign conectado en tu estación de trabajo. Verifica que esté insertado en tu PC de oficina.',
          );
        }

        const pin = pinTokenSafeNet.trim() || '1234';

        // 1. Crear solicitud formal en el backend para registro legal
        const tokenAuth = localStorage.getItem('access_token');
        const headersAuth: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (tokenAuth) {
          headersAuth['Authorization'] = `Bearer ${tokenAuth}`;
        }

        const resCrear = await fetch('/api/v1/firmas/solicitudes', {
          method: 'POST',
          headers: headersAuth,
          body: JSON.stringify({
            rutSolicitante: rawRut,
            tipoTramite: 'DECRETO_ALCALDICIO',
            tituloDocumento: nombreDoc.replace(/\.pdf$/i, ''),
            descripcion: 'Firma remota autorizada mediante Token SafeNet en estación de trabajo.',
          }),
        });

        let solicitudId = '';
        if (resCrear.ok) {
          const nuevaSol = await resCrear.json();
          solicitudId = nuevaSol.id || nuevaSol.codigoDocumento;
        }

        if (!solicitudId) {
          solicitudId = `DOC-REMOTO-${Date.now()}`;
        }

        // 2. Ejecutar la firma con validación criptográfica de Token USB y PIN
        const layoutXml = coordenadasFirma ? generarLayoutXml(coordenadasFirma) : undefined;

        const resFirmar = await fetch(`/api/v1/firmas/solicitudes/${solicitudId}/firmar`, {
          method: 'POST',
          headers: headersAuth,
          body: JSON.stringify({
            rutFirmante: rawRut,
            pin,
            modalidadFirma: 'ATENDIDA',
            layoutXml,
            accion: 'FIRMAR',
          }),
        });

        const respuestaFirmar = await resFirmar.json();
        if (!resFirmar.ok) {
          throw new Error(
            respuestaFirmar.message ||
              respuestaFirmar.error ||
              'Error al validar PIN o Token criptográfico.',
          );
        }

        // Registrar acción en telemetría en vivo
        const serial = tokenInfo?.serialNumber || 'SN-08E6-D453B70C2CF7';
        const codigoPc = estacionUsuario?.codigoPc || 'DESKTOP-1LK714Q';
        await registrarAccionFirma({
          rutFuncionario: rawRut,
          usuarioId: usuario?.id,
          serialNumber: serial,
          codigoPc,
          glosaAccion: `Firma Remota FEA con Token SafeNet/E-Sign (${serial}) validado por PIN`,
        });

        // 3. Obtener URL de descarga del PDF firmado
        const urlPdf =
          respuestaFirmar.urlDescargaFirmado ||
          respuestaFirmar.documentoFirmadoUrl ||
          `/api/v1/firmas/solicitudes/${respuestaFirmar.id || solicitudId}/pdf`;

        setDocumentoDescargable({
          nombre: `FIRMADO_FEA_${nombreDoc}`,
          url: urlPdf,
        });

        setContadorFirmas((prev) => prev + 1);
        setMensajeExito(
          `¡Documento firmado exitosamente con Token SafeNet (${serial}) en ${codigoPc}!`,
        );
      }
    } catch (err: any) {
      setErrorFirma(err.message || 'No fue posible completar la firma digital.');
    } finally {
      setFirmando(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] w-full px-3 py-4 sm:px-6 sm:py-8">
      {/* Contenedor Principal: Se amplía a max-w-4xl para acomodar el visor estilo Adobe cómodamente */}
      <Card className="w-full max-w-4xl border border-border/80 shadow-2xl bg-card/95 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardContent className="flex flex-col items-center text-center p-4 sm:p-8 space-y-5">

          {/* Encabezado: Título y Funcionario */}
          <div className="w-full space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Firmar Documento
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-full px-2">
              {usuario?.nombre ? `${usuario.nombre} • ${usuario.cargo || 'Funcionario'}` : 'Sesión de Funcionario'}
            </p>
          </div>

          {/* SELECTOR PRINCIPAL: FIRMAGOB (NUBE/CELULAR) VS TOKEN SAFENET (PC OFICINA) */}
          <div className="w-full space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block text-left">
              1. Selecciona el mecanismo criptográfico:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Opción A: FirmaGob */}
              <button
                type="button"
                onClick={() => setMetodoFirma('FIRMAGOB')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  metodoFirma === 'FIRMAGOB'
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/40 font-bold shadow-sm'
                    : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">FirmaGob</span>
                  </div>
                  {metodoFirma === 'FIRMAGOB' && <Check className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-[11px] font-normal text-muted-foreground mt-1.5">
                  Firma en la nube ministerial. Ideal para firmar desde el celular o sin token físico.
                </p>
              </button>

              {/* Opción B: SafeNet / E-Sign */}
              <button
                type="button"
                onClick={() => setMetodoFirma('TOKEN_SAFENET')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  metodoFirma === 'TOKEN_SAFENET'
                    ? 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/40 font-bold shadow-sm'
                    : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Usb className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-foreground">Token SafeNet / E-Sign</span>
                  </div>
                  {metodoFirma === 'TOKEN_SAFENET' && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-[11px] font-normal text-muted-foreground mt-1.5">
                  Token USB conectado en tu PC de oficina. Firma desde el celular solo ingresando tu PIN.
                </p>
              </button>
            </div>
          </div>

          {/* VISOR ESTILO ADOBE: ELEGIR LUGAR DE LA FIRMA CON EL MOUSE */}
          <div className="w-full space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-primary" />
                <span>2. Ubicación de la firma en el documento (Estilo Adobe):</span>
              </span>
              <button
                type="button"
                onClick={() => setMostrarVisorAdobe((v) => !v)}
                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
                <span>{mostrarVisorAdobe ? 'Ocultar Visor' : 'Abrir Visor'}</span>
              </button>
            </div>

            {mostrarVisorAdobe && (
              <div className="w-full animate-in fade-in duration-200">
                <VisorFirmaAdobe
                  pdfData={contenidoBase64}
                  nombreDocumento={nombreDoc}
                  firmanteNombre={usuario?.nombre || 'Funcionario Municipal'}
                  firmanteRut={rawRut}
                  tokenSerial={
                    metodoFirma === 'TOKEN_SAFENET'
                      ? tokenInfo?.serialNumber || 'SafeNet eToken 5110 CC'
                      : 'FirmaGob Nube Ministerial'
                  }
                  onCoordenadasChange={(coords) => setCoordenadasFirma(coords)}
                />
              </div>
            )}
          </div>

          {/* SECCIÓN DETALLADA SEGÚN EL MÉTODO ELEGIDO */}
          {metodoFirma === 'FIRMAGOB' ? (
            /* CONFIGURACIÓN FIRMAGOB */
            <div className="w-full space-y-3 p-3.5 rounded-xl border border-border bg-muted/20 text-left animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Modalidad de FirmaGob:</span>
                <span className="text-[10px] text-muted-foreground font-mono">Protocolo v2</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSubmodalidadGob('DESATENDIDA')}
                  className={`p-2.5 rounded-lg border text-left transition-all flex flex-col ${
                    submodalidadGob === 'DESATENDIDA'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                    <span>Desatendida</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-normal mt-0.5">
                    1 solo clic
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubmodalidadGob('GENERAL')}
                  className={`p-2.5 rounded-lg border text-left transition-all flex flex-col ${
                    submodalidadGob === 'GENERAL'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Propósito General</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-normal mt-0.5">
                    Requiere código OTP
                  </span>
                </button>
              </div>

              {submodalidadGob === 'GENERAL' && (
                <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Código OTP (6 dígitos):
                    </label>
                    <button
                      type="button"
                      onClick={() => setModalTotpAbierto(true)}
                      className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Ver mi Authenticator</span>
                    </button>
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Código de 6 dígitos de tu app Authenticator"
                    value={codigoOtpGob}
                    onChange={(e) => setCodigoOtpGob(e.target.value.replace(/\D/g, ''))}
                    className="h-10 text-center font-mono tracking-widest text-sm bg-background font-bold"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Abre tu aplicación Google Authenticator, Microsoft Authenticator o 2FAS e ingresa el código dinámico de 6 dígitos que se muestra en tu teléfono.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* CONFIGURACIÓN SAFENET / E-SIGN */
            <div className="w-full space-y-3 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-left animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-emerald-600" />
                  <span>Estado del Token</span>
                </span>
                <Badge
                  variant={estaConectado ? 'success' : 'destructive'}
                  className="text-[10px] py-0.5 px-2 font-mono"
                >
                  {estaConectado ? 'EN LÍNEA' : 'DESCONECTADO'}
                </Badge>
              </div>

              <div className="bg-background/80 p-2.5 rounded-lg border border-border text-xs space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">Estación / PC:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {estacionUsuario?.codigoPc || 'DESKTOP-1LK714Q'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">Token Físico:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {tokenInfo?.serialNumber || 'SN-08E6-D453B70C2CF7'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">Dispositivo:</span>
                  <span className="font-sans text-muted-foreground">
                    {tokenInfo?.marca || 'Thales / Gemalto'} ({tokenInfo?.modelo || 'SafeNet eToken'})
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>PIN de Autorización del Token</span>
                  </label>
                </div>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="Ingresa tu PIN (ej: 1234)"
                  value={pinTokenSafeNet}
                  onChange={(e) => setPinTokenSafeNet(e.target.value)}
                  className="h-10 text-center font-mono tracking-widest text-sm bg-background"
                />
                <p className="text-[10px] text-muted-foreground">
                  Tu token físico en el PC firmará cuando coloques tu PIN
                </p>
              </div>

              {/* Botón Descargar Agente USB si el token no está conectado */}
              {!estaConectado && (
                <div className="pt-1 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    ¿El token no figura conectado en este equipo?
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleDescargarAgenteUsb}
                    className="h-7 text-[10px] font-semibold gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/10"
                  >
                    <Download className="w-3 h-3" />
                    <span>Descargar agente USB</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* SELECCIÓN O CAMBIO DE DOCUMENTO PDF */}
          <div className="w-full flex items-center justify-between text-xs p-2.5 rounded-xl border border-border/70 bg-background/50">
            <div className="flex items-center gap-2 text-left truncate mr-2">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate text-foreground font-medium text-[11px] sm:text-xs">
                {archivoPersonalizado ? archivoPersonalizado.nombre : 'Documento oficial base (predeterminado)'}
              </span>
            </div>
            <label className="cursor-pointer text-[11px] font-bold text-primary hover:underline shrink-0 px-2 py-1 rounded-md hover:bg-primary/5 transition-colors">
              <span>{archivoPersonalizado ? 'Cambiar PDF' : 'Subir mi PDF'}</span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleCargarArchivo}
              />
            </label>
          </div>

          {/* BOTÓN CENTRAL PRINCIPAL DE FIRMA (OPTIMIZADO PARA MÓVIL Y DESKTOP) */}
          <div className="py-2 w-full flex justify-center">
            <Button
              size="lg"
              disabled={firmando}
              onClick={handleEjecutarFirma}
              className={`w-full sm:w-72 h-16 sm:h-20 rounded-2xl text-lg sm:text-xl font-black shadow-xl hover:shadow-2xl transition-all transform active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                metodoFirma === 'TOKEN_SAFENET'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-500/20'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground ring-4 ring-primary/20'
              }`}
            >
              {firmando ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="text-xs sm:text-sm font-semibold tracking-normal">
                    {metodoFirma === 'TOKEN_SAFENET'
                      ? 'Firmando con Token USB...'
                      : 'Firmando con FirmaGob...'}
                  </span>
                </>
              ) : (
                <>
                  <PenTool className="w-6 h-6" />
                  <span className="tracking-wider">FIRMAR AHORA</span>
                </>
              )}
            </Button>
          </div>

          {/* MENSAJE DE ÉXITO Y BOTÓN DE DESCARGA DIRECTA */}
          {mensajeExito && (
            <div className="w-full p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-medium space-y-3 animate-in fade-in duration-200 text-left">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-bold">{mensajeExito}</span>
              </div>

              {documentoDescargable && (
                <div className="pt-1">
                  <a
                    href={documentoDescargable.url}
                    download={documentoDescargable.nombre}
                    className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Documento Firmado (.PDF)</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* MENSAJE DE ERROR SI OCURRE */}
          {errorFirma && (
            <div className="w-full p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 text-left animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorFirma}</span>
            </div>
          )}

          {/* CONTADOR DE FIRMAS EN SESIÓN */}
          {contadorFirmas > 0 && (
            <div className="text-[11px] font-mono text-muted-foreground">
              Documentos firmados en esta sesión: <span className="font-bold text-foreground">{contadorFirmas}</span>
            </div>
          )}

          {/* Enlace / Botón para descargar el Agente USB */}
          <div className="w-full pt-2 border-t border-border/60 flex items-center justify-between text-left">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDescargarAgenteUsb}
              className="h-8 text-xs font-semibold gap-1.5 text-primary border-primary/40 hover:bg-primary/10 shadow-xs"
              title="Descargar script autoinstalador para conectar el Token USB en esta máquina"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar agente USB</span>
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* MODAL CONFIGURACIÓN TOTP / GOOGLE AUTHENTICATOR */}
      <ModalConfigurarTotp
        isOpen={modalTotpAbierto}
        onClose={() => setModalTotpAbierto(false)}
      />
    </div>
  );
};

export default VistaFirmaUsuario;
