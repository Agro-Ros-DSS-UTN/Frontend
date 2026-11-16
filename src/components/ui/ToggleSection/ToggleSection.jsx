/**
 * @file ToggleSection.jsx
 * @description Componente de interfaz de usuario que actúa como una sección colapsable / desplegable
 * controlada por una casilla de verificación (checkbox) destacada.
 * Permite al usuario activar u ocultar subformularios o bloques de configuración condicionales
 * de forma intuitiva, con títulos claros y textos de ayuda.
 */

import { CheckSquare } from 'lucide-react';
import './ToggleSection.css';

// Casilla grande con título y subtítulo que despliega un sub-formulario al tildarse.
// Usada en "Generar también tareas de seguimiento" (Actividades) y
// "Cargar la evaluación de servicio" (Órdenes de Servicio).
/**
 * Componente ToggleSection.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {boolean} props.checked - Estado booleano que indica si la sección está activada/abierta.
 * @param {Function} props.onChange - Callback invocado al alternar el estado, recibe el nuevo valor booleano.
 * @param {string} props.title - Título principal de la opción o sección.
 * @param {string} [props.subtitle] - Subtítulo o texto secundario descriptivo complementario.
 * @param {React.ReactNode} [props.children] - Contenido o campos de formulario que se revelan al marcar la casilla.
 * @returns {JSX.Element} Elemento JSX que renderiza la casilla y el contenido hijo.
 */
export const ToggleSection = ({ checked, onChange, title, subtitle, children }) => (
  /* Contenedor principal con clase dinámica 'is-open' cuando la casilla está marcada */
  <div className={`toggle-section ${checked ? 'is-open' : ''}`}>
    {/* Etiqueta clicable que envuelve el input nativo y los elementos visuales */}
    <label className="toggle-section__toggle">
      {/* Input de tipo checkbox nativo (accesible y controlado) */}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {/* Indicador visual personalizado del checkbox; muestra el ícono CheckSquare si está activo */}
      <span className="toggle-section__box">{checked && <CheckSquare size={13} strokeWidth={3} />}</span>
      {/* Contenedor de textos informativos */}
      <span>
        {/* Título en negrita */}
        <strong>{title}</strong>
        {/* Subtítulo aclaratorio opcional */}
        {subtitle && <span className="toggle-section__sub">{subtitle}</span>}
      </span>
    </label>
    {/* Renderizado de los elementos hijos (sub-formulario desplegable) */}
    {children}
  </div>
);

// Exportación por defecto del componente
export default ToggleSection;
