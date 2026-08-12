import React, { createContext, useContext, useState, useEffect } from 'react';

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

  const [profileImage, setProfileImageState] = useState(() => {
    return localStorage.getItem('agroros_profile_img') || null;
  });

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('agroros_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('agroros_user');
    }
  }, [currentUser]);

  const updateProfileImage = (imgData) => {
    setProfileImageState(imgData);
    if (imgData) {
      localStorage.setItem('agroros_profile_img', imgData);
    } else {
      localStorage.removeItem('agroros_profile_img');
    }
  };

  // El login "real" ya lo hizo el backend (loginUser en LoginPage.jsx).
  // Acá solo guardamos el usuario que ya vino autenticado.
  const login = (userData) => {
    setCurrentUser(userData);
    return { success: true, user: userData };
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
      profileImage,
      updateProfileImage,
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