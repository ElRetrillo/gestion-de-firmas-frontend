import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';
import QRCode from 'qrcode';
import { useAuthStore } from '../store/useAuthStore';
import { LogoMunicipalidad } from './LogoMunicipalidad';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { formatRut } from '../lib/rut';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const { loginSuccess, actualizarPasswordCompletada } = useAuthStore();

  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarPassLogin, setMostrarPassLogin] = useState(false);

  // Estado para cambio de PIN/contraseña obligatorio y MFA Authenticator
  const [modoCambioPassword, setModoCambioPassword] = useState(false);
  const [modoMfa, setModoMfa] = useState(false);
  const [totpSetup, setTotpSetup] = useState<{
    secretBase32: string;
    otpauthUrl: string;
    email?: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [codigoTotp, setCodigoTotp] = useState('');
  const [tokenTemporal, setTokenTemporal] = useState<string | null>(null);
  const [usuarioTemporal, setUsuarioTemporal] = useState<any>(null);
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirmacion, setPasswordConfirmacion] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (totpSetup?.otpauthUrl) {
      QRCode.toDataURL(totpSetup.otpauthUrl, { width: 176, margin: 1 })
        .then((url) => {
          if (!cancelled) setQrDataUrl(url);
        })
        .catch(() => {
          if (!cancelled) setQrDataUrl(null);
        });
    } else {
      setQrDataUrl(null);
    }
    return () => {
      cancelled = true;
    };
  }, [totpSetup]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent, otpOverride?: string) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const otpEnviar = (otpOverride ?? codigoTotp).trim();
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut: formatRut(rut.trim()) || rut.trim(),
          password,
          ...(otpEnviar ? { codigoTotp: otpEnviar } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Credenciales institucionales inválidas.');
      }

      // Si el backend indica que debe definir PIN/contraseña inicial (+ MFA Authenticator)
      if (data.debeCambiarPassword) {
        setTokenTemporal(data.accessToken);
        setUsuarioTemporal(data.usuario);
        setPasswordActual(password);
        setTotpSetup(data.totpSetup || null);
        setCodigoTotp('');
        setModoCambioPassword(true);
        setModoMfa(false);
        setCargando(false);
        return;
      }

      // Si el backend requiere segundo factor TOTP Authenticator
      if (data.requiereMfa && !data.accessToken) {
        setUsuarioTemporal({ nombre: data.nombre, rut: data.rut, email: data.email });
        setTotpSetup(data.totpSetup || null);
        setCodigoTotp('');
        setModoMfa(true);
        setCargando(false);
        return;
      }

      // Login exitoso definitivo (sesión de 3 horas)
      setModoMfa(false);
      setModoCambioPassword(false);
      setTotpSetup(null);
      setCodigoTotp('');
      loginSuccess(data);
      onClose();
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al comunicarse con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  const handleCambioPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pinClean = passwordNueva.trim();
    if (pinClean.length !== 6) {
      setError('El nuevo PIN personal debe tener exactamente 6 caracteres.');
      return;
    }
    if (pinClean !== passwordConfirmacion.trim()) {
      setError('Los PINs ingresados no coinciden.');
      return;
    }
    if (pinClean === passwordActual.trim()) {
      setError('El nuevo PIN debe ser distinto al PIN temporal actual.');
      return;
    }
    if (totpSetup && !/^\d{6}$/.test(codigoTotp.trim())) {
      setError('Ingrese el código de 6 dígitos generado por su aplicación Authenticator para vincular MFA.');
      return;
    }

    setCargando(true);
    try {
      const res = await fetch('/api/v1/auth/cambiar-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenTemporal}`,
        },
        body: JSON.stringify({
          passwordActual: passwordActual.trim(),
          passwordNueva: pinClean,
          ...(codigoTotp.trim() ? { codigoTotp: codigoTotp.trim() } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo actualizar el PIN personal.');
      }

      setModoCambioPassword(false);
      setTotpSetup(null);
      setCodigoTotp('');
      actualizarPasswordCompletada(data);
      onClose();
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al procesar el cambio de PIN.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-md max-h-[94dvh] overflow-y-auto border-border/80 shadow-2xl bg-card" aria-labelledby="login-modal-title">
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-6 border-b bg-muted/30 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-3 min-w-0">
            <LogoMunicipalidad variant="sidebar" className="h-10 w-10 shrink-0" />
            <div className="min-w-0">
              <h2 id="login-modal-title" className="text-base font-bold text-foreground leading-snug">
                {modoCambioPassword
                  ? 'Configurar PIN Personal y MFA'
                  : modoMfa
                    ? 'Verificación MFA Authenticator'
                    : 'Acceso Administradores'}
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">
                {modoCambioPassword
                  ? 'Primer ingreso de Administrador'
                  : modoMfa
                    ? 'Segundo factor de autenticación'
                    : 'Ilustre Municipalidad de Coquimbo'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setModoCambioPassword(false);
              setModoMfa(false);
              setTotpSetup(null);
              setCodigoTotp('');
              onClose();
            }}
            className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 rounded-md shrink-0"
            aria-label="Cerrar ventana"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {error && (
            <div role="alert" aria-live="polite" className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-md">
              <span className="font-bold">Aviso:</span> {error}
            </div>
          )}

          {!modoCambioPassword && !modoMfa ? (
            <form onSubmit={handleLogin} className="space-y-4" aria-labelledby="login-modal-title">
              <p className="text-xs text-muted-foreground">
                Ingresa tu RUT institucional y PIN de acceso (6 caracteres).
              </p>

              <div className="space-y-1.5">
                <label htmlFor="login-rut" className="text-xs font-semibold text-foreground flex items-center justify-between gap-2">
                  <span>RUT Institucional</span>
                  <span className="text-[10px] font-mono text-muted-foreground">Ej: 12.345.678-9</span>
                </label>
                <Input
                  id="login-rut"
                  name="rut"
                  type="text"
                  autoComplete="username"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="next"
                  placeholder="12.345.678-9"
                  value={rut}
                  onChange={(e) => setRut(formatRut(e.target.value))}
                  className="font-mono text-sm"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-pin" className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>PIN de Acceso (6 caracteres)</span>
                  <span className="text-[10px] text-muted-foreground">PIN de administrador</span>
                </label>
                <div className="relative">
                  <Input
                    id="login-pin"
                    name="password"
                    type={mostrarPassLogin ? 'text' : 'password'}
                    autoComplete="current-password"
                    enterKeyHint="done"
                    placeholder="Ingrese su PIN de 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-sm pr-10 font-mono"
                    required
                  />
                  <button
                    type="button"
                    aria-pressed={mostrarPassLogin}
                    onClick={() => setMostrarPassLogin((v) => !v)}
                    aria-label={mostrarPassLogin ? 'Ocultar PIN' : 'Mostrar PIN'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    {mostrarPassLogin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={cargando}
                  className="w-full font-bold text-sm h-10 shadow-md"
                >
                  {cargando ? 'Validando credenciales...' : 'Iniciar Sesión'}
                </Button>
              </div>
            </form>
          ) : modoMfa ? (
            /* Formulario de Segundo Factor MFA Authenticator */
            <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
              <div className="p-3 rounded-md bg-primary/10 border border-primary/30 text-[11px] text-foreground space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                  <span>{usuarioTemporal?.nombre || 'Administrador Municipal'}</span>
                </p>
                <p className="text-muted-foreground">
                  Para proteger el panel de administración, ingrese el código dinámico de 6 dígitos de Google Authenticator / Microsoft Authenticator.
                </p>
              </div>

              {totpSetup && (
                <div className="p-3 rounded-lg border bg-muted/30 space-y-2.5">
                  <div className="text-[11px] font-bold text-foreground">
                    Primera vinculación Authenticator (Escanee el QR o copie la clave):
                  </div>
                  {qrDataUrl && (
                    <div className="flex justify-center bg-white p-2 rounded border">
                      <img src={qrDataUrl} alt="Código QR para Authenticator" className="w-40 h-40" />
                    </div>
                  )}
                  <div className="text-[10px] font-mono bg-background border rounded p-2 break-all select-all">
                    <span className="text-muted-foreground block mb-0.5">Clave Secreta (Base32):</span>
                    <span className="font-bold text-primary">{totpSetup.secretBase32}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="mfa-otp-input" className="text-xs font-semibold text-foreground block">
                  Código Authenticator (6 dígitos)
                </label>
                <p id="mfa-otp-hint" className="text-[11px] text-muted-foreground">
                  Ingrese el código de 6 dígitos vigente en su app Authenticator.
                </p>
                <Input
                  id="mfa-otp-input"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  aria-describedby="mfa-otp-hint"
                  placeholder="000000"
                  value={codigoTotp}
                  onChange={(e) => setCodigoTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="font-mono text-lg tracking-[0.35em] text-center h-11"
                  required
                  autoFocus
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModoMfa(false);
                    setCodigoTotp('');
                    setError(null);
                  }}
                  className="text-xs h-10 w-full sm:w-auto"
                >
                  Volver
                </Button>
                <Button
                  type="submit"
                  disabled={cargando}
                  className="flex-1 font-bold text-xs h-10 shadow-md"
                >
                  {cargando ? 'Verificando código MFA...' : 'Verificar e Ingresar'}
                </Button>
              </div>
            </form>
          ) : (
            /* Formulario de Definición de PIN Personal (6 caracteres) + Enrolamiento MFA */
            <form onSubmit={handleCambioPassword} className="space-y-3.5">
              <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-700 dark:text-amber-300">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 shrink-0" />
                  <span>Bienvenido(a), {usuarioTemporal?.nombre || 'Administrador'}.</span>
                </p>
                <p>
                  Defina su PIN personal de <strong>6 caracteres</strong> y vincule su aplicación Authenticator antes de iniciar sesión (sesión válida por 3 horas).
                </p>
              </div>

              <div className="space-y-1">
                <label htmlFor="pin-temporal-actual" className="text-xs font-semibold text-foreground">
                  PIN Temporal Actual
                </label>
                <Input
                  id="pin-temporal-actual"
                  type="password"
                  autoComplete="current-password"
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  className="text-xs font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label htmlFor="pin-nuevo-personal" className="text-xs font-semibold text-foreground">
                    Nuevo PIN (6 caracteres)
                  </label>
                  <Input
                    id="pin-nuevo-personal"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Ej: A9x#21"
                    maxLength={6}
                    value={passwordNueva}
                    onChange={(e) => setPasswordNueva(e.target.value.slice(0, 6))}
                    className="text-xs font-mono"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="pin-nuevo-confirmar" className="text-xs font-semibold text-foreground">
                    Confirmar PIN
                  </label>
                  <Input
                    id="pin-nuevo-confirmar"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repetir PIN"
                    maxLength={6}
                    value={passwordConfirmacion}
                    onChange={(e) => setPasswordConfirmacion(e.target.value.slice(0, 6))}
                    className="text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div className={passwordNueva.trim().length === 6 ? 'text-emerald-500 font-semibold' : ''}>
                  ✓ Exactamente 6 caracteres ({passwordNueva.trim().length}/6)
                </div>
                <div className={passwordNueva.trim().length === 6 && passwordNueva === passwordConfirmacion ? 'text-emerald-500 font-semibold' : ''}>
                  ✓ Coincidencia de PIN confirmada
                </div>
              </div>

              {totpSetup && (
                <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                  <div className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    <span>Vincular MFA Authenticator (Obligatorio)</span>
                  </div>
                  {qrDataUrl && (
                    <div className="flex justify-center bg-white p-2 rounded border">
                      <img src={qrDataUrl} alt="QR Authenticator Camila Herrera" className="w-36 h-36" />
                    </div>
                  )}
                  <div className="text-[10px] font-mono bg-background border rounded p-2 break-all select-all">
                    <span className="text-muted-foreground block mb-0.5">Clave secreta manual (Base32):</span>
                    <span className="font-bold text-primary">{totpSetup.secretBase32}</span>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="setup-otp-input" className="text-[11px] font-semibold text-foreground block">
                      Código Authenticator (6 dígitos)
                    </label>
                    <p id="setup-otp-hint" className="text-[10px] text-muted-foreground">
                      Escanee el QR en Google/Microsoft Authenticator e ingrese el código de 6 dígitos para confirmar.
                    </p>
                    <Input
                      id="setup-otp-input"
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="\d{6}"
                      maxLength={6}
                      aria-describedby="setup-otp-hint"
                      placeholder="000000"
                      value={codigoTotp}
                      onChange={(e) => setCodigoTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="font-mono text-base tracking-[0.35em] text-center h-9"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={cargando}
                  className="w-full font-bold text-xs h-10 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {cargando ? 'Guardando PIN y MFA...' : 'Guardar PIN Personal y Acceder'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
