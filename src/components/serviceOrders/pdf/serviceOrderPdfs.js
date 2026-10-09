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
import { ORDEN_LAYOUT, EVALUACION_LAYOUT } from './plantillasLayout';

// Texto que la plantilla de evaluación ya trae impreso en "Recomendaciones"
const RECOMENDACION_IMPRESA =
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

const drawNumero = (page, fonts, layout, numero) => {
  coverArea(page, layout.numero.tapar);
  drawField(page, fonts, numero, layout.numero.texto);
};

const drawFecha = (page, fonts, layout, value) => {
  const f = splitDate(value);
  if (!f) return;
  drawField(page, fonts, f.dia, layout.fecha.dia);
  drawField(page, fonts, f.mes, layout.fecha.mes);
  drawField(page, fonts, f.anio, layout.fecha.anio);
};

const drawExcedente = (page, fonts, spec, cantidad) => {
  if (!cantidad) return;
  drawField(page, fonts, `+ ${cantidad} fila${cantidad === 1 ? '' : 's'} más: ver el detalle completo en el CRM.`, spec);
};

// Firmas digitales en el espacio libre del pie (solo si se cargaron)
const drawFirmas = async (pdf, page, fonts, spec, { firmaTecnico, firmaCliente, tecnico }) => {
  const items = [
    { box: spec.tecnico, img: firmaTecnico, leyenda: tecnico ? `Técnico: ${tecnico}` : 'Firma del técnico' },
    { box: spec.cliente, img: firmaCliente, leyenda: 'Firma del cliente' },
  ];
  for (const it of items) {
    if (!it.img) continue;
    const ok = await drawImageInBox(pdf, page, it.img, it.box);
    if (!ok) continue;
    page.drawLine({
      start: { x: it.box.x, y: spec.lineaY },
      end: { x: it.box.x + it.box.width, y: spec.lineaY },
      thickness: 0.6,
      color: INK,
    });
    drawField(page, fonts, it.leyenda, {
      x: it.box.x + it.box.width / 2,
      y: spec.leyendaY,
      size: spec.size,
      align: 'center',
      maxWidth: it.box.width,
    });
  }
};

/** Orden de Servicio sobre la plantilla original. Devuelve un Object URL del PDF. */
export const generarOrdenServicioPdf = async (order) => {
  const L = ORDEN_LAYOUT;
  const { pdf, page, fonts } = await loadTemplate(templateUrl(L.plantilla));

  drawNumero(page, fonts, L, order.numeroOrden);
  drawFecha(page, fonts, L, order.fecha);
  drawField(page, fonts, order.clienteNombre, L.cliente);
  drawField(page, fonts, order.direccion, L.direccion);
  drawField(page, fonts, [order.localidad, order.provincia].filter(Boolean).join(', '), L.localidad);

  // Tipo de trabajo: la planilla solo tiene casillas para Fumigación y Desinsectación
  const tipo = String(order.tipoTrabajo || '');
  const esFumigacion = /fumig/i.test(tipo);
  const esDesinsectacion = /desinsect/i.test(tipo);
  if (esFumigacion) drawCheck(page, L.tipoTrabajo.fumigacion);
  if (esDesinsectacion) drawCheck(page, L.tipoTrabajo.desinsectacion);

  const filas = parseList(order.productosAplicados).filter(hasData);
  const sobrantes = drawTableRows(page, fonts, filas, L.tabla);
  drawExcedente(page, fonts, L.tabla.excedente, sobrantes);

  // Si el tipo no es ninguno de los dos de la planilla, se aclara en observaciones
  const observaciones = [
    !esFumigacion && !esDesinsectacion && tipo ? `Tipo de trabajo: ${tipo}.` : '',
    order.observacionesOrden || '',
  ].filter(Boolean).join('\n');
  drawParagraph(page, fonts, observaciones, L.observaciones);
  drawParagraph(page, fonts, order.recomendaciones, L.recomendaciones);

  await drawFirmas(pdf, page, fonts, L.firmas, {
    firmaTecnico: order.firmaTecnico,
    firmaCliente: order.firmaCliente,
    tecnico: order.tecnicoAplicador,
  });

  pdf.setTitle(`Orden de Servicio ${order.numeroOrden || ''}`.trim());
  return toBlobUrl(pdf);
};

/** Evaluación de Servicio (vinculada a su orden) sobre la plantilla original. */
export const generarEvaluacionServicioPdf = async (order) => {
  const ev = order.evaluacion;
  if (!ev) throw new Error('La orden no tiene una evaluación de servicio cargada.');
  const L = EVALUACION_LAYOUT;
  const { pdf, page, fonts } = await loadTemplate(templateUrl(L.plantilla));

  drawNumero(page, fonts, L, order.numeroOrden);
  drawFecha(page, fonts, L, ev.fechaEvaluacion);
  drawField(page, fonts, order.clienteNombre, L.cliente);
  drawField(page, fonts, [order.localidad, order.provincia].filter(Boolean).join(', '), L.localidad);
  drawField(page, fonts, order.numeroOrden, L.ordenServicio);

  // Evaluaciones viejas (sin planilla): una fila con el resultado general
  let filas = parseList(ev.detalle).filter(hasData);
  if (filas.length === 0) {
    filas = [{ estadoCereal: ev.estadoCereal, lugarToma: ev.lugarToma, resultado: ev.resultado }];
  }
  const sobrantes = drawTableRows(page, fonts, filas, L.tabla);
  drawExcedente(page, fonts, L.tabla.excedente, sobrantes);

  if (ev.ppmPH3 !== null && ev.ppmPH3 !== undefined && ev.ppmPH3 !== '') {
    drawField(page, fonts, String(ev.ppmPH3), L.ppm);
  }
  drawParagraph(page, fonts, ev.observaciones, L.observaciones);

  // No repetir la recomendación que ya está impresa en la plantilla
  let recomendaciones = String(ev.recomendaciones || '').trim();
  if (recomendaciones.startsWith(RECOMENDACION_IMPRESA)) {
    recomendaciones = recomendaciones.slice(RECOMENDACION_IMPRESA.length).replace(/^[\s\-–—.]+/, '');
  }
  drawParagraph(page, fonts, recomendaciones, L.recomendaciones);

  await drawFirmas(pdf, page, fonts, L.firmas, {
    firmaTecnico: ev.firmaTecnico,
    firmaCliente: ev.firmaCliente,
    tecnico: order.tecnicoAplicador,
  });

  pdf.setTitle(`Evaluación de Servicio ${order.numeroOrden || ''}`.trim());
  return toBlobUrl(pdf);
};
