import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import {
  MOCK_ESTACIONES,
  MOCK_HISTORIAL_EVENTOS,
  buildMockMetricas,
} from '../lib/mockTestData';

export type EstadoHardwareType = 'DESCONECTADO' | 'CONECTADO' | 'FIRMANDO';

export type ModoReporteType =
  | 'ULTIMOS_7_DIAS'
  | 'ULTIMOS_15_DIAS'
  | 'ULTIMOS_30_DIAS'
  | 'POR_MES'
  | 'POR_ANIO';

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

export interface FirmaAsignadaItem {
  id: string;
  numeroSerieCertificado: string;
  serialNumberToken: string;
  marca: string;
  modelo: string;
  funcionario: {
    id: string;
    rut: string;
    nombre: string;
    email: string;
    cargo: string;
    unidad: string;
  };
  fechaAsignacion: string;
  fechaExpiracion: string;
  diasRestantes: number;
  tiempoExpiracionTexto: string;
  estado: 'ACTIVO' | 'POR_VENCER' | 'EXPIRADO';
  accionesFirmaPeriodo: number;
  accionesFirmaTotal: number;
  estacionActual: string | null;
  estadoConexion: EstadoHardwareType;
  codigoContrato?: string;
}

export interface AccionFuncionarioItem {
  usuarioId: string;
  rut: string;
  nombre: string;
  email: string;
  cargo: string;
  unidad: string;
  serialNumberToken: string;
  modeloToken: string;
  estadoToken: 'ACTIVO' | 'POR_VENCER' | 'EXPIRADO';
  diasRestantesToken: number;
  accionesFirmaPeriodo: number;
  accionesFirmaHistorico: number;
  conexionesIgnoradasPeriodo: number;
  desconexionesIgnoradasPeriodo: number;
  porcentajeParticipacionFirmas: number;
  ultimaAccionFirma: string | null;
  codigoPcUltimaSesion: string | null;
}

export interface TokenAlertaItem {
  id: string;
  numeroSerie: string;
  serialNumberToken: string;
  hardwareModelo: string;
  diasRestantes: number;
  tramoAlerta: '15_DIAS' | '30_DIAS' | '60_DIAS' | 'EXPIRADO';
  severidad: 'ALTA' | 'MEDIA' | 'BAJA';
  fechaInicio: string;
  fechaExpiracion: string;
  tiempoExpiracionTexto: string;
  usuario: {
    id: string;
    nombre: string;
    rut: string;
    email: string;
    unidad: string;
    cargo?: string;
  };
  ultimoAvisoEnviado?: string | null;
}

export interface ContratoTokenItem {
  id: string;
  codigoContrato: string;
  titulo: string;
  proveedor: string;
  ordenCompra?: string;
  resolucionAprueba?: string;
  fechaInicio: string;
  fechaTermino: string;
  diasRestantes: number;
  mesesRestantes?: number;
  tiempoCaducidadTexto: string;
  porcentajeVigenciaTranscurrida: number;
  estadoContrato: 'VIGENTE' | 'POR_CADUCAR' | 'CADUCADO';
  cantidadTokensContratados: number;
  cantidadTokensActivos?: number;
  montoTotalClp?: number;
  administradorContrato?: string;
  observaciones?: string;
  pdfUrl?: string;
}

export interface MetricasTrazabilidadResponse {
  periodo: {
    modo: ModoReporteType;
    mesSeleccionado: string;
    anioSeleccionado?: string;
    etiquetaPeriodo: string;
    fechaInicio: string;
    fechaFin: string;
    mesesDisponibles: Array<{
      valor: string;
      etiqueta: string;
    }>;
    aniosDisponibles?: Array<{
      valor: string;
      etiqueta: string;
    }>;
  };
  resumenDispositivos?: {
    totalExistentes: number;
    activos: number;
    expirados: number;
    porcentajeActivos: number;
    porcentajeExpirados: number;
    conectadosEnSesion: number;
    firmandoEnSesion: number;
  };
  firmasAsignadas?: {
    totalAsignadas: number;
    vigentes: number;
    porVencer: number;
    expiradas: number;
    listado: FirmaAsignadaItem[];
  };
  accionesFuncionarios?: {
    totalAccionesFirmaPeriodo: number;
    totalAccionesFirmaHistorico: number;
    conexionesExcluidasPeriodo: number;
    desconexionesExcluidasPeriodo: number;
    listadoPorFuncionario: AccionFuncionarioItem[];
  };
  alertasVencimiento?: {
    menosDe15Dias: number;
    entre16Y30Dias: number;
    entre31Y60Dias: number;
    totalEnUmbral60Dias: number;
    expirados: number;
    tokensEnAlerta: TokenAlertaItem[];
  };
  contratosResumen?: {
    totalContratos: number;
    contratosVigentes: number;
    contratosPorCaducar: number;
    contratosCaducados: number;
    totalTokensContratados: number;
    listado: ContratoTokenItem[];
  };
  latexPreview?: {
    codigoLatex: string;
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
    tokensExpirados?: number;
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
      estadoPatrimonial: 'OPERATIVO' | 'ASIGNADO' | 'EN_REVISION' | 'DADO_DE_BAJA' | 'EXPIRADO';
      funcionarioAsignado: {
        nombre: string;
        rut: string;
        unidad: string;
      } | null;
      estacionActual: string | null;
      estadoEnVivo: 'CONECTADO' | 'FIRMANDO' | 'DESCONECTADO';
      fechaExpiracion?: string;
      diasRestantes?: number;
      tiempoExpiracionTexto?: string;
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
  modoReporte: ModoReporteType;
  mesSeleccionado: string;
  anioSeleccionado: string;
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
  cargarMetricas: (modo?: ModoReporteType, mes?: string, anio?: string) => Promise<void>;
  setPeriodoReporte: (modo: ModoReporteType, mes?: string, anio?: string) => Promise<void>;
  simularEventoHardware: (codigoPc: string, nuevoEstado: EstadoHardwareType) => Promise<void>;
  registrarAccionFirma: (payload: {
    rutFuncionario?: string;
    serialNumber?: string;
    codigoPc?: string;
    glosaAccion?: string;
  }) => Promise<boolean>;
  limpiarMalla: () => void;
}

const defaultMesActual = () => {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
};

const defaultAnioActual = () => {
  return String(new Date().getFullYear());
};

export const useTelemetriaStore = create<TelemetriaState>((set, get) => ({
  socket: null,
  wsConectado: true,
  estaciones: MOCK_ESTACIONES,
  historialEventos: MOCK_HISTORIAL_EVENTOS,
  metricas: buildMockMetricas('ULTIMOS_30_DIAS', defaultMesActual(), defaultAnioActual()),
  cargandoMetricas: false,
  modoReporte: 'ULTIMOS_30_DIAS',
  mesSeleccionado: defaultMesActual(),
  anioSeleccionado: defaultAnioActual(),

  limpiarMalla: async () => {
    set({ estaciones: MOCK_ESTACIONES, historialEventos: MOCK_HISTORIAL_EVENTOS });
    try {
      await fetch('/api/v1/telemetria/limpiar', { method: 'POST' });
    } catch {
      // Ignorar si falla limpieza remota
    }
  },

  setPeriodoReporte: async (modo, mes, anio) => {
    const nuevoMes = mes || get().mesSeleccionado || defaultMesActual();
    const nuevoAnio = anio || get().anioSeleccionado || defaultAnioActual();
    const fallbackData = buildMockMetricas(modo, nuevoMes, nuevoAnio);
    set({
      modoReporte: modo,
      mesSeleccionado: nuevoMes,
      anioSeleccionado: nuevoAnio,
      metricas: fallbackData,
    });
    await get().cargarMetricas(modo, nuevoMes, nuevoAnio);
  },

  cargarMetricas: async (modoInput, mesInput, anioInput) => {
    const modo = modoInput || get().modoReporte || 'ULTIMOS_30_DIAS';
    const mes = mesInput || get().mesSeleccionado || defaultMesActual();
    const anio = anioInput || get().anioSeleccionado || defaultAnioActual();
    const fallback = buildMockMetricas(modo, mes, anio);

    set({ cargandoMetricas: true });
    try {
      const params = new URLSearchParams({ modo });
      if (modo === 'POR_MES' && mes) {
        params.set('mes', mes);
      }
      if (modo === 'POR_ANIO' && anio) {
        params.set('anio', anio);
      }
      const res = await fetch(`/api/v1/telemetria/metricas?${params.toString()}`);
      if (res.ok) {
        const data: MetricasTrazabilidadResponse = await res.json();
        const merged: MetricasTrazabilidadResponse = {
          ...fallback,
          ...data,
          resumenDispositivos:
            data.resumenDispositivos && data.resumenDispositivos.totalExistentes > 0
              ? data.resumenDispositivos
              : fallback.resumenDispositivos,
          firmasAsignadas:
            data.firmasAsignadas && data.firmasAsignadas.listado?.length > 0
              ? data.firmasAsignadas
              : fallback.firmasAsignadas,
          accionesFuncionarios:
            data.accionesFuncionarios && data.accionesFuncionarios.listadoPorFuncionario?.length > 0
              ? data.accionesFuncionarios
              : fallback.accionesFuncionarios,
          alertasVencimiento:
            data.alertasVencimiento && data.alertasVencimiento.tokensEnAlerta?.length > 0
              ? data.alertasVencimiento
              : fallback.alertasVencimiento,
          contratosResumen:
            data.contratosResumen && data.contratosResumen.listado?.length > 0
              ? data.contratosResumen
              : fallback.contratosResumen,
        };
        set({
          metricas: merged,
          modoReporte: merged.periodo?.modo || modo,
          mesSeleccionado: merged.periodo?.mesSeleccionado || mes,
          anioSeleccionado: merged.periodo?.anioSeleccionado || anio,
        });
      } else if (!get().metricas) {
        set({ metricas: fallback });
      }
    } catch {
      if (!get().metricas) {
        set({ metricas: fallback });
      }
    } finally {
      set({ cargandoMetricas: false });
    }
  },

  registrarAccionFirma: async (payload) => {
    // 1. Actualización optimista inmediata en el estado local para flujo de pruebas fluido
    set((state) => {
      const m = state.metricas;
      if (!m) return state;

      const listadoFirmas = (m.firmasAsignadas?.listado || []).map((f) => {
        const match =
          (payload.serialNumber && f.serialNumberToken === payload.serialNumber) ||
          (payload.rutFuncionario && f.funcionario.rut === payload.rutFuncionario);
        if (match) {
          return {
            ...f,
            accionesFirmaPeriodo: f.accionesFirmaPeriodo + 1,
            accionesFirmaTotal: f.accionesFirmaTotal + 1,
            estadoConexion: 'FIRMANDO' as EstadoHardwareType,
          };
        }
        return f;
      });

      const nuevoTotalPeriodo = (m.accionesFuncionarios?.totalAccionesFirmaPeriodo ?? 0) + 1;
      const nuevoTotalHistorico = (m.accionesFuncionarios?.totalAccionesFirmaHistorico ?? 0) + 1;

      const listadoAcciones = (m.accionesFuncionarios?.listadoPorFuncionario || []).map((a) => {
        const match =
          (payload.rutFuncionario && a.rut === payload.rutFuncionario) ||
          (payload.serialNumber && a.serialNumberToken === payload.serialNumber);
        const nuevasPeriodo = match ? a.accionesFirmaPeriodo + 1 : a.accionesFirmaPeriodo;
        return {
          ...a,
          accionesFirmaPeriodo: nuevasPeriodo,
          accionesFirmaHistorico: match ? a.accionesFirmaHistorico + 1 : a.accionesFirmaHistorico,
          porcentajeParticipacionFirmas:
            nuevoTotalPeriodo > 0 ? Math.round((nuevasPeriodo / nuevoTotalPeriodo) * 100) : 0,
          ultimaAccionFirma: match ? new Date().toISOString() : a.ultimaAccionFirma,
        };
      });

      const codigoPcEvento = payload.codigoPc || 'PC-SECMUN-01';
      const ahora = new Date();
      const nuevoLog: TelemetriaLog = {
        id: `log-${Date.now()}`,
        codigoPc: codigoPcEvento,
        estado: 'FIRMANDO',
        timestamp: ahora.toLocaleTimeString('es-CL'),
        fecha: ahora.toLocaleDateString('es-CL'),
        serialNumber: payload.serialNumber || 'SAFENET-5110-CQ01',
      };

      const nuevasEstaciones = state.estaciones.map((est) =>
        est.codigoPc === codigoPcEvento
          ? { ...est, estadoEnVivo: 'FIRMANDO' as EstadoHardwareType, ultimoPing: ahora.toISOString() }
          : est,
      );

      return {
        estaciones: nuevasEstaciones,
        historialEventos: [nuevoLog, ...state.historialEventos.slice(0, 49)],
        metricas: {
          ...m,
          firmasAsignadas: m.firmasAsignadas
            ? { ...m.firmasAsignadas, listado: listadoFirmas }
            : undefined,
          accionesFuncionarios: m.accionesFuncionarios
            ? {
                ...m.accionesFuncionarios,
                totalAccionesFirmaPeriodo: nuevoTotalPeriodo,
                totalAccionesFirmaHistorico: nuevoTotalHistorico,
                listadoPorFuncionario: listadoAcciones,
              }
            : undefined,
        },
      };
    });

    // 2. Sincronizar con el backend si está disponible
    try {
      await fetch('/api/v1/telemetria/accion-firma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Mantiene actualización optimista
    }
    return true;
  },

  inicializarSocket: () => {
    if (get().socket) return;

    const wsUrl = import.meta.env.VITE_WS_URL || '/';
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
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
    });

    socket.on('usb-status-changed', (payload: any) => {
      if (payload?.codigoPc) {
        get().actualizarEstadoEstacion(payload);
      }
    });

    set({ socket });
  },

  actualizarEstadoEstacion: (payload) => {
    set((state) => {
      const isDesconectado = payload.estadoHardware === 'DESCONECTADO';
      const estacionPrevia = state.estaciones.find((e) => e.codigoPc === payload.codigoPc);
      const existe = Boolean(estacionPrevia);

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

      const nuevasEstaciones: EstacionTrabajo[] = existe
        ? state.estaciones.map((est) =>
            est.codigoPc === payload.codigoPc
              ? {
                  ...est,
                  estadoEnVivo: payload.estadoHardware,
                  ultimoPing: payload.timestamp || new Date().toISOString(),
                  tokenInfo: isDesconectado ? undefined : (tokenRecibido || est.tokenInfo),
                  ipAsignada: payload.ipAsignada || est.ipAsignada,
                  dependenciaFisica: payload.dependenciaFisica || est.dependenciaFisica,
                }
              : est,
          )
        : [
            ...state.estaciones,
            {
              codigoPc: payload.codigoPc,
              ipAsignada: payload.ipAsignada || '127.0.0.1',
              dependenciaFisica: payload.dependenciaFisica || 'Estación Municipal',
              estadoEnVivo: payload.estadoHardware,
              ultimoPing: payload.timestamp || new Date().toISOString(),
              tokenInfo: isDesconectado ? undefined : tokenRecibido,
            },
          ];

      const fechaObj = new Date(payload.timestamp || Date.now());
      const fechaValida = !isNaN(fechaObj.getTime()) ? fechaObj : new Date();

      const nuevoLog: TelemetriaLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        codigoPc: payload.codigoPc,
        estado: payload.estadoHardware,
        timestamp: fechaValida.toLocaleTimeString('es-CL'),
        fecha: fechaValida.toLocaleDateString('es-CL'),
        serialNumber: tokenRecibido?.serialNumber || payload.serialNumber,
      };

      return {
        estaciones: nuevasEstaciones,
        historialEventos: [nuevoLog, ...state.historialEventos.slice(0, 49)],
      };
    });
  },

  cargarEstaciones: async () => {
    try {
      const resEst = await fetch('/api/v1/telemetria/estaciones');
      if (resEst.ok) {
        const data = await resEst.json();
        if (Array.isArray(data) && data.length > 0) {
          const mappedEstaciones: EstacionTrabajo[] = data.map((d: any) => ({
            id: d.id,
            codigoPc: d.codigoPc,
            ipAsignada: d.ipAsignada || '10.20.1.10',
            dependenciaFisica: d.dependenciaFisica || 'Unidad Municipal',
            estadoEnVivo: d.estadoEnVivo || d.estadoHardware || 'CONECTADO',
            ultimoPing: d.ultimoPing || new Date().toISOString(),
            tokenInfo: d.tokenInfo || (d.token ? {
              serialNumber: d.token.serialNumber,
              vendorId: d.token.vendorId,
              marca: d.token.marca,
              modelo: d.token.modelo,
            } : undefined),
          }));
          set({ estaciones: mappedEstaciones });
        }
      }
    } catch {
      // Mantiene MOCK_ESTACIONES iniciales
    }
  },

  simularEventoHardware: async (codigoPc: string, nuevoEstado: EstadoHardwareType) => {
    const payload = {
      codigoPc,
      estadoHardware: nuevoEstado,
      timestamp: new Date().toISOString(),
    };
    get().actualizarEstadoEstacion(payload);
    try {
      await fetch('/api/v1/telemetria/usb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Ignorar error de red
    }
  },
}));
