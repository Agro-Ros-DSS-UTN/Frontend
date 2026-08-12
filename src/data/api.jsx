/* eslint-disable */
// src/data/api.jsx

const API_BASE_URL = 'http://localhost:3000';

export const loginUser = async (credentials) => {
  // credentials: { id, password }
  const response = await fetch(`${API_BASE_URL}/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error al iniciar sesión');
  }

  return data;
};