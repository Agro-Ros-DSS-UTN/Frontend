import React, { useState } from 'react';
import {
  User,
  Bell,
  Shield,
  Users,
  Database,
  Building,
  Sliders,
  CheckCircle,
  Save,
  ChevronRight,
  ChevronLeft,
  Mail,
  Lock,
  Globe,
  Key,
  Truck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './SettingsPage.css';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('general');
  const [saved, setSaved] = useState(false);

  // Form states
  const [notifEmails, setNotifEmails] = useState(true);
  const [notifOpps, setNotifOpps] = useState(true);
  const [notifActivities, setNotifActivities] = useState(true);
  const [themeMode, setThemeMode] = useState('light');
  const [defaultCurrency, setDefaultCurrency] = useState('ARS');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const navItems = [
    {
      group: 'Tus preferencias',
      items: [
        { id: 'general', label: 'General', icon: Sliders },
        { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
        { id: 'seguridad', label: 'Seguridad y Acceso', icon: Shield },
      ],
    },
    {
      group: 'Gestión de cuentas',
      items: [
        { id: 'usuarios', label: 'Usuarios y equipos', icon: Users },
        { id: 'proveedores', label: 'Proveedores de agroquímicos', icon: Truck },
      ],
    },
    {
      group: 'Gestión de datos',
      items: [
        { id: 'propiedades', label: 'Propiedades del CRM', icon: Database },
        { id: 'integraciones', label: 'Integraciones', icon: Globe },
      ],
    },
  ];

  return (
    <div className="settings-page">
      <div className="settings-page__sidebar">
        <button
          className="settings-page__back-btn"
          onClick={() => navigate('/admin/dashboard')}
        >
          <ChevronLeft size={16} />
          Volver a Dashboard
        </button>

        <h2 className="settings-page__nav-title">Configuración</h2>

        <div className="settings-page__nav-groups">
          {navItems.map((group) => (
            <div key={group.group} className="settings-page__nav-group">
              <span className="settings-page__group-title">{group.group}</span>
              <ul className="settings-page__group-list">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        className={`settings-page__nav-item ${
                          activeSection === item.id ? 'settings-page__nav-item--active' : ''
                        }`}
                        onClick={() => setActiveSection(item.id)}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-page__main">
        {activeSection === 'general' && (
          <div className="settings-section">
            <div className="settings-section__header">
              <h1 className="settings-section__title">Preferencias Generales</h1>
              <p className="settings-section__subtitle">
                Personalizá la experiencia y visualización de datos en el sistema.
              </p>
            </div>

            <div className="settings-card">
              <h3 className="settings-card__title">Moneda y Unidades por Defecto</h3>
              <div className="settings-form-row">
                <label className="settings-label">Moneda principal</label>
                <select
                  className="settings-select"
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                >
                  <option value="ARS">ARS ($ - Peso Argentino)</option>
                  <option value="USD">USD (U$S - Dólar Estadounidense)</option>
                </select>
              </div>

              <div className="settings-form-row">
                <label className="settings-label">Unidad de superficie</label>
                <select className="settings-select" defaultValue="ha">
                  <option value="ha">Hectáreas (ha)</option>
                  <option value="m2">Metros cuadrados (m²)</option>
                </select>
              </div>
            </div>

            <div className="settings-card">
              <h3 className="settings-card__title">Perfil de usuario</h3>
              <p className="settings-card__desc">
                Podés editar tu información personal, foto de perfil, números de contacto y firma en la sección de Mi Perfil.
              </p>
              <button
                className="settings-btn settings-btn--outline"
                onClick={() => navigate('/admin/perfil')}
              >
                Ir a Mi Perfil <ChevronRight size={16} />
              </button>
            </div>

            <div className="settings-actions">
              <button className="settings-btn settings-btn--primary" onClick={handleSave}>
                <Save size={16} /> Guardar cambios
              </button>
              {saved && <span className="settings-saved-badge"><CheckCircle size={16} /> Cambios guardados</span>}
            </div>
          </div>
        )}

        {activeSection === 'notificaciones' && (
          <div className="settings-section">
            <div className="settings-section__header">
              <h1 className="settings-section__title">Notificaciones</h1>
              <p className="settings-section__subtitle">
                Configurá qué alertas y recordatorios querés recibir.
              </p>
            </div>

            <div className="settings-card">
              <h3 className="settings-card__title">Alertas por Correo</h3>
              <div className="settings-toggle-row">
                <div>
                  <div className="settings-toggle-title">Nuevas oportunidades asignadas</div>
                  <div className="settings-toggle-desc">Recibir email cuando se te asigne un nuevo prospecto o lead</div>
                </div>
                <input
                  type="checkbox"
                  className="settings-checkbox"
                  checked={notifOpps}
                  onChange={(e) => setNotifOpps(e.target.checked)}
                />
              </div>

              <div className="settings-toggle-row">
                <div>
                  <div className="settings-toggle-title">Seguimientos y Actividades pendientes</div>
                  <div className="settings-toggle-desc">Avisos de visitas y llamadas agendadas del día</div>
                </div>
                <input
                  type="checkbox"
                  className="settings-checkbox"
                  checked={notifActivities}
                  onChange={(e) => setNotifActivities(e.target.checked)}
                />
              </div>

              <div className="settings-toggle-row">
                <div>
                  <div className="settings-toggle-title">Resumen comercial semanal</div>
                  <div className="settings-toggle-desc">Informe consolidado de ventas y cumplimiento de objetivos</div>
                </div>
                <input
                  type="checkbox"
                  className="settings-checkbox"
                  checked={notifEmails}
                  onChange={(e) => setNotifEmails(e.target.checked)}
                />
              </div>
            </div>

            <div className="settings-actions">
              <button className="settings-btn settings-btn--primary" onClick={handleSave}>
                <Save size={16} /> Guardar cambios
              </button>
              {saved && <span className="settings-saved-badge"><CheckCircle size={16} /> Cambios guardados</span>}
            </div>
          </div>
        )}

        {activeSection === 'seguridad' && (
          <div className="settings-section">
            <div className="settings-section__header">
              <h1 className="settings-section__title">Seguridad y Acceso</h1>
              <p className="settings-section__subtitle">
                Políticas de contraseña, sesiones activas y autenticación.
              </p>
            </div>

            <div className="settings-card">
              <h3 className="settings-card__title">Autenticación de doble factor (2FA)</h3>
              <p className="settings-card__desc">
                Añadí una capa extra de protección a tu cuenta solicitando un código al iniciar sesión.
              </p>
              <button className="settings-btn settings-btn--outline">
                <Key size={16} /> Configurar 2FA
              </button>
            </div>

            <div className="settings-card">
              <h3 className="settings-card__title">Sesiones activas</h3>
              <div className="settings-session-item">
                <Globe size={18} className="settings-session-icon" />
                <div>
                  <div className="settings-session-title">Chrome en Windows (Sesión actual)</div>
                  <div className="settings-session-desc">Rosario, Santa Fe • Activa ahora</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'usuarios' && (
          <div className="settings-section">
            <div className="settings-section__header">
              <h1 className="settings-section__title">Usuarios y Equipos</h1>
              <p className="settings-section__subtitle">
                Administrá el equipo comercial, roles y zonas asignadas.
              </p>
            </div>

            <div className="settings-card">
              <h3 className="settings-card__title">Equipo Comercial Activo</h3>
              <table className="settings-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Zona</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Manuel Fernández</strong></td>
                    <td>manuel.fernandez@agroros.com.ar</td>
                    <td><span className="settings-role-badge admin">Admin</span></td>
                    <td>Casa Central - Rosario</td>
                    <td><span className="settings-status-dot active"></span> Activo</td>
                  </tr>
                  <tr>
                    <td><strong>Martín Gutiérrez</strong></td>
                    <td>martin.gutierrez@agroros.com.ar</td>
                    <td><span className="settings-role-badge seller">Vendedor</span></td>
                    <td>Zona Sur - Casilda / Cañada</td>
                    <td><span className="settings-status-dot active"></span> Activo</td>
                  </tr>
                  <tr>
                    <td><strong>Ana Rodríguez</strong></td>
                    <td>ana.rodriguez@agroros.com.ar</td>
                    <td><span className="settings-role-badge seller">Vendedor</span></td>
                    <td>Zona Norte - San Jorge / Sastre</td>
                    <td><span className="settings-status-dot active"></span> Activo</td>
                  </tr>
                  <tr>
                    <td><strong>Diego Morales</strong></td>
                    <td>diego.morales@agroros.com.ar</td>
                    <td><span className="settings-role-badge seller">Vendedor</span></td>
                    <td>Zona Oeste - Venado Tuerto / Rufino</td>
                    <td><span className="settings-status-dot active"></span> Activo</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'proveedores' && (
          <div className="settings-section">
            <div className="settings-section__header">
              <h1 className="settings-section__title">Proveedores de Insumos</h1>
              <p className="settings-section__subtitle">
                Marcas y laboratorios de fitosanitarios y fertilizantes vinculados.
              </p>
            </div>

            <div className="settings-card">
              <h3 className="settings-card__title">Principales Proveedores Registrados</h3>
              <div className="settings-providers-grid">
                {['Syngenta', 'Bayer Crop Science', 'BASF', 'Corteva Agriscience', 'FMC', 'ADAMA', 'Nidera Seeds'].map((prov) => (
                  <div key={prov} className="settings-provider-badge">
                    <Truck size={16} />
                    <span>{prov}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'propiedades' && (
          <div className="settings-section">
            <div className="settings-section__header">
              <h1 className="settings-section__title">Propiedades del CRM</h1>
              <p className="settings-section__subtitle">
                Atributos configurados para Contactos, Empresas y Oportunidades según el modelo de datos.
              </p>
            </div>

            <div className="settings-card">
              <h3 className="settings-card__title">Entidades del Dominio</h3>
              <ul className="settings-prop-list">
                <li><strong>Clientes / Productores:</strong> DNI/CUIT, Razón Social, Mail, Teléfonos, Tipo Cliente, Localidad, Código Postal.</li>
                <li><strong>Empresas Clientes:</strong> CUIT, Nombre Empresa, Dirección, Proveedor Actual, Superficie (ha), Tipo Empresa.</li>
                <li><strong>Oportunidades Comerciales:</strong> Estado (Lead, Prospecto, Negociación, Activo, Inactivo, Perdido), Potencialidad, Volumen Potencial ($), Volumen Facturado ($).</li>
                <li><strong>Formularios de Actividad:</strong> Tipo Contacto (Visita, Llamada, Email), Descripción, Monto Venta, Fecha/Hora, Vendedor.</li>
              </ul>
            </div>
          </div>
        )}

        {activeSection === 'integraciones' && (
          <div className="settings-section">
            <div className="settings-section__header">
              <h1 className="settings-section__title">Integraciones</h1>
              <p className="settings-section__subtitle">
                Conexión con servicios externos y APIs.
              </p>
            </div>

            <div className="settings-card">
              <div className="settings-toggle-row">
                <div>
                  <div className="settings-toggle-title">Backend API AgroRos</div>
                  <div className="settings-toggle-desc">Conexión con el servidor Node.js/Sequelize en localhost:3000</div>
                </div>
                <span className="settings-role-badge admin">Conectado</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
