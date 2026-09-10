import { apiClient } from './apiClient';

export const tasksApi = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/tasks', { params });
    return response.data;
  },
  create: async (data) => {
    const response = await apiClient.post('/tasks', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await apiClient.put(`/tasks/${id}`, data);
    return response.data;
  },
  updateStatus: async (id, estado) => {
    const response = await apiClient.patch(`/tasks/${id}/status`, { estado });
    return response.data;
  },
  delete: async (id) => {
    const response = await apiClient.delete(`/tasks/${id}`);
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
  },
  delete: async (id) => {
    const response = await apiClient.delete(`/formulario-actividad/${id}`);
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
  },
  updateStopStatus: async (stopId, estadoParada) => {
    const response = await apiClient.patch(`/roadmaps/stops/${stopId}/status`, { estadoParada });
    return response.data;
  },
  delete: async (id) => {
    const response = await apiClient.delete(`/roadmaps/${id}`);
    return response.data;
  }
};

export const objectivesApi = {
  getAll: async () => {
    const response = await apiClient.get('/objectives');
    return response.data;
  },
  getBySeller: async (sellerId) => {
    const response = await apiClient.get(`/objectives/seller/${sellerId}`);
    return response.data;
  },
  create: async (data) => {
    const response = await apiClient.post('/objectives', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await apiClient.patch(`/objectives/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await apiClient.delete(`/objectives/${id}`);
    return response.data;
  }
};

export const promotionsApi = {
  getAll: async () => {
    const response = await apiClient.get('/promotions');
    return response.data;
  },
  create: async (data) => {
    const response = await apiClient.post('/promotions', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await apiClient.put(`/promotions/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await apiClient.delete(`/promotions/${id}`);
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
