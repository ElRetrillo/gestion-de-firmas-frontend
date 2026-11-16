/**
 * Utilidades para normalización, formateo y búsqueda flexible de RUT chileno.
 */

export function cleanRut(rut: string): string {
  return (rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
}

/**
 * Formatea un RUT con puntos y guion: XX.XXX.XXX-Y
 * Si se ingresa "213748084" retorna "21.374.808-4"
 */
export function formatRut(value: string): string {
  const clean = cleanRut(value).slice(0, 9);
  if (!clean) return '';
  if (clean.length <= 1) return clean;

  const dv = clean.slice(-1);
  const cuerpo = clean.slice(0, -1);

  let cuerpoFormateado = '';
  let count = 0;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    cuerpoFormateado = cuerpo[i] + cuerpoFormateado;
    count++;
    if (count === 3 && i > 0) {
      cuerpoFormateado = '.' + cuerpoFormateado;
      count = 0;
    }
  }
  return `${cuerpoFormateado}-${dv}`;
}

/**
 * Calcula el dígito verificador chileno (Módulo 11) para un cuerpo de RUT numérico.
 */
export function calcularDvRut(cuerpoDigits: string): string {
  const digits = (cuerpoDigits || '').replace(/\D/g, '');
  if (!digits) return '';
  let suma = 0;
  let multiplicador = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    suma += Number(digits[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

/**
 * Formatea cualquier RUT o RUN (con o sin dígito verificador, puntos o guion)
 * a formato estándar visual XX.XXX.XXX-Y.
 * Ej: "16892415" -> "16.892.415-3", "16892415-3" -> "16.892.415-3".
 */
export function formatRutVisual(value?: string | null): string {
  const raw = (value || '').trim();
  if (!raw || raw === '-' || raw === 'N/A') return raw || '-';

  const clean = cleanRut(raw);
  if (clean.length < 2) return raw;

  let cuerpo: string;
  let dv: string;

  if (raw.includes('-')) {
    dv = clean.slice(-1);
    cuerpo = clean.slice(0, -1);
  } else if (clean.length <= 8 && /^\d+$/.test(clean)) {
    // RUN sin dígito verificador (ej: token FirmaGob "16892415")
    cuerpo = clean;
    dv = calcularDvRut(cuerpo);
  } else {
    dv = clean.slice(-1);
    cuerpo = clean.slice(0, -1);
  }

  let cuerpoFormateado = '';
  let count = 0;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    cuerpoFormateado = cuerpo[i] + cuerpoFormateado;
    count++;
    if (count === 3 && i > 0) {
      cuerpoFormateado = '.' + cuerpoFormateado;
      count = 0;
    }
  }
  return `${cuerpoFormateado}-${dv}`;
}

/**
 * Genera variantes de búsqueda para un término ingresado.
 * Permite que al buscar "12312312" se encuentren "12.312.312-K", "12.312.312", etc.
 */
export function getRutVariants(query: string): string[] {
  const clean = cleanRut(query);
  const variants = new Set<string>();
  const trimmed = (query || '').trim();
  if (trimmed) variants.add(trimmed);

  if (clean.length >= 4) {
    // 1. Variante cuerpo + dv (ej: 12312312 -> 1.231.231-2)
    const dv = clean.slice(-1);
    const cuerpo = clean.slice(0, -1);
    let f1 = '';
    let count = 0;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      f1 = cuerpo[i] + f1;
      count++;
      if (count === 3 && i > 0) {
        f1 = '.' + f1;
        count = 0;
      }
    }
    variants.add(`${f1}-${dv}`);

    // 2. Variante sólo cuerpo con puntos (ej: 12312312 -> 12.312.312)
    let f2 = '';
    count = 0;
    for (let i = clean.length - 1; i >= 0; i--) {
      f2 = clean[i] + f2;
      count++;
      if (count === 3 && i > 0) {
        f2 = '.' + f2;
        count = 0;
      }
    }
    variants.add(f2);
  }

  return Array.from(variants);
}

/**
 * Compara si un RUT coincide con el término de búsqueda, soportando búsquedas
 * sin formato como '12312312' o con formato '12.312.312-K'.
 */
export function matchesRutSearch(rutValue: string, query: string): boolean {
  if (!query || !query.trim()) return true;
  const qTrim = query.trim().toLowerCase();
  const qClean = cleanRut(query);
  const rClean = cleanRut(rutValue);

  if (qClean.length > 0 && rClean.includes(qClean)) {
    return true;
  }
  return (rutValue || '').toLowerCase().includes(qTrim);
}
