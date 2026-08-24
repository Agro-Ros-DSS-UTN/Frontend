import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  MessageSquare,
  Calendar,
  Tag,
  Copy,
  Check,
  Package,
  Layers,
  Search,
} from 'lucide-react';
import { mockPromotions } from '../../data/mockData';
import { promotionsApi } from '../../api/operations.api';
import './SellerPromotionsPage.css';

export const SellerPromotionsPage = () => {
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [promos, setPromos] = useState(mockPromotions);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        setLoading(true);
        const data = await promotionsApi.getAll();
        const rawPromos = Array.isArray(data) ? data : data?.data || [];
        if (rawPromos.length > 0) {
          const formatted = rawPromos.map(p => ({
            id: p.id,
            nombre: p.nombre || 'Promoción Campaña',
            descuento: 'Oferta Especial',
            color: '#e8a735',
            vigencia: p.fechaFin ? String(p.fechaFin).slice(0, 10) : 'Vigente',
            condiciones: p.descripcion || p.condiciones || 'Promoción autorizada para productores.',
            lineas: ['Agroquímicos', 'Fertilizantes']
          }));
          setPromos(formatted);
        }
      } catch (err) {
        console.error('Error fetching seller promotions:', err);
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
    const text = `🌾 Agroquímica Rosario — Promoción Vigente: *${promo.nombre}*\n✅ Beneficio: ${promo.descuento || 'Oferta Especial'}\n📅 Validez: ${promo.vigencia}\n📝 Condiciones: ${promo.condiciones}`;
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

      {/* Promos Cards Grid */}
      <div className="seller-promos-grid">
        {filteredPromos.map(promo => (
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
        ))}
      </div>
    </div>
  );
};
