import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import {
  useTelemetriaStore,
  MetricasTrazabilidadResponse,
  ModoReporteType,
} from '../store/useTelemetriaStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';

interface MetricasTrazabilidadPanelProps {
  vistaOrigen?: 'DISPOSITIVOS' | 'CUSTODIA' | 'AUDITORIA';
  compacto?: boolean;
  vistaCompleta?: boolean;
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const formatPct = (n: number): string => {
  const val = round2(n);
  return Number.isInteger(val) ? `${val}%` : `${Number(val.toFixed(2))}%`;
};

const formatearHorasMinutos = (totalMinutos?: number): string => {
  const mins = Math.max(0, Math.round(totalMinutos || 0));
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs} hrs ${String(remMins).padStart(2, '0')} mins`;
};

const computeNormalizedPercentages = (counts: number[]): number[] => {
  const cleanCounts = counts.map((c) => Math.max(0, Number(c) || 0));
  const total = cleanCounts.reduce((acc, c) => acc + c, 0);
  if (total <= 0) return cleanCounts.map(() => 0);

  // Asignar en centésimas (10000 = 100.00%) usando método del mayor resto para que la suma sea siempre 100.00% exacto
  const rawBasisPoints = cleanCounts.map((c) => (c / total) * 10000);
  const floored = rawBasisPoints.map((v) => Math.floor(v));
  let remainder = 10000 - floored.reduce((acc, v) => acc + v, 0);

  const order = rawBasisPoints
    .map((v, idx) => ({ idx, frac: v - floored[idx] }))
    .sort((a, b) => b.frac - a.frac);

  for (let i = 0; i < remainder; i++) {
    floored[order[i % order.length].idx] += 1;
  }

  return floored.map((bp) => round2(bp / 100));
};

const RingProgress: React.FC<{
  percentage: number;
  colorClass: string;
  size?: number;
  strokeWidth?: number;
}> = ({ percentage, colorClass, size = 76, strokeWidth = 7 }) => {
  const pct = round2(Math.max(0, Math.min(100, percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/60"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${colorClass} transition-all duration-500`}
        />
      </svg>
      <span className="absolute text-xs font-mono font-bold text-foreground">{formatPct(pct)}</span>
    </div>
  );
};

interface VerticalChartSlice {
  label: string;
  pct: number;
  count: number;
  barClass: string;
  textClass: string;
}

const VerticalSubChart: React.FC<{ slices: VerticalChartSlice[] }> = ({ slices }) => {
  return (
    <div className="pt-3 border-t border-border/60">
      <div
        className="grid gap-2 items-end"
        style={{ gridTemplateColumns: `repeat(${slices.length}, minmax(0, 1fr))` }}
      >
        {slices.map((s) => {
          const barHeight = Math.max(8, Math.round((Math.min(100, Math.max(0, s.pct)) / 100) * 44));
          return (
            <div
              key={s.label}
              className="flex flex-col items-center justify-end bg-muted/25 rounded-lg p-2 border border-border/40"
            >
              <span className={`text-[11px] font-mono font-bold ${s.textClass}`}>
                {formatPct(s.pct)}
              </span>
              <div className="h-12 w-full flex items-end justify-center my-1">
                <div
                  className={`w-6 rounded-t transition-all duration-500 ${s.barClass}`}
                  style={{ height: `${barHeight}px` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-foreground truncate max-w-full">
                {s.label}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">{s.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface ParsedLatexTable {
  headers: string[];
  rows: string[][];
}

interface ParsedLatexDoc {
  title: string;
  subtitle: string;
  author: string;
  date: string;
  sections: Array<{
    heading: string;
    notes: string[];
    tables: ParsedLatexTable[];
  }>;
}

const cleanLatexText = (raw: string): string => {
  return raw
    .replace(/\\textbf\{([^}]*)\}/g, '$1')
    .replace(/\\textit\{([^}]*)\}/g, '$1')
    .replace(/\\large\s*/g, '')
    .replace(/\\small\s*/g, '')
    .replace(/\\vspace\{[^}]*\}/g, '')
    .replace(/\\hline/g, '')
    .replace(/\\toprule|\\midrule|\\bottomrule/g, '')
    .replace(/\$\\le\$/g, '≤')
    .replace(/\\le/g, '≤')
    .replace(/\\%/g, '%')
    .replace(/\\&/g, '&')
    .replace(/\\\\/g, ' ')
    .replace(/[{}]/g, '')
    .trim();
};

const parseLatexDocument = (tex: string): ParsedLatexDoc => {
  const titleMatch = tex.match(/\\title\{([\s\S]*?)\}\s*\\author/);
  let title = 'Ilustre Municipalidad de Coquimbo';
  let subtitle = 'Summary Estadístico de Control y Seguimiento de Tokens de Firma Electrónica';
  if (titleMatch) {
    const parts = titleMatch[1].split('\\\\');
    if (parts[0]) title = cleanLatexText(parts[0]);
    if (parts[1]) subtitle = cleanLatexText(parts.slice(1).join(' '));
  }

  const authorMatch = tex.match(/\\author\{([^}]*)\}/);
  const dateMatch = tex.match(/\\date\{([^}]*)\}/);
  const author = authorMatch ? cleanLatexText(authorMatch[1]) : 'Departamento de Gestión de Sistemas y TICs';
  const date = dateMatch ? cleanLatexText(dateMatch[1]) : '';

  const bodyMatch = tex.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  const body = bodyMatch ? bodyMatch[1] : tex;

  const sectionSplits = body.split(/\\section\*?\{/);
  const sections: ParsedLatexDoc['sections'] = [];

  for (let i = 1; i < sectionSplits.length; i++) {
    const chunk = sectionSplits[i];
    const closeBraceIdx = chunk.indexOf('}');
    if (closeBraceIdx === -1) continue;
    const heading = cleanLatexText(chunk.slice(0, closeBraceIdx));
    const content = chunk.slice(closeBraceIdx + 1);

    const notes: string[] = [];
    const italicMatches = content.matchAll(/\\textit\{([^}]*)\}/g);
    for (const m of italicMatches) {
      const cleaned = cleanLatexText(m[1]);
      if (cleaned) notes.push(cleaned);
    }

    const tables: ParsedLatexTable[] = [];
    const tableMatches = content.matchAll(/\\begin\{tabular\}\{[^}]*\}([\s\S]*?)\\end\{tabular\}/g);
    for (const tm of tableMatches) {
      const rawRows = tm[1]
        .split('\\\\')
        .map((r) => r.replace(/\\hline|\\toprule|\\midrule|\\bottomrule/g, '').trim())
        .filter((r) => r.includes('&'));

      if (rawRows.length > 0) {
        const headers = rawRows[0].split('&').map((c) => cleanLatexText(c));
        const rows = rawRows.slice(1).map((r) => r.split('&').map((c) => cleanLatexText(c)));
        tables.push({ headers, rows });
      }
    }

    sections.push({ heading, notes, tables });
  }

  return { title, subtitle, author, date, sections };
};

const LatexPaperPreview: React.FC<{ tex: string }> = ({ tex }) => {
  const doc = parseLatexDocument(tex);
  return (
    <div className="bg-white text-zinc-900 rounded-lg border shadow-inner p-6 sm:p-8 overflow-y-auto max-h-[500px] font-serif">
      {/* Cabecera estilo artículo LaTeX (\maketitle) */}
      <div className="text-center border-b border-zinc-300 pb-4 mb-5 space-y-1">
        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          LaTeX2e Typeset Preview • article (11pt, a4paper)
        </div>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950">{doc.title}</h2>
        <p className="text-xs sm:text-sm text-zinc-800 font-medium">{doc.subtitle}</p>
        <p className="text-xs text-zinc-700 pt-1">{doc.author}</p>
        {doc.date && <p className="text-[11px] text-zinc-600 italic">{doc.date}</p>}
      </div>

      {/* Secciones y Tablas LaTeX */}
      <div className="space-y-6 text-xs">
        {doc.sections.map((sec, idx) => (
          <div key={idx} className="space-y-2.5">
            <h3 className="text-sm font-bold text-zinc-950 border-b border-zinc-200 pb-1">
              {sec.heading}
            </h3>
            {sec.notes.map((n, nIdx) => (
              <p key={nIdx} className="italic text-[11px] text-zinc-700 leading-relaxed">
                {n}
              </p>
            ))}
            {sec.tables.map((t, tIdx) => (
              <div key={tIdx} className="overflow-x-auto my-2">
                <table className="w-full border-collapse border-y-2 border-zinc-900 text-[11px]">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-100/80">
                      {t.headers.map((h, hIdx) => (
                        <th
                          key={hIdx}
                          className="py-1.5 px-2 text-left font-bold text-zinc-900 border-x border-zinc-300"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r, rIdx) => (
                      <tr key={rIdx} className="border-b border-zinc-300 hover:bg-zinc-50">
                        {r.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="py-1 px-2 text-zinc-800 border-x border-zinc-300"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-6 pt-3 border-t border-zinc-200 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
        <span>Compilación LaTeX en vivo — I. Municipalidad de Coquimbo</span>
        <span>Página 1 de 1</span>
      </div>
    </div>
  );
};

const generarLatexFallback = (m: MetricasTrazabilidadResponse | null, etiqueta: string): string => {
  const dispTotal = m?.resumenDispositivos?.totalExistentes ?? m?.telemetria?.tokensRegistrados ?? 0;
  const dispActivos = m?.resumenDispositivos?.activos ?? m?.telemetria?.tokensOperativos ?? 0;
  const dispExpirados =
    m?.resumenDispositivos?.expirados ??
    m?.telemetria?.tokensExpirados ??
    Math.max(0, dispTotal - dispActivos);
  const pctOperatividad = dispTotal > 0 ? round2((dispActivos / dispTotal) * 100) : 0;
  const firmasAsig = m?.firmasAsignadas?.totalAsignadas ?? dispTotal;
  const accionesPeriodo =
    m?.accionesFuncionarios?.totalAccionesFirmaPeriodo ?? m?.telemetria?.totalEventosPeriodo ?? 0;
  const conexionesPeriodo = m?.telemetria?.eventosConectado ?? 0;
  const desconexionesPeriodo = m?.telemetria?.eventosDesconectado ?? 0;
  const a15 = m?.alertasVencimiento?.menosDe15Dias ?? 0;
  const a30 = m?.alertasVencimiento?.entre16Y30Dias ?? 0;
  const a60 = m?.alertasVencimiento?.entre31Y60Dias ?? 0;
  const contTotal = m?.contratosResumen?.totalContratos ?? firmasAsig;

  const filasFunc = (m?.firmasAsignadas?.listado || [])
    .slice(0, 20)
    .map(
      (f) =>
        `${f.funcionario.nombre.replace(/[&_#%]/g, '')} & ${f.serialNumberToken} & ${f.fechaAsignacion || '-'} & ${f.fechaExpiracion || '-'} (${f.diasRestantes} d) & ${f.estado} & \\textbf{${f.accionesFirmaPeriodo}} \\\\ \\hline`,
    )
    .join('\n');

  return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[spanish]{babel}
\\usepackage{geometry}
\\usepackage{booktabs}
\\usepackage{longtable}
\\usepackage{xcolor}
\\geometry{margin=2cm}

\\title{\\textbf{Ilustre Municipalidad de Coquimbo}\\\\
\\large Summary Estadístico de Seguimiento y Telemetría de Tokens USB}
\\author{Departamento de Gestión de Sistemas y TICs}
\\date{Período Evaluado: ${etiqueta}}

\\begin{document}
\\maketitle

\\section*{1. Resumen Ejecutivo de Dispositivos, Operatividad y Caducidad}
\\begin{tabular}{|l|r|r|}
\\hline
\\textbf{Indicador de Seguimiento de Tokens} & \\textbf{Cantidad} & \\textbf{Detalle / Operatividad} \\\\ \\hline
Dispositivos Tokens Existentes (Total) & ${dispTotal} & 100\\% Inventario \\\\ \\hline
Dispositivos Activos (Operativos) & ${dispActivos} & ${pctOperatividad}\\% Operatividad \\\\ \\hline
Dispositivos Expirados / Caducados & ${dispExpirados} & Requieren renovación \\\\ \\hline
Firmas / Tokens Asignados a Funcionarios & ${firmasAsig} & Titulares identificados \\\\ \\hline
Eventos de Telemetría en Período & \\textbf{${accionesPeriodo}} & ${conexionesPeriodo} conex. / ${desconexionesPeriodo} desconex. \\\\ \\hline
Alertas Caducidad ($\\le$ 15 / 30 / 60 días) & ${a15} / ${a30} / ${a60} & Control de contratos \\\\ \\hline
Contratos / Custodias Registradas & ${contTotal} & 1 por titular asignado \\\\ \\hline
\\end{tabular}

\\section*{2. Desglose por Titular, Fecha de Asignación, Caducidad y Acciones}
\\textit{Nota metodológica: Cada acción contabilizada refleja los eventos físicos de conexión y desconexión USB reportados en tiempo real por el agente Ghost App.}

\\vspace{0.3cm}
\\begin{tabular}{|l|l|l|l|l|r|}
\\hline
\\textbf{Funcionario Titular} & \\textbf{ID Token} & \\textbf{Asignación} & \\textbf{Caducidad} & \\textbf{Estado} & \\textbf{Acciones} \\\\ \\hline
${filasFunc || 'Sin registros en el período & - & - & - & - & 0 \\\\ \\hline'}
\\end{tabular}

\\end{document}`;
};

export const MetricasTrazabilidadPanel: React.FC<MetricasTrazabilidadPanelProps> = ({
  compacto = false,
  vistaCompleta = false,
}) => {
  const {
    metricas,
    cargandoMetricas,
    modoReporte,
    mesSeleccionado,
    anioSeleccionado,
    cargarMetricas,
    setPeriodoReporte,
  } = useTelemetriaStore();

  const [tabTrazabilidad, setTabTrazabilidad] = useState<
    'VIGENCIA_FIRMAS' | 'SERIE_TEMPORAL' | 'VISOR_LATEX'
  >('VIGENCIA_FIRMAS');

  // Estado del Compilador y Visor LaTeX + Descarga PDF
  const [modalLatexOpen, setModalLatexOpen] = useState(false);
  const [codigoLatex, setCodigoLatex] = useState('');
  const [cargandoLatex, setCargandoLatex] = useState(false);
  const [compilandoPdf, setCompilandoPdf] = useState(false);
  const [compiledPdfBlobUrl, setCompiledPdfBlobUrl] = useState<string | null>(null);
  const [modoVisorDerecho, setModoVisorDerecho] = useState<'PAPER_LATEX' | 'PDF_NATIVO'>('PDF_NATIVO');
  const [copiadoLatex, setCopiadoLatex] = useState(false);
  const [vistaModal, setVistaModal] = useState<'SPLIT' | 'LATEX' | 'PDF'>('SPLIT');

  useEffect(() => {
    if (!metricas) {
      cargarMetricas();
    }
  }, [metricas, cargarMetricas]);

  const etiquetaPeriodo =
    metricas?.periodo?.etiquetaPeriodo ||
    (modoReporte === 'ULTIMOS_7_DIAS'
      ? 'Últimos 7 días'
      : modoReporte === 'ULTIMOS_15_DIAS'
        ? 'Últimos 15 días'
        : modoReporte === 'ULTIMOS_30_DIAS'
          ? 'Últimos 30 días'
          : modoReporte === 'ULTIMOS_60_DIAS'
            ? 'Últimos 60 días'
            : modoReporte === 'POR_MES'
              ? `Mes ${mesSeleccionado}`
              : `Año ${anioSeleccionado}`);

  useEffect(() => {
    if (metricas?.latexPreview?.codigoLatex) {
      setCodigoLatex(metricas.latexPreview.codigoLatex);
    } else if (metricas) {
      setCodigoLatex(generarLatexFallback(metricas, etiquetaPeriodo));
    }
  }, [metricas, etiquetaPeriodo]);

  const buildQueryParams = () => {
    const params = new URLSearchParams({ modo: modoReporte });
    if (modoReporte === 'POR_MES' && mesSeleccionado) {
      params.set('mes', mesSeleccionado);
    }
    if (modoReporte === 'POR_ANIO' && anioSeleccionado) {
      params.set('anio', anioSeleccionado);
    }
    return params.toString();
  };

  const handleCompilarLatexAPdf = async (texSource?: string) => {
    const sourceToCompile = texSource ?? codigoLatex;
    if (!sourceToCompile.trim()) return;
    setCompilandoPdf(true);
    try {
      const res = await fetch('/api/v1/telemetria/metricas/compile-latex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoLatex: sourceToCompile,
          modo: modoReporte,
          etiquetaPeriodo,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setCompiledPdfBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      }
    } catch {
      // Fallback a pdfInlineUrl o vista Paper LaTeX
    } finally {
      setCompilandoPdf(false);
    }
  };

  const abrirPrevisualizacionLatexPdf = async () => {
    setModalLatexOpen(true);
    setCargandoLatex(true);
    let texFinal =
      metricas?.latexPreview?.codigoLatex || generarLatexFallback(metricas, etiquetaPeriodo);
    try {
      const res = await fetch(`/api/v1/telemetria/metricas/latex?${buildQueryParams()}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.codigoLatex) {
          texFinal = data.codigoLatex;
        }
      }
    } catch {
      // Usa fallback
    }
    setCodigoLatex(texFinal);
    setCargandoLatex(false);
    handleCompilarLatexAPdf(texFinal);
  };

  const handleCopiarLatex = () => {
    navigator.clipboard.writeText(codigoLatex);
    setCopiadoLatex(true);
    setTimeout(() => setCopiadoLatex(false), 2500);
  };

  const handleDescargarTex = () => {
    const blob = new Blob([codigoLatex], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Summary-Control-Tokens-${modoReporte.toLowerCase()}.tex`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pdfInlineUrl = compiledPdfBlobUrl || `/api/v1/telemetria/metricas/pdf?${buildQueryParams()}`;
  const pdfDownloadUrl = `/api/v1/telemetria/metricas/pdf?${buildQueryParams()}&download=1`;

  const mesesDisponibles = metricas?.periodo?.mesesDisponibles || [];
  const aniosDisponibles = metricas?.periodo?.aniosDisponibles || [
    { valor: '2026', etiqueta: 'Año 2026' },
    { valor: '2025', etiqueta: 'Año 2025' },
    { valor: '2024', etiqueta: 'Año 2024' },
  ];

  const tel = metricas?.telemetria;
  const adm = metricas?.administracion;
  const serie = metricas?.serieTemporal || [];
  const maxFirmasDia = Math.max(1, ...serie.map((d) => d.firmasRealizadas || d.totalActividad || 1));

  // 1. Porcentaje de Dispositivos Activos vs Expirados (suma exacta 100%, máx 2 decimales)
  const totalExistentes =
    metricas?.resumenDispositivos?.totalExistentes ?? tel?.tokensRegistrados ?? 0;
  const activosCount =
    metricas?.resumenDispositivos?.activos ?? tel?.tokensOperativos ?? 0;
  const expiradosCount =
    metricas?.resumenDispositivos?.expirados ??
    tel?.tokensExpirados ??
    Math.max(0, totalExistentes - activosCount);
  const [pctActivos, pctExpirados] = computeNormalizedPercentages([activosCount, expiradosCount]);

  // 2. Porcentaje de Vigencia de Firmas Asignadas (suma exacta 100%, máx 2 decimales)
  const firmasTotal =
    metricas?.firmasAsignadas?.totalAsignadas ?? adm?.totalCertificados ?? 0;
  const firmasVigentes =
    metricas?.firmasAsignadas?.vigentes ?? adm?.certificadosVigentes ?? 0;
  const firmasPorVencer =
    metricas?.firmasAsignadas?.porVencer ?? adm?.certificadosPorVencer ?? 0;
  const firmasExpiradas =
    metricas?.firmasAsignadas?.expiradas ?? adm?.certificadosRevocadosVencidos ?? 0;
  const listadoFirmasAsignadas = metricas?.firmasAsignadas?.listado || [];

  const [pctFirmasVigentes, pctFirmasPorVencer, pctFirmasExpiradas] = computeNormalizedPercentages([
    firmasVigentes,
    firmasPorVencer,
    firmasExpiradas,
  ]);

  // 3. Porcentaje de Tokens Conectados en Sesión Actual (suma exacta 100%, máx 2 decimales)
  const listaDispositivos = tel?.trazabilidadDispositivos || [];
  const conectadosCount =
    listaDispositivos.length > 0
      ? listaDispositivos.filter((d) => d.estadoEnVivo === 'CONECTADO').length
      : tel?.estacionesConectadas ?? 0;
  const baseConexion =
    listaDispositivos.length > 0 ? listaDispositivos.length : Math.max(1, totalExistentes);
  const desconectadosCount = Math.max(0, baseConexion - conectadosCount);
  const [pctConectados, pctDesconectados] = computeNormalizedPercentages([
    conectadosCount,
    desconectadosCount,
  ]);

  // 4. Total de acciones en el período
  const accionesPeriodo =
    metricas?.accionesFuncionarios?.totalAccionesFirmaPeriodo ?? tel?.eventosFirmando ?? 0;

  const opcionesPeriodo: Array<{ id: ModoReporteType; label: string }> = [
    { id: 'ULTIMOS_7_DIAS', label: '7 días' },
    { id: 'ULTIMOS_15_DIAS', label: '15 días' },
    { id: 'ULTIMOS_30_DIAS', label: '30 días' },
    { id: 'ULTIMOS_60_DIAS', label: '60 días' },
    { id: 'POR_MES', label: 'Por Mes' },
    { id: 'POR_ANIO', label: 'Por Año' },
  ];

  return (
    <>
      <Card className="border-border/80 bg-card shadow-xs overflow-hidden">
        {/* Cabecera con Selector de Períodos y Compilador/Visor LaTeX */}
        <CardHeader className="p-4 border-b bg-muted/20 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              {cargandoMetricas && (
                <span className="text-[10px] text-muted-foreground font-mono animate-pulse">
                  (Actualizando...)
                </span>
              )}
            </div>
            <CardTitle className="text-sm sm:text-base font-bold text-foreground">
              Distribución Porcentual de datos y Visualización de resumen
            </CardTitle>
            <CardDescription className="text-xs">
              Resumen visual de operatividad, vigencia y visor interactivo del resumen de datos por periodos
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex flex-wrap items-center rounded-lg border bg-background p-0.5 gap-0.5">
              {opcionesPeriodo.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setPeriodoReporte(op.id, mesSeleccionado, anioSeleccionado)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${modoReporte === op.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {op.label}
                </button>
              ))}
            </div>

            {modoReporte === 'POR_MES' && (
              <select
                value={mesSeleccionado}
                onChange={(e) => setPeriodoReporte('POR_MES', e.target.value, anioSeleccionado)}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-mono text-foreground"
                title="Seleccionar mes"
              >
                {mesesDisponibles.length > 0 ? (
                  mesesDisponibles.map((m) => (
                    <option key={m.valor} value={m.valor}>
                      {m.etiqueta}
                    </option>
                  ))
                ) : (
                  <option value={mesSeleccionado}>{mesSeleccionado}</option>
                )}
              </select>
            )}

            {modoReporte === 'POR_ANIO' && (
              <select
                value={anioSeleccionado}
                onChange={(e) => setPeriodoReporte('POR_ANIO', mesSeleccionado, e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-mono text-foreground"
                title="Seleccionar año"
              >
                {aniosDisponibles.map((a) => (
                  <option key={a.valor} value={a.valor}>
                    {a.etiqueta}
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => cargarMetricas()}
              disabled={cargandoMetricas}
              className="h-8 px-2.5 text-xs"
              title="Actualizar estadísticas"
            >
              ↻
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={abrirPrevisualizacionLatexPdf}
              className="h-8 px-3 text-xs font-bold shadow-xs"
            >
              Visualizar / Exportar resumen de datos
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-5">
          {/* Resumen Superior: Tiempo Promedio de Uso por Día y Tiempo Total de Conexión */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/5 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                  Tiempo Promedio de Uso por Día (General)
                </div>
                <div className="text-xl font-bold font-mono text-foreground mt-0.5">
                  {formatearHorasMinutos(tel?.promedioUsoDiarioGeneralMinutos)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Promedio diario por token en el período ({etiquetaPeriodo})
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border bg-background/60 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Tiempo Total Acumulado de Conexión
                </div>
                <div className="text-xl font-bold font-mono text-foreground mt-0.5">
                  {formatearHorasMinutos(tel?.tiempoUsoTotalMinutos)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Suma de sesiones USB registradas en el período
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-muted/50 border flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* 1. Tarjetas con Gráfico Circular General arriba y Gráfico de Columnas Verticales debajo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tarjeta 1: % Dispositivos Operativos */}
            <div className="p-4 rounded-xl border bg-background/60 flex flex-col justify-between gap-3">
              <div className="flex flex-col items-center text-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Tokens Operativos
                </span>
                <RingProgress percentage={pctActivos} colorClass="text-emerald-500" />
                <span className="text-xs text-muted-foreground">
                  {activosCount} de {totalExistentes} dispositivos
                </span>
              </div>
              <VerticalSubChart
                slices={[
                  {
                    label: 'Activos',
                    pct: pctActivos,
                    count: activosCount,
                    barClass: 'bg-emerald-500',
                    textClass: 'text-emerald-600 dark:text-emerald-400',
                  },
                  {
                    label: 'Expirados',
                    pct: pctExpirados,
                    count: expiradosCount,
                    barClass: 'bg-rose-500',
                    textClass: 'text-rose-600 dark:text-rose-400',
                  },
                ]}
              />
            </div>

            {/* Tarjeta 2: % Vigencia de Firmas */}
            <div className="p-4 rounded-xl border bg-background/60 flex flex-col justify-between gap-3">
              <div className="flex flex-col items-center text-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Firmas Vigentes
                </span>
                <RingProgress percentage={pctFirmasVigentes} colorClass="text-blue-500" />
                <span className="text-xs text-muted-foreground">
                  {firmasVigentes} de {firmasTotal} asignadas
                </span>
              </div>
              <VerticalSubChart
                slices={[
                  {
                    label: 'Vigentes',
                    pct: pctFirmasVigentes,
                    count: firmasVigentes,
                    barClass: 'bg-emerald-500',
                    textClass: 'text-emerald-600 dark:text-emerald-400',
                  },
                  {
                    label: 'Por vencer',
                    pct: pctFirmasPorVencer,
                    count: firmasPorVencer,
                    barClass: 'bg-amber-500',
                    textClass: 'text-amber-600 dark:text-amber-400',
                  },
                  {
                    label: 'Expiradas',
                    pct: pctFirmasExpiradas,
                    count: firmasExpiradas,
                    barClass: 'bg-rose-500',
                    textClass: 'text-rose-600 dark:text-rose-400',
                  },
                ]}
              />
            </div>

            {/* Tarjeta 3: % Conexión en Sesión */}
            <div className="p-4 rounded-xl border bg-background/60 flex flex-col justify-between gap-3">
              <div className="flex flex-col items-center text-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Tokens Conectados
                </span>
                <RingProgress percentage={pctConectados} colorClass="text-emerald-500" />
                <span className="text-xs text-muted-foreground">
                  {conectadosCount} de {baseConexion} en línea
                </span>
              </div>
              <VerticalSubChart
                slices={[
                  {
                    label: 'Conectados',
                    pct: pctConectados,
                    count: conectadosCount,
                    barClass: 'bg-emerald-500',
                    textClass: 'text-emerald-600 dark:text-emerald-400',
                  },
                  {
                    label: 'Desconect.',
                    pct: pctDesconectados,
                    count: desconectadosCount,
                    barClass: 'bg-rose-500',
                    textClass: 'text-rose-600 dark:text-rose-400',
                  },
                ]}
              />
            </div>
          </div>

          {/* 2. Desglose Inferior (Estado/Expiración, Evolución Diaria y Compilador/Visor LaTeX Integrado) */}
          {(!compacto || vistaCompleta) && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant={tabTrazabilidad === 'VIGENCIA_FIRMAS' ? 'default' : 'outline'}
                    onClick={() => setTabTrazabilidad('VIGENCIA_FIRMAS')}
                    className="h-8 text-xs font-bold"
                  >
                    Estado y Expiración de Firmas
                  </Button>
                  <Button
                    size="sm"
                    variant={tabTrazabilidad === 'SERIE_TEMPORAL' ? 'default' : 'outline'}
                    onClick={() => setTabTrazabilidad('SERIE_TEMPORAL')}
                    className="h-8 text-xs font-bold"
                  >
                    Evolución Diaria ({serie.length}d)
                  </Button>
                </div>
              </div>

              {/* Pestaña 1: Vigencia, Asignación, Caducidad y Acciones de Tokens */}
              {tabTrazabilidad === 'VIGENCIA_FIRMAS' && (
                <div className="space-y-3">
                  {/* Interpretación Ejecutiva Automática */}
                  <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs text-foreground space-y-1">
                    <div className="font-bold text-primary">
                      Interpretación de Inventario, Operatividad y Asignación ({etiquetaPeriodo})
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      El sistema registra <strong className="text-foreground">{totalExistentes} dispositivo(s)</strong> en seguimiento, con una operatividad del{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400">{formatPct(pctActivos)}</strong> ({activosCount} activos y {expiradosCount} expirados).{' '}
                      Existen <strong className="text-foreground">{firmasTotal} token(s) asignado(s)</strong> a funcionarios titulares (ver detalle en la tabla inferior), acumulando{' '}
                      <strong className="text-foreground">{accionesPeriodo} evento(s) de telemetría USB</strong> en el período ({conectadosCount} en línea ahora).
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader className="bg-muted/40 text-[11px]">
                        <TableRow>
                          <TableHead>Titular Asignado</TableHead>
                          <TableHead>Unidad</TableHead>
                          <TableHead>ID Token</TableHead>
                          <TableHead>Fecha Asignación</TableHead>
                          <TableHead>Caducidad Contrato / Cert.</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Tiempo Uso Total</TableHead>
                          <TableHead>Promedio Uso / Día</TableHead>
                          <TableHead className="text-right">Cant. Acciones (Período)</TableHead>
                          <TableHead className="text-right">% Part.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        {listadoFirmasAsignadas.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={10}
                              className="h-20 text-center text-xs text-muted-foreground"
                            >
                              Sin tokens asignados registrados aún. Inserte un token USB para comenzar la trazabilidad.
                            </TableCell>
                          </TableRow>
                        ) : (
                          listadoFirmasAsignadas.map((item) => {
                            const pctPart =
                              accionesPeriodo > 0
                                ? round2((item.accionesFirmaPeriodo / accionesPeriodo) * 100)
                                : 0;
                            const colorPunto =
                              item.estado === 'ACTIVO'
                                ? 'bg-emerald-500'
                                : item.estado === 'POR_VENCER'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500';
                            const colorTexto =
                              item.estado === 'ACTIVO'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : item.estado === 'POR_VENCER'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-rose-600 dark:text-rose-400';
                            return (
                              <TableRow key={item.id} className="hover:bg-muted/30">
                                <TableCell className="font-bold text-foreground">
                                  {item.funcionario.nombre}
                                </TableCell>
                                <TableCell className="text-[11px] text-muted-foreground">
                                  {item.funcionario.unidad}
                                </TableCell>
                                <TableCell className="font-mono font-bold text-foreground">
                                  {item.serialNumberToken}
                                </TableCell>
                                <TableCell className="font-mono text-[11px] text-muted-foreground">
                                  {item.fechaAsignacion || '-'}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  <div className="text-[11px] font-semibold text-foreground">
                                    {item.fechaExpiracion || '-'}
                                  </div>
                                  <div className={`text-[11px] font-semibold ${colorTexto}`}>
                                    {item.diasRestantes > 0
                                      ? `Caduca en ${item.diasRestantes}d`
                                      : `Expirado hace ${Math.abs(item.diasRestantes)}d`}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`inline-flex items-center gap-1.5 font-semibold text-[11px] ${colorTexto}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${colorPunto}`} />
                                    {item.estado === 'POR_VENCER'
                                      ? 'Por vencer'
                                      : item.estado === 'ACTIVO'
                                        ? 'Vigente'
                                        : 'Expirado'}
                                  </span>
                                </TableCell>
                                <TableCell className="font-mono text-xs font-bold text-primary whitespace-nowrap">
                                  {formatearHorasMinutos(item.tiempoUsoMinutos)}
                                </TableCell>
                                <TableCell className="font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                                  {formatearHorasMinutos(item.promedioUsoDiarioMinutos)}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {item.accionesFirmaPeriodo}
                                </TableCell>
                                <TableCell className="text-right font-mono text-[11px] text-muted-foreground">
                                  {formatPct(pctPart)}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Pestaña 2: Serie Temporal */}
              {tabTrazabilidad === 'SERIE_TEMPORAL' && (
                <div className="p-4 rounded-lg border bg-background/50 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">
                      Eventos de Telemetría USB por Día ({etiquetaPeriodo})
                    </span>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      Total período: {serie.reduce((acc, d) => acc + (d.eventosTelemetria || 0), 0)} eventos USB
                    </span>
                  </div>

                  <div className="flex items-end gap-1.5 h-32 pt-5 px-1 border-b pb-2 overflow-x-auto">
                    {(() => {
                      const esAnual = modoReporte === 'POR_ANIO' || serie.length > 45;
                      const mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                      const datosGrafico = esAnual
                        ? Array.from(
                            serie.reduce((map, d) => {
                              const ym = String(d.fecha || '').slice(0, 7);
                              const mIdx = Number(ym.slice(5, 7)) - 1;
                              const label = mesesCortos[mIdx] || ym;
                              const prev = map.get(ym) || { fecha: ym, etiqueta: label, eventosTelemetria: 0 };
                              prev.eventosTelemetria += d.eventosTelemetria || 0;
                              map.set(ym, prev);
                              return map;
                            }, new Map<string, { fecha: string; etiqueta: string; eventosTelemetria: number }>()).values(),
                          )
                        : serie;
                      const maxVal = Math.max(1, ...datosGrafico.map((d) => d.eventosTelemetria || 0));

                      return datosGrafico.map((dia) => {
                        const valor = dia.eventosTelemetria || 0;
                        const alturaPct =
                          valor > 0 ? Math.max(14, Math.round((valor / maxVal) * 100)) : 5;
                        return (
                          <div
                            key={dia.fecha}
                            className="flex flex-col items-center justify-end h-full group min-w-[26px] flex-1"
                            title={`${dia.etiqueta}: ${valor} eventos USB`}
                          >
                            <div className="text-[10px] font-mono font-bold text-foreground mb-1">
                              {valor > 0 ? valor : ''}
                            </div>
                            <div
                              className={`w-full max-w-[22px] rounded-t transition-all ${valor > 0
                                ? 'bg-emerald-500 group-hover:bg-emerald-400'
                                : 'bg-muted'
                                }`}
                              style={{ height: `${alturaPct}%` }}
                            />
                            <span className="text-[9px] font-mono text-muted-foreground mt-1.5 truncate max-w-[36px]">
                              {esAnual ? dia.etiqueta : dia.etiqueta.split(' ')[0]}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Pestaña 3: Visualizar Reporte (Renderizado Tipográfico LaTeX) */}
              {tabTrazabilidad === 'VISOR_LATEX' && (
                <div className="p-4 rounded-xl border bg-background/50 flex flex-col space-y-2">
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(codigoLatex)}
                      className="h-7 px-3 text-xs font-bold shadow-xs"
                    >
                      Copiar Código LaTeX
                    </Button>
                  </div>

                  <LatexPaperPreview tex={codigoLatex} />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Previsualización de Código LaTeX + Documento Summary PDF */}
      {modalLatexOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6">
          <Card className="w-full max-w-6xl max-h-[92vh] flex flex-col border-primary/50 bg-card shadow-2xl overflow-hidden">
            <CardHeader className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-primary">
                    Compilador y Visor Summary PDF en LaTeX
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {etiquetaPeriodo}
                  </span>
                </div>
                <CardTitle className="text-sm sm:text-base font-bold mt-1">
                  Edición y Compilación de Código LaTeX (.tex) a Documento PDF
                </CardTitle>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModalLatexOpen(false)}
                  className="h-8 text-xs font-bold"
                >
                  ✕ Cerrar
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex-1 overflow-y-auto flex flex-col space-y-2 min-h-[480px]">
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(codigoLatex)}
                  className="h-7 px-3 text-xs font-bold shadow-xs"
                >
                  Copiar Código LaTeX
                </Button>
                <a
                  href={compiledPdfBlobUrl || pdfDownloadUrl}
                  download={`Summary-LaTeX-${modoReporte.toLowerCase()}.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-7 px-3 text-xs font-bold shadow-xs"
                >
                  Descargar PDF
                </a>
              </div>

              <LatexPaperPreview tex={codigoLatex} />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
