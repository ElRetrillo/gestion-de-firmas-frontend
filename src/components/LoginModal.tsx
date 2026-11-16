import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { LogoMunicipalidad } from './LogoMunicipalidad';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { formatRut } from '../lib/rut';
import {
  CATALOGO_ROLES_RBAC,
  CALIDADES_CONTRACTUALES_RBAC,
} from '../lib/rbacFirmas';

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
  const [exitoRegistro, setExitoRegistro] = useState<string | null>(null);

  // Pestaña Login vs Registro autónomo
  const [tabAuth, setTabAuth] = useState<'LOGIN' | 'REGISTRO'>('LOGIN');

  // Campos para Registro autónomo
  const [regRut, setRegRut] = useState('');
  const [regNombre, setRegNombre] = useState('');
  const [regApellido, setRegApellido] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConf, setRegPasswordConf] = useState('');
  const [regCargo, setRegCargo] = useState('Profesionales');
  const [regCalidadContractual, setRegCalidadContractual] = useState('CONTRATA');
  const [regUnidad, setRegUnidad] = useState('');

  // Estado para cambio de contraseña obligatorio
  const [modoCambioPassword, setModoCambioPassword] = useState(false);
  const [tokenTemporal, setTokenTemporal] = useState<string | null>(null);
  const [usuarioTemporal, setUsuarioTemporal] = useState<any>(null);
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirmacion, setPasswordConfirmacion] = useState('');

  if (!isOpen) return null;

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExitoRegistro(null);

    if (!regRut.trim() || !regNombre.trim() || !regApellido.trim()) {
      setError('RUT, Nombre y Apellido son obligatorios.');
      return;
    }
    if (regPassword.length < 10) {
      setError('La contraseña debe tener al menos 10 caracteres.');
      return;
    }
    if (!/[A-Z]/.test(regPassword) || !/[a-z]/.test(regPassword) || !/\d/.test(regPassword)) {
      setError('La contraseña debe incluir mayúsculas, minúsculas y números.');
      return;
    }
    if (regPassword !== regPasswordConf) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);
    try {
      const res = await fetch('/api/v1/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut: formatRut(regRut.trim()) || regRut.trim(),
          nombre: regNombre.trim(),
          apellido: regApellido.trim(),
          email: regEmail.trim() || undefined,
          password: regPassword,
          cargo: regCargo.trim() || 'Profesionales',
          condicionContractual: regCalidadContractual,
          unidad: regUnidad.trim() || 'I. Municipalidad de Coquimbo',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al procesar el registro.');
      }

      setExitoRegistro(
        '¡Registro recibido con éxito! Tu cuenta está a la espera de que el Administrador te asigne un rol en el panel de control para que puedas iniciar sesión.',
      );
      setTabAuth('LOGIN');
      setRut(regRut);
    } catch (err: any) {
      setError(err.message || 'Error al comunicarse con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut: formatRut(rut.trim()) || rut.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Credenciales institucionales inválidas.');
      }

      // Si el backend indica que debe cambiar contraseña obligatoriamente
      if (data.debeCambiarPassword) {
        setTokenTemporal(data.accessToken);
        setUsuarioTemporal(data.usuario);
        setPasswordActual(password);
        setModoCambioPassword(true);
        setCargando(false);
        return;
      }

      // Login exitoso definitivo
      loginSuccess(data);
      onClose();
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al comunicarse con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  const handleLoginClaveUnica = async () => {
    setError(null);
    setCargando(true);
    try {
      const rutTarget = formatRut(rut.trim()) || rut.trim();
      const res = await fetch('/api/v1/auth/claveunica/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut: rutTarget || undefined,
          state: 'cqm-oauth-2026',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo autenticar mediante ClaveÚnica.');
      }
      if (data.debeCambiarPassword) {
        setTokenTemporal(data.accessToken);
        setUsuarioTemporal(data.usuario);
        setModoCambioPassword(true);
        setCargando(false);
        return;
      }
      loginSuccess(data);
      onClose();
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al validar sesión con ClaveÚnica.');
    } finally {
      setCargando(false);
    }
  };

  const handleCambioPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (passwordNueva.length < 10) {
      setError('La nueva contraseña debe tener al menos 10 caracteres.');
      return;
    }
    if (!/[A-Z]/.test(passwordNueva) || !/[a-z]/.test(passwordNueva) || !/\d/.test(passwordNueva)) {
      setError('La contraseña debe contener mayúsculas, minúsculas y números.');
      return;
    }
    if (passwordNueva !== passwordConfirmacion) {
      setError('Las contraseñas ingresadas no coinciden.');
      return;
    }
    if (passwordNueva === passwordActual) {
      setError('La nueva contraseña debe ser distinta de la contraseña temporal.');
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
          passwordActual,
          passwordNueva,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo actualizar la contraseña.');
      }

      actualizarPasswordCompletada(data);
      onClose();
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al procesar el cambio de contraseña.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-md border-border/80 shadow-2xl bg-card overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="p-6 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <LogoMunicipalidad variant="sidebar" className="h-10 w-10 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-foreground">
                {modoCambioPassword ? 'Actualización de Contraseña' : 'Iniciar Sesión Institucional'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {modoCambioPassword ? 'Actualización de Seguridad' : 'Ilustre Municipalidad de Coquimbo'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 rounded-md"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        <CardContent className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-md">
              <span className="font-bold">Aviso:</span> {error}
            </div>
          )}

          {exitoRegistro && (
            <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-md">
              <span className="font-bold">✓ Éxito:</span> {exitoRegistro}
            </div>
          )}

          {!modoCambioPassword ? (
            <div>
              {/* Selector de Pestañas: Iniciar Sesión vs Registrarse */}
              <div className="flex border-b border-border mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setTabAuth('LOGIN');
                    setError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors ${
                    tabAuth === 'LOGIN'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTabAuth('REGISTRO');
                    setError(null);
                    setExitoRegistro(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors ${
                    tabAuth === 'REGISTRO'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Registrarse
                </button>
              </div>

              {tabAuth === 'LOGIN' ? (
                /* Formulario de Login */
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>RUT Institucional</span>
                      <span className="text-[10px] font-mono text-muted-foreground">Ej: 12.345.678-9</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="12.345.678-9"
                      value={rut}
                      onChange={(e) => setRut(formatRut(e.target.value))}
                      className="font-mono text-sm"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Contraseña</span>
                      <span className="text-[10px] text-muted-foreground">Clave institucional</span>
                    </label>
                    <Input
                      type="password"
                      placeholder=""
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="text-sm"
                      required
                    />
                  </div>

                  <div className="pt-2 space-y-2.5">
                    <Button
                      type="submit"
                      disabled={cargando}
                      className="w-full font-bold text-sm h-10 shadow-md"
                    >
                      {cargando ? 'Validando credenciales...' : 'Iniciar Sesión (Directorio Municipal)'}
                    </Button>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-border/60" />
                      <span className="flex-shrink mx-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        o autenticación del Estado
                      </span>
                      <div className="flex-grow border-t border-border/60" />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={cargando}
                      onClick={handleLoginClaveUnica}
                      className="w-full font-bold text-xs h-9 border-blue-600/40 text-blue-700 dark:text-blue-400 hover:bg-blue-600/10"
                    >
                      Ingresar con ClaveÚnica (OAuth2 Estado)
                    </Button>
                  </div>

                  <div className="text-center pt-1">
                    <span className="text-[10px] text-muted-foreground">
                      Acceso exclusivo para funcionarios de la Municipalidad de Coquimbo
                    </span>
                  </div>
                </form>
              ) : (
                /* Formulario de Registro Autónomo */
                <form onSubmit={handleRegistro} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">Nombre</label>
                      <Input
                        type="text"
                        placeholder="Ej: Claudia"
                        value={regNombre}
                        onChange={(e) => setRegNombre(e.target.value)}
                        className="text-xs h-8"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">Apellido</label>
                      <Input
                        type="text"
                        placeholder="Ej: Morales Gómez"
                        value={regApellido}
                        onChange={(e) => setRegApellido(e.target.value)}
                        className="text-xs h-8"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                      <span>RUT</span>
                      <span className="text-[10px] text-muted-foreground font-mono">Con o sin puntos</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="12.345.678-9"
                      value={regRut}
                      onChange={(e) => setRegRut(formatRut(e.target.value))}
                      className="text-xs font-mono h-8"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">Grado / Rol Funcional (RBAC)</label>
                      <select
                        value={regCargo}
                        onChange={(e) => setRegCargo(e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                      >
                        {CATALOGO_ROLES_RBAC.map((rolItem) => (
                          <option key={rolItem.id} value={rolItem.etiqueta}>
                            {rolItem.etiqueta}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">Calidad Contractual</label>
                      <select
                        value={regCalidadContractual}
                        onChange={(e) => setRegCalidadContractual(e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                      >
                        {CALIDADES_CONTRACTUALES_RBAC.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.etiqueta}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">Unidad</label>
                      <Input
                        type="text"
                        placeholder="Ej: Dirección de Obras"
                        value={regUnidad}
                        onChange={(e) => setRegUnidad(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Correo Electrónico (opcional)</label>
                    <Input
                      type="email"
                      placeholder="nombre@municoquimbo.cl"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">Contraseña</label>
                      <Input
                        type="password"
                        placeholder="Mín. 10 car."
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="text-xs h-8"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">Confirmar</label>
                      <Input
                        type="password"
                        placeholder="Repetir"
                        value={regPasswordConf}
                        onChange={(e) => setRegPasswordConf(e.target.value)}
                        className="text-xs h-8"
                        required
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-muted-foreground pt-0.5">
                    Nota: Al registrarte, un administrador revisará tu cuenta y te asignará el rol correspondiente antes de que puedas iniciar sesión.
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={cargando}
                      className="w-full font-bold text-xs h-9 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {cargando ? 'Procesando registro...' : 'Registrarse en la Plataforma'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Formulario de Cambio Obligatorio de Contraseña */
            <form onSubmit={handleCambioPassword} className="space-y-3.5">
              <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-700 dark:text-amber-300">
                <p className="font-bold mb-1">
                  Bienvenido, {usuarioTemporal?.nombre || 'Funcionario'}.
                </p>
                <p>
                  Por seguridad, debes actualizar la contraseña temporal asignada por una clave personal definitiva antes de acceder al sistema.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Contraseña Temporal Actual</label>
                <Input
                  type="password"
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  className="text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nueva Contraseña Definitiva</label>
                <Input
                  type="password"
                  placeholder="Mínimo 10 caracteres (A-Z, a-z, 0-9)"
                  value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  className="text-xs"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Confirmar Nueva Contraseña</label>
                <Input
                  type="password"
                  placeholder="Reingrese la nueva contraseña"
                  value={passwordConfirmacion}
                  onChange={(e) => setPasswordConfirmacion(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="text-[10px] text-muted-foreground space-y-0.5 pt-1">
                <div className={passwordNueva.length >= 10 ? 'text-emerald-500 font-semibold' : ''}>
                  ✓ Mínimo 10 caracteres
                </div>
                <div className={/[A-Z]/.test(passwordNueva) && /[a-z]/.test(passwordNueva) ? 'text-emerald-500 font-semibold' : ''}>
                  ✓ Letras mayúsculas y minúsculas
                </div>
                <div className={/\d/.test(passwordNueva) ? 'text-emerald-500 font-semibold' : ''}>
                  ✓ Al menos un número
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={cargando}
                  className="w-full font-bold text-xs h-10 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {cargando ? 'Guardando y accediendo...' : 'Establecer Contraseña y Acceder'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
