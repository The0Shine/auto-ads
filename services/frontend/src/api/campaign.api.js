import api from './axios';

export const campaignAPI = {
  // Campaigns
  list: (params) => api.get('/campaigns', { params }),
  get: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  remove: (id) => api.delete(`/campaigns/${id}`),
  distribute: (id) => api.post(`/campaigns/${id}/distribute`),
  pause: (id) => api.post(`/campaigns/${id}/pause`),
  resume: (id) => api.post(`/campaigns/${id}/resume`),
  status: (id) => api.get(`/campaigns/${id}/status`),

  // Ad Sets
  listAdSets: (campaignId) => api.get(`/campaigns/${campaignId}/ad-sets`),
  createAdSet: (campaignId, data) => api.post(`/campaigns/${campaignId}/ad-sets`, data),
  updateAdSet: (campaignId, adSetId, data) => api.put(`/campaigns/${campaignId}/ad-sets/${adSetId}`, data),
  removeAdSet: (campaignId, adSetId) => api.delete(`/campaigns/${campaignId}/ad-sets/${adSetId}`),

  // Creatives
  listCreatives: (params) => api.get('/creatives', { params }),
  getCreative: (id) => api.get(`/creatives/${id}`),
  createCreative: (data) => api.post('/creatives', data),
  updateCreative: (id, data) => api.put(`/creatives/${id}`, data),
  removeCreative: (id) => api.delete(`/creatives/${id}`),
};
