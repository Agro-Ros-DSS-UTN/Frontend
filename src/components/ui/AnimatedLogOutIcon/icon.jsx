import { createContext, useContext, useState } from 'react';

// Primitiva mínima equivalente a `@/components/animate-ui/icons/icon` (de la
// librería animate-ui que pasó el usuario) — ese archivo no vino incluido en
// el snippet pegado, así que se reimplementa acá lo justo y necesario:
// contexto de controles de animación + wrapper que dispara "animate" cuando
// se hace hover (propio del ícono, o forzado desde afuera con `forceAnimate`
// cuando el hover real es el del botón contenedor, no el del ícono).
const AnimateIconContext = createContext({ controls: 'initial' });

export const useAnimateIconContext = () => useContext(AnimateIconContext);

export const getVariants = (animations) => animations.default;

export const IconWrapper = ({ icon: Icon, animateOnHover = true, forceAnimate, size = 24, ...props }) => {
  const [hovered, setHovered] = useState(false);
  const controls = forceAnimate !== undefined ? (forceAnimate ? 'animate' : 'initial') : hovered ? 'animate' : 'initial';

  return (
    <AnimateIconContext.Provider value={{ controls }}>
      <span
        style={{ display: 'inline-flex', lineHeight: 0 }}
        onMouseEnter={animateOnHover && forceAnimate === undefined ? () => setHovered(true) : undefined}
        onMouseLeave={animateOnHover && forceAnimate === undefined ? () => setHovered(false) : undefined}
      >
        <Icon size={size} {...props} />
      </span>
    </AnimateIconContext.Provider>
  );
};
