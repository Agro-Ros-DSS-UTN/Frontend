/**
 * Componente de botón genérico y reutilizable para el sistema de diseño.
 *
 * Implementa las variantes y tamaños estándar inspirados en shadcn/ui.
 * Admite iconos a la izquierda y a la derecha, control de estado deshabilitado
 * y propagación de atributos HTML estándar sobre la etiqueta `<button>`.
 */

import React from 'react';
import './Button.css';

/**
 * Modern Button component matching shadcn/ui variants and design specs:
 * - primary: brand solid, subtle shadow, sleek hover
 * - outline: input border, crisp background hover
 * - secondary: subtle gray background
 * - ghost: transparent hover
 * - destructive: error red
 */

/**
 * Componente `Button`.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Texto o contenido interno del botón
 * @param {'primary'|'outline'|'secondary'|'ghost'|'destructive'} [props.variant='primary'] - Variante estética visual
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Tamaño del botón (afecta padding, tipografía e iconos)
 * @param {'button'|'submit'|'reset'} [props.type='button'] - Tipo de botón HTML
 * @param {string} [props.className=''] - Clases CSS adicionales
 * @param {boolean} [props.disabled=false] - Indica si el botón se encuentra deshabilitado
 * @param {Function} [props.onClick] - Manejador del evento clic
 * @param {React.Component} [props.icon] - Componente de icono a la izquierda
 * @param {React.Component} [props.iconRight] - Componente de icono a la derecha
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  disabled = false,
  onClick,
  icon: Icon,
  iconRight: IconRight,
  ...props
}) => {
  // Composición de clases CSS basadas en variante, tamaño y clases personalizadas
  const classes = [
    'ui-btn',
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {/* Icono opcional a la izquierda, adaptando su tamaño en píxeles al tamaño del botón */}
      {Icon && <Icon className="ui-btn__icon" size={size === 'sm' ? 14 : (size === 'lg' ? 18 : 16)} />}
      <span>{children}</span>
      {/* Icono opcional a la derecha */}
      {IconRight && <IconRight className="ui-btn__icon ui-btn__icon--right" size={size === 'sm' ? 14 : (size === 'lg' ? 18 : 16)} />}
    </button>
  );
};

export default Button;
