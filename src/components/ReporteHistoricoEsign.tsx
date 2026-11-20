import React, { useId, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Clock, Ban, Search } from 'lucide-react';
import {
  RESUMEN_ESIGN_2025_2026,
  REGISTROS_ESIGN_2025_2026,
  PeriodoEsign,
  EstadoEsign,
} from '../data/reporteEsign2025_2026';
import { Card, CardHeader, CardDescription, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { formatRutVisual, matchesRutSearch } from '../lib/rut';

type FiltroEstado = 'TODOS' | 'EMITIDO' | 'EXPIRADO' | 'REVOCADO';

const OPCIONES_PERIODO: Array<{ id: PeriodoEsign; label: string }> = [
  { id: '2025-2026', label: '2025–2026' },
  { id: '2025', label: '2025' },
  { id: '2026', label: '2026' },
];

const OPCIONES_ESTADO: FiltroEstado[] = ['TODOS', 'EMITIDO', 'EXPIRADO', 'REVOCADO'];

function renderEstadoBadge(estado: EstadoEsign) {
  switch (estado) {
    case 'EMITIDO':
      return (
        <Badge variant="success" className="gap-1 whitespace-nowrap">
          <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>EMITIDO</span>
        </Badge>
      );
    case 'EXPIRADO':
      return (
        <Badge variant="warning" className="gap-1 whitespace-nowrap">
          <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>EXPIRADO</span>
        </Badge>
      );
    case 'REVOCADO':
      return (
        <Badge variant="danger" className="gap-1 whitespace-nowrap">
          <Ban className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>REVOCADO</span>
        </Badge>
      );
    default:
      return <Badge variant="secondary">{estado}</Badge>;
  }
}

export const ReporteHistoricoEsign: React.FC = () => {
  const [periodo, setPeriodo] = useState<PeriodoEsign>('2025-2026');
  const [nominaAbierta, setNominaAbierta] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('TODOS');

  const resumenHeadingId = useId();
  const nominaHeadingId = useId();
  const nominaPanelId = useId();
  const searchInputId = useId();

  const resumenActual = RESUMEN_ESIGN_2025_2026[periodo];

  const registrosPorPeriodo = useMemo(() => {
    if (periodo === '2025-2026') return REGISTROS_ESIGN_2025_2026;
    return REGISTROS_ESIGN_2025_2026.filter((r) => r.anio === periodo);
  }, [periodo]);

  const registrosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return registrosPorPeriodo.filter((r) => {
      if (filtroEstado !== 'TODOS' && r.estado !== filtroEstado) {
        return false;
      }
      if (!q) return true;
      return (
        r.nombre.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.cargo.toLowerCase().includes(q) ||
        r.numeroSerie.toLowerCase().includes(q) ||
        matchesRutSearch(r.rut, q)
      );
    });
  }, [registrosPorPeriodo, filtroEstado, busqueda]);

  return (
    <Card className="border-border/80 bg-card shadow-sm overflow-hidden">
      <CardHeader className="p-4 border-b bg-muted/20 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h2 className="text-sm sm:text-base font-bold leading-none tracking-tight text-foreground">
            Estadísticas del Sistema — Reporte Histórico E-Sign (2025–2026)
          </h2>
          <CardDescription className="text-xs">
            Vista estática generada desde ReporteFG_2026106.xls (no modificable por telemetría en vivo).
          </CardDescription>
        </div>

        <div
          className="inline-flex flex-wrap items-center rounded-lg border bg-background p-0.5 gap-0.5 self-start lg:self-auto"
          role="group"
          aria-label="Selector de período del reporte E-Sign"
        >
          {OPCIONES_PERIODO.map((op) => {
            const activo = periodo === op.id;
            return (
              <button
                key={op.id}
                type="button"
                aria-pressed={activo}
                onClick={() => setPeriodo(op.id)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  activo
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {op.label}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h3 id={resumenHeadingId} className="text-sm font-bold text-foreground">
            Estadísticas
          </h3>
          <span className="text-[11px] font-mono text-muted-foreground">
            {resumenActual.periodoLabel}
          </span>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-labelledby={resumenHeadingId}
          className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <table className="border border-border border-collapse w-full text-xs sm:text-sm">
            <caption className="sr-only">
              Resumen de certificados E-Sign para {resumenActual.periodoLabel}
            </caption>
            <thead>
              <tr className="bg-muted/70 border-b border-border text-foreground">
                <th scope="col" className="px-3 py-2.5 text-left font-semibold border-r border-border whitespace-nowrap">
                  Entidad
                </th>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold border-r border-border whitespace-nowrap">
                  Activa
                </th>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold border-r border-border whitespace-nowrap">
                  Contratados FG
                </th>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold border-r border-border whitespace-nowrap">
                  Emitidos FG
                </th>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold border-r border-border whitespace-nowrap">
                  Expirados FG
                </th>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold border-r border-border whitespace-nowrap">
                  Suspendidos FG
                </th>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold border-r border-border whitespace-nowrap">
                  Revocados FG
                </th>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">
                  Disponibles FG
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-background hover:bg-muted/20 transition-colors">
                <th scope="row" className="px-3 py-2.5 text-left font-medium text-foreground border-r border-border whitespace-nowrap">
                  {resumenActual.entidad}
                </th>
                <td className="px-3 py-2.5 text-center border-r border-border whitespace-nowrap">
                  {resumenActual.activa}
                </td>
                <td className="px-3 py-2.5 text-center font-mono tabular-nums border-r border-border">
                  {resumenActual.contratadosFg}
                </td>
                <td className="px-3 py-2.5 text-center font-mono tabular-nums border-r border-border">
                  {resumenActual.emitidosFg}
                </td>
                <td className="px-3 py-2.5 text-center font-mono tabular-nums border-r border-border">
                  {resumenActual.expiradosFg}
                </td>
                <td className="px-3 py-2.5 text-center font-mono tabular-nums border-r border-border">
                  {resumenActual.suspendidosFg}
                </td>
                <td className="px-3 py-2.5 text-center font-mono tabular-nums border-r border-border">
                  {resumenActual.revocadosFg}
                </td>
                <td className="px-3 py-2.5 text-center font-mono tabular-nums">
                  {resumenActual.disponiblesFg}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-center text-[11px] font-mono text-muted-foreground">
          E-Sign 2025–2026 • Fuente fija: ReporteFG_2026106.xls
        </p>

        <div className="pt-2 border-t border-border/70">
          <button
            type="button"
            aria-expanded={nominaAbierta}
            aria-controls={nominaPanelId}
            onClick={() => setNominaAbierta((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 hover:bg-muted/70 px-3 py-2 text-xs font-semibold text-foreground transition-colors"
          >
            {nominaAbierta ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <span>Ver nómina filtrada 2025–2026 ({registrosPorPeriodo.length} registros)</span>
          </button>

          {nominaAbierta && (
            <div id={nominaPanelId} className="mt-3 space-y-3">
              <search className="flex flex-col md:flex-row md:items-end justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <label htmlFor={searchInputId} className="block text-xs font-semibold text-foreground">
                    Buscar en nómina E-Sign
                  </label>
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                    <Input
                      id={searchInputId}
                      name="busquedaNominaEsign"
                      type="search"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Nombre, RUT, correo, cargo o N° serie..."
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="h-8 pl-8 text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="block text-xs font-semibold text-foreground">
                    Filtrar por estado
                  </span>
                  <div className="inline-flex flex-wrap items-center rounded-md border border-border bg-background p-0.5 gap-0.5" role="group" aria-label="Filtro por estado de certificado">
                    {OPCIONES_ESTADO.map((estadoOp) => {
                      const activo = filtroEstado === estadoOp;
                      return (
                        <button
                          key={estadoOp}
                          type="button"
                          aria-pressed={activo}
                          onClick={() => setFiltroEstado(estadoOp)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                            activo
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {estadoOp}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </search>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <h3 id={nominaHeadingId} className="font-semibold text-foreground">
                  Nómina histórica filtrada ({periodo === '2025-2026' ? '2025–2026' : `Año ${periodo}`})
                </h3>
                <span className="font-mono text-[11px]" role="status" aria-live="polite">
                  Mostrando {registrosFiltrados.length} de {registrosPorPeriodo.length} registros
                </span>
              </div>

              {registrosFiltrados.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  No se encontraron registros que coincidan con la búsqueda o el estado seleccionado.
                </div>
              ) : (
                <div
                  tabIndex={0}
                  role="region"
                  aria-labelledby={nominaHeadingId}
                  className="overflow-x-auto max-h-[420px] rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <table className="w-full border-collapse text-xs">
                    <caption className="sr-only">
                      Nómina de certificados E-Sign emitidos en {periodo === '2025-2026' ? '2025 y 2026' : periodo}
                    </caption>
                    <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm border-b border-border">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                          Titular / Correo
                        </th>
                        <th scope="col" className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                          RUT
                        </th>
                        <th scope="col" className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                          Cargo
                        </th>
                        <th scope="col" className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                          N° Serie
                        </th>
                        <th scope="col" className="px-3 py-2 text-center font-semibold whitespace-nowrap">
                          Estado
                        </th>
                        <th scope="col" className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                          Validez / Expiración
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                      {registrosFiltrados.map((reg) => (
                        <tr key={`${reg.numeroSerie}-${reg.rut}-${reg.fechaValidez}`} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 min-w-[200px]">
                            <div className="font-semibold text-foreground">{reg.nombre}</div>
                            <div className="text-[11px] font-mono text-muted-foreground">{reg.email}</div>
                          </td>
                          <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">
                            {formatRutVisual(reg.rut)}
                          </td>
                          <td className="px-3 py-2 min-w-[160px] text-muted-foreground">
                            {reg.cargo}
                          </td>
                          <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">
                            {reg.numeroSerie}
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            {renderEstadoBadge(reg.estado)}
                          </td>
                          <td className="px-3 py-2 font-mono whitespace-nowrap text-muted-foreground">
                            <div>
                              {reg.fechaValidez} → {reg.fechaExpiracion}
                            </div>
                            {reg.fechaRevocacion && (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400">
                                Revocado: {reg.fechaRevocacion}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReporteHistoricoEsign;
