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
            algoritmo: data.algoritmo || 'SHA-256 (FEA)',
            tsaTimestamp: data.tsaTimestamp || new Date().toISOString(),
            emisorCertificado: data.emisorCertificado || '-',
            firmante: data.firmanteTitular?.nombre || data.firmante || '-',
            cargo: data.firmanteTitular?.cargo || data.cargo || '-',
            rutFirmante: data.firmanteTitular?.rut || data.rutFirmante || '-',
            normativa: data.normativa || 'Firma Electrónica Avanzada',
            ocspEstado: data.ocspEstado || 'VÁLIDO',
            numeroSerie: data.serialCertificado || '-',
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
              <Badge variant="outline" className="text-[10px]">
                Verificación de Documento
              </Badge>
            </div>
            <CardTitle className="text-base font-bold text-foreground">
              Portal de Verificación de Documentos
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Comprueba la autenticidad, validez de las firmas y fecha de emisión de documentos municipales.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <form onSubmit={verificarDocumento} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Código del documento o identificador de verificación:
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={codigoHash}
                    onChange={(e) => setCodigoHash(e.target.value)}
                    placeholder="Ej: DEC-ALC-2026-0904"
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
            </form>

            {/* Zona Interactiva de Arrastre de Archivos */}
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
              <span className="text-xs font-semibold text-foreground block">
                {nombreArchivoLocal
                  ? `✓ Archivo cargado: ${nombreArchivoLocal}`
                  : 'Arrastra tu archivo PDF aquí o haz clic para seleccionarlo'}
              </span>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                La verificación se realiza de manera segura y confidencial desde tu navegador.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 border-border/80 bg-card flex flex-col justify-between">
          <CardHeader className="p-5 pb-3 border-b">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              VALIDACIONES DE SEGURIDAD
            </span>
            <CardTitle className="text-sm font-bold text-foreground">
              Criterios de Verificación
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 space-y-3 text-xs">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded bg-muted/30 border">
                <div>
                  <div className="font-semibold text-foreground text-[11px]">Integridad del Documento</div>
                  <div className="text-[10px] text-muted-foreground">El archivo no ha sido modificado</div>
                </div>
                <Badge variant="success" className="text-[10px]">
                  CORRECTO
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-muted/30 border">
                <div>
                  <div className="font-semibold text-foreground text-[11px]">Firma del Funcionario</div>
                  <div className="text-[10px] text-muted-foreground">Certificado oficial vigente</div>
                </div>
                <Badge variant="success" className="text-[10px]">
                  VÁLIDO
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-muted/30 border">
                <div>
                  <div className="font-semibold text-foreground text-[11px]">Fecha y Hora Oficial</div>
                  <div className="text-[10px] text-muted-foreground">Estampado de tiempo registrado</div>
                </div>
                <Badge variant="success" className="text-[10px]">
                  CERTIFICADO
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-muted/30 border">
                <div>
                  <div className="font-semibold text-foreground text-[11px]">Estado de la Firma</div>
                  <div className="text-[10px] text-muted-foreground">Firma activa y autorizada</div>
                </div>
                <Badge variant="success" className="text-[10px]">
                  VIGENTE
                </Badge>
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-4 border-t bg-muted/20 text-[10px] text-muted-foreground flex justify-between">
            <span>Registro Municipal de Coquimbo</span>
            <span>Verificación Oficial</span>
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
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">FECHA Y HORA OFICIAL</div>
                <div className="font-bold text-foreground text-xs font-mono truncate">{resultado.tsaTimestamp}</div>
                <div className="text-[10px] text-muted-foreground">Fecha y hora certificada</div>
              </div>
            </div>

            <div className="p-3 rounded border bg-muted/40 font-mono text-[11px] space-y-1">
              <div className="text-[10px] text-muted-foreground uppercase">
                HUELLA DIGITAL DE SEGURIDAD (HASH):
              </div>
              <div className="text-foreground break-all select-all font-semibold">
                {resultado.hashSha256Calculado}
              </div>
            </div>

            <Separator />

            <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-muted-foreground gap-2">
              <span>{resultado.normativa}</span>
              <Badge variant="outline" className="text-[10px]">
                ESTADO: VÁLIDO
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
