import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export type EstadoHardwareType = 'DESCONECTADO' | 'CONECTADO';

export type ModoReporteType =
  | 'ULTIMOS_7_DIAS'
  | 'ULTIMOS_15_DIAS'
  | 'ULTIMOS_30_DIAS'
  | 'ULTIMOS_60_DIAS'
  | 'POR_MES'
  | 'POR_ANIO';

export interface EstacionTrabajo {
  id?: string;
  codigoPc: string;
  ipAsignada: string;
  dependenciaFisica: string;
  estadoEnVivo: EstadoHardwareType;
  ultimoPing: string;
  conectadoDesde?: string;
  minutosConectado?: number;
  tokenInfo?: {
    serialNumber?: string;
    vendorId?: string;
    marca?: string;
    modelo?: string;
    titularNombre?: string;
    titularRut?: string;
    titularEmail?: string;
    titularCargo?: string;
    titularUnidad?: string;
    certNotAfter?: string;
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
  promedioUsoDiarioMinutos?: number;
  tiempoUsoMinutos?: number;
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
      estadoActual: 'CONECTADO' | 'DESCONECTADO';
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
        cargo?: string;
        email?: string;
        origenCertificado?: boolean;
      } | null;
      estacionActual: string | null;
      ultimaIp?: string | null;
      dependenciaFisica?: string | null;
      estadoEnVivo: 'CONECTADO' | 'DESCONECTADO';
      fechaExpiracion?: string;
      diasRestantes?: number;
      tiempoExpiracionTexto?: string;
      totalEventosPeriodo: number;
      conexionesPeriodo: number;
      firmasPeriodo: number;
      desconexionesPeriodo: number;
      tiempoUsoMinutos?: number;
      promedioUsoDiarioMinutos?: number;
      porcentajeUsoMensual?: number;
      porcentajeUsoPeriodo: number;
      ultimaActividad: string;
    }>;
    tiempoUsoTotalMinutos?: number;
    promedioUsoDiarioGeneralMinutos?: number;
    porcentajeUsoMedioMensual?: number;
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
  cargarEventosRecientes: () => Promise<void>;
  cargarMetricas: (modo?: ModoReporteType, mes?: string, anio?: string) => Promise<void>;
  setPeriodoReporte: (modo: ModoReporteType, mes?: string, anio?: string) => Promise<void>;
  simularEventoHardware: (codigoPc: string, nuevoEstado: EstadoHardwareType) => Promise<void>;
  registrarAccionFirma: (payload: {
    rutFuncionario?: string;
    usuarioId?: string;
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
  estaciones: [],
  historialEventos: [],
  metricas: null,
  cargandoMetricas: false,
  modoReporte: 'ULTIMOS_30_DIAS',
  mesSeleccionado: defaultMesActual(),
  anioSeleccionado: defaultAnioActual(),

  limpiarMalla: async () => {
    set({ estaciones: [], historialEventos: [] });
    try {
      await fetch('/api/v1/telemetria/limpiar', { method: 'POST' });
    } catch {
      // Ignorar si falla limpieza remota
    }
  },

  setPeriodoReporte: async (modo, mes, anio) => {
    const nuevoMes = mes || get().mesSeleccionado || defaultMesActual();
    const nuevoAnio = anio || get().anioSeleccionado || defaultAnioActual();
    set({
      modoReporte: modo,
      mesSeleccionado: nuevoMes,
      anioSeleccionado: nuevoAnio,
    });
    await get().cargarMetricas(modo, nuevoMes, nuevoAnio);
  },

  cargarMetricas: async (modoInput, mesInput, anioInput) => {
    const modo = modoInput || get().modoReporte || 'ULTIMOS_30_DIAS';
    const mes = mesInput || get().mesSeleccionado || defaultMesActual();
    const anio = anioInput || get().anioSeleccionado || defaultAnioActual();

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
        const backendTraza = (data.telemetria?.trazabilidadDispositivos || []).filter(
          (item) => !(item.serialNumber.startsWith('SN-WIN-') && item.serialNumber.endsWith('-UNKNOWN')),
        );

        set({
          metricas: {
            ...data,
            resumenDispositivos: data.resumenDispositivos || {
              totalExistentes: backendTraza.length,
              activos: backendTraza.length,
              expirados: 0,
              porcentajeActivos: backendTraza.length > 0 ? 100 : 0,
              porcentajeExpirados: 0,
              conectadosEnSesion: data.telemetria?.estacionesConectadas || 0,
              firmandoEnSesion: 0,
            },
            firmasAsignadas: data.firmasAsignadas || {
              totalAsignadas: backendTraza.length,
              vigentes: backendTraza.length,
              porVencer: 0,
              expiradas: 0,
              listado: [],
            },
            accionesFuncionarios: data.accionesFuncionarios || {
              totalAccionesFirmaPeriodo: 0,
              totalAccionesFirmaHistorico: 0,
              conexionesExcluidasPeriodo: data.telemetria?.eventosConectado || 0,
              desconexionesExcluidasPeriodo: data.telemetria?.eventosDesconectado || 0,
              listadoPorFuncionario: [],
            },
            telemetria: {
              ...(data.telemetria || {}),
              trazabilidadDispositivos: backendTraza,
            },
          },
          modoReporte: data.periodo?.modo || modo,
          mesSeleccionado: data.periodo?.mesSeleccionado || mes,
          anioSeleccionado: data.periodo?.anioSeleccionado || anio,
        });
      }
    } catch {
      // No usar datos mock hardcodeados
    } finally {
      set({ cargandoMetricas: false });
    }
  },

  registrarAccionFirma: async (payload) => {
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
            estadoConexion: 'CONECTADO' as EstadoHardwareType,
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
        estado: 'CONECTADO',
        timestamp: ahora.toLocaleTimeString('es-CL'),
        fecha: ahora.toLocaleDateString('es-CL'),
        serialNumber: payload.serialNumber || 'SAFENET-5110-CQ01',
      };

      const nuevasEstaciones = state.estaciones.map((est) =>
        est.codigoPc === codigoPcEvento
          ? { ...est, estadoEnVivo: 'CONECTADO' as EstadoHardwareType, ultimoPing: ahora.toISOString() }
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

    try {
      await fetch('/api/v1/telemetria/accion-firma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Mantiene estado local optimista si el backend no responde
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
      get().cargarEventosRecientes();
      get().cargarMetricas();
    });

    socket.on('disconnect', () => {
      set({ wsConectado: false });
    });

    socket.on('estado_pc_actualizado', (payload: any) => {
      const prev = get().estaciones.find((e) => e.codigoPc === payload?.codigoPc);
      const cambioEstado =
        !prev ||
        (payload?.estadoHardware && prev.estadoEnVivo !== payload.estadoHardware) ||
        (payload?.serialNumber && prev.tokenInfo?.serialNumber !== payload.serialNumber) ||
        Boolean(payload?.metadatos?.titularNombre && prev.tokenInfo?.titularNombre !== payload.metadatos.titularNombre);
      get().actualizarEstadoEstacion(payload);
      if (cambioEstado) {
        get().cargarMetricas();
      }
    });

    socket.on('usb-status-changed', (payload: any) => {
      if (payload?.codigoPc) {
        const prev = get().estaciones.find((e) => e.codigoPc === payload.codigoPc);
        const cambioEstado =
          !prev ||
          (payload?.estadoHardware && prev.estadoEnVivo !== payload.estadoHardware) ||
          (payload?.serialNumber && prev.tokenInfo?.serialNumber !== payload.serialNumber) ||
          Boolean(payload?.metadatos?.titularNombre && prev.tokenInfo?.titularNombre !== payload.metadatos.titularNombre);
        get().actualizarEstadoEstacion(payload);
        if (cambioEstado) {
          get().cargarMetricas();
        }
      }
    });

    socket.on('sincronizacion_automatica', () => {
      get().cargarEstaciones();
      get().cargarEventosRecientes();
      get().cargarMetricas();
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
                titularNombre: payload.metadatos?.titularNombre,
                titularRut: payload.metadatos?.titularRut,
                titularEmail: payload.metadatos?.titularEmail,
                titularCargo: payload.metadatos?.titularCargo,
                titularUnidad: payload.metadatos?.titularUnidad,
                certNotAfter: payload.metadatos?.certNotAfter,
              }
            : undefined);

      const conectadoDesde = isDesconectado
        ? undefined
        : estacionPrevia?.estadoEnVivo === 'CONECTADO' && estacionPrevia.conectadoDesde
          ? estacionPrevia.conectadoDesde
          : payload.timestamp || new Date().toISOString();

      const minutosCalculados = isDesconectado
        ? 0
        : typeof (payload as any).minutosConectado === 'number'
          ? (payload as any).minutosConectado
          : conectadoDesde
            ? Math.max(0, Math.floor((Date.now() - new Date(conectadoDesde).getTime()) / 60000))
            : 0;

      const nuevasEstaciones: EstacionTrabajo[] = existe
        ? state.estaciones.map((est) =>
            est.codigoPc === payload.codigoPc
              ? {
                  ...est,
                  estadoEnVivo: payload.estadoHardware,
                  ultimoPing: payload.timestamp || new Date().toISOString(),
                  conectadoDesde,
                  minutosConectado: minutosCalculados,
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
              conectadoDesde,
              minutosConectado: minutosCalculados,
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
        if (Array.isArray(data)) {
          const prevEstaciones = get().estaciones;
          const mappedEstaciones: EstacionTrabajo[] = data.map((d: any) => {
            const estadoEnVivo: EstadoHardwareType = d.estadoEnVivo || d.estadoHardware || 'CONECTADO';
            const prev = prevEstaciones.find((p) => p.codigoPc === d.codigoPc);
            const isConectado = estadoEnVivo === 'CONECTADO';
            const conectadoDesde = !isConectado
              ? undefined
              : d.conectadoDesde ||
                d.sessionStart ||
                (prev?.estadoEnVivo === 'CONECTADO' ? prev.conectadoDesde : undefined) ||
                d.ultimoPing ||
                new Date().toISOString();
            const minutosConectado = !isConectado
              ? 0
              : typeof d.minutosConectado === 'number'
                ? d.minutosConectado
                : conectadoDesde
                  ? Math.max(0, Math.floor((Date.now() - new Date(conectadoDesde).getTime()) / 60000))
                  : 0;

            return {
              id: d.id,
              codigoPc: d.codigoPc,
              ipAsignada: d.ipAsignada || '10.20.1.10',
              dependenciaFisica: d.dependenciaFisica || 'Unidad Municipal',
              estadoEnVivo,
              ultimoPing: d.ultimoPing || new Date().toISOString(),
              conectadoDesde,
              minutosConectado,
              tokenInfo: d.tokenInfo || (d.token ? {
                serialNumber: d.token.serialNumber,
                vendorId: d.token.vendorId,
                marca: d.token.marca,
                modelo: d.token.modelo,
              } : undefined),
            };
          });
          set({ estaciones: mappedEstaciones });
        }
      }
    } catch {
      // Error de red
    }
  },

  cargarEventosRecientes: async () => {
    try {
      const resEventos = await fetch('/api/v1/telemetria/eventos-recientes');
      if (resEventos.ok) {
        const data = await resEventos.json();
        if (Array.isArray(data)) {
          const mappedEventos: TelemetriaLog[] = data.map((e: any) => {
            const fechaObj = new Date(e.timestamp || Date.now());
            const fechaValida = !isNaN(fechaObj.getTime()) ? fechaObj : new Date();
            return {
              id: e.id,
              codigoPc: e.codigoPc,
              estado: e.evento || 'CONECTADO',
              timestamp: fechaValida.toLocaleTimeString('es-CL'),
              fecha: fechaValida.toLocaleDateString('es-CL'),
              serialNumber: e.token?.serialNumber || e.serialNumber,
            };
          });
          set({ historialEventos: mappedEventos });
        }
      }
    } catch {
      // Error de red
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
