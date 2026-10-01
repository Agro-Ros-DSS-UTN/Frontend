import { motion } from 'framer-motion';
import { getVariants, useAnimateIconContext, IconWrapper } from './icon';

// Puerto directo del componente LogOut de animate-ui que pasó el usuario
// (framer-motion real, misma estructura de variants) — única adaptación:
// `@/components/animate-ui/icons/icon` no vino en el snippet pegado, así que
// se reimplementó esa primitiva en `./icon.jsx`; y `forceAnimate` permite que
// el hover de un BOTÓN contenedor (no solo el del ícono) dispare la animación.
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

function IconComponent({ size, ...props }) {
  const { controls } = useAnimateIconContext();
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
      <motion.g variants={variants.group} initial="initial" animate={controls}>
        <motion.path d="m16 17 5-5-5-5" variants={variants.path1} initial="initial" animate={controls} />
        <motion.path d="M21 12H9" variants={variants.path2} initial="initial" animate={controls} />
      </motion.g>
      <motion.path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" variants={variants.path3} initial="initial" animate={controls} />
    </motion.svg>
  );
}

export const AnimatedLogOutIcon = (props) => <IconWrapper icon={IconComponent} {...props} />;

export default AnimatedLogOutIcon;
