import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Shield, Smartphone, Copy, Check, RefreshCw, KeyRound, ExternalLink, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface ModalConfigurarTotpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalConfigurarTotp: React.FC<ModalConfigurarTotpProps> = ({ isOpen, onClose }) => {
  const { usuario } = useAuthStore();
  const [totpData, setTotpData] = useState<any | null>(null);
  const [cargando, setCargando] = useState(false);
  const [codigoPrueba, setCodigoPrueba] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [resultadoVerificacion, setResultadoVerificacion] = useState<{ valido: boolean; mensaje: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const cargarSetup = async () => {
    setCargando(true);
    setResultadoVerificacion(null);
    try {
      const res = await fetch('/api/v1/auth/totp/setup');
      if (res.ok) {
        const data = await res.json();
        setTotpData(data);
      }
    } catch {
      // Ignorar fallback
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarSetup();
      setCodigoPrueba('');
      setResultadoVerificacion(null);
      setCopiado(false);
    }
  }, [isOpen]);

  const handleCopiarClave = () => {
    if (totpData?.secretBase32) {
      navigator.clipboard.writeText(totpData.secretBase32);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  const handleVerificarCodigo = async () => {
    if (!codigoPrueba || codigoPrueba.trim().length !== 6) {
      setResultadoVerificacion({ valido: false, mensaje: 'Ingrese el código de 6 dígitos que figura en su app móvil.' });
      return;
    }

    setVerificando(true);
    setResultadoVerificacion(null);
    try {
      const res = await fetch('/api/v1/auth/totp/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigoPrueba.trim() }),
      });
      const data = await res.json();
      setResultadoVerificacion({
        valido: data.valido,
        mensaje: data.mensaje || (data.valido ? 'Código validado correctamente.' : 'Código inválido o expirado.'),
      });
    } catch (err: any) {
      setResultadoVerificacion({ valido: false, mensaje: err.message || 'Error al conectar con el servidor.' });
    } finally {
      setVerificando(false);
    }
  };

  const handleRegenerar = async () => {
    if (!window.confirm('¿Desea generar una nueva clave secreta? Tendrá que volver a escanear o ingresar la nueva clave en su aplicación móvil.')) {
      return;
    }
    setCargando(true);
    try {
      const res = await fetch('/api/v1/auth/totp/regenerar', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTotpData(data);
        setResultadoVerificacion(null);
      }
    } catch {
      // Ignorar
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl border-primary/30 shadow-2xl bg-card max-h-[92vh] overflow-y-auto">
        <CardHeader className="p-5 pb-3 border-b bg-primary/5 flex flex-row items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle className="text-base font-bold text-foreground">
                Configuración de OTP Móvil (Authenticator)
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Tecnología TOTP estándar (RFC 6238) para autorizar firmas electrónicas con su teléfono personal
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-5 space-y-5 text-xs">
          {cargando ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Generando credenciales criptográficas TOTP...</span>
            </div>
          ) : totpData ? (
            <>
              {/* Sección 1: QR Code y Clave Manual Base32 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-4 rounded-xl border bg-muted/20">
                {/* Código QR */}
                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-card border">
                  <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase mb-2">
                    Escanear con App Móvil
                  </span>
                  <div className="w-40 h-40 bg-white p-2 rounded-lg flex items-center justify-center shadow-xs">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                        totpData.otpauthUrl,
                      )}&size=160x160`}
                      alt="Código QR TOTP"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-2 text-center">
                    Google Auth • MS Authenticator • 2FAS
                  </span>
                </div>

                {/* Clave Manual Base32 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <span>¿Prefiere ingresar la clave manualmente?</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Si no puede escanear el QR, abra su app móvil, elija <strong>"Ingresar clave de configuración"</strong> y pegue el siguiente texto:
                  </p>

                  <div className="p-3 bg-muted rounded-lg border font-mono text-xs flex items-center justify-between gap-2">
                    <span className="font-bold tracking-widest text-primary break-all">
                      {totpData.secretBase32}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopiarClave}
                      className="h-7 px-2 shrink-0 text-xs gap-1"
                    >
                      {copiado ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiado ? 'Copiada' : 'Copiar'}</span>
                    </Button>
                  </div>

                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <div>• <strong>Cuenta:</strong> {totpData.email || usuario.email}</div>
                    <div>• <strong>Tipo:</strong> Basada en tiempo (cada 30s)</div>
                  </div>
                </div>
              </div>

              {/* Sección 2: Apps recomendadas */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">
                  Aplicaciones Móviles Oficiales Soportadas
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg border bg-card flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-xs text-foreground">Google Authenticator</div>
                      <span className="text-[10px] text-muted-foreground">Android e iOS</span>
                    </div>
                    <div className="flex gap-2 mt-2 pt-2 border-t text-[10px]">
                      <a
                        href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        Android <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <span className="text-muted-foreground">•</span>
                      <a
                        href="https://apps.apple.com/app/google-authenticator/id388497605"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        iPhone <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border bg-card flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-xs text-foreground">Microsoft Authenticator</div>
                      <span className="text-[10px] text-muted-foreground">Android e iOS</span>
                    </div>
                    <div className="flex gap-2 mt-2 pt-2 border-t text-[10px]">
                      <a
                        href="https://play.google.com/store/apps/details?id=com.azure.authenticator"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        Android <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <span className="text-muted-foreground">•</span>
                      <a
                        href="https://apps.apple.com/app/microsoft-authenticator/id983156458"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        iPhone <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border bg-card flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-xs text-foreground">2FAS / Aegis / FreeOTP</div>
                      <span className="text-[10px] text-muted-foreground">Código Abierto</span>
                    </div>
                    <div className="flex gap-2 mt-2 pt-2 border-t text-[10px]">
                      <a
                        href="https://2fas.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        Descargar 2FAS <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 3: Probar código en vivo */}
              <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    Comprobar Sincronización en Tiempo Real
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Paso Final
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Ingrese el código de 6 dígitos que ve ahora mismo en su aplicación móvil para certificar que está sincronizado:
                </p>

                <div className="flex items-center gap-2 max-w-sm">
                  <Input
                    type="text"
                    maxLength={6}
                    value={codigoPrueba}
                    onChange={(e) => setCodigoPrueba(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej: 481920"
                    className="text-base font-mono text-center tracking-widest h-10 font-bold"
                  />
                  <Button
                    type="button"
                    onClick={handleVerificarCodigo}
                    disabled={verificando || codigoPrueba.length !== 6}
                    className="h-10 px-4 text-xs font-semibold shrink-0"
                  >
                    {verificando ? 'Comprobando...' : 'Verificar'}
                  </Button>
                </div>

                {resultadoVerificacion && (
                  <div
                    className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 ${
                      resultadoVerificacion.valido
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {resultadoVerificacion.valido ? (
                      <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                    ) : (
                      <X className="w-4 h-4 shrink-0 text-rose-500" />
                    )}
                    <span>{resultadoVerificacion.mensaje}</span>
                  </div>
                )}
              </div>
            </>
          ) : null}

          {/* Botones inferiores */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRegenerar}
              className="text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerar Clave Secreta</span>
            </Button>

            <Button type="button" onClick={onClose} className="text-xs font-bold h-9 px-6">
              Listo / Continuar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
