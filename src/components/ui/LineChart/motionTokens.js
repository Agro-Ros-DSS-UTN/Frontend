/**
 * @file motionTokens.js
 * @description Definición de tokens de diseño para animación y transiciones cinéticas.
 * Contiene configuraciones de efectos de resorte (spring), duraciones estándar y curvas de aceleración (easing)
 * utilizadas para animar de forma consistente el gráfico de líneas y sus componentes interactivos.
 */

// Tiempos y curvas de animación del gráfico de líneas (en segundos).
export const motionTokens = {
  /**
   * Configuraciones de resorte físico (Spring physics)
   */
  spring: {
    // Transición suave y amortiguada sin rebote
    smooth: { visualDuration: 0.5, bounce: 0 },
    // Transición rápida y enérgica con un ligero rebote
    snappy: { visualDuration: 0.25, bounce: 0.1 },
  },

  /**
   * Duraciones fijas de transición expresadas en segundos
   */
  duration: {
    instant: 0.1,    // Transición casi inmediata (cambios de estado o hover rápidos)
    standard: 0.2,   // Duración estándar para transiciones de interfaz
    considered: 0.4, // Duración pausada para movimientos notorios o renderizado inicial
  },

  /**
   * Curvas de aceleración Bézier cúbicas personalizadas
   */
  ease: {
    standard: [0.2, 0, 0, 1],   // Curva fluida natural tipo ease-out moderna
    inOut: [0.65, 0, 0.35, 1],   // Curva simétrica para transiciones suaves de entrada y salida
  },
};

// Exportación por defecto de los tokens de animación
export default motionTokens;
