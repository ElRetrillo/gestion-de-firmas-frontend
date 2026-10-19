import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { useAuthStore } from '../store/useAuthStore';

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

export const GestionUsuariosEquipamientoView: React.FC = () => {
  const { usuario: usuarioActual } = useAuthStore();
  const [subTab, setSubTab] = useState<'USUARIOS' | 'CUSTODIA'>('USUARIOS');
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [actas, setActas] = useState<ActaItem[]>([]);
  const [mensajeOperacion, setMensajeOperacion] = useState<string | null>(null);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

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
  const [actaObs, setActaObs] = useState('Entrega formal de dispositivo criptográfico FIPS 140-2 conforme a directiva ANCI.');

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
      // Fallback en caso de desconexión temporal
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
            ? `[PROTOCOLO RRHH <48H EJECUTADO] Funcionario ${u.nombre} (${u.rut}) desvinculado. Certificados revocados automáticamente: ${data.certificadosRevocados ?? 'TODOS'}.`
            : `[REACTIVACIÓN] Funcionario ${u.nombre} (${u.rut}) reactivado en el padrón municipal.`,
        );
        await cargarDatos();
      }
    } finally {
      setProcesandoId(null);
    }
  };

  const handleDesbloquearPin = async (rut: string) => {
    setProcesandoId(rut);
    try {
      const res = await fetch('/api/v1/auth/desbloquear-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut,
          nuevoPin: '1234',
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

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoRut.trim() || !nuevoNombre.trim()) return;
    const res = await fetch('/api/v1/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rut: nuevoRut.trim(),
        nombre: nuevoNombre.trim(),
        email: `${nuevoRut.replace(/[^0-9]/g, '').slice(0, 6)}@municoquimbo.cl`,
        cargo: nuevoCargo.trim() || 'Profesional Municipal',
        unidad: nuevaUnidad,
        rol: nuevoRol,
      }),
    });
    if (res.ok) {
      setNuevoRut('');
      setNuevoNombre('');
      setNuevoCargo('');
      setMensajeOperacion('Nuevo funcionario enrolado exitosamente en el directorio institucional.');
      await cargarDatos();
    }
  };

  const handleEmitirActa = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setMensajeOperacion(`Acta Digital de Custodia (${creada.codigoActa || creada.tipoActa}) generada y sellada con SHA-256.`);
      await cargarDatos();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px] font-mono border-primary/50 text-primary">
              GOBERNANZA DE IDENTIDADES &amp; CUSTODIA PATRIMONIAL
            </Badge>
            <Badge variant="secondary" className="text-[9px] font-mono">
              PROTOCOLO RRHH &lt; 48H
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
            Gestión de Funcionarios, Revocación RRHH y Actas de Custodia USB
          </h2>
          <p className="text-xs text-muted-foreground">
            Control de ciclo de vida de certificados X.509, desvinculación inmediata (&lt;48h) y actas digitales de entrega/recepción de tokens criptográficos.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={subTab === 'USUARIOS' ? 'default' : 'outline'}
            onClick={() => setSubTab('USUARIOS')}
            className="text-xs font-bold h-9"
          >
            Funcionarios &amp; Baja RRHH ({usuarios.length})
          </Button>
          <Button
            size="sm"
            variant={subTab === 'CUSTODIA' ? 'default' : 'outline'}
            onClick={() => setSubTab('CUSTODIA')}
            className="text-xs font-bold h-9"
          >
            Tokens USB &amp; Actas PDF ({actas.length})
          </Button>
        </div>
      </div>

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

      {subTab === 'USUARIOS' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Tabla de Funcionarios y Protocolo RRHH */}
          <Card className="lg:col-span-8 border-border/80 bg-card overflow-hidden">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold">
                Padrón de Funcionarios Habilitados y Estado Criptográfico
              </CardTitle>
              <CardDescription className="text-xs">
                Al ejecutar la baja por desvinculación RRHH (&lt;48h), el sistema revoca automáticamente todos los certificados activos y bloquea el acceso.
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 text-[11px]">
                  <TableRow>
                    <TableHead>Funcionario / RUT</TableHead>
                    <TableHead>Cargo / Unidad</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado / PIN</TableHead>
                    <TableHead className="text-right">Acciones de Seguridad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {usuarios.map((u) => {
                    const isDesvinculado = u.estado === 'DESVINCULADO';
                    return (
                      <TableRow key={u.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-bold text-foreground">{u.nombre}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            RUT: {u.rut} • {u.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-foreground text-[11px]">{u.cargo}</div>
                          <div className="text-[10px] text-muted-foreground">{u.unidad}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {u.rol}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <Badge
                              variant={isDesvinculado ? 'danger' : u.estado === 'ACTIVO' ? 'success' : 'warning'}
                              className="text-[9px] font-mono"
                            >
                              {u.estado}
                            </Badge>
                            {u.pinBloqueado && (
                              <Badge variant="danger" className="text-[8px] font-mono">
                                PIN BLOQUEADO (3 INTENTOS)
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
                              className="text-[10px] h-7 px-2 font-mono border-amber-500/50 text-amber-500"
                            >
                              Desbloquear PUK
                            </Button>
                          )}
                          {isDesvinculado ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={procesandoId === u.id}
                              onClick={() => handleDesvinculacionRrhh(u, 'ACTIVO')}
                              className="text-[10px] h-7 px-2.5 font-mono"
                            >
                              Reactivar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={procesandoId === u.id}
                              onClick={() => handleDesvinculacionRrhh(u, 'DESVINCULADO')}
                              className="text-[10px] h-7 px-2.5 font-mono"
                            >
                              Baja RRHH (&lt;48h)
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Formulario de Enrolamiento */}
          <Card className="lg:col-span-4 border-border/80 bg-card">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-bold">Enrolar Funcionario Municipal</CardTitle>
              <CardDescription className="text-xs">
                Registro de identidad digital y asignación de perfil RBAC
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleCrearUsuario} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold">RUT Institucional:</label>
                  <Input
                    value={nuevoRut}
                    onChange={(e) => setNuevoRut(e.target.value)}
                    placeholder="Ej: 15.892.410-K"
                    required
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Nombre Completo:</label>
                  <Input
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Ej: Carolina Morales Rojas"
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Cargo Municipal:</label>
                  <Input
                    value={nuevoCargo}
                    onChange={(e) => setNuevoCargo(e.target.value)}
                    placeholder="Ej: Analista de Decretos"
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
                  <label className="font-semibold">Rol RBAC:</label>
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
                <Button type="submit" className="w-full text-xs font-bold h-9 mt-2">
                  Registrar Funcionario
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Tabla de Actas de Custodia y Descarga PDF */}
          <Card className="lg:col-span-8 border-border/80 bg-card overflow-hidden">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold">
                Libro de Actas Digitales de Custodia de Tokens Criptográficos
              </CardTitle>
              <CardDescription className="text-xs">
                Trazabilidad patrimonial de entrega, devolución y baja de dispositivos USB FIPS 140-2 Nivel 3 con comprobante PDF firmado.
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 text-[11px]">
                  <TableRow>
                    <TableHead>Código Acta / Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Token USB (Serial)</TableHead>
                    <TableHead>Funcionario Responsable</TableHead>
                    <TableHead className="text-right">Comprobante PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {actas.map((a) => (
                    <TableRow key={a.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-[11px]">
                        <div className="font-bold text-foreground">{a.codigoActa}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(a.createdAt).toLocaleString('es-CL')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={a.tipoActa === 'ENTREGA' ? 'success' : a.tipoActa === 'BAJA' ? 'danger' : 'info'}
                          className="text-[9px] font-mono"
                        >
                          {a.tipoActa}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">
                        <div className="font-semibold">{a.token?.serialNumber || 'SN-SAF-98214'}</div>
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
                          href={`/api/v1/equipamiento/actas/${a.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center px-2.5 py-1 rounded border border-primary/40 bg-primary/10 text-primary font-mono text-[10px] font-bold hover:bg-primary/20 transition-colors"
                        >
                          Descargar Acta PDF
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Emitir Nueva Acta Digital */}
          <Card className="lg:col-span-4 border-border/80 bg-card">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-bold">Generar Acta de Custodia</CardTitle>
              <CardDescription className="text-xs">
                Emisión inmediata de acta digital con sello SHA-256 para inventario TIC
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleEmitirActa} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold">Token Hardware (Serial Number):</label>
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
                      <option value="SN-SAF-98214">SN-SAF-98214 (SafeNet eToken 5110)</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold">Funcionario Receptor / Emisor:</label>
                  <select
                    value={actaUsuarioRut}
                    onChange={(e) => setActaUsuarioRut(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
                  >
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.rut}>
                        {u.rut} - {u.nombre}
                      </option>
                    ))}
                    {usuarios.length === 0 && (
                      <option value="16.782.341-2">16.782.341-2 - Rodrigo Araya</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold">Tipo de Movimiento Patrimonial:</label>
                  <select
                    value={actaTipo}
                    onChange={(e) => setActaTipo(e.target.value as any)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
                  >
                    <option value="ENTREGA">ENTREGA DE CARGO</option>
                    <option value="DEVOLUCION">DEVOLUCIÓN A CUSTODIA TIC</option>
                    <option value="TRASPASO">TRASPASO INTERNO</option>
                    <option value="BAJA">BAJA POR EXTRAVÍO / DETERIORO</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold">Observaciones del Acta:</label>
                  <Input
                    value={actaObs}
                    onChange={(e) => setActaObs(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <Button type="submit" className="w-full text-xs font-bold h-9 mt-2">
                  Emitir y Firmar Acta Digital
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GestionUsuariosEquipamientoView;
