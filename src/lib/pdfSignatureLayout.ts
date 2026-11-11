export interface FirmaCoordenadas {
  pagina: number; // 1-based index o 'LAST'
  totalPaginas: number;
  llx: number; // Left inferior X (puntos PDF estándar 72dpi, 0 a 595 aprox)
  lly: number; // Left inferior Y (puntos PDF estándar 72dpi, 0 a 842 aprox)
  urx: number; // Right superior X
  ury: number; // Right superior Y
  widthPt: number;
  heightPt: number;
  pageWidthPt: number;
  pageHeightPt: number;
}

/**
 * Genera el XML oficial <AgileSignerConfig> conforme al Anexo B de FirmaGob v2 (Págs. 25-26)
 * y compatible con el motor de estampado de la Municipalidad de Coquimbo.
 */
export function generarLayoutXml(coords: FirmaCoordenadas): string {
  const pageValue = coords.pagina === coords.totalPaginas ? 'LAST' : String(coords.pagina);
  const llx = Math.round(coords.llx);
  const lly = Math.round(coords.lly);
  const urx = Math.round(coords.urx);
  const ury = Math.round(coords.ury);

  return [
    '<AgileSignerConfig>',
    '  <Application id="THIS-CONFIG">',
    '    <pdfPassword/>',
    '    <Signature>',
    '      <Visible active="true" layer2="false" label="true" pos="1">',
    `        <llx>${llx}</llx>`,
    `        <lly>${lly}</lly>`,
    `        <urx>${urx}</urx>`,
    `        <ury>${ury}</ury>`,
    `        <page>${pageValue}</page>`,
    '        <image>BASE64</image>',
    '        <BASE64VALUE></BASE64VALUE>',
    '      </Visible>',
    '    </Signature>',
    '  </Application>',
    '</AgileSignerConfig>',
  ].join('\n');
}
