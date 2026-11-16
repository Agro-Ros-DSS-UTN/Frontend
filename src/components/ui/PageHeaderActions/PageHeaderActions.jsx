/**
 * @file PageHeaderActions.jsx
 * @description Componentes de interfaz de usuario para estandarizar las botoneras y barras de acciones
 * en los encabezados de las páginas del CRM (por ejemplo en Hojas de Ruta, Clientes o Tareas).
 * Proporciona un contenedor estructurado y botones estilizados ("pill" redondeado) para acciones
 * primarias (creación, confirmación) y secundarias (exportación a PDF/Excel/CSV).
 */

// Botonera de encabezado de página (acción principal + export), con el
// estilo "pill" redondeado que se usa en Hojas de Ruta — reutilizable para
// no depender de que cada página recuerde las clases CSS correctas.

/**
 * Contenedor flexible que alinea y agrupa las acciones situadas en la cabecera de una página.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Elementos o botones que componen la botonera.
 */
export const PageHeaderActions = ({ children }) => (
  /* Contenedor flex con estilos homogéneos para la cabecera del CRM */
  <div className="crm-page-header-actions">{children}</div>
);

/**
 * Botón destacado para la acción principal de la pantalla (ej. "Nuevo", "Guardar", "Crear").
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {React.ComponentType} [props.icon] - Componente de icono opcional (ej. de lucide-react).
 * @param {React.ReactNode} props.children - Texto o contenido interno del botón.
 * @param {number} [props.iconSize=16] - Tamaño en píxeles del icono renderizado.
 * @param {Object} [props.rest] - Demás propiedades HTML estándar aplicables a un <button>.
 */
export const PrimaryActionButton = ({ icon: Icon, children, iconSize = 16, ...rest }) => (
  <button type="button" className="crm-btn-primary" {...rest}>
    {/* Renderizado condicional del icono principal si se suministró */}
    {Icon && <Icon size={iconSize} />}
    <span>{children}</span>
  </button>
);

/**
 * Botón secundario diseñado específicamente para tareas de exportación de datos o acciones complementarias.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {React.ComponentType} [props.icon] - Componente de icono opcional.
 * @param {React.ReactNode} props.children - Texto descriptivo del botón.
 * @param {number} [props.iconSize=15] - Tamaño del icono en píxeles.
 * @param {string} [props.className=''] - Clases CSS complementarias para extender los estilos.
 * @param {Object} [props.rest] - Demás propiedades nativas del elemento botón.
 */
export const ExportActionButton = ({ icon: Icon, children, iconSize = 15, className = '', ...rest }) => (
  <button type="button" className={`crm-btn-export ${className}`.trim()} {...rest}>
    {/* Icono de exportación opcional */}
    {Icon && <Icon size={iconSize} />}
    <span>{children}</span>
  </button>
);

export default PageHeaderActions;
