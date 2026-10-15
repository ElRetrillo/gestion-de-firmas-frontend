import { create } from 'zustand';

export interface UserProfile {
  rut: string;
  nombre: string;
  email: string;
  cargo: string;
  unidad: string;
  rol: 'ADMIN' | 'SUPERVISOR' | 'FUNCIONARIO' | 'MINISTRO_DE_FE';
}

interface AuthState {
  usuario: UserProfile;
  cambiarRol: (rol: 'ADMIN' | 'SUPERVISOR' | 'FUNCIONARIO' | 'MINISTRO_DE_FE') => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: {
    rut: '12.894.120-3',
    nombre: 'Patricio Reyes Morales',
    email: 'preyes@municoquimbo.cl',
    cargo: 'Secretario Municipal y Ministro de Fe',
    unidad: 'Secretaría Municipal',
    rol: 'ADMIN',
  },
  cambiarRol: (rol) =>
    set((state) => ({
      usuario: { ...state.usuario, rol },
    })),
}));
