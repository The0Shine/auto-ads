import api from './axios';

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};
