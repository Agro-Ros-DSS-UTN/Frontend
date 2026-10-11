import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../api/auth.api';
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
  Eye,
  EyeOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificar } from '../../../hooks/useNotificaciones';
import './ProfilePage.css';

const TABS = [
  { key: 'perfil', label: 'Perfil' },
  { key: 'password', label: 'Contraseña' },
];

const MAX_PASSWORD_LENGTH = 64;

export const ProfilePage = () => {
  const { currentUser, profileImage, updateProfileImage, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('perfil');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const isSeller = (currentUser?.role || currentUser?.rol)?.toLowerCase() === 'vendedor';

  const seller = null;
  // Zona asignada por la administración (localidades) y datos frescos del servidor.
  const [zona, setZona] = useState([]);
  useEffect(() => {
    authApi.me()
      .then((res) => {
        const u = res?.data || {};
        setZona(Array.isArray(u.zona) ? u.zona : []);
        if (u.telefono) setPhones([u.telefono]);
        if (u.email !== undefined) setForm((prev) => ({ ...prev, email: u.email || '' }));
      })
      .catch(() => {});
  }, []);

  // Form state (initialize from currentUser + seller)
  const nameParts = (currentUser?.nombreApellido || '').split(' ');
  const [form, setForm] = useState({
    nombre: nameParts[0] || '',
    apellido: nameParts.slice(1).join(' ') || '',
    email: currentUser?.email || currentUser?.direccionMail || '',
    numDoc: currentUser?.numDoc || currentUser?.idUser || '',
    direccion: currentUser?.direccion || '',
    idioma: 'Español',
    formatoFecha: 'Argentina',
  });

  const [phones, setPhones] = useState([currentUser?.telefono || '']);

  // ── Cambio de contraseña ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const passwordChecks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    symbol: /[^A-Za-z0-9]/.test(newPassword),
  };
  const passwordScore = Object.values(passwordChecks).filter(Boolean).length;
  const passwordStrength =
    newPassword.length === 0
      ? null
      : passwordScore <= 1
      ? { label: 'Débil', color: 'red' }
      : passwordScore <= 3
      ? { label: 'Media', color: 'orange' }
      : { label: 'Fuerte', color: 'green' };

  const canSubmitPassword =
    currentPassword.length > 0 &&
    passwordScore === 4 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const handlePasswordUpdate = async () => {
    setPasswordError('');
    if (!currentPassword) {
      setPasswordError('Ingresá tu contraseña actual.');
      return;
    }
    if (passwordScore < 4) {
      setPasswordError('La nueva contraseña no cumple todos los requisitos de seguridad.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    setPasswordSaving(true);
    try {
      const userId = currentUser?.idUser || currentUser?.id;
      // El servidor verifica la contraseña actual, guarda la nueva y cierra las
      // sesiones abiertas en otros equipos; este equipo recibe un token nuevo.
      const res = await authApi.cambiarPassword(currentPassword, newPassword);
      if (res?.token && updateCurrentUser) updateCurrentUser({ token: res.token });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err) {
      setPasswordError(err?.response?.data?.message || 'La contraseña actual es incorrecta.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const blockPaste = (e) => e.preventDefault();

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optimizar imagen con canvas antes de guardar en Base64 en la base de datos (max 400x400)
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        updateProfileImage(optimizedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    if (window.confirm('¿Querés eliminar tu foto de perfil?')) {
      updateProfileImage(null);
    }
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const userId = currentUser?.idUser || currentUser?.id;
      const fullName = `${form.nombre} ${form.apellido}`.trim();

      if (userId) {
        await authApi.updateUser(userId, {
          nombreApellido: fullName,
          email: form.email.trim() || null,
          telefono: (phones.find((p) => p && p.trim()) || '').trim() || null,
        });

        if (updateCurrentUser) {
          updateCurrentUser({
            nombreApellido: fullName,
            email: form.email,
            direccionMail: form.email,
          });
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error al guardar datos de perfil:', err);
      notificar.error('No se pudieron guardar los cambios', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      {/* Back nav */}
      <div className="profile-page__back">
        <button
          className="profile-page__back-btn"
          onClick={() => navigate(isSeller ? '/seller/dashboard' : '/admin/inicio')}
        >
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

            {/* Profile Image */}
            <div className="profile-field">
              <label className="profile-field__label">Imagen de perfil</label>
              <div className="profile-avatar-upload" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  className="profile-avatar-upload__preview"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ position: 'relative', cursor: 'pointer' }}
                >
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      cursor: 'pointer',
                      width: 'fit-content',
                    }}
                  >
                    Click para cambiar la foto
                  </button>

                  {profileImage && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '0',
                        fontSize: '0.8rem',
                        color: '#ef4444',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      Eliminar foto de perfil
                    </button>
                  )}
                </div>
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

            {/* Documento / ID Usuario */}
            <div className="profile-field">
              <label className="profile-field__label">
                <FileText size={14} /> ID / Documento de usuario
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
                Formato: 10 de agosto de 2026, 10/08/2026, 9:40 y 1.234,56
              </p>
              <select
                className="profile-field__select"
                value={form.formatoFecha}
                onChange={(e) => updateField('formatoFecha', e.target.value)}
              >
                <option value="Argentina">Argentina</option>
                <option value="España">España</option>
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

          {/* Zona del vendedor (la define la administración) */}
          {isSeller && (
            <section className="profile-section">
              <h2 className="profile-section__title">Zona asignada</h2>
              <p className="profile-section__desc">Localidades en las que trabajás. Las asigna la administración.</p>
              {zona.length === 0 ? (
                <p className="profile-section__desc">Todavía no tenés localidades asignadas.</p>
              ) : (
                <div className="profile-zona">
                  {zona.map((l) => (
                    <span key={l.id} className="profile-zona__chip">{l.nombre}{l.provincia ? ` · ${l.provincia}` : ''}</span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Save button */}
          <div className="profile-page__actions">
            <button className="profile-page__save-btn" onClick={handleSave} disabled={saving}>
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            {saved && (
              <span className="profile-page__saved-msg">✓ Cambios guardados correctamente</span>
            )}
          </div>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="profile-page__content">
          <section className="profile-section">
            <h2 className="profile-section__title">Contraseña</h2>
            <p className="profile-section__desc">Actualizá la contraseña de tu cuenta.</p>

            <div className="profile-field">
              <label className="profile-field__label">Contraseña actual</label>
              <div className="profile-password-wrap">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="profile-field__input"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); }}
                />
                <button type="button" className="profile-password-eye" onClick={() => setShowCurrent((s) => !s)}>
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="profile-field">
              <label className="profile-field__label">Nueva contraseña</label>
              <div className="profile-password-wrap">
                <input
                  type={showNew ? 'text' : 'password'}
                  className="profile-field__input"
                  placeholder="Ingresá una nueva contraseña"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                  maxLength={MAX_PASSWORD_LENGTH}
                />
                <button type="button" className="profile-password-eye" onClick={() => setShowNew((s) => !s)}>
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {passwordStrength && (
                <div className="profile-password-strength">
                  <div className="profile-password-strength__bars">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`profile-password-strength__bar ${i < passwordScore ? passwordStrength.color : ''}`}
                      />
                    ))}
                  </div>
                  <span className={`profile-password-strength__label ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}

              <ul className="profile-password-rules">
                <li className={passwordChecks.length ? 'ok' : ''}>Entre 8 y {MAX_PASSWORD_LENGTH} caracteres</li>
                <li className={passwordChecks.upper ? 'ok' : ''}>Al menos una mayúscula</li>
                <li className={passwordChecks.number ? 'ok' : ''}>Al menos un número</li>
                <li className={passwordChecks.symbol ? 'ok' : ''}>Al menos un símbolo (ej: @ # $ % !)</li>
              </ul>
            </div>

            <div className="profile-field">
              <label className="profile-field__label">Confirmar nueva contraseña</label>
              <div className="profile-password-wrap">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="profile-field__input"
                  placeholder="Repetí la nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                  onPaste={blockPaste}
                  onCopy={blockPaste}
                  onCut={blockPaste}
                  maxLength={MAX_PASSWORD_LENGTH}
                />
                <button type="button" className="profile-password-eye" onClick={() => setShowConfirm((s) => !s)}>
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {passwordError && <p className="profile-password-error">{passwordError}</p>}

            <div className="profile-page__actions">
              <button
                className="profile-page__save-btn"
                onClick={handlePasswordUpdate}
                disabled={!canSubmitPassword || passwordSaving}
              >
                <Save size={16} />
                {passwordSaving ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
              {passwordSaved && (
                <span className="profile-page__saved-msg">✓ Contraseña actualizada correctamente</span>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
