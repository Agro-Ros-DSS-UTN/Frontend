/*
 * Coordenadas de cada dato sobre las plantillas PDF originales.
 * Unidades: puntos PDF, origen ABAJO a la izquierda (y crece hacia arriba).
 * Los valores salen de medir las plantillas (posición de las etiquetas impresas y
 * de las líneas de la tabla); si se cambia la plantilla, se ajustan acá.
 */

export const ORDER_LAYOUT = {
  template: 'templates/service-order.pdf', // 612 × 1008 pt (oficio)

  // Número de ejemplo preimpreso arriba a la derecha: se tapa y se escribe el real
  number: {
    cover: { x: 478, y: 973, width: 118, height: 29 },
    text: { x: 583, y: 980, size: 17, bold: true, align: 'right' },
  },

  date: {
    day: { x: 384, y: 900, size: 13, align: 'center' },
    month: { x: 435, y: 900, size: 13, align: 'center' },
    year: { x: 462, y: 900, size: 13 },
  },
  customer: { x: 366, y: 859.4, size: 12, maxWidth: 212 },
  address: { x: 382, y: 818.6, size: 12, maxWidth: 196 },
  locality: { x: 383, y: 778, size: 12, maxWidth: 195 },

  workType: {
    fumigation: { x: 469.6, y: 737.6, size: 9 },
    disinsection: { x: 568.2, y: 737.0, size: 9 },
  },

  table: {
    rowTops: [668, 646, 624, 602, 579.5, 557.5, 535.5, 513.5], // 8 renglones
    rowHeight: 22,
    size: 8,
    padding: 2,
    columns: [
      { key: 'facilityType', x0: 53, x1: 110 },
      { key: 'number', x0: 110, x1: 130 },
      { key: 'capacityTn', x0: 130, x1: 182 },
      { key: 'grain', x0: 182, x1: 229 },
      { key: 'quantityTn', x0: 229, x1: 283 },
      { key: 'grainCondition', x0: 283, x1: 344 },
      { key: 'facilityCondition', x0: 344, x1: 409 },
      { key: 'infestationLevel', x0: 409, x1: 463 },
      { key: 'product', x0: 463, x1: 526 },
      { key: 'dose', x0: 526, x1: 587 },
    ],
    // Aviso si hay más filas que renglones
    excess: { x: 53, y: 481, size: 7 },
  },

  notes: { x: 57, y: 380, size: 10, lineHeight: 12, maxWidth: 525, maxLines: 6 },
  recommendations: { x: 62, y: 266, size: 10, lineHeight: 12, maxWidth: 520, maxLines: 9 },

  // Espacio libre al pie de la hoja
  signatures: {
    technician: { x: 70, y: 62, width: 200, height: 70 },
    customer: { x: 342, y: 62, width: 200, height: 70 },
    lineY: 56,
    legendY: 45,
    size: 8,
  },
};

export const EVALUATION_LAYOUT = {
  template: 'templates/service-evaluation.pdf', // 595 × 842 pt (A4)

  number: {
    cover: { x: 457, y: 807, width: 120, height: 27 },
    text: { x: 566, y: 813, size: 17, bold: true, align: 'right' },
  },

  date: {
    day: { x: 383, y: 720, size: 13, align: 'center' },
    month: { x: 434.5, y: 720, size: 13, align: 'center' },
    year: { x: 460, y: 720, size: 13 },
  },
  customer: { x: 366, y: 685.1, size: 12, maxWidth: 215 },
  locality: { x: 383, y: 651.5, size: 12, maxWidth: 198 },
  serviceOrder: { x: 443, y: 619.9, size: 12, maxWidth: 140 },

  table: {
    rowTops: [554.5, 532, 510, 488, 465.5, 443.5, 421.5, 399.5], // 8 renglones
    rowHeight: 22,
    size: 8,
    padding: 2,
    columns: [
      { key: 'facilityType', x0: 54, x1: 111.5 },
      { key: 'number', x0: 111.5, x1: 131.5 },
      { key: 'capacityTn', x0: 131.5, x1: 201.5 },
      { key: 'grain', x0: 201.5, x1: 264.5 },
      { key: 'quantityTn', x0: 264.5, x1: 345.5 },
      { key: 'grainCondition', x0: 345.5, x1: 417.5 },
      { key: 'samplingPoint', x0: 417.5, x1: 489.5 },
      { key: 'result', x0: 489.5, x1: 570.5 },
    ],
    excess: { x: 250, y: 370, size: 7 },
  },

  ppm: { x: 122, y: 305.1, size: 10.5 },
  notes: { x: 58, y: 292, size: 8.5, lineHeight: 10, maxWidth: 505, maxLines: 3 },
  // La plantilla ya trae impresa la recomendación habitual; lo cargado va debajo
  recommendations: { x: 93.6, y: 191, size: 9, lineHeight: 11, maxWidth: 468, maxLines: 7 },

  signatures: {
    technician: { x: 70, y: 48, width: 190, height: 52 },
    customer: { x: 335, y: 48, width: 190, height: 52 },
    lineY: 44,
    legendY: 34,
    size: 8,
  },
};
