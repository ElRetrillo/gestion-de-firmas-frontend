import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Separator } from './ui/separator';

interface Solicitud {
  id: string;
  tipoTramite: string;
  estadoAprobacion: string;
  documentoUrl: string;
  documentoFirmadoUrl?: string;
  createdAt: string;
  tamanioKb: number;
  estacionAsignada: string;
  usuarioSolicitante: {
    nombre: string;
    rut: string;
    unidad: string;
    cargo: string;
  };
}

export const FirmaLotesView: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([
    {
      id: 'SOL-1001',
      tipoTramite: 'DECRETO_ALCALDICIO',
      estadoAprobacion: 'PENDIENTE',
      documentoUrl: 'https://storage.coquimbo.cl/decretos/dec-1001.pdf',
      createdAt: '2026-10-15 08:30',
      tamanioKb: 412,
      estacionAsignada: 'PC-SECMUN-01',
      usuarioSolicitante: {
        nombre: 'Patricio Reyes Morales',
        rut: '12.894.120-3',
        unidad: 'Secretaría Municipal',
        cargo: 'Secretario Municipal',
      },
    },
    {
      id: 'SOL-1002',
      tipoTramite: 'CONTRATO_HONORARIOS',
      estadoAprobacion: 'EN_VISACION',
      documentoUrl: 'https://storage.coquimbo.cl/contratos/con-402.pdf',
      createdAt: '2026-10-15 09:15',
      tamanioKb: 284,
      estacionAsignada: 'PC-DAF-02',
      usuarioSolicitante: {
        nombre: 'Andrea Morales C.',
        rut: '16.541.228-9',
        unidad: 'Dirección de Adm. y Finanzas',
        cargo: 'Jefa de Personal',
      },
    },
    {
      id: 'SOL-1003',
      tipoTramite: 'LICENCIA_OBRAS',
      estadoAprobacion: 'PENDIENTE',
      documentoUrl: 'https://storage.coquimbo.cl/obras/permiso-88.pdf',
      createdAt: '2026-10-15 09:45',
      tamanioKb: 1045,
      estacionAsignada: 'PC-DOM-05',
      usuarioSolicitante: {
        nombre: 'Marcelo Gómez',
        rut: '14.112.980-5',
        unidad: 'Dirección de Obras Municipales',
        cargo: 'Director de Obras',
      },
    },
    {
      id: 'SOL-1004',
      tipoTramite: 'DECRETO_PAGO',
      estadoAprobacion: 'FIRMADA',
      documentoUrl: 'https://storage.coquimbo.cl/finanzas/pago-23.pdf',
      documentoFirmadoUrl: 'https://storage.coquimbo.cl/firmados/pago-23-signed.pdf',
      createdAt: '2026-10-14 17:20',
      tamanioKb: 198,
      estacionAsignada: 'PC-DAF-02',
      usuarioSolicitante: {
        nombre: 'Andrea Morales C.',
        rut: '16.541.228-9',
        unidad: 'Dirección de Adm. y Finanzas',
        cargo: 'Jefa de Personal',
      },
    },
    {
      id: 'SOL-1005',
      tipoTramite: 'ORDEN_COMPRA',
      estadoAprobacion: 'PENDIENTE',
      documentoUrl: 'https://storage.coquimbo.cl/adquisiciones/oc-771.pdf',
      createdAt: '2026-10-15 10:10',
      tamanioKb: 310,
      estacionAsignada: 'PC-ADQ-03',
      usuarioSolicitante: {
        nombre: 'Carolina Rojas V.',
        rut: '15.342.119-4',
        unidad: 'Departamento de Adquisiciones',
        cargo: 'Supervisora de Compras',
      },
    },
  ]);

  const [seleccionados, setSeleccionados] = useState<string[]>(['SOL-1001', 'SOL-1003']);
  const [procesando, setProcesando] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<number>(0);
  const [resultadoLote, setResultadoLote] = useState<{
    codigoLote: string;
    jobId: string;
    total: number;
    mensaje: string;
    timestamp: string;
  } | null>(null);

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const seleccionarTodos = () => {
    const pendientes = solicitudes
      .filter((s) => s.estadoAprobacion !== 'FIRMADA')
      .map((s) => s.id);
    if (seleccionados.length === pendientes.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(pendientes);
    }
  };

  const procesarLoteBullMQ = async () => {
    if (seleccionados.length === 0) return;
    setProcesando(true);
    setResultadoLote(null);
    setPipelineStep(1);

    const codigoLote = `BATCH-COQUIMBO-${Date.now().toString().slice(-6)}`;

    // Simular progreso de etapas del pipeline en tiempo real (estilo Zig.ai)
    setTimeout(() => setPipelineStep(2), 600);
    setTimeout(() => setPipelineStep(3), 1200);
    setTimeout(() => setPipelineStep(4), 1800);

    setTimeout(() => {
      setResultadoLote({
        codigoLote,
        jobId: `BULL-JOB-${Math.floor(1000 + Math.random() * 9000)}`,
        total: seleccionados.length,
        mensaje: 'Orquestación asíncrona completada con sellado RFC 3161 TSA y almacenamiento en MinIO S3.',
        timestamp: new Date().toLocaleTimeString(),
      });

      setSolicitudes((prev) =>
        prev.map((s) =>
          seleccionados.includes(s.id)
            ? { ...s, estadoAprobacion: 'FIRMADA', documentoFirmadoUrl: `${s.documentoUrl}-signed.pdf` }
            : s
        )
      );
      setSeleccionados([]);
      setProcesando(false);
      setPipelineStep(0);
    }, 2400);
  };

  const pendientesCount = solicitudes.filter((s) => s.estadoAprobacion !== 'FIRMADA').length;
  const firmadasCount = solicitudes.filter((s) => s.estadoAprobacion === 'FIRMADA').length;

  return (
    <div className="space-y-6">
      {/* 1. Bento Asimétrico: Pipeline BullMQ + Enrutador de Hardware */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Columna Izquierda (Span 8): Pipeline de Ejecución Asíncrona */}
        <Card className="lg:col-span-8 border-border/80 bg-card/90">
          <CardHeader className="p-5 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-[9px]">
                  [ BULLMQ // REDIS ENGINE ]
                </Badge>
                <Badge variant="secondary" className="font-mono text-[9px]">
                  CONCURRENCY: 4 WORKERS
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                Orquestador Masivo de Firma en Lotes
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Procesamiento paralelo sin bloqueo de interfaz. Despacha jobs a colas Redis con estampado TSA.
              </CardDescription>
            </div>

            <Button
              disabled={seleccionados.length === 0 || procesando}
              onClick={procesarLoteBullMQ}
              className="text-xs font-bold h-9 px-4 shrink-0 shadow-xs"
            >
              {procesando ? 'Encolando en BullMQ...' : `Despachar Lote (${seleccionados.length})`}
            </Button>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {/* Visualizador de Etapas del Pipeline Criptográfico (Estilo Zig.ai) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground">
                <span>ESTADO DEL PIPELINE CRIPTOGRÁFICO</span>
                <span>{procesando ? `ETAPA ${pipelineStep}/4 EN PROCESO` : 'LISTO PARA DESPACHO'}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div
                  className={`p-2.5 rounded border text-[11px] font-mono transition-colors ${
                    pipelineStep >= 1
                      ? 'border-primary bg-primary/10 text-foreground font-semibold'
                      : 'border-border/60 bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <div className="text-[9px] text-muted-foreground">[ 01 // INGESTA ]</div>
                  <div className="truncate">Cálculo SHA-256</div>
                </div>

                <div
                  className={`p-2.5 rounded border text-[11px] font-mono transition-colors ${
                    pipelineStep >= 2
                      ? 'border-primary bg-primary/10 text-foreground font-semibold'
                      : 'border-border/60 bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <div className="text-[9px] text-muted-foreground">[ 02 // HARDWARE ]</div>
                  <div className="truncate">Worker SafeNet</div>
                </div>

                <div
                  className={`p-2.5 rounded border text-[11px] font-mono transition-colors ${
                    pipelineStep >= 3
                      ? 'border-primary bg-primary/10 text-foreground font-semibold'
                      : 'border-border/60 bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <div className="text-[9px] text-muted-foreground">[ 03 // TSA RFC 3161 ]</div>
                  <div className="truncate">Timestamp CGR</div>
                </div>

                <div
                  className={`p-2.5 rounded border text-[11px] font-mono transition-colors ${
                    pipelineStep >= 4
                      ? 'border-emerald-500 bg-emerald-500/10 text-foreground font-semibold'
                      : 'border-border/60 bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <div className="text-[9px] text-muted-foreground">[ 04 // STORAGE ]</div>
                  <div className="truncate">MinIO S3 Commit</div>
                </div>
              </div>
            </div>

            {/* Resultado de Lote Reciente */}
            {resultadoLote && (
              <div className="p-3.5 rounded-lg border border-emerald-500/40 bg-emerald-500/5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <Badge variant="success" className="text-[10px] font-mono">
                    LOTE DESPACHADO CON ÉXITO
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {resultadoLote.timestamp}
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px]">{resultadoLote.mensaje}</p>
                <div className="flex flex-wrap gap-3 font-mono text-[10px] pt-1 text-foreground">
                  <span>LOTE: <strong>{resultadoLote.codigoLote}</strong></span>
                  <span>JOB ID: <strong>{resultadoLote.jobId}</strong></span>
                  <span>DOCUMENTOS: <strong>{resultadoLote.total}</strong></span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Columna Derecha (Span 4): Resumen de Capacidad & Hardware Routing */}
        <Card className="lg:col-span-4 border-border/80 bg-card/90 flex flex-col justify-between">
          <CardHeader className="p-5 pb-3 border-b">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              TELEMETRÍA DE COLAS
            </span>
            <CardTitle className="text-sm font-bold text-foreground">
              Capacidad de Cómputo
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded bg-muted/40 border">
              <span className="text-muted-foreground">Pendientes de Firma:</span>
              <span className="font-mono font-bold text-foreground">{pendientesCount} docs</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-muted/40 border">
              <span className="text-muted-foreground">Completados Hoy:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{firmadasCount} docs</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-muted/40 border">
              <span className="text-muted-foreground">Estación Asignada:</span>
              <span className="font-mono font-bold text-primary">PC-SECMUN-01</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-muted/40 border">
              <span className="text-muted-foreground">Estado Token USB:</span>
              <Badge variant="success" className="font-mono text-[9px] py-0">
                LISTO // 0x04B9
              </Badge>
            </div>
          </CardContent>

          <CardFooter className="p-4 border-t bg-muted/20 text-[10px] font-mono text-muted-foreground flex justify-between">
            <span>MEMORIA REDIS: 14.2 MB</span>
            <span>UPTIME: 99.98%</span>
          </CardFooter>
        </Card>
      </div>

      {/* 2. Tabla de Documentos Conforme a Shadcn UI */}
      <Card className="border-border/80 bg-card">
        <CardHeader className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="select-all"
              checked={
                seleccionados.length > 0 &&
                seleccionados.length === pendientesCount
              }
              onChange={seleccionarTodos}
              className="rounded border-input text-primary focus:ring-ring cursor-pointer"
            />
            <label htmlFor="select-all" className="text-xs font-bold text-foreground cursor-pointer">
              Seleccionar pendientes ({pendientesCount})
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-muted-foreground font-mono">
              {seleccionados.length} seleccionados de {solicitudes.length} totales
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-xs font-bold">Código / Trámite</TableHead>
                <TableHead className="text-xs font-bold">Solicitante</TableHead>
                <TableHead className="text-xs font-bold">Unidad Municipal</TableHead>
                <TableHead className="text-xs font-bold">Estación</TableHead>
                <TableHead className="text-xs font-bold">Fecha / Tamaño</TableHead>
                <TableHead className="text-xs font-bold">Estado</TableHead>
                <TableHead className="text-xs font-bold text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitudes.map((sol) => {
                const isFirmada = sol.estadoAprobacion === 'FIRMADA';
                const isChecked = seleccionados.includes(sol.id);

                return (
                  <TableRow
                    key={sol.id}
                    data-state={isChecked ? 'selected' : undefined}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        disabled={isFirmada}
                        checked={isChecked}
                        onChange={() => toggleSeleccion(sol.id)}
                        className={`rounded border-input ${
                          isFirmada ? 'cursor-not-allowed opacity-20' : 'cursor-pointer text-primary focus:ring-ring'
                        }`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-xs text-foreground font-mono">{sol.id}</div>
                      <div className="text-[11px] text-muted-foreground">{sol.tipoTramite}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">{sol.usuarioSolicitante.nombre}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        RUT: {sol.usuarioSolicitante.rut}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sol.usuarioSolicitante.unidad}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                        {sol.estacionAsignada}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-[11px]">
                      <div>{sol.createdAt}</div>
                      <div className="text-[10px] text-muted-foreground">{sol.tamanioKb} KB</div>
                    </TableCell>
                    <TableCell>
                      {isFirmada ? (
                        <Badge variant="success" className="text-[10px] font-mono">
                          FIRMADA (FEA)
                        </Badge>
                      ) : sol.estadoAprobacion === 'EN_VISACION' ? (
                        <Badge variant="warning" className="text-[10px] font-mono">
                          EN VISACIÓN
                        </Badge>
                      ) : (
                        <Badge variant="info" className="text-[10px] font-mono">
                          PENDIENTE
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isFirmada ? (
                        <a
                          href={sol.documentoFirmadoUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline text-[11px] font-mono"
                        >
                          PDF Firmado
                        </a>
                      ) : (
                        <a
                          href={sol.documentoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline text-[11px] font-mono"
                        >
                          Ver PDF
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
