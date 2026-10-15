import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export type EstadoHardwareType = 'DESCONECTADO' | 'CONECTADO' | 'FIRMANDO';

export interface EstacionTrabajo {
  id?: string;
  codigoPc: string;
  ipAsignada: string;
  dependenciaFisica: string;
  estadoEnVivo: EstadoHardwareType;
  ultimoPing: string;
  tokenInfo?: {
    serialNumber?: string;
    vendorId?: string;
    marca?: string;
    modelo?: string;
  };
}

export interface TelemetriaLog {
  id: string;
  codigoPc: string;
  estado: EstadoHardwareType;
  timestamp: string;
  serialNumber?: string;
}

interface TelemetriaState {
  socket: Socket | null;
  wsConectado: boolean;
  estaciones: EstacionTrabajo[];
  historialEventos: TelemetriaLog[];
  inicializarSocket: () => void;
  actualizarEstadoEstacion: (payload: {
    codigoPc: string;
    estadoHardware: EstadoHardwareType;
    timestamp: string;
    tokenInfo?: any;
  }) => void;
  cargarEstaciones: () => Promise<void>;
  simularEventoHardware: (codigoPc: string, nuevoEstado: EstadoHardwareType) => Promise<void>;
}

const ESTACIONES_INICIALES: EstacionTrabajo[] = [
  {
    codigoPc: 'PC-SECMUN-01',
    ipAsignada: '10.20.1.10',
    dependenciaFisica: 'Secretaría Municipal - Piso 2',
    estadoEnVivo: 'CONECTADO',
    ultimoPing: new Date().toISOString(),
    tokenInfo: { serialNumber: 'SN-SAF-98214', vendorId: '0x04B9 (SafeNet/Gemalto)', marca: 'SafeNet', modelo: 'eToken 5110' },
  },
  {
    codigoPc: 'PC-SECMUN-02',
    ipAsignada: '10.20.1.12',
    dependenciaFisica: 'Secretaría Municipal - Actas y Decretos',
    estadoEnVivo: 'DESCONECTADO',
    ultimoPing: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    codigoPc: 'PC-DOM-05',
    ipAsignada: '10.20.2.45',
    dependenciaFisica: 'Dirección de Obras Municipales',
    estadoEnVivo: 'FIRMANDO',
    ultimoPing: new Date().toISOString(),
    tokenInfo: { serialNumber: 'SN-EPASS-4011', vendorId: '0x096E (ePass2003)', marca: 'Feitian', modelo: 'ePass2003 Auto' },
  },
  {
    codigoPc: 'PC-ALCALDIA-01',
    ipAsignada: '10.20.0.5',
    dependenciaFisica: 'Despacho Alcaldía',
    estadoEnVivo: 'CONECTADO',
    ultimoPing: new Date().toISOString(),
    tokenInfo: { serialNumber: 'SN-ATH-1092', vendorId: '0x076B (Athena)', marca: 'Athena', modelo: 'ASECard Crypto' },
  },
  {
    codigoPc: 'PC-TRANSITO-03',
    ipAsignada: '10.20.3.18',
    dependenciaFisica: 'Dirección de Tránsito - Licencias',
    estadoEnVivo: 'DESCONECTADO',
    ultimoPing: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    codigoPc: 'PC-DAF-02',
    ipAsignada: '10.20.1.88',
    dependenciaFisica: 'Administración y Finanzas - Adquisiciones',
    estadoEnVivo: 'CONECTADO',
    ultimoPing: new Date().toISOString(),
    tokenInfo: { serialNumber: 'SN-SAF-55410', vendorId: '0x04B9 (SafeNet/Gemalto)', marca: 'SafeNet', modelo: 'eToken 5110' },
  },
];

export const useTelemetriaStore = create<TelemetriaState>((set, get) => ({
  socket: null,
  wsConectado: false,
  estaciones: ESTACIONES_INICIALES,
  historialEventos: [
    {
      id: 'log-1',
      codigoPc: 'PC-DOM-05',
      estado: 'FIRMANDO',
      timestamp: new Date().toLocaleTimeString('es-CL'),
      serialNumber: 'SN-EPASS-4011',
    },
    {
      id: 'log-2',
      codigoPc: 'PC-SECMUN-01',
      estado: 'CONECTADO',
      timestamp: new Date(Date.now() - 120000).toLocaleTimeString('es-CL'),
      serialNumber: 'SN-SAF-98214',
    },
  ],

  inicializarSocket: () => {
    if (get().socket) return;

    // Conexión dinámica con WebSocket en la ruta relativa /socket.io
    const socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      set({ wsConectado: true });
      socket.emit('unirse_dashboard');
    });

    socket.on('disconnect', () => {
      set({ wsConectado: false });
    });

    socket.on('estado_pc_actualizado', (payload: any) => {
      get().actualizarEstadoEstacion(payload);
    });

    set({ socket });
  },

  actualizarEstadoEstacion: (payload) => {
    set((state) => {
      const existe = state.estaciones.some((e) => e.codigoPc === payload.codigoPc);
      let nuevasEstaciones: EstacionTrabajo[];

      if (existe) {
        nuevasEstaciones = state.estaciones.map((est) => {
          if (est.codigoPc === payload.codigoPc) {
            return {
              ...est,
              estadoEnVivo: payload.estadoHardware,
              ultimoPing: payload.timestamp || new Date().toISOString(),
              tokenInfo: payload.tokenInfo || est.tokenInfo,
            };
          }
          return est;
        });
      } else {
        nuevasEstaciones = [
          ...state.estaciones,
          {
            codigoPc: payload.codigoPc,
            ipAsignada: '10.20.x.x',
            dependenciaFisica: 'Estación Municipal Detectada',
            estadoEnVivo: payload.estadoHardware,
            ultimoPing: payload.timestamp || new Date().toISOString(),
            tokenInfo: payload.tokenInfo,
          },
        ];
      }

      const nuevoLog: TelemetriaLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        codigoPc: payload.codigoPc,
        estado: payload.estadoHardware,
        timestamp: new Date(payload.timestamp || Date.now()).toLocaleTimeString('es-CL'),
        serialNumber: payload.tokenInfo?.serialNumber,
      };

      return {
        estaciones: nuevasEstaciones,
        historialEventos: [nuevoLog, ...state.historialEventos.slice(0, 49)],
      };
    });
  },

  cargarEstaciones: async () => {
    try {
      const res = await fetch('/api/v1/telemetria/estaciones');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          set({
            estaciones: data.map((d: any) => ({
              codigoPc: d.codigoPc,
              ipAsignada: d.ipAsignada || '10.20.0.1',
              dependenciaFisica: d.dependenciaFisica || 'Municipalidad de Coquimbo',
              estadoEnVivo: d.estadoEnVivo || d.estadoHardware || 'DESCONECTADO',
              ultimoPing: d.ultimoPing,
              tokenInfo: d.tokenInfo,
            })),
          });
        }
      }
    } catch {
      // Fallback a iniciales
    }
  },

  simularEventoHardware: async (codigoPc: string, nuevoEstado: EstadoHardwareType) => {
    const payload = {
      codigoPc,
      estadoHardware: nuevoEstado,
      serialNumber: nuevoEstado === 'DESCONECTADO' ? undefined : `SN-SIM-${codigoPc}`,
      vendorId: '0x04B9 (SafeNet)',
      marca: 'SafeNet eToken',
      modelo: '5110 FIPS',
      timestamp: new Date().toISOString(),
      metadatos: { simuladoPor: 'Supervisor UI', timestampLocal: Date.now() },
    };

    try {
      await fetch('/api/v1/telemetria/usb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Si el backend no responde, aplicar cambio en frontend inmediatamente
      get().actualizarEstadoEstacion(payload);
    }
  },
}));
