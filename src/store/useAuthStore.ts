import { create } from 'zustand';
import { EvaluacionRbacFirma } from '../lib/rbacFirmas';

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'MINISTRO_DE_FE' | 'FUNCIONARIO' | 'CIUDADANO' | 'PENDIENTE';
export type VistaGeneral = 'ADMIN' | 'FUNCIONARIO';

export interface UserProfile {
  id?: string;
  rut: string;
  nombre: string;
  email: string;
  cargo: string;
  unidad: string;
  rol: UserRole;
  condicionContractual?: string;
  rbac?: EvaluacionRbacFirma;
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
  sessionExpiresAt: number | null;
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

const MAX_TIMEOUT_MS = 2_147_483_647;
let sessionTimerId: number | null = null;

function limpiarTimerSesion() {
  if (sessionTimerId !== null) {
    window.clearTimeout(sessionTimerId);
    sessionTimerId = null;
  }
}

export function decodeJwtExpMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    const payload = JSON.parse(json);
    if (typeof payload?.exp === 'number' && Number.isFinite(payload.exp)) {
      return payload.exp * 1000;
    }
    return null;
  } catch {
    return null;
  }
}

function programarExpiracionSesion(token: string, onExpire: () => void): number | null {
  limpiarTimerSesion();
  const expMs = decodeJwtExpMs(token);
  if (expMs === null) return null;

  const remaining = expMs - Date.now();
  if (remaining > 0) {
    sessionTimerId = window.setTimeout(onExpire, Math.min(remaining, MAX_TIMEOUT_MS));
  }
  return expMs;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  usuario: { ...GUEST_USER },
  accessToken: localStorage.getItem('access_token') || null,
  sessionExpiresAt: null,
  isAutenticado: false,
  debeCambiarPassword: false,
  cargandoSesion: true,
  vistaGeneralActiva: 'ADMIN',

  loginSuccess: ({ accessToken, debeCambiarPassword, usuario }) => {
    localStorage.setItem('access_token', accessToken);
    const esAdminOSuper = usuario.rol === 'ADMIN' || usuario.rol === 'SUPERVISOR' || usuario.rol === 'MINISTRO_DE_FE';
    const expMs = !debeCambiarPassword
      ? programarExpiracionSesion(accessToken, () => get().logout())
      : decodeJwtExpMs(accessToken);
    set({
      accessToken,
      sessionExpiresAt: expMs,
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
    const expMs = programarExpiracionSesion(accessToken, () => get().logout());
    set({
      accessToken,
      sessionExpiresAt: expMs,
      usuario: { ...GUEST_USER, ...usuario },
      debeCambiarPassword: false,
      isAutenticado: true,
      cargandoSesion: false,
      vistaGeneralActiva: esAdminOSuper ? 'ADMIN' : 'FUNCIONARIO',
    });
  },

  logout: () => {
    limpiarTimerSesion();
    const token = localStorage.getItem('access_token');
    if (token) {
      fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem('access_token');
    set({
      usuario: { ...GUEST_USER },
      accessToken: null,
      sessionExpiresAt: null,
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
      limpiarTimerSesion();
      set({
        usuario: { ...GUEST_USER },
        accessToken: null,
        sessionExpiresAt: null,
        isAutenticado: false,
        cargandoSesion: false,
      });
      return;
    }

    const expMs = decodeJwtExpMs(token);
    if (expMs !== null && expMs <= Date.now()) {
      limpiarTimerSesion();
      localStorage.removeItem('access_token');
      set({
        usuario: { ...GUEST_USER },
        accessToken: null,
        sessionExpiresAt: null,
        isAutenticado: false,
        debeCambiarPassword: false,
        cargandoSesion: false,
      });
      return;
    }

    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const u = await res.json();
        const esAdminOSuper = u.rol === 'ADMIN' || u.rol === 'SUPERVISOR' || u.rol === 'MINISTRO_DE_FE';
        const scheduledExpMs = !u.debeCambiarPassword
          ? programarExpiracionSesion(token, () => get().logout())
          : expMs;
        set({
          usuario: { ...GUEST_USER, ...u },
          accessToken: token,
          sessionExpiresAt: scheduledExpMs,
          debeCambiarPassword: Boolean(u.debeCambiarPassword),
          isAutenticado: !u.debeCambiarPassword,
          cargandoSesion: false,
          vistaGeneralActiva: esAdminOSuper ? 'ADMIN' : 'FUNCIONARIO',
        });
      } else {
        limpiarTimerSesion();
        localStorage.removeItem('access_token');
        set({
          usuario: { ...GUEST_USER },
          accessToken: null,
          sessionExpiresAt: null,
          isAutenticado: false,
          cargandoSesion: false,
        });
      }
    } catch {
      set({ cargandoSesion: false });
    }
  },
}));
