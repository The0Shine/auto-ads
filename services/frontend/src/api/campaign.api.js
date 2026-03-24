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

  // Ads (within ad sets)
  listAds: (campaignId, adSetId) => api.get(`/campaigns/${campaignId}/ad-sets/${adSetId}/ads`),
  createAd: (campaignId, adSetId, data) => api.post(`/campaigns/${campaignId}/ad-sets/${adSetId}/ads`, data),
  removeAd: (campaignId, adSetId, adId) => api.delete(`/campaigns/${campaignId}/ad-sets/${adSetId}/ads/${adId}`),

  // Insights
  insights: (id) => api.get(`/campaigns/${id}/insights`),

  // Creatives
  listCreatives: (params) => api.get('/creatives', { params }),
  getCreative: (id) => api.get(`/creatives/${id}`),
  createCreative: (data) => api.post('/creatives', data),
  updateCreative: (id, data) => api.put(`/creatives/${id}`, data),
  removeCreative: (id) => api.delete(`/creatives/${id}`),
  uploadCreativeFile: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/creatives/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Targeting
  searchInterests: (q, limit = 10) => api.get('/targeting/interests', { params: { q, limit } }),
  searchLocations: (q, type = 'city', limit = 10) => api.get('/targeting/locations', { params: { q, type, limit } }),
  listImages: () => api.get('/targeting/images'),
  uploadImage: (url, name) => api.post('/targeting/images', { url, name }),
};
