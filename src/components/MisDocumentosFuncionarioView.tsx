import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Input } from './ui/input';
import { useAuthStore } from '../store/useAuthStore';

interface DocumentoFuncionario {
  id: string;
  codigo: string;
  tipo: 'DECRETO_ALCALDICIO' | 'MEMORANDUM' | 'CONTRATO_HONORARIOS' | 'OFICIO_ORDINARIO';
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

  const [documentos, setDocumentos] = useState<DocumentoFuncionario[]>([
    {
      id: 'DOC-2026-01',
      codigo: 'DEC-ALC-2026-942',
      tipo: 'DECRETO_ALCALDICIO',
      titulo: 'Aprobación de fondos de subvención cultural comunal para verano 2026',
      unidadOrigen: 'Dirección de Desarrollo Comunitario (DIDECO)',
      fechaAsignacion: '15/10/2026 09:30',
      estado: 'PENDIENTE',
      prioridad: 'URGENTE',
      hashSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
    {
      id: 'DOC-2026-02',
      codigo: 'MEMO-DAF-2026-184',
      tipo: 'MEMORANDUM',
      titulo: 'Informe presupuestario y visación de gastos operacionales de mantención vial',
      unidadOrigen: 'Dirección de Administración y Finanzas (DAF)',
      fechaAsignacion: '15/10/2026 10:15',
      estado: 'PENDIENTE',
      prioridad: 'ALTA',
      hashSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    },
    {
      id: 'DOC-2026-03',
      codigo: 'CON-HON-2026-077',
      tipo: 'CONTRATO_HONORARIOS',
      titulo: 'Contratación a honorarios profesional informático para soporte técnico de redes',
      unidadOrigen: 'Departamento de TICs',
      fechaAsignacion: '14/10/2026 16:45',
      estado: 'EN_REVISION',
      prioridad: 'NORMAL',
      hashSha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    },
    {
      id: 'DOC-2026-04',
      codigo: 'OF-ORD-2026-312',
      tipo: 'OFICIO_ORDINARIO',
      titulo: 'Oficio respuesta a requerimiento de Contraloría Regional sobre obras civiles',
      unidadOrigen: 'Secretaría Comunal de Planificación (SECPLAN)',
      fechaAsignacion: '14/10/2026 11:20',
      estado: 'FIRMADO',
      prioridad: 'ALTA',
      hashSha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      firmaInfo: {
        firmadoPor: usuario.nombre,
        fechaFirma: '14/10/2026 15:40',
        codigoVerificacion: 'FEA-CQBO-7719-2026',
      },
    },
    {
      id: 'DOC-2026-05',
      codigo: 'DEC-EX-2026-551',
      tipo: 'DECRETO_ALCALDICIO',
      titulo: 'Otorgamiento de patente municipal provisoria para local comercial sector Peñuelas',
      unidadOrigen: 'Dirección de Rentas y Patentes',
      fechaAsignacion: '15/10/2026 08:10',
      estado: 'PENDIENTE',
      prioridad: 'NORMAL',
      hashSha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    },
  ]);

  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [documentoEnFirma, setDocumentoEnFirma] = useState<DocumentoFuncionario | null>(null);
  const [firmando, setFirmando] = useState(false);
  const [pinToken, setPinToken] = useState('1234');
  const [firmaExitosaModal, setFirmaExitosaModal] = useState<DocumentoFuncionario | null>(null);

  // Estadísticas del funcionario
  const total = documentos.length;
  const pendientes = documentos.filter((d) => d.estado === 'PENDIENTE').length;
  const enRevision = documentos.filter((d) => d.estado === 'EN_REVISION').length;
  const firmados = documentos.filter((d) => d.estado === 'FIRMADO').length;

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const seleccionarTodosPendientes = () => {
    const idsPendientes = documentos.filter((d) => d.estado === 'PENDIENTE').map((d) => d.id);
    if (seleccionados.length === idsPendientes.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(idsPendientes);
    }
  };

  const handleEjecutarFirma = (doc: DocumentoFuncionario) => {
    setFirmando(true);
    setTimeout(() => {
      const fechaNow = new Date().toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const updated = {
        ...doc,
        estado: 'FIRMADO' as const,
        firmaInfo: {
          firmadoPor: usuario.nombre,
          fechaFirma: fechaNow,
          codigoVerificacion: `FEA-CQBO-${Math.floor(1000 + Math.random() * 9000)}-2026`,
        },
      };

      setDocumentos((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));
      setSeleccionados((prev) => prev.filter((id) => id !== doc.id));
      setFirmando(false);
      setDocumentoEnFirma(null);
      setFirmaExitosaModal(updated);
    }, 700);
  };

  const handleFirmarLoteSeleccionado = () => {
    if (seleccionados.length === 0) return;
    setFirmando(true);
    setTimeout(() => {
      const fechaNow = new Date().toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      setDocumentos((prev) =>
        prev.map((d) => {
          if (seleccionados.includes(d.id)) {
            return {
              ...d,
              estado: 'FIRMADO' as const,
              firmaInfo: {
                firmadoPor: usuario.nombre,
                fechaFirma: fechaNow,
                codigoVerificacion: `FEA-LOTE-${Math.floor(1000 + Math.random() * 9000)}-2026`,
              },
            };
          }
          return d;
        })
      );
      setSeleccionados([]);
      setFirmando(false);
    }, 900);
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
      {/* 1. Header de Vista Funcionario */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Bandeja de Documentos Asignados
          </h2>
          <p className="text-xs text-muted-foreground">
            Gestión y firma de actos administrativos asignados a tu cuenta ({usuario.nombre} • {usuario.cargo})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {seleccionados.length > 0 && (
            <Button
              onClick={handleFirmarLoteSeleccionado}
              disabled={firmando}
              className="text-xs font-bold h-9 shadow-sm flex items-center gap-1.5"
            >
              <span> Firmar Seleccionados ({seleccionados.length})</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Tarjetas de Resumen de Trabajo del Funcionario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Pendientes de Firma</span>
            <span className="text-amber-500"></span>
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">{pendientes}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Requieren tu firma digital</p>
        </Card>

        <Card className="border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Firmados Exitosamente</span>
            <span className="text-emerald-500"></span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {firmados}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Con estampilla y folio FEA</p>
        </Card>

        <Card className="border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>En Revisión / Visación</span>
            <span className="text-blue-500"></span>
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">{enRevision}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">En proceso por jefaturas</p>
        </Card>

        <Card className="border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Certificado Personal</span>
          </div>
          <div className="text-xs font-bold text-foreground mt-1 font-mono truncate">
            FEA ACTIVA • SafeNet
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate font-mono">
            Vigencia: Octubre 2027
          </p>
        </Card>
      </div>

      {/* 3. Filtros y Búsqueda */}
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
                {st === 'TODOS' ? 'Todos' : st === 'PENDIENTE' ? 'Pendientes' : st === 'EN_REVISION' ? 'En Revisión' : 'Firmados'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Tabla de Documentos del Funcionario */}
      <Card className="border-border/80 bg-card overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">Listado de Documentos Oficiales</CardTitle>
            <CardDescription className="text-xs">
              {documentosFiltrados.length} documento(s) encontrado(s) en tu bandeja
            </CardDescription>
          </div>
          {pendientes > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={seleccionarTodosPendientes}
              className="text-xs h-8 font-mono"
            >
              {seleccionados.length === pendientes ? 'Desmarcar todos' : 'Seleccionar pendientes'}
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
                <TableHead className="w-36 text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {documentosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No se encontraron documentos con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                documentosFiltrados.map((doc) => {
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
                          SHA: {doc.hashSha256.substring(0, 20)}...
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
                          <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            {doc.firmaInfo?.codigoVerificacion}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => setDocumentoEnFirma(doc)}
                            className="text-xs h-8 px-3 font-semibold"
                          >
                            Firmar
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

      {/* Modal de Firma Individual */}
      {documentoEnFirma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md border-border/80 shadow-2xl bg-card">
            <CardHeader className="p-5 pb-3 border-b">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-[9px]">
                  FIRMA ELECTRÓNICA AVANZADA (FEA)
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
                  <span className="text-muted-foreground">Cargo:</span>
                  <span>{usuario.cargo}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">Dispositivo:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    Token SafeNet eToken 5110 (Conectado)
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  PIN de Acceso Token Criptográfico:
                </label>
                <Input
                  type="password"
                  value={pinToken}
                  onChange={(e) => setPinToken(e.target.value)}
                  placeholder="Ingresa tu PIN..."
                  className="text-xs h-9 font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  La clave criptográfica nunca abandona el token de hardware (Ley N° 19.799).
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

      {/* Modal de Éxito de Firma */}
      {firmaExitosaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md border-emerald-500/40 shadow-2xl bg-card">
            <CardHeader className="p-5 pb-3 border-b bg-emerald-500/10">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <span> DOCUMENTO FIRMADO EXITOSAMENTE</span>
                <span className="font-mono">{firmaExitosaModal.firmaInfo?.fechaFirma}</span>
              </div>
              <CardTitle className="text-base font-bold text-foreground mt-1">
                {firmaExitosaModal.codigo}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <p className="text-muted-foreground">
                El documento ha sido firmado con Firma Electrónica Avanzada (FEA) y cuenta con plena validez jurídica.
              </p>
              <div className="p-3 bg-muted/30 rounded border font-mono text-[11px] space-y-1">
                <div>Código de Verificación: <strong className="text-foreground">{firmaExitosaModal.firmaInfo?.codigoVerificacion}</strong></div>
                <div>Firmante: <span className="text-foreground">{firmaExitosaModal.firmaInfo?.firmadoPor}</span></div>
                <div>Normativa: <span className="text-foreground">Ley N° 19.799 y Ley N° 21.663</span></div>
              </div>
              <Button
                onClick={() => setFirmaExitosaModal(null)}
                className="w-full text-xs font-bold h-9 mt-2"
              >
                Aceptar y Continuar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
export default MisDocumentosFuncionarioView;
