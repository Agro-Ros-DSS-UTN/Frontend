import React, { useState } from 'react';
import { LoginPage } from './pages/auth/LoginPage';
import './styles/global.css';

export function App() {
  const [currentUser, setCurrentUser] = useState(null);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    alert(`¡Bienvenido al CRM de Agroquímica Rosario! Sesión iniciada como ID: ${user.userId}`);
  };

  return (
    <div className="app">
      {!currentUser ? (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <h2>Bienvenido al Dashboard de Agroquímica Rosario</h2>
          <p>Has iniciado sesión con el ID: <strong>{currentUser.userId}</strong></p>
          <button 
            onClick={() => setCurrentUser(null)}
            style={{
              marginTop: '1.5rem',
              padding: '0.6rem 1.2rem',
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
