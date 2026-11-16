/**
 * @file GlobalSearch.jsx
 * @description Componente modal de búsqueda global rápida (Command Palette).
 * Permite buscar entidades del sistema (contactos, empresas, tareas, oportunidades y órdenes de servicio)
 * con búsqueda server-side con debounce, navegación por teclado, filtrado por categorías e inspección
 * de la jerarquía de empresas madre.
 */

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
import { searchApi } from '../../../api/operations.api';
import { CompanyTreeModal } from '../../companies/CompanyTreeModal';
import './GlobalSearch.css';
import { SearchClearButton } from '../SearchClearButton/SearchClearButton';

// Función auxiliar para normalizar valores de texto a minúsculas seguras
const norm = (v) => String(v || '').toLowerCase();

/**
 * Componente modal de búsqueda global.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {boolean} props.isOpen - Determina si el modal está visible o no.
 * @param {Function} props.onClose - Función callback para cerrar el modal de búsqueda.
 */
export const GlobalSearch = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determina si el usuario navega en la vista de vendedor o administrador para ajustar rutas y permisos
  const isSeller = location.pathname.startsWith('/seller');
  const base = isSeller ? '/seller' : '/admin';

  // Configuración dinámica de categorías según el rol actual
  const CATEGORIES = useMemo(() => {
    const cats = [
      { key: 'contacts', label: 'Contactos', icon: Users, path: `${base}/contacts` },
      { key: 'companies', label: 'Empresas', icon: Building2, path: `${base}/companies` },
      { key: 'tasks', label: 'Tareas', icon: CheckSquare, path: `${base}/tasks` },
    ];
    // Los administradores tienen acceso adicional a oportunidades y órdenes de servicio
    if (!isSeller) {
      cats.splice(2, 0, { key: 'deals', label: 'Oportunidades', icon: Handshake, path: '/admin/deals' });
      cats.push({ key: 'orders', label: 'Órdenes de Servicio', icon: FileCheck2, path: '/admin/service-orders' });
    }
    return cats;
  }, [isSeller, base]);

  // Estados del componente
  const [query, setQuery] = useState(''); // Texto ingresado por el usuario
  const [activeFilters, setActiveFilters] = useState([]); // Filtros de categorías seleccionados
  const [selectedIndex, setSelectedIndex] = useState(0); // Índice del resultado seleccionado con el teclado
  const [loading, setLoading] = useState(false); // Estado de carga durante la consulta a la API
  const [data, setData] = useState({ contacts: [], companies: [], deals: [], tasks: [], orders: [] }); // Resultados agrupados devueltos por el backend
  const [inspectingId, setInspectingId] = useState(null); // ID de empresa madre para visualizar su árbol jerárquico
  const inputRef = useRef(null); // Referencia al input para enfocarlo automáticamente

  // Efecto: Búsqueda server-side con debounce de 250ms (evita peticiones innecesarias mientras el usuario escribe)
  useEffect(() => {
    const q = query.trim();
    if (!isOpen || q.length < 2) {
      setData({ contacts: [], companies: [], deals: [], tasks: [], orders: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchApi.search(q, 5);
        setData(res?.data || res || { contacts: [], companies: [], deals: [], tasks: [], orders: [] });
      } catch {
        setData({ contacts: [], companies: [], deals: [], tasks: [], orders: [] });
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Efecto: Enfoca automáticamente el campo de texto al abrir el modal y limpia el estado al cerrarlo
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Alterna la selección de filtros por categoría
  const toggleFilter = (key) => {
    setActiveFilters((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  // Transforma y aplana los datos devueltos por la API según las categorías activas
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const cats = activeFilters.length > 0 ? CATEGORIES.filter((c) => activeFilters.includes(c.key)) : CATEGORIES;
    const out = [];

    cats.forEach((cat) => {
      const items = data[cat.key] || [];
      items.forEach((m) => out.push({ ...m, category: cat }));
    });

    return out;
  }, [query, activeFilters, data, CATEGORIES]);

  // Redirige a la vista correspondiente con el término de búsqueda pre-cargado
  const handleSelect = (result) => {
    navigate(result.category.path, { state: { prefillSearch: result.title } });
    onClose();
  };

  // Efecto: Manejo de atajos de teclado (Escape, Flechas arriba/abajo, Enter)
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

  // Si el modal no está abierto y no se está inspeccionando una empresa, no renderiza nada
  if (!isOpen && !inspectingId) return null;

  // Si el modal principal se cerró para abrir la inspección de empresa, muestra el modal jerárquico
  if (!isOpen) {
    return <CompanyTreeModal companyId={inspectingId} onClose={() => setInspectingId(null)} />;
  }

  return (
    /* Capa de fondo con detector de clic exterior para cerrar */
    <div className="gsearch-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gsearch-modal">
        {/* Barra superior de entrada de búsqueda con iconos y botón de limpiar */}
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
          <SearchClearButton value={query} onClear={() => { setQuery(''); setSelectedIndex(0); }} />
          <button type="button" className="gsearch-close" onClick={onClose} aria-label="Cerrar búsqueda">
            <X size={16} />
          </button>
        </div>

        {/* Barra de etiquetas/píldoras de filtro por categoría */}
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

        {/* Área de visualización de resultados o estados vacíos */}
        <div className="gsearch-results">
          {!query ? (
            /* Estado inicial: ninguna búsqueda ingresada */
            <div className="gsearch-empty">
              <Search size={32} className="gsearch-empty-icon" />
              <p>Empezá a escribir para encontrar lo que necesitás.</p>
            </div>
          ) : loading ? (
            /* Estado de carga mientras se obtienen datos del backend */
            <div className="gsearch-empty">
              <p>Cargando datos…</p>
            </div>
          ) : results.length === 0 ? (
            /* Estado de sin resultados encontrados */
            <div className="gsearch-empty">
              <p>No encontramos resultados para "{query}".</p>
            </div>
          ) : (
            /* Lista de resultados coincidentes */
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
                  {/* Botón para inspeccionar el árbol jerárquico en caso de empresas matrices */}
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

        {/* Pie del modal con leyenda de atajos de teclado */}
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
