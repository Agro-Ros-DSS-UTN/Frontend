import React, { useState, useRef, useEffect } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export const RandomLetterSwap = ({
  label,
  className = '',
  children
}) => {
  const [displayText, setDisplayText] = useState(label);
  const intervalRef = useRef(null);

  const startAnimation = () => {
    if (!label) return;
    let iteration = 0;
    clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText(
        label
          .split('')
          .map((char, index) => {
            if (char === ' ' || char === '+' || char === '•') return char;
            if (index < iteration) {
              return label[index];
            }
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join('')
      );

      if (iteration >= label.length) {
        clearInterval(intervalRef.current);
      }

      iteration += 1 / 2;
    }, 25);
  };

  const stopAnimation = () => {
    clearInterval(intervalRef.current);
    if (label) setDisplayText(label);
  };

  useEffect(() => {
    if (label) setDisplayText(label);
    return () => clearInterval(intervalRef.current);
  }, [label]);

  return (
    <span
      className={`random-letter-swap ${className}`}
      onMouseEnter={startAnimation}
      onMouseLeave={stopAnimation}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
    >
      {children}
      <span>{displayText || label}</span>
    </span>
  );
};

export default RandomLetterSwap;