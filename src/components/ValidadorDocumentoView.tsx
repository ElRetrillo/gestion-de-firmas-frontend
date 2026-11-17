import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Download, Search, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { LogoMunicipalidad } from './LogoMunicipalidad';
import { ThemeToggle } from './ThemeToggle';

interface ResultadoValidacion {
  valido: boolean;
  codigoVerificacion: string;
  codigoDocumento: string;
  titulo: string;
  tipoTramite: string;
  estado: string;
  fechaFirma: string;
  firmante: {
    nombre: string;
    unidad: string;
    cargo: string;
  };
  hashSha256: string;
  pdfUrl: string;
}

export const ValidadorDocumentoView: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const codigoInicial = params.get('codigo') || '';

  const [codigoInput, setCodigoInput] = useState(codigoInicial);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoValidacion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const consultarCodigo = async (codigo: string) => {
    const limpio = codigo.trim();
    if (!limpio) return;
    setCargando(true);
    setError(null);
    setResultado(null);
    try {
      const res = await fetch(`/api/v1/firmas/repositorio/${encodeURIComponent(limpio)}/validar`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `No se encontró el documento ${limpio}`);
      }
      setResultado(data);
    } catch (err: any) {
      setError(err.message || 'No fue posible validar el documento.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (codigoInicial) {
      consultarCodigo(codigoInicial);
    }
  }, [codigoInicial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = codigoInput.trim();
    if (!limpio) return;
    window.history.replaceState({}, '', `/validar?codigo=${encodeURIComponent(limpio)}`);
    consultarCodigo(limpio);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col bg-tech-grid">
      <header className="border-b border-border/60 bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <LogoMunicipalidad variant="header" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">
                Validador de Documentos
              </span>
              <span className="text-[10px] font-mono text-muted-foreground block truncate">
                I. Municipalidad de Coquimbo
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Inicio</span>
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl space-y-5">
          <div className="text-center space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Verificar Autenticidad de Documento
            </h1>
            <p className="text-xs text-muted-foreground">
              Ingresa o escanea el código de verificación para consultar el respaldo oficial del documento firmado.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={codigoInput}
              onChange={(e) => setCodigoInput(e.target.value)}
              placeholder="Ej: CQM-163737-B251"
              className="font-mono text-sm h-11"
            />
            <Button type="submit" disabled={cargando} className="h-11 px-5 font-bold gap-1.5">
              <Search className="w-4 h-4" />
              <span>{cargando ? 'Buscando...' : 'Validar'}</span>
            </Button>
          </form>

          {error && (
            <Card className="border-rose-500/40 bg-rose-500/10">
              <CardContent className="p-4 flex items-center gap-3 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </CardContent>
            </Card>
          )}

          {resultado && (
            <Card className="border-emerald-500/40 bg-card shadow-xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 border-b pb-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>Documento Válido en Repositorio</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                    {resultado.estado}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Código de Verificación</span>
                    <span className="font-mono font-bold text-foreground">{resultado.codigoVerificacion}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Fecha de Firma</span>
                    <span className="font-mono text-foreground">{new Date(resultado.fechaFirma).toLocaleString('es-CL')}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Documento</span>
                    <span className="font-semibold text-foreground">{resultado.titulo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Firmante / Solicitante</span>
                    <span className="text-foreground font-medium">{resultado.firmante.nombre}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Unidad Municipal</span>
                    <span className="text-foreground">{resultado.firmante.unidad}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Huella SHA-256</span>
                    <span className="font-mono text-[10px] text-muted-foreground break-all">{resultado.hashSha256}</span>
                  </div>
                </div>

                <div className="pt-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-[11px] text-muted-foreground text-center">
                  Documento verificado criptográficamente. Por resguardo de datos personales (Ley N° 21.719), la descarga del PDF está restringida al titular firmante.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};
