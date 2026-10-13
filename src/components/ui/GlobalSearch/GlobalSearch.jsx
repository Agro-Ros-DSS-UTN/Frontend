import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Users,
  Building2,
  Handshake,
  CheckSquare,
  FileCheck2,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  X,
  Network,
} from 'lucide-react';
import { fetchClients, fetchClientCompanies, fetchOpportunities } from '../../../data/api';
import { tasksApi } from '../../../api/operations.api';
import { serviceOrdersApi } from '../../../api/serviceOrders.api';
import { CompanyTreeModal } from '../../companies/CompanyTreeModal';
import './GlobalSearch.css';

const norm = (v) => String(v || '').toLowerCase();

export const GlobalSearch = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSeller = location.pathname.startsWith('/seller');
  const base = isSeller ? '/seller' : '/admin';

  const CATEGORIES = useMemo(() => {
    const cats = [
      { key: 'contacts', label: 'Contactos', icon: Users, path: `${base}/contacts` },
      { key: 'companies', label: 'Empresas', icon: Building2, path: `${base}/companies` },
      { key: 'tasks', label: 'Tareas', icon: CheckSquare, path: `${base}/tasks` },
    ];
    if (!isSeller) {
      cats.splice(2, 0, { key: 'deals', label: 'Oportunidades', icon: Handshake, path: '/admin/deals' });
      cats.push({ key: 'orders', label: 'Órdenes de Servicio', icon: FileCheck2, path: '/admin/service-orders' });
    }
    return cats;
  }, [isSeller, base]);

  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState({ contacts: [], companies: [], deals: [], tasks: [], orders: [] });
  const [inspectingId, setInspectingId] = useState(null);
  const inputRef = useRef(null);

  // Trae todo una sola vez cuando se abre por primera vez (después filtra en memoria)
  useEffect(() => {
    if (!isOpen || loaded) return;
    const fetchAll = async () => {
      setLoading(true);
      const [clientsRes, companiesRes, tasksRes, ordersRes, oppsRes] = await Promise.allSettled([
        fetchClients(),
        fetchClientCompanies(),
        tasksApi.getAll(),
        isSeller ? Promise.resolve([]) : serviceOrdersApi.getAll(),
        isSeller ? Promise.resolve([]) : fetchOpportunities(),
      ]);
      const pick = (r) => {
        if (r.status !== 'fulfilled') return [];
        const v = r.value;
        const arr = Array.isArray(v) ? v : v?.data || [];
        return Array.isArray(arr) ? arr : [];
      };
      setData({
        contacts: pick(clientsRes),
        companies: pick(companiesRes),
        deals: pick(oppsRes),
        tasks: pick(tasksRes),
        orders: pick(ordersRes),
      });
      setLoading(false);
      setLoaded(true);
    };
    fetchAll();
  }, [isOpen, loaded, isSeller]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const toggleFilter = (key) => {
    setActiveFilters((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const results = useMemo(() => {
    const q = norm(query);
    if (!q) return [];
    const cats = activeFilters.length > 0 ? CATEGORIES.filter((c) => activeFilters.includes(c.key)) : CATEGORIES;
    const out = [];

    cats.forEach((cat) => {
      const items = data[cat.key] || [];
      let matches = [];

      if (cat.key === 'contacts') {
        matches = items.filter(
          (c) => norm(c.fullName).includes(q) || norm(c.email).includes(q) || norm(c.docNumber).includes(q)
        ).map((c) => ({ id: c.id, title: c.fullName || 'Contacto', subtitle: c.email || c.docNumber || '' }));
      } else if (cat.key === 'companies') {
        matches = items.filter(
          (c) => norm(c.legalName || c.companyName).includes(q) || norm(c.cuit).includes(q) || norm(c.locality).includes(q)
        ).map((c) => ({
          id: c.id,
          title: c.legalName || c.companyName || 'Empresa',
          subtitle: [c.locality, c.cuit].filter(Boolean).join(' · '),
          companyLevel: c.companyLevel,
        }));
      } else if (cat.key === 'deals') {
        matches = items.filter(
          (o) => norm(o.title).includes(q) || norm(o.company).includes(q)
        ).map((o) => ({ id: o.id, title: o.title || 'Oportunidad', subtitle: [o.company, o.status].filter(Boolean).join(' · ') }));
      } else if (cat.key === 'tasks') {
        matches = items.filter(
          (t) => norm(t.title).includes(q) || norm(t.description).includes(q) || norm(t.company).includes(q) || norm(t.assignedTo).includes(q)
        ).map((t) => ({ id: t.id, title: t.title || t.description || 'Tarea', subtitle: [t.company, t.assignedTo].filter(Boolean).join(' · ') }));
      } else if (cat.key === 'orders') {
        matches = items.filter(
          (o) => norm(o.orderNumber).includes(q) || norm(o.customerName).includes(q) || norm(o.plantName).includes(q)
        ).map((o) => ({ id: o.id, title: o.orderNumber || 'Orden de Servicio', subtitle: [o.customerName, o.plantName].filter(Boolean).join(' · ') }));
      }

      matches.slice(0, 5).forEach((m) => out.push({ ...m, category: cat }));
    });

    return out;
  }, [query, activeFilters, data, CATEGORIES]);

  const handleSelect = (result) => {
    navigate(result.category.path, { state: { prefillSearch: result.title } });
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, results, selectedIndex]);

  if (!isOpen && !inspectingId) return null;

  if (!isOpen) {
    return <CompanyTreeModal companyId={inspectingId} onClose={() => setInspectingId(null)} />;
  }

  return (
    <div className="gsearch-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gsearch-modal">
        <div className="gsearch-input-row">
          <Search size={18} className="gsearch-input-icon" />
          <input
            ref={inputRef}
            type="text"
            className="gsearch-input"
            placeholder="Escribí para buscar clientes, empresas, tareas..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
          />
          <button type="button" className="gsearch-close" onClick={onClose} aria-label="Cerrar búsqueda">
            <X size={16} />
          </button>
        </div>

        <div className="gsearch-filters">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = activeFilters.includes(cat.key);
            return (
              <button
                key={cat.key}
                type="button"
                className={`gsearch-pill ${active ? 'gsearch-pill--active' : ''}`}
                onClick={() => toggleFilter(cat.key)}
              >
                <Icon size={13} /> {cat.label}
              </button>
            );
          })}
          {activeFilters.length > 0 && (
            <button type="button" className="gsearch-clear" onClick={() => setActiveFilters([])}>
              Borrar filtros ({activeFilters.length})
            </button>
          )}
        </div>

        <div className="gsearch-results">
          {!query ? (
            <div className="gsearch-empty">
              <Search size={32} className="gsearch-empty-icon" />
              <p>Empezá a escribir para encontrar lo que necesitás.</p>
            </div>
          ) : loading ? (
            <div className="gsearch-empty">
              <p>Cargando datos…</p>
            </div>
          ) : results.length === 0 ? (
            <div className="gsearch-empty">
              <p>No encontramos resultados para "{query}".</p>
            </div>
          ) : (
            results.map((r, i) => {
              const Icon = r.category.icon;
              return (
                <div
                  key={`${r.category.key}-${r.id}-${i}`}
                  className={`gsearch-result ${i === selectedIndex ? 'gsearch-result--active' : ''}`}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => handleSelect(r)}
                >
                  <div className="gsearch-result-icon"><Icon size={15} /></div>
                  <div className="gsearch-result-main">
                    <span className="gsearch-result-title">{r.title}</span>
                    {r.subtitle && <span className="gsearch-result-subtitle">{r.subtitle}</span>}
                  </div>
                  {r.category.key === 'companies' && r.companyLevel === 'madre' && (
                    <button
                      type="button"
                      className="gsearch-inspect-btn"
                      onClick={(e) => { e.stopPropagation(); setInspectingId(r.id); onClose(); }}
                      title="Ver regiones y subsedes de esta empresa"
                    >
                      <Network size={12} /> Inspeccionar
                    </button>
                  )}
                  <span className="gsearch-result-cat">{r.category.label}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="gsearch-footer">
          <span><ArrowUp size={11} /><ArrowDown size={11} /> Seleccionar</span>
          <span><CornerDownLeft size={11} /> Abrir</span>
          <span>Esc Cerrar</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
