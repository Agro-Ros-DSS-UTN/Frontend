/**
 * @file pdfStamp.js
 * @description Utilidades para estampar datos dinámicos sobre plantillas PDF existentes usando pdf-lib.
 *
 * Propósito general:
 * Permite generar documentos oficiales (hojas de ruta, comprobantes, remitos) tomando un archivo PDF
 * de plantilla prediseñado y sobreescribiendo en él textos, firmas digitales, tablas, casillas de verificación
 * y rectángulos de cobertura.
 *
 * Consideraciones técnicas:
 * - Sistema de coordenadas: El sistema de puntos de PDF tiene su origen (0, 0) en la esquina inferior izquierda;
 *   el eje Y crece hacia arriba y el eje X hacia la derecha (72 puntos = 1 pulgada).
 * - Manejo de tipografías: Utiliza las fuentes estándar de PDF (Helvetica y Helvetica Bold) para mantener
 *   el archivo liviano sin incrustar archivos TTF pesados.
 * - Sanitización de caracteres: Reemplaza caracteres no soportados por el juego de caracteres latino WinAnsi
 *   (como emojis o caracteres especiales) para prevenir excepciones en pdf-lib.
 * - Ajuste dinámico de texto: Contiene algoritmos de reducción de tamaño de fuente (`fitText`, `drawParagraph`)
 *   y corte elíptico para asegurar que el texto quepa exactamente en los campos físicos de la planilla.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/*
 * Helpers para "estampar" datos sobre una plantilla PDF con pdf-lib.
 * Coordenadas en puntos PDF: origen abajo a la izquierda (y crece hacia arriba).
 */

/**
 * Color de tinta estándar utilizado para los textos impresos.
 * Tonalidad azulada muy oscura similar a la tinta de bolígrafo o impresora.
 */
export const INK = rgb(0.08, 0.1, 0.16); // casi negro, como lapicera

/**
 * Descarga una plantilla PDF desde una URL, la procesa e incrusta las fuentes estándar necesarias.
 *
 * @param {string} url - Ruta relativa o absoluta del archivo PDF plantilla.
 * @returns {Promise<{ pdf: PDFDocument, page: import('pdf-lib').PDFPage, fonts: { regular: import('pdf-lib').PDFFont, bold: import('pdf-lib').PDFFont } }>}
 * Objeto con la instancia del documento PDF, la primera página y las tipografías incrustadas.
 * @throws {Error} Si no es posible descargar la plantilla.
 */
export const loadTemplate = async (url) => {
  // Descarga el archivo PDF base
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar la plantilla PDF (${res.status}).`);
  const bytes = await res.arrayBuffer();
  // Carga el documento en memoria con pdf-lib
  const pdf = await PDFDocument.load(bytes);
  // Incrusta las fuentes estándar Helvetica para textos regulares y negritas
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  return { pdf, page: pdf.getPage(0), fonts };
};

// Las fuentes estándar solo tienen caracteres latinos (WinAnsi): el resto se reemplaza
// para que un emoji o símbolo raro no rompa la generación del PDF.
/** Caché débil en memoria para guardar el juego de caracteres permitido por tipografía */
const charsetCache = new WeakMap();

/**
 * Sanitiza una cadena asegurando que todos sus caracteres sean compatibles con la fuente estándar.
 * Reemplaza caracteres fuera del set (WinAnsi) por '?' y tabulaciones por espacios para evitar fallos.
 *
 * @param {import('pdf-lib').PDFFont} font - Tipografía contra la cual verificar compatibilidad.
 * @param {*} value - Valor a sanitizar (número, cadena o null/undefined).
 * @returns {string} Texto limpio y seguro para imprimir en el PDF.
 */
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
/**
 * Reduce progresivamente el tamaño de fuente hasta que el texto quepa en el ancho disponible.
 * Si alcanzado el tamaño mínimo aún no entra, trunca caracteres agregando puntos suspensivos ("…").
 *
 * @param {import('pdf-lib').PDFFont} font - Tipografía utilizada.
 * @param {string} text - Texto a evaluar.
 * @param {number} maxWidth - Ancho máximo disponible en puntos.
 * @param {number} size - Tamaño inicial de la fuente.
 * @param {number} [minSize=5.5] - Tamaño de fuente mínimo permitido.
 * @returns {{ text: string, size: number }} Texto final (posiblemente truncado) y tamaño de fuente ajustado.
 */
export const fitText = (font, text, maxWidth, size, minSize = 5.5) => {
  let s = size;
  // Reduce el tamaño de fuente en pasos de 0.25 puntos mientras exceda el ancho
  while (s > minSize && font.widthOfTextAtSize(text, s) > maxWidth) s -= 0.25;
  if (font.widthOfTextAtSize(text, s) <= maxWidth) return { text, size: s };

  // Si ni en el tamaño mínimo entra, corta caracteres desde el final agregando '…'
  let cut = text;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}…`, s) > maxWidth) cut = cut.slice(0, -1);
  return { text: `${cut}…`, size: s };
};

/**
 * Dibuja un campo de texto de una sola línea en las coordenadas especificadas.
 * Soporta alineación izquierda, centrada o derecha, ajuste automático de ancho y negrita.
 *
 * @param {import('pdf-lib').PDFPage} page - Página del PDF donde dibujar.
 * @param {{ regular: import('pdf-lib').PDFFont, bold: import('pdf-lib').PDFFont }} fonts - Tipografías disponibles.
 * @param {*} value - Valor a mostrar.
 * @param {Object} spec - Especificaciones de renderizado.
 * @param {number} spec.x - Coordenada horizontal de anclaje.
 * @param {number} spec.y - Coordenada vertical de la línea base del texto.
 * @param {number} spec.size - Tamaño de fuente inicial.
 * @param {number} [spec.maxWidth] - Ancho máximo disponible.
 * @param {'left'|'center'|'right'} [spec.align='left'] - Alineación del texto.
 * @param {boolean} [spec.bold=false] - Indica si se dibuja en negrita.
 */
export const drawField = (page, fonts, value, spec) => {
  // Selecciona la variante tipográfica según corresponda
  const font = spec.bold ? fonts.bold : fonts.regular;
  // Sanitiza el texto y unifica espacios y saltos de línea internos
  const raw = safeText(font, value).replace(/\s*\n\s*/g, ' ').trim();
  if (!raw) return;

  // Ajusta el texto al ancho máximo si fue especificado
  const { text, size } = spec.maxWidth
    ? fitText(font, raw, spec.maxWidth, spec.size)
    : { text: raw, size: spec.size };

  // Calcula la coordenada X final en base a la alineación solicitada
  const width = font.widthOfTextAtSize(text, size);
  const x = spec.align === 'center' ? spec.x - width / 2 : spec.align === 'right' ? spec.x - width : spec.x;

  // Dibuja el texto en la página con el color de tinta institucional
  page.drawText(text, { x, y: spec.y, size, font, color: INK });
};

// Parte el texto en líneas que entren en maxWidth (respeta los saltos de línea).
/**
 * Divide un texto en múltiples líneas para que cada una respete el ancho máximo permitido.
 * Conserva saltos de línea explícitos y corta palabras extremadamente largas si exceden la línea.
 *
 * @param {import('pdf-lib').PDFFont} font - Tipografía para calcular los anchos.
 * @param {string} text - Texto a dividir.
 * @param {number} size - Tamaño de fuente a utilizar.
 * @param {number} maxWidth - Ancho máximo por línea.
 * @returns {Array<string>} Arreglo de líneas formateadas.
 */
export const wrapText = (font, text, size, maxWidth) => {
  const lines = [];
  // Divide primero por párrafos respetando saltos de línea manuales
  for (const paragraph of String(text).split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    for (let word of words) {
      // Si una palabra individual excede el ancho de la línea, la fractura con un guion o corte limpio
      while (font.widthOfTextAtSize(word, size) > maxWidth && word.length > 1) {
        let i = word.length - 1;
        while (i > 1 && font.widthOfTextAtSize(word.slice(0, i), size) > maxWidth) i--;
        if (line) { lines.push(line); line = ''; }
        lines.push(word.slice(0, i));
        word = word.slice(i);
      }
      // Evalúa si la palabra actual entra en la línea en construcción
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  // Elimina líneas vacías residuales al final
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines;
};

/**
 * Bloque multilínea. spec: { x, y (primera línea), size, lineHeight, maxWidth, maxLines }
 * Si el texto no entra, achica la letra hasta 6.5 pt y, como último recurso, corta con "…".
 *
 * @param {import('pdf-lib').PDFPage} page - Página del PDF.
 * @param {{ regular: import('pdf-lib').PDFFont, bold: import('pdf-lib').PDFFont }} fonts - Tipografías.
 * @param {*} value - Texto del párrafo.
 * @param {Object} spec - Configuración de dibujo del bloque.
 * @param {number} spec.x - Posición horizontal inicial.
 * @param {number} spec.y - Posición vertical de la primera línea.
 * @param {number} spec.size - Tamaño de fuente base.
 * @param {number} spec.lineHeight - Altura de línea inicial.
 * @param {number} spec.maxWidth - Ancho máximo permitido.
 * @param {number} spec.maxLines - Cantidad máxima de renglones permitidos.
 */
export const drawParagraph = (page, fonts, value, spec) => {
  const font = fonts.regular;
  const text = safeText(font, value).trim();
  if (!text) return;

  // El alto disponible es fijo: con letra más chica entran más líneas
  const availableHeight = spec.maxLines * spec.lineHeight;
  let size = spec.size;
  let lineHeight = spec.lineHeight;
  let maxLines = spec.maxLines;
  let lines = wrapText(font, text, size, spec.maxWidth);

  // Si el texto excede los renglones, reduce la fuente progresivamente hasta un mínimo de 6.5pt
  while (lines.length > maxLines && size > 6.5) {
    size -= 0.5;
    lineHeight = size * (spec.lineHeight / spec.size);
    maxLines = Math.floor(availableHeight / lineHeight);
    lines = wrapText(font, text, size, spec.maxWidth);
  }

  // Si aún con la letra mínima supera el límite de líneas, corta y agrega puntos suspensivos
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/.{0,2}$/, '')}…`;
  }

  // Dibuja cada línea desplazando la coordenada Y según el alto de línea
  lines.forEach((line, i) => {
    page.drawText(line, { x: spec.x, y: spec.y - i * lineHeight, size, font, color: INK });
  });
};

// Tapa con blanco algo preimpreso (por ejemplo, el número de ejemplo de la plantilla).
/**
 * Dibuja un rectángulo blanco opaco para cubrir textos o elementos preexistentes de la plantilla.
 *
 * @param {import('pdf-lib').PDFPage} page - Página del PDF.
 * @param {Object} rect - Dimensiones y ubicación del rectángulo.
 * @param {number} rect.x - Coordenada X inferior izquierda.
 * @param {number} rect.y - Coordenada Y inferior izquierda.
 * @param {number} rect.width - Ancho del área a cubrir.
 * @param {number} rect.height - Alto del área a cubrir.
 */
export const coverArea = (page, { x, y, width, height }) => {
  page.drawRectangle({ x, y, width, height, color: rgb(1, 1, 1) });
};

// Marca una casilla con una "X" de trazo.
/**
 * Dibuja una cruz "X" dentro de una casilla de verificación utilizando dos líneas diagonales.
 *
 * @param {import('pdf-lib').PDFPage} page - Página del PDF.
 * @param {Object} box - Especificaciones de la casilla.
 * @param {number} box.x - Posición X de la casilla.
 * @param {number} box.y - Posición Y de la casilla.
 * @param {number} box.size - Tamaño del lado de la casilla.
 */
export const drawCheck = (page, { x, y, size }) => {
  const pad = size * 0.15; // Margen interno para que las aspas no toquen los bordes de la casilla
  const opts = { thickness: 1.3, color: INK };
  // Primera diagonal: inferior izquierda a superior derecha
  page.drawLine({ start: { x: x + pad, y: y + pad }, end: { x: x + size - pad, y: y + size - pad }, ...opts });
  // Segunda diagonal: superior izquierda a inferior derecha
  page.drawLine({ start: { x: x + pad, y: y + size - pad }, end: { x: x + size - pad, y: y + pad }, ...opts });
};

// Imagen en base64 (firma) dentro de una caja, manteniendo la proporción.
/**
 * Inserta una imagen en formato DataURL (PNG o JPEG, típicamente una firma digital)
 * escalándola proporcionalmente y centrándola dentro de un cuadro delimitador.
 *
 * @param {PDFDocument} pdf - Instancia del documento PDF.
 * @param {import('pdf-lib').PDFPage} page - Página del documento.
 * @param {string} dataUrl - Cadena base64 con formato data:image/png o data:image/jpeg.
 * @param {{ x: number, y: number, width: number, height: number }} box - Cuadro contenedor de destino.
 * @returns {Promise<boolean>} true si la imagen fue incrustada con éxito, false en caso contrario.
 */
export const drawImageInBox = async (pdf, page, dataUrl, box) => {
  if (!dataUrl || typeof dataUrl !== 'string') return false;
  try {
    const isPng = dataUrl.startsWith('data:image/png');
    const isJpg = /^data:image\/jpe?g/.test(dataUrl);
    if (!isPng && !isJpg) return false;

    // Incrusta la imagen en el documento según su formato
    const img = isPng ? await pdf.embedPng(dataUrl) : await pdf.embedJpg(dataUrl);
    // Calcula la escala para que encaje manteniendo su relación de aspecto original
    const scale = Math.min(box.width / img.width, box.height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    // Dibuja la imagen centrada horizontal y verticalmente dentro de la caja
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
 *
 * @param {import('pdf-lib').PDFPage} page - Página del PDF donde dibujar la tabla.
 * @param {{ regular: import('pdf-lib').PDFFont, bold: import('pdf-lib').PDFFont }} fonts - Tipografías.
 * @param {Array<Object>} rows - Colección de datos a ubicar en las filas de la tabla.
 * @param {Object} layout - Configuración del diseño físico de la tabla en la plantilla.
 * @param {number[]} layout.rowTops - Coordenadas Y superiores de cada fila física preimpresa.
 * @param {number} layout.rowHeight - Alto de cada fila.
 * @param {Array<{ key: string, x0: number, x1: number, align?: 'left'|'center'|'right' }>} layout.columns - Configuración de columnas.
 * @param {number} layout.size - Tamaño de fuente sugerido para las celdas.
 * @param {number} layout.padding - Margen horizontal interno en cada celda.
 * @returns {number} Cantidad de filas que excedieron el espacio físico de la planilla.
 */
export const drawTableRows = (page, fonts, rows, layout) => {
  const font = fonts.regular;
  const minSize = 6.5; // más chico que esto ya no se lee impreso
  // Limita las filas dibujables a la cantidad de renglones físicos disponibles en la plantilla
  const visible = rows.slice(0, layout.rowTops.length);

  visible.forEach((row, i) => {
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

      // 2) si no entra en una sola línea, la divide en dos renglones dentro de la misma celda
      const lines = wrapText(font, text, minSize, width);
      const two = lines.length > 2 ? [lines[0], `${lines.slice(1).join(' ')}`] : lines;
      const lh = minSize + 1.5;
      two.forEach((line, k) => {
        const y = centerY + (k === 0 ? lh / 2 : -lh / 2) - minSize * 0.35;
        drawField(page, fonts, line, { x, y, size: minSize, maxWidth: width, align });
      });
    });
  });

  // Retorna el exceso de filas que no pudieron estamparse por límite físico de la planilla
  return Math.max(0, rows.length - visible.length);
};

// "2026-10-09" -> { dia: '09', mes: '10', anio: '2026' }
/**
 * Descompone una cadena de fecha con formato 'YYYY-MM-DD' en sus componentes individuales.
 *
 * @param {string} value - Cadena de fecha a analizar.
 * @returns {{ year: string, month: string, day: string } | null} Objeto con año, mes y día en cadenas de dos/cuatro dígitos o null.
 */
export const splitDate = (value) => {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { year: m[1], month: m[2], day: m[3] } : null;
};

/**
 * Guarda y serializa el documento PDF compilado, retornando una URL de objeto Blob local
 * para su visualización en un visor del navegador o descarga directa.
 *
 * @param {PDFDocument} pdf - Instancia de PDFDocument generada.
 * @returns {Promise<string>} URL de tipo blob (ej. 'blob:http://...').
 */
export const toBlobUrl = async (pdf) => {
  const bytes = await pdf.save();
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
};
