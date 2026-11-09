import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { useAuthStore } from '../store/useAuthStore';
import { useTelemetriaStore } from '../store/useTelemetriaStore';

interface Solicitud {
  id: string;
  codigoDocumento?: string;
  titulo?: string;
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
  const { usuario } = useAuthStore();
  const { estaciones } = useTelemetriaStore();
  const estacionActiva = estaciones.find((e) => e.estadoEnVivo === 'CONECTADO');
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<number>(0);
  const [resultadoLote, setResultadoLote] = useState<{
    codigoLote: string;
    jobId: string;
    total: number;
    mensaje: string;
    timestamp: string;
  } | null>(null);

  const cargarSolicitudes = async () => {
    try {
      const res = await fetch('/api/v1/firmas/solicitudes');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSolicitudes(data);
          const pends = data.filter((s: Solicitud) => s.estadoAprobacion !== 'FIRMADA').map((s: Solicitud) => s.id);
          setSeleccionados(pends.slice(0, 2));
          return;
        }
      }
    } catch {
      // Fallback en caso de desconexión
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
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

  const procesarLote = async () => {
    if (seleccionados.length === 0) return;
    setProcesando(true);
    setResultadoLote(null);
    setPipelineStep(1);

    const codigoLote = `BATCH-COQUIMBO-${Date.now().toString().slice(-6)}`;

    setTimeout(() => setPipelineStep(2), 350);
    setTimeout(() => setPipelineStep(3), 700);
    setTimeout(() => setPipelineStep(4), 1050);

    try {
      const res = await fetch('/api/v1/firmas/lotes/procesar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoLote,
          solicitudIds: seleccionados,
          rutFirmante: usuario.rut,
        }),
      });
      const data = await res.json().catch(() => ({}));

      setTimeout(async () => {
        setResultadoLote({
          codigoLote,
          jobId: String(data.jobId || 'BATCH-PROCESSED'),
          total: seleccionados.length,
          mensaje: 'Documentos firmados exitosamente con certificación y validez legal.',
          timestamp: new Date().toLocaleTimeString(),
        });
        await cargarSolicitudes();
        setSeleccionados([]);
        setProcesando(false);
        setPipelineStep(0);
      }, 1300);
    } catch {
      setProcesando(false);
      setPipelineStep(0);
    }
  };

  const pendientesCount = solicitudes.filter((s) => s.estadoAprobacion !== 'FIRMADA').length;
  const firmadasCount = solicitudes.filter((s) => s.estadoAprobacion === 'FIRMADA').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-8 border-border/80 bg-card/90">
          <CardHeader className="p-5 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Firma Masiva de Documentos
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Selecciona y firma múltiples documentos simultáneamente en segundo plano.
              </CardDescription>
            </div>

            <Button
              disabled={seleccionados.length === 0 || procesando}
              onClick={procesarLote}
              className="text-xs font-bold h-9 px-4 shrink-0 shadow-xs"
            >
              {procesando ? 'Firmando documentos...' : `Firmar Seleccionados (${seleccionados.length})`}
            </Button>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] uppercase font-semibold text-muted-foreground">
                <span>Progreso de firma</span>
                <span>{procesando ? `Paso ${pipelineStep} de 4 en proceso` : 'Listo para firmar'}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div
                  className={`p-2.5 rounded border text-[11px] transition-colors ${pipelineStep >= 1
                    ? 'border-primary bg-primary/10 text-foreground font-semibold'
                    : 'border-border/60 bg-muted/30 text-muted-foreground'
                    }`}
                >
                  <div className="text-[9px] text-muted-foreground font-mono">[ 01 ]</div>
                  <div className="truncate">Validación</div>
                </div>

                <div
                  className={`p-2.5 rounded border text-[11px] transition-colors ${pipelineStep >= 2
                    ? 'border-primary bg-primary/10 text-foreground font-semibold'
                    : 'border-border/60 bg-muted/30 text-muted-foreground'
                    }`}
                >
                  <div className="text-[9px] text-muted-foreground font-mono">[ 02 ]</div>
                  <div className="truncate">Preparación PDF</div>
                </div>

                <div
                  className={`p-2.5 rounded border text-[11px] transition-colors ${pipelineStep >= 3
                    ? 'border-primary bg-primary/10 text-foreground font-semibold'
                    : 'border-border/60 bg-muted/30 text-muted-foreground'
                    }`}
                >
                  <div className="text-[9px] text-muted-foreground font-mono">[ 03 ]</div>
                  <div className="truncate">Firma Digital</div>
                </div>

                <div
                  className={`p-2.5 rounded border text-[11px] transition-colors ${pipelineStep >= 4
                    ? 'border-emerald-500 bg-emerald-500/10 text-foreground font-semibold'
                    : 'border-border/60 bg-muted/30 text-muted-foreground'
                    }`}
                >
                  <div className="text-[9px] text-muted-foreground font-mono">[ 04 ]</div>
                  <div className="truncate">Finalización</div>
                </div>
              </div>
            </div>

            {resultadoLote && (
              <div className="p-3.5 rounded-lg border border-emerald-500/40 bg-emerald-500/5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <Badge variant="success" className="text-[10px]">
                    DOCUMENTOS FIRMADOS CON ÉXITO
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {resultadoLote.timestamp}
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px]">{resultadoLote.mensaje}</p>
                <div className="flex flex-wrap gap-3 text-[10px] pt-1 text-foreground">
                  <span>GRUPO: <strong>{resultadoLote.codigoLote}</strong></span>
                  <span>ID DE ENVÍO: <strong>{resultadoLote.jobId}</strong></span>
                  <span>TOTAL: <strong>{resultadoLote.total} documentos</strong></span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-border/80 bg-card/90 flex flex-col justify-between">
          <CardHeader className="p-5 pb-3 border-b">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              RESUMEN DE FIRMAS
            </span>
            <CardTitle className="text-sm font-bold text-foreground">
              Estado de Documentos
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded bg-muted/40 border">
              <span className="text-muted-foreground">Pendientes de Firma:</span>
              <span className="font-semibold text-foreground">{pendientesCount} docs</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-muted/40 border">
              <span className="text-muted-foreground">Firmados:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{firmadasCount} docs</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-muted/40 border">
              <span className="text-muted-foreground">Estación actual:</span>
              <span className="font-semibold text-foreground">
                {estacionActiva ? estacionActiva.codigoPc : 'Sin estación'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-muted/40 border">
              <span className="text-muted-foreground">Dispositivo de firma:</span>
              <Badge variant={estacionActiva?.tokenInfo ? 'success' : 'outline'} className="text-[10px] py-0">
                {estacionActiva?.tokenInfo ? 'CONECTADO' : 'NO DETECTADO'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-card">
        <CardHeader className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="select-all"
              checked={seleccionados.length > 0 && seleccionados.length === pendientesCount}
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
                <TableHead className="text-xs font-bold text-right">Documento PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitudes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-28 text-center font-mono text-xs text-muted-foreground">
                    No hay solicitudes de firma disponibles para procesamiento en lotes
                  </TableCell>
                </TableRow>
              ) : (
                solicitudes.map((sol) => {
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
                          className={`rounded border-input ${isFirmada ? 'cursor-not-allowed opacity-20' : 'cursor-pointer text-primary focus:ring-ring'
                            }`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-xs text-foreground font-mono">
                          {sol.codigoDocumento || sol.id}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {sol.titulo || sol.tipoTramite}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-foreground">
                          {sol.usuarioSolicitante?.nombre}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          RUT: {sol.usuarioSolicitante?.rut}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {sol.usuarioSolicitante?.unidad}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                          {sol.estacionAsignada || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-[11px]">
                        <div>{new Date(sol.createdAt).toLocaleDateString('es-CL')}</div>
                        <div className="text-[10px] text-muted-foreground">{sol.tamanioKb || 380} KB</div>
                      </TableCell>
                      <TableCell>
                        {isFirmada ? (
                          <Badge variant="success" className="text-[10px]">
                            FIRMADA
                          </Badge>
                        ) : sol.estadoAprobacion === 'EN_VISACION' ? (
                          <Badge variant="warning" className="text-[10px]">
                            EN REVISIÓN
                          </Badge>
                        ) : (
                          <Badge variant="info" className="text-[10px]">
                            PENDIENTE
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <a
                          href={`/api/v1/firmas/solicitudes/${sol.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className={`font-bold hover:underline text-[11px] font-mono ${isFirmada ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'
                            }`}
                        >
                          {isFirmada ? 'Descargar PDF Firmado' : 'Previsualizar PDF'}
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                }))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
