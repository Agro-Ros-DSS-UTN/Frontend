/**
 * Primitiva y contexto base para iconos animados interactivos.
 *
 * Provee la infraestructura de estado y contexto para orquestar animaciones
 * entre componentes SVG vectoriales y sus contenedores interactivos, gestionando
 * transiciones al pasar el cursor o de forma forzada por componentes padre.
 */

import { createContext, useContext, useState } from 'react';

// Primitiva mínima equivalente a `@/components/animate-ui/icons/icon` (de la
// librería animate-ui que pasó el usuario) — ese archivo no vino incluido en
// el snippet pegado, así que se reimplementa acá lo justo y necesario:
// contexto de controles de animación + wrapper que dispara "animate" cuando
// se hace hover (propio del ícono, o forzado desde afuera con `forceAnimate`
// cuando el hover real es el del botón contenedor, no el del ícono).

/**
 * Contexto de React que propaga el estado actual de animación ('initial' o 'animate')
 * hacia los elementos SVG hijos.
 */
const AnimateIconContext = createContext({ controls: 'initial' });

/**
 * Hook para consumir los controles de animación del contexto en el icono SVG hijo.
 *
 * @returns {{ controls: 'initial'|'animate' }} Objeto con el estado de control de animación
 */
export const useAnimateIconContext = () => useContext(AnimateIconContext);

/**
 * Función selectora que retorna las variantes predeterminadas del objeto de animaciones provisto.
 *
 * @param {Object} animations - Diccionario con conjuntos de animaciones
 * @returns {Object} Variantes 'default'
 */
export const getVariants = (animations) => animations.default;

/**
 * Contenedor `IconWrapper`.
 *
 * Envuelve el componente del icono en un `<span>` interactivo y provee el `AnimateIconContext.Provider`.
 * Detecta eventos de entrada/salida del ratón (hover) y permite anulación forzada mediante `forceAnimate`.
 *
 * @param {Object} props
 * @param {React.Component} props.icon - Componente de icono a renderizar
 * @param {boolean} [props.animateOnHover=true] - Activa la animación al hacer hover sobre el icono
 * @param {boolean} [props.forceAnimate] - Estado forzado desde el exterior (ej. hover sobre botón padre)
 * @param {number} [props.size=24] - Dimensión en píxeles
 */
export const IconWrapper = ({ icon: Icon, animateOnHover = true, forceAnimate, size = 24, ...props }) => {
  // Estado local para registrar si el cursor está sobre el elemento
  const [hovered, setHovered] = useState(false);

  // Determina si los controles deben indicar 'animate' o 'initial', priorizando `forceAnimate` si fue especificado
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
