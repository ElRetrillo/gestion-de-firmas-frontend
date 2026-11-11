import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
  MousePointerClick,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FirmaCoordenadas } from '../lib/pdfSignatureLayout';

// Configurar worker de pdf.js
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface VisorFirmaAdobeProps {
  pdfData: Uint8Array | ArrayBuffer | string; // Base64 o Uint8Array o ArrayBuffer
  nombreDocumento?: string;
  firmanteNombre?: string;
  firmanteRut?: string;
  tokenSerial?: string;
  onCoordenadasChange: (coords: FirmaCoordenadas) => void;
  coordenadasIniciales?: FirmaCoordenadas | null;
}

export const VisorFirmaAdobe: React.FC<VisorFirmaAdobeProps> = ({
  pdfData,
  nombreDocumento = 'Documento.pdf',
  firmanteNombre = 'Funcionario Municipal',
  firmanteRut = '11.111.111-1',
  tokenSerial = 'SafeNet eToken 5110',
  onCoordenadasChange,
  coordenadasIniciales,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [zoom, setZoom] = useState(1.15);
  const [cargandoPdf, setCargandoPdf] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Dimensiones del canvas en pantalla y dimensiones originales del PDF
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 595, height: 842 });
  const [viewportOriginal, setViewportOriginal] = useState({ width: 595, height: 842 });

  // Posición del recuadro de firma (en píxeles relativos al canvas visible)
  const [cajaFirma, setCajaFirma] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    pagina: number;
  } | null>(null);

  const [arrastrando, setArrastrando] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 1. Cargar el PDF
  useEffect(() => {
    let activo = true;
    setCargandoPdf(true);
    setErrorCarga(null);

    const cargar = async () => {
      try {
        let fuente: any;
        if (typeof pdfData === 'string') {
          // Si es base64 limpio o data URL
          const cleanB64 = pdfData.replace(/^data:[^;]+;base64,/, '').trim();
          const binary = atob(cleanB64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          fuente = { data: bytes };
        } else if (pdfData instanceof Uint8Array) {
          fuente = { data: pdfData };
        } else {
          fuente = { data: new Uint8Array(pdfData) };
        }

        const loadingTask = pdfjsLib.getDocument(fuente);
        const doc = await loadingTask.promise;
        if (!activo) return;

        setPdfDoc(doc);
        setTotalPaginas(doc.numPages);
        setPaginaActual(1);
        setCargandoPdf(false);
      } catch (err: any) {
        if (!activo) return;
        setErrorCarga('No se pudo visualizar el PDF. Es posible que esté cifrado o dañado.');
        setCargandoPdf(false);
      }
    };

    cargar();
    return () => {
      activo = false;
    };
  }, [pdfData]);

  // 2. Renderizar página actual en el Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelado = false;

    const renderPagina = async () => {
      try {
        const page = await pdfDoc.getPage(paginaActual);
        if (cancelado) return;

        // Viewport sin escalar (puntos PDF estándar 72dpi)
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        setViewportOriginal({
          width: unscaledViewport.width,
          height: unscaledViewport.height,
        });

        // Viewport escalado para el canvas en pantalla
        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setCanvasDimensions({ width: viewport.width, height: viewport.height });

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Si no hay caja de firma colocada o si está en esta página, ubicar por defecto abajo a la derecha
        setCajaFirma((prev) => {
          if (!prev) {
            // Tamaño estándar de estampilla estilo Adobe (aprox 220x65 px escalado)
            const boxW = Math.min(220 * (zoom / 1.0), viewport.width * 0.45);
            const boxH = Math.min(65 * (zoom / 1.0), viewport.height * 0.15);
            const defaultX = viewport.width - boxW - 35;
            const defaultY = viewport.height - boxH - 45;

            return {
              x: Math.max(10, defaultX),
              y: Math.max(10, defaultY),
              width: boxW,
              height: boxH,
              pagina: paginaActual,
            };
          }
          return prev;
        });
      } catch (err) {
        // Ignorar si fue cancelado
      }
    };

    renderPagina();
    return () => {
      cancelado = true;
    };
  }, [pdfDoc, paginaActual, zoom]);

  // 3. Notificar cambios de coordenadas al componente padre en coordenadas PDF estándar (llx, lly, urx, ury)
  useEffect(() => {
    if (!cajaFirma || canvasDimensions.width === 0 || viewportOriginal.width === 0) return;

    // Relación de escala entre el canvas visible y los puntos originales del PDF
    const scaleX = viewportOriginal.width / canvasDimensions.width;
    const scaleY = viewportOriginal.height / canvasDimensions.height;

    // En Canvas el origen (0,0) es Arriba-Izquierda.
    // En PDF (PostScript) el origen (0,0) es Abajo-Izquierda.
    const pdfX = cajaFirma.x * scaleX;
    const pdfWidth = cajaFirma.width * scaleX;
    const pdfHeight = cajaFirma.height * scaleY;

    // Coordenada Y en PDF se mide desde abajo:
    // lly = alturaPDF - (canvasY + canvasHeight) * scaleY
    const pdfLly = viewportOriginal.height - (cajaFirma.y + cajaFirma.height) * scaleY;
    const pdfUry = pdfLly + pdfHeight;

    const coords: FirmaCoordenadas = {
      pagina: cajaFirma.pagina,
      totalPaginas,
      llx: Math.max(10, pdfX),
      lly: Math.max(10, pdfLly),
      urx: Math.min(viewportOriginal.width - 10, pdfX + pdfWidth),
      ury: Math.min(viewportOriginal.height - 10, pdfUry),
      widthPt: pdfWidth,
      heightPt: pdfHeight,
      pageWidthPt: viewportOriginal.width,
      pageHeightPt: viewportOriginal.height,
    };

    onCoordenadasChange(coords);
  }, [cajaFirma, canvasDimensions, viewportOriginal, totalPaginas, onCoordenadasChange]);

  // Manejador para hacer clic en el documento y mover la firma allí (comportamiento Adobe)
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (arrastrando) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    setCajaFirma((prev) => {
      const boxW = prev ? prev.width : 220 * (zoom / 1.0);
      const boxH = prev ? prev.height : 65 * (zoom / 1.0);

      // Centrar la caja donde el usuario hizo clic
      const nuevaX = Math.max(5, Math.min(canvasDimensions.width - boxW - 5, clickX - boxW / 2));
      const nuevaY = Math.max(5, Math.min(canvasDimensions.height - boxH - 5, clickY - boxH / 2));

      return {
        x: nuevaX,
        y: nuevaY,
        width: boxW,
        height: boxH,
        pagina: paginaActual,
      };
    });
  };

  // Manejo de Arrastre (Drag & Drop) de la firma
  const handleMouseDownCaja = (e: React.MouseEvent) => {
    e.stopPropagation();
    setArrastrando(true);
    if (!cajaFirma) return;
    setDragOffset({
      x: e.clientX - cajaFirma.x,
      y: e.clientY - cajaFirma.y,
    });
  };

  const handleMouseMoveContenedor = useCallback(
    (e: React.MouseEvent) => {
      if (!arrastrando || !cajaFirma || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;

      const nuevaX = Math.max(
        5,
        Math.min(canvasDimensions.width - cajaFirma.width - 5, relativeX - dragOffset.x),
      );
      const nuevaY = Math.max(
        5,
        Math.min(canvasDimensions.height - cajaFirma.height - 5, relativeY - dragOffset.y),
      );

      setCajaFirma((prev) => (prev ? { ...prev, x: nuevaX, y: nuevaY, pagina: paginaActual } : null));
    },
    [arrastrando, cajaFirma, canvasDimensions, dragOffset, paginaActual],
  );

  const handleMouseUp = () => {
    setArrastrando(false);
  };

  // Ubicaciones rápidas estilo Adobe
  const handleMoverAPosicionRapida = (pos: 'ABAJO_DERECHA' | 'ABAJO_IZQUIERDA' | 'CENTRO') => {
    if (!cajaFirma) return;
    let x = 30;
    let y = canvasDimensions.height - cajaFirma.height - 45;

    if (pos === 'ABAJO_DERECHA') {
      x = canvasDimensions.width - cajaFirma.width - 35;
    } else if (pos === 'CENTRO') {
      x = (canvasDimensions.width - cajaFirma.width) / 2;
      y = (canvasDimensions.height - cajaFirma.height) / 2;
    }

    setCajaFirma({
      ...cajaFirma,
      x: Math.max(10, x),
      y: Math.max(10, y),
      pagina: paginaActual,
    });
  };

  return (
    <div
      className="flex flex-col w-full border border-border/80 rounded-2xl bg-card shadow-lg overflow-hidden select-none"
      onMouseMove={handleMouseMoveContenedor}
      onMouseUp={handleMouseUp}
    >
      {/* Barra superior estilo Adobe Acrobat / Reader */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-muted/40 border-b border-border/70 text-xs">
        {/* Nombre y Estado */}
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="font-mono text-[10px] bg-primary/5 text-primary border-primary/30">
            Adobe Style Sign
          </Badge>
          <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs text-[11px]">
            {nombreDocumento}
          </span>
        </div>

        {/* Controles de Navegación de Páginas */}
        <div className="flex items-center gap-1.5 bg-background border rounded-lg px-2 py-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={paginaActual <= 1}
            onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
            className="h-6 w-6 p-0"
            title="Página Anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[11px] font-mono px-1">
            Pág. <strong className="text-foreground">{paginaActual}</strong> / {totalPaginas}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={paginaActual >= totalPaginas}
            onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
            className="h-6 w-6 p-0"
            title="Página Siguiente"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Controles de Zoom */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.15).toFixed(2))))}
            className="h-7 px-2 text-[10px]"
            title="Alejar"
          >
            <ZoomOut className="w-3 h-3 mr-1" />
            <span>-</span>
          </Button>
          <span className="font-mono text-[10px] w-12 text-center text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
            className="h-7 px-2 text-[10px]"
            title="Acercar"
          >
            <ZoomIn className="w-3 h-3 mr-1" />
            <span>+</span>
          </Button>
        </div>
      </div>

      {/* Sub-barra de ayuda / Instrucción visual estilo Adobe */}
      <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-primary font-medium text-[11px]">
          <MousePointerClick className="w-4 h-4 animate-bounce shrink-0" />
          <span>
            <strong>Haz clic o arrastra</strong> el recuadro rojo de la firma hacia donde deseas estamparla en el documento.
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground hidden sm:inline">Ubicación rápida:</span>
          <button
            type="button"
            onClick={() => handleMoverAPosicionRapida('ABAJO_DERECHA')}
            className="px-2 py-0.5 rounded bg-background hover:bg-muted text-[10px] font-semibold border"
          >
            Abajo Derecha
          </button>
          <button
            type="button"
            onClick={() => handleMoverAPosicionRapida('ABAJO_IZQUIERDA')}
            className="px-2 py-0.5 rounded bg-background hover:bg-muted text-[10px] font-semibold border"
          >
            Abajo Izquierda
          </button>
        </div>
      </div>

      {/* Área del Visor de Documento y Lienzo Canvas */}
      <div className="relative w-full h-[540px] sm:h-[620px] bg-slate-900/10 dark:bg-slate-950/40 overflow-auto flex justify-center p-4">
        {cargandoPdf && (
          <div className="flex flex-col items-center justify-center space-y-2 my-auto">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-muted-foreground">Cargando páginas del PDF...</span>
          </div>
        )}

        {errorCarga && (
          <div className="my-auto p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-xs max-w-sm text-center">
            {errorCarga}
          </div>
        )}

        {/* Contenedor del Canvas y Capa interactiva de Firma */}
        <div
          ref={containerRef}
          onClick={handleCanvasClick}
          className={`relative shadow-2xl bg-white border border-slate-300 dark:border-slate-800 transition-shadow ${
            cargandoPdf ? 'hidden' : 'block cursor-crosshair'
          }`}
          style={{
            width: canvasDimensions.width,
            height: canvasDimensions.height,
          }}
        >
          {/* Canvas donde pdf.js dibuja el PDF */}
          <canvas ref={canvasRef} className="block pointer-events-none" />

          {/* Recuadro de Firma Electrónica Estilo Adobe Signer */}
          {cajaFirma && cajaFirma.pagina === paginaActual && (
            <div
              onMouseDown={handleMouseDownCaja}
              className={`absolute border-2 border-dashed border-rose-500 bg-rose-500/15 backdrop-blur-[2px] rounded-md shadow-lg flex flex-col justify-between p-1.5 transition-all cursor-move group select-none ${
                arrastrando ? 'ring-4 ring-rose-500/30 scale-102 opacity-95' : 'hover:border-rose-600'
              }`}
              style={{
                left: cajaFirma.x,
                top: cajaFirma.y,
                width: cajaFirma.width,
                height: cajaFirma.height,
                zIndex: 20,
              }}
            >
              {/* Encabezado del Sello */}
              <div className="flex items-center justify-between border-b border-rose-500/40 pb-0.5">
                <span className="text-[9px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1 font-mono uppercase tracking-tight">
                  <Sparkles className="w-2.5 h-2.5 text-rose-600" />
                  Sello Firma Electrónica
                </span>
                <span className="text-[8px] bg-rose-600 text-white px-1 py-0.2 rounded font-mono font-bold">
                  Pág {cajaFirma.pagina}
                </span>
              </div>

              {/* Contenido Visual Simulado de la Firma (Estilo Adobe / FirmaGob) */}
              <div className="flex flex-col text-[8.5px] leading-tight text-slate-800 dark:text-slate-100 font-sans mt-0.5">
                <span className="font-bold truncate text-rose-950 dark:text-rose-100">
                  {firmanteNombre}
                </span>
                <span className="text-[7.5px] font-mono text-muted-foreground truncate">
                  RUT: {firmanteRut} • FEA Token USB
                </span>
                <span className="text-[7px] text-emerald-700 dark:text-emerald-400 font-mono truncate">
                  {tokenSerial}
                </span>
              </div>

              {/* Pie con indicador de arrastre */}
              <div className="flex items-center justify-between text-[7.5px] text-muted-foreground pt-0.5 border-t border-rose-500/20">
                <span className="font-mono text-rose-600 font-semibold">Ley N° 19.799</span>
                <span className="italic text-[7px] text-muted-foreground group-hover:text-rose-600">
                  Arrastrar para reubicar
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barra Inferior con Coordenadas Técnicas y Estado */}
      <div className="px-4 py-2 bg-muted/20 border-t border-border/70 flex flex-wrap items-center justify-between text-[11px] font-mono text-muted-foreground">
        <div>
          Posición elegida:{' '}
          <span className="text-foreground font-bold">
            Página {cajaFirma?.pagina || paginaActual} de {totalPaginas}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>Estándar: <strong>ISO 32000 (PAdES)</strong></span>
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            Listo para autorizar con Token
          </span>
        </div>
      </div>
    </div>
  );
};
