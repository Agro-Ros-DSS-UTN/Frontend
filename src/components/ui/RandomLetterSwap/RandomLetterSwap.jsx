import React from 'react';

export const RandomLetterSwap = ({
  label,
  className = '',
  children
}) => {
  return (
    <span
      className={`random-letter-swap ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
    >
      {children}
      <span>{label}</span>
    </span>
  );
};

export default RandomLetterSwap;