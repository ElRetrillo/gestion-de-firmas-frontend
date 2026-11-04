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
  fecha?: string;
  serialNumber?: string;
}

export interface MetricasTrazabilidadResponse {
  periodo: {
    modo: 'ULTIMOS_30_DIAS' | 'POR_MES';
    mesSeleccionado: string;
    etiquetaPeriodo: string;
    fechaInicio: string;
    fechaFin: string;
    mesesDisponibles: Array<{
      valor: string;
      etiqueta: string;
    }>;
  };
  telemetria: {
    totalEstaciones: number;
    estacionesConectadas: number;
    estacionesFirmando: number;
    estacionesDesconectadas: number;
    porcentajeDisponibilidad: number;
    totalEventosPeriodo: number;
    eventosConectado: number;
    eventosFirmando: number;
    eventosDesconectado: number;
    porcentajeEventosConectado: number;
    porcentajeEventosFirmando: number;
    porcentajeEventosDesconectado: number;
    tokensRegistrados: number;
    tokensOperativos: number;
    porcentajeTokensOperativos: number;
    rankingEstaciones: Array<{
      codigoPc: string;
      dependenciaFisica: string;
      ipAsignada: string;
      estadoActual: 'CONECTADO' | 'FIRMANDO' | 'DESCONECTADO';
      serialTokenActivo: string | null;
      totalEventos: number;
      conexiones: number;
      firmas: number;
      desconexiones: number;
      ultimoPing: string;
      porcentajeActividad: number;
      tasaExitoConexion: number;
    }>;
    trazabilidadDispositivos: Array<{
      id: string;
      serialNumber: string;
      marca: string;
      modelo: string;
      vendorId: string;
      estadoPatrimonial: 'OPERATIVO' | 'ASIGNADO' | 'EN_REVISION' | 'DADO_DE_BAJA';
      funcionarioAsignado: {
        nombre: string;
        rut: string;
        unidad: string;
      } | null;
      estacionActual: string | null;
      estadoEnVivo: 'CONECTADO' | 'FIRMANDO' | 'DESCONECTADO';
      totalEventosPeriodo: number;
      conexionesPeriodo: number;
      firmasPeriodo: number;
      desconexionesPeriodo: number;
      porcentajeUsoPeriodo: number;
      ultimaActividad: string;
    }>;
  };
  firmas: {
    totalSolicitudesPeriodo: number;
    firmadas: number;
    pendientes: number;
    rechazadas: number;
    tasaExitoFirmaPct: number;
    tasaPendientesPct: number;
    tasaRechazoPct: number;
    fePublicaOtorgada: number;
    fePublicaPendiente: number;
    porcentajeFePublica: number;
    porClasificacion: Array<{
      clasificacion: 'PUBLICA' | 'INTERNA' | 'CONFIDENCIAL' | 'CRITICA';
      cantidad: number;
      porcentaje: number;
    }>;
    porUnidad: Array<{
      unidad: string;
      total: number;
      firmadas: number;
      pendientes: number;
      rechazadas: number;
      porcentajeExito: number;
      porcentajeParticipacion: number;
    }>;
  };
  administracion: {
    totalUsuarios: number;
    usuariosActivos: number;
    usuariosPendientesAprobacion: number;
    usuariosNuevosPeriodo: number;
    porcentajeUsuariosActivos: number;
    totalCertificados: number;
    certificadosVigentes: number;
    certificadosPorVencer: number;
    certificadosRevocadosVencidos: number;
    porcentajeVigenciaCertificados: number;
    custodiaTokenFisico: number;
    custodiaCloud: number;
    porcentajeTokenFisico: number;
    porcentajeCloud: number;
    actasPeriodo: number;
    actasPorTipo: {
      ENTREGA: number;
      DEVOLUCION: number;
      TRASPASO: number;
      BAJA: number;
    };
    totalEventosAuditoriaPeriodo: number;
    auditoriaPorAccion: Array<{
      accion: string;
      cantidad: number;
      porcentaje: number;
    }>;
    auditoriaPorModulo: Array<{
      modulo: string;
      cantidad: number;
      porcentaje: number;
    }>;
  };
  serieTemporal: Array<{
    fecha: string;
    etiqueta: string;
    eventosTelemetria: number;
    conexionesUsb: number;
    firmasRealizadas: number;
    operacionesAuditoria: number;
    totalActividad: number;
  }>;
}

interface TelemetriaState {
  socket: Socket | null;
  wsConectado: boolean;
  estaciones: EstacionTrabajo[];
  historialEventos: TelemetriaLog[];
  metricas: MetricasTrazabilidadResponse | null;
  cargandoMetricas: boolean;
  modoReporte: 'ULTIMOS_30_DIAS' | 'POR_MES';
  mesSeleccionado: string;
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
  cargarMetricas: (modo?: 'ULTIMOS_30_DIAS' | 'POR_MES', mes?: string) => Promise<void>;
  setPeriodoReporte: (modo: 'ULTIMOS_30_DIAS' | 'POR_MES', mes?: string) => Promise<void>;
  simularEventoHardware: (codigoPc: string, nuevoEstado: EstadoHardwareType) => Promise<void>;
  limpiarMalla: () => void;
}

const defaultMesActual = () => {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
};

export const useTelemetriaStore = create<TelemetriaState>((set, get) => ({
  socket: null,
  wsConectado: false,
  estaciones: [],
  historialEventos: [],
  metricas: null,
  cargandoMetricas: false,
  modoReporte: 'ULTIMOS_30_DIAS',
  mesSeleccionado: defaultMesActual(),

  limpiarMalla: async () => {
    set({ estaciones: [], historialEventos: [] });
    try {
      await fetch('/api/v1/telemetria/limpiar', { method: 'POST' });
      get().cargarMetricas();
    } catch {
      // Ignorar si falla limpieza remota
    }
  },

  setPeriodoReporte: async (modo, mes) => {
    const nuevoMes = mes || get().mesSeleccionado || defaultMesActual();
    set({ modoReporte: modo, mesSeleccionado: nuevoMes });
    await get().cargarMetricas(modo, nuevoMes);
  },

  cargarMetricas: async (modoInput, mesInput) => {
    const modo = modoInput || get().modoReporte || 'ULTIMOS_30_DIAS';
    const mes = mesInput || get().mesSeleccionado || defaultMesActual();
    set({ cargandoMetricas: true });
    try {
      const params = new URLSearchParams({ modo });
      if (modo === 'POR_MES' && mes) {
        params.set('mes', mes);
      }
      const res = await fetch(`/api/v1/telemetria/metricas?${params.toString()}`);
      if (res.ok) {
        const data: MetricasTrazabilidadResponse = await res.json();
        set({
          metricas: data,
          modoReporte: data.periodo?.modo || modo,
          mesSeleccionado: data.periodo?.mesSeleccionado || mes,
        });
      }
    } catch (err) {
      console.warn('Error al cargar métricas de trazabilidad:', err);
    } finally {
      set({ cargandoMetricas: false });
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
      get().cargarMetricas();
    });

    socket.on('disconnect', () => {
      set({ wsConectado: false });
    });

    socket.on('estado_pc_actualizado', (payload: any) => {
      get().actualizarEstadoEstacion(payload);
      const isHeartbeat = payload?.metadatos?.isHeartbeat === true && payload?.metadatos?.stateChanged === false;
      if (!isHeartbeat) {
        get().cargarMetricas();
      }
    });

    socket.on('usb-status-changed', (payload: any) => {
      if (payload?.codigoPc) {
        get().actualizarEstadoEstacion(payload);
      }
      const isHeartbeat = payload?.metadatos?.isHeartbeat === true && payload?.metadatos?.stateChanged === false;
      if (!isHeartbeat) {
        get().cargarMetricas();
      }
    });

    socket.on('telemetria_malla_limpiada', () => {
      set({ estaciones: [], historialEventos: [] });
      get().cargarMetricas();
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

      const fechaObj = new Date(payload.timestamp || Date.now());
      const fechaValida = !isNaN(fechaObj.getTime()) ? fechaObj : new Date();

      const nuevoLog: TelemetriaLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        codigoPc: payload.codigoPc,
        estado: payload.estadoHardware,
        timestamp: fechaValida.toLocaleTimeString('es-CL'),
        fecha: fechaValida.toLocaleDateString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
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

            const fechaEv = new Date(ev.timestamp);
            const fechaEvValida = !isNaN(fechaEv.getTime()) ? fechaEv : new Date();

            return {
              id: ev.id,
              codigoPc: ev.codigoPc,
              estado: ev.evento || ev.estadoHardware || 'DESCONECTADO',
              timestamp: fechaEvValida.toLocaleTimeString('es-CL'),
              fecha: fechaEvValida.toLocaleDateString('es-CL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }),
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
