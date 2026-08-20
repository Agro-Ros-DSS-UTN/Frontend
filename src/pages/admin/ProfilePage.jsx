import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Camera,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Globe,
  Clock,
  Plus,
  Trash2,
  ChevronLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockSellers } from '../../data/mockData';
import './ProfilePage.css';

const TABS = [
  { key: 'perfil', label: 'Perfil' },
  { key: 'correo', label: 'Correo' },
  { key: 'seguridad', label: 'Seguridad' },
];

export const ProfilePage = () => {
  const { currentUser, profileImage, updateProfileImage } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('perfil');
  const [saved, setSaved] = useState(false);

  // Get seller data if applicable
  const seller = currentUser?.role === 'vendedor'
    ? mockSellers.find(s => s.userNumDoc === currentUser.numDoc)
    : null;

  // Form state (initialize from currentUser + seller)
  const nameParts = (currentUser?.nombreApellido || '').split(' ');
  const [form, setForm] = useState({
    nombre: nameParts[0] || '',
    apellido: nameParts.slice(1).join(' ') || '',
    email: currentUser?.direccionMail || '',
    numDoc: currentUser?.numDoc || '',
    direccion: currentUser?.direccion || '',
    idioma: 'Español',
    formatoFecha: 'España',
    // Seller specific
    productoOfrecido: seller?.productoOfrecido || '',
    zonaAsignada: seller?.zonaAsignada || '',
    seguimientoCliente: seller?.seguimientoCliente || '',
  });

  const [phones, setPhones] = useState(['+54 341 456-7890']);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateProfileImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const addPhone = () => {
    setPhones(prev => [...prev, '']);
    setSaved(false);
  };

  const removePhone = (index) => {
    setPhones(prev => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const updatePhone = (index, value) => {
    setPhones(prev => prev.map((p, i) => i === index ? value : p));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="profile-page">
      {/* Back nav */}
      <div className="profile-page__back">
        <button className="profile-page__back-btn" onClick={() => navigate('/admin/dashboard')}>
          <ChevronLeft size={16} />
          Volver a Inicio
        </button>
      </div>

      {/* Page Title */}
      <h1 className="profile-page__title">General</h1>

      {/* Tabs */}
      <div className="profile-page__tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`profile-page__tab ${activeTab === tab.key ? 'profile-page__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Hint */}
      <p className="profile-page__hint">Estas preferencias solo se aplican a ti.</p>

      {activeTab === 'perfil' && (
        <div className="profile-page__content">
          {/* Global Section */}
          <section className="profile-section">
            <h2 className="profile-section__title">Global</h2>
            <p className="profile-section__desc">Esto se aplica a todas las cuentas del CRM que tenés.</p>

            {/* Profile Image */}
            <div className="profile-field">
              <label className="profile-field__label">Imagen de perfil</label>
              <div className="profile-avatar-upload">
                <div className="profile-avatar-upload__preview" onClick={() => fileInputRef.current?.click()}>
                  {profileImage ? (
                    <img src={profileImage} alt="Perfil" className="profile-avatar-upload__img" />
                  ) : (
                    <div className="profile-avatar-upload__placeholder">
                      <User size={28} />
                    </div>
                  )}
                  <div className="profile-avatar-upload__overlay">
                    <Camera size={16} />
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <span className="profile-avatar-upload__hint">Click para cambiar la foto</span>
              </div>
            </div>

            {/* Nombre */}
            <div className="profile-field">
              <label className="profile-field__label">
                <User size={14} /> Nombre
              </label>
              <input
                type="text"
                className="profile-field__input"
                value={form.nombre}
                onChange={(e) => updateField('nombre', e.target.value)}
              />
            </div>

            {/* Apellido */}
            <div className="profile-field">
              <label className="profile-field__label">Apellidos</label>
              <input
                type="text"
                className="profile-field__input"
                value={form.apellido}
                onChange={(e) => updateField('apellido', e.target.value)}
              />
            </div>

            {/* Email */}
            <div className="profile-field">
              <label className="profile-field__label">
                <Mail size={14} /> Correo electrónico
              </label>
              <input
                type="email"
                className="profile-field__input"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>

            {/* Documento */}
            <div className="profile-field">
              <label className="profile-field__label">
                <FileText size={14} /> Número de documento
              </label>
              <input
                type="text"
                className="profile-field__input profile-field__input--readonly"
                value={form.numDoc}
                readOnly
              />
            </div>

            {/* Dirección */}
            <div className="profile-field">
              <label className="profile-field__label">
                <MapPin size={14} /> Dirección
              </label>
              <input
                type="text"
                className="profile-field__input"
                value={form.direccion}
                onChange={(e) => updateField('direccion', e.target.value)}
              />
            </div>

            {/* Idioma */}
            <div className="profile-field">
              <label className="profile-field__label">
                <Globe size={14} /> Idioma
              </label>
              <select
                className="profile-field__select"
                value={form.idioma}
                onChange={(e) => updateField('idioma', e.target.value)}
              >
                <option value="Español">Español</option>
                <option value="English">English</option>
                <option value="Português">Português</option>
              </select>
            </div>

            {/* Formato fecha */}
            <div className="profile-field">
              <label className="profile-field__label">
                <Clock size={14} /> Formato de hora, fecha y número
              </label>
              <p className="profile-field__hint">
                Formato: 10 de agosto de 2026, 10/08/2026, 9:40 EST y 1.234,56
              </p>
              <select
                className="profile-field__select"
                value={form.formatoFecha}
                onChange={(e) => updateField('formatoFecha', e.target.value)}
              >
                <option value="España">España</option>
                <option value="Argentina">Argentina</option>
                <option value="Estados Unidos">Estados Unidos</option>
              </select>
            </div>

            {/* Teléfonos */}
            <div className="profile-field">
              <label className="profile-field__label">
                <Phone size={14} /> Números de teléfono
              </label>
              <p className="profile-field__hint">
                Podemos usar este número de teléfono para contactarte en referencia a eventos de seguridad.
              </p>
              <div className="profile-phones">
                {phones.map((phone, idx) => (
                  <div key={idx} className="profile-phones__row">
                    <div className="profile-phones__prefix">
                      <span>🇦🇷</span>
                      <span>+54</span>
                    </div>
                    <input
                      type="text"
                      className="profile-field__input"
                      value={phone}
                      onChange={(e) => updatePhone(idx, e.target.value)}
                      placeholder="Número de teléfono"
                    />
                    {phones.length > 1 && (
                      <button
                        type="button"
                        className="profile-phones__remove"
                        onClick={() => removePhone(idx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="profile-phones__add" onClick={addPhone}>
                  <Plus size={14} /> Agregar teléfono
                </button>
              </div>
            </div>
          </section>

          {/* Seller Section (if applicable) */}
          {(currentUser?.role === 'vendedor' || seller) && (
            <section className="profile-section">
              <h2 className="profile-section__title">Datos del Vendedor</h2>
              <p className="profile-section__desc">Información específica de tu rol como vendedor.</p>

              <div className="profile-field">
                <label className="profile-field__label">Producto ofrecido</label>
                <input
                  type="text"
                  className="profile-field__input"
                  value={form.productoOfrecido}
                  onChange={(e) => updateField('productoOfrecido', e.target.value)}
                />
              </div>

              <div className="profile-field">
                <label className="profile-field__label">Zona asignada</label>
                <input
                  type="text"
                  className="profile-field__input"
                  value={form.zonaAsignada}
                  onChange={(e) => updateField('zonaAsignada', e.target.value)}
                />
              </div>

              <div className="profile-field">
                <label className="profile-field__label">Seguimiento de cliente</label>
                <textarea
                  className="profile-field__textarea"
                  value={form.seguimientoCliente}
                  onChange={(e) => updateField('seguimientoCliente', e.target.value)}
                  rows={3}
                />
              </div>
            </section>
          )}

          {/* Save button */}
          <div className="profile-page__actions">
            <button className="profile-page__save-btn" onClick={handleSave}>
              <Save size={16} />
              Guardar cambios
            </button>
            {saved && (
              <span className="profile-page__saved-msg">✓ Cambios guardados correctamente</span>
            )}
          </div>
        </div>
      )}

      {activeTab === 'correo' && (
        <div className="profile-page__content">
          <section className="profile-section">
            <h2 className="profile-section__title">Configuración de correo</h2>
            <p className="profile-section__desc">Configurá tu firma de correo y preferencias de envío.</p>

            <div className="profile-field">
              <label className="profile-field__label">Firma de correo electrónico</label>
              <textarea
                className="profile-field__textarea"
                rows={4}
                placeholder="Escribí tu firma aquí..."
                defaultValue={`${currentUser?.nombreApellido || ''}\n${currentUser?.direccionMail || ''}\nAgroquímica Rosario`}
              />
            </div>

            <div className="profile-field">
              <label className="profile-field__label">Correo de respuesta</label>
              <input
                type="email"
                className="profile-field__input"
                defaultValue={currentUser?.direccionMail || ''}
              />
            </div>
          </section>
        </div>
      )}

      {activeTab === 'seguridad' && (
        <div className="profile-page__content">
          <section className="profile-section">
            <h2 className="profile-section__title">Seguridad</h2>
            <p className="profile-section__desc">Gestioná tu contraseña y opciones de seguridad.</p>

            <div className="profile-field">
              <label className="profile-field__label">Contraseña actual</label>
              <input type="password" className="profile-field__input" placeholder="••••••••" />
            </div>

            <div className="profile-field">
              <label className="profile-field__label">Nueva contraseña</label>
              <input type="password" className="profile-field__input" placeholder="Ingresá una nueva contraseña" />
            </div>

            <div className="profile-field">
              <label className="profile-field__label">Confirmar nueva contraseña</label>
              <input type="password" className="profile-field__input" placeholder="Repetí la nueva contraseña" />
            </div>

            <div className="profile-page__actions">
              <button className="profile-page__save-btn">
                <Save size={16} />
                Actualizar contraseña
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
