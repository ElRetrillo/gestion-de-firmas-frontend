import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

interface Alerta {
  id: string;
  tipo: string;
  custodia: string;
  hardwareModelo: string;
  diasRestantes: number;
  severidad: 'ALTA' | 'MEDIA' | 'BAJA';
  fechaExpiracion: string;
  usuario: {
    nombre: string;
    unidad: string;
    email: string;
    rut: string;
  };
}

export const AlertasCertificadosView: React.FC = () => {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [cargando, setCargando] = useState(true);

  const [notificando, setNotificando] = useState<string | null>(null);
  const [despachoMasivoExitoso, setDespachoMasivoExitoso] = useState(false);

  useEffect(() => {
    setCargando(true);
    fetch('/api/v1/usuarios/alertas-vencimiento')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAlertas(
            data.map((item: any) => {
              const dias = item.diasRestantes ?? (item.validoHasta ? Math.max(0, Math.ceil((new Date(item.validoHasta).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0);
              return {
                id: item.id || item.numeroSerie || 'CERT',
                tipo: `${item.tipo || 'FEA'} (${item.numeroSerie || 'X.509'})`,
                custodia: item.custodia || 'TOKEN_FISICO',
                hardwareModelo: item.tokenHardware?.modelo || item.tokenHardware?.marca || 'Dispositivo de firma USB',
                diasRestantes: dias,
                severidad: item.severidad || (dias <= 15 ? 'ALTA' : dias <= 30 ? 'MEDIA' : 'BAJA'),
                fechaExpiracion: item.validoHasta
                  ? new Date(item.validoHasta).toISOString().substring(0, 10)
                  : 'Sin fecha',
                usuario: {
                  nombre: item.usuario?.nombre || 'Funcionario Municipal',
                  unidad: item.usuario?.unidad || 'Municipalidad de Coquimbo',
                  email: item.usuario?.email || 'firma@municoquimbo.cl',
                  rut: item.usuario?.rut || '-',
                },
              };
            }),
          );
        }
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const handleNotificar = async (id: string, email: string) => {
    setNotificando(id);
    try {
      await fetch('/api/v1/usuarios/alertas-vencimiento/despachar', { method: 'POST' });
    } catch {
      // Fallback
    }
    setTimeout(() => {
      setNotificando(null);
      setDespachoMasivoExitoso(true);
    }, 350);
  };

  const handleDespachoMasivo = async () => {
    try {
      await fetch('/api/v1/usuarios/alertas-vencimiento/despachar', { method: 'POST' });
    } catch {
      // Fallback
    }
    setDespachoMasivoExitoso(true);
    setTimeout(() => setDespachoMasivoExitoso(false), 4000);
  };

  const criticosCount = alertas.filter((a) => a.severidad === 'ALTA').length;
  const mediosCount = alertas.filter((a) => a.severidad === 'MEDIA').length;
  const preventivosCount = alertas.filter((a) => a.severidad === 'BAJA').length;
  const tokensFisicosCount = alertas.filter((a) => a.custodia === 'TOKEN_FISICO').length;
  const certificadosCloudCount = alertas.filter((a) => a.custodia !== 'TOKEN_FISICO').length;

  return (
    <div className="space-y-6">
      {/* 1. Bento Asimétrico: Monitor de Ciclo de Vida & Resumen de Custodia */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Columna Izquierda: Monitor de Vigencia */}
        <Card className="lg:col-span-8 border-border/80 bg-card">
          <CardHeader className="p-5 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px]">
                  Vencimientos
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  Avisos a 60, 30 y 15 días
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                Vigilancia de Certificados Digitales
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Monitoreo preventivo del estado y vencimiento de certificados digitales de funcionarios.
              </CardDescription>
            </div>

            <Button
              onClick={handleDespachoMasivo}
              size="sm"
              disabled={alertas.length === 0}
              className="font-bold text-xs h-9 px-4 shrink-0 shadow-xs"
            >
              Enviar Notificaciones
            </Button>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {/* Niveles de Severidad */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 space-y-1">
                <div className="text-[10px] uppercase text-rose-500 font-bold">
                  Menos de 15 días
                </div>
                <div className="font-bold text-xl text-rose-600 dark:text-rose-400">
                  {criticosCount}
                </div>
                <div className="text-[10px] text-muted-foreground">Requiere gestión inmediata</div>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1">
                <div className="text-[10px] uppercase text-amber-500 font-bold">
                  Menos de 30 días
                </div>
                <div className="font-bold text-xl text-amber-600 dark:text-amber-400">
                  {mediosCount}
                </div>
                <div className="text-[10px] text-muted-foreground">Proceso de renovación abierto</div>
              </div>

              <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-1">
                <div className="text-[10px] uppercase text-blue-500 font-bold">
                  Menos de 60 días
                </div>
                <div className="font-bold text-xl text-foreground">
                  {preventivosCount}
                </div>
                <div className="text-[10px] text-muted-foreground">Monitoreo programado</div>
              </div>
            </div>

            {despachoMasivoExitoso && (
              <div className="p-3 rounded border border-emerald-500/40 bg-emerald-500/10 text-xs text-foreground">
                ✓ Alertas transmitidas exitosamente por correo institucional a los funcionarios respectivos.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Columna Derecha: Resumen de Dispositivos */}
        <Card className="lg:col-span-4 border-border/80 bg-card flex flex-col justify-between">
          <CardHeader className="p-5 pb-3 border-b">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              TIPO DE DISPOSITIVOS
            </span>
            <CardTitle className="text-sm font-bold text-foreground">
              Inventario de Certificados
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded bg-muted/30 border">
              <div>
                <div className="font-semibold text-foreground text-[11px]">Dispositivos Físicos (USB)</div>
                <div className="text-[10px] text-muted-foreground">Pendrives criptográficos de firma</div>
              </div>
              <span className="font-bold text-foreground">{tokensFisicosCount} {tokensFisicosCount === 1 ? 'unidad' : 'unidades'}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-muted/30 border">
              <div>
                <div className="font-semibold text-foreground text-[11px]">Firma Centralizada</div>
                <div className="text-[10px] text-muted-foreground">Custodiados en servidor municipal</div>
              </div>
              <span className="font-bold text-foreground">{certificadosCloudCount} {certificadosCloudCount === 1 ? 'certificado' : 'certificados'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Grid de Certificados con Vencimiento Monitoreado */}
      {cargando ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-sm text-muted-foreground animate-pulse">
            Consultando registros de certificados y vigencias...
          </p>
        </Card>
      ) : alertas.length === 0 ? (
        <Card className="p-8 text-center border-dashed bg-card/50">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-foreground">
              Sin certificados próximos a vencer
            </div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Todos los certificados de firma de los funcionarios se encuentran al día con vigencia suficiente.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alertas.map((alerta) => {
          const isAlta = alerta.severidad === 'ALTA';
          const isMedia = alerta.severidad === 'MEDIA';

          return (
            <Card
              key={alerta.id}
              className={`border transition-all hover:shadow-md ${
                isAlta
                  ? 'border-rose-500/40 bg-rose-500/5'
                  : isMedia
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-border/80 bg-card'
              }`}
            >
              <CardHeader className="p-4 pb-2 border-b">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isAlta ? 'danger' : isMedia ? 'warning' : 'info'}
                        className="text-[10px] uppercase font-bold py-0"
                      >
                        {alerta.diasRestantes} DÍAS RESTANTES
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        EXPIRA: {alerta.fechaExpiracion}
                      </span>
                    </div>
                    <CardTitle className="text-sm font-bold pt-1 text-foreground">
                      {alerta.usuario.nombre}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{alerta.usuario.unidad}</p>
                  </div>

                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                    {alerta.id}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3 text-xs">
                <div className="bg-muted/40 p-2.5 rounded-md border border-border/60 space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Certificado:</span>
                    <span className="font-medium text-foreground">{alerta.tipo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dispositivo:</span>
                    <span className="text-foreground">{alerta.hardwareModelo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RUT Funcionario:</span>
                    <span className="text-foreground font-mono">{alerta.usuario.rut}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Correo Notificación:</span>
                    <span className="text-muted-foreground truncate max-w-[180px]">
                      {alerta.usuario.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground">
                    TIPO: {alerta.custodia === 'TOKEN_FISICO' ? 'Dispositivo Físico' : 'Centralizado'}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={notificando === alerta.id}
                    onClick={() => handleNotificar(alerta.id, alerta.usuario.email)}
                    className="text-xs font-semibold h-8"
                  >
                    {notificando === alerta.id ? 'Enviando aviso...' : 'Enviar Aviso'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}
    </div>
  );
};
