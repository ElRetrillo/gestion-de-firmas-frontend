import React, { useEffect, useState } from 'react';
import {
  useTelemetriaStore,
  MetricasTrazabilidadResponse,
  ModoReporteType,
} from '../store/useTelemetriaStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';

interface MetricasTrazabilidadPanelProps {
  vistaOrigen?: 'DISPOSITIVOS' | 'CUSTODIA' | 'AUDITORIA';
  compacto?: boolean;
  vistaCompleta?: boolean;
}

const generarLatexFallback = (m: MetricasTrazabilidadResponse | null, etiqueta: string): string => {
  const dispTotal = m?.resumenDispositivos?.totalExistentes ?? m?.telemetria?.tokensRegistrados ?? 0;
  const dispActivos = m?.resumenDispositivos?.activos ?? m?.telemetria?.tokensOperativos ?? 0;
  const dispExpirados = m?.resumenDispositivos?.expirados ?? m?.telemetria?.tokensExpirados ?? Math.max(0, dispTotal - dispActivos);
  const firmasAsig = m?.firmasAsignadas?.totalAsignadas ?? m?.administracion?.totalCertificados ?? 0;
  const accionesPeriodo = m?.accionesFuncionarios?.totalAccionesFirmaPeriodo ?? m?.telemetria?.eventosFirmando ?? 0;
  const conexionesExcl = m?.accionesFuncionarios?.conexionesExcluidasPeriodo ?? m?.telemetria?.eventosConectado ?? 0;
  const desconexionesExcl = m?.accionesFuncionarios?.desconexionesExcluidasPeriodo ?? m?.telemetria?.eventosDesconectado ?? 0;
  const a15 = m?.alertasVencimiento?.menosDe15Dias ?? 0;
  const a30 = m?.alertasVencimiento?.entre16Y30Dias ?? 0;
  const a60 = m?.alertasVencimiento?.entre31Y60Dias ?? 0;
  const contTotal = m?.contratosResumen?.totalContratos ?? 0;

  const filasFunc = (m?.accionesFuncionarios?.listadoPorFuncionario || [])
    .slice(0, 12)
    .map(
      (f) =>
        `${f.nombre.replace(/[&_#%]/g, '')} & ${f.rut} & ${f.serialNumberToken} & ${f.estadoToken} & ${f.diasRestantesToken} d & \\textbf{${f.accionesFirmaPeriodo}} & ${f.accionesFirmaHistorico} \\\\ \\hline`,
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
\\large Summary Estadístico de Control y Seguimiento de Tokens de Firma Electrónica}
\\author{Departamento de Gestión de Sistemas y TICs}
\\date{Período Evaluado: ${etiqueta}}

\\begin{document}
\\maketitle

\\section*{1. Resumen Ejecutivo de Dispositivos y Firmas Asignadas}
\\begin{tabular}{|l|r|r|}
\\hline
\\textbf{Indicador de Control de Tokens} & \\textbf{Cantidad} & \\textbf{Detalle / Estado} \\\\ \\hline
Dispositivos Tokens Existentes (Total) & ${dispTotal} & 100\\% Inventario \\\\ \\hline
Dispositivos Activos (Operativos) & ${dispActivos} & En vigencia \\\\ \\hline
Dispositivos Expirados / Caducados & ${dispExpirados} & Requieren renovación \\\\ \\hline
Firmas Electrónicas Asignadas & ${firmasAsig} & Funcionarios titulares \\\\ \\hline
Acciones de Firma en Período (1 acción = 1 firma) & \\textbf{${accionesPeriodo}} & Excluye ${conexionesExcl} conex. y ${desconexionesExcl} desconex. \\\\ \\hline
Tokens por Vencer ($\\le$ 15 / 30 / 60 días) & ${a15} / ${a30} / ${a60} & Vigilancia preventiva \\\\ \\hline
Contratos de Obtención de Tokens & ${contTotal} & Control de caducidad \\\\ \\hline
\\end{tabular}

\\section*{2. Desglose de Acciones de Firma por Funcionario y Token}
\\textit{Nota metodológica: Cada acción contabilizada equivale exclusivamente a 1 firma realizada con el token desde la sesión activa (se excluyen conexiones y desconexiones USB).}

\\vspace{0.3cm}
\\begin{tabular}{|l|l|l|l|r|r|r|}
\\hline
\\textbf{Funcionario} & \\textbf{RUT} & \\textbf{N° Serie Token} & \\textbf{Estado} & \\textbf{Expiración} & \\textbf{Firmas Período} & \\textbf{Histórico} \\\\ \\hline
${filasFunc || 'Sin registros en el período & - & - & - & - & 0 & 0 \\\\ \\hline'}
\\end{tabular}

\\end{document}`;
};

export const MetricasTrazabilidadPanel: React.FC<MetricasTrazabilidadPanelProps> = ({
  vistaOrigen = 'DISPOSITIVOS',
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
    'FIRMAS_ASIGNADAS' | 'ACCIONES_FUNCIONARIOS' | 'DISPOSITIVOS' | 'CONTRATOS' | 'EVOLUCION'
  >(vistaOrigen === 'CUSTODIA' ? 'CONTRATOS' : 'FIRMAS_ASIGNADAS');

  // Estado del Modal de Previsualización LaTeX + Descarga PDF
  const [modalLatexOpen, setModalLatexOpen] = useState(false);
  const [codigoLatex, setCodigoLatex] = useState('');
  const [cargandoLatex, setCargandoLatex] = useState(false);
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

  const abrirPrevisualizacionLatexPdf = async () => {
    setModalLatexOpen(true);
    setCargandoLatex(true);
    try {
      const res = await fetch(`/api/v1/telemetria/metricas/latex?${buildQueryParams()}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.codigoLatex) {
          setCodigoLatex(data.codigoLatex);
          setCargandoLatex(false);
          return;
        }
      }
    } catch {
      // Usa latexPreview de metricas o fallback
    }
    setCodigoLatex(
      metricas?.latexPreview?.codigoLatex || generarLatexFallback(metricas, etiquetaPeriodo),
    );
    setCargandoLatex(false);
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

  const pdfInlineUrl = `/api/v1/telemetria/metricas/pdf?${buildQueryParams()}`;
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
  const maxActividadDia = Math.max(1, ...serie.map((d) => d.totalActividad));

  // Datos consolidados de los 7 puntos requeridos
  const totalExistentes =
    metricas?.resumenDispositivos?.totalExistentes ?? tel?.tokensRegistrados ?? 0;
  const activosCount =
    metricas?.resumenDispositivos?.activos ?? tel?.tokensOperativos ?? 0;
  const expiradosCount =
    metricas?.resumenDispositivos?.expirados ??
    tel?.tokensExpirados ??
    Math.max(0, totalExistentes - activosCount);
  const pctActivos =
    metricas?.resumenDispositivos?.porcentajeActivos ??
    (totalExistentes > 0 ? Math.round((activosCount / totalExistentes) * 100) : 0);

  const firmasTotal =
    metricas?.firmasAsignadas?.totalAsignadas ?? adm?.totalCertificados ?? 0;
  const firmasVigentes =
    metricas?.firmasAsignadas?.vigentes ?? adm?.certificadosVigentes ?? 0;
  const firmasPorVencer =
    metricas?.firmasAsignadas?.porVencer ?? adm?.certificadosPorVencer ?? 0;
  const firmasExpiradas =
    metricas?.firmasAsignadas?.expiradas ?? adm?.certificadosRevocadosVencidos ?? 0;
  const listadoFirmasAsignadas = metricas?.firmasAsignadas?.listado || [];

  const accionesPeriodo =
    metricas?.accionesFuncionarios?.totalAccionesFirmaPeriodo ?? tel?.eventosFirmando ?? 0;
  const accionesHistorico =
    metricas?.accionesFuncionarios?.totalAccionesFirmaHistorico ?? accionesPeriodo;
  const conexionesExcluidas =
    metricas?.accionesFuncionarios?.conexionesExcluidasPeriodo ?? tel?.eventosConectado ?? 0;
  const desconexionesExcluidas =
    metricas?.accionesFuncionarios?.desconexionesExcluidasPeriodo ?? tel?.eventosDesconectado ?? 0;
  const listadoAccionesFunc = metricas?.accionesFuncionarios?.listadoPorFuncionario || [];

  const alerta15 = metricas?.alertasVencimiento?.menosDe15Dias ?? 0;
  const alerta30 = metricas?.alertasVencimiento?.entre16Y30Dias ?? 0;
  const alerta60 = metricas?.alertasVencimiento?.entre31Y60Dias ?? 0;
  const alertaExp = metricas?.alertasVencimiento?.expirados ?? expiradosCount;

  const contratosTotal = metricas?.contratosResumen?.totalContratos ?? 0;
  const contratosVigentes = metricas?.contratosResumen?.contratosVigentes ?? 0;
  const contratosPorCaducar = metricas?.contratosResumen?.contratosPorCaducar ?? 0;
  const listadoContratos = metricas?.contratosResumen?.listado || [];

  const opcionesPeriodo: Array<{ id: ModoReporteType; label: string }> = [
    { id: 'ULTIMOS_7_DIAS', label: 'Últimos 7 días' },
    { id: 'ULTIMOS_15_DIAS', label: 'Últimos 15 días' },
    { id: 'ULTIMOS_30_DIAS', label: 'Últimos 30 días' },
    { id: 'POR_MES', label: 'Por Mes' },
    { id: 'POR_ANIO', label: 'Por Año' },
  ];

  return (
    <>
      <Card className="border-primary/30 bg-card/90 shadow-sm overflow-hidden">
        {/* Cabecera con Selector de 5 Períodos y Exportación Summary LaTeX / PDF */}
        <CardHeader className="p-4 border-b bg-muted/20 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary bg-primary/5">
                ESTADÍSTICAS Y SUMMARY DE TOKENS
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-mono">
                Período: {etiquetaPeriodo}
              </Badge>
              <Badge variant="info" className="text-[10px] font-mono">
                1 Acción = 1 Firma con Token (Excluye Conex./Desconex.)
              </Badge>
              {cargandoMetricas && (
                <span className="text-[10px] text-muted-foreground font-mono animate-pulse">
                  Sincronizando métricas...
                </span>
              )}
            </div>
            <CardTitle className="text-sm sm:text-base font-bold text-foreground pt-1">
              Estadísticas Integrales de Tokens, Firmas Asignadas, Acciones por Funcionario y Contratos
            </CardTitle>
            <CardDescription className="text-xs">
              Métricas en vivo desde la sesión y dispositivos criptográficos USB con exportación de Summary en código LaTeX y PDF.
            </CardDescription>
          </div>

          {/* Controles de Período (7d, 15d, 30d, Mes, Año) y Exportación LaTeX / PDF */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex flex-wrap items-center rounded-lg border bg-background p-0.5 gap-0.5">
              {opcionesPeriodo.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setPeriodoReporte(op.id, mesSeleccionado, anioSeleccionado)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    modoReporte === op.id
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
                title="Seleccionar mes del Summary"
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
                title="Seleccionar año del Summary"
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
              title="Recalcular métricas en tiempo real"
            >
              ↻
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={abrirPrevisualizacionLatexPdf}
              className="h-8 px-3 text-xs font-bold shadow-xs"
            >
              Previsualizar LaTeX y Exportar PDF
            </Button>

            <a
              href={pdfDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-primary/50 bg-primary/10 hover:bg-primary/20 text-primary h-8 px-3 text-xs font-bold transition-colors"
            >
              Descargar PDF Directo
            </a>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-5">
          {/* 1. Fila de Indicadores Clave de los Apartados Solicitados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Req 2: Dispositivos Existentes (Total, Activos, Expirados) */}
            <div className="p-3.5 rounded-lg border bg-background/70 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                <span>Dispositivos Tokens</span>
                <Badge variant="success" className="text-[10px] font-mono">
                  {pctActivos}% Activos
                </Badge>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-foreground">
                  {totalExistentes} <span className="text-xs font-normal text-muted-foreground">total</span>
                </span>
                <span className="text-[11px] font-mono">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{activosCount} act.</span> •{' '}
                  <span className="text-rose-600 dark:text-rose-400 font-bold">{expiradosCount} exp.</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, pctActivos)}%` }}
                />
                <div
                  className="h-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${Math.max(0, 100 - pctActivos)}%` }}
                />
              </div>
            </div>

            {/* Req 1: Firmas Asignadas y Estado */}
            <div className="p-3.5 rounded-lg border bg-background/70 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                <span>Firmas Asignadas</span>
                <Badge variant="info" className="text-[10px] font-mono">
                  {firmasVigentes} Vigentes
                </Badge>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-foreground">
                  {firmasTotal} <span className="text-xs font-normal text-muted-foreground">asignadas</span>
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Por vencer: {firmasPorVencer} | Exp: {firmasExpiradas}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${firmasTotal > 0 ? (firmasVigentes / firmasTotal) * 100 : 0}%` }}
                />
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${firmasTotal > 0 ? (firmasPorVencer / firmasTotal) * 100 : 0}%` }}
                />
                <div
                  className="h-full bg-rose-500"
                  style={{ width: `${firmasTotal > 0 ? (firmasExpiradas / firmasTotal) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Req 3: Acciones por Funcionario (1 acción = 1 firma, excluyendo conexiones/desconexiones) */}
            <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                <span>Acciones de Firma</span>
                <Badge variant="success" className="text-[9px] font-mono">
                  1 Acción = 1 Firma
                </Badge>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-foreground">
                  {accionesPeriodo}{' '}
                  <span className="text-xs font-normal text-muted-foreground">en período</span>
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Hist.: {accionesHistorico}
                </span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground truncate">
                Excluidos: {conexionesExcluidas} conex. / {desconexionesExcluidas} desconex.
              </div>
            </div>

            {/* Req 4: Vigencia 15, 30 y 60 días */}
            <div className="p-3.5 rounded-lg border bg-background/70 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                <span>Vencimientos (15/30/60d)</span>
                <Badge variant="warning" className="text-[10px] font-mono">
                  {alerta15 + alerta30 + alerta60} en alerta
                </Badge>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-mono pt-0.5">
                <div className="rounded bg-rose-500/10 border border-rose-500/30 py-0.5">
                  <div className="font-bold text-rose-500">{alerta15}</div>
                  <div className="text-[8px]">≤15d</div>
                </div>
                <div className="rounded bg-amber-500/10 border border-amber-500/30 py-0.5">
                  <div className="font-bold text-amber-500">{alerta30}</div>
                  <div className="text-[8px]">≤30d</div>
                </div>
                <div className="rounded bg-blue-500/10 border border-blue-500/30 py-0.5">
                  <div className="font-bold text-blue-500">{alerta60}</div>
                  <div className="text-[8px]">≤60d</div>
                </div>
                <div className="rounded bg-muted border py-0.5">
                  <div className="font-bold text-rose-600">{alertaExp}</div>
                  <div className="text-[8px]">Exp.</div>
                </div>
              </div>
            </div>

            {/* Req 7: Contratos de Obtención de Tokens */}
            <div className="p-3.5 rounded-lg border bg-background/70 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                <span>Contratos de Tokens</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {contratosVigentes} Vigentes
                </Badge>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-foreground">
                  {contratosTotal}{' '}
                  <span className="text-xs font-normal text-muted-foreground">contratos</span>
                </span>
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                  Por caducar: {contratosPorCaducar}
                </span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground truncate">
                Tokens contratados: {metricas?.contratosResumen?.totalTokensContratados ?? totalExistentes} unid.
              </div>
            </div>
          </div>

          {/* 2. Pestañas de Desglose de Estadísticas (cuando no está en modo compacto) */}
          {(!compacto || vistaCompleta) && (
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant={tabTrazabilidad === 'FIRMAS_ASIGNADAS' ? 'default' : 'outline'}
                    onClick={() => setTabTrazabilidad('FIRMAS_ASIGNADAS')}
                    className="h-7 text-xs font-bold"
                  >
                    1. Firmas Asignadas y Expiración ({listadoFirmasAsignadas.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={tabTrazabilidad === 'ACCIONES_FUNCIONARIOS' ? 'default' : 'outline'}
                    onClick={() => setTabTrazabilidad('ACCIONES_FUNCIONARIOS')}
                    className="h-7 text-xs font-bold"
                  >
                    2. Acciones por Funcionario ({listadoAccionesFunc.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={tabTrazabilidad === 'DISPOSITIVOS' ? 'default' : 'outline'}
                    onClick={() => setTabTrazabilidad('DISPOSITIVOS')}
                    className="h-7 text-xs font-bold"
                  >
                    3. Dispositivos Existentes ({tel?.trazabilidadDispositivos?.length ?? 0})
                  </Button>
                  <Button
                    size="sm"
                    variant={tabTrazabilidad === 'CONTRATOS' ? 'default' : 'outline'}
                    onClick={() => setTabTrazabilidad('CONTRATOS')}
                    className="h-7 text-xs font-bold"
                  >
                    4. Contratos de Tokens ({listadoContratos.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={tabTrazabilidad === 'EVOLUCION' ? 'default' : 'outline'}
                    onClick={() => setTabTrazabilidad('EVOLUCION')}
                    className="h-7 text-xs font-bold"
                  >
                    5. Serie Temporal ({serie.length} días)
                  </Button>
                </div>
              </div>

              {/* Pestaña 1: Firmas Asignadas */}
              {tabTrazabilidad === 'FIRMAS_ASIGNADAS' && (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader className="bg-muted/40 text-[11px]">
                      <TableRow>
                        <TableHead>Funcionario Titular / RUT</TableHead>
                        <TableHead>Unidad / Cargo</TableHead>
                        <TableHead>Token / N° Serie Firma</TableHead>
                        <TableHead>Estado de Firma</TableHead>
                        <TableHead>Fecha Expiración / Tiempo Restante</TableHead>
                        <TableHead>Estado en Sesión</TableHead>
                        <TableHead className="text-right">Acciones (Firmas)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {listadoFirmasAsignadas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-20 text-center text-xs text-muted-foreground">
                            Cargando firmas asignadas desde el servidor...
                          </TableCell>
                        </TableRow>
                      ) : (
                        listadoFirmasAsignadas.map((item) => (
                          <TableRow key={item.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="font-bold text-foreground">{item.funcionario.nombre}</div>
                              <div className="text-[10px] font-mono text-muted-foreground">
                                RUT: {item.funcionario.rut} • {item.funcionario.email}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-[11px] text-foreground">{item.funcionario.unidad}</div>
                              <div className="text-[10px] text-muted-foreground">{item.funcionario.cargo}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono font-bold text-foreground">{item.serialNumberToken}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                Cert: {item.numeroSerieCertificado} ({item.marca} {item.modelo})
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  item.estado === 'ACTIVO'
                                    ? 'success'
                                    : item.estado === 'POR_VENCER'
                                    ? 'warning'
                                    : 'danger'
                                }
                                className="text-[10px] font-mono"
                              >
                                {item.estado}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-[11px] font-semibold text-foreground">
                                {item.fechaExpiracion}
                              </div>
                              <div
                                className={`text-[10px] font-mono font-bold ${
                                  item.diasRestantes <= 0
                                    ? 'text-rose-500'
                                    : item.diasRestantes <= 30
                                    ? 'text-amber-500'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {item.tiempoExpiracionTexto}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant={
                                    item.estadoConexion === 'FIRMANDO'
                                      ? 'success'
                                      : item.estadoConexion === 'CONECTADO'
                                      ? 'warning'
                                      : 'danger'
                                  }
                                  className="text-[9px] font-mono"
                                >
                                  {item.estadoConexion}
                                </Badge>
                                {item.estacionActual && (
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    {item.estacionActual}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                {item.accionesFirmaPeriodo}
                              </span>{' '}
                              <span className="text-[10px] text-muted-foreground">
                                (Total: {item.accionesFirmaTotal})
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pestaña 2: Acciones por Funcionario (1 acción = 1 firma, excluyendo conexiones/desconexiones) */}
              {tabTrazabilidad === 'ACCIONES_FUNCIONARIOS' && (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-xs flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>Regla de Contabilización:</strong> 1 Acción = 1 Firma electrónica realizada con el token desde la sesión activa. Las conexiones y desconexiones USB se registran en telemetría pero <strong>no suman como acciones</strong>.
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      Ignorados en conteo: {conexionesExcluidas} conexiones / {desconexionesExcluidas} desconexiones
                    </Badge>
                  </div>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader className="bg-muted/40 text-[11px]">
                        <TableRow>
                          <TableHead>Funcionario / RUT</TableHead>
                          <TableHead>Unidad Municipal</TableHead>
                          <TableHead>Token Asignado</TableHead>
                          <TableHead>Acciones en Período (Firmas)</TableHead>
                          <TableHead>Acciones Históricas</TableHead>
                          <TableHead>Conex./Desconex. Excluidas</TableHead>
                          <TableHead>% Participación</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        {listadoAccionesFunc.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-20 text-center text-xs text-muted-foreground">
                              Sin acciones de firma registradas en el período.
                            </TableCell>
                          </TableRow>
                        ) : (
                          listadoAccionesFunc.map((f) => (
                            <TableRow key={f.usuarioId} className="hover:bg-muted/30">
                              <TableCell>
                                <div className="font-bold text-foreground">{f.nombre}</div>
                                <div className="text-[10px] font-mono text-muted-foreground">
                                  {f.rut} • {f.cargo}
                                </div>
                              </TableCell>
                              <TableCell className="text-[11px]">{f.unidad}</TableCell>
                              <TableCell>
                                <div className="font-mono font-bold">{f.serialNumberToken}</div>
                                <div className="text-[10px] text-muted-foreground">{f.modeloToken}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="success" className="text-xs font-mono font-bold px-2">
                                  {f.accionesFirmaPeriodo} firmas
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono font-semibold">
                                {f.accionesFirmaHistorico} firmas
                              </TableCell>
                              <TableCell className="font-mono text-[11px] text-muted-foreground">
                                {f.conexionesIgnoradasPeriodo} Con / {f.desconexionesIgnoradasPeriodo} Desc (excl.)
                              </TableCell>
                              <TableCell className="w-36">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-mono font-bold">
                                    {f.porcentajeParticipacionFirmas}%
                                  </span>
                                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-500"
                                      style={{ width: `${Math.min(100, f.porcentajeParticipacionFirmas)}%` }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Pestaña 3: Dispositivos Existentes */}
              {tabTrazabilidad === 'DISPOSITIVOS' && (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader className="bg-muted/40 text-[11px]">
                      <TableRow>
                        <TableHead>Dispositivo / N° Serie</TableHead>
                        <TableHead>Estado Token</TableHead>
                        <TableHead>Funcionario Custodio</TableHead>
                        <TableHead>Sesión / Estado en Vivo</TableHead>
                        <TableHead>Acciones Firma vs Conexiones</TableHead>
                        <TableHead className="w-44">% Uso en Período</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {!tel?.trazabilidadDispositivos || tel.trazabilidadDispositivos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-20 text-center text-xs text-muted-foreground">
                            No hay dispositivos criptográficos registrados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        tel.trazabilidadDispositivos.map((dev) => (
                          <TableRow key={dev.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="font-mono font-bold text-foreground">{dev.serialNumber}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {dev.marca} {dev.modelo} • VID: {dev.vendorId}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  dev.estadoPatrimonial === 'OPERATIVO' || dev.estadoPatrimonial === 'ASIGNADO'
                                    ? 'success'
                                    : dev.estadoPatrimonial === 'EN_REVISION'
                                    ? 'warning'
                                    : 'danger'
                                }
                                className="text-[10px] font-mono"
                              >
                                {dev.estadoPatrimonial}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {dev.funcionarioAsignado ? (
                                <div>
                                  <div className="font-semibold text-foreground">{dev.funcionarioAsignado.nombre}</div>
                                  <div className="text-[10px] font-mono text-muted-foreground">
                                    {dev.funcionarioAsignado.rut} • {dev.funcionarioAsignado.unidad}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground italic">En custodia TICs</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant={
                                    dev.estadoEnVivo === 'FIRMANDO'
                                      ? 'success'
                                      : dev.estadoEnVivo === 'CONECTADO'
                                      ? 'warning'
                                      : 'danger'
                                  }
                                  className="text-[9px] font-mono"
                                >
                                  {dev.estadoEnVivo}
                                </Badge>
                                {dev.estacionActual && (
                                  <span className="text-[11px] font-mono font-semibold text-foreground">
                                    {dev.estacionActual}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-[11px]">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {dev.firmasPeriodo} firmas
                              </span>{' '}
                              <span className="text-muted-foreground">
                                ({dev.conexionesPeriodo}C / {dev.desconexionesPeriodo}D excl.)
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono">
                                  <span className="font-bold text-foreground">{dev.porcentajeUsoPeriodo}%</span>
                                  <span className="text-muted-foreground">
                                    {new Date(dev.ultimaActividad).toLocaleDateString('es-CL')}
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${Math.min(100, dev.porcentajeUsoPeriodo)}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pestaña 4: Contratos de Obtención de Tokens */}
              {tabTrazabilidad === 'CONTRATOS' && (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader className="bg-muted/40 text-[11px]">
                      <TableRow>
                        <TableHead>Código Contrato / Título</TableHead>
                        <TableHead>Proveedor Adjudicado</TableHead>
                        <TableHead>Fecha Inicio — Fecha Término</TableHead>
                        <TableHead>Tiempo de Caducidad Restante</TableHead>
                        <TableHead>Tokens Contratados</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {listadoContratos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-20 text-center text-xs text-muted-foreground">
                            No hay contratos registrados en el resumen.
                          </TableCell>
                        </TableRow>
                      ) : (
                        listadoContratos.map((c) => (
                          <TableRow key={c.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="font-mono font-bold text-primary">{c.codigoContrato}</div>
                              <div className="text-[11px] font-medium text-foreground">{c.titulo}</div>
                            </TableCell>
                            <TableCell className="text-[11px]">{c.proveedor}</TableCell>
                            <TableCell className="font-mono text-[11px]">
                              <div>Inicio: {c.fechaInicio}</div>
                              <div>Término: {c.fechaTermino}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono font-bold text-[11px]">{c.tiempoCaducidadTexto}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {c.diasRestantes} días restantes
                              </div>
                            </TableCell>
                            <TableCell className="font-mono font-bold">
                              {c.cantidadTokensContratados} tokens
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  c.estadoContrato === 'VIGENTE'
                                    ? 'success'
                                    : c.estadoContrato === 'POR_CADUCAR'
                                    ? 'warning'
                                    : 'danger'
                                }
                                className="text-[10px] font-mono"
                              >
                                {c.estadoContrato}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pestaña 5: Serie Temporal */}
              {tabTrazabilidad === 'EVOLUCION' && (
                <div className="p-3.5 rounded-lg border bg-background/50 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">
                      Evolución de Acciones de Firma y Actividad ({etiquetaPeriodo})
                    </span>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Acciones de Firma (Token)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Conexiones USB
                      </span>
                    </div>
                  </div>

                  <div className="flex items-end gap-1 h-28 pt-4 px-1 border-b pb-2 overflow-x-auto">
                    {serie.map((dia) => {
                      const alturaPct =
                        dia.totalActividad > 0
                          ? Math.max(12, Math.round((dia.totalActividad / maxActividadDia) * 100))
                          : 4;
                      return (
                        <div
                          key={dia.fecha}
                          className="flex flex-col items-center justify-end h-full group min-w-[22px] flex-1"
                          title={`${dia.etiqueta} (${dia.fecha})\nFirmas con Token: ${dia.firmasRealizadas}\nConexiones USB: ${dia.conexionesUsb}\nTotal Eventos: ${dia.totalActividad}`}
                        >
                          <div className="text-[8px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mb-0.5">
                            {dia.firmasRealizadas}F
                          </div>
                          <div
                            className={`w-full max-w-[16px] rounded-t transition-all ${
                              dia.firmasRealizadas > 0
                                ? 'bg-emerald-500 group-hover:bg-emerald-400'
                                : dia.totalActividad > 0
                                ? 'bg-primary/70'
                                : 'bg-muted'
                            }`}
                            style={{ height: `${alturaPct}%` }}
                          />
                          <span className="text-[8px] font-mono text-muted-foreground mt-1 truncate max-w-[32px]">
                            {dia.etiqueta.split(' ')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Previsualización de Código LaTeX + Documento Summary PDF (Req 6) */}
      {modalLatexOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6">
          <Card className="w-full max-w-6xl max-h-[92vh] flex flex-col border-primary/50 bg-card shadow-2xl overflow-hidden">
            <CardHeader className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono border-primary text-primary">
                    EXPORTACIÓN SUMMARY PDF / LATEX
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {etiquetaPeriodo}
                  </Badge>
                </div>
                <CardTitle className="text-sm sm:text-base font-bold mt-1">
                  Previsualización de Código LaTeX (.tex) y Descarga de Summary Estadístico en PDF
                </CardTitle>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-md border bg-background p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setVistaModal('SPLIT')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      vistaModal === 'SPLIT' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    Vista Dividida (LaTeX + PDF)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVistaModal('LATEX')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      vistaModal === 'LATEX' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    Solo Código LaTeX
                  </button>
                  <button
                    type="button"
                    onClick={() => setVistaModal('PDF')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      vistaModal === 'PDF' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    Solo Visor PDF
                  </button>
                </div>

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

            <CardContent className="p-4 flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[460px]">
              {/* Columna Código LaTeX */}
              {(vistaModal === 'SPLIT' || vistaModal === 'LATEX') && (
                <div
                  className={`${
                    vistaModal === 'SPLIT' ? 'lg:col-span-6' : 'lg:col-span-12'
                  } flex flex-col space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-foreground">
                      Código Fuente LaTeX (Summary_{modoReporte}.tex)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopiarLatex}
                        className="h-7 px-2.5 text-[11px] font-mono"
                      >
                        {copiadoLatex ? '✓ Copiado' : 'Copiar Código LaTeX'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDescargarTex}
                        className="h-7 px-2.5 text-[11px] font-mono"
                      >
                        Descargar .tex
                      </Button>
                    </div>
                  </div>
                  {cargandoLatex ? (
                    <div className="flex-1 rounded-lg border bg-muted/40 flex items-center justify-center text-xs font-mono text-muted-foreground">
                      Generando código LaTeX del período seleccionado...
                    </div>
                  ) : (
                    <textarea
                      value={codigoLatex}
                      onChange={(e) => setCodigoLatex(e.target.value)}
                      className="flex-1 w-full min-h-[380px] rounded-lg border border-border bg-zinc-950 text-emerald-400 p-3 font-mono text-[11px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary"
                      spellCheck={false}
                    />
                  )}
                </div>
              )}

              {/* Columna Previsualización PDF */}
              {(vistaModal === 'SPLIT' || vistaModal === 'PDF') && (
                <div
                  className={`${
                    vistaModal === 'SPLIT' ? 'lg:col-span-6' : 'lg:col-span-12'
                  } flex flex-col space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Vista Previa Documento Summary (PDF Compilado)
                    </span>
                    <a
                      href={pdfDownloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-7 px-3 text-xs font-bold shadow-xs"
                    >
                      Descargar Summary como PDF
                    </a>
                  </div>
                  <div className="flex-1 min-h-[380px] rounded-lg border bg-muted/30 overflow-hidden">
                    <iframe
                      src={pdfInlineUrl}
                      title="Previsualización Summary PDF"
                      className="w-full h-full min-h-[380px] border-0"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
