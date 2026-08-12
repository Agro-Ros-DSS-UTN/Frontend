/* eslint-disable */
import React from 'react';
import logoImg from '../../assets/logo.png';

/**
 * Logo oficial para el Header del Login (Lado Izquierdo)
 * Recuadro oscuro con el isotipo oficial AR y texto "Agroquímica Rosario CRM"
 */
export const ArLogoHeader = () => {
  return (
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
      <img 
        src={logoImg} 
        alt="AR Logo" 
        style={{ 
          height: '38px', 
          width: 'auto', 
          objectFit: 'contain'
        }} 
      />
      
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
 * Con tamaño destacado e imponente sobre el fondo
 */
export const ArLogoRight = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.6))'
    }}>
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
