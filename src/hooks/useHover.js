import { useState } from 'react';

// Hover tracking reutilizable — usado para disparar la animación del ícono
// de logout cuando se hace hover sobre el BOTÓN que lo contiene, no solo
// sobre el ícono en sí.
export const useHover = () => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverProps = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };
  return [hoverProps, isHovered];
};

export default useHover;
