import React, { useEffect, useState } from 'react';
import { Clock, UserX } from 'lucide-react';
import {
  useTelemetriaStore,
  MetricasTrazabilidadResponse,
  ModoReporteType,
} from '../store/useTelemetriaStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { formatRutVisual } from '../lib/rut';

interface MetricasTrazabilidadPanelProps {
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
    <div className="bg-white text-zinc-900 rounded-lg border shadow-inner p-4 sm:p-8 overflow-y-auto max-h-[500px] font-serif">
      <div className="text-center border-b border-zinc-300 pb-4 mb-5 space-y-1">
        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          LaTeX2e Typeset Preview • article (11pt, a4paper)
        </div>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950">{doc.title}</h2>
        <p className="text-xs sm:text-sm text-zinc-800 font-medium">{doc.subtitle}</p>
        <p className="text-xs text-zinc-700 pt-1">{doc.author}</p>
        {doc.date && <p className="text-[11px] text-zinc-600 italic">{doc.date}</p>}
      </div>

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
  const contTotal = firmasAsig;

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
    'VIGENCIA_FIRMAS' | 'SERIE_TEMPORAL' | 'SIN_USO' | 'VISOR_LATEX'
  >('VIGENCIA_FIRMAS');
  const [busquedaSinUso, setBusquedaSinUso] = useState('');

  const [modalLatexOpen, setModalLatexOpen] = useState(false);
  const [codigoLatex, setCodigoLatex] = useState('');
  const [compiledPdfBlobUrl, setCompiledPdfBlobUrl] = useState<string | null>(null);

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
      // Mantiene fallback de descarga directa PDF
    }
  };

  const abrirPrevisualizacionLatexPdf = async () => {
    setModalLatexOpen(true);
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
      // Usa plantilla local si falla la consulta
    }
    setCodigoLatex(texFinal);
    handleCompilarLatexAPdf(texFinal);
  };

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

  const totalExistentes =
    metricas?.resumenDispositivos?.totalExistentes ?? tel?.tokensRegistrados ?? 0;
  const listaDispositivos = tel?.trazabilidadDispositivos || [];
  const tokensConUsoEfectivo = listaDispositivos.filter(
    (d) => (d.tiempoUsoMinutos || 0) > 0 || (d.totalEventosPeriodo || 0) > 0,
  ).length;
  const tokensEnUsoCount =
    tokensConUsoEfectivo > 0
      ? tokensConUsoEfectivo
      : (metricas?.resumenDispositivos?.activos ?? tel?.tokensOperativos ?? 0);
  const tokensEnDesusoCount = Math.max(0, totalExistentes - tokensEnUsoCount);
  const [pctUsoActivo, pctEnDesuso] = computeNormalizedPercentages([tokensEnUsoCount, tokensEnDesusoCount]);

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

  const accionesPeriodo =
    metricas?.accionesFuncionarios?.totalAccionesFirmaPeriodo ?? tel?.eventosFirmando ?? 0;

  interface UsuarioSinUsoItem {
    id: string;
    nombre: string;
    rut: string;
    email?: string;
    unidad: string;
    cargo?: string;
    serialNumber: string;
    marcaModelo: string;
    estado: 'ACTIVO' | 'POR_VENCER' | 'EXPIRADO';
    fechaExpiracion?: string;
    diasRestantes?: number;
    ultimaActividad?: string;
  }

  const usuariosSinUso: UsuarioSinUsoItem[] = (() => {
    const mapa = new Map<string, UsuarioSinUsoItem>();
    const esSerialValido = (sn?: string) =>
      Boolean(sn && !(sn.startsWith('SN-WIN-') && sn.endsWith('-UNKNOWN')));

    listadoFirmasAsignadas.forEach((f) => {
      if (!esSerialValido(f.serialNumberToken)) return;
      const disp = listaDispositivos.find(
        (d) =>
          d.serialNumber.toLowerCase() === f.serialNumberToken.toLowerCase() ||
          (f.funcionario?.rut && d.funcionarioAsignado?.rut === f.funcionario.rut),
      );
      const tiempoUso = Math.max(f.tiempoUsoMinutos || 0, disp?.tiempoUsoMinutos || 0);
      const eventos = disp?.totalEventosPeriodo || 0;
      const conexiones = disp?.conexionesPeriodo || 0;
      const acciones = f.accionesFirmaPeriodo || 0;
      const conectadoAhora = f.estadoConexion === 'CONECTADO' || disp?.estadoEnVivo === 'CONECTADO';

      if (tiempoUso <= 0 && eventos <= 0 && conexiones <= 0 && acciones <= 0 && !conectadoAhora) {
        const key = (f.serialNumberToken || f.funcionario?.rut || f.id).toLowerCase();
        mapa.set(key, {
          id: f.id || key,
          nombre: disp?.funcionarioAsignado?.nombre || f.funcionario?.nombre || 'Funcionario Municipal',
          rut: f.funcionario?.rut || disp?.funcionarioAsignado?.rut || '-',
          email: f.funcionario?.email || disp?.funcionarioAsignado?.email,
          unidad: disp?.funcionarioAsignado?.unidad || f.funcionario?.unidad || 'Municipalidad',
          cargo: f.funcionario?.cargo || disp?.funcionarioAsignado?.cargo,
          serialNumber: f.serialNumberToken,
          marcaModelo: [f.marca, f.modelo].filter(Boolean).join(' ') || 'Token USB',
          estado: f.estado,
          fechaExpiracion: f.fechaExpiracion || disp?.fechaExpiracion,
          diasRestantes: f.diasRestantes ?? disp?.diasRestantes,
          ultimaActividad: disp?.ultimaActividad,
        });
      }
    });

    listaDispositivos.forEach((d) => {
      if (!esSerialValido(d.serialNumber)) return;
      const key = d.serialNumber.toLowerCase();
      if (mapa.has(key)) return;
      const yaEnFirmas = listadoFirmasAsignadas.some(
        (f) => f.serialNumberToken.toLowerCase() === key,
      );
      if (yaEnFirmas) return;

      const tiempoUso = d.tiempoUsoMinutos || 0;
      const eventos = d.totalEventosPeriodo || 0;
      const conexiones = d.conexionesPeriodo || 0;
      if (tiempoUso <= 0 && eventos <= 0 && conexiones <= 0 && d.estadoEnVivo !== 'CONECTADO') {
        const dias = d.diasRestantes;
        const estado: 'ACTIVO' | 'POR_VENCER' | 'EXPIRADO' =
          d.estadoPatrimonial === 'EXPIRADO' || (dias !== undefined && dias <= 0)
            ? 'EXPIRADO'
            : dias !== undefined && dias <= 60
              ? 'POR_VENCER'
              : 'ACTIVO';
        mapa.set(key, {
          id: d.id || key,
          nombre: d.funcionarioAsignado?.nombre || 'Token Sin Titular Identificado',
          rut: d.funcionarioAsignado?.rut || d.funcionarioAsignado?.email || '-',
          email: d.funcionarioAsignado?.email,
          unidad: d.funcionarioAsignado?.unidad || d.dependenciaFisica || 'Municipalidad',
          cargo: d.funcionarioAsignado?.cargo,
          serialNumber: d.serialNumber,
          marcaModelo: [d.marca, d.modelo].filter(Boolean).join(' ') || 'Token USB',
          estado,
          fechaExpiracion: d.fechaExpiracion,
          diasRestantes: dias,
          ultimaActividad: d.ultimaActividad,
        });
      }
    });

    return Array.from(mapa.values());
  })();

  const usuariosSinUsoFiltrados = usuariosSinUso.filter((u) => {
    const q = busquedaSinUso.trim().toLowerCase();
    if (!q) return true;
    return (
      u.nombre.toLowerCase().includes(q) ||
      u.rut.toLowerCase().includes(q) ||
      u.unidad.toLowerCase().includes(q) ||
      u.serialNumber.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

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
      <Card className="border-border/80 bg-card shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b bg-muted/20 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
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

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <div className="inline-flex flex-wrap items-center rounded-lg border bg-background p-0.5 gap-0.5">
              {opcionesPeriodo.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setPeriodoReporte(op.id, mesSeleccionado, anioSeleccionado)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${modoReporte === op.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
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
              className="h-8 px-3 text-xs font-bold shadow-sm w-full sm:w-auto"
            >
              Visualizar / Exportar resumen de datos
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-5">
          <div className="p-4 rounded-xl border bg-background/60 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tiempo Total Acumulado de Conexión
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground mt-0.5">
                {formatearHorasMinutos(tel?.tiempoUsoTotalMinutos)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Suma de sesiones USB registradas en el período ({etiquetaPeriodo})
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-muted/50 border flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border bg-background/60 flex flex-col justify-between gap-3">
              <div className="flex flex-col items-center text-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Uso Efectivo de Tokens
                </span>
                <RingProgress percentage={pctUsoActivo} colorClass="text-emerald-500" />
                <span className="text-xs text-muted-foreground">
                  {tokensEnUsoCount} de {totalExistentes} con actividad
                </span>
              </div>
              <VerticalSubChart
                slices={[
                  {
                    label: 'Con Actividad',
                    pct: pctUsoActivo,
                    count: tokensEnUsoCount,
                    barClass: 'bg-emerald-500',
                    textClass: 'text-emerald-600 dark:text-emerald-400',
                  },
                  {
                    label: 'Sin Uso',
                    pct: pctEnDesuso,
                    count: tokensEnDesusoCount,
                    barClass: 'bg-slate-400',
                    textClass: 'text-muted-foreground',
                  },
                ]}
              />
            </div>

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
                  <Button
                    size="sm"
                    variant={tabTrazabilidad === 'SIN_USO' ? 'default' : 'outline'}
                    onClick={() => setTabTrazabilidad('SIN_USO')}
                    className="h-8 text-xs font-bold gap-1.5"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Usuarios sin uso de token ({usuariosSinUso.length})</span>
                  </Button>
                </div>
              </div>

              {tabTrazabilidad === 'VIGENCIA_FIRMAS' && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs text-foreground space-y-1">
                    <div className="font-bold text-primary">
                      Interpretación de Inventario, Operatividad y Asignación ({etiquetaPeriodo})
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      El sistema registra <strong className="text-foreground">{totalExistentes} dispositivo(s)</strong> en seguimiento, con una tasa de uso efectivo del{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400">{formatPct(pctUsoActivo)}</strong> ({tokensEnUsoCount} con actividad y {tokensEnDesusoCount} sin uso en el período).{' '}
                      Existen <strong className="text-foreground">{firmasTotal} token(s) asignado(s)</strong> a funcionarios titulares (ver detalle en la tabla inferior), acumulando{' '}
                      <strong className="text-foreground">{accionesPeriodo} evento(s) de telemetría USB</strong> en el período ({conectadosCount} en línea ahora).
                    </p>
                  </div>

                  <div className="hidden md:block overflow-x-auto rounded-lg border">
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
                          <TableHead className="text-right">Cant. Acciones (Período)</TableHead>
                          <TableHead className="text-right">% Part.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        {listadoFirmasAsignadas.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={9}
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

                  <div className="block md:hidden space-y-2.5">
                    {listadoFirmasAsignadas.length === 0 ? (
                      <div className="rounded-lg border p-4 text-center text-xs text-muted-foreground">
                        Sin tokens asignados registrados aún. Inserte un token USB para comenzar la trazabilidad.
                      </div>
                    ) : (
                      listadoFirmasAsignadas.map((item) => {
                        const pctPart =
                          accionesPeriodo > 0
                            ? round2((item.accionesFirmaPeriodo / accionesPeriodo) * 100)
                            : 0;
                        const colorTexto =
                          item.estado === 'ACTIVO'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : item.estado === 'POR_VENCER'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400';
                        return (
                          <div key={`mobile-vig-${item.id}`} className="rounded-lg border bg-background/60 p-3 space-y-2 text-xs">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-bold text-foreground break-words">{item.funcionario.nombre}</div>
                                <div className="text-[11px] text-muted-foreground break-words">{item.funcionario.unidad}</div>
                              </div>
                              <span className={`text-[11px] font-semibold shrink-0 ${colorTexto}`}>
                                {item.estado === 'POR_VENCER' ? 'Por vencer' : item.estado === 'ACTIVO' ? 'Vigente' : 'Expirado'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/50">
                              <div className="min-w-0">
                                <span className="text-[10px] text-muted-foreground block">ID Token</span>
                                <span className="font-mono font-bold break-all">{item.serialNumberToken}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-muted-foreground block">Caducidad</span>
                                <span className={`font-mono font-semibold ${colorTexto}`}>
                                  {item.fechaExpiracion || '-'} ({item.diasRestantes > 0 ? `${item.diasRestantes}d` : `-${Math.abs(item.diasRestantes)}d`})
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-muted-foreground block">Tiempo Uso</span>
                                <span className="font-mono font-bold text-primary">{formatearHorasMinutos(item.tiempoUsoMinutos)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-muted-foreground block">Acciones (% Part.)</span>
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {item.accionesFirmaPeriodo} ({formatPct(pctPart)})
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {tabTrazabilidad === 'SERIE_TEMPORAL' && (
                <div className="p-4 rounded-lg border bg-background/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
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

              {tabTrazabilidad === 'SIN_USO' && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs space-y-0.5 min-w-0">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <UserX className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Usuarios / Tokens sin actividad registrada ({etiquetaPeriodo})</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Lista de funcionarios o tokens con 0 minutos de uso, 0 eventos USB y sin conexión activa durante el período seleccionado.
                      </p>
                    </div>
                    <Input
                      value={busquedaSinUso}
                      onChange={(e) => setBusquedaSinUso(e.target.value)}
                      placeholder="Filtrar por nombre, RUT, unidad o token..."
                      className="h-8 text-xs w-full sm:w-64 bg-background shrink-0"
                    />
                  </div>

                  {usuariosSinUsoFiltrados.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                      {usuariosSinUso.length === 0
                        ? `Todos los tokens monitoreados registraron uso o conexión durante ${etiquetaPeriodo}.`
                        : 'No hay usuarios sin uso que coincidan con el filtro ingresado.'}
                    </div>
                  ) : (
                    <>
                      <div className="hidden md:block overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader className="bg-muted/40 text-[11px]">
                            <TableRow>
                              <TableHead>Titular / RUT</TableHead>
                              <TableHead>Unidad / Cargo</TableHead>
                              <TableHead>ID Token</TableHead>
                              <TableHead>Vigencia / Estado</TableHead>
                              <TableHead>Última Actividad</TableHead>
                              <TableHead className="text-right">Uso en Período</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="text-xs">
                            {usuariosSinUsoFiltrados.map((u) => {
                              const colorTexto =
                                u.estado === 'ACTIVO'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : u.estado === 'POR_VENCER'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-rose-600 dark:text-rose-400';
                              return (
                                <TableRow key={u.id} className="hover:bg-muted/30">
                                  <TableCell>
                                    <div className="font-bold text-foreground">{u.nombre}</div>
                                    <div className="text-[10px] font-mono text-muted-foreground">
                                      {u.rut.includes('@') ? u.rut : formatRutVisual(u.rut)}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-[11px] font-medium text-foreground">{u.unidad}</div>
                                    {u.cargo && (
                                      <div className="text-[10px] text-muted-foreground">{u.cargo}</div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-mono font-bold text-foreground">{u.serialNumber}</div>
                                    <div className="text-[10px] text-muted-foreground">{u.marcaModelo}</div>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    <div className="text-[11px] font-semibold text-foreground">
                                      {u.fechaExpiracion || '-'}
                                    </div>
                                    <div className={`text-[11px] font-semibold ${colorTexto}`}>
                                      {u.estado === 'POR_VENCER'
                                        ? 'Por vencer'
                                        : u.estado === 'ACTIVO'
                                          ? 'Vigente'
                                          : 'Expirado'}
                                      {u.diasRestantes !== undefined
                                        ? u.diasRestantes > 0
                                          ? ` (${u.diasRestantes}d)`
                                          : ` (-${Math.abs(u.diasRestantes)}d)`
                                        : ''}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                                    {u.ultimaActividad
                                      ? new Date(u.ultimaActividad).toLocaleString('es-CL')
                                      : 'Sin registro reciente'}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                    0 hrs 00 mins • 0 eventos
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="block md:hidden space-y-2.5">
                        {usuariosSinUsoFiltrados.map((u) => {
                          const colorTexto =
                            u.estado === 'ACTIVO'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : u.estado === 'POR_VENCER'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400';
                          return (
                            <div key={`mobile-sinuso-${u.id}`} className="rounded-lg border bg-background/60 p-3 space-y-2 text-xs">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="font-bold text-foreground break-words">{u.nombre}</div>
                                  <div className="text-[10px] font-mono text-muted-foreground">
                                    {u.rut.includes('@') ? u.rut : formatRutVisual(u.rut)}
                                  </div>
                                </div>
                                <span className={`text-[11px] font-semibold shrink-0 ${colorTexto}`}>
                                  {u.estado === 'POR_VENCER' ? 'Por vencer' : u.estado === 'ACTIVO' ? 'Vigente' : 'Expirado'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/50">
                                <div className="min-w-0">
                                  <span className="text-[10px] text-muted-foreground block">ID Token</span>
                                  <span className="font-mono font-bold break-all">{u.serialNumber}</span>
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[10px] text-muted-foreground block">Unidad</span>
                                  <span className="break-words">{u.unidad}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-muted-foreground block">Última Actividad</span>
                                  <span className="font-mono text-muted-foreground">
                                    {u.ultimaActividad
                                      ? new Date(u.ultimaActividad).toLocaleDateString('es-CL')
                                      : 'Sin registro'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-muted-foreground block">Uso en Período</span>
                                  <span className="font-mono text-muted-foreground">0 hrs 00 mins • 0 ev.</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {tabTrazabilidad === 'VISOR_LATEX' && (
                <div className="p-4 rounded-xl border bg-background/50 flex flex-col space-y-2">
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(codigoLatex)}
                      className="h-7 px-3 text-xs font-bold shadow-sm"
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

      {modalLatexOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6">
          <Card className="w-full max-w-6xl max-h-[92dvh] flex flex-col border-primary/50 bg-card shadow-2xl overflow-hidden">
            <CardHeader className="p-3 sm:p-4 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
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

              <div className="flex flex-wrap items-center gap-2 shrink-0">
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

            <CardContent className="p-3 sm:p-4 flex-1 overflow-y-auto flex flex-col space-y-2 min-h-0">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(codigoLatex)}
                  className="h-7 px-3 text-xs font-bold shadow-sm"
                >
                  Copiar Código LaTeX
                </Button>
                <a
                  href={compiledPdfBlobUrl || pdfDownloadUrl}
                  download={`Summary-LaTeX-${modoReporte.toLowerCase()}.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-7 px-3 text-xs font-bold shadow-sm"
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
