/**
 * @file useHover.js
 * @description Hook personalizado de React para rastrear el estado de hover (cursor posicionado)
 * sobre cualquier elemento del DOM de manera reutilizable.
 *
 * Caso de uso principal:
 * Permite disparar animaciones secundarias o cambios de estado condicionales cuando el usuario
 * interactúa con un contenedor padre (por ejemplo, animar el ícono de logout al pasar el cursor
 * sobre el botón contenedor completo, y no únicamente sobre el área restringida del ícono).
 */

import { useState } from 'react';

/**
 * Hook que gestiona el estado de hover mediante listeners de eventos del ratón.
 *
 * @returns {[Object, boolean]} Tupla compuesta por:
 *  - `hoverProps`: Objeto con las propiedades `onMouseEnter` y `onMouseLeave` para desestructurar en el elemento JSX objetivo.
 *  - `isHovered`: Booleano que indica si el elemento se encuentra actualmente con el cursor encima.
 *
 * @example
 * const [hoverProps, isHovered] = useHover();
 * return (
 *   <button {...hoverProps}>
 *     <AnimatedIcon active={isHovered} />
 *   </button>
 * );
 */
export const useHover = () => {
  // Estado que almacena si el elemento está actualmente en hover
  const [isHovered, setIsHovered] = useState(false);

  // Manejadores de eventos del ratón para propagar en el elemento deseado
  const hoverProps = {
    // Se activa cuando el puntero ingresa a los límites del elemento
    onMouseEnter: () => setIsHovered(true),
    // Se desactiva cuando el puntero sale de los límites del elemento
    onMouseLeave: () => setIsHovered(false),
  };

  return [hoverProps, isHovered];
};

export default useHover;
