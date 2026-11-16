/**
 * Limpia una dirección IP para visualización, eliminando prefijos IPv6 (::ffff:),
 * máscaras de subred (/24, /16, etc.), puertos o direcciones MAC anexadas.
 */
export function cleanIpVisual(ip?: string | null): string {
  const raw = (ip || '').trim();
  if (!raw || raw === '-' || raw.toLowerCase() === 'desconocida') {
    return raw || '-';
  }

  // Quitar prefijo ::ffff: de sockets dual-stack Node/Express
  let cleaned = raw.replace(/^::ffff:/i, '');

  // Quitar máscara de subred (/24, /16, etc.)
  cleaned = cleaned.split('/')[0].trim();

  // Extraer IPv4 pura si viene acompañada de texto o dirección MAC
  const ipv4Match = cleaned.match(/\b((?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/);
  if (ipv4Match) {
    return ipv4Match[0];
  }

  // Si contiene una MAC explícita sin IPv4, no mostrarla como IP
  if (/^([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$/.test(cleaned)) {
    return '-';
  }

  return cleaned || '-';
}
