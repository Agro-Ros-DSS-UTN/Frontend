import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Phone,
  MessageSquare,
  MapPin,
  Building2,
  Ruler,
  Calendar,
  Plus,
  ExternalLink,
  Eye,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { mockCompanies, mockClients } from '../../data/mockData';
import './SellerClientsPage.css';

export const SellerClientsPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [localidadFilter, setLocalidadFilter] = useState('');

  // Assigned companies for seller (Casilda & South Zone)
  const myCompanies = useMemo(() => {
    let result = [...mockCompanies];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.nombreEmpresa.toLowerCase().includes(q) ||
        c.cuit.includes(q) ||
        c.localidad?.toLowerCase().includes(q)
      );
    }
    if (localidadFilter) {
      result = result.filter(c => c.localidad === localidadFilter);
    }
    return result;
  }, [searchQuery, localidadFilter]);

  const localidades = Array.from(new Set(mockCompanies.map(c => c.localidad))).filter(Boolean);

  return (
    <div className="seller-clients-page">
      {/* Header */}
      <div className="seller-clients-header">
        <div>
          <h1 className="seller-clients-title">Mi Cartera de Clientes</h1>
          <p className="seller-clients-subtitle">
            {myCompanies.length} productores y empresas asignadas en tu zona
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="seller-clients-toolbar">
        <div className="seller-clients-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por productor, empresa o CUIT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="seller-clients-filters">
          <button
            className={`client-filter-chip ${!localidadFilter ? 'active' : ''}`}
            onClick={() => setLocalidadFilter('')}
          >
            Todas las localidades
          </button>
          {localidades.map(loc => (
            <button
              key={loc}
              className={`client-filter-chip ${localidadFilter === loc ? 'active' : ''}`}
              onClick={() => setLocalidadFilter(localidadFilter === loc ? '' : loc)}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="seller-clients-grid">
        {myCompanies.map(comp => (
          <div key={comp.id} className="seller-client-card">
            <div className="client-card-header">
              <div className="client-avatar-badge">
                <Building2 size={18} />
              </div>
              <div className="client-main-info">
                <h3 className="client-name">{comp.nombreEmpresa}</h3>
                <span className="client-cuit">CUIT: {comp.cuit}</span>
              </div>
              <span className={`client-type-badge ${comp.tipoEmpresa.toLowerCase()}`}>
                {comp.tipoEmpresa}
              </span>
            </div>

            <div className="client-card-details">
              <div className="client-detail-row">
                <MapPin size={13} className="text-muted" />
                <span>{comp.direccionEmpresa || 'Ruta Provincial'}, {comp.localidad}</span>
              </div>
              <div className="client-detail-row">
                <Ruler size={13} className="text-muted" />
                <span>Superficie: <strong>{comp.superficieHa ? `${comp.superficieHa.toLocaleString('es-AR')} ha` : 'No especificada'}</strong></span>
              </div>
              <div className="client-detail-row">
                <FileText size={13} className="text-muted" />
                <span>Proveedor actual: <strong>{comp.proveedorActual || 'Syngenta'}</strong></span>
              </div>
            </div>

            <div className="client-card-actions">
              <a
                href={`https://wa.me/5493414567890?text=Hola%20${encodeURIComponent(comp.nombreEmpresa)},%20te%20escribo%20de%20Agroqu%C3%ADmica%20Rosario.`}
                target="_blank"
                rel="noopener noreferrer"
                className="client-action-btn whatsapp"
              >
                <MessageSquare size={14} />
                <span>WhatsApp</span>
              </a>
              <a
                href="tel:+543414567890"
                className="client-action-btn call"
              >
                <Phone size={14} />
                <span>Llamar</span>
              </a>
              <button
                className="client-action-btn log-activity"
                onClick={() => navigate('/seller/actividades')}
              >
                <Plus size={14} />
                <span>Actividad</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
