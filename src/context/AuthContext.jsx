import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper to normalize user object from backend (handling 'administrador' / 'admin' and 'vendedor')
const normalizeUser = (user) => {
  if (!user) return null;
  const rawRole = user.role || user.rol || user.tipoUsuario || '';
  let role = String(rawRole).trim().toLowerCase();
  if (role === 'administrador') {
    role = 'admin';
  }
  return {
    ...user,
    role,
    rol: role,
  };
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('agroros_user');
      return stored ? normalizeUser(JSON.parse(stored)) : null;
    } catch {
      return null;
    }
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

  // Login action storing the backend-authenticated user
  const login = (userData) => {
    const normalized = normalizeUser(userData);
    setCurrentUser(normalized);
    return { success: true, user: normalized };
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('agroros_user');
  };

  const isAuthenticated = !!currentUser;
  const userRole = (currentUser?.role || currentUser?.rol || '').toLowerCase();
  const isAdmin = userRole === 'admin';
  const isSeller = userRole === 'vendedor';

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