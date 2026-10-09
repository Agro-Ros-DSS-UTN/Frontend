/*
 * Coordenadas de cada dato sobre las plantillas PDF originales.
 * Unidades: puntos PDF, origen ABAJO a la izquierda (y crece hacia arriba).
 * Los valores salen de medir las plantillas (posición de las etiquetas impresas y
 * de las líneas de la tabla); si se cambia la plantilla, se ajustan acá.
 */

export const ORDEN_LAYOUT = {
  plantilla: 'plantillas/orden-servicio.pdf', // 612 × 1008 pt (oficio)

  // Número de ejemplo preimpreso arriba a la derecha: se tapa y se escribe el real
  numero: {
    tapar: { x: 478, y: 973, width: 118, height: 29 },
    texto: { x: 583, y: 980, size: 17, bold: true, align: 'right' },
  },

  fecha: {
    dia: { x: 384, y: 900, size: 13, align: 'center' },
    mes: { x: 435, y: 900, size: 13, align: 'center' },
    anio: { x: 462, y: 900, size: 13 },
  },
  cliente: { x: 366, y: 859.4, size: 12, maxWidth: 212 },
  direccion: { x: 382, y: 818.6, size: 12, maxWidth: 196 },
  localidad: { x: 383, y: 778, size: 12, maxWidth: 195 },

  tipoTrabajo: {
    fumigacion: { x: 469.6, y: 737.6, size: 9 },
    desinsectacion: { x: 568.2, y: 737.0, size: 9 },
  },

  tabla: {
    rowTops: [668, 646, 624, 602, 579.5, 557.5, 535.5, 513.5], // 8 renglones
    rowHeight: 22,
    size: 8,
    padding: 2,
    columns: [
      { key: 'tipoInstalacion', x0: 53, x1: 110 },
      { key: 'numero', x0: 110, x1: 130 },
      { key: 'capacidadTn', x0: 130, x1: 182 },
      { key: 'grano', x0: 182, x1: 229 },
      { key: 'cantidadTn', x0: 229, x1: 283 },
      { key: 'estadoCereal', x0: 283, x1: 344 },
      { key: 'estadoInstalaciones', x0: 344, x1: 409 },
      { key: 'estadoInfestacion', x0: 409, x1: 463 },
      { key: 'producto', x0: 463, x1: 526 },
      { key: 'dosis', x0: 526, x1: 587 },
    ],
    // Aviso si hay más filas que renglones
    excedente: { x: 53, y: 481, size: 7 },
  },

  observaciones: { x: 57, y: 380, size: 10, lineHeight: 12, maxWidth: 525, maxLines: 6 },
  recomendaciones: { x: 62, y: 266, size: 10, lineHeight: 12, maxWidth: 520, maxLines: 9 },

  // Espacio libre al pie de la hoja
  firmas: {
    tecnico: { x: 70, y: 62, width: 200, height: 70 },
    cliente: { x: 342, y: 62, width: 200, height: 70 },
    lineaY: 56,
    leyendaY: 45,
    size: 8,
  },
};

export const EVALUACION_LAYOUT = {
  plantilla: 'plantillas/evaluacion-servicio.pdf', // 595 × 842 pt (A4)

  numero: {
    tapar: { x: 457, y: 807, width: 120, height: 27 },
    texto: { x: 566, y: 813, size: 17, bold: true, align: 'right' },
  },

  fecha: {
    dia: { x: 383, y: 720, size: 13, align: 'center' },
    mes: { x: 434.5, y: 720, size: 13, align: 'center' },
    anio: { x: 460, y: 720, size: 13 },
  },
  cliente: { x: 366, y: 685.1, size: 12, maxWidth: 215 },
  localidad: { x: 383, y: 651.5, size: 12, maxWidth: 198 },
  ordenServicio: { x: 443, y: 619.9, size: 12, maxWidth: 140 },

  tabla: {
    rowTops: [554.5, 532, 510, 488, 465.5, 443.5, 421.5, 399.5], // 8 renglones
    rowHeight: 22,
    size: 8,
    padding: 2,
    columns: [
      { key: 'tipoInstalacion', x0: 54, x1: 111.5 },
      { key: 'numero', x0: 111.5, x1: 131.5 },
      { key: 'capacidadTn', x0: 131.5, x1: 201.5 },
      { key: 'grano', x0: 201.5, x1: 264.5 },
      { key: 'cantidadTn', x0: 264.5, x1: 345.5 },
      { key: 'estadoCereal', x0: 345.5, x1: 417.5 },
      { key: 'lugarToma', x0: 417.5, x1: 489.5 },
      { key: 'resultado', x0: 489.5, x1: 570.5 },
    ],
    excedente: { x: 250, y: 370, size: 7 },
  },

  ppm: { x: 122, y: 305.1, size: 10.5 },
  observaciones: { x: 58, y: 292, size: 8.5, lineHeight: 10, maxWidth: 505, maxLines: 3 },
  // La plantilla ya trae impresa la recomendación habitual; lo cargado va debajo
  recomendaciones: { x: 93.6, y: 191, size: 9, lineHeight: 11, maxWidth: 468, maxLines: 7 },

  firmas: {
    tecnico: { x: 70, y: 48, width: 190, height: 52 },
    cliente: { x: 335, y: 48, width: 190, height: 52 },
    lineaY: 44,
    leyendaY: 34,
    size: 8,
  },
};
