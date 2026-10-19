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
    timestamp?: string;
    serialNumber?: string;
    vendorId?: string;
    marca?: string;
    modelo?: string;
    ipAsignada?: string;
    dependenciaFisica?: string;
    tokenInfo?: any;
    metadatos?: any;
  }) => void;
  cargarEstaciones: () => Promise<void>;
  simularEventoHardware: (codigoPc: string, nuevoEstado: EstadoHardwareType) => Promise<void>;
  limpiarMalla: () => void;
}

export const useTelemetriaStore = create<TelemetriaState>((set, get) => ({
  socket: null,
  wsConectado: false,
  estaciones: [],
  historialEventos: [],

  limpiarMalla: async () => {
    set({ estaciones: [], historialEventos: [] });
    try {
      await fetch('/api/v1/telemetria/limpiar', { method: 'POST' });
    } catch {
      // Ignorar si falla limpieza remota
    }
  },

  inicializarSocket: () => {
    if (get().socket) return;

    // Conexión dinámica con WebSocket usando variable de entorno o proxy relativo
    const wsUrl = import.meta.env.VITE_WS_URL || '/';
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      set({ wsConectado: true });
      socket.emit('unirse_dashboard');
      get().cargarEstaciones();
    });

    socket.on('disconnect', () => {
      set({ wsConectado: false });
    });

    socket.on('estado_pc_actualizado', (payload: any) => {
      get().actualizarEstadoEstacion(payload);
    });

    socket.on('telemetria_malla_limpiada', () => {
      set({ estaciones: [], historialEventos: [] });
    });

    set({ socket });
  },

  actualizarEstadoEstacion: (payload) => {
    set((state) => {
      const isDesconectado = payload.estadoHardware === 'DESCONECTADO';
      const estacionPrevia = state.estaciones.find((e) => e.codigoPc === payload.codigoPc);
      const existe = Boolean(estacionPrevia);

      // Determinar info del token recibida (se limpia inmediatamente al desconectar el USB)
      const tokenRecibido = isDesconectado
        ? undefined
        : payload.tokenInfo ||
          (payload.serialNumber
            ? {
                serialNumber: payload.serialNumber,
                vendorId: payload.vendorId,
                marca: payload.marca,
                modelo: payload.modelo,
              }
            : undefined);

      let nuevasEstaciones: EstacionTrabajo[];

      if (existe) {
        nuevasEstaciones = state.estaciones.map((est) => {
          if (est.codigoPc === payload.codigoPc) {
            return {
              ...est,
              estadoEnVivo: payload.estadoHardware,
              ultimoPing: payload.timestamp || new Date().toISOString(),
              tokenInfo: isDesconectado ? undefined : (tokenRecibido || est.tokenInfo),
              ipAsignada: payload.ipAsignada || est.ipAsignada,
              dependenciaFisica: payload.dependenciaFisica || est.dependenciaFisica,
            };
          }
          return est;
        });
      } else {
        nuevasEstaciones = [
          ...state.estaciones,
          {
            codigoPc: payload.codigoPc,
            ipAsignada: payload.ipAsignada || payload.metadatos?.ip || '127.0.0.1',
            dependenciaFisica: payload.dependenciaFisica || payload.metadatos?.dependenciaFisica || 'Estación Local',
            estadoEnVivo: payload.estadoHardware,
            ultimoPing: payload.timestamp || new Date().toISOString(),
            tokenInfo: isDesconectado ? undefined : tokenRecibido,
          },
        ];
      }

      // Evitar duplicar eventos en el feed si es solo un heartbeat periódico sin cambio de estado
      const isHeartbeat = payload.metadatos?.isHeartbeat === true && payload.metadatos?.stateChanged === false;
      const mismoEstado = estacionPrevia && estacionPrevia.estadoEnVivo === payload.estadoHardware;
      if (isHeartbeat && mismoEstado) {
        return {
          estaciones: nuevasEstaciones,
        };
      }

      const serialFinal = isDesconectado
        ? payload.metadatos?.previousSerialNumber || estacionPrevia?.tokenInfo?.serialNumber || undefined
        : tokenRecibido?.serialNumber || payload.serialNumber || payload.tokenInfo?.serialNumber;

      const nuevoLog: TelemetriaLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        codigoPc: payload.codigoPc,
        estado: payload.estadoHardware,
        timestamp: new Date(payload.timestamp || Date.now()).toLocaleTimeString('es-CL'),
        serialNumber: serialFinal,
      };

      return {
        estaciones: nuevasEstaciones,
        historialEventos: [nuevoLog, ...state.historialEventos.slice(0, 49)],
      };
    });
  },

  cargarEstaciones: async () => {
    try {
      const [resEst, resEventos] = await Promise.all([
        fetch('/api/v1/telemetria/estaciones'),
        fetch('/api/v1/telemetria/eventos-recientes'),
      ]);

      let eventosLogs: TelemetriaLog[] = [];
      const mapaUltimoToken: Record<string, any> = {};
      const pcYaProcesado: Record<string, boolean> = {};

      if (resEventos.ok) {
        const evData = await resEventos.json();
        if (Array.isArray(evData)) {
          eventosLogs = evData.map((ev: any) => {
            const tokenObj = ev.token
              ? {
                  serialNumber: ev.token.serialNumber,
                  vendorId: ev.token.vendorId,
                  marca: ev.token.marca,
                  modelo: ev.token.modelo,
                }
              : undefined;

            // Solo usar el evento más reciente de cada PC; si el más reciente es DESCONECTADO, no asociar token
            if (!pcYaProcesado[ev.codigoPc]) {
              pcYaProcesado[ev.codigoPc] = true;
              if (tokenObj && ev.evento !== 'DESCONECTADO') {
                mapaUltimoToken[ev.codigoPc] = tokenObj;
              }
            }

            return {
              id: ev.id,
              codigoPc: ev.codigoPc,
              estado: ev.evento || ev.estadoHardware || 'DESCONECTADO',
              timestamp: new Date(ev.timestamp).toLocaleTimeString('es-CL'),
              serialNumber:
                ev.token?.serialNumber ||
                ev.metadatosJsonb?.previousSerialNumber ||
                ev.metadatosJsonb?.serialNumber ||
                ev.serialNumber,
            };
          });
        }
      }

      if (resEst.ok) {
        const data = await resEst.json();
        if (Array.isArray(data)) {
          const mappedEstaciones = data.map((d: any) => {
            const estadoActual = d.estadoEnVivo || d.estadoHardware || 'DESCONECTADO';
            const isDesconectado = estadoActual === 'DESCONECTADO';
            let tokenInfo = isDesconectado ? undefined : (d.tokenInfo || undefined);

            if (!tokenInfo && !isDesconectado) {
              if (d.token) {
                tokenInfo = {
                  serialNumber: d.token.serialNumber,
                  vendorId: d.token.vendorId,
                  marca: d.token.marca,
                  modelo: d.token.modelo,
                };
              } else if (mapaUltimoToken[d.codigoPc]) {
                tokenInfo = mapaUltimoToken[d.codigoPc];
              } else if (d.serialTokenActivo) {
                tokenInfo = {
                  serialNumber: d.serialTokenActivo,
                  vendorId: d.vendorId || 'USB',
                  marca: d.marca || 'Token Criptográfico',
                  modelo: d.modelo || 'Hardware PKCS#11',
                };
              }
            }

            return {
              id: d.id,
              codigoPc: d.codigoPc,
              ipAsignada: d.ipAsignada || '127.0.0.1',
              dependenciaFisica: d.dependenciaFisica || 'Estación Local',
              estadoEnVivo: estadoActual,
              ultimoPing: d.ultimoPing || new Date().toISOString(),
              tokenInfo: isDesconectado ? undefined : tokenInfo,
            };
          });

          set({
            estaciones: mappedEstaciones,
            historialEventos: eventosLogs,
          });
          return;
        }
      }

      if (eventosLogs.length > 0) {
        set({ historialEventos: eventosLogs });
      }
    } catch (err) {
      console.warn('Error al cargar datos reales de telemetría:', err);
    }
  },

  simularEventoHardware: async (codigoPc: string, nuevoEstado: EstadoHardwareType) => {
    const payload = {
      codigoPc,
      estadoHardware: nuevoEstado,
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch('/api/v1/telemetria/usb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      get().actualizarEstadoEstacion(payload);
    }
  },
}));
