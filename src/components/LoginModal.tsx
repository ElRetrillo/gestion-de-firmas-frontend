import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { useAuthStore, UserRole } from '../store/useAuthStore';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (rol: UserRole) => void;
  initialRole?: 'CIUDADANO' | 'GESTOR';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialRole = 'GESTOR',
}) => {
  const { login } = useAuthStore();
  const [tipoVista, setTipoVista] = useState<'CIUDADANO' | 'GESTOR'>(initialRole);
  const [rolGestor, setRolGestor] = useState<'ADMIN' | 'SUPERVISOR' | 'FUNCIONARIO'>('ADMIN');
  const [rut, setRut] = useState('');
  const [clave, setClave] = useState('');
  const [cargando, setCargando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    setTimeout(() => {
      const rolFinal: UserRole = tipoVista === 'CIUDADANO' ? 'CIUDADANO' : rolGestor;
      login(rolFinal, rut ? { rut } : undefined);
      setCargando(false);
      onSuccess(rolFinal);
      onClose();
    }, 450);
  };

  const handleQuickDemo = (rol: UserRole) => {
    login(rol);
    onSuccess(rol);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-md border-border/80 shadow-2xl bg-card">
        <CardHeader className="space-y-1 pb-4 border-b">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">
              MUNICIPALIDAD DE COQUIMBO
            </span>
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground font-mono px-2 py-1 rounded hover:bg-muted"
            >
              [CERRAR ✕]
            </button>
          </div>
          <CardTitle className="text-lg font-bold">
            Acceso al Sistema Municipal
          </CardTitle>
          <CardDescription className="text-xs">
            Selecciona tu perfil de acceso para ingresar al entorno correspondiente
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Selector de Dos Vistas Principales: Ciudadano vs Gestor */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 rounded-lg border text-xs">
            <button
              type="button"
              onClick={() => setTipoVista('CIUDADANO')}
              className={`py-2 px-3 rounded-md font-semibold transition-all text-xs ${
                tipoVista === 'CIUDADANO'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Vista Ciudadano / Vecino
            </button>
            <button
              type="button"
              onClick={() => setTipoVista('GESTOR')}
              className={`py-2 px-3 rounded-md font-semibold transition-all text-xs ${
                tipoVista === 'GESTOR'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Vista Gestor / Admin
            </button>
          </div>

          {tipoVista === 'CIUDADANO' ? (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs space-y-2">
              <div className="font-semibold text-blue-900 dark:text-blue-300">
                Portal de Trámites y Verificación Ciudadana
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Permite a contribuyentes y vecinos verificar autenticidad de decretos, descargar certificados y consultar trámites sin requerir privilegios operativos.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDemo('CIUDADANO')}
                className="w-full text-xs font-semibold mt-1"
              >
                Ingresar como Vecino / Ciudadano (Demo)
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground">
                  Rol de Gestión / Administración:
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {(['ADMIN', 'SUPERVISOR', 'FUNCIONARIO'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRolGestor(r)}
                      className={`py-1.5 px-2 rounded border text-[11px] font-mono font-medium transition-all ${
                        rolGestor === r
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    RUT del Funcionario
                  </label>
                  <Input
                    type="text"
                    value={rut}
                    onChange={(e) => setRut(e.target.value)}
                    placeholder="12.894.120-3"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Contraseña / ClaveÚnica Institucional
                  </label>
                  <Input
                    type="password"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={cargando}
                  className="w-full text-xs font-bold h-9"
                >
                  {cargando ? 'Validando credenciales...' : `Ingresar como Gestor (${rolGestor})`}
                </Button>
              </form>
            </div>
          )}

          {/* Accesos rápidos de prueba */}
          <div className="pt-2 border-t">
            <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1.5">
              Acceso Rápido Directo:
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDemo('CIUDADANO')}
                className="text-[10px] h-6 px-2 font-mono"
              >
                Vecino / Ciudadano
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDemo('ADMIN')}
                className="text-[10px] h-6 px-2 font-mono"
              >
                Admin (Patricio Reyes)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDemo('SUPERVISOR')}
                className="text-[10px] h-6 px-2 font-mono"
              >
                Supervisor
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="py-2.5 px-4 bg-muted/20 border-t flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>LEY N° 19.799 & 21.663</span>
          <Badge variant="outline" className="text-[9px]">ANCI COMPLIANT</Badge>
        </CardFooter>
      </Card>
    </div>
  );
};
