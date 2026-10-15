// Botonera de encabezado de página (acción principal + export), con el
// estilo "pill" redondeado que se usa en Hojas de Ruta — reutilizable para
// no depender de que cada página recuerde las clases CSS correctas.
export const PageHeaderActions = ({ children }) => (
  <div className="crm-page-header-actions">{children}</div>
);

export const PrimaryActionButton = ({ icon: Icon, children, iconSize = 16, ...rest }) => (
  <button type="button" className="crm-btn-primary" {...rest}>
    {Icon && <Icon size={iconSize} />}
    <span>{children}</span>
  </button>
);

export const ExportActionButton = ({ icon: Icon, children, iconSize = 15, className = '', ...rest }) => (
  <button type="button" className={`crm-btn-export ${className}`.trim()} {...rest}>
    {Icon && <Icon size={iconSize} />}
    <span>{children}</span>
  </button>
);

export default PageHeaderActions;
