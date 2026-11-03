import { create } from 'zustand';

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'MINISTRO_DE_FE' | 'FUNCIONARIO' | 'CIUDADANO';
export type VistaGeneral = 'ADMIN' | 'FUNCIONARIO';

export interface UserProfile {
  id?: string;
  rut: string;
  nombre: string;
  email: string;
  cargo: string;
  unidad: string;
  rol: UserRole;
  estado?: string;
  pinBloqueado?: boolean;
  debeCambiarPassword?: boolean;
  pinToken?: string;
  certificados?: any[];
}

export const GUEST_USER: UserProfile = {
  rut: '',
  nombre: '',
  email: '',
  cargo: '',
  unidad: '',
  rol: 'FUNCIONARIO',
  pinToken: '',
};

interface AuthState {
  usuario: UserProfile;
  accessToken: string | null;
  isAutenticado: boolean;
  debeCambiarPassword: boolean;
  cargandoSesion: boolean;
  vistaGeneralActiva: VistaGeneral;
  loginSuccess: (data: { accessToken: string; debeCambiarPassword: boolean; usuario: UserProfile }) => void;
  logout: () => void;
  actualizarPasswordCompletada: (data: { accessToken: string; usuario: UserProfile }) => void;
  setVistaGeneralActiva: (vista: VistaGeneral) => void;
  verificarSesion: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  usuario: { ...GUEST_USER },
  accessToken: localStorage.getItem('access_token') || null,
  isAutenticado: false,
  debeCambiarPassword: false,
  cargandoSesion: true,
  vistaGeneralActiva: 'ADMIN',

  loginSuccess: ({ accessToken, debeCambiarPassword, usuario }) => {
    localStorage.setItem('access_token', accessToken);
    const esAdminOSuper = usuario.rol === 'ADMIN' || usuario.rol === 'SUPERVISOR' || usuario.rol === 'MINISTRO_DE_FE';
    set({
      accessToken,
      usuario: { ...GUEST_USER, ...usuario },
      debeCambiarPassword: Boolean(debeCambiarPassword),
      isAutenticado: !debeCambiarPassword,
      cargandoSesion: false,
      vistaGeneralActiva: esAdminOSuper ? 'ADMIN' : 'FUNCIONARIO',
    });
  },

  actualizarPasswordCompletada: ({ accessToken, usuario }) => {
    localStorage.setItem('access_token', accessToken);
    const esAdminOSuper = usuario.rol === 'ADMIN' || usuario.rol === 'SUPERVISOR' || usuario.rol === 'MINISTRO_DE_FE';
    set({
      accessToken,
      usuario: { ...GUEST_USER, ...usuario },
      debeCambiarPassword: false,
      isAutenticado: true,
      cargandoSesion: false,
      vistaGeneralActiva: esAdminOSuper ? 'ADMIN' : 'FUNCIONARIO',
    });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    set({
      usuario: { ...GUEST_USER },
      accessToken: null,
      isAutenticado: false,
      debeCambiarPassword: false,
      cargandoSesion: false,
      vistaGeneralActiva: 'ADMIN',
    });
  },

  setVistaGeneralActiva: (vista) => {
    set({ vistaGeneralActiva: vista });
  },

  verificarSesion: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ usuario: { ...GUEST_USER }, accessToken: null, isAutenticado: false, cargandoSesion: false });
      return;
    }
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const u = await res.json();
        const esAdminOSuper = u.rol === 'ADMIN' || u.rol === 'SUPERVISOR' || u.rol === 'MINISTRO_DE_FE';
        set({
          usuario: { ...GUEST_USER, ...u },
          accessToken: token,
          debeCambiarPassword: Boolean(u.debeCambiarPassword),
          isAutenticado: !u.debeCambiarPassword,
          cargandoSesion: false,
          vistaGeneralActiva: esAdminOSuper ? 'ADMIN' : 'FUNCIONARIO',
        });
      } else {
        localStorage.removeItem('access_token');
        set({ usuario: { ...GUEST_USER }, accessToken: null, isAutenticado: false, cargandoSesion: false });
      }
    } catch {
      set({ cargandoSesion: false });
    }
  },
}));
