import { apiClient } from './apiClient';

export const tasksApi = {
  getAll: async () => {
    const response = await apiClient.get('/tasks');
    return response.data;
  },
  create: async (data) => {
    const response = await apiClient.post('/tasks', data);
    return response.data;
  },
  updateStatus: async (id, estado) => {
    const response = await apiClient.patch(`/tasks/${id}/status`, { estado });
    return response.data;
  }
};

export const activitiesApi = {
  getAll: async () => {
    const response = await apiClient.get('/formulario-actividad');
    return response.data;
  },
  create: async (data) => {
    const response = await apiClient.post('/formulario-actividad', data);
    return response.data;
  }
};

export const roadmapsApi = {
  getAll: async () => {
    const response = await apiClient.get('/roadmaps');
    return response.data;
  },
  getBySeller: async (sellerId) => {
    const response = await apiClient.get(`/roadmaps/seller/${sellerId}`);
    return response.data;
  },
  create: async (data) => {
    const response = await apiClient.post('/roadmaps', data);
    return response.data;
  }
};

export const notesApi = {
  getAll: async () => {
    const response = await apiClient.get('/internal-notes');
    return response.data;
  },
  create: async (data) => {
    const response = await apiClient.post('/internal-notes', data);
    return response.data;
  }
};
