import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  Clock,
  Calendar,
  KeyRound,
  Hash,
  Building2,
  User,
  Bell,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  PlusCircle,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { useAuthStore } from '../store/useAuthStore';
import { useTelemetriaStore, ContratoTokenItem } from '../store/useTelemetriaStore';
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
  const { metricas, cargarMetricas } = useTelemetriaStore();

  const [subTab, setSubTab] = useState<'CONTRATOS' | 'ASIGNACION' | 'CUSTODIA' | 'NUEVO_CONTRATO'>('CONTRATOS');
  const [contratosRemotos, setContratosRemotos] = useState<ContratoTokenItem[]>([]);
  const [contratoPreview, setContratoPreview] = useState<ContratoTokenItem | null>(null);

  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [actas, setActas] = useState<ActaItem[]>([]);
  const [mensajeOperacion, setMensajeOperacion] = useState<string | null>(null);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Filtros de búsqueda
  const [busquedaContratos, setBusquedaContratos] = useState('');
  const [expandedContratoIds, setExpandedContratoIds] = useState<Record<string, boolean>>({});
  const [avisosRenovacionEnviados, setAvisosRenovacionEnviados] = useState<Record<string, string>>({});
  const [contratoARenovar, setContratoARenovar] = useState<ContratoTokenItem | null>(null);
  const [renovando, setRenovando] = useState(false);
  const [diasExtensionRenovacion, setDiasExtensionRenovacion] = useState(365);
  const [busquedaUsuarios, setBusquedaUsuarios] = useState('');
  const [busquedaActas, setBusquedaActas] = useState('');
  const [filtroReceptor, setFiltroReceptor] = useState('');

  // Modal de Comprobante de Emisión generado
  const [comprobanteEmitido, setComprobanteEmitido] = useState<ComprobanteEmitidoModal | null>(null);

  // Formulario Nuevo Contrato Individual de Obtención de Token (Flujo: el funcionario firma la obtención de su token)
  const [codigoContrato, setCodigoContrato] = useState('CT-OBT-2026-009');
  const [contratoRut, setContratoRut] = useState('');
  const [contratoTokenSerial, setContratoTokenSerial] = useState('SAFENET-5110-CQ09');
  const [fechaInicioContrato, setFechaInicioContrato] = useState('2026-01-15');
  const [fechaTerminoContrato, setFechaTerminoContrato] = useState('2027-01-15');

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
          setContratoRut((prev) => prev || resUsers[0].rut);
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

  const handleAvisarRenovacion = async (contrato: ContratoTokenItem) => {
    const ahoraStr = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const titularNombre = contrato.funcionarioNombre || 'Funcionario';
    const titularRut = contrato.funcionarioRut || '-';
    const tokenSerial = contrato.serialNumberToken || 'Token USB';
    const fechaExp = (contrato.fechaTermino || '').split('T')[0];

    try {
      const funcionarioObj = usuarios.find((u) => u.rut === titularRut);
      await fetch('/api/v1/usuarios/alertas-vencimiento/despachar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serialNumber: tokenSerial,
          email: funcionarioObj?.email || `${titularRut.replace(/[^0-9]/g, '')}@municoquimbo.cl`,
          diasRestantes: contrato.diasRestantes,
          codigoContrato: contrato.codigoContrato,
        }),
      });
    } catch {
      // Notificación optimista
    }

    setAvisosRenovacionEnviados((prev) => ({
      ...prev,
      [contrato.id]: ahoraStr,
    }));

    setMensajeOperacion(
      `Aviso de renovación despachado exitosamente a ${titularNombre} (RUT: ${titularRut}) para el token ${tokenSerial} (vence: ${fechaExp}).`,
    );
  };

  const handleEjecutarRenovacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contratoARenovar) return;

    setRenovando(true);
    const ahora = new Date();
    const nuevaFechaInicio = ahora.toISOString().split('T')[0];
    const nuevaFechaTerminoObj = new Date(ahora.getTime() + diasExtensionRenovacion * 24 * 60 * 60 * 1000);
    const nuevaFechaTermino = nuevaFechaTerminoObj.toISOString().split('T')[0];

    const titularNombre = contratoARenovar.funcionarioNombre || 'Funcionario Municipal';
    const titularRut = contratoARenovar.funcionarioRut || '';
    const titularUnidad = contratoARenovar.funcionarioUnidad || 'Municipalidad de Coquimbo';
    const titularCargo = contratoARenovar.funcionarioCargo || 'Profesional';
    const tokenSerial = contratoARenovar.serialNumberToken || 'SAFENET-5110-CQ01';

    try {
      // 1. Renovar en backend el contrato de obtención y token de hardware
      const resContrato = await fetch('/api/v1/equipamiento/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoContrato: contratoARenovar.codigoContrato,
          titulo: `Contrato de Renovación de Token — ${titularNombre}`,
          proveedor: contratoARenovar.proveedor || 'E-Certchile / Municipalidad de Coquimbo',
          funcionarioNombre: titularNombre,
          funcionarioRut: titularRut,
          funcionarioUnidad: titularUnidad,
          funcionarioCargo: titularCargo,
          serialNumberToken: tokenSerial,
          firmadoObtencion: true,
          fechaInicio: nuevaFechaInicio,
          fechaTermino: nuevaFechaTermino,
          cantidadTokensContratados: 1,
        }),
      });

      // 2. Garantizar sincronización en backend de la asignación del token y certificado
      if (titularRut && titularRut !== '-') {
        await fetch('/api/v1/equipamiento/asignar-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rutUsuario: titularRut,
            serialNumber: tokenSerial,
            marca: 'Thales SafeNet',
            modelo: 'eToken 5110 CC',
            fechaExpiracion: nuevaFechaTermino,
            codigoContrato: contratoARenovar.codigoContrato,
          }),
        }).catch(() => {});
      }

      if (resContrato.ok) {
        const renovado = await resContrato.json();
        setMensajeOperacion(
          `Contrato ${contratoARenovar.codigoContrato} y Token ${tokenSerial} renovados exitosamente para ${titularNombre} hasta ${nuevaFechaTermino}.`,
        );
        setContratoARenovar(null);
        await Promise.all([cargarDatos(), cargarMetricas()]);
      } else {
        // Fallback optimista local
        setContratosRemotos((prev) =>
          prev.map((c) =>
            c.id === contratoARenovar.id
              ? {
                  ...c,
                  fechaInicio: nuevaFechaInicio,
                  fechaTermino: nuevaFechaTermino,
                  diasRestantes: diasExtensionRenovacion,
                  estadoContrato: 'VIGENTE',
                  tiempoCaducidadTexto: `${diasExtensionRenovacion} días restantes`,
                }
              : c,
          ),
        );
        setMensajeOperacion(
          `Contrato y Token ${tokenSerial} renovados localmente hasta ${nuevaFechaTermino}.`,
        );
        setContratoARenovar(null);
      }
    } catch {
      setMensajeOperacion(`Error al procesar renovación del contrato.`);
    } finally {
      setRenovando(false);
    }
  };

  const contratos: ContratoTokenItem[] =
    contratosRemotos.length > 0
      ? contratosRemotos
      : metricas?.contratosResumen?.listado || [];

  const contratosFiltrados = contratos.filter((c) => {
    const q = busquedaContratos.trim().toLowerCase();
    if (!q) return true;
    return (
      c.codigoContrato.toLowerCase().includes(q) ||
      (c.funcionarioNombre || '').toLowerCase().includes(q) ||
      (c.funcionarioRut || '').toLowerCase().includes(q) ||
      (c.funcionarioUnidad || '').toLowerCase().includes(q) ||
      (c.serialNumberToken || '').toLowerCase().includes(q) ||
      c.titulo.toLowerCase().includes(q)
    );
  });

  const handleCrearContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoContrato.trim()) return;
    const funcObj = usuarios.find((u) => u.rut === contratoRut);
    const nombreTitular = funcObj?.nombre || 'Funcionario Municipal';
    const rutTitular = funcObj?.rut || contratoRut || '-';
    const unidadTitular = funcObj?.unidad || 'Municipalidad de Coquimbo';
    const cargoTitular = funcObj?.cargo || 'Profesional Municipal';

    try {
      const res = await fetch('/api/v1/equipamiento/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoContrato: codigoContrato.trim(),
          titulo: `Contrato de Obtención de Token — ${nombreTitular}`,
          proveedor: 'E-Certchile / Municipalidad de Coquimbo',
          funcionarioNombre: nombreTitular,
          funcionarioRut: rutTitular,
          funcionarioUnidad: unidadTitular,
          funcionarioCargo: cargoTitular,
          serialNumberToken: contratoTokenSerial.trim(),
          firmadoObtencion: true,
          fechaInicio: fechaInicioContrato,
          fechaTermino: fechaTerminoContrato,
          cantidadTokensContratados: 1,
        }),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setMensajeOperacion(
          `Contrato de Obtención (${nuevo.codigoContrato || codigoContrato}) firmado por ${nombreTitular} para el token ${contratoTokenSerial}.`,
        );
        await Promise.all([cargarDatos(), cargarMetricas()]);
        if (nuevo?.id) {
          setContratoPreview(nuevo);
        }
        setSubTab('CONTRATOS');
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

      {/* SECCIÓN 1: CONTRATOS INDIVIDUALES DE OBTENCIÓN DE TOKEN POR FUNCIONARIO */}
      {subTab === 'CONTRATOS' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Resumen conciso de Contratos de Obtención */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              <Card className="p-4 border-border/80">
                <div className="text-[10px] font-bold uppercase text-muted-foreground">
                  Contratos Firmados
                </div>
                <div className="text-2xl font-bold text-foreground mt-1">{contratos.length}</div>
                <div className="text-[11px] text-muted-foreground">
                  1 contrato por funcionario con token
                </div>
              </Card>
              <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
                <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  Contratos Vigentes
                </div>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                  {contratos.filter((c) => c.estadoContrato === 'VIGENTE').length}
                </div>
                <div className="text-[11px] text-muted-foreground">Obtención activa</div>
              </Card>
              <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                <div className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                  Por Caducar / Caducados
                </div>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                  {contratos.filter((c) => c.estadoContrato !== 'VIGENTE').length}
                </div>
                <div className="text-[11px] text-muted-foreground">Requieren renovación</div>
              </Card>
            </div>
            
            <div className="sm:self-center shrink-0">
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {/* Listado Simple de Contratos Individuales de Obtención a ancho completo */}
            <Card className="border-border/80 bg-card overflow-hidden">
              <CardHeader className="p-4 border-b bg-muted/20 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm sm:text-base font-bold">
                      Contratos Individuales de Obtención de Token ({contratosFiltrados.length})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Cada funcionario firma su contrato individual de obtención al recibir su dispositivo token.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setSubTab('NUEVO_CONTRATO')}
                    className="h-8 text-xs font-bold gap-1.5 self-start sm:self-auto"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Nuevo Contrato
                  </Button>
                </div>

                <Input
                  value={busquedaContratos}
                  onChange={(e) => setBusquedaContratos(e.target.value)}
                  placeholder="Buscar por funcionario, RUT o unidad"
                  className="h-8 text-xs bg-background"
                />
              </CardHeader>

              <CardContent className="p-0">
                {contratosFiltrados.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg m-4">
                    No se encontraron contratos con el criterio indicado.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40 text-[11px]">
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Nombre y RUT</TableHead>
                          <TableHead>Departamento / Unidad</TableHead>
                          <TableHead className="whitespace-nowrap">Tiempo para Caducidad</TableHead>
                          <TableHead className="whitespace-nowrap">Fecha de Expiración</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        {contratosFiltrados.map((contrato) => {
                          const pdfUrl =
                            contrato.pdfUrl || `/api/v1/equipamiento/contratos/${contrato.id}/pdf`;
                          const isSelected = contratoPreview?.id === contrato.id;
                          const isExpanded = !!expandedContratoIds[contrato.id];
                          const titularNombre =
                            contrato.funcionarioNombre ||
                            contrato.titulo.replace(/^Contrato.*?—\s*/i, '') ||
                            'Funcionario Municipal';
                          const titularRut = contrato.funcionarioRut || '-';
                          const titularUnidad =
                            contrato.funcionarioUnidad || 'Municipalidad de Coquimbo';
                          const tokenSerial = contrato.serialNumberToken || 'TOKEN-ASIGNADO';
                          const caducado = contrato.diasRestantes <= 0;
                          const fechaExpLimpia = (contrato.fechaTermino || '').split('T')[0];
                          const fechaInicioLimpia = (contrato.fechaInicio || '').split('T')[0];
                          const avisoEnviadoHora = avisosRenovacionEnviados[contrato.id];

                          const toggleExpand = () => {
                            setExpandedContratoIds((prev) => ({
                              ...prev,
                              [contrato.id]: !prev[contrato.id],
                            }));
                          };

                          return (
                            <React.Fragment key={contrato.id}>
                              <TableRow className={`hover:bg-muted/30 transition-colors ${isExpanded ? 'bg-muted/15' : ''}`}>
                                <TableCell className="pl-3 pr-0 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={toggleExpand}
                                    title={isExpanded ? 'Ocultar detalles' : 'Ver más detalles'}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-primary" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>
                                </TableCell>
                                <TableCell className="py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                      {titularNombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-foreground truncate max-w-[200px] sm:max-w-[240px]">
                                        {titularNombre}
                                      </div>
                                      <div className="text-[11px] text-muted-foreground font-mono">
                                        RUT: {titularRut}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3">
                                  <div className="flex items-center gap-1.5 text-foreground text-[11px]">
                                    <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <span className="font-medium truncate max-w-[180px]">{titularUnidad}</span>
                                  </div>
                                  {contrato.funcionarioCargo && (
                                    <div className="text-[10px] text-muted-foreground truncate max-w-[180px] pl-5">
                                      {contrato.funcionarioCargo}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="py-3">
                                  <div>
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[11px] font-bold ${
                                        caducado
                                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                          : contrato.diasRestantes <= 60
                                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                      }`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          caducado
                                            ? 'bg-rose-500'
                                            : contrato.diasRestantes <= 60
                                            ? 'bg-amber-500'
                                            : 'bg-emerald-500'
                                        }`}
                                      />
                                      {caducado
                                        ? `Caducó hace ${Math.abs(contrato.diasRestantes)} días`
                                        : `${contrato.diasRestantes} días restantes`}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <span>{fechaExpLimpia}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      size="sm"
                                      variant={avisoEnviadoHora ? 'secondary' : 'outline'}
                                      onClick={() => handleAvisarRenovacion(contrato)}
                                      title={avisoEnviadoHora ? `Aviso enviado a las ${avisoEnviadoHora}` : 'Enviar aviso de renovación al funcionario'}
                                      className="h-7 px-2 text-xs font-medium gap-1 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
                                    >
                                      <Bell className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">
                                        {avisoEnviadoHora ? 'Avisado' : 'Avisar Renovación'}
                                      </span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setContratoARenovar(contrato)}
                                      title="Renovar contrato y vigencia del token en backend"
                                      className="h-7 px-2 text-xs font-medium gap-1 text-primary border-primary/40 hover:bg-primary/10"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Renovar</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={isExpanded ? 'secondary' : 'outline'}
                                      onClick={toggleExpand}
                                      className="h-7 px-2.5 text-xs font-medium gap-1"
                                    >
                                      {isExpanded ? (
                                        <>
                                          Menos <ChevronUp className="w-3.5 h-3.5" />
                                        </>
                                      ) : (
                                        <>
                                          Ver más detalles <ChevronDown className="w-3.5 h-3.5" />
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={isSelected ? 'default' : 'outline'}
                                      onClick={() => setContratoPreview(isSelected ? null : contrato)}
                                      className="h-7 px-2.5 text-xs font-semibold gap-1"
                                      title={isSelected ? 'Ocultar PDF' : 'Ver PDF'}
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>{isSelected ? 'Ocultar PDF' : 'Ver PDF'}</span>
                                    </Button>
                                    <a
                                      href={`${pdfUrl}?download=1`}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="Descargar PDF"
                                      className="inline-flex items-center justify-center rounded-md border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary h-7 w-7 text-xs font-bold transition-colors"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </TableCell>
                              </TableRow>

                              {/* Fila Desplegable hacia abajo con más detalles: Token, Serie/Folio y contrato */}
                              {isExpanded && (
                                <TableRow className="bg-muted/20 border-b">
                                  <TableCell colSpan={6} className="p-0">
                                    <div className="p-4 bg-gradient-to-r from-muted/30 via-muted/20 to-transparent border-t border-dashed space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                                      <div className="flex items-center justify-end">
                                        <button
                                          type="button"
                                          onClick={toggleExpand}
                                          className="text-[11px] text-muted-foreground hover:text-foreground underline"
                                        >
                                          Cerrar detalles
                                        </button>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                        {/* Token y Modelo: Número de Serie SafeNet (o detectado) */}
                                        <div className="p-3 rounded-lg border bg-background/80 shadow-xs space-y-1">
                                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                                            <KeyRound className="w-3.5 h-3.5 text-primary" />
                                            Información del Token
                                          </div>
                                          <div className="font-mono font-bold text-foreground text-xs">
                                            {tokenSerial}
                                          </div>
                                          <div className="text-[10px] text-muted-foreground truncate">
                                            {contrato.marcaModeloToken || 'Thales SafeNet eToken 5110 CC'}
                                          </div>
                                        </div>

                                        {/* Número de Serie y Folio */}
                                        <div className="p-3 rounded-lg border bg-background/80 shadow-xs space-y-1">
                                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                                            <Hash className="w-3.5 h-3.5 text-primary" />
                                            N° de Serie / Folio
                                          </div>
                                          <div className="font-mono font-bold text-foreground text-xs">
                                            {tokenSerial}
                                          </div>
                                          <div className="text-[10px] text-muted-foreground font-mono">
                                            Folio/Código: {contrato.codigoContrato}
                                          </div>
                                        </div>

                                        {/* Vigencia y Fechas */}
                                        <div className="p-3 rounded-lg border bg-background/80 shadow-xs space-y-1">
                                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                                            <Clock className="w-3.5 h-3.5 text-primary" />
                                            Periodo de Vigencia
                                          </div>
                                          <div className="font-mono text-xs font-semibold text-foreground">
                                            {fechaInicioLimpia} al {fechaExpLimpia}
                                          </div>
                                          <div className="text-[10px] text-muted-foreground">
                                            {caducado
                                              ? `Expiró formalmente el ${fechaExpLimpia}`
                                              : `Vigencia transcurrida: ${Math.round(contrato.porcentajeVigenciaTranscurrida || 0)}%`}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Opciones de Acción dentro del desplegable */}
                                      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-border/60 gap-2">
                                        <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                                          <span>
                                            Contrato digital: <strong className="font-mono text-foreground">{contrato.codigoContrato}.pdf</strong>
                                          </span>
                                          {avisoEnviadoHora && (
                                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                              <CheckCircle2 className="w-3 h-3" /> Aviso enviado ({avisoEnviadoHora})
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAvisarRenovacion(contrato)}
                                            className="h-7 text-xs font-medium gap-1 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
                                          >
                                            <Bell className="w-3.5 h-3.5" />
                                            Avisar Renovación
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setContratoARenovar(contrato)}
                                            className="h-7 text-xs font-medium gap-1 text-primary border-primary/40 hover:bg-primary/10"
                                          >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            Renovar Contrato y Token
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant={isSelected ? 'default' : 'outline'}
                                            onClick={() => setContratoPreview(isSelected ? null : contrato)}
                                            className="h-7 text-xs font-medium"
                                          >
                                            <FileText className="w-3.5 h-3.5 mr-1" />
                                            {isSelected ? 'ocultar PDF' : 'ver PDF'}
                                          </Button>
                                          <a
                                            href={pdfUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-primary text-xs font-semibold hover:underline px-2 py-1"
                                          >
                                            ver contrato en pestaña nueva <ExternalLink className="w-3 h-3" />
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}

                              {/* Visor PDF embebido si está seleccionado */}
                              {isSelected && (
                                <TableRow className="bg-background">
                                  <TableCell colSpan={6} className="p-4 border-b">
                                    <div className="p-3 rounded-xl border bg-muted/20 space-y-2">
                                      <div className="flex items-center justify-between bg-muted/60 px-3 py-2 rounded-lg border text-xs">
                                        <span className="font-bold font-mono text-foreground flex items-center gap-2">
                                          <FileText className="w-4 h-4 text-primary" />
                                          Copia Digital: {contrato.codigoContrato}.pdf — {titularNombre}
                                        </span>
                                        <div className="flex items-center gap-3">
                                          <a
                                            href={`${pdfUrl}?download=1`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary hover:underline font-semibold text-[11px] flex items-center gap-1"
                                          >
                                            <Download className="w-3 h-3" /> Descargar copia
                                          </a>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setContratoPreview(null)}
                                            className="h-6 px-2 text-[11px]"
                                          >
                                            Cerrar Visor
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="w-full h-[420px] rounded-lg border bg-background overflow-hidden shadow-inner">
                                        <iframe
                                          src={pdfUrl}
                                          title={`Contrato ${contrato.codigoContrato}`}
                                          className="w-full h-full border-0"
                                        />
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Modal / Diálogo de Renovación de Contrato y Token */}
          {contratoARenovar && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
              <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
                <div className="flex items-start justify-between border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-primary/10 text-primary">
                        <RefreshCw className="w-4 h-4" />
                      </span>
                      <h3 className="text-base font-bold text-foreground">
                        Renovación de Contrato y Token
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Al renovar aquí el contrato, se sincroniza y renueva automáticamente la vigencia del token y certificado en el backend.
                    </p>
                  </div>
                  <button
                    onClick={() => setContratoARenovar(null)}
                    disabled={renovando}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl border bg-muted/30 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Funcionario:</span>
                    <span className="font-bold text-foreground">
                      {contratoARenovar.funcionarioNombre}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">RUT:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {contratoARenovar.funcionarioRut}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Departamento / Unidad:</span>
                    <span className="text-foreground">{contratoARenovar.funcionarioUnidad}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Token Físico Asignado:</span>
                    <span className="font-mono font-bold text-primary">
                      {contratoARenovar.serialNumberToken || 'SAFENET-5110'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Código de Contrato:</span>
                    <span className="font-mono text-muted-foreground">
                      {contratoARenovar.codigoContrato}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-muted-foreground">Expiración actual:</span>
                    <span className="font-mono font-bold text-rose-500">
                      {(contratoARenovar.fechaTermino || '').split('T')[0]}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleEjecutarRenovacion} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Extensión de Vigencia:
                    </label>
                    <select
                      value={diasExtensionRenovacion}
                      onChange={(e) => setDiasExtensionRenovacion(Number(e.target.value))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                    >
                      <option value={365}>1 Año (365 días adicionales) — Estándar Municipal</option>
                      <option value={730}>2 Años (730 días adicionales)</option>
                      <option value={1095}>3 Años (1095 días adicionales)</option>
                      <option value={180}>6 Meses (180 días) — Periodo transitorio</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-foreground space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> Nueva Fecha de Expiración estimada:
                    </div>
                    <div className="font-mono font-bold text-sm text-emerald-800 dark:text-emerald-300 pl-5">
                      {
                        new Date(Date.now() + diasExtensionRenovacion * 24 * 60 * 60 * 1000)
                          .toISOString()
                          .split('T')[0]
                      }
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setContratoARenovar(null)}
                      disabled={renovando}
                      className="text-xs h-9"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={renovando}
                      className="text-xs font-bold h-9 gap-1.5 shadow"
                    >
                      {renovando ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Sincronizando y Renovando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          Confirmar Renovación
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-VISTA: NUEVO CONTRATO DE OBTENCIÓN DE TOKEN */}
      {subTab === 'NUEVO_CONTRATO' && (
        <div className="space-y-4 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSubTab('CONTRATOS')}
              className="text-xs font-semibold gap-1.5 h-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al listado de Contratos
            </Button>
            <span className="text-[11px] font-mono text-muted-foreground">
              Formulario oficial de obtención
            </span>
          </div>

          <Card className="border-border/80 bg-card shadow-lg">
            <CardHeader className="p-5 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <PlusCircle className="w-5 h-5" />
                </span>
                <div>
                  <CardTitle className="text-base font-bold">
                    Nuevo Contrato de Obtención y Responsabilidad de Token
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Paso formal: el funcionario firma la recepción y compromiso de custodia de su dispositivo token de firma electrónica.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleCrearContrato} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground flex items-center justify-between">
                    <span>Código de Contrato / Folio:</span>
                    <span className="text-[10px] text-muted-foreground">Identificador municipal</span>
                  </label>
                  <Input
                    value={codigoContrato}
                    onChange={(e) => setCodigoContrato(e.target.value)}
                    required
                    placeholder="Ej: CT-OBT-2026-009"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Funcionario Solicitante / Titular:</label>
                  <select
                    value={contratoRut}
                    onChange={(e) => setContratoRut(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-mono"
                  >
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.rut}>
                        {u.rut} — {u.nombre} ({u.unidad})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground flex items-center justify-between">
                    <span>Token Asignado (N° Serie SafeNet):</span>
                    <span className="text-[10px] text-primary font-mono">Dispositivo criptográfico</span>
                  </label>
                  <Input
                    value={contratoTokenSerial}
                    onChange={(e) => setContratoTokenSerial(e.target.value)}
                    required
                    placeholder="Ej: SAFENET-5110-CQ09"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Fecha Inicio de Vigencia:</label>
                    <Input
                      type="date"
                      value={fechaInicioContrato}
                      onChange={(e) => setFechaInicioContrato(e.target.value)}
                      required
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Fecha Término (Expiración):</label>
                    <Input
                      type="date"
                      value={fechaTerminoContrato}
                      onChange={(e) => setFechaTerminoContrato(e.target.value)}
                      required
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30 text-muted-foreground text-[11px] space-y-1">
                  <p className="font-semibold text-foreground">Nota de Emisión:</p>
                  <p>
                    Al firmar la obtención, se registrará el contrato con validez jurídica municipal y se vinculará formalmente el número de serie de SafeNet al funcionario en el inventario de equipamiento.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSubTab('CONTRATOS')}
                    className="text-xs h-9"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="text-xs font-bold h-9 px-4 shadow gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Firmar Obtención y Generar Contrato PDF
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
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
                            <span className="font-mono text-xs font-semibold text-muted-foreground">
                              {u.rol}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                                  isDesvinculado
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : u.estado === 'ACTIVO'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isDesvinculado
                                      ? 'bg-rose-500'
                                      : u.estado === 'ACTIVO'
                                      ? 'bg-emerald-500'
                                      : 'bg-amber-500'
                                  }`}
                                />
                                {u.estado === 'ACTIVO' ? 'Activo' : u.estado === 'EN_LICENCIA' ? 'En licencia' : u.estado}
                              </span>
                              {u.pinBloqueado && (
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                  PIN Bloqueado
                                </span>
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

          {/* Modal / Diálogo de Renovación de Contrato y Token */}
          {contratoARenovar && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
              <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
                <div className="flex items-start justify-between border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-primary/10 text-primary">
                        <RefreshCw className="w-4 h-4" />
                      </span>
                      <h3 className="text-base font-bold text-foreground">
                        Renovación de Contrato y Token
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Al renovar aquí el contrato, se sincroniza y renueva automáticamente la vigencia del token y certificado en el backend.
                    </p>
                  </div>
                  <button
                    onClick={() => setContratoARenovar(null)}
                    disabled={renovando}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl border bg-muted/30 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Funcionario:</span>
                    <span className="font-bold text-foreground">
                      {contratoARenovar.funcionarioNombre}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">RUT:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {contratoARenovar.funcionarioRut}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Departamento / Unidad:</span>
                    <span className="text-foreground">{contratoARenovar.funcionarioUnidad}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Token Físico Asignado:</span>
                    <span className="font-mono font-bold text-primary">
                      {contratoARenovar.serialNumberToken || 'SAFENET-5110'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Código de Contrato:</span>
                    <span className="font-mono text-muted-foreground">
                      {contratoARenovar.codigoContrato}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-muted-foreground">Expiración actual:</span>
                    <span className="font-mono font-bold text-rose-500">
                      {(contratoARenovar.fechaTermino || '').split('T')[0]}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleEjecutarRenovacion} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Extensión de Vigencia:
                    </label>
                    <select
                      value={diasExtensionRenovacion}
                      onChange={(e) => setDiasExtensionRenovacion(Number(e.target.value))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                    >
                      <option value={365}>1 Año (365 días adicionales) — Estándar Municipal</option>
                      <option value={730}>2 Años (730 días adicionales)</option>
                      <option value={1095}>3 Años (1095 días adicionales)</option>
                      <option value={180}>6 Meses (180 días) — Periodo transitorio</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-foreground space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> Nueva Fecha de Expiración estimada:
                    </div>
                    <div className="font-mono font-bold text-sm text-emerald-800 dark:text-emerald-300 pl-5">
                      {
                        new Date(Date.now() + diasExtensionRenovacion * 24 * 60 * 60 * 1000)
                          .toISOString()
                          .split('T')[0]
                      }
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setContratoARenovar(null)}
                      disabled={renovando}
                      className="text-xs h-9"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={renovando}
                      className="text-xs font-bold h-9 gap-1.5 shadow"
                    >
                      {renovando ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Sincronizando y Renovando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          Confirmar Renovación
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
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
                          <span className="font-mono text-xs font-semibold text-primary">
                            {a.tipoActa === 'ENTREGA' ? 'Entrega' : a.tipoActa === 'DEVOLUCION' ? 'Devolución' : a.tipoActa === 'TRASPASO' ? 'Traspaso' : 'Baja'}
                          </span>
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
    </div>
  );
};
