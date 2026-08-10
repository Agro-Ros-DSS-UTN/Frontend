import React, { useState, useMemo } from 'react';
import { Plus, Search, X, Calendar } from 'lucide-react';
import { mockPromotions } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import './CampaignsPage.css';

const CAMPAIGN_COLORS = [
  '#e8a735', '#4caf50', '#2196f3', '#9c27b0',
  '#f44336', '#00bcd4', '#ff9800', '#607d8b',
];

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
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
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

              {/* Color */}
              <div className="campaigns-modal__field">
                <label>Color de la campaña</label>
                <div className="campaigns-modal__colors">
                  {CAMPAIGN_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`campaigns-modal__color-swatch ${form.color === color ? 'campaigns-modal__color-swatch--active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => updateField('color', color)}
                    />
                  ))}
                </div>
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
                <div className="campaigns-modal__date-input">
                  <Calendar size={16} />
                  <input
                    type="date"
                    value={form.fechaInicio}
                    onChange={(e) => updateField('fechaInicio', e.target.value)}
                  />
                </div>
              </div>

              {/* Fecha fin */}
              <div className="campaigns-modal__field">
                <label>Fecha de finalización de la campaña</label>
                <div className="campaigns-modal__date-input">
                  <Calendar size={16} />
                  <input
                    type="date"
                    value={form.fechaFin}
                    onChange={(e) => updateField('fechaFin', e.target.value)}
                  />
                </div>
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
