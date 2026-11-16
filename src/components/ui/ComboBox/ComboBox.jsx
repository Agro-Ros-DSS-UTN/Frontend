import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, PenLine } from 'lucide-react';
import './ComboBox.css';

/**
 * Normaliza un elemento de opción:
 * Si es un string simple, genera un objeto con propiedades `value` y `label`.
 * Si ya es un objeto, lo retorna sin alteraciones.
 *
 * @param {string|object} o - Opción a transformar.
 * @returns {{ value: any, label: string }} Objeto de opción normalizado.
 */
const toOption = (o) => (typeof o === 'string' ? { value: o, label: o } : o);

/**
 * Campo con lista de opciones blanca (reemplaza a <datalist>, que el navegador
 * muestra en negro, y a <select> cuando además hace falta escribir otro valor).
 *
 * - freeText (por defecto): se puede escribir cualquier cosa; la lista sugiere y
 *   al final ofrece "Escribir otro valor…", que deja el campo listo para tipear.
 * - freeText={false}: funciona como un select (solo elegir de la lista).
 * - extraAction: { label, onSelect } agrega una acción al final (por ejemplo,
 *   "Escribir un comentario…" que lleva a otro campo).
 *
 * La lista se dibuja en un portal con posición fija, así no la recortan las
 * tablas con scroll ni los modales.
 *
 * @param {Object} props - Propiedades del componente ComboBox.
 * @param {string|number} props.value - Valor actual seleccionado o escrito.
 * @param {Function} props.onChange - Función callback ejecutada al modificar el valor.
 * @param {Array<string|object>} [props.options=[]] - Lista de opciones a sugerir.
 * @param {string} [props.placeholder=''] - Texto guía para el campo vacío.
 * @param {boolean} [props.freeText=true] - Si permite escribir texto arbitrario además de elegir.
 * @param {boolean} [props.showCustom=true] - Con freeText: muestra la opción "Escribir otro valor…".
 * @param {string} [props.customLabel='Escribir otro valor…'] - Texto para la opción de valor personalizado.
 * @param {string} [props.emptyLabel] - Texto para una opción de deselección / vacío.
 * @param {{ label: string, onSelect: Function }} [props.extraAction] - Acción adicional opcional al final.
 * @param {string} [props.inputClassName=''] - Clases CSS adicionales para el input.
 * @param {string} [props.className=''] - Clases CSS adicionales para el contenedor.
 * @param {string} [props.ariaLabel] - Etiqueta accesible para lectores de pantalla.
 * @param {string} [props.id] - Identificador HTML del input.
 * @param {string} [props.name] - Nombre del campo para formularios.
 * @param {boolean} [props.disabled=false] - Indica si el campo está inhabilitado.
 * @param {number} [props.maxLength] - Cantidad máxima de caracteres permitidos.
 * @param {string} [props.inputMode] - Modo de entrada de teclado virtual móvil.
 */
export const ComboBox = ({
  value,
  onChange,
  options = [],
  placeholder = '',
  freeText = true,
  showCustom = true, // con freeText: muestra al final "Escribir otro valor…"
  customLabel = 'Escribir otro valor…',
  emptyLabel,
  extraAction,
  inputClassName = '',
  className = '',
  ariaLabel,
  id,
  name,
  disabled = false,
  maxLength,
  inputMode,
}) => {
  // Memoriza y normaliza las opciones recibidas como objetos { value, label }
  const opts = useMemo(() => options.map(toOption), [options]);

  // Estados locales para el control de apertura, tipeo, foco en lista y posicionamiento
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false); // filtrar solo mientras se escribe
  const [highlight, setHighlight] = useState(0);
  const [pos, setPos] = useState(null);

  // Referencias al input principal y al menú desplegable flotante
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Búsqueda de la opción actualmente seleccionada en base al valor actual
  const current = opts.find((o) => o.value === value);

  // Determina qué texto debe mostrar el input: el valor literal (si es texto libre) o la etiqueta de la opción
  const shown = freeText ? (value ?? '') : (current?.label ?? '');

  // Genera la lista final de elementos a renderizar en el menú desplegable
  const items = useMemo(() => {
    const q = String(value ?? '').toLowerCase().trim();
    // Filtra las opciones si se está tipeando y hay una consulta activa
    const filtered = freeText && typing && q
      ? opts.filter((o) => o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q))
      : opts;
    const list = [];
    // Opción vacía si fue definida explícitamente
    if (emptyLabel !== undefined) list.push({ kind: 'empty', label: emptyLabel });
    // Opciones regulares
    filtered.forEach((o) => list.push({ kind: 'option', ...o }));
    // Opción para habilitar escritura manual libre si está configurado
    if (freeText && showCustom) list.push({ kind: 'custom', label: customLabel });
    // Acción personalizada extra si fue provista
    if (extraAction) list.push({ kind: 'extra', label: extraAction.label });
    return list;
  }, [opts, value, freeText, showCustom, typing, customLabel, emptyLabel, extraAction]);

  /**
   * Calcula las coordenadas de posición y dimensiones para ubicar la lista flotante
   * en relación al input, adaptándose al zoom de la pantalla y decidiendo si abrir hacia abajo o hacia arriba.
   */
  const place = () => {
    const r = inputRef.current?.getBoundingClientRect();
    if (!r) return;
    // Con el zoom general de la interfaz (density.css), las medidas de pantalla se
    // pasan a las del documento dividiendo por el zoom.
    const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const vh = window.innerHeight;
    const below = vh - r.bottom;
    const up = below < 220 && r.top > below;
    setPos({
      left: r.left / z,
      width: Math.max(r.width / z, 210),
      top: up ? undefined : (r.bottom + 4) / z,
      bottom: up ? (vh - r.top + 4) / z : undefined,
    });
  };

  // Efecto de diseño: calcula la posición al abrir el desplegable y la recalcula al scrollear o redimensionar
  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    const onMove = () => place();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open]);

  // Efecto para cerrar el desplegable al hacer clic fuera del input o de la lista
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (inputRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
      setOpen(false);
      setTyping(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Efecto para inicializar el elemento resaltado en la lista cuando se abre el menú
  useEffect(() => {
    if (open) setHighlight(Math.max(0, items.findIndex((it) => it.kind === 'option' && it.value === value)));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Procesa la selección de un ítem de la lista (opción regular, vacía, personalizada o acción extra)
   *
   * @param {object} it - Elemento seleccionado de la lista.
   */
  const choose = (it) => {
    if (it.kind === 'option') onChange(it.value);
    if (it.kind === 'empty') onChange('');
    if (it.kind === 'custom') {
      onChange('');
      setOpen(false);
      setTyping(true);
      inputRef.current?.focus();
      return;
    }
    if (it.kind === 'extra') extraAction.onSelect?.();
    setOpen(false);
    setTyping(false);
  };

  /**
   * Manejador de teclado para navegación accesible (flechas, Enter, Escape, Tab, etc.)
   *
   * @param {React.KeyboardEvent} e - Evento del teclado.
   */
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setHighlight((h) => (e.key === 'ArrowDown' ? Math.min(h + 1, items.length - 1) : Math.max(h - 1, 0)));
    } else if (e.key === 'Enter' && open && items[highlight]) {
      e.preventDefault();
      choose(items[highlight]);
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === 'Tab') {
      setOpen(false);
    } else if (!freeText && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      setOpen(true);
    }
  };

  // Renderizado del componente ComboBox
  return (
    <span className={`crm-combo ${className}`}>
      {/* Campo de texto principal con soporte de accesibilidad y control de apertura */}
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        className={`crm-combo__input ${inputClassName}`}
        value={shown}
        placeholder={placeholder}
        readOnly={!freeText}
        disabled={disabled}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete="off"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-autocomplete={freeText ? 'list' : 'none'}
        onClick={() => !disabled && setOpen(true)}
        onFocus={() => freeText || setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setTyping(true);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={onKeyDown}
      />
      {/* Ícono de flecha indicadora de menú desplegable */}
      <ChevronDown size={14} className="crm-combo__chevron" aria-hidden="true" />
      {/* Renderizado flotante de la lista de opciones mediante un Portal en el body */}
      {open && pos && createPortal(
        <ul
          ref={listRef}
          className="crm-combo-list"
          role="listbox"
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width }}
        >
          {items.map((it, i) => (
            <li
              key={`${it.kind}-${it.value ?? it.label}`}
              role="option"
              aria-selected={it.kind === 'option' && it.value === value}
              className={`crm-combo-item crm-combo-item--${it.kind} ${i === highlight ? 'is-active' : ''} ${it.kind === 'option' && it.value === value ? 'is-selected' : ''}`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(it)}
            >
              {/* Ícono ilustrativo si es acción para escribir otro valor o acción extra */}
              {(it.kind === 'custom' || it.kind === 'extra') && <PenLine size={13} />}
              {it.label}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </span>
  );
};

export default ComboBox;
