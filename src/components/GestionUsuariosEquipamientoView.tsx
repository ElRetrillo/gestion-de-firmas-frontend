import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { useAuthStore } from '../store/useAuthStore';
import { formatRut, matchesRutSearch } from '../lib/rut';

interface UsuarioItem {
  id: string;
  rut: string;
  nombre: string;
  email: string;
  cargo: string;
  unidad: string;
  rol: string;
  estado: 'ACTIVO' | 'EN_LICENCIA' | 'SUSPENDIDO' | 'DESVINCULADO';
  pinBloqueado?: boolean;
  intentosPinFallidos?: number;
  certificados?: Array<{
    id: string;
    numeroSerie: string;
    tipo: string;
    estado: string;
    validoHasta: string;
  }>;
}

interface TokenItem {
  id: string;
  serialNumber: string;
  vendorId: string;
  marca: string;
  modelo: string;
  estadoPatrimonial: string;
}

interface ActaItem {
  id: string;
  codigoActa: string;
  tipoActa: 'ENTREGA' | 'DEVOLUCION' | 'TRASPASO' | 'BAJA';
  observaciones: string;
  hashSha256: string;
  createdAt: string;
  token?: { serialNumber: string; marca: string; modelo: string };
  usuario?: { rut: string; nombre: string; cargo: string; unidad: string };
}

interface ComprobanteEmitidoModal {
  id: string;
  codigoActa: string;
  tipoActa: string;
  pdfUrl: string;
  receptorNombre: string;
  receptorRut: string;
  tokenSerial: string;
  fecha: string;
}

export const GestionUsuariosEquipamientoView: React.FC = () => {
  const { usuario: usuarioActual } = useAuthStore();
  const [subTab, setSubTab] = useState<'USUARIOS' | 'CUSTODIA'>('USUARIOS');
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [actas, setActas] = useState<ActaItem[]>([]);
  const [mensajeOperacion, setMensajeOperacion] = useState<string | null>(null);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Filtros de búsqueda con adaptación para RUTs (ej: 12312312 o 21.374.808-4)
  const [busquedaUsuarios, setBusquedaUsuarios] = useState('');
  const [busquedaActas, setBusquedaActas] = useState('');
  const [filtroReceptor, setFiltroReceptor] = useState('');

  // Modal de Comprobante de Emisión generado
  const [comprobanteEmitido, setComprobanteEmitido] = useState<ComprobanteEmitidoModal | null>(null);

  // Formulario nuevo usuario
  const [nuevoRut, setNuevoRut] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoCargo, setNuevoCargo] = useState('');
  const [nuevaUnidad, setNuevaUnidad] = useState('Secretaría Municipal');
  const [nuevoRol, setNuevoRol] = useState('FUNCIONARIO');

  // Formulario nueva acta de custodia
  const [actaTokenSerial, setActaTokenSerial] = useState('');
  const [actaUsuarioRut, setActaUsuarioRut] = useState('');
  const [actaTipo, setActaTipo] = useState<'ENTREGA' | 'DEVOLUCION' | 'TRASPASO' | 'BAJA'>('ENTREGA');
  const [actaObs, setActaObs] = useState('');

  const cargarDatos = async () => {
    try {
      const [resUsers, resTokens, resActas] = await Promise.all([
        fetch('/api/v1/usuarios').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/v1/equipamiento/tokens').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/v1/equipamiento/actas').then((r) => (r.ok ? r.json() : [])),
      ]);
      if (Array.isArray(resUsers)) {
        setUsuarios(resUsers);
        if (resUsers.length > 0) setActaUsuarioRut((prev) => prev || resUsers[0].rut);
      }
      if (Array.isArray(resTokens)) {
        setTokens(resTokens);
        if (resTokens.length > 0) setActaTokenSerial((prev) => prev || resTokens[0].serialNumber);
      }
      if (Array.isArray(resActas)) setActas(resActas);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleDesvinculacionRrhh = async (u: UsuarioItem, nuevoEstado: 'DESVINCULADO' | 'ACTIVO') => {
    setProcesandoId(u.id);
    setMensajeOperacion(null);
    try {
      const res = await fetch(`/api/v1/usuarios/${u.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: nuevoEstado,
          motivo:
            nuevoEstado === 'DESVINCULADO'
              ? 'Cese de funciones RRHH (< 48h) - Revocación automática de certificados FEA y bloqueo de Token'
              : 'Reincorporación administrativa autorizada',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMensajeOperacion(
          nuevoEstado === 'DESVINCULADO'
            ? `[PROTOCOLO RRHH <48H EJECUTADO] Funcionario ${u.nombre} (${u.rut}) desvinculado. Certificados revocados: ${data.certificadosRevocados ?? 'TODOS'}.`
            : `[REACTIVACIÓN] Funcionario ${u.nombre} (${u.rut}) reactivado en el padrón municipal.`,
        );
        await cargarDatos();
      }
    } finally {
      setProcesandoId(null);
    }
  };

  const handleDesbloquearPin = async (rut: string) => {
    const nuevoPin = window.prompt(`Ingrese el nuevo PIN provisional de 4 dígitos para ${rut}:`, '0000');
    if (!nuevoPin) return;

    setProcesandoId(rut);
    try {
      const res = await fetch('/api/v1/auth/desbloquear-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut,
          nuevoPin: nuevoPin.trim(),
          adminRut: usuarioActual.rut,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMensajeOperacion(data.mensaje || `PIN de ${rut} restablecido mediante código PUK.`);
        await cargarDatos();
      }
    } finally {
      setProcesandoId(null);
    }
  };

  const handleCambiarRol = async (u: UsuarioItem, nuevoRolSeleccionado: string) => {
    if (!nuevoRolSeleccionado || nuevoRolSeleccionado === u.rol) return;
    setProcesandoId(u.id);
    setMensajeOperacion(null);
    try {
      const res = await fetch(`/api/v1/usuarios/${u.id}/rol`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
        body: JSON.stringify({ rol: nuevoRolSeleccionado }),
      });
      if (res.ok) {
        setMensajeOperacion(`Rol de ${u.nombre} actualizado a ${nuevoRolSeleccionado} exitosamente.`);
        await cargarDatos();
      } else {
        const err = await res.json();
        setMensajeOperacion(`Error al actualizar rol: ${err.message || 'No autorizado'}`);
      }
    } finally {
      setProcesandoId(null);
    }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoRut.trim() || !nuevoNombre.trim()) return;
    const rutFinal = formatRut(nuevoRut.trim()) || nuevoRut.trim();

    const res = await fetch('/api/v1/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rut: rutFinal,
        nombre: nuevoNombre.trim(),
        email: `${rutFinal.replace(/[^0-9]/g, '').slice(0, 8)}@municoquimbo.cl`,
        cargo: nuevoCargo.trim() || 'Profesional Municipal',
        unidad: nuevaUnidad,
        rol: nuevoRol,
      }),
    });
    if (res.ok) {
      setNuevoRut('');
      setNuevoNombre('');
      setNuevoCargo('');
      setMensajeOperacion(`Nuevo funcionario (${rutFinal}) enrolado exitosamente en el directorio institucional.`);
      await cargarDatos();
    } else {
      const err = await res.json();
      setMensajeOperacion(`Error al registrar: ${err.message || 'No se pudo crear el usuario'}`);
    }
  };

  const handleEmitirActa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actaTokenSerial || !actaUsuarioRut) {
      setMensajeOperacion('Debe seleccionar tanto el dispositivo como el funcionario receptor.');
      return;
    }

    const res = await fetch('/api/v1/equipamiento/actas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serialNumber: actaTokenSerial,
        rutUsuario: actaUsuarioRut,
        tipoActa: actaTipo,
        observaciones: actaObs,
      }),
    });

    if (res.ok) {
      const creada = await res.json();
      const token = localStorage.getItem('access_token') || '';
      const pdfUrl = `/api/v1/equipamiento/actas/${creada.id}/pdf?access_token=${token}`;

      // Se genera el comprobante de emisión y se abre de forma automática
      window.open(pdfUrl, '_blank');

      const receptorObj = usuarios.find((u) => u.rut === actaUsuarioRut);

      // Mostrar modal visual con comprobante de emisión y descarga directa
      setComprobanteEmitido({
        id: creada.id,
        codigoActa: creada.codigoActa || 'ACTA-EMISION',
        tipoActa: creada.tipoActa || actaTipo,
        pdfUrl,
        receptorNombre: receptorObj?.nombre || 'Funcionario Receptor',
        receptorRut: actaUsuarioRut,
        tokenSerial: actaTokenSerial,
        fecha: new Date().toLocaleString('es-CL'),
      });

      setMensajeOperacion(`Comprobante de Emisión oficial (${creada.codigoActa || creada.tipoActa}) generado y sellado con SHA-256.`);
      setActaObs('');
      await cargarDatos();
    } else {
      const err = await res.json();
      setMensajeOperacion(`Error al emitir acta: ${err.message || 'Operación fallida'}`);
    }
  };

  // Filtrado de Funcionarios con búsqueda flexible de RUT (ej: 12312312 o 21.374.808-4)
  const usuariosFiltrados = usuarios.filter((u) => {
    if (!busquedaUsuarios.trim()) return true;
    if (matchesRutSearch(u.rut, busquedaUsuarios)) return true;
    const q = busquedaUsuarios.trim().toLowerCase();
    return (
      (u.nombre || '').toLowerCase().includes(q) ||
      (u.cargo || '').toLowerCase().includes(q) ||
      (u.unidad || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  // Filtrado para selector de funcionarios en Entrega de Dispositivos
  const receptoresFiltrados = usuarios.filter((u) => {
    if (!filtroReceptor.trim()) return true;
    if (matchesRutSearch(u.rut, filtroReceptor)) return true;
    const q = filtroReceptor.trim().toLowerCase();
    return (
      (u.nombre || '').toLowerCase().includes(q) ||
      (u.cargo || '').toLowerCase().includes(q)
    );
  });

  // Filtrado de Actas y Comprobantes
  const actasFiltradas = actas.filter((a) => {
    if (!busquedaActas.trim()) return true;
    if (matchesRutSearch(a.usuario?.rut || '', busquedaActas)) return true;
    const q = busquedaActas.trim().toLowerCase();
    return (
      (a.codigoActa || '').toLowerCase().includes(q) ||
      (a.token?.serialNumber || '').toLowerCase().includes(q) ||
      (a.usuario?.nombre || '').toLowerCase().includes(q) ||
      (a.tipoActa || '').toLowerCase().includes(q)
    );
  });

  const accessToken = typeof window !== 'undefined' ? (localStorage.getItem('access_token') || '') : '';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
            Gestión de Funcionarios y Custodia
          </h2>
          <p className="text-xs text-muted-foreground">
            Administración de funcionarios municipales, control de acceso y registro de entrega de dispositivos de firma.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={subTab === 'USUARIOS' ? 'default' : 'outline'}
            onClick={() => setSubTab('USUARIOS')}
            className="text-xs font-bold h-9"
          >
            Funcionarios ({usuarios.length})
          </Button>
          <Button
            size="sm"
            variant={subTab === 'CUSTODIA' ? 'default' : 'outline'}
            onClick={() => setSubTab('CUSTODIA')}
            className="text-xs font-bold h-9"
          >
            Entrega de Dispositivos y Actas ({actas.length})
          </Button>
        </div>
      </div>

      {/* Notificación de operación */}
      {mensajeOperacion && (
        <div className="p-3.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-xs font-mono text-foreground flex items-center justify-between">
          <span>✓ {mensajeOperacion}</span>
          <button
            onClick={() => setMensajeOperacion(null)}
            className="text-[10px] underline ml-4 text-muted-foreground hover:text-foreground"
          >
            [Cerrar]
          </button>
        </div>
      )}

      {/* Modal / Alerta de Comprobante de Emisión Generado */}
      {comprobanteEmitido && (
        <div className="p-4 rounded-xl border-2 border-primary/50 bg-primary/5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-foreground">
                Comprobante Oficial de Emisión Generado
              </h3>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setComprobanteEmitido(null)}
              className="text-xs h-7"
            >
              ✕ Cerrar
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-background/60 p-3 rounded-lg border">
            <div>
              <span className="text-[10px] text-muted-foreground block">Folio Comprobante</span>
              <span className="font-mono font-bold text-primary">{comprobanteEmitido.codigoActa}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Tipo Operación</span>
              <Badge variant="outline" className="text-[10px]">{comprobanteEmitido.tipoActa}</Badge>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Funcionario Receptor</span>
              <span className="font-semibold block truncate">{comprobanteEmitido.receptorNombre}</span>
              <span className="text-[10px] font-mono text-muted-foreground">{comprobanteEmitido.receptorRut}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Dispositivo Serial</span>
              <span className="font-mono font-semibold">{comprobanteEmitido.tokenSerial}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <a
              href={comprobanteEmitido.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground font-bold text-xs shadow hover:bg-primary/90 transition-colors"
            >
              📥 Descargar Comprobante de Emisión (PDF)
            </a>
          </div>
        </div>
      )}

      {subTab === 'USUARIOS' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Tabla de Funcionarios */}
          <Card className="lg:col-span-8 border-border/80 bg-card overflow-hidden">
            <CardHeader className="p-4 border-b bg-muted/20 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold">
                    Listado de Funcionarios Habilitados ({usuariosFiltrados.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Directorio institucional con control de estado y certificados.
                  </CardDescription>
                </div>
              </div>

              {/* Barra de búsqueda adaptativa de RUT (ej: 12312312) */}
              <div className="pt-1">
                <Input
                  value={busquedaUsuarios}
                  onChange={(e) => setBusquedaUsuarios(e.target.value)}
                  placeholder="Buscar por RUT (ej: 12312312 o 21.374.808-4), Nombre, Cargo o Unidad..."
                  className="h-8 text-xs bg-background"
                />
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 text-[11px]">
                  <TableRow>
                    <TableHead>Funcionario / RUT</TableHead>
                    <TableHead>Cargo / Unidad</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado / PIN</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {usuariosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                        {usuarios.length === 0
                          ? 'No hay funcionarios registrados en el sistema'
                          : 'No se encontraron funcionarios que coincidan con la búsqueda'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuariosFiltrados.map((u) => {
                      const isDesvinculado = u.estado === 'DESVINCULADO';
                      return (
                        <TableRow key={u.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="font-bold text-foreground">{u.nombre}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              RUT: {u.rut} • {u.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-foreground text-[11px]">{u.cargo}</div>
                            <div className="text-[10px] text-muted-foreground">{u.unidad}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {u.rol === 'PENDIENTE' ? (
                                <Badge variant="warning" className="text-[10px] font-bold animate-pulse">
                                  PENDIENTE DE ROL
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">
                                  {u.rol}
                                </Badge>
                              )}
                              <select
                                value={u.rol}
                                disabled={procesandoId === u.id}
                                onChange={(e) => handleCambiarRol(u, e.target.value)}
                                className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground cursor-pointer hover:border-primary"
                                title="Cambiar rol manualmente"
                              >
                                <option value="PENDIENTE" disabled>-- Asignar Rol --</option>
                                <option value="FUNCIONARIO">FUNCIONARIO</option>
                                <option value="SUPERVISOR">SUPERVISOR</option>
                                <option value="ADMIN">ADMIN</option>
                                <option value="MINISTRO_DE_FE">MINISTRO_DE_FE</option>
                              </select>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              <Badge
                                variant={isDesvinculado ? 'danger' : u.estado === 'ACTIVO' ? 'success' : 'warning'}
                                className="text-[10px]"
                              >
                                {u.estado}
                              </Badge>
                              {u.pinBloqueado && (
                                <Badge variant="danger" className="text-[9px]">
                                  PIN BLOQUEADO
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right space-x-1.5">
                            {u.pinBloqueado && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={procesandoId === u.rut}
                                onClick={() => handleDesbloquearPin(u.rut)}
                                className="text-[11px] h-7 px-2 border-amber-500/50 text-amber-500"
                              >
                                Desbloquear PIN
                              </Button>
                            )}
                            {isDesvinculado ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={procesandoId === u.id}
                                onClick={() => handleDesvinculacionRrhh(u, 'ACTIVO')}
                                className="text-[11px] h-7 px-2.5"
                              >
                                Reactivar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={procesandoId === u.id}
                                onClick={() => handleDesvinculacionRrhh(u, 'DESVINCULADO')}
                                className="text-[11px] h-7 px-2.5"
                              >
                                Dar de Baja
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Formulario de Registro de Funcionario */}
          <Card className="lg:col-span-4 border-border/80 bg-card">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-bold">Registrar Funcionario Municipal</CardTitle>
              <CardDescription className="text-xs">
                El RUT se formatea automáticamente con puntos y guion a medida que se ingresa.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleCrearUsuario} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold flex items-center justify-between">
                    <span>RUT Institucional:</span>
                    <span className="text-[10px] text-muted-foreground font-mono">Autoformato (.) y (-)</span>
                  </label>
                  <Input
                    value={nuevoRut}
                    onChange={(e) => setNuevoRut(formatRut(e.target.value))}
                    placeholder="Ej: 21.374.808-4"
                    required
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Nombre Completo:</label>
                  <Input
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Ej: Juan Pérez González"
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Cargo Municipal:</label>
                  <Input
                    value={nuevoCargo}
                    onChange={(e) => setNuevoCargo(e.target.value)}
                    placeholder="Ej: Depto. Sistemas de Gestión y TICS"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Dirección / Unidad:</label>
                  <Input
                    value={nuevaUnidad}
                    onChange={(e) => setNuevaUnidad(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Rol Asignado:</label>
                  <select
                    value={nuevoRol}
                    onChange={(e) => setNuevoRol(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
                  >
                    <option value="FUNCIONARIO">FUNCIONARIO</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="MINISTRO_DE_FE">MINISTRO_DE_FE</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <Button type="submit" className="w-full text-xs font-bold h-9 mt-2 shadow">
                  Registrar Funcionario
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Tabla de Actas y Comprobantes de Emisión */}
          <Card className="lg:col-span-8 border-border/80 bg-card overflow-hidden">
            <CardHeader className="p-4 border-b bg-muted/20 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold">
                    Historial de Comprobantes de Emisión y Actas ({actasFiltradas.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Registro patrimonial inmutable de entrega y custodia conforme a ANCI y Ley N° 19.799.
                  </CardDescription>
                </div>
              </div>

              {/* Buscador de actas con soporte de RUT sin puntos (ej: 12312312) */}
              <div className="pt-1">
                <Input
                  value={busquedaActas}
                  onChange={(e) => setBusquedaActas(e.target.value)}
                  placeholder="Buscar acta por RUT receptor (ej: 12312312), Folio, N° Serie..."
                  className="h-8 text-xs bg-background"
                />
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 text-[11px]">
                  <TableRow>
                    <TableHead>Folio / Fecha</TableHead>
                    <TableHead>Tipo Movimiento</TableHead>
                    <TableHead>Dispositivo (N° Serie)</TableHead>
                    <TableHead>Funcionario Receptor</TableHead>
                    <TableHead className="text-right">Comprobante de Emisión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {actasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                        {actas.length === 0
                          ? 'No hay comprobantes de entrega o devolución registrados'
                          : 'No se encontraron actas con los criterios de búsqueda'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    actasFiltradas.map((a) => (
                      <TableRow key={a.id} className="hover:bg-muted/30">
                        <TableCell className="text-[11px]">
                          <div className="font-bold text-foreground font-mono">{a.codigoActa}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(a.createdAt).toLocaleString('es-CL')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              a.tipoActa === 'ENTREGA'
                                ? 'success'
                                : a.tipoActa === 'DEVOLUCION'
                                ? 'warning'
                                : a.tipoActa === 'BAJA'
                                ? 'danger'
                                : 'outline'
                            }
                            className="text-[10px] font-mono font-bold"
                          >
                            {a.tipoActa}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px]">
                          <div className="font-semibold font-mono">{a.token?.serialNumber || '-'}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {a.token?.marca} {a.token?.modelo}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{a.usuario?.nombre}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            RUT: {a.usuario?.rut}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <a
                            href={`/api/v1/equipamiento/actas/${a.id}/pdf?access_token=${accessToken}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center px-2.5 py-1 rounded border border-primary/40 bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-colors shadow-sm"
                          >
                            📥 Comprobante PDF
                          </a>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Formulario de Emisión de Comprobante / Acta */}
          <Card className="lg:col-span-4 border-border/80 bg-card">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-bold">Emitir Entrega o Devolución</CardTitle>
              <CardDescription className="text-xs">
                Emisión de comprobante de entrega o devolución de dispositivo con descarga de PDF oficial.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleEmitirActa} className="space-y-3 text-xs">
                {/* Dispositivo Token */}
                <div className="space-y-1">
                  <label className="font-semibold">Dispositivo (N° de Serie):</label>
                  <select
                    value={actaTokenSerial}
                    onChange={(e) => setActaTokenSerial(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
                  >
                    {tokens.map((t) => (
                      <option key={t.id} value={t.serialNumber}>
                        {t.serialNumber} ({t.marca} {t.modelo})
                      </option>
                    ))}
                    {tokens.length === 0 && (
                      <option value="">-- No hay dispositivos registrados --</option>
                    )}
                  </select>
                </div>

                {/* Filtro rápido y selector de Funcionario Receptor */}
                <div className="space-y-1">
                  <label className="font-semibold flex items-center justify-between">
                    <span>Funcionario Receptor:</span>
                    <span className="text-[10px] text-muted-foreground font-mono">Búsqueda flexible</span>
                  </label>
                  <Input
                    value={filtroReceptor}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFiltroReceptor(val);
                      // Si la búsqueda acota a un solo funcionario, seleccionarlo automáticamente
                      const matches = usuarios.filter((u) => {
                        if (!val.trim()) return true;
                        if (matchesRutSearch(u.rut, val)) return true;
                        return (u.nombre || '').toLowerCase().includes(val.trim().toLowerCase());
                      });
                      if (matches.length === 1) {
                        setActaUsuarioRut(matches[0].rut);
                      }
                    }}
                    placeholder="Filtrar receptor por RUT (ej: 12312312) o nombre..."
                    className="h-7 text-[11px] mb-1.5"
                  />
                  <select
                    value={actaUsuarioRut}
                    onChange={(e) => setActaUsuarioRut(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {receptoresFiltrados.map((u) => (
                      <option key={u.id} value={u.rut}>
                        {u.rut} - {u.nombre}
                      </option>
                    ))}
                    {receptoresFiltrados.length === 0 && (
                      <option value="">-- No se encontraron funcionarios --</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold">Tipo de Movimiento:</label>
                  <select
                    value={actaTipo}
                    onChange={(e) => setActaTipo(e.target.value as any)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="ENTREGA">Entrega de Dispositivo</option>
                    <option value="DEVOLUCION">Devolución a Informática / TIC</option>
                    <option value="TRASPASO">Traspaso a otro Funcionario</option>
                    <option value="BAJA">Baja por Extravío o Deterioro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold">Observaciones:</label>
                  <Input
                    value={actaObs}
                    onChange={(e) => setActaObs(e.target.value)}
                    placeholder="Observaciones de entrega, custodia o estado..."
                    className="h-8 text-xs"
                  />
                </div>

                <Button type="submit" className="w-full text-xs font-bold h-9 mt-2 shadow">
                  Generar Comprobante de Emisión
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
