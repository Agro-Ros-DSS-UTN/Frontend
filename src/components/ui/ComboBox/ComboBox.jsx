import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, PenLine } from 'lucide-react';
import './ComboBox.css';

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
  const opts = useMemo(() => options.map(toOption), [options]);
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false); // filtrar solo mientras se escribe
  const [highlight, setHighlight] = useState(0);
  const [pos, setPos] = useState(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const current = opts.find((o) => o.value === value);
  const shown = freeText ? (value ?? '') : (current?.label ?? '');

  const items = useMemo(() => {
    const q = String(value ?? '').toLowerCase().trim();
    const filtered = freeText && typing && q
      ? opts.filter((o) => o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q))
      : opts;
    const list = [];
    if (emptyLabel !== undefined) list.push({ kind: 'empty', label: emptyLabel });
    filtered.forEach((o) => list.push({ kind: 'option', ...o }));
    if (freeText && showCustom) list.push({ kind: 'custom', label: customLabel });
    if (extraAction) list.push({ kind: 'extra', label: extraAction.label });
    return list;
  }, [opts, value, freeText, showCustom, typing, customLabel, emptyLabel, extraAction]);

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

  useEffect(() => {
    if (open) setHighlight(Math.max(0, items.findIndex((it) => it.kind === 'option' && it.value === value)));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <span className={`crm-combo ${className}`}>
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
      <ChevronDown size={14} className="crm-combo__chevron" aria-hidden="true" />
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
