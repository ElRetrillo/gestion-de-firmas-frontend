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
  pinToken?: string;
  isAutenticado: boolean;
}

interface AuthState {
  usuario: UserProfile;
  accessToken: string | null;
  isAutenticado: boolean;
  vistaGeneralActiva: VistaGeneral;
  login: (rol: UserRole, customData?: Partial<UserProfile>, accessToken?: string) => void;
  logout: () => void;
  cambiarRol: (rol: UserRole) => void;
  setVistaGeneralActiva: (vista: VistaGeneral) => void;
}

export const DEFAULT_USERS: Record<UserRole, Omit<UserProfile, 'isAutenticado'>> = {
  ADMIN: {
    rut: '12.894.120-3',
    nombre: 'Patricio Reyes Morales',
    email: 'preyes@municoquimbo.cl',
    cargo: 'Secretario Municipal y Administrador TIC',
    unidad: 'Dirección de TICs y Secretaría Municipal',
    rol: 'ADMIN',
    pinToken: '1234',
  },
  SUPERVISOR: {
    rut: '14.120.932-5',
    nombre: 'Marcela Vega Contreras',
    email: 'mvega@municoquimbo.cl',
    cargo: 'Jefa de Oficina de Partes y Archivo',
    unidad: 'Dirección de Administración y Finanzas (DAF)',
    rol: 'SUPERVISOR',
    pinToken: '5678',
  },
  MINISTRO_DE_FE: {
    rut: '11.554.218-1',
    nombre: 'Eugenio Gómez Díaz',
    email: 'egomez@municoquimbo.cl',
    cargo: 'Ministro de Fe Suplente',
    unidad: 'Asesoría Jurídica y Secretaría',
    rol: 'MINISTRO_DE_FE',
    pinToken: '9012',
  },
  FUNCIONARIO: {
    rut: '16.782.341-2',
    nombre: 'Rodrigo Araya Campos',
    email: 'raraya@municoquimbo.cl',
    cargo: 'Analista de Gestión Documental',
    unidad: 'Oficina de Decretos y Resoluciones',
    rol: 'FUNCIONARIO',
    pinToken: '3456',
  },
  CIUDADANO: {
    rut: '18.452.109-K',
    nombre: 'Constanza Valenzuela Soto',
    email: 'c.valenzuela@gmail.com',
    cargo: 'Vecina Contribuyente',
    unidad: 'Atención Ciudadana Coquimbo',
    rol: 'CIUDADANO',
    pinToken: '0000',
  },
};

export const useAuthStore = create<AuthState>((set) => ({
  usuario: {
    ...DEFAULT_USERS.ADMIN,
    isAutenticado: false,
  },
  accessToken: null,
  isAutenticado: false,
  vistaGeneralActiva: 'ADMIN',
  login: (rol, customData, accessToken) => {
    const base = DEFAULT_USERS[rol] || DEFAULT_USERS.ADMIN;
    const vistaDefecto: VistaGeneral = rol === 'ADMIN' || rol === 'SUPERVISOR' ? 'ADMIN' : 'FUNCIONARIO';
    set({
      isAutenticado: true,
      accessToken: accessToken || null,
      vistaGeneralActiva: vistaDefecto,
      usuario: {
        ...base,
        ...customData,
        rol,
        isAutenticado: true,
      },
    });
  },
  logout: () => {
    set((state) => ({
      isAutenticado: false,
      accessToken: null,
      vistaGeneralActiva: 'ADMIN',
      usuario: {
        ...state.usuario,
        isAutenticado: false,
      },
    }));
  },
  cambiarRol: (rol) => {
    const base = DEFAULT_USERS[rol] || DEFAULT_USERS.ADMIN;
    const vistaDefecto: VistaGeneral = rol === 'ADMIN' || rol === 'SUPERVISOR' ? 'ADMIN' : 'FUNCIONARIO';
    set((state) => ({
      usuario: {
        ...base,
        isAutenticado: state.isAutenticado,
        rol,
      },
      vistaGeneralActiva: vistaDefecto,
    }));
  },
  setVistaGeneralActiva: (vista) => {
    set({ vistaGeneralActiva: vista });
  },
}));
