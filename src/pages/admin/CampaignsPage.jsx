import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, X, Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { mockPromotions } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import './CampaignsPage.css';

const CAMPAIGN_COLORS = [
  { value: '#ffffff', border: '#d1d5db' },
  { value: '#e8a735' },
  { value: '#4caf50' },
  { value: '#26c6da' },
  { value: '#ff9800' },
  { value: '#2196f3' },
  { value: '#f44336' },
  { value: '#9c27b0' },
  { value: '#1c1c1c' },
  { value: '#e91e63' },
];

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const DAYS_ES = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];

/* ─────────────────────────────────────────────
   Color Picker Dropdown (HubSpot-style)
   ───────────────────────────────────────────── */
const ColorPickerDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="color-picker" ref={ref}>
      <button
        type="button"
        className="color-picker__toggle"
        onClick={() => setOpen(!open)}
      >
        <span
          className="color-picker__preview"
          style={{
            backgroundColor: value,
            border: value === '#ffffff' ? '1px solid #d1d5db' : 'none',
          }}
        />
        <ChevronDown size={14} className={`color-picker__chevron ${open ? 'color-picker__chevron--open' : ''}`} />
      </button>
      {open && (
        <div className="color-picker__dropdown">
          <div className="color-picker__grid">
            {CAMPAIGN_COLORS.map(color => (
              <button
                key={color.value}
                type="button"
                className={`color-picker__swatch ${value === color.value ? 'color-picker__swatch--active' : ''}`}
                style={{
                  backgroundColor: color.value,
                  border: color.border ? `1px solid ${color.border}` : 'none',
                }}
                onClick={() => { onChange(color.value); setOpen(false); }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Custom Calendar (HubSpot-style)
   ───────────────────────────────────────────── */
const CustomCalendar = ({ value, onChange, onClose }) => {
  const today = new Date();
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const [viewMonth, setViewMonth] = useState(selectedDate ? selectedDate.getMonth() : today.getMonth());
  const [viewYear, setViewYear] = useState(selectedDate ? selectedDate.getFullYear() : today.getFullYear());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  // Build days grid (Monday start)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  // Convert Sunday=0 to Monday-based (Mon=0, Sun=6)
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  const cells = [];

  // Previous month trailing days
  for (let i = startDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, isOtherMonth: true, date: null });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, isOtherMonth: false, date: dateStr });
  }
  // Next month leading days
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, isOtherMonth: true, date: null });
    }
  }

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const t = today;
    return dateStr === `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  };

  const isSelected = (dateStr) => {
    return dateStr && value === dateStr;
  };

  const handleSelect = (dateStr) => {
    if (!dateStr) return;
    onChange(dateStr);
    onClose();
  };

  const handleToday = () => {
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    onChange(todayStr);
    onClose();
  };

  const handleClear = () => {
    onChange('');
    onClose();
  };

  return (
    <div className="custom-calendar">
      <div className="custom-calendar__nav">
        <button type="button" className="custom-calendar__nav-btn" onClick={prevMonth}>
          <ChevronLeft size={16} />
        </button>
        <span className="custom-calendar__month-label">
          {MONTHS_ES[viewMonth]} de {viewYear}
        </span>
        <button type="button" className="custom-calendar__nav-btn" onClick={nextMonth}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="custom-calendar__grid">
        {DAYS_ES.map(d => (
          <span key={d} className="custom-calendar__day-header">{d}</span>
        ))}
        {cells.map((cell, idx) => (
          <button
            key={idx}
            type="button"
            className={`custom-calendar__day
              ${cell.isOtherMonth ? 'custom-calendar__day--other' : ''}
              ${isToday(cell.date) ? 'custom-calendar__day--today' : ''}
              ${isSelected(cell.date) ? 'custom-calendar__day--selected' : ''}
            `}
            disabled={cell.isOtherMonth}
            onClick={() => handleSelect(cell.date)}
          >
            {cell.day}
          </button>
        ))}
      </div>
      <div className="custom-calendar__footer">
        <button type="button" className="custom-calendar__footer-btn" onClick={handleToday}>Hoy</button>
        <button type="button" className="custom-calendar__footer-btn" onClick={handleClear}>Borrar</button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Date Input with Custom Calendar
   ───────────────────────────────────────────── */
const DateInput = ({ value, onChange, placeholder = 'DD/MM/AAAA' }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowCalendar(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const formatDisplay = (val) => {
    if (!val) return '';
    const [y, m, d] = val.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="campaigns-modal__date-input" ref={ref}>
      <Calendar size={16} />
      <input
        type="text"
        readOnly
        value={formatDisplay(value)}
        placeholder={placeholder}
        onClick={() => setShowCalendar(!showCalendar)}
        style={{ cursor: 'pointer' }}
      />
      {showCalendar && (
        <CustomCalendar
          value={value}
          onChange={onChange}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Campaigns Page
   ───────────────────────────────────────────── */

const emptyForm = {
  nombre: '',
  color: '#e8a735',
  propietario: '',
  fechaInicio: '',
  fechaFin: '',
  publico: '',
  notas: '',
  descripcion: '',
  condiciones: '',
};

export const CampaignsPage = () => {
  const { currentUser } = useAuth();
  const [campaigns, setCampaigns] = useState(mockPromotions);
  const [activeTab, setActiveTab] = useState('Gestionar');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, propietario: currentUser?.nombreApellido || '' });

  const tabs = ['Gestionar', 'Calendario', 'Tareas'];

  const filtered = useMemo(() => {
    if (!search.trim()) return campaigns;
    const q = search.toLowerCase();
    return campaigns.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      c.propietario?.toLowerCase().includes(q)
    );
  }, [campaigns, search]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatDateShort = (dateStr) => {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    const newCampaign = {
      ...form,
      id: Date.now(),
      comentarios: 0,
      creadoEl: new Date().toISOString().slice(0, 10),
    };
    setCampaigns(prev => [...prev, newCampaign]);
    setForm({ ...emptyForm, propietario: currentUser?.nombreApellido || '' });
    setShowModal(false);
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="campaigns-page">
      {/* Header */}
      <div className="campaigns-page__header">
        <div>
          <h1 className="campaigns-page__title">Campañas</h1>
          <p className="campaigns-page__count">{campaigns.length} campaña{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="campaigns-page__header-actions">
          <button className="campaigns-page__btn-outline">Análisis ▾</button>
          <button className="campaigns-page__btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Crear campaña
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="campaigns-page__tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`campaigns-page__tab ${activeTab === tab ? 'campaigns-page__tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="campaigns-page__filters">
        <div className="campaigns-page__filter-tags">
          <span className="campaigns-page__filter-tag campaigns-page__filter-tag--active">
            Todas las campañas <X size={12} />
          </span>
          <span className="campaigns-page__filter-tag">A partir de este trimestre</span>
          <span className="campaigns-page__filter-tag">Creadas recientemente</span>
        </div>
      </div>

      {/* Search bar */}
      <div className="campaigns-page__toolbar">
        <div className="campaigns-page__search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar campañas"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="campaigns-page__toolbar-right">
          <button className="campaigns-page__btn-outline campaigns-page__btn-sm">Acciones ▾</button>
        </div>
      </div>

      {/* Table */}
      <div className="campaigns-page__table-wrapper">
        <table className="campaigns-page__table">
          <thead>
            <tr>
              <th className="campaigns-page__th">
                <input type="checkbox" />
              </th>
              <th className="campaigns-page__th">Nombre de la campaña ↕</th>
              <th className="campaigns-page__th">Propietario de la campaña ↕</th>
              <th className="campaigns-page__th">Comentarios ↕</th>
              <th className="campaigns-page__th">Creado el (GMT-3) ↕</th>
              <th className="campaigns-page__th">Notas de la campaña ⓘ</th>
              <th className="campaigns-page__th">Fecha de inicio de la cam… ⓘ</th>
              <th className="campaigns-page__th">Fecha de finalización de la campaña (GMT-3) ⓘ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="campaigns-page__tr">
                <td className="campaigns-page__td">
                  <input type="checkbox" />
                </td>
                <td className="campaigns-page__td campaigns-page__td--name">
                  <span
                    className="campaigns-page__color-dot"
                    style={{ backgroundColor: c.color || '#e8a735' }}
                  />
                  {c.nombre}
                </td>
                <td className="campaigns-page__td">
                  <span className="campaigns-page__owner-initials">
                    {c.propietario?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'MF'}
                  </span>
                  {' '}{c.propietario}
                </td>
                <td className="campaigns-page__td">{c.comentarios ?? 0}</td>
                <td className="campaigns-page__td">{formatDate(c.creadoEl)}</td>
                <td className="campaigns-page__td campaigns-page__td--muted">{c.notas || '—'}</td>
                <td className="campaigns-page__td">{formatDateShort(c.fechaInicio)}</td>
                <td className="campaigns-page__td">{formatDateShort(c.fechaFin)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="campaigns-page__empty">
                  No se encontraron campañas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal: Crear Campaña ── */}
      {showModal && (
        <div className="campaigns-modal__overlay" onClick={() => setShowModal(false)}>
          <div className="campaigns-modal" onClick={(e) => e.stopPropagation()}>
            <div className="campaigns-modal__header">
              <h2>Crear Campaña</h2>
              <button className="campaigns-modal__close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="campaigns-modal__form" onSubmit={handleCreate}>
              {/* Nombre */}
              <div className="campaigns-modal__field">
                <label>Nombre de la campaña *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => updateField('nombre', e.target.value)}
                  placeholder="Ej: Campaña Soja 2026"
                  required
                  autoFocus
                />
              </div>

              {/* Color — Dropdown style */}
              <div className="campaigns-modal__field">
                <label>Color de la campaña</label>
                <ColorPickerDropdown
                  value={form.color}
                  onChange={(color) => updateField('color', color)}
                />
              </div>

              {/* Propietario */}
              <div className="campaigns-modal__field">
                <label>Propietario de la campaña</label>
                <select
                  value={form.propietario}
                  onChange={(e) => updateField('propietario', e.target.value)}
                >
                  <option value={currentUser?.nombreApellido}>{currentUser?.nombreApellido}</option>
                </select>
              </div>

              {/* Fecha inicio */}
              <div className="campaigns-modal__field">
                <label>Fecha de inicio de la campaña</label>
                <DateInput
                  value={form.fechaInicio}
                  onChange={(val) => updateField('fechaInicio', val)}
                  placeholder="DD/MM/AAAA"
                />
              </div>

              {/* Fecha fin */}
              <div className="campaigns-modal__field">
                <label>Fecha de finalización de la campaña</label>
                <DateInput
                  value={form.fechaFin}
                  onChange={(val) => updateField('fechaFin', val)}
                  placeholder="DD/MM/AAAA"
                />
              </div>

              {/* Público */}
              <div className="campaigns-modal__field">
                <label>Público de la campaña</label>
                <input
                  type="text"
                  value={form.publico}
                  onChange={(e) => updateField('publico', e.target.value)}
                  placeholder="Ej: Productores directos"
                />
              </div>

              {/* Descripción */}
              <div className="campaigns-modal__field">
                <label>Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => updateField('descripcion', e.target.value)}
                  placeholder="Descripción de la campaña"
                  rows={3}
                />
              </div>

              {/* Condiciones */}
              <div className="campaigns-modal__field">
                <label>Condiciones</label>
                <input
                  type="text"
                  value={form.condiciones}
                  onChange={(e) => updateField('condiciones', e.target.value)}
                  placeholder="Ej: Compra mínima $200.000"
                />
              </div>

              {/* Notas */}
              <div className="campaigns-modal__field">
                <label>Notas de la campaña</label>
                <input
                  type="text"
                  value={form.notas}
                  onChange={(e) => updateField('notas', e.target.value)}
                  placeholder="Notas adicionales"
                />
              </div>

              {/* Acciones */}
              <div className="campaigns-modal__actions">
                <button type="submit" className="campaigns-modal__btn-create">Crear</button>
                <button type="button" className="campaigns-modal__btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
