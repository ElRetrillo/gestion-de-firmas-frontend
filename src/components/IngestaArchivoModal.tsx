import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { formatRut } from '../lib/rut';

interface IngestaArchivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  rutPredeterminado?: string;
  onDocumentoIngresado?: (doc: any) => void;
}

export const IngestaArchivoModal: React.FC<IngestaArchivoModalProps> = ({
  isOpen,
  onClose,
  rutPredeterminado = '21.374.808-4',
  onDocumentoIngresado,
}) => {
  const [titulo, setTitulo] = useState('Resolución Exenta N° 408 - Adjudicación de Obras Comunitarias');
  const [tipoTramite, setTipoTramite] = useState('DECRETO_ALCALDICIO');
  const [clasificacion, setClasificacion] = useState<'PUBLICA' | 'INTERNA' | 'CONFIDENCIAL' | 'CRITICA'>('PUBLICA');
  const [rutDestinatario, setRutDestinatario] = useState(rutPredeterminado);
  const [modalidadFirma, setModalidadFirma] = useState<'ATENDIDA' | 'DESATENDIDA'>('ATENDIDA');
  const [firmarInmediatamente, setFirmarInmediatamente] = useState(false);
  const [otpPin, setOtpPin] = useState('1908');
  const [archivoNombre, setArchivoNombre] = useState<string>('');
  const [archivoBase64, setArchivoBase64] = useState<string>('');
  const [archivoTamanoKb, setArchivoTamanoKb] = useState<number>(0);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('El archivo supera el límite de 5MB estipulado por el manual FirmaGob v2.');
      return;
    }

    setErrorMsg(null);
    setArchivoNombre(file.name);
    setArchivoTamanoKb(Math.round(file.size / 1024));

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Clean = result.split(',')[1] || result;
      setArchivoBase64(base64Clean);
    };
    reader.readAsDataURL(file);
  };

  const handleEnviarIngesta = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErrorMsg(null);
    setResultado(null);

    try {
      const payload: any = {
        tituloDocumento: titulo.trim(),
        tipoTramite,
        clasificacion,
        rutDestinatario: rutDestinatario.trim(),
        modalidadFirma,
        firmarInmediatamente,
        sistemaOrigen: 'API_EXTERNA_MUNICIPAL',
        requiereFePublica: tipoTramite.includes('DECRETO'),
      };

      if (archivoBase64) {
        payload.archivoBase64 = archivoBase64;
        payload.nombreArchivo = archivoNombre || 'documento.pdf';
        payload.contentType = 'application/pdf';
      }

      if (firmarInmediatamente && otpPin) {
        payload.otp = otpPin.trim();
      }

      const res = await fetch('/api/v1/firmas/ingesta-archivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al procesar ingesta de archivo');
      }

      setResultado(data);
      if (onDocumentoIngresado) {
        onDocumentoIngresado(data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión con la API de Ingesta');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-2xl border-border/80 shadow-2xl bg-card overflow-hidden max-h-[90vh] flex flex-col">
        <CardHeader className="p-5 pb-3 border-b bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/40">
                CASO DE USO 1 • INGESTA API REST
              </Badge>
              <Badge variant="secondary" className="font-mono text-[10px]">
                FirmaGob v2 Ready
              </Badge>
            </div>
            <CardTitle className="text-base font-bold text-foreground mt-1">
              Ingesta de Archivo Externo para Firma
            </CardTitle>
            <CardDescription className="text-xs">
              Simula la llegada de un documento por API externa, lo asigna a la bandeja del funcionario y permite su firma interna con Token o descarga inmediata.
            </CardDescription>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-mono text-muted-foreground hover:text-foreground p-1"
          >
            [✕]
          </button>
        </CardHeader>

        <CardContent className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[11px]">
              {errorMsg}
            </div>
          )}

          {resultado ? (
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1.5">
                  <span>✓</span> Archivo Ingresado Exitosamente al Sistema
                </span>
                <Badge variant="success" className="font-mono text-[10px]">
                  {resultado.solicitud?.estadoAprobacion || 'OK'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-background/60 p-3 rounded-lg border font-mono">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Código Documento:</span>
                  <span className="font-bold text-foreground">{resultado.solicitud?.codigoDocumento}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Destinatario Asignado:</span>
                  <span className="font-bold text-foreground">{resultado.solicitud?.usuarioSolicitante?.rut || rutDestinatario}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Checksum SHA-256 Original:</span>
                  <span className="truncate block text-foreground" title={resultado.solicitud?.hashSha256}>
                    {resultado.solicitud?.hashSha256?.substring(0, 24)}...
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Modalidad Solicitada:</span>
                  <span className="text-foreground">{modalidadFirma}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {resultado.urlDescargaOriginal && (
                  <a
                    href={resultado.urlDescargaOriginal}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted"
                  >
                    Descargar PDF Original
                  </a>
                )}
                {resultado.solicitud?.estadoAprobacion === 'FIRMADA' && resultado.urlDescargaFirmado && (
                  <a
                    href={resultado.urlDescargaFirmado}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
                  >
                    Descargar PDF Firmado con Sello FEA
                  </a>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    setResultado(null);
                    onClose();
                  }}
                  className="ml-auto text-xs font-semibold"
                >
                  Volver a Bandeja
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEnviarIngesta} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Título / Materia del Documento:</label>
                  <Input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    required
                    placeholder="Ej: Resolución Exenta N° 408"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">RUT Funcionario Destinatario:</label>
                  <Input
                    value={rutDestinatario}
                    onChange={(e) => setRutDestinatario(formatRut(e.target.value))}
                    required
                    placeholder="Ej: 21.374.808-4"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Tipo de Trámite:</label>
                  <select
                    value={tipoTramite}
                    onChange={(e) => setTipoTramite(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
                  >
                    <option value="DECRETO_ALCALDICIO">DECRETO_ALCALDICIO</option>
                    <option value="RESOLUCION_EXENTA">RESOLUCION_EXENTA</option>
                    <option value="OFICIO_ORDINARIO">OFICIO_ORDINARIO</option>
                    <option value="CONVENIO_MUNICIPAL">CONVENIO_MUNICIPAL</option>
                    <option value="ACTA_ADJUDICACION">ACTA_ADJUDICACION</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Clasificación:</label>
                  <select
                    value={clasificacion}
                    onChange={(e) => setClasificacion(e.target.value as any)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
                  >
                    <option value="PUBLICA">PUBLICA</option>
                    <option value="INTERNA">INTERNA</option>
                    <option value="CONFIDENCIAL">CONFIDENCIAL</option>
                    <option value="CRITICA">CRITICA</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Modalidad Firma:</label>
                  <select
                    value={modalidadFirma}
                    onChange={(e) => setModalidadFirma(e.target.value as any)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
                  >
                    <option value="ATENDIDA">ATENDIDA (Token / OTP)</option>
                    <option value="DESATENDIDA">DESATENDIDA (Automática)</option>
                  </select>
                </div>
              </div>

              {/* Subir archivo real o usar plantilla A4 */}
              <div className="space-y-1.5 p-3 rounded-lg border bg-muted/30">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>Archivo PDF a Enviar:</span>
                  <span className="text-[10px] text-muted-foreground">Máx. 5 MB (Manual FirmaGob v2)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleSeleccionarArchivo}
                    className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border file:border-border file:text-xs file:font-semibold file:bg-background hover:file:bg-muted cursor-pointer"
                  />
                  {archivoNombre ? (
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                      ✓ {archivoNombre} ({archivoTamanoKb} KB)
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground italic">
                      (Si no seleccionas archivo, el backend generará automáticamente un PDF A4 oficial de prueba)
                    </span>
                  )}
                </div>
              </div>

              {/* Opción de firma instantánea */}
              <div className="p-3 rounded-lg border bg-background space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground block">Firmar Inmediatamente al Recibir:</span>
                    <span className="text-[10px] text-muted-foreground">
                      Si se activa, el backend ejecuta el protocolo v2 en el acto y lo entrega listo para descarga.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={firmarInmediatamente}
                    onChange={(e) => setFirmarInmediatamente(e.target.checked)}
                    className="h-4 w-4 rounded border-input cursor-pointer"
                  />
                </div>

                {firmarInmediatamente && (
                  <div className="pt-2 border-t flex items-center gap-3">
                    <label className="text-[11px] font-semibold text-foreground">PIN o Código OTP:</label>
                    <Input
                      type="password"
                      value={otpPin}
                      onChange={(e) => setOtpPin(e.target.value)}
                      placeholder="Ej: 1908 o 6 dígitos OTP"
                      className="h-7 w-36 text-xs font-mono"
                    />
                    <span className="text-[10px] text-muted-foreground font-mono">
                      (Acepta PIN usuario o OTP de prueba)
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="text-xs h-9"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={enviando}
                  className="text-xs font-bold h-9 px-4"
                >
                  {enviando ? 'Ingresando vía API...' : 'Simular Ingesta API y Enviar'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
