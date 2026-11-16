/**
 * @file RandomLetterSwap.jsx
 * @description Componente de presentación para renderizar etiquetas y elementos adyacentes
 * (como iconos, insignias o animaciones) alineados de manera uniforme en línea sin quiebre de texto.
 */

import React from 'react';

/**
 * Componente que renderiza una etiqueta acompañada de elementos hijos en disposición horizontal (inline-flex).
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {string} props.label - Texto de la etiqueta que se mostrará junto a los elementos hijos.
 * @param {string} [props.className=''] - Clases CSS adicionales para personalizar estilos o animaciones.
 * @param {React.ReactNode} [props.children] - Elementos visuales opcionales (por ejemplo un icono o badge) que anteceden a la etiqueta.
 */
export const RandomLetterSwap = ({
  label,
  className = '',
  children
}) => {
  return (
    /* Contenedor inline-flex con alineación centrada y sin salto de línea */
    <span
      className={`random-letter-swap ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
    >
      {/* Elementos secundarios o iconos complementarios */}
      {children}
      {/* Texto descriptivo de la etiqueta */}
      <span>{label}</span>
    </span>
  );
};

export default RandomLetterSwap;
