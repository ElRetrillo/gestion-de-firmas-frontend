import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Input } from './ui/input';
import { useAuthStore } from '../store/useAuthStore';
import { useTelemetriaStore } from '../store/useTelemetriaStore';

interface DocumentoFuncionario {
  id: string;
  codigo: string;
  tipo: string;
  titulo: string;
  unidadOrigen: string;
  fechaAsignacion: string;
  estado: 'PENDIENTE' | 'EN_REVISION' | 'FIRMADO';
  prioridad: 'URGENTE' | 'NORMAL' | 'ALTA';
  hashSha256: string;
  firmaInfo?: {
    firmadoPor: string;
    fechaFirma: string;
    codigoVerificacion: string;
  };
}

export const MisDocumentosFuncionarioView: React.FC = () => {
  const { usuario } = useAuthStore();
  const { estaciones } = useTelemetriaStore();
  const estacionConectada = estaciones.find((e) => e.estadoEnVivo === 'CONECTADO' || e.estadoEnVivo === 'FIRMANDO');
  const tokenActivo = estacionConectada?.tokenInfo;

  const [documentos, setDocumentos] = useState<DocumentoFuncionario[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [documentoEnFirma, setDocumentoEnFirma] = useState<DocumentoFuncionario | null>(null);
  const [firmando, setFirmando] = useState(false);
  const [pinToken, setPinToken] = useState(usuario.pinToken || '1234');
  const [errorPin, setErrorPin] = useState<string | null>(null);
  const [firmaExitosaModal, setFirmaExitosaModal] = useState<DocumentoFuncionario | null>(null);

  const cargarBandeja = async () => {
    try {
      const res = await fetch('/api/v1/firmas/solicitudes');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapeados: DocumentoFuncionario[] = data.map((s: any) => ({
            id: s.id,
            codigo: s.codigoDocumento || s.id,
            tipo: s.tipoTramite,
            titulo: s.titulo || s.tituloDocumento || s.tipoTramite,
            unidadOrigen: s.usuarioSolicitante?.unidad || 'Secretaría Municipal',
            fechaAsignacion: new Date(s.createdAt).toLocaleString('es-CL'),
            estado:
              s.estadoAprobacion === 'FIRMADA'
                ? 'FIRMADO'
                : s.estadoAprobacion === 'EN_VISACION'
                  ? 'EN_REVISION'
                  : 'PENDIENTE',
            prioridad: (s.prioridad as any) || 'NORMAL',
            hashSha256: s.hashSha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            firmaInfo:
              s.estadoAprobacion === 'FIRMADA'
                ? {
                    firmadoPor: s.usuarioSolicitante?.nombre || usuario.nombre,
                    fechaFirma: new Date(s.tsaTimestamp || s.updatedAt).toLocaleString('es-CL'),
                    codigoVerificacion: s.codigoVerificacion || `VERIF-${s.codigoDocumento}`,
                  }
                : undefined,
          }));
          setDocumentos(mapeados);
          return;
        }
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    setPinToken(usuario.pinToken || '1234');
    cargarBandeja();
  }, [usuario.rut, usuario.pinToken]);

  const pendientes = documentos.filter((d) => d.estado === 'PENDIENTE').length;
  const enRevision = documentos.filter((d) => d.estado === 'EN_REVISION').length;
  const firmados = documentos.filter((d) => d.estado === 'FIRMADO').length;

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const seleccionarTodosPendientes = () => {
    const idsPendientes = documentos.filter((d) => d.estado !== 'FIRMADO').map((d) => d.id);
    if (seleccionados.length === idsPendientes.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(idsPendientes);
    }
  };

  const handleEjecutarFirma = async (doc: DocumentoFuncionario) => {
    setFirmando(true);
    setErrorPin(null);

    try {
      const res = await fetch(`/api/v1/firmas/solicitudes/${doc.id}/firmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rutFirmante: usuario.rut,
          pin: pinToken,
          accion: 'FIRMAR',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'PIN Criptográfico inválido');
      }

      const actualizada = await res.json();
      const updatedDoc: DocumentoFuncionario = {
        ...doc,
        estado: 'FIRMADO',
        hashSha256: actualizada.hashSha256 || doc.hashSha256,
        firmaInfo: {
          firmadoPor: usuario.nombre,
          fechaFirma: new Date().toLocaleString('es-CL'),
          codigoVerificacion: actualizada.codigoVerificacion || `VERIF-${doc.codigo}`,
        },
      };

      await cargarBandeja();
      setSeleccionados((prev) => prev.filter((id) => id !== doc.id));
      setFirmando(false);
      setDocumentoEnFirma(null);
      setFirmaExitosaModal(updatedDoc);
    } catch (err: any) {
      setErrorPin(err.message);
      setFirmando(false);
    }
  };

  const handleFirmarLoteSeleccionado = async () => {
    if (seleccionados.length === 0) return;
    setFirmando(true);

    try {
      await fetch('/api/v1/firmas/lotes/procesar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoLote: `LOTE-FUNC-${Date.now().toString().slice(-5)}`,
          solicitudIds: seleccionados,
          rutFirmante: usuario.rut,
        }),
      });
      await cargarBandeja();
    } finally {
      setSeleccionados([]);
      setFirmando(false);
    }
  };

  const documentosFiltrados = documentos.filter((d) => {
    const matchTexto =
      d.codigo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      d.titulo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      d.unidadOrigen.toLowerCase().includes(filtroTexto.toLowerCase());
    const matchEstado = filtroEstado === 'TODOS' || d.estado === filtroEstado;
    return matchTexto && matchEstado;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Bandeja de Documentos Asignados
          </h2>
          <p className="text-xs text-muted-foreground">
            Gestión y firma electrónica avanzada con validación de PIN eHSM ({usuario.nombre} • {usuario.cargo})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {seleccionados.length > 0 && (
            <Button
              onClick={handleFirmarLoteSeleccionado}
              disabled={firmando}
              className="text-xs font-bold h-9 shadow-sm flex items-center gap-1.5"
            >
              <span>Firmar Seleccionados ({seleccionados.length})</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Pendientes de Firma</span>
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">{pendientes}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Requieren tu firma digital</p>
        </Card>

        <Card className="border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Firmados Exitosamente</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {firmados}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Con estampilla y folio FEA</p>
        </Card>

        <Card className="border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>En Revisión / Visación</span>
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">{enRevision}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">En proceso por jefaturas</p>
        </Card>

        <Card className="border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Certificado Personal</span>
          </div>
          <div className="text-xs font-bold text-foreground mt-1 font-mono truncate">
            {tokenActivo ? `FEA ACTIVA • ${tokenActivo.marca || 'Token USB'}` : 'FEA DISPONIBLE'}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate font-mono">
            PIN Prueba: {usuario.pinToken || '1234'} (3 intentos máx)
          </p>
        </Card>
      </div>

      <Card className="border-border/80 bg-card">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="w-full md:w-80">
            <Input
              type="text"
              placeholder="Buscar por código, materia o unidad..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {['TODOS', 'PENDIENTE', 'EN_REVISION', 'FIRMADO'].map((st) => (
              <Button
                key={st}
                size="sm"
                variant={filtroEstado === st ? 'default' : 'outline'}
                onClick={() => setFiltroEstado(st)}
                className="text-xs h-8 px-2.5 font-mono"
              >
                {st === 'TODOS'
                  ? 'Todos'
                  : st === 'PENDIENTE'
                    ? 'Pendientes'
                    : st === 'EN_REVISION'
                      ? 'En Revisión'
                      : 'Firmados'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">Listado de Documentos Oficiales</CardTitle>
            <CardDescription className="text-xs">
              {documentosFiltrados.length} documento(s) encontrado(s) en PostgreSQL
            </CardDescription>
          </div>
          {pendientes > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={seleccionarTodosPendientes}
              className="text-xs h-8 font-mono"
            >
              {seleccionados.length > 0 ? 'Desmarcar todos' : 'Seleccionar pendientes'}
            </Button>
          )}
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 text-[11px]">
              <TableRow>
                <TableHead className="w-10 text-center">Sel.</TableHead>
                <TableHead className="w-36">Código / Folio</TableHead>
                <TableHead>Materia / Asunto</TableHead>
                <TableHead className="w-44">Unidad Origen</TableHead>
                <TableHead className="w-24">Prioridad</TableHead>
                <TableHead className="w-28 text-center">Estado</TableHead>
                <TableHead className="w-44 text-right">Acción / PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {documentosFiltrados.map((doc) => {
                const isChecked = seleccionados.includes(doc.id);
                const isFirmado = doc.estado === 'FIRMADO';

                return (
                  <TableRow key={doc.id} className="hover:bg-muted/30">
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        disabled={isFirmado}
                        checked={isChecked}
                        onChange={() => toggleSeleccion(doc.id)}
                        className="rounded border-input text-primary cursor-pointer disabled:opacity-30"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-[11px] font-semibold text-foreground">
                      {doc.codigo}
                      <div className="text-[10px] text-muted-foreground font-normal">
                        {doc.fechaAsignacion}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{doc.titulo}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate max-w-md">
                        SHA: {doc.hashSha256.substring(0, 24)}...
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">
                      {doc.unidadOrigen}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          doc.prioridad === 'URGENTE'
                            ? 'destructive'
                            : doc.prioridad === 'ALTA'
                              ? 'warning'
                              : 'outline'
                        }
                        className="text-[9px] font-mono"
                      >
                        {doc.prioridad}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          doc.estado === 'FIRMADO'
                            ? 'success'
                            : doc.estado === 'EN_REVISION'
                              ? 'secondary'
                              : 'outline'
                        }
                        className="text-[10px] font-mono"
                      >
                        {doc.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isFirmado ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            {doc.firmaInfo?.codigoVerificacion}
                          </span>
                          <a
                            href={`/api/v1/firmas/solicitudes/${doc.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-mono text-primary hover:underline font-bold"
                          >
                            Descargar PDF
                          </a>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setErrorPin(null);
                            setDocumentoEnFirma(doc);
                          }}
                          className="text-xs h-8 px-3 font-semibold"
                        >
                          Firmar con Token
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

      {/* Modal de Firma Individual con validación de PIN eHSM */}
      {documentoEnFirma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md border-border/80 shadow-2xl bg-card">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-[9px]">
                  FIRMA ELECTRÓNICA AVANZADA (PKCS#11)
                </Badge>
                <button
                  onClick={() => setDocumentoEnFirma(null)}
                  className="text-xs text-muted-foreground hover:text-foreground font-mono"
                >
                  [✕ CERRAR]
                </button>
              </div>
              <CardTitle className="text-base font-bold text-foreground mt-1">
                Firmar {documentoEnFirma.codigo}
              </CardTitle>
              <CardDescription className="text-xs">
                {documentoEnFirma.titulo}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              {errorPin && (
                <div className="p-3 rounded border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[11px]">
                  [ALERTA] {errorPin}
                </div>
              )}

              <div className="p-3 rounded-lg bg-muted/40 border space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">Firmante:</span>
                  <span className="font-semibold text-foreground">{usuario.nombre}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">RUT:</span>
                  <span className="font-mono">{usuario.rut}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">Dispositivo:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {tokenActivo
                      ? `${tokenActivo.marca || 'Token'} ${tokenActivo.modelo || ''} (${tokenActivo.serialNumber || 'Conectado'})`
                      : 'Token Criptográfico USB FIPS 140-2'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[11px] font-semibold text-foreground">
                    PIN de Acceso Token Criptográfico:
                  </label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    PIN de prueba: {usuario.pinToken || '1234'}
                  </span>
                </div>
                <Input
                  type="password"
                  value={pinToken}
                  onChange={(e) => setPinToken(e.target.value)}
                  placeholder="Ingresa tu PIN..."
                  className="text-xs h-9 font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Política de bloqueo FIPS: 3 intentos fallidos bloquean el Token (requiere PUK Admin).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDocumentoEnFirma(null)}
                  className="text-xs h-9"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={firmando}
                  onClick={() => handleEjecutarFirma(documentoEnFirma)}
                  className="text-xs font-bold h-9 px-4"
                >
                  {firmando ? 'Estampando firma...' : 'Confirmar y Estampar Firma'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {firmaExitosaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md border-emerald-500/40 shadow-2xl bg-card">
            <CardHeader className="p-5 pb-3 border-b bg-emerald-500/10">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <span>✓ DOCUMENTO FIRMADO EXITOSAMENTE</span>
                <span className="font-mono">{firmaExitosaModal.firmaInfo?.fechaFirma}</span>
              </div>
              <CardTitle className="text-base font-bold text-foreground mt-1">
                {firmaExitosaModal.codigo}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <p className="text-muted-foreground">
                El documento ha sido firmado con Firma Electrónica Avanzada (FEA) y sellado de tiempo RFC 3161.
              </p>
              <div className="p-3 bg-muted/30 rounded border font-mono text-[11px] space-y-1">
                <div>
                  Código Checksign:{' '}
                  <strong className="text-foreground">{firmaExitosaModal.firmaInfo?.codigoVerificacion}</strong>
                </div>
                <div>
                  Firmante: <span className="text-foreground">{firmaExitosaModal.firmaInfo?.firmadoPor}</span>
                </div>
                <div>
                  Normativa: <span className="text-foreground">Ley N° 19.799 y Ley N° 21.663</span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <a
                  href={`/api/v1/firmas/solicitudes/${firmaExitosaModal.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center rounded-md border border-primary bg-primary/10 text-primary font-bold h-9 text-xs"
                >
                  Descargar PDF Firmado
                </a>
                <Button
                  onClick={() => setFirmaExitosaModal(null)}
                  className="flex-1 text-xs font-bold h-9"
                >
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
export default MisDocumentosFuncionarioView;
