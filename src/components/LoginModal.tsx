import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { useAuthStore, UserRole, DEFAULT_USERS } from '../store/useAuthStore';
import { LogoMunicipalidad } from './LogoMunicipalidad';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (rol: UserRole) => void;
  initialRole?: UserRole;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { login } = useAuthStore();
  const [rut, setRut] = useState('12.894.120-3');
  const [clave, setClave] = useState('••••••••••••');
  const [cargando, setCargando] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    // Simula la llamada al backend que compara las credenciales y devuelve el rol y permisos
    setTimeout(() => {
      // Si el RUT coincide con alguno de los usuarios conocidos, usamos ese rol
      const usuarioEncontrado = Object.values(DEFAULT_USERS).find((u) => u.rut === rut.trim());
      const rolFinal: UserRole = usuarioEncontrado ? usuarioEncontrado.rol : selectedRole;

      login(rolFinal, {
        rut: rut.trim(),
        nombre: usuarioEncontrado ? usuarioEncontrado.nombre : 'Funcionario Municipal',
        cargo: usuarioEncontrado ? usuarioEncontrado.cargo : 'Personal Municipal',
        unidad: usuarioEncontrado ? usuarioEncontrado.unidad : 'Municipalidad de Coquimbo',
      });

      setCargando(false);
      onSuccess(rolFinal);
      onClose();
    }, 450);
  };

  const handleSelectAccount = (role: UserRole) => {
    setSelectedRole(role);
    const user = DEFAULT_USERS[role];
    if (user) {
      setRut(user.rut);
      setClave('contraseña-institucional-segura');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-lg border-border/80 shadow-2xl bg-card">
        <CardHeader className="space-y-1 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <LogoMunicipalidad variant="header" className="h-6 w-6" />
              <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase font-bold">
                MUNICIPALIDAD DE COQUIMBO
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground font-mono px-2 py-1 rounded hover:bg-muted"
            >
              [✕ CERRAR]
            </button>
          </div>
          <CardTitle className="text-lg font-bold">
            Acceso al Sistema Municipal
          </CardTitle>
          <CardDescription className="text-xs">
            Ingresa tus credenciales institucionales. El backend validará tu identidad y configurará automáticamente las vistas según tu rol asignado.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Formulario de Login Único */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">
                RUT o Identificador Municipal:
              </label>
              <Input
                type="text"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                placeholder="12.345.678-9"
                required
                className="text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-semibold text-foreground">
                  Contraseña / Clave Institucional:
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  ANCI Ley 21.663
                </span>
              </div>
              <Input
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="••••••••••••"
                required
                className="text-xs h-9"
              />
            </div>

            <Button
              type="submit"
              disabled={cargando}
              className="w-full text-xs font-bold h-10 mt-2 shadow-sm flex items-center justify-center gap-2"
            >
              {cargando ? (
                <>
                  <span className="animate-spin text-sm">⟳</span>
                  <span>Verificando rol y credenciales en backend...</span>
                </>
              ) : (
                <span>Ingresar al Sistema</span>
              )}
            </Button>
          </form>

          {/* Selector de Simulador de Backend: Solo las 2 Vistas Generales */}
          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                SIMULAR RESPUESTA DE BACKEND (2 VISTAS):
              </span>
              <Badge variant="outline" className="text-[9px] font-mono">
                {selectedRole === 'ADMIN' ? 'Vista: ADMIN' : 'Vista: FUNCIONARIO'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {/* VISTA ADMIN */}
              <button
                type="button"
                onClick={() => handleSelectAccount('ADMIN')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedRole === 'ADMIN'
                    ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30'
                    : 'border-border/70 hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-foreground">🏢 Vista Administrador</span>
                  <Badge variant="outline" className="text-[8px] font-mono">ADMIN</Badge>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {DEFAULT_USERS.ADMIN.nombre}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Módulos de gestión, telemetría de hardware, orquestación masiva y auditoría.
                </p>
              </button>

              {/* VISTA FUNCIONARIO */}
              <button
                type="button"
                onClick={() => handleSelectAccount('FUNCIONARIO')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedRole === 'FUNCIONARIO'
                    ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30'
                    : 'border-border/70 hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-foreground">👤 Vista Funcionario</span>
                  <Badge variant="outline" className="text-[8px] font-mono">FUNCIONARIO</Badge>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {DEFAULT_USERS.FUNCIONARIO.nombre}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Bandeja de documentos asignados, firma digital de actos y verificación Checksign.
                </p>
              </button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 bg-muted/20 border-t flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Sistema Integrado de Autenticación Municipal</span>
          <span className="font-mono">Ley N° 19.799 & 21.663</span>
        </CardFooter>
      </Card>
    </div>
  );
};
