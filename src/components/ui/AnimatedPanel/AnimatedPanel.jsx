/**
 * Componentes de panel y elementos animados con Framer Motion.
 *
 * Ofrece un contenedor estilizado (`AnimatedPanel`) y elementos hijos (`AnimatedPanelItem`)
 * con transiciones fluidas de entrada en cascada (stagger) y física de resorte (spring),
 * utilizados comúnmente en menús desplegables, barras laterales y paneles flotantes de la app.
 */

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import './AnimatedPanel.css';

// Shell animado compartido para los submenús tipo dropdown de la app (menú
// de usuario, Centro de Ayuda, etc.) — mismo framer-motion (stagger de
// entrada + spring por ítem) que `UserProfileSidebar`, extraído para que
// cualquier otro panel "consuma el mismo componente" en vez de reimplementar
// la animación o el estilo de tarjeta cada vez.

/**
 * Variantes de animación para el contenedor del panel.
 * Coordina la aparición con opacidad y desfase temporal entre hijos (staggerChildren).
 */
export const panelVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

/**
 * Variantes de animación para cada ítem individual dentro del panel.
 * Desplaza el ítem desde la izquierda (-20px) con desvanecimiento y efecto spring.
 */
export const panelItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 },
  },
};

/**
 * Contenedor principal `AnimatedPanel`.
 *
 * Renderiza una etiqueta semántica `<motion.aside>` animada que soporta reenvío de referencias (`ref`).
 *
 * @param {Object} props
 * @param {string} [props.className=''] - Clases CSS adicionales
 * @param {React.ReactNode} props.children - Elementos hijos contenidos en el panel
 * @param {React.Ref} ref - Referencia al nodo DOM del aside
 */
export const AnimatedPanel = forwardRef(({ className = '', children, ...rest }, ref) => (
  <motion.aside
    ref={ref}
    className={`animated-panel ${className}`.trim()}
    initial="hidden"
    animate="visible"
    variants={panelVariants}
    {...rest}
  >
    {children}
  </motion.aside>
));
AnimatedPanel.displayName = 'AnimatedPanel';

/**
 * Elemento hijo animado `AnimatedPanelItem`.
 *
 * Aplica la animación escalonada al elemento hijo. Resuelve dinámicamente
 * la etiqueta HTML especificada en la prop `as` a su correspondiente componente de Framer Motion.
 *
 * @param {Object} props
 * @param {string|React.Component} [props.as='div'] - Etiqueta HTML (ej: 'div', 'button', 'a') o componente motion
 * @param {string} [props.className=''] - Clases CSS adicionales
 * @param {React.ReactNode} props.children - Contenido del ítem
 */
export const AnimatedPanelItem = ({ as = 'div', className = '', children, ...rest }) => {
  // `as` puede ser un tag string ("a", "button"...) o un componente motion.*
  // ya armado — para tags string hace falta resolver al equivalente
  // `motion.<tag>`, si no framer-motion no entiende la prop `variants`.
  const Component = typeof as === 'string' ? motion[as] : as;
  return (
    <Component variants={panelItemVariants} className={className} {...rest}>
      {children}
    </Component>
  );
};

export default AnimatedPanel;
