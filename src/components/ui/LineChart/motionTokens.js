// Tiempos y curvas de animación del gráfico de líneas (en segundos).
export const motionTokens = {
  spring: {
    smooth: { visualDuration: 0.5, bounce: 0 },
    snappy: { visualDuration: 0.25, bounce: 0.1 },
  },
  duration: {
    instant: 0.1,
    standard: 0.2,
    considered: 0.4,
  },
  ease: {
    standard: [0.2, 0, 0, 1],
    inOut: [0.65, 0, 0.35, 1],
  },
};

export default motionTokens;
