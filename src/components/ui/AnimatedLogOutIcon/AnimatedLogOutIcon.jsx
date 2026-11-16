/**
 * Componente interactivo de icono de cierre de sesión (Log Out) animado.
 *
 * Utiliza Framer Motion para animar la flecha de salida al interactuar o pasar el cursor (hover).
 * Soporta control de animación autónomo por hover sobre el propio icono, o controlado
 * externamente a través de la propiedad `forceAnimate` (por ejemplo, al hacer hover
 * sobre el botón o contenedor padre).
 */

import { motion } from 'framer-motion';
import { getVariants, useAnimateIconContext, IconWrapper } from './icon';

// Puerto directo del componente LogOut de animate-ui que pasó el usuario
// (framer-motion real, misma estructura de variants) — única adaptación:
// `@/components/animate-ui/icons/icon` no vino en el snippet pegado, así que
// se reimplementó esa primitiva en `./icon.jsx`; y `forceAnimate` permite que
// el hover de un BOTÓN contenedor (no solo el del ícono) dispare la animación.

/**
 * Diccionario de variantes de animación de Framer Motion.
 * Define la animación de desplazamiento suave sobre el eje X para la flecha de salida.
 */
const animations = {
  default: {
    group: {
      initial: { x: 0, transition: { duration: 0.3, ease: 'easeInOut' } },
      animate: { x: 2, transition: { duration: 0.3, ease: 'easeInOut' } },
    },
    path1: {},
    path2: {},
    path3: {},
  },
  'default-loop': {
    group: {
      initial: { x: 0 },
      animate: { x: [0, 2, 0], transition: { duration: 0.6, ease: 'easeInOut' } },
    },
    path1: {},
    path2: {},
    path3: {},
  },
};

/**
 * Componente interno que renderiza el gráfico SVG animado.
 *
 * Se suscribe a los controles provistos por el contexto (`useAnimateIconContext`)
 * para sincronizar los estados 'initial' y 'animate' en cada elemento del trazado.
 *
 * @param {Object} props
 * @param {number|string} [props.size] - Tamaño en píxeles del icono
 */
function IconComponent({ size, ...props }) {
  // Obtiene los controles de animación activos desde el contexto
  const { controls } = useAnimateIconContext();
  // Obtiene la variante de animación predeterminada
  const variants = getVariants(animations);

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Grupo móvil: punta de la flecha y línea horizontal que se desplazan hacia la derecha */}
      <motion.g variants={variants.group} initial="initial" animate={controls}>
        <motion.path d="m16 17 5-5-5-5" variants={variants.path1} initial="initial" animate={controls} />
        <motion.path d="M21 12H9" variants={variants.path2} initial="initial" animate={controls} />
      </motion.g>
      {/* Marco estático: silueta de la puerta/cerradura */}
      <motion.path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" variants={variants.path3} initial="initial" animate={controls} />
    </motion.svg>
  );
}

/**
 * Componente exportado `AnimatedLogOutIcon`.
 *
 * Envuelve `IconComponent` con el contenedor `IconWrapper` para proveer
 * detección de eventos de mouse y manejo de estado.
 */
export const AnimatedLogOutIcon = (props) => <IconWrapper icon={IconComponent} {...props} />;

export default AnimatedLogOutIcon;
