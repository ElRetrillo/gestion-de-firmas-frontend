import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { useAuthStore } from '../store/useAuthStore';

interface DecretoFePublica {
  id: string;
  numeroDecreto: string;
  materia: string;
  unidadSolicitante: string;
  alcaldeFirmante: string;
  fechaEmision: string;
  estadoFePublica: 'PENDIENTE_VISACION' | 'FE_PUBLICA_OTORGADA';
  codigoRegistroNotarial?: string;
}

export const FePublicaDecretosView: React.FC = () => {
  const { usuario } = useAuthStore();
  const [decretos, setDecretos] = useState<DecretoFePublica[]>([]);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const cargarDecretos = async () => {
    try {
      const res = await fetch('/api/v1/firmas/solicitudes?requiereFePublica=true');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setDecretos(
            data.map((d: any) => ({
              id: d.id,
              numeroDecreto: d.codigoDocumento || d.id,
              materia: d.titulo || d.tituloDocumento || d.tipoTramite,
              unidadSolicitante: d.usuarioSolicitante?.unidad || 'Secretaría Municipal',
              alcaldeFirmante: d.usuarioSolicitante?.nombre || 'Alcaldía de Coquimbo',
              fechaEmision: new Date(d.createdAt).toLocaleString('es-CL'),
              estadoFePublica:
                d.estadoFePublica === 'ATESTADO' ? 'FE_PUBLICA_OTORGADA' : 'PENDIENTE_VISACION',
              codigoRegistroNotarial: d.codigoRegistroNotarial,
            })),
          );
          return;
        }
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    cargarDecretos();
  }, []);

  const darFePublica = async (id: string) => {
    setProcesandoId(id);
    try {
      const res = await fetch(`/api/v1/firmas/solicitudes/${id}/fe-publica`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rutMinistro: usuario.rut,
          pin: usuario.pinToken || '',
        }),
      });
      if (res.ok) {
        await cargarDecretos();
      }
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-500">
              FE PÚBLICA
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Despacho de Decretos y Fe Pública
          </h2>
          <p className="text-xs text-muted-foreground">
            Bandeja para toma de razón, revisión y certificación oficial de Decretos Municipales.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Decretos por Visar</span>
            <span className="text-amber-500 font-semibold text-[10px]">POR REVISAR</span>
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {decretos.filter((d) => d.estadoFePublica === 'PENDIENTE_VISACION').length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Pendientes de certificación legal</p>
        </Card>

        <Card className="border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Actos Promulgados</span>
            <span className="text-emerald-500">✓</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {decretos.filter((d) => d.estadoFePublica === 'FE_PUBLICA_OTORGADA').length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Con firma y registro oficial</p>
        </Card>

        <Card className="border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Libro Oficial de Decretos</span>
            <span className="text-primary text-[10px] font-semibold">AÑO 2026</span>
          </div>
          <div className="text-sm font-bold text-foreground mt-1">
            LIBRO MUNICIPAL N° 14
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Registro oficial institucional
          </p>
        </Card>
      </div>

      <Card className="border-border/80 bg-card overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b bg-muted/20">
          <CardTitle className="text-sm font-bold">Actos Administrativos para Certificación</CardTitle>
          <CardDescription className="text-xs">
            Revisión y validación de fe pública ministerial para decretos municipales
          </CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 text-[11px]">
              <TableRow>
                <TableHead className="w-52">Decreto / Expediente</TableHead>
                <TableHead>Materia</TableHead>
                <TableHead className="w-44">Unidad Emisora</TableHead>
                <TableHead className="w-36 text-center">Estado</TableHead>
                <TableHead className="w-56 text-right">Acción / Documento PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {decretos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                    No hay decretos pendientes de fe pública en este momento
                  </TableCell>
                </TableRow>
              ) : (
                decretos.map((dec) => {
                const isOtorgado = dec.estadoFePublica === 'FE_PUBLICA_OTORGADA';

                return (
                  <TableRow key={dec.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-foreground font-mono">
                      {dec.numeroDecreto}
                      <div className="text-[10px] text-muted-foreground">
                        {dec.fechaEmision}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-foreground">{dec.materia}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Responsable: <strong>{dec.alcaldeFirmante}</strong>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">
                      {dec.unidadSolicitante}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={isOtorgado ? 'success' : 'warning'}
                        className="text-[10px]"
                      >
                        {isOtorgado ? 'FE PÚBLICA DADA' : 'PENDIENTE REVISIÓN'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isOtorgado ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            ✓ {dec.codigoRegistroNotarial}
                          </span>
                          <a
                            href={`/api/v1/firmas/solicitudes/${dec.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-mono text-primary hover:underline font-bold"
                          >
                            Descargar Decreto PDF
                          </a>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          disabled={procesandoId === dec.id}
                          onClick={() => darFePublica(dec.id)}
                          className="text-xs h-8 px-3 font-semibold"
                        >
                          {procesandoId === dec.id ? 'Certificando...' : 'Dar Fe Pública'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              }))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};
export default FePublicaDecretosView;
