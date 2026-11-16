/**
 * Política RBAC de Asignación de Firma Electrónica (I. Municipalidad de Coquimbo)
 * Sincronizada con el motor RBAC del backend.
 */

export type RolFuncionalRbac =
  | 'ALCALDE'
  | 'ADMINISTRADOR_MUNICIPAL'
  | 'SECRETARIO_MUNICIPAL'
  | 'DIRECTOR'
  | 'JEFATURA'
  | 'PROFESIONAL'
  | 'TECNICO'
  | 'ADMINISTRATIVO'
  | 'INSPECTOR'
  | 'OPERADOR_MERCADO_PUBLICO'
  | 'FINANZAS'
  | 'ADQUISICIONES';

export type CalidadContractualRbac =
  | 'PLANTA'
  | 'CONTRATA'
  | 'HONORARIOS'
  | 'PERSONAL_APOYO';

export interface EvaluacionRbacFirma {
  rolFuncional: RolFuncionalRbac;
  etiquetaRol: string;
  calidadContractual: CalidadContractualRbac;
  etiquetaCalidad: string;
  puedeFirmar: boolean;
  permiteFirmaGob: boolean;
  permiteFeaPrivada: boolean;
  predominio: 'FIRMAGOB' | 'FEA_PRIVADA' | 'SEGUN_FUNCIONES' | 'SIN_ASIGNACION';
  requiereJustificacionReforzada: boolean;
  justificacionAprobada: boolean;
  descripcion: string;
  motivoBloqueo?: string;
}

export interface DefinicionRolRbac {
  id: RolFuncionalRbac;
  etiqueta: string;
  predominio: 'FIRMAGOB' | 'FEA_PRIVADA' | 'SEGUN_FUNCIONES' | 'SIN_ASIGNACION';
  permiteFirmaGob: boolean;
  permiteFeaPrivada: boolean;
  habilitadoPorDefecto: boolean;
  descripcion: string;
}

export const CATALOGO_ROLES_RBAC: DefinicionRolRbac[] = [
  {
    id: 'ALCALDE',
    etiqueta: 'Alcalde',
    predominio: 'FIRMAGOB',
    permiteFirmaGob: true,
    permiteFeaPrivada: true,
    habilitadoPorDefecto: true,
    descripcion:
      'Corresponde habitualmente a FirmaGob (y FEA privada según funciones). Suscripción de decretos y actos administrativos de mayor jerarquía.',
  },
  {
    id: 'ADMINISTRADOR_MUNICIPAL',
    etiqueta: 'Administrador Municipal',
    predominio: 'FIRMAGOB',
    permiteFirmaGob: true,
    permiteFeaPrivada: true,
    habilitadoPorDefecto: true,
    descripcion:
      'Corresponde habitualmente a FirmaGob (y FEA privada según funciones). Actos de administración y coordinación.',
  },
  {
    id: 'SECRETARIO_MUNICIPAL',
    etiqueta: 'Secretario Municipal',
    predominio: 'FIRMAGOB',
    permiteFirmaGob: true,
    permiteFeaPrivada: true,
    habilitadoPorDefecto: true,
    descripcion:
      'Corresponde habitualmente a FirmaGob (y FEA privada según funciones). Ministro de fe; suscripción de actos y certificaciones.',
  },
  {
    id: 'DIRECTOR',
    etiqueta: 'Directores',
    predominio: 'FIRMAGOB',
    permiteFirmaGob: true,
    permiteFeaPrivada: true,
    habilitadoPorDefecto: true,
    descripcion:
      'Corresponde habitualmente a FirmaGob (y FEA privada según funciones). Resoluciones y actos propios de su dirección.',
  },
  {
    id: 'JEFATURA',
    etiqueta: 'Jefaturas',
    predominio: 'FIRMAGOB',
    permiteFirmaGob: true,
    permiteFeaPrivada: true,
    habilitadoPorDefecto: true,
    descripcion:
      'Corresponde frecuentemente a FirmaGob (y FEA privada según funciones). Su asignación depende de la potestad de firma delegada.',
  },
  {
    id: 'PROFESIONAL',
    etiqueta: 'Profesionales',
    predominio: 'SEGUN_FUNCIONES',
    permiteFirmaGob: true,
    permiteFeaPrivada: true,
    habilitadoPorDefecto: true,
    descripcion:
      'Asignación según funciones. Participan en la emisión de informes técnicos y la operación de plataformas.',
  },
  {
    id: 'TECNICO',
    etiqueta: 'Técnicos',
    predominio: 'SEGUN_FUNCIONES',
    permiteFirmaGob: true,
    permiteFeaPrivada: true,
    habilitadoPorDefecto: true,
    descripcion:
      'Asignación según funciones. Utilizan firma únicamente si sus labores específicas lo requieren.',
  },
  {
    id: 'ADMINISTRATIVO',
    etiqueta: 'Administrativos',
    predominio: 'SIN_ASIGNACION',
    permiteFirmaGob: false,
    permiteFeaPrivada: false,
    habilitadoPorDefecto: false,
    descripcion:
      'Asignación poco frecuente. Habitualmente no requieren Firma Electrónica Avanzada (FEA).',
  },
  {
    id: 'INSPECTOR',
    etiqueta: 'Inspectores',
    predominio: 'SEGUN_FUNCIONES',
    permiteFirmaGob: true,
    permiteFeaPrivada: true,
    habilitadoPorDefecto: true,
    descripcion:
      'Asignación según funciones. Su uso se orienta a la emisión de actas de fiscalización que requieran firma.',
  },
  {
    id: 'OPERADOR_MERCADO_PUBLICO',
    etiqueta: 'Operadores de Mercado Público',
    predominio: 'FEA_PRIVADA',
    permiteFirmaGob: true,
    permiteFeaPrivada: true,
    habilitadoPorDefecto: true,
    descripcion:
      'Asignación según funciones, con predominio de FEA privada. Operan conforme a las exigencias de la plataforma de compras públicas.',
  },
  {
    id: 'FINANZAS',
    etiqueta: 'Finanzas',
    predominio: 'FIRMAGOB',
    permiteFirmaGob: true,
    permiteFeaPrivada: true,
    habilitadoPorDefecto: true,
    descripcion:
      'Corresponde frecuentemente a FirmaGob (y FEA privada según funciones). Suscriben actos financieros y de tesorería.',
  },
  {
    id: 'ADQUISICIONES',
    etiqueta: 'Adquisiciones',
    predominio: 'FEA_PRIVADA',
    permiteFirmaGob: true,
    permiteFeaPrivada: true,
    habilitadoPorDefecto: true,
    descripcion:
      'Asignación según funciones, con predominio de FEA privada. Operan en plataformas de compras.',
  },
];

export const CALIDADES_CONTRACTUALES_RBAC: Array<{
  id: CalidadContractualRbac;
  etiqueta: string;
  nota: string;
}> = [
  { id: 'PLANTA', etiqueta: 'Planta', nota: 'Asignación subordinada a funciones desempeñadas.' },
  { id: 'CONTRATA', etiqueta: 'Contrata', nota: 'Asignación subordinada a funciones desempeñadas.' },
  {
    id: 'HONORARIOS',
    etiqueta: 'Honorarios',
    nota: 'Exige justificación reforzada como excepción para habilitar firma.',
  },
  {
    id: 'PERSONAL_APOYO',
    etiqueta: 'Personal de apoyo',
    nota: 'Asignación subordinada a funciones desempeñadas.',
  },
];

export function normalizarRolFuncional(cargo?: string | null): RolFuncionalRbac {
  const c = (cargo || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (c.includes('ALCALDE')) return 'ALCALDE';
  if (c.includes('ADMINISTRADOR MUNICIPAL')) return 'ADMINISTRADOR_MUNICIPAL';
  if (c.includes('SECRETARIO MUNICIPAL') || c.includes('MINISTRO DE FE')) return 'SECRETARIO_MUNICIPAL';
  if (c.includes('DIRECTOR')) return 'DIRECTOR';
  if (c.includes('JEFATURA') || c.includes('JEFE')) return 'JEFATURA';
  if (c.includes('MERCADO PUBLICO')) return 'OPERADOR_MERCADO_PUBLICO';
  if (c.includes('ADQUISICION')) return 'ADQUISICIONES';
  if (c.includes('FINANZA') || c.includes('TESORER')) return 'FINANZAS';
  if (c.includes('INSPECTOR')) return 'INSPECTOR';
  if (c.includes('TECNIC')) return 'TECNICO';
  if (c.includes('ADMINISTRATIV')) return 'ADMINISTRATIVO';
  return 'PROFESIONAL';
}

export function normalizarCalidadContractual(condicion?: string | null): {
  calidad: CalidadContractualRbac;
  etiqueta: string;
  justificacionAprobada: boolean;
} {
  const raw = (condicion || 'CONTRATA').toUpperCase();
  const justificacionAprobada = raw.includes('JUSTIFICADO') || raw.includes('EXCEPCION_APROBADA');
  if (raw.includes('HONORARIO')) {
    return { calidad: 'HONORARIOS', etiqueta: 'Honorarios', justificacionAprobada };
  }
  if (raw.includes('PLANTA')) {
    return { calidad: 'PLANTA', etiqueta: 'Planta', justificacionAprobada: true };
  }
  if (raw.includes('APOYO')) {
    return { calidad: 'PERSONAL_APOYO', etiqueta: 'Personal de apoyo', justificacionAprobada: true };
  }
  return { calidad: 'CONTRATA', etiqueta: 'Contrata', justificacionAprobada: true };
}

export function evaluarPoliticaRbacFirma(usuario: {
  rol?: string | null;
  cargo?: string | null;
  condicionContractual?: string | null;
}): EvaluacionRbacFirma {
  const rolSistema = (usuario.rol || 'FUNCIONARIO').toUpperCase();
  const rolFuncional = normalizarRolFuncional(usuario.cargo);
  const def =
    CATALOGO_ROLES_RBAC.find((r) => r.id === rolFuncional) ||
    CATALOGO_ROLES_RBAC.find((r) => r.id === 'PROFESIONAL')!;
  const { calidad, etiqueta, justificacionAprobada } = normalizarCalidadContractual(
    usuario.condicionContractual,
  );
  const cargoUpper = (usuario.cargo || '').toUpperCase();
  const habilitadoPorFuncion =
    def.habilitadoPorDefecto ||
    cargoUpper.includes('HABILITAD') ||
    cargoUpper.includes('FEA');

  if (rolSistema === 'PENDIENTE') {
    return {
      rolFuncional,
      etiquetaRol: def.etiqueta,
      calidadContractual: calidad,
      etiquetaCalidad: etiqueta,
      puedeFirmar: false,
      permiteFirmaGob: false,
      permiteFeaPrivada: false,
      predominio: def.predominio,
      requiereJustificacionReforzada: calidad === 'HONORARIOS',
      justificacionAprobada,
      descripcion: def.descripcion,
      motivoBloqueo:
        'Cuenta pendiente de aprobación y asignación de grado/funciones por parte del Administrador.',
    };
  }

  if (rolSistema !== 'ADMIN' && !habilitadoPorFuncion) {
    return {
      rolFuncional,
      etiquetaRol: def.etiqueta,
      calidadContractual: calidad,
      etiquetaCalidad: etiqueta,
      puedeFirmar: false,
      permiteFirmaGob: false,
      permiteFeaPrivada: false,
      predominio: def.predominio,
      requiereJustificacionReforzada: calidad === 'HONORARIOS',
      justificacionAprobada,
      descripcion: def.descripcion,
      motivoBloqueo:
        'El grado Administrativo habitualmente no requiere Firma Electrónica Avanzada (FEA) salvo habilitación expresa según funciones.',
    };
  }

  if (rolSistema !== 'ADMIN' && calidad === 'HONORARIOS' && !justificacionAprobada) {
    return {
      rolFuncional,
      etiquetaRol: def.etiqueta,
      calidadContractual: calidad,
      etiquetaCalidad: etiqueta,
      puedeFirmar: false,
      permiteFirmaGob: false,
      permiteFeaPrivada: false,
      predominio: def.predominio,
      requiereJustificacionReforzada: true,
      justificacionAprobada: false,
      descripcion: def.descripcion,
      motivoBloqueo:
        'Calidad contractual Honorarios: requiere justificación reforzada aprobada como excepción para habilitar firma electrónica.',
    };
  }

  return {
    rolFuncional,
    etiquetaRol: def.etiqueta,
    calidadContractual: calidad,
    etiquetaCalidad: etiqueta,
    puedeFirmar: true,
    permiteFirmaGob: def.permiteFirmaGob || habilitadoPorFuncion,
    permiteFeaPrivada: def.permiteFeaPrivada || habilitadoPorFuncion,
    predominio: def.predominio,
    requiereJustificacionReforzada: calidad === 'HONORARIOS',
    justificacionAprobada,
    descripcion: def.descripcion,
  };
}
