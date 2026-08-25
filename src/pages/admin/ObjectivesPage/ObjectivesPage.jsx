import { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  Calendar,
  Users,
  Building2,
  DollarSign,
  Layers,
  Sparkles,
  AlertTriangle,
  X,
  CheckCircle2,
  TrendingUp,
  Trash2,
  Award
} from 'lucide-react';
import { objectivesApi } from '../../../api/operations.api';
import { authApi } from '../../../api/auth.api';
import { companiesApi } from '../../../api/companies.api';
import './ObjectivesPage.css';

export const ObjectivesPage = () => {
  const [objectives, setObjectives] = useState([]);
  const [sellersList, setSellersList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    sellerId: '',
    periodoSemana: '34',
    tipoObjetivo: 'Ventas',
    descripcion: '',
    cantidadMeta: 100,
    clientCompanyId: '',
  });

  // Fetch Objectives, Sellers and Companies from Backend API
  const fetchData = async () => {
    try {
      setLoading(true);
      const [objsRes, usersRes, compRes] = await Promise.allSettled([
        objectivesApi.getAll(),
        authApi.getAllUsers(),
        companiesApi.getAll()
      ]);

      if (objsRes.status === 'fulfilled') {
        const rawObjs = objsRes.value?.data || objsRes.value || [];
        setObjectives(Array.isArray(rawObjs) ? rawObjs : []);
      }

      if (usersRes.status === 'fulfilled') {
        const rawUsers = usersRes.value?.data || usersRes.value || [];
        const sellers = rawUsers.filter(u => (u.role || u.rol || '').toLowerCase() === 'vendedor' || (u.role || u.rol || '').toLowerCase() === 'admin');
        setSellersList(sellers);
        if (sellers.length > 0) {
          setForm(prev => ({ ...prev, sellerId: sellers[0].idUser || sellers[0].id }));
        }
      }

      if (compRes.status === 'fulfilled') {
        const rawComp = compRes.value?.data || compRes.value || [];
        setCompaniesList(Array.isArray(rawComp) ? rawComp : []);
      }
    } catch (err) {
      console.error('Error fetching objectives data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateObjective = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const selectedSeller = sellersList.find(s => String(s.idUser || s.id) === String(form.sellerId)) || sellersList[0];
      
      const payload = {
        sellerId: selectedSeller ? (selectedSeller.idUser || selectedSeller.id) : 1,
        descripcion: form.descripcion || `Objetivo de ${form.tipoObjetivo} - Semana ${form.periodoSemana}`,
        tipoObjetivo: form.tipoObjetivo,
        periodoSemana: Number(form.periodoSemana) || 34,
        cantidadMeta: Number(form.cantidadMeta) || 100,
        progresoActual: 0,
        estado: 'en_proceso',
        clientCompanyId: form.clientCompanyId ? Number(form.clientCompanyId) : null
      };

      await objectivesApi.create(payload);
      setShowModal(false);
      
      // Reset form
      setForm({
        sellerId: sellersList[0]?.idUser || sellersList[0]?.id || '',
        periodoSemana: '34',
        tipoObjetivo: 'Ventas',
        descripcion: '',
        cantidadMeta: 100,
        clientCompanyId: ''
      });

      await fetchData();
      alert('¡Objetivo asignado y guardado correctamente en la Base de Datos!');
    } catch (err) {
      console.error('Error creating objective:', err);
      alert('Ocurrió un error al asignar el objetivo. Revisa los datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteObjective = async (id, desc) => {
    if (!window.confirm(`¿Deseas eliminar el objetivo "${desc}"?`)) return;
    try {
      setLoading(true);
      await objectivesApi.delete(id);
      setObjectives(prev => prev.filter(o => o.id !== id));
      alert('Objetivo eliminado correctamente.');
    } catch (err) {
      console.error('Error deleting objective:', err);
      setObjectives(prev => prev.filter(o => o.id !== id));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="objectives-page">
      {/* Header */}
      <div className="objectives-page__header">
        <div>
          <h1 className="objectives-page__title">Gestión de Objetivos Comerciales</h1>
          <p className="objectives-page__subtitle">
            Asignación semanal de metas, incentivos y monitoreo en tiempo real por Vendedor
          </p>
        </div>
        <button
          className="objectives-btn objectives-btn--primary"
          onClick={() => setShowModal(true)}
        >
          <Plus size={16} />
          <span>Asignar Nuevo Objetivo</span>
        </button>
      </div>

      {/* KPI Cards Bar */}
      <div className="objectives-kpis">
        <div className="objective-kpi-card">
          <div className="objective-kpi-icon teal">
            <Target size={22} />
          </div>
          <div>
            <div className="objective-kpi-label">OBJETIVOS ACTIVOS</div>
            <div className="objective-kpi-value">{objectives.length} Asignados</div>
          </div>
        </div>

        <div className="objective-kpi-card">
          <div className="objective-kpi-icon green">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="objective-kpi-label">CUMPLIMIENTO PROMEDIO</div>
            <div className="objective-kpi-value">
              {objectives.length > 0
                ? Math.round(
                    objectives.reduce((acc, o) => acc + Math.min(100, ((o.progresoActual || 0) / (o.cantidadMeta || 1)) * 100), 0) / objectives.length
                  )
                : 0}%
            </div>
          </div>
        </div>

        <div className="objective-kpi-card">
          <div className="objective-kpi-icon blue">
            <Award size={22} />
          </div>
          <div>
            <div className="objective-kpi-label">VENDEDORES ASIGNADOS</div>
            <div className="objective-kpi-value">{sellersList.length} Vendedores</div>
          </div>
        </div>
      </div>

      {/* Objectives Grid */}
      <div className="objectives-grid">
        {objectives.length > 0 ? (
          objectives.map(obj => {
            const sellerName = obj.Seller?.User?.nombreApellido || `Vendedor #${obj.sellerId}`;
            const meta = Number(obj.cantidadMeta) || 100;
            const actual = Number(obj.progresoActual) || 0;
            const pct = Math.min(100, Math.round((actual / meta) * 100));

            return (
              <div key={obj.id} className="objective-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#1a7d6b', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '12px' }}>
                    Semana {obj.periodoSemana || 34} · {obj.tipoObjetivo || 'Comercial'}
                  </span>
                  <button
                    onClick={() => handleDeleteObjective(obj.id, obj.descripcion)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    title="Eliminar objetivo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                  {obj.descripcion}
                </h3>

                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Asignado a: <strong style={{ color: '#0f172a' }}>{sellerName}</strong>
                </div>

                {/* Progress Bar */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    <span>Progreso: {actual} / {meta}</span>
                    <span>{pct}%</span>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#16a34a' : '#1a7d6b', transition: 'width 300ms ease' }} />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: '1 / -1', background: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '3.5rem 2rem', textAlign: 'center', color: '#64748b', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f1f5f9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Target size={32} color="#1a7d6b" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: 800 }}>No hay objetivos asignados actualmente</h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: '#64748b' }}>Haz clic en "Asignar Nuevo Objetivo" para definir metas semanales a tus vendedores.</p>
            <button
              className="objectives-btn objectives-btn--primary"
              onClick={() => setShowModal(true)}
            >
              <Plus size={16} />
              <span>Asignar Nuevo Objetivo</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal: Asignar Nuevo Objetivo */}
      {showModal && (
        <div className="objectives-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#ffffff', width: '520px', maxWidth: '92vw', borderRadius: '16px', padding: '24px', boxShadow: '0 16px 36px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Asignar Objetivo Semanal (Admin)</h2>
              <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateObjective} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                  Vendedor Asignado *
                </label>
                <select
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                  value={form.sellerId}
                  onChange={e => setForm({ ...form, sellerId: e.target.value })}
                  required
                >
                  {sellersList.map((u, idx) => (
                    <option key={u.idUser || u.id || idx} value={u.idUser || u.id}>
                      {u.nombreApellido || u.idUser} ({u.role || u.rol || 'Vendedor'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    Tipo de Objetivo *
                  </label>
                  <select
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                    value={form.tipoObjetivo}
                    onChange={e => setForm({ ...form, tipoObjetivo: e.target.value })}
                  >
                    <option value="Ventas">Ventas en Volúmen</option>
                    <option value="Visitas">Visitas a Campo</option>
                    <option value="Cotizaciones">Nuevas Cotizaciones</option>
                    <option value="Cobranzas">Gestión de Cobranza</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    Semana *
                  </label>
                  <input
                    type="number"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    value={form.periodoSemana}
                    onChange={e => setForm({ ...form, periodoSemana: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                  Descripción de la Meta *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Vender 500L de Fertilizantes o Visitar 15 Campos"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                  Cantidad Meta u Objetivo Numérico *
                </label>
                <input
                  type="number"
                  placeholder="Ej: 500"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  value={form.cantidadMeta}
                  onChange={e => setForm({ ...form, cantidadMeta: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="objectives-btn objectives-btn--primary"
                  style={{ flex: 1, padding: '12px', background: '#1a7d6b', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                  disabled={loading}
                >
                  {loading ? 'Guardando en BD...' : 'Guardar y Asignar a Vendedor'}
                </button>
                <button
                  type="button"
                  style={{ padding: '12px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
