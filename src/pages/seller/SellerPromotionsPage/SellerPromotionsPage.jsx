import { useState, useEffect } from 'react';
import {
  Sparkles,
  MessageSquare,
  Calendar,
  Copy,
  Check,
  Search,
} from 'lucide-react';
import { mockPromotions } from '../../../data/mockData';
import { promotionsApi } from '../../../api/operations.api';
import './SellerPromotionsPage.css';

const PROMO_COLORS = ['#e8a735', '#4caf50', '#0ea5e9', '#8b5cf6', '#ec4899', '#f97316'];

export const SellerPromotionsPage = () => {
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        setLoading(true);
        const data = await promotionsApi.getAll();
        const rawPromos = Array.isArray(data) ? data : data?.data || [];
        const formatted = rawPromos.map((p, i) => ({
          id: p.id,
          nombre: p.nombre || 'Promoción Campaña',
          descuento: 'Oferta Exclusiva',
          color: PROMO_COLORS[i % PROMO_COLORS.length],
          vigencia: p.fechaFin ? String(p.fechaFin).slice(0, 10) : 'Vigente',
          condiciones: p.descripcion || p.condiciones || 'Promoción autorizada para productores.',
        }));
        setPromos(formatted);
      } catch (err) {
        console.error('Error fetching seller promotions from MySQL:', err);
        const formattedMock = mockPromotions.map((m, i) => ({
          ...m,
          color: PROMO_COLORS[i % PROMO_COLORS.length]
        }));
        setPromos(formattedMock);
      } finally {
        setLoading(false);
      }
    };
    fetchPromos();
  }, []);

  const filteredPromos = promos.filter(p =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.condiciones && p.condiciones.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCopy = (promo) => {
    const text = `📢 Agroquímica Rosario • Promoción Vigente: *${promo.nombre}*\n✅ Beneficio: ${promo.descuento || 'Oferta Exclusiva'}\n📅 Validez: ${promo.vigencia}\n📝 Condiciones: ${promo.condiciones}`;
    navigator.clipboard.writeText(text);
    setCopiedId(promo.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="seller-promos-page">
      {/* Header */}
      <div className="seller-promos-header">
        <div>
          <h1 className="seller-promos-title">Promociones Comerciales Vigentes</h1>
          <p className="seller-promos-subtitle">
            Combos y condiciones especiales autorizadas para ofrecer a productores en campo (Base de Datos)
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="seller-promos-toolbar">
        <div className="seller-promos-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre o producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Loading Indicator or Cards Grid */}
      {loading ? (
        <div className="roadmaps-loading-state-box">
          <div className="r-spinner-icon" />
          <h3>Conectando con la base de datos...</h3>
          <p>Por favor aguardá un instante mientras cargamos las promociones vigentes de MySQL.</p>
        </div>
      ) : (
        <div className="seller-promos-grid">
          {filteredPromos.length === 0 ? (
            <div style={{ colSpan: 'all', padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No se encontraron promociones comerciales registradas.
            </div>
          ) : (
            filteredPromos.map(promo => (
              <div key={promo.id} className="seller-promo-card">
                <div className="promo-card-badge" style={{ backgroundColor: promo.color || '#e8a735' }}>
                  <Sparkles size={16} />
                  <span>{promo.descuento || 'Oferta Exclusiva'}</span>
                </div>

                <div className="promo-card-body">
                  <h2 className="promo-card-title">{promo.nombre}</h2>
                  <p className="promo-card-cond">{promo.condiciones}</p>

                  <div className="promo-card-details">
                    <div className="promo-detail-row">
                      <Calendar size={13} className="text-muted" />
                      <span>Vigencia: <strong>{promo.vigencia}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="promo-card-actions">
                  <button
                    className="promo-btn-copy"
                    onClick={() => handleCopy(promo)}
                  >
                    {copiedId === promo.id ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedId === promo.id ? 'Copiado' : 'Copiar Texto'}</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=Hola!%20Te%20comparto%20la%20promoci%C3%B3n%20vigente%20de%20Agroqu%C3%ADmica%20Rosario:%20*${encodeURIComponent(promo.nombre)}*%0A%E2%9C%85%20${encodeURIComponent(promo.condiciones)}%0A%F0%9F%93%85%20Vigencia:%20${encodeURIComponent(promo.vigencia)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="promo-btn-whatsapp"
                  >
                    <MessageSquare size={14} />
                    <span>Enviar por WhatsApp</span>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};