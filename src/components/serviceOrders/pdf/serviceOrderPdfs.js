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

const templateUrl = (path) => `${import.meta.env?.BASE_URL || '/'}${path}`;

const parseList = (value) => {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

const hasData = (row) => Object.values(row || {}).some((v) => v !== null && v !== undefined && String(v).trim() !== '');

const drawNumber = (page, fonts, layout, number) => {
  coverArea(page, layout.number.cover);
  drawField(page, fonts, number, layout.number.text);
};

const drawDate = (page, fonts, layout, value) => {
  const f = splitDate(value);
  if (!f) return;
  drawField(page, fonts, f.day, layout.date.day);
  drawField(page, fonts, f.month, layout.date.month);
  drawField(page, fonts, f.year, layout.date.year);
};

const drawExcess = (page, fonts, spec, quantity) => {
  if (!quantity) return;
  drawField(page, fonts, `+ ${quantity} fila${quantity === 1 ? '' : 's'} más: ver el detalle completo en el CRM.`, spec);
};

// Firmas digitales en el espacio libre del pie (solo si se cargaron)
const drawSignatures = async (pdf, page, fonts, spec, { technicianSignature, customerSignature, technician }) => {
  const items = [
    { box: spec.technician, img: technicianSignature, legend: technician ? `Técnico: ${technician}` : 'Firma del técnico' },
    { box: spec.customer, img: customerSignature, legend: 'Firma del cliente' },
  ];
  for (const it of items) {
    if (!it.img) continue;
    const ok = await drawImageInBox(pdf, page, it.img, it.box);
    if (!ok) continue;
    page.drawLine({
      start: { x: it.box.x, y: spec.lineY },
      end: { x: it.box.x + it.box.width, y: spec.lineY },
      thickness: 0.6,
      color: INK,
    });
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
export const generateServiceOrderPdf = async (order) => {
  const L = ORDER_LAYOUT;
  const { pdf, page, fonts } = await loadTemplate(templateUrl(L.template));

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

  await drawSignatures(pdf, page, fonts, L.signatures, {
    technicianSignature: order.technicianSignature,
    customerSignature: order.customerSignature,
    technician: order.technicianName,
  });

  pdf.setTitle(`Orden de Servicio ${order.orderNumber || ''}`.trim());
  return toBlobUrl(pdf);
};

/** Evaluación de Servicio (vinculada a su orden) sobre la plantilla original. */
export const generateServiceEvaluationPdf = async (order) => {
  const ev = order.evaluation;
  if (!ev) throw new Error('La orden no tiene una evaluación de servicio cargada.');
  const L = EVALUATION_LAYOUT;
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

  await drawSignatures(pdf, page, fonts, L.signatures, {
    technicianSignature: ev.technicianSignature,
    customerSignature: ev.customerSignature,
    technician: order.technicianName,
  });

  pdf.setTitle(`Evaluación de Servicio ${ev.evaluationNumber || order.orderNumber || ''}`.trim());
  return toBlobUrl(pdf);
};
