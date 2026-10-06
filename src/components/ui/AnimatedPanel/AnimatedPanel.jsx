import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import './AnimatedPanel.css';

// Shell animado compartido para los submenús tipo dropdown de la app (menú
// de usuario, Centro de Ayuda, etc.) — mismo framer-motion (stagger de
// entrada + spring por ítem) que `UserProfileSidebar`, extraído para que
// cualquier otro panel "consuma el mismo componente" en vez de reimplementar
// la animación o el estilo de tarjeta cada vez.
export const panelVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

export const panelItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 },
  },
};

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
