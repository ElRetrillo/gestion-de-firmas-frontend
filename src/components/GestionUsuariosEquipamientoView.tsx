import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { useAuthStore } from '../store/useAuthStore';
import { useTelemetriaStore, ContratoTokenItem } from '../store/useTelemetriaStore';
import { formatRut, matchesRutSearch } from '../lib/rut';
import { MetricasTrazabilidadPanel } from './MetricasTrazabilidadPanel';

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
  const { metricas, cargarMetricas } = useTelemetriaStore();

  const [subTab, setSubTab] = useState<'CONTRATOS' | 'ASIGNACION' | 'CUSTODIA'>('CONTRATOS');
  const [contratosRemotos, setContratosRemotos] = useState<ContratoTokenItem[]>([]);
  const [contratoPreview, setContratoPreview] = useState<ContratoTokenItem | null>(null);

  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [actas, setActas] = useState<ActaItem[]>([]);
  const [mensajeOperacion, setMensajeOperacion] = useState<string | null>(null);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Filtros de búsqueda
  const [busquedaContratos, setBusquedaContratos] = useState('');
  const [busquedaUsuarios, setBusquedaUsuarios] = useState('');
  const [busquedaActas, setBusquedaActas] = useState('');
  const [filtroReceptor, setFiltroReceptor] = useState('');

  // Modal de Comprobante de Emisión generado
  const [comprobanteEmitido, setComprobanteEmitido] = useState<ComprobanteEmitidoModal | null>(null);

  // Formulario Nuevo Contrato de Obtención de Tokens (Req 7)
  const [codigoContrato, setCodigoContrato] = useState('CT-TOKENS-2026-04');
  const [tituloContrato, setTituloContrato] = useState('Suministro de Tokens Criptográficos PKCS#11 y Certificados FEA');
  const [proveedorContrato, setProveedorContrato] = useState('E-Certchile / Empresa Nacional de Certificación');
  const [ordenCompraContrato, setOrdenCompraContrato] = useState('OC-2598-142-SE26');
  const [resolucionContrato, setResolucionContrato] = useState('Decreto Alcaldicio N° 1.480/2026');
  const [fechaInicioContrato, setFechaInicioContrato] = useState('2026-01-15');
  const [fechaTerminoContrato, setFechaTerminoContrato] = useState('2027-01-15');
  const [cantidadTokensContrato, setCantidadTokensContrato] = useState('50');
  const [obsContrato, setObsContrato] = useState('Contrato institucional con soporte técnico y reposición de dispositivos USB.');

  // Formulario Asignar Token / Firma a Funcionario
  const [asigRut, setAsigRut] = useState('');
  const [asigSerial, setAsigSerial] = useState('SAFENET-5110-CQ09');
  const [asigMarca, setAsigMarca] = useState('Thales SafeNet');
  const [asigModelo, setAsigModelo] = useState('eToken 5110 CC');
  const [asigFechaExp, setAsigFechaExp] = useState('2026-12-15');
  const [asigContratoCodigo, setAsigContratoCodigo] = useState('');

  // Formulario nuevo usuario
  const [nuevoRut, setNuevoRut] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoCargo, setNuevoCargo] = useState('');
  const [nuevaUnidad, setNuevaUnidad] = useState('Secretaría Municipal');
  const [nuevoRol, setNuevoRol] = useState('FUNCIONARIO');
  const [nuevaPassword, setNuevaPassword] = useState('');

  // Credencial recién creada
  const [credencialGenerada, setCredencialGenerada] = useState<{
    rut: string;
    nombre: string;
    passwordTemporal?: string;
    pinTemporal?: string;
  } | null>(null);

  // Formulario nueva acta de custodia
  const [actaTokenSerial, setActaTokenSerial] = useState('');
  const [actaUsuarioRut, setActaUsuarioRut] = useState('');
  const [actaTipo, setActaTipo] = useState<'ENTREGA' | 'DEVOLUCION' | 'TRASPASO' | 'BAJA'>('ENTREGA');
  const [actaObs, setActaObs] = useState('');

  const cargarDatos = async () => {
    try {
      const [resContratos, resUsers, resTokens, resActas] = await Promise.all([
        fetch('/api/v1/equipamiento/contratos').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/v1/usuarios').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/v1/equipamiento/tokens').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/v1/equipamiento/actas').then((r) => (r.ok ? r.json() : [])),
      ]);
      if (Array.isArray(resContratos) && resContratos.length > 0) {
        setContratosRemotos(resContratos);
        setAsigContratoCodigo((prev) => prev || resContratos[0].codigoContrato);
      }
      if (Array.isArray(resUsers)) {
        setUsuarios(resUsers);
        if (resUsers.length > 0) {
          setActaUsuarioRut((prev) => prev || resUsers[0].rut);
          setAsigRut((prev) => prev || resUsers[0].rut);
        }
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

  const contratos: ContratoTokenItem[] =
    contratosRemotos.length > 0
      ? contratosRemotos
      : metricas?.contratosResumen?.listado || [];

  const contratosFiltrados = contratos.filter((c) => {
    const q = busquedaContratos.trim().toLowerCase();
    if (!q) return true;
    return (
      c.codigoContrato.toLowerCase().includes(q) ||
      c.titulo.toLowerCase().includes(q) ||
      c.proveedor.toLowerCase().includes(q) ||
      (c.ordenCompra || '').toLowerCase().includes(q)
    );
  });

  const handleCrearContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoContrato.trim() || !tituloContrato.trim()) return;
    try {
      const res = await fetch('/api/v1/equipamiento/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoContrato: codigoContrato.trim(),
          titulo: tituloContrato.trim(),
          proveedor: proveedorContrato.trim(),
          ordenCompra: ordenCompraContrato.trim(),
          resolucionAprueba: resolucionContrato.trim(),
          fechaInicio: fechaInicioContrato,
          fechaTermino: fechaTerminoContrato,
          cantidadTokensContratados: Number(cantidadTokensContrato) || 25,
          observaciones: obsContrato.trim(),
        }),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setMensajeOperacion(
          `Contrato de Obtención de Tokens (${nuevo.codigoContrato || codigoContrato}) registrado con copia PDF oficial.`,
        );
        await Promise.all([cargarDatos(), cargarMetricas()]);
        if (nuevo?.id) {
          setContratoPreview(nuevo);
        }
      }
    } catch {
      setMensajeOperacion('Error de red al registrar el contrato.');
    }
  };

  const handleAsignarToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asigRut || !asigSerial.trim()) return;
    try {
      const res = await fetch('/api/v1/equipamiento/asignar-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rutUsuario: asigRut,
          serialNumber: asigSerial.trim(),
          marca: asigMarca.trim(),
          modelo: asigModelo.trim(),
          fechaExpiracion: asigFechaExp,
          codigoContrato: asigContratoCodigo,
        }),
      });
      if (res.ok) {
        setMensajeOperacion(
          `Token ${asigSerial} asignado exitosamente al funcionario RUT ${asigRut} con expiración ${asigFechaExp}.`,
        );
        await Promise.all([cargarDatos(), cargarMetricas()]);
      }
    } catch {
      setMensajeOperacion('Error al asignar el token al funcionario.');
    }
  };

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
        await Promise.all([cargarDatos(), cargarMetricas()]);
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
          adminRut: usuarioActual?.rut,
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
    const rutFinal = formatRut(nuevoRut.trim()) || nuevoRut.trim();

    const token = localStorage.getItem('access_token') || '';
    const res = await fetch('/api/v1/usuarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        rut: rutFinal,
        nombre: nuevoNombre.trim(),
        email: `${rutFinal.replace(/[^0-9]/g, '').slice(0, 8)}@municoquimbo.cl`,
        cargo: nuevoCargo.trim() || 'Profesional Municipal',
        unidad: nuevaUnidad,
        rol: nuevoRol,
        ...(nuevaPassword.trim() ? { password: nuevaPassword.trim() } : {}),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setNuevoRut('');
      setNuevoNombre('');
      setNuevoCargo('');
      setNuevaPassword('');
      setCredencialGenerada({
        rut: rutFinal,
        nombre: data.nombre || nuevoNombre,
        passwordTemporal: data.passwordTemporal || (nuevaPassword.trim() ? nuevaPassword.trim() : 'Definida'),
        pinTemporal: data.pinTemporal,
      });
      setMensajeOperacion(`Funcionario (${rutFinal}) registrado exitosamente.`);
      await Promise.all([cargarDatos(), cargarMetricas()]);
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

      const receptorObj = usuarios.find((u) => u.rut === actaUsuarioRut);

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

      setMensajeOperacion(
        `Comprobante de Emisión oficial (${creada.codigoActa || creada.tipoActa}) generado y sellado con SHA-256.`,
      );
      setActaObs('');
      await Promise.all([cargarDatos(), cargarMetricas()]);
    } else {
      const err = await res.json();
      setMensajeOperacion(`Error al emitir acta: ${err.message || 'Operación fallida'}`);
    }
  };

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

  const receptoresFiltrados = usuarios.filter((u) => {
    if (!filtroReceptor.trim()) return true;
    if (matchesRutSearch(u.rut, filtroReceptor)) return true;
    const q = filtroReceptor.trim().toLowerCase();
    return (
      (u.nombre || '').toLowerCase().includes(q) ||
      (u.cargo || '').toLowerCase().includes(q)
    );
  });

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
      {/* Encabezado y Pestañas de Navegación Interna */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
              APARTADO 7 • CONTRATOS Y ASIGNACIÓN DE TOKENS
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
            Contratos de Obtención de Tokens, Asignación de Firmas y Custodia
          </h2>
          <p className="text-xs text-muted-foreground">
            Control de caducidad de contratos de tokens (fecha inicio, fecha término y visor PDF de copia del contrato), asignación de tokens a funcionarios y actas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={subTab === 'CONTRATOS' ? 'default' : 'outline'}
            onClick={() => setSubTab('CONTRATOS')}
            className="text-xs font-bold h-9"
          >
            1. Contratos de Obtención de Tokens ({contratos.length})
          </Button>
          <Button
            size="sm"
            variant={subTab === 'ASIGNACION' ? 'default' : 'outline'}
            onClick={() => setSubTab('ASIGNACION')}
            className="text-xs font-bold h-9"
          >
            2. Asignación de Tokens y Funcionarios ({usuarios.length})
          </Button>
          <Button
            size="sm"
            variant={subTab === 'CUSTODIA' ? 'default' : 'outline'}
            onClick={() => setSubTab('CUSTODIA')}
            className="text-xs font-bold h-9"
          >
            3. Actas de Entrega ({actas.length})
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

      {/* SECCIÓN 1 (Req 7): CONTRATOS DE OBTENCIÓN DE TOKENS CON FECHA INICIO/TÉRMINO, CADUCIDAD Y PREVISUALIZACIÓN PDF */}
      {subTab === 'CONTRATOS' && (
        <div className="space-y-6">
          {/* Resumen KPI de Contratos */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 border-border/80">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">
                Total Contratos de Tokens
              </div>
              <div className="text-2xl font-bold text-foreground mt-1">{contratos.length}</div>
              <div className="text-[11px] text-muted-foreground">Con copia PDF respaldada</div>
            </Card>
            <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
              <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                Contratos Vigentes
              </div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                {contratos.filter((c) => c.estadoContrato === 'VIGENTE').length}
              </div>
              <div className="text-[11px] text-muted-foreground">Suministro activo</div>
            </Card>
            <Card className="p-4 border-amber-500/30 bg-amber-500/5">
              <div className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                Próximos a Caducar
              </div>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                {contratos.filter((c) => c.estadoContrato === 'POR_CADUCAR').length}
              </div>
              <div className="text-[11px] text-muted-foreground">Menos de 90 días restantes</div>
            </Card>
            <Card className="p-4 border-primary/30 bg-primary/5">
              <div className="text-[10px] font-bold uppercase text-primary">
                Total Tokens Contratados
              </div>
              <div className="text-2xl font-bold text-foreground mt-1">
                {contratos.reduce((acc, c) => acc + (c.cantidadTokensContratados || 0), 0)}
              </div>
              <div className="text-[11px] text-muted-foreground">Unidades criptográficas USB</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Listado de Contratos de Obtención de Tokens */}
            <Card className="lg:col-span-8 border-border/80 bg-card overflow-hidden">
              <CardHeader className="p-4 border-b bg-muted/20 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm sm:text-base font-bold">
                      Registro de Contratos de Obtención de Tokens ({contratosFiltrados.length})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Incluye fecha de inicio, fecha de término, tiempo de caducidad y previsualización de copia del documento en PDF.
                    </CardDescription>
                  </div>
                </div>

                <Input
                  value={busquedaContratos}
                  onChange={(e) => setBusquedaContratos(e.target.value)}
                  placeholder="Buscar por código de contrato, proveedor, título u orden de compra..."
                  className="h-8 text-xs bg-background"
                />
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {contratosFiltrados.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No se encontraron contratos con el criterio indicado.
                  </div>
                ) : (
                  contratosFiltrados.map((contrato) => {
                    const pdfUrl = contrato.pdfUrl || `/api/v1/equipamiento/contratos/${contrato.id}/pdf`;
                    const isSelected = contratoPreview?.id === contrato.id;
                    return (
                      <div
                        key={contrato.id}
                        className={`p-4 rounded-xl border transition-all space-y-3 ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border/80 bg-background/60 hover:border-primary/40'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
                                {contrato.codigoContrato}
                              </span>
                              <Badge
                                variant={
                                  contrato.estadoContrato === 'VIGENTE'
                                    ? 'success'
                                    : contrato.estadoContrato === 'POR_CADUCAR'
                                    ? 'warning'
                                    : 'danger'
                                }
                                className="text-[10px] font-mono font-bold"
                              >
                                {contrato.estadoContrato}
                              </Badge>
                              {contrato.ordenCompra && (
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  OC: {contrato.ordenCompra}
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-bold text-foreground">{contrato.titulo}</h3>
                            <p className="text-xs text-muted-foreground">
                              Proveedor: <strong className="text-foreground">{contrato.proveedor}</strong>
                              {contrato.resolucionAprueba ? ` • ${contrato.resolucionAprueba}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant={isSelected ? 'default' : 'outline'}
                              onClick={() => setContratoPreview(isSelected ? null : contrato)}
                              className="h-8 text-xs font-bold"
                            >
                              {isSelected ? 'Ocultar Visor PDF' : 'Previsualizar Copia Contrato (PDF)'}
                            </Button>
                            <a
                              href={`${pdfUrl}?download=1`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center rounded-md border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary h-8 px-2.5 text-xs font-bold"
                            >
                              Descargar PDF
                            </a>
                          </div>
                        </div>

                        {/* Fechas de Inicio, Fecha de Término y Tiempo de Caducidad */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-muted/30 border text-xs">
                          <div>
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold block">
                              Fecha de Inicio
                            </span>
                            <span className="font-mono font-bold text-foreground">{contrato.fechaInicio}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold block">
                              Fecha de Término / Caducidad
                            </span>
                            <span className="font-mono font-bold text-foreground">{contrato.fechaTermino}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold block">
                              Tiempo de Caducidad
                            </span>
                            <span
                              className={`font-mono font-bold ${
                                contrato.diasRestantes <= 0
                                  ? 'text-rose-500'
                                  : contrato.diasRestantes <= 90
                                  ? 'text-amber-500'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {contrato.tiempoCaducidadTexto}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold block">
                              Dotación del Contrato
                            </span>
                            <span className="font-mono font-bold text-foreground">
                              {contrato.cantidadTokensContratados} Tokens USB
                            </span>
                          </div>
                        </div>

                        {/* Barra de Progreso de Vigencia */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                            <span>Vigencia transcurrida: {contrato.porcentajeVigenciaTranscurrida}%</span>
                            <span>
                              {contrato.diasRestantes > 0
                                ? `${contrato.diasRestantes} días restantes para caducar`
                                : `Caducado hace ${Math.abs(contrato.diasRestantes)} días`}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                contrato.estadoContrato === 'CADUCADO'
                                  ? 'bg-rose-500'
                                  : contrato.estadoContrato === 'POR_CADUCAR'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, contrato.porcentajeVigenciaTranscurrida))}%` }}
                            />
                          </div>
                        </div>

                        {/* Previsualización Embebida de la Copia del Contrato en PDF */}
                        {isSelected && (
                          <div className="pt-2 space-y-2">
                            <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5 rounded border text-xs">
                              <span className="font-bold font-mono">
                                Previsualización Copia Oficial de Contrato: {contrato.codigoContrato}.pdf
                              </span>
                              <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary underline font-semibold text-[11px]"
                              >
                                Abrir en pestaña completa ↗
                              </a>
                            </div>
                            <div className="w-full h-[420px] rounded-lg border bg-background overflow-hidden">
                              <iframe
                                src={pdfUrl}
                                title={`Copia Contrato ${contrato.codigoContrato}`}
                                className="w-full h-full border-0"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Formulario para Registrar Nuevo Contrato de Obtención de Tokens */}
            <Card className="lg:col-span-4 border-border/80 bg-card h-fit">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-sm font-bold">
                  Registrar Contrato de Obtención de Tokens
                </CardTitle>
                <CardDescription className="text-xs">
                  Genera automáticamente la copia digital en PDF del contrato con sus fechas de inicio y caducidad.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleCrearContrato} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold">Código de Contrato:</label>
                    <Input
                      value={codigoContrato}
                      onChange={(e) => setCodigoContrato(e.target.value)}
                      required
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold">Título / Objeto del Contrato:</label>
                    <Input
                      value={tituloContrato}
                      onChange={(e) => setTituloContrato(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold">Proveedor Adjudicado:</label>
                    <Input
                      value={proveedorContrato}
                      onChange={(e) => setProveedorContrato(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-semibold">Fecha de Inicio:</label>
                      <Input
                        type="date"
                        value={fechaInicioContrato}
                        onChange={(e) => setFechaInicioContrato(e.target.value)}
                        required
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold">Fecha de Término:</label>
                      <Input
                        type="date"
                        value={fechaTerminoContrato}
                        onChange={(e) => setFechaTerminoContrato(e.target.value)}
                        required
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-semibold">Cantidad Tokens:</label>
                      <Input
                        type="number"
                        min={1}
                        value={cantidadTokensContrato}
                        onChange={(e) => setCantidadTokensContrato(e.target.value)}
                        required
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold">Orden de Compra:</label>
                      <Input
                        value={ordenCompraContrato}
                        onChange={(e) => setOrdenCompraContrato(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold">Resolución / Decreto Aprueba:</label>
                    <Input
                      value={resolucionContrato}
                      onChange={(e) => setResolucionContrato(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold">Observaciones / Cláusulas de Vigencia:</label>
                    <Input
                      value={obsContrato}
                      onChange={(e) => setObsContrato(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button type="submit" className="w-full text-xs font-bold h-9 mt-2 shadow">
                    Registrar Contrato y Generar Copia PDF
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: ASIGNACIÓN DE TOKENS / FIRMAS Y FUNCIONARIOS */}
      {subTab === 'ASIGNACION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Tabla de Funcionarios y sus Tokens/Firmas Asignadas */}
          <Card className="lg:col-span-8 border-border/80 bg-card overflow-hidden">
            <CardHeader className="p-4 border-b bg-muted/20 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold">
                    Funcionarios Habilitados y Estado de Firma Asignada ({usuariosFiltrados.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Directorio institucional de titulares de tokens de firma electrónica.
                  </CardDescription>
                </div>
              </div>

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
                        No se encontraron funcionarios que coincidan con la búsqueda
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
                            <Badge variant="outline" className="text-[10px]">
                              {u.rol}
                            </Badge>
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
                                Revocar / Baja
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

          {/* Columna Derecha: Asignar Token a Funcionario + Registrar Funcionario */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-primary/40 bg-card">
              <CardHeader className="p-4 border-b bg-primary/5">
                <CardTitle className="text-sm font-bold">
                  Asignar Firma / Token a Funcionario
                </CardTitle>
                <CardDescription className="text-xs">
                  Vincula un dispositivo token y su fecha de expiración a un funcionario municipal.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleAsignarToken} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold">Funcionario Titular:</label>
                    <select
                      value={asigRut}
                      onChange={(e) => setAsigRut(e.target.value)}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
                    >
                      {usuarios.map((u) => (
                        <option key={u.id} value={u.rut}>
                          {u.rut} — {u.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold">N° Serie del Token USB:</label>
                    <Input
                      value={asigSerial}
                      onChange={(e) => setAsigSerial(e.target.value)}
                      required
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-semibold">Marca:</label>
                      <Input
                        value={asigMarca}
                        onChange={(e) => setAsigMarca(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold">Modelo:</label>
                      <Input
                        value={asigModelo}
                        onChange={(e) => setAsigModelo(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold">Fecha de Expiración del Token:</label>
                    <Input
                      type="date"
                      value={asigFechaExp}
                      onChange={(e) => setAsigFechaExp(e.target.value)}
                      required
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <Button type="submit" className="w-full text-xs font-bold h-9 shadow">
                    Asignar Token y Firma
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-sm font-bold">Registrar Nuevo Funcionario</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {credencialGenerada && (
                  <div className="mb-3 p-3 rounded-lg border border-amber-500/60 bg-amber-500/10 text-xs font-mono space-y-1">
                    <div className="font-bold text-foreground">Credenciales para {credencialGenerada.nombre}:</div>
                    <div>RUT: {credencialGenerada.rut}</div>
                    <div>Clave: {credencialGenerada.passwordTemporal}</div>
                  </div>
                )}
                <form onSubmit={handleCrearUsuario} className="space-y-2.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold">RUT Institucional:</label>
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
                    <label className="font-semibold">Cargo / Unidad:</label>
                    <Input
                      value={nuevoCargo}
                      onChange={(e) => setNuevoCargo(e.target.value)}
                      placeholder="Cargo municipal"
                      className="h-8 text-xs mb-1.5"
                    />
                    <Input
                      value={nuevaUnidad}
                      onChange={(e) => setNuevaUnidad(e.target.value)}
                      placeholder="Unidad municipal"
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button type="submit" variant="outline" className="w-full text-xs font-bold h-8">
                    Crear Funcionario
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SECCIÓN 3: ACTAS DE ENTREGA Y CUSTODIA */}
      {subTab === 'CUSTODIA' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {comprobanteEmitido && (
            <div className="lg:col-span-12 p-4 rounded-xl border-2 border-primary/50 bg-primary/5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">
                  ✓ Comprobante Oficial de Emisión Generado ({comprobanteEmitido.codigoActa})
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setComprobanteEmitido(null)} className="text-xs h-7">
                  ✕ Cerrar
                </Button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>
                  Receptor: <strong>{comprobanteEmitido.receptorNombre}</strong> ({comprobanteEmitido.receptorRut}) — Token: <strong>{comprobanteEmitido.tokenSerial}</strong>
                </span>
                <a
                  href={comprobanteEmitido.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center px-3 py-1.5 rounded bg-primary text-primary-foreground font-bold text-xs"
                >
                  Descargar Comprobante (PDF)
                </a>
              </div>
            </div>
          )}

          <Card className="lg:col-span-8 border-border/80 bg-card overflow-hidden">
            <CardHeader className="p-4 border-b bg-muted/20 space-y-2">
              <CardTitle className="text-sm font-bold">
                Historial de Comprobantes de Entrega y Devolución de Tokens ({actasFiltradas.length})
              </CardTitle>
              <Input
                value={busquedaActas}
                onChange={(e) => setBusquedaActas(e.target.value)}
                placeholder="Buscar acta por RUT receptor, Folio o N° Serie..."
                className="h-8 text-xs bg-background"
              />
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 text-[11px]">
                  <TableRow>
                    <TableHead>Folio / Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Token (N° Serie)</TableHead>
                    <TableHead>Funcionario Receptor</TableHead>
                    <TableHead className="text-right">Comprobante PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {actasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                        Sin comprobantes registrados para este filtro.
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
                          <Badge variant="outline" className="text-[10px] font-mono font-bold">
                            {a.tipoActa}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-[11px]">
                          {a.token?.serialNumber || '-'}
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
                            className="inline-flex items-center px-2.5 py-1 rounded border border-primary/40 bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20"
                          >
                            Ver Acta PDF
                          </a>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="lg:col-span-4 border-border/80 bg-card h-fit">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-bold">Emitir Acta de Custodia de Token</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleEmitirActa} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold">Dispositivo Token:</label>
                  <select
                    value={actaTokenSerial}
                    onChange={(e) => setActaTokenSerial(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
                  >
                    {tokens.map((t) => (
                      <option key={t.id} value={t.serialNumber}>
                        {t.serialNumber} — {t.marca} {t.modelo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Filtrar Funcionario Receptor:</label>
                  <Input
                    value={filtroReceptor}
                    onChange={(e) => setFiltroReceptor(e.target.value)}
                    placeholder="Buscar por RUT o nombre..."
                    className="h-7 text-xs mb-1"
                  />
                  <select
                    value={actaUsuarioRut}
                    onChange={(e) => setActaUsuarioRut(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
                  >
                    {receptoresFiltrados.map((u) => (
                      <option key={u.id} value={u.rut}>
                        {u.rut} — {u.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Tipo de Movimiento:</label>
                  <select
                    value={actaTipo}
                    onChange={(e) => setActaTipo(e.target.value as any)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
                  >
                    <option value="ENTREGA">ENTREGA DE TOKEN</option>
                    <option value="DEVOLUCION">DEVOLUCIÓN DE TOKEN</option>
                    <option value="TRASPASO">TRASPASO DE CUSTODIA</option>
                    <option value="BAJA">BAJA DE DISPOSITIVO</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Observaciones:</label>
                  <Input
                    value={actaObs}
                    onChange={(e) => setActaObs(e.target.value)}
                    placeholder="Observaciones del acta..."
                    className="h-8 text-xs"
                  />
                </div>
                <Button type="submit" className="w-full text-xs font-bold h-9">
                  Emitir Comprobante PDF
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Resumen de Métricas y Exportación Summary LaTeX / PDF */}
      <MetricasTrazabilidadPanel vistaOrigen="CUSTODIA" compacto />
    </div>
  );
};
