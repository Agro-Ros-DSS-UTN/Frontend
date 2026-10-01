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
      {Icon && <Icon className="ui-btn__icon" size={size === 'sm' ? 14 : (size === 'lg' ? 18 : 16)} />}
      <span>{children}</span>
      {IconRight && <IconRight className="ui-btn__icon ui-btn__icon--right" size={size === 'sm' ? 14 : (size === 'lg' ? 18 : 16)} />}
    </button>
  );
};

export default Button;
