/**
 * Módulo de generación de PDFs para Órdenes y Evaluaciones de Servicio.
 *
 * Utiliza utilidades de bajo nivel (`pdfStamp`) para estampar datos dinámicos
 * (textos, tablas, marcas de verificación y firmas digitales) sobre plantillas PDF
 * oficiales preexistentes cargadas desde la carpeta pública de la aplicación.
 */

import {
  loadTemplate,
  drawField,
  drawParagraph,
  drawTableRows,
  drawCheck,
  coverArea,
  drawImageInBox,
  splitDate,
  toBlobUrl,
  INK,
} from '../../../utils/pdfStamp';
import { ORDER_LAYOUT, EVALUATION_LAYOUT } from './templateLayouts';

// Texto que la plantilla de evaluación ya trae impreso en "Recomendaciones"
const PRINTED_RECOMMENDATION =
  'Se recomienda prender los aireadores y proceder al retiro del cereal luego de las 96 hs de la liberación del servicio.';

/**
 * Resuelve la URL pública absoluta de una plantilla PDF teniendo en cuenta
 * la variable de entorno BASE_URL de Vite (soporta subrutas de despliegue).
 *
 * @param {string} path - Ruta relativa del archivo dentro de public/
 * @returns {string} Ruta absoluta accesible desde el navegador
 */
const templateUrl = (path) => `${import.meta.env?.BASE_URL || '/'}${path}`;

/**
 * Convierte de forma segura un valor a un arreglo.
 * Si ya es un arreglo lo retorna directamente; si es un string en formato JSON
 * intenta deserializarlo; si falla o no es válido, retorna un arreglo vacío.
 *
 * @param {Array|string} value - Arreglo o cadena JSON a procesar
 * @returns {Array} Lista procesada
 */
const parseList = (value) => {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

/**
 * Comprueba si un objeto fila de datos contiene al menos una propiedad con valor no vacío.
 * Evita imprimir filas vacías o de relleno en la tabla del PDF.
 *
 * @param {Object} row - Objeto a comprobar
 * @returns {boolean} True si contiene datos válidos
 */
const hasData = (row) => Object.values(row || {}).some((v) => v !== null && v !== undefined && String(v).trim() !== '');

/**
 * Dibuja el número identificador del documento (Orden o Evaluación).
 * Primero cubre el recuadro original de la plantilla donde suele venir un número
 * de ejemplo o preimpreso, y luego estampa el valor real en la coordenada indicada.
 *
 * @param {PDFPage} page - Página del documento PDF
 * @param {Object} fonts - Tipografías incrustadas
 * @param {Object} layout - Especificación de coordenadas y estilos
 * @param {string|number} number - Número de la orden o evaluación
 */
const drawNumber = (page, fonts, layout, number) => {
  coverArea(page, layout.number.cover);
  drawField(page, fonts, number, layout.number.text);
};

/**
 * Descompone y estampa una fecha en sus componentes individuales (día, mes, año)
 * en las casillas correspondientes de la plantilla PDF.
 *
 * @param {PDFPage} page - Página del documento PDF
 * @param {Object} fonts - Tipografías incrustadas
 * @param {Object} layout - Especificación de diseño de la plantilla
 * @param {string|Date} value - Fecha a formatear y estampar
 */
const drawDate = (page, fonts, layout, value) => {
  const f = splitDate(value);
  if (!f) return;
  drawField(page, fonts, f.day, layout.date.day);
  drawField(page, fonts, f.month, layout.date.month);
  drawField(page, fonts, f.year, layout.date.year);
};

/**
 * Muestra un aviso en el pie de la tabla cuando la cantidad de filas cargadas supera
 * el espacio físico disponible en los renglones de la plantilla PDF.
 *
 * @param {PDFPage} page - Página del documento PDF
 * @param {Object} fonts - Tipografías incrustadas
 * @param {Object} spec - Coordenadas y tipografía para el aviso de exceso
 * @param {number} quantity - Cantidad de filas excedentes que no entraron
 */
const drawExcess = (page, fonts, spec, quantity) => {
  if (!quantity) return;
  drawField(page, fonts, `+ ${quantity} fila${quantity === 1 ? '' : 's'} más: ver el detalle completo en el CRM.`, spec);
};

// Firmas digitales en el espacio libre del pie (solo si se cargaron)
/**
 * Dibuja las firmas digitales del técnico y del cliente en el pie del documento.
 * Dibuja la imagen dentro del recuadro asignado, traza la línea para firmar y
 * estampa el texto identificatorio o aclaración debajo.
 *
 * @param {PDFDocument} pdf - Objeto PDF de pdf-lib
 * @param {PDFPage} page - Página del documento
 * @param {Object} fonts - Tipografías incrustadas
 * @param {Object} spec - Coordenadas y dimensiones de las firmas
 * @param {Object} signatures - Objeto con imágenes en base64 y nombres
 */
const drawSignatures = async (pdf, page, fonts, spec, { technicianSignature, customerSignature, technician }) => {
  const items = [
    { box: spec.technician, img: technicianSignature, legend: technician ? `Técnico: ${technician}` : 'Firma del técnico' },
    { box: spec.customer, img: customerSignature, legend: 'Firma del cliente' },
  ];
  for (const it of items) {
    if (!it.img) continue;
    // Dibuja la imagen de la firma ajustándola proporcionalmente al recuadro disponible
    const ok = await drawImageInBox(pdf, page, it.img, it.box);
    if (!ok) continue;
    // Línea base sobre la cual descansa la firma
    page.drawLine({
      start: { x: it.box.x, y: spec.lineY },
      end: { x: it.box.x + it.box.width, y: spec.lineY },
      thickness: 0.6,
      color: INK,
    });
    // Leyenda inferior (aclaración del firmante)
    drawField(page, fonts, it.legend, {
      x: it.box.x + it.box.width / 2,
      y: spec.legendY,
      size: spec.size,
      align: 'center',
      maxWidth: it.box.width,
    });
  }
};

/** Orden de Servicio sobre la plantilla original. Devuelve un Object URL del PDF. */
/**
 * Genera el documento PDF de una Orden de Servicio completando la plantilla oficial preimpresa.
 *
 * Carga la plantilla 'service-order.pdf', estampa datos de cabecera (número, fecha, cliente, domicilio,
 * localidad), marca las casillas de tipo de trabajo (fumigación / desinsectación), vuelca los
 * productos aplicados en la tabla de 8 renglones, incluye notas y recomendaciones, y finalmente
 * agrega las firmas digitales si existen.
 *
 * @param {Object} order - Datos completos de la orden de servicio
 * @returns {Promise<string>} Object URL (blob) listo para visualizar o descargar
 */
export const generateServiceOrderPdf = async (order) => {
  const L = ORDER_LAYOUT;
  // Carga la plantilla base y obtiene las fuentes estándar
  const { pdf, page, fonts } = await loadTemplate(templateUrl(L.template));

  // Datos principales de cabecera
  drawNumber(page, fonts, L, order.orderNumber);
  drawDate(page, fonts, L, order.date);
  drawField(page, fonts, order.customerName, L.customer);
  drawField(page, fonts, order.address, L.address);
  drawField(page, fonts, [order.locality, order.province].filter(Boolean).join(', '), L.locality);

  // Tipo de trabajo: la planilla solo tiene casillas para Fumigación y Desinsectación
  const type = String(order.workType || '');
  const isFumigation = /fumig/i.test(type);
  const isDisinsection = /desinsect/i.test(type);
  if (isFumigation) drawCheck(page, L.workType.fumigation);
  if (isDisinsection) drawCheck(page, L.workType.disinsection);

  // Detalle de productos / instalaciones aplicadas en la tabla
  const rows = parseList(order.appliedProducts).filter(hasData);
  const leftover = drawTableRows(page, fonts, rows, L.table);
  drawExcess(page, fonts, L.table.excess, leftover);

  // Si el tipo no es ninguno de los dos de la planilla, se aclara en observaciones
  const notes = [
    !isFumigation && !isDisinsection && type ? `Tipo de trabajo: ${type}.` : '',
    order.orderNotes || '',
  ].filter(Boolean).join('\n');
  drawParagraph(page, fonts, notes, L.notes);
  drawParagraph(page, fonts, order.recommendations, L.recommendations);

  // Estampado de firmas digitales (técnico y cliente)
  await drawSignatures(pdf, page, fonts, L.signatures, {
    technicianSignature: order.technicianSignature,
    customerSignature: order.customerSignature,
    technician: order.technicianName,
  });

  // Título del documento y conversión a URL Blob para su visualización o impresión
  pdf.setTitle(`Orden de Servicio ${order.orderNumber || ''}`.trim());
  return toBlobUrl(pdf);
};

/** Evaluación de Servicio (vinculada a su orden) sobre la plantilla original. */
/**
 * Genera el documento PDF de una Evaluación de Servicio completando la plantilla oficial preimpresa.
 *
 * Utiliza los datos de la evaluación asociada a la orden (`order.evaluation`), estampa el número
 * identificador, fecha, cliente, localidad, número de orden de referencia, tabla de resultados de muestreo,
 * medición de gas PH3 (ppm), notas, recomendaciones adicionales y las firmas correspondientes.
 *
 * @param {Object} order - Orden de servicio que contiene la propiedad `evaluation`
 * @returns {Promise<string>} Object URL (blob) listo para visualizar o descargar
 */
export const generateServiceEvaluationPdf = async (order) => {
  const ev = order.evaluation;
  if (!ev) throw new Error('La orden no tiene una evaluación de servicio cargada.');
  const L = EVALUATION_LAYOUT;
  // Carga la plantilla base de evaluación de servicio
  const { pdf, page, fonts } = await loadTemplate(templateUrl(L.template));

  // N.º de la planilla de evaluación (propio; el de la orden va en su campo).
  drawNumber(page, fonts, L, ev.evaluationNumber || order.orderNumber);
  drawDate(page, fonts, L, ev.evaluationDate);
  drawField(page, fonts, order.customerName, L.customer);
  drawField(page, fonts, [order.locality, order.province].filter(Boolean).join(', '), L.locality);
  drawField(page, fonts, order.orderNumber, L.serviceOrder);

  // Evaluaciones viejas (sin planilla): una fila con el resultado general
  let rows = parseList(ev.details).filter(hasData);
  if (rows.length === 0) {
    rows = [{ grainCondition: ev.grainCondition, samplingPoint: ev.samplingPoint, result: ev.result }];
  }
  const leftover = drawTableRows(page, fonts, rows, L.table);
  drawExcess(page, fonts, L.table.excess, leftover);

  // Medición de fosfina (PPM de PH3) si fue registrada
  if (ev.ppmPH3 !== null && ev.ppmPH3 !== undefined && ev.ppmPH3 !== '') {
    drawField(page, fonts, String(ev.ppmPH3), L.ppm);
  }
  drawParagraph(page, fonts, ev.notes, L.notes);

  // No repetir la recomendación que ya está impresa en la plantilla
  let recommendations = String(ev.recommendations || '').trim();
  if (recommendations.startsWith(PRINTED_RECOMMENDATION)) {
    recommendations = recommendations.slice(PRINTED_RECOMMENDATION.length).replace(/^[\s\-–—.]+/, '');
  }
  drawParagraph(page, fonts, recommendations, L.recommendations);

  // Estampado de firmas digitales (técnico y cliente)
  await drawSignatures(pdf, page, fonts, L.signatures, {
    technicianSignature: ev.technicianSignature,
    customerSignature: ev.customerSignature,
    technician: order.technicianName,
  });

  // Título del documento y conversión a URL Blob
  pdf.setTitle(`Evaluación de Servicio ${ev.evaluationNumber || order.orderNumber || ''}`.trim());
  return toBlobUrl(pdf);
};
