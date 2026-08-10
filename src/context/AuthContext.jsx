import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockUsers } from '../data/mockData';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = sessionStorage.getItem('agroros_user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('agroros_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('agroros_user');
    }
  }, [currentUser]);

  const login = (userId, password) => {
    // Login por ID:
    //   "1" = Vendedor
    //   "2" = Administrador
    if (userId === '1') {
      const sellerUser = {
        numDoc: '35123456',
        nombreApellido: 'Martín Gutiérrez',
        direccionMail: 'martin.gutierrez@agroros.com.ar',
        role: 'vendedor',
        antiguedad: 3,
        direccion: 'Calle San Martín 890, Casilda',
      };
      setCurrentUser(sellerUser);
      return { success: true, user: sellerUser };
    }

    if (userId === '2') {
      const adminUser = {
        numDoc: '30456789',
        nombreApellido: 'Manuel Fernández',
        direccionMail: 'manuel.fernandez@agroros.com.ar',
        role: 'admin',
        antiguedad: 8,
        direccion: 'Av. Pellegrini 1250, Rosario',
      };
      setCurrentUser(adminUser);
      return { success: true, user: adminUser };
    }

    // Si no es 1 ni 2, error
    return { success: false, error: 'ID inválido. Ingresá 1 (vendedor) o 2 (administrador).' };
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('agroros_user');
  };

  const isAuthenticated = !!currentUser;
  const isAdmin = currentUser?.role === 'admin';
  const isSeller = currentUser?.role === 'vendedor';

  return (
    <AuthContext.Provider value={{
      currentUser,
      login,
      logout,
      isAuthenticated,
      isAdmin,
      isSeller,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
