import React, { useEffect, useState } from 'react';
import { FileCheck2, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { formatRutVisual } from '../lib/rut';

interface DocumentoFirmadoItem {
  id: string;
  codigoDocumento: string;
  codigoVerificacion?: string | null;
  titulo: string;
  tipoTramite: string;
  estadoAprobacion: string;
  tsaTimestamp?: string | null;
  updatedAt: string;
  usuarioSolicitante?: {
    nombre: string;
    rut: string;
    unidad: string;
  } | null;
}

interface RepositorioDocumentosViewProps {
  soloTitular?: boolean;
  rutTitular?: string;
}

export const RepositorioDocumentosView: React.FC<RepositorioDocumentosViewProps> = ({
  soloTitular = false,
  rutTitular,
}) => {
  const [documentos, setDocumentos] = useState<DocumentoFirmadoItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const accessToken = localStorage.getItem('access_token') || '';

  const cargarDocumentos = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams({ estado: 'FIRMADA' });
      if (soloTitular && rutTitular) {
        params.set('rut', rutTitular);
      }
      const res = await fetch(`/api/v1/firmas/solicitudes?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setDocumentos(data);
      }
    } catch {
      // Ignorar error de red
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDocumentos();
  }, []);

  const filtrados = documentos.filter((doc) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (
      (doc.titulo || '').toLowerCase().includes(q) ||
      (doc.codigoDocumento || '').toLowerCase().includes(q) ||
      (doc.codigoVerificacion || '').toLowerCase().includes(q) ||
      (doc.usuarioSolicitante?.nombre || '').toLowerCase().includes(q) ||
      (doc.usuarioSolicitante?.rut || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <Card className="border-border/80 bg-card">
        <CardHeader className="p-5 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-primary" />
              Repositorio de Documentos Firmados
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Respaldo institucional de documentos suscritos electrónicamente ({filtrados.length} registros).
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por título, código o firmante..."
              className="h-8 text-xs sm:w-64"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={cargarDocumentos}
              disabled={cargando}
              className="h-8 px-2.5 text-xs gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 text-[11px]">
              <TableRow>
                <TableHead className="min-w-[160px]">Código / Verificación</TableHead>
                <TableHead className="min-w-[200px]">Documento</TableHead>
                <TableHead className="min-w-[180px]">Firmante / RUT</TableHead>
                <TableHead className="min-w-[160px]">Unidad</TableHead>
                <TableHead className="min-w-[140px]">Fecha de Firma</TableHead>
                <TableHead className="text-right min-w-[190px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {cargando ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Cargando documentos firmados...
                  </TableCell>
                </TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No se encontraron documentos firmados en el repositorio.
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((doc) => {
                  const codigoRef = doc.codigoVerificacion || doc.codigoDocumento || doc.id;
                  const fecha = new Date(doc.tsaTimestamp || doc.updatedAt).toLocaleString('es-CL');
                  return (
                    <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="font-mono font-bold text-foreground">
                          {doc.codigoVerificacion || doc.codigoDocumento}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {doc.codigoDocumento}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">{doc.titulo}</div>
                        <Badge variant="outline" className="text-[9px] font-mono mt-0.5">
                          {doc.tipoTramite}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {doc.usuarioSolicitante?.nombre || 'Funcionario Municipal'}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {formatRutVisual(doc.usuarioSolicitante?.rut)}
                        </div>
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {doc.usuarioSolicitante?.unidad || 'I. Municipalidad de Coquimbo'}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {fecha}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {soloTitular ? (
                            <a
                              href={`/api/v1/firmas/repositorio/${encodeURIComponent(codigoRef)}/pdf?access_token=${encodeURIComponent(accessToken)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] font-bold"
                            >
                              <Download className="w-3 h-3" />
                              <span>Ver PDF</span>
                            </a>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                              Solo Titular
                            </Badge>
                          )}
                          <a
                            href={`/validar?codigo=${encodeURIComponent(codigoRef)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border hover:bg-muted text-[11px] font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Validar</span>
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
