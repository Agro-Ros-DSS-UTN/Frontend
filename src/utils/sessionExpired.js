// Puente simple entre el código fuera de React (apiClient, data/api.jsx) y
// AuthContext, para poder disparar la pantalla bloqueante de "sesión
// expirada" desde cualquier petición HTTP que devuelva 401/403.
let handler = null;

export const setSessionExpiredHandler = (fn) => {
  handler = fn;
};

export const triggerSessionExpired = () => {
  if (handler) handler();
};
