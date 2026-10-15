import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { useAuthStore } from '../store/useAuthStore';

interface PortalCiudadanoProps {
  onGoToChecksign: () => void;
  onOpenLogin: () => void;
}

export const PortalCiudadano: React.FC<PortalCiudadanoProps> = ({
  onGoToChecksign,
  onOpenLogin,
}) => {
  const { usuario, isAutenticado } = useAuthStore();
  const [codigoDocumento, setCodigoDocumento] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [resultado, setResultado] = useState<any | null>(null);

  const handleVerificar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoDocumento.trim()) return;

    setVerificando(true);
    setTimeout(() => {
      setResultado({
        codigo: codigoDocumento,
        valido: true,
        tipo: 'Decreto Alcaldicio Exento N° 451/2026',
        firmante: 'Patricio Reyes Morales',
        cargo: 'Secretario Municipal y Ministro de Fe',
        fecha: '15 de Octubre de 2026, 11:32 hrs',
        normativa: 'Firma Electrónica Avanzada conforme a Ley N° 19.799',
      });
      setVerificando(false);
    }, 500);
  };

  const tramitesFrecuentes = [
    {
      titulo: 'Certificado de Residencia',
      descripcion: 'Obtención y validación inmediata con código QR municipal.',
      plazo: 'Inmediato',
    },
    {
      titulo: 'Decretos y Resoluciones Alcaldicias',
      descripcion: 'Consulta pública de actos administrativos promulgados.',
      plazo: 'Vigencia oficial',
    },
    {
      titulo: 'Certificado de Número y Urbanismo',
      descripcion: 'Descarga de instrumentos visados por la Dirección de Obras.',
      plazo: '48 hrs hábiles',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Banner de Bienvenida Amigable para el Vecino */}
      <Card className="border-border/80 bg-gradient-to-r from-blue-50/50 via-background to-amber-50/30 dark:from-blue-950/20 dark:via-background dark:to-amber-950/10">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider">
                PORTAL CIUDADANO • ATENCIÓN AL VECINO
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Bienvenido al Portal Digital de Coquimbo
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                Revisa la validez jurídica de tus documentos municipales, consulta trámites y verifica firmas electrónicas emitidas por las autoridades municipales.
              </p>
            </div>

            {isAutenticado && (
              <div className="p-3 rounded-lg bg-card border text-xs space-y-1">
                <span className="text-muted-foreground block text-[10px] uppercase font-mono">
                  Sesión Iniciada
                </span>
                <div className="font-semibold text-foreground">{usuario.nombre}</div>
                <div className="text-[11px] text-muted-foreground font-mono">RUT: {usuario.rut}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comprobador Rápido de Documentos */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">
            Verificar un Documento o Certificado Municipal
          </CardTitle>
          <CardDescription className="text-xs">
            Ingresa el código alfanumérico que aparece al pie de tu documento (o bajo el código QR)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleVerificar} className="flex flex-col sm:flex-row gap-2">
            <Input
              type="text"
              value={codigoDocumento}
              onChange={(e) => setCodigoDocumento(e.target.value)}
              placeholder="Ejemplo: DEC-2026-904 o folio de trámite..."
              className="text-xs h-9 font-mono flex-1"
            />
            <Button
              type="submit"
              disabled={verificando}
              className="font-semibold text-xs h-9 px-5 shrink-0"
            >
              {verificando ? 'Consultando...' : 'Verificar Autenticidad'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onGoToChecksign}
              className="text-xs h-9 px-4 shrink-0 font-medium"
            >
              Portal Completo Checksign
            </Button>
          </form>

          {resultado && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <Badge variant="success" className="text-[10px] font-mono">
                  ✓ DOCUMENTO AUTÉNTICO Y VIGENTE
                </Badge>
                <span className="text-[11px] font-mono text-muted-foreground">{resultado.fecha}</span>
              </div>
              <div className="font-semibold text-foreground text-sm">{resultado.tipo}</div>
              <p className="text-muted-foreground">
                Firmado electrónicamente por: <strong className="text-foreground">{resultado.firmante}</strong> ({resultado.cargo})
              </p>
              <div className="text-[11px] font-mono text-muted-foreground border-t border-emerald-500/20 pt-1.5">
                {resultado.normativa}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Catálogo de Trámites y Certificados Frecuentes */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Trámites y Certificados Municipales Frecuentes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tramitesFrecuentes.map((t, idx) => (
            <Card key={idx} className="flex flex-col justify-between hover:border-primary/50 transition-colors">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="text-[9px] font-mono">
                    ONLINE
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">{t.plazo}</span>
                </div>
                <CardTitle className="text-sm font-bold mt-2">{t.titulo}</CardTitle>
                <CardDescription className="text-xs leading-relaxed mt-1">
                  {t.descripcion}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onGoToChecksign}
                  className="w-full text-xs font-medium"
                >
                  Consultar Documento →
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Pie informativo para el vecino */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            ¿Eres funcionario municipal o supervisor de firmas?
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={onOpenLogin}
            className="text-xs font-semibold px-4"
          >
            Ingresar al Panel de Gestión / Admin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
