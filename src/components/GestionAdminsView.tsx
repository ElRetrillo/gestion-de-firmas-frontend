import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  UserX,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { cleanRut, formatRut, formatRutVisual } from '../lib/rut';
import { Card, CardHeader, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface AdminItem {
  id: string;
  rut: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  debeCambiarPassword?: boolean;
  esFijo?: boolean;
  createdAt?: string;
}

interface CredencialesGeneradas {
  rut: string;
  pinInicial: string;
  nombre: string;
}

type FieldErrors = {
  rut?: string;
  nombre?: string;
  email?: string;
  pinInicial?: string;
};

type TouchedFields = {
  rut?: boolean;
  nombre?: boolean;
  email?: boolean;
  pinInicial?: boolean;
};

const PROTEGIDO_PRINCIPAL_CLEAN = '213748084';

export const GestionAdminsView: React.FC = () => {
  const { usuario } = useAuthStore();

  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);

  const [rut, setRut] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [pinInicial, setPinInicial] = useState('');

  const [touched, setTouched] = useState<TouchedFields>({});
  const [submitted, setSubmitted] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [credenciales, setCredenciales] = useState<CredencialesGeneradas | null>(null);
  const [copiado, setCopiado] = useState(false);

  const [confirmandoRevocarId, setConfirmandoRevocarId] = useState<string | null>(null);
  const [revocandoId, setRevocandoId] = useState<string | null>(null);
  const [mensajeAccion, setMensajeAccion] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const formTitleId = useId();
  const tableTitleId = useId();
  const rutInputId = useId();
  const rutHintId = useId();
  const rutErrorId = useId();
  const nombreInputId = useId();
  const nombreHintId = useId();
  const nombreErrorId = useId();
  const emailInputId = useId();
  const emailHintId = useId();
  const emailErrorId = useId();
  const pinInputId = useId();
  const pinHintId = useId();
  const pinErrorId = useId();

  const rutRef = useRef<HTMLInputElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  const getToken = () => localStorage.getItem('access_token');

  const cargarAdmins = useCallback(async () => {
    setCargandoLista(true);
    setErrorLista(null);
    try {
      const token = getToken();
      const res = await fetch('/api/v1/usuarios/admins', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'No se pudo cargar la lista de administradores.');
      }
      setAdmins(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorLista(err?.message || 'Error al obtener administradores.');
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useEffect(() => {
    cargarAdmins();
  }, [cargarAdmins]);

  const validateFields = useCallback(
    (vals: { rut: string; nombre: string; email: string; pinInicial: string }): FieldErrors => {
      const errs: FieldErrors = {};
      const rutClean = cleanRut(vals.rut);
      if (!rutClean) {
        errs.rut = 'Ingrese el RUT del administrador.';
      } else if (rutClean.length < 7) {
        errs.rut = 'Ingrese un RUT válido con dígito verificador (ej: 12.345.678-9).';
      }

      if (!vals.nombre.trim()) {
        errs.nombre = 'Ingrese el nombre completo del administrador.';
      }

      const emailTrim = vals.email.trim();
      if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
        errs.email = 'Ingrese un correo electrónico válido (ej: nombre@municoquimbo.cl).';
      }

      const pinTrim = vals.pinInicial.trim();
      if (pinTrim && pinTrim.length !== 6) {
        errs.pinInicial = 'El PIN inicial debe tener exactamente 6 caracteres.';
      }

      return errs;
    },
    [],
  );

  const errors = validateFields({ rut, nombre, email, pinInicial });
  const showRutError = Boolean((touched.rut || submitted) && errors.rut);
  const showNombreError = Boolean((touched.nombre || submitted) && errors.nombre);
  const showEmailError = Boolean((touched.email || submitted) && errors.email);
  const showPinError = Boolean((touched.pinInicial || submitted) && errors.pinInicial);

  const handleGenerarPinAleatorio = () => {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    setPinInicial(pin);
    setTouched((prev) => ({ ...prev, pinInicial: true }));
    setErrorForm(null);
  };

  const handleGenerarCredenciales = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setErrorForm(null);
    setMensajeAccion(null);

    const currentErrors = validateFields({ rut, nombre, email, pinInicial });
    if (Object.keys(currentErrors).length > 0) {
      if (currentErrors.rut) rutRef.current?.focus();
      else if (currentErrors.nombre) nombreRef.current?.focus();
      else if (currentErrors.email) emailRef.current?.focus();
      else if (currentErrors.pinInicial) pinRef.current?.focus();
      return;
    }

    setEnviando(true);
    try {
      const token = getToken();
      const payload: Record<string, string> = {
        rut: formatRut(rut.trim()) || rut.trim(),
        nombre: nombre.trim(),
      };
      if (email.trim()) payload.email = email.trim();
      if (pinInicial.trim()) payload.pinInicial = pinInicial.trim();

      const res = await fetch('/api/v1/usuarios/admins/generar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'No se pudieron generar las credenciales.');
      }

      const rutFinal = data?.credenciales?.rut || payload.rut;
      const pinFinal = data?.credenciales?.pinInicial || payload.pinInicial || '';
      setCredenciales({
        rut: rutFinal,
        pinInicial: pinFinal,
        nombre: data?.usuario?.nombre || payload.nombre,
      });
      setCopiado(false);
      setRut('');
      setNombre('');
      setEmail('');
      setPinInicial('');
      setTouched({});
      setSubmitted(false);
      await cargarAdmins();
    } catch (err: any) {
      setErrorForm(err?.message || 'Error al generar credenciales de administrador.');
    } finally {
      setEnviando(false);
    }
  };

  const handleCopiarCredenciales = async () => {
    if (!credenciales) return;
    const texto = `Acceso Administrador - Municipalidad de Coquimbo\nNombre: ${credenciales.nombre}\nRUT: ${credenciales.rut}\nPIN Inicial: ${credenciales.pinInicial}\nNota: En el primer login deberá cambiar su PIN de 6 caracteres y vincular Authenticator.`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };

  const handleRevocar = async (adminId: string) => {
    setRevocandoId(adminId);
    setErrorAccion(null);
    setMensajeAccion(null);
    try {
      const token = getToken();
      const res = await fetch(`/api/v1/usuarios/admins/${encodeURIComponent(adminId)}/revocar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'No se pudo revocar el acceso de administrador.');
      }
      setConfirmandoRevocarId(null);
      setMensajeAccion(data?.mensaje || 'Acceso de administrador revocado correctamente.');
      await cargarAdmins();
    } catch (err: any) {
      setErrorAccion(err?.message || 'Error al revocar administrador.');
    } finally {
      setRevocandoId(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader className="p-4 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
            <h2 id={formTitleId} className="text-sm sm:text-base font-bold leading-none tracking-tight text-foreground">
              Generar Credenciales de Administrador
            </h2>
          </div>
          <CardDescription className="text-xs">
            Cree credenciales iniciales o delegue acceso administrativo mediante RUT y PIN de 6 caracteres.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          <form aria-labelledby={formTitleId} onSubmit={handleGenerarCredenciales} noValidate className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor={rutInputId} className="block text-xs font-semibold text-foreground">
                  RUT <span aria-hidden="true" className="text-rose-500">*</span>
                </label>
                <span id={rutHintId} className="block text-[11px] text-muted-foreground">
                  Se formatea automáticamente (ej: 12.345.678-9).
                </span>
                <Input
                  ref={rutRef}
                  id={rutInputId}
                  name="rut"
                  type="text"
                  required
                  value={rut}
                  onChange={(e) => {
                    setRut(formatRut(e.target.value));
                    setErrorForm(null);
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, rut: true }))}
                  placeholder="12.345.678-9"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={showRutError ? 'true' : 'false'}
                  aria-describedby={showRutError ? `${rutHintId} ${rutErrorId}` : rutHintId}
                  className={`form-field-control font-mono ${showRutError ? 'border-rose-500' : ''}`}
                />
                {showRutError && (
                  <p id={rutErrorId} className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 pt-0.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.rut}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor={nombreInputId} className="block text-xs font-semibold text-foreground">
                  Nombre Completo <span aria-hidden="true" className="text-rose-500">*</span>
                </label>
                <span id={nombreHintId} className="block text-[11px] text-muted-foreground">
                  Nombre y apellidos del administrador.
                </span>
                <Input
                  ref={nombreRef}
                  id={nombreInputId}
                  name="nombre"
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    setErrorForm(null);
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, nombre: true }))}
                  placeholder="Ej: María González Pérez"
                  autoComplete="name"
                  aria-invalid={showNombreError ? 'true' : 'false'}
                  aria-describedby={showNombreError ? `${nombreHintId} ${nombreErrorId}` : nombreHintId}
                  className={`form-field-control ${showNombreError ? 'border-rose-500' : ''}`}
                />
                {showNombreError && (
                  <p id={nombreErrorId} className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 pt-0.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.nombre}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor={emailInputId} className="block text-xs font-semibold text-foreground">
                  Correo (opcional)
                </label>
                <span id={emailHintId} className="block text-[11px] text-muted-foreground">
                  Si se omite, se genera un correo institucional automáticamente.
                </span>
                <Input
                  ref={emailRef}
                  id={emailInputId}
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorForm(null);
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  placeholder="admin@municoquimbo.cl"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={showEmailError ? 'true' : 'false'}
                  aria-describedby={showEmailError ? `${emailHintId} ${emailErrorId}` : emailHintId}
                  className={`form-field-control ${showEmailError ? 'border-rose-500' : ''}`}
                />
                {showEmailError && (
                  <p id={emailErrorId} className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 pt-0.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor={pinInputId} className="block text-xs font-semibold text-foreground">
                  PIN Inicial (6 caracteres)
                </label>
                <span id={pinHintId} className="block text-[11px] text-muted-foreground">
                  Exactamente 6 caracteres. Puede generarlo aleatoriamente o dejarlo vacío para autogenerar.
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    ref={pinRef}
                    id={pinInputId}
                    name="pinInicial"
                    type="text"
                    maxLength={6}
                    value={pinInicial}
                    onChange={(e) => {
                      setPinInicial(e.target.value.slice(0, 6));
                      setErrorForm(null);
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, pinInicial: true }))}
                    placeholder="Ej: 482910"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={showPinError ? 'true' : 'false'}
                    aria-describedby={showPinError ? `${pinHintId} ${pinErrorId}` : pinHintId}
                    className={`form-field-control font-mono ${showPinError ? 'border-rose-500' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerarPinAleatorio}
                    className="h-9 px-3 shrink-0 gap-1.5 text-xs font-semibold"
                  >
                    <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Generar PIN</span>
                  </Button>
                </div>
                {showPinError && (
                  <p id={pinErrorId} className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 pt-0.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.pinInicial}</span>
                  </p>
                )}
              </div>
            </div>

            {errorForm && (
              <div
                role="alert"
                className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{errorForm}</span>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={enviando} className="font-semibold">
                {enviando ? 'Generando...' : 'Generar Credenciales'}
              </Button>
            </div>
          </form>

          {credenciales && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Credenciales generadas para {credenciales.nombre}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopiarCredenciales}
                  className="h-8 gap-1.5 text-xs font-semibold bg-background"
                >
                  {copiado ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Copiar Credenciales</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border border-border bg-background p-3 text-xs">
                <div>
                  <span className="block text-[11px] text-muted-foreground">RUT de acceso</span>
                  <span className="font-mono font-bold text-sm text-foreground">{credenciales.rut}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-muted-foreground">PIN Inicial</span>
                  <span className="font-mono font-bold text-sm text-foreground">{credenciales.pinInicial}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                En el primer login deberá cambiar su PIN de 6 caracteres y vincular Authenticator.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between gap-2">
          <div>
            <h2 id={tableTitleId} className="text-sm sm:text-base font-bold leading-none tracking-tight text-foreground">
              Administradores con Acceso
            </h2>
            <CardDescription className="text-xs">
              Cuentas con rol ADMIN activas y estado de configuración inicial.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cargarAdmins}
            disabled={cargandoLista}
            className="h-8 gap-1.5 text-xs shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${cargandoLista ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Actualizar</span>
          </Button>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {mensajeAccion && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{mensajeAccion}</span>
            </div>
          )}

          {errorAccion && (
            <div
              role="alert"
              className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errorAccion}</span>
            </div>
          )}

          {errorLista ? (
            <div
              role="alert"
              className="rounded-md border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3"
            >
              <span>{errorLista}</span>
              <Button type="button" size="sm" variant="outline" onClick={cargarAdmins}>
                Reintentar
              </Button>
            </div>
          ) : cargandoLista && admins.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Cargando administradores...
            </div>
          ) : admins.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No hay administradores registrados.
            </div>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-labelledby={tableTitleId}
              className="overflow-x-auto rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <table className="w-full border-collapse text-xs sm:text-sm">
                <caption className="sr-only">Listado de administradores con acceso al sistema</caption>
                <thead>
                  <tr className="bg-muted/70 border-b border-border">
                    <th scope="col" className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
                      Nombre / Correo
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
                      RUT
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
                      Estado Acceso
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
                      Tipo
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {admins.map((admin) => {
                    const esActual =
                      Boolean(usuario?.id && admin.id === usuario.id) ||
                      Boolean(usuario?.rut && cleanRut(admin.rut) === cleanRut(usuario.rut));
                    const esTitularProtegido = cleanRut(admin.rut) === PROTEGIDO_PRINCIPAL_CLEAN;
                    const ocultarRevocar = esActual || esTitularProtegido;
                    const pendiente = Boolean(admin.debeCambiarPassword);

                    return (
                      <tr key={admin.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 min-w-[200px]">
                          <div className="font-semibold text-foreground">{admin.nombre}</div>
                          <div className="text-[11px] font-mono text-muted-foreground">{admin.email}</div>
                        </td>
                        <td className="px-3 py-2.5 font-mono whitespace-nowrap text-foreground">
                          {formatRutVisual(admin.rut)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {pendiente ? (
                            <Badge variant="warning" className="gap-1">
                              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                              <span>Pendiente 1er ingreso</span>
                            </Badge>
                          ) : (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                              <span>Configurado</span>
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <Badge variant={admin.esFijo ? 'info' : 'secondary'}>
                            {admin.esFijo ? 'Fijo' : 'Delegado'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          {ocultarRevocar ? (
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {esActual ? 'Sesión actual' : 'Protegido'}
                            </span>
                          ) : confirmandoRevocarId === admin.id ? (
                            <div className="inline-flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={revocandoId === admin.id}
                                aria-label={`Sí, Revocar acceso de ${admin.nombre}`}
                                onClick={() => handleRevocar(admin.id)}
                                className="h-7 px-2.5 text-xs font-semibold"
                              >
                                {revocandoId === admin.id ? 'Revocando...' : 'Sí, Revocar'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={revocandoId === admin.id}
                                onClick={() => setConfirmandoRevocarId(null)}
                                className="h-7 px-2.5 text-xs"
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              aria-label={`Revocar acceso de ${admin.nombre}`}
                              onClick={() => {
                                setConfirmandoRevocarId(admin.id);
                                setErrorAccion(null);
                                setMensajeAccion(null);
                              }}
                              className="h-7 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/30 gap-1"
                            >
                              <UserX className="h-3 w-3 shrink-0" aria-hidden="true" />
                              <span>Revocar</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GestionAdminsView;
