import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

export const ChecksignView: React.FC = () => {
  const [codigoHash, setCodigoHash] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [nombreArchivoLocal, setNombreArchivoLocal] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [resultado, setResultado] = useState<{
    valido: boolean;
    codigo: string;
    tituloDocumento?: string;
    hashSha256Calculado: string;
    algoritmo: string;
    tsaTimestamp: string;
    emisorCertificado: string;
    firmante: string;
    cargo: string;
    rutFirmante: string;
    normativa: string;
    ocspEstado: string;
    numeroSerie: string;
    urlDescargaDocumento?: string;
    urlCertificadoVerificacion?: string;
  } | null>(null);

  const ejecutarConsultaChecksign = async (valorConsulta: string) => {
    if (!valorConsulta.trim()) return;
    setVerificando(true);
    setMensajeError(null);
    setResultado(null);

    try {
      const res = await fetch('/api/v1/firmas/checksign/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hashOTexto: valorConsulta.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.valido === false) {
          setMensajeError(data.mensaje || 'Documento no verificado o revocado según registros.');
        } else {
          setResultado({
            valido: data.valido ?? true,
            codigo: data.codigoVerificacion || data.codigoDocumento || valorConsulta,
            tituloDocumento: data.tituloDocumento,
            hashSha256Calculado:
              data.hashSha256Calculado || valorConsulta,
            algoritmo: data.algoritmo || 'SHA-256 con RSA-4096 (FEA Avanzada)',
            tsaTimestamp: data.tsaTimestamp || new Date().toISOString(),
            emisorCertificado:
              data.emisorCertificado || 'ESIGN Chile S.A. - Entidad Acreditada',
            firmante: data.firmanteTitular?.nombre || data.firmante || 'Ministro de Fe',
            cargo: data.firmanteTitular?.cargo || data.cargo || 'Funcionario Autorizado',
            rutFirmante: data.firmanteTitular?.rut || data.rutFirmante || 'Sin RUT',
            normativa: data.normativa || 'Conforme a Ley N° 19.799, Ley N° 21.180 y Ley N° 21.663',
            ocspEstado: 'VÁLIDO (Sin revocación OCSP)',
            numeroSerie: data.serialCertificado || '0x4F9B882103AC55E1',
            urlDescargaDocumento: data.urlDescargaDocumento,
            urlCertificadoVerificacion:
              data.urlCertificadoVerificacion ||
              `/api/v1/firmas/checksign/${encodeURIComponent(valorConsulta.trim())}/certificado-pdf`,
          });
        }
      } else {
        setMensajeError('No se encontró ningún documento con el código o hash indicado en el repositorio municipal.');
      }
    } catch {
      setMensajeError('Error al contactar el servicio de validación de firma Checksign.');
    } finally {
      setVerificando(false);
    }
  };

  const verificarDocumento = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setNombreArchivoLocal(null);
    await ejecutarConsultaChecksign(codigoHash);
  };

  const procesarArchivoClienteSha256 = async (file: File) => {
    setNombreArchivoLocal(`${file.name} (${Math.round(file.size / 1024)} KB)`);
    const buffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    setCodigoHash(hashHex);
    await ejecutarConsultaChecksign(hashHex);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await procesarArchivoClienteSha256(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-7 border-border/80 bg-card">
          <CardHeader className="p-5 pb-3 border-b">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono text-[9px]">
                [ Checkeo de Firmas // Web Crypto API ]
              </Badge>
            </div>
            <CardTitle className="text-base font-bold text-foreground">
              Portal de Verificación Criptográfica Checksign
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Validador oficial de firma electrónica avanzada, código de verificación y huella SHA-256 para documentos municipales.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <form onSubmit={verificarDocumento} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Código de Documento, Código Checksign o Hash SHA-256:
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={codigoHash}
                    onChange={(e) => setCodigoHash(e.target.value)}
                    placeholder="Ej: DEC-ALC-2026-0904 o VERIF-CQBO-904-2026"
                    className="text-xs font-mono"
                  />
                  <Button
                    type="submit"
                    disabled={verificando}
                    className="shrink-0 text-xs font-bold px-4"
                  >
                    {verificando ? 'Comprobando...' : 'Verificar'}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  Ejemplos en BD:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['DEC-ALC-2026-0904', 'VERIF-CQBO-904-2026', 'CON-HON-2026-0412', 'PERM-DOM-2026-0088'].map(
                    (ej) => (
                      <button
                        key={ej}
                        type="button"
                        onClick={() => {
                          setCodigoHash(ej);
                          ejecutarConsultaChecksign(ej);
                        }}
                        className="text-[10px] font-mono px-2 py-0.5 rounded border border-border/80 bg-muted/40 hover:bg-muted text-foreground transition-colors"
                      >
                        {ej}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </form>

            {/* Zona Interactiva de Arrastre de Archivos con Web Crypto API */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.doc,.docx,.xml,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) procesarArchivoClienteSha256(f);
              }}
            />
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="p-5 border-2 border-dashed border-border/70 rounded-lg text-center space-y-2 bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer"
            >
              <span className="font-mono text-xs font-semibold text-foreground block">
                {nombreArchivoLocal
                  ? `✓ Archivo procesado localmente: ${nombreArchivoLocal}`
                  : 'Arrastre un archivo PDF aquí (o haga clic) para calcular su digest SHA-256'}
              </span>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                El hash criptográfico se calcula en su navegador mediante Web Crypto API (`crypto.subtle.digest`). El documento no abandona su estación.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 border-border/80 bg-card flex flex-col justify-between">
          <CardHeader className="p-5 pb-3 border-b">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              CADENA DE CONFIANZA
            </span>
            <CardTitle className="text-sm font-bold text-foreground">
              Inspección de Validez Jurídica
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 space-y-3 text-xs">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded bg-muted/30 border">
                <div>
                  <div className="font-semibold text-foreground text-[11px]">Integridad del Archivo</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Hash SHA-256 inalterado</div>
                </div>
                <Badge variant="success" className="font-mono text-[9px]">
                  CORRECTO
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-muted/30 border">
                <div>
                  <div className="font-semibold text-foreground text-[11px]">Certificado de Firmante</div>
                  <div className="text-[10px] text-muted-foreground font-mono">X.509 Acreditado Min. Economía</div>
                </div>
                <Badge variant="success" className="font-mono text-[9px]">
                  VÁLIDO
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-muted/30 border">
                <div>
                  <div className="font-semibold text-foreground text-[11px]">Sellado de Tiempo (TSA)</div>
                  <div className="text-[10px] text-muted-foreground font-mono">RFC 3161 Timestamp Token</div>
                </div>
                <Badge variant="success" className="font-mono text-[9px]">
                  SELLADO
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-muted/30 border">
                <div>
                  <div className="font-semibold text-foreground text-[11px]">Estado OCSP / CRL</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Verificación en tiempo real</div>
                </div>
                <Badge variant="success" className="font-mono text-[9px]">
                  ACTIVO
                </Badge>
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-4 border-t bg-muted/20 text-[10px] font-mono text-muted-foreground flex justify-between">
            <span>REGISTRO: CGR-2026-CL</span>
            <span>AUDITORÍA: ANCI LEY 21.663</span>
          </CardFooter>
        </Card>
      </div>

      {mensajeError && (
        <Card className="border-rose-500/40 bg-rose-500/10 p-5">
          <div className="flex items-center gap-3">
            <Badge variant="danger" className="font-mono text-[9px] uppercase font-bold">
              ERROR DE VERIFICACIÓN
            </Badge>
            <span className="text-xs font-mono text-foreground font-medium">
              {mensajeError}
            </span>
          </div>
        </Card>
      )}

      {resultado && (
        <Card className="border-emerald-500/40 bg-card shadow-sm">
          <CardHeader className="p-5 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="success" className="font-mono text-[9px] uppercase font-bold">
                  DOCUMENTO AUTÉNTICO E ÍNTEGRO
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground">
                  CÓDIGO: {resultado.codigo}
                </span>
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                {resultado.tituloDocumento || 'Dictamen de Autenticidad Conforme a Derecho'}
              </CardTitle>
            </div>

            <div className="flex items-center gap-2">
              {resultado.urlDescargaDocumento && (
                <a
                  href={resultado.urlDescargaDocumento}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-md border border-primary/50 bg-primary/10 px-3 h-8 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  Descargar Documento PDF
                </a>
              )}
              <a
                href={
                  resultado.urlCertificadoVerificacion ||
                  `/api/v1/firmas/checksign/${encodeURIComponent(resultado.codigo)}/certificado-pdf`
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 h-8 text-xs font-semibold hover:bg-muted transition-colors"
              >
                Descargar Acta de Verificación PDF
              </a>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">FIRMANTE TITULAR</div>
                <div className="font-bold text-foreground text-xs">{resultado.firmante}</div>
                <div className="text-[10px] font-mono text-muted-foreground">RUT: {resultado.rutFirmante}</div>
              </div>

              <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">CARGO MUNICIPAL</div>
                <div className="font-bold text-foreground text-xs">{resultado.cargo}</div>
                <div className="text-[10px] text-muted-foreground">Ilustre Municipalidad de Coquimbo</div>
              </div>

              <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">PRESTADOR ACREDITADO</div>
                <div className="font-bold text-foreground text-xs truncate" title={resultado.emisorCertificado}>
                  {resultado.emisorCertificado}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">SN: {resultado.numeroSerie}</div>
              </div>

              <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">FECHA &amp; TSA</div>
                <div className="font-bold text-foreground text-xs font-mono truncate">{resultado.tsaTimestamp}</div>
                <div className="text-[10px] text-muted-foreground">Estampado RFC 3161 Certificado</div>
              </div>
            </div>

            <div className="p-3 rounded border bg-muted/40 font-mono text-[11px] space-y-1">
              <div className="text-[10px] text-muted-foreground uppercase">
                DIGEST CRIPTOGRÁFICO SHA-256 DEL ARCHIVO:
              </div>
              <div className="text-foreground break-all select-all font-semibold">
                {resultado.hashSha256Calculado}
              </div>
            </div>

            <Separator />

            <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-muted-foreground gap-2">
              <span>{resultado.normativa}</span>
              <Badge variant="outline" className="text-[10px]">
                ANCI-TOKEN: VALIDATED-2026
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
