import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/*
 * Helpers para "estampar" datos sobre una plantilla PDF con pdf-lib.
 * Coordenadas en puntos PDF: origen abajo a la izquierda (y crece hacia arriba).
 */

export const INK = rgb(0.08, 0.1, 0.16); // casi negro, como lapicera

export const loadTemplate = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar la plantilla PDF (${res.status}).`);
  const bytes = await res.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  return { pdf, page: pdf.getPage(0), fonts };
};

// Las fuentes estándar solo tienen caracteres latinos (WinAnsi): el resto se reemplaza
// para que un emoji o símbolo raro no rompa la generación del PDF.
const charsetCache = new WeakMap();
export const safeText = (font, value) => {
  if (value === null || value === undefined) return '';
  let charset = charsetCache.get(font);
  if (!charset) {
    charset = new Set(font.getCharacterSet());
    charsetCache.set(font, charset);
  }
  return Array.from(String(value))
    .map((ch) => (ch === '\n' || charset.has(ch.codePointAt(0)) ? ch : '?'))
    .join('')
    .replace(/\t/g, ' ');
};

// Achica la letra hasta que entre en el ancho; si ni con el mínimo entra, corta con "…".
export const fitText = (font, text, maxWidth, size, minSize = 5.5) => {
  let s = size;
  while (s > minSize && font.widthOfTextAtSize(text, s) > maxWidth) s -= 0.25;
  if (font.widthOfTextAtSize(text, s) <= maxWidth) return { text, size: s };
  let cut = text;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}…`, s) > maxWidth) cut = cut.slice(0, -1);
  return { text: `${cut}…`, size: s };
};

/**
 * Texto de una línea. spec: { x, y, size, maxWidth?, align?: 'left'|'center'|'right', bold? }
 * Con align 'center' o 'right', x es el centro o el borde derecho.
 */
export const drawField = (page, fonts, value, spec) => {
  const font = spec.bold ? fonts.bold : fonts.regular;
  const raw = safeText(font, value).replace(/\s*\n\s*/g, ' ').trim();
  if (!raw) return;
  const { text, size } = spec.maxWidth
    ? fitText(font, raw, spec.maxWidth, spec.size)
    : { text: raw, size: spec.size };
  const width = font.widthOfTextAtSize(text, size);
  const x = spec.align === 'center' ? spec.x - width / 2 : spec.align === 'right' ? spec.x - width : spec.x;
  page.drawText(text, { x, y: spec.y, size, font, color: INK });
};

// Parte el texto en líneas que entren en maxWidth (respeta los saltos de línea).
export const wrapText = (font, text, size, maxWidth) => {
  const lines = [];
  for (const paragraph of String(text).split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    for (let word of words) {
      // palabras más largas que la línea se cortan
      while (font.widthOfTextAtSize(word, size) > maxWidth && word.length > 1) {
        let i = word.length - 1;
        while (i > 1 && font.widthOfTextAtSize(word.slice(0, i), size) > maxWidth) i--;
        if (line) { lines.push(line); line = ''; }
        lines.push(word.slice(0, i));
        word = word.slice(i);
      }
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines;
};

/**
 * Bloque multilínea. spec: { x, y (primera línea), size, lineHeight, maxWidth, maxLines }
 * Si el texto no entra, achica la letra hasta 6.5 pt y, como último recurso, corta con "…".
 */
export const drawParagraph = (page, fonts, value, spec) => {
  const font = fonts.regular;
  const text = safeText(font, value).trim();
  if (!text) return;
  // El alto disponible es fijo: con letra más chica entran más líneas
  const altoDisponible = spec.maxLines * spec.lineHeight;
  let size = spec.size;
  let lineHeight = spec.lineHeight;
  let maxLines = spec.maxLines;
  let lines = wrapText(font, text, size, spec.maxWidth);
  while (lines.length > maxLines && size > 6.5) {
    size -= 0.5;
    lineHeight = size * (spec.lineHeight / spec.size);
    maxLines = Math.floor(altoDisponible / lineHeight);
    lines = wrapText(font, text, size, spec.maxWidth);
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/.{0,2}$/, '')}…`;
  }
  lines.forEach((line, i) => {
    page.drawText(line, { x: spec.x, y: spec.y - i * lineHeight, size, font, color: INK });
  });
};

// Tapa con blanco algo preimpreso (por ejemplo, el número de ejemplo de la plantilla).
export const coverArea = (page, { x, y, width, height }) => {
  page.drawRectangle({ x, y, width, height, color: rgb(1, 1, 1) });
};

// Marca una casilla con una "X" de trazo.
export const drawCheck = (page, { x, y, size }) => {
  const pad = size * 0.15;
  const opts = { thickness: 1.3, color: INK };
  page.drawLine({ start: { x: x + pad, y: y + pad }, end: { x: x + size - pad, y: y + size - pad }, ...opts });
  page.drawLine({ start: { x: x + pad, y: y + size - pad }, end: { x: x + size - pad, y: y + pad }, ...opts });
};

// Imagen en base64 (firma) dentro de una caja, manteniendo la proporción.
export const drawImageInBox = async (pdf, page, dataUrl, box) => {
  if (!dataUrl || typeof dataUrl !== 'string') return false;
  try {
    const isPng = dataUrl.startsWith('data:image/png');
    const isJpg = /^data:image\/jpe?g/.test(dataUrl);
    if (!isPng && !isJpg) return false;
    const img = isPng ? await pdf.embedPng(dataUrl) : await pdf.embedJpg(dataUrl);
    const scale = Math.min(box.width / img.width, box.height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    page.drawImage(img, { x: box.x + (box.width - w) / 2, y: box.y + (box.height - h) / 2, width: w, height: h });
    return true;
  } catch (err) {
    console.warn('No se pudo incrustar la imagen en el PDF:', err);
    return false;
  }
};

/**
 * Filas de una tabla de la plantilla. layout: { rowTops: [y...], rowHeight, columns: [{ key, x0, x1, align? }], size, padding }
 * Devuelve cuántas filas no entraron en la planilla.
 */
export const drawTableRows = (page, fonts, rows, layout) => {
  const font = fonts.regular;
  const minSize = 6.5; // más chico que esto ya no se lee impreso
  const visibles = rows.slice(0, layout.rowTops.length);
  visibles.forEach((row, i) => {
    const top = layout.rowTops[i];
    const centerY = top - layout.rowHeight / 2;
    layout.columns.forEach((col) => {
      const text = safeText(font, row[col.key]).replace(/\s*\n\s*/g, ' ').trim();
      if (!text) return;
      const width = col.x1 - col.x0 - layout.padding * 2;
      const align = col.align || 'center';
      const x = align === 'left' ? col.x0 + layout.padding : (col.x0 + col.x1) / 2;

      // 1) una línea, achicando hasta el mínimo legible
      let size = layout.size;
      while (size > minSize && font.widthOfTextAtSize(text, size) > width) size -= 0.25;
      if (font.widthOfTextAtSize(text, size) <= width) {
        drawField(page, fonts, text, { x, y: centerY - size * 0.35, size, align });
        return;
      }
      // 2) si no entra, dos renglones dentro de la celda
      const lines = wrapText(font, text, minSize, width);
      const dos = lines.length > 2 ? [lines[0], `${lines.slice(1).join(' ')}`] : lines;
      const lh = minSize + 1.5;
      dos.forEach((line, k) => {
        const y = centerY + (k === 0 ? lh / 2 : -lh / 2) - minSize * 0.35;
        drawField(page, fonts, line, { x, y, size: minSize, maxWidth: width, align });
      });
    });
  });
  return Math.max(0, rows.length - visibles.length);
};

// "2026-10-09" -> { dia: '09', mes: '10', anio: '2026' }
export const splitDate = (value) => {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { anio: m[1], mes: m[2], dia: m[3] } : null;
};

export const toBlobUrl = async (pdf) => {
  const bytes = await pdf.save();
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
};
