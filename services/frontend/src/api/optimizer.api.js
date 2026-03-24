import api from './axios';

export const optimizerAPI = {
  health:  ()                  => api.get('/optimizer/health'),
  trigger: ()                  => api.post('/optimizer/trigger'),
  predict: (data)              => api.post('/optimizer/predict', data),
  history: (campaignId, limit = 50) => api.get(`/optimizer/history/${campaignId}`, { params: { limit } }),
  score:   (adSetId)           => api.get(`/optimizer/score/${adSetId}`),
  analyze: (campaignId, data)  => api.post(`/optimizer/analyze/${campaignId}`, data),
};
