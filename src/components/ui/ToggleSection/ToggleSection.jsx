import { CheckSquare } from 'lucide-react';
import './ToggleSection.css';

// Casilla grande con título y subtítulo que despliega un sub-formulario al tildarse.
// Usada en "Generar también tareas de seguimiento" (Actividades) y
// "Cargar la evaluación de servicio" (Órdenes de Servicio).
export const ToggleSection = ({ checked, onChange, title, subtitle, children }) => (
  <div className={`toggle-section ${checked ? 'is-open' : ''}`}>
    <label className="toggle-section__toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-section__box">{checked && <CheckSquare size={13} strokeWidth={3} />}</span>
      <span>
        <strong>{title}</strong>
        {subtitle && <span className="toggle-section__sub">{subtitle}</span>}
      </span>
    </label>
    {children}
  </div>
);

export default ToggleSection;
