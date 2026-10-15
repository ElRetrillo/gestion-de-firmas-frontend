import React, { useState } from 'react';
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

  const [decretos, setDecretos] = useState<DecretoFePublica[]>([
    {
      id: 'DEC-01',
      numeroDecreto: 'Decreto Alcaldicio Exento N° 1.482',
      materia: 'Aprueba convenio de cooperación con Servicio de Salud Coquimbo para operativos rurales',
      unidadSolicitante: 'Dirección de Salud Municipal',
      alcaldeFirmante: 'Alcalde Titular de Coquimbo',
      fechaEmision: '15/10/2026 09:00',
      estadoFePublica: 'PENDIENTE_VISACION',
    },
    {
      id: 'DEC-02',
      numeroDecreto: 'Decreto Alcaldicio Exento N° 1.483',
      materia: 'Adjudicación de licitación pública ID 2489-12-LR26 para adquisición de luminarias solares',
      unidadSolicitante: 'SECPLAN / Alumbrado Público',
      alcaldeFirmante: 'Alcalde Titular de Coquimbo',
      fechaEmision: '15/10/2026 10:30',
      estadoFePublica: 'PENDIENTE_VISACION',
    },
    {
      id: 'DEC-03',
      numeroDecreto: 'Decreto Alcaldicio N° 1.480',
      materia: 'Promulgación de Ordenanza Comunal sobre Gestión Integral de Residuos Domiciliarios',
      unidadSolicitante: 'Dirección de Medio Ambiente (DIMAO)',
      alcaldeFirmante: 'Alcalde Titular de Coquimbo',
      fechaEmision: '14/10/2026 15:00',
      estadoFePublica: 'FE_PUBLICA_OTORGADA',
      codigoRegistroNotarial: 'REG-FE-SECMUN-8841-2026',
    },
  ]);

  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const darFePublica = (id: string) => {
    setProcesandoId(id);
    setTimeout(() => {
      setDecretos((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                estadoFePublica: 'FE_PUBLICA_OTORGADA',
                codigoRegistroNotarial: `REG-FE-SECMUN-${Math.floor(1000 + Math.random() * 9000)}-2026`,
              }
            : d
        )
      );
      setProcesandoId(null);
    }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Encabezado Exclusivo del Rol */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-bold">
              [ SECCIÓN EXCLUSIVA // MINISTRO DE FE MUNICIPAL ]
            </span>
            <Badge variant="outline" className="text-[9px] font-mono border-amber-500/50 text-amber-500">
              LEY N° 19.799 ART. 4
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Despacho de Decretos y Fe Pública
          </h2>
          <p className="text-xs text-muted-foreground">
            Entorno reservado para el Ministro de Fe ({usuario.nombre} • {usuario.cargo}) para toma de razón, atestación y certificación legal de actos administrativos.
          </p>
        </div>
      </div>

      {/* Tarjetas de Estadísticas Notariales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Decretos por Visar</span>
            <span className="text-amber-500 font-mono font-bold">FE PÚBLICA</span>
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {decretos.filter((d) => d.estadoFePublica === 'PENDIENTE_VISACION').length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Pendientes de certificación legal</p>
        </Card>

        <Card className="border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Actos Promulgados Hoy</span>
            <span className="text-emerald-500">✓</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {decretos.filter((d) => d.estadoFePublica === 'FE_PUBLICA_OTORGADA').length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Con estampilla y registro notarial</p>
        </Card>

        <Card className="border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Libro Notarial Correlativo</span>
            <span className="text-primary font-mono text-[10px]">AÑO 2026</span>
          </div>
          <div className="text-sm font-bold text-foreground mt-1 font-mono">
            LIBRO ELECTRÓNICO N° 14
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            Registro inalterable ANCI Ley 21.663
          </p>
        </Card>
      </div>

      {/* Tabla de Decretos para Toma de Razón */}
      <Card className="border-border/80 bg-card overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b bg-muted/20">
          <CardTitle className="text-sm font-bold">Actos Administrativos para Certificación Notarial</CardTitle>
          <CardDescription className="text-xs">
            Revisión de legalidad y estampillado de fe pública ministerial
          </CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 text-[11px]">
              <TableRow>
                <TableHead className="w-52">Decreto / Resolución</TableHead>
                <TableHead>Materia</TableHead>
                <TableHead className="w-44">Unidad Emisora</TableHead>
                <TableHead className="w-36 text-center">Estado</TableHead>
                <TableHead className="w-48 text-right">Acción Notarial</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {decretos.map((dec) => {
                const isOtorgado = dec.estadoFePublica === 'FE_PUBLICA_OTORGADA';

                return (
                  <TableRow key={dec.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-foreground">
                      {dec.numeroDecreto}
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {dec.fechaEmision}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-foreground">{dec.materia}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Firmado por: <strong>{dec.alcaldeFirmante}</strong>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">
                      {dec.unidadSolicitante}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={isOtorgado ? 'success' : 'warning'}
                        className="text-[10px] font-mono"
                      >
                        {isOtorgado ? 'FE PÚBLICA DADA' : 'PENDIENTE VISACIÓN'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isOtorgado ? (
                        <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          ✓ {dec.codigoRegistroNotarial}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          disabled={procesandoId === dec.id}
                          onClick={() => darFePublica(dec.id)}
                          className="text-xs h-8 px-3 font-semibold"
                        >
                          {procesandoId === dec.id ? 'Certificando...' : 'Dar Fe Pública ✒️'}
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
    </div>
  );
};
export default FePublicaDecretosView;
