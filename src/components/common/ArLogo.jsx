/* eslint-disable */
/**
 * Módulo: ArLogo
 * 
 * Provee componentes visuales con las variantes oficiales del logotipo e isotipo institucional
 * de Agroquímica Rosario, utilizados principalmente en las pantallas de inicio de sesión y cabeceras.
 */

import logoImg from '../../assets/logo.png';

/**
 * Logo oficial para el Header del Login (Lado Izquierdo)
 * Renderiza un recuadro oscuro con el isotipo oficial AR y la tipografía "Agroquímica Rosario CRM".
 * 
 * @returns {JSX.Element} Contenedor con logo y texto institucional
 */
export const ArLogoHeader = () => {
  return (
    // Contenedor principal con fondo oscuro y bordes redondeados
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '12px',
      backgroundColor: '#000000',
      padding: '8px 16px 8px 12px',
      borderRadius: '4px',
      color: '#ffffff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    }}>
      {/* Imagen del isotipo oficial de la empresa */}
      <img 
        src={logoImg} 
        alt="AR Logo" 
        style={{ 
          height: '38px', 
          width: 'auto', 
          objectFit: 'contain'
        }} 
      />
      
      {/* Bloque tipográfico con nombre de la empresa y denominación del sistema CRM */}
      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: '1.1' }}>
        <span style={{ 
          fontSize: '14px', 
          fontWeight: '800', 
          letterSpacing: '-0.2px', 
          color: '#ffffff',
          fontFamily: 'Plus Jakarta Sans, sans-serif' 
        }}>
          Agroquímica Rosario
        </span>
        <span style={{ 
          fontSize: '12px', 
          fontWeight: '700', 
          color: '#ffffff', 
          letterSpacing: '1px' 
        }}>
          CRM
        </span>
      </div>
    </div>
  );
};

/**
 * Logo oficial para el Banner Derecho (Sobre el atardecer)
 * Con tamaño destacado e imponente sobre el fondo, aplicando sombra para legibilidad.
 * 
 * @returns {JSX.Element} Isotipo de gran formato con filtro de sombra
 */
export const ArLogoRight = () => {
  return (
    // Contenedor con alineación hacia la derecha y filtro de sombra profunda
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.6))'
    }}>
      {/* Isotipo en alta resolución dimensionado para el banner lateral */}
      <img 
        src={logoImg} 
        alt="Agroquímica Rosario S.A." 
        style={{ 
          height: '135px', 
          width: 'auto', 
          objectFit: 'contain'
        }} 
      />
    </div>
  );
};
