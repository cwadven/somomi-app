import { request } from './client';

// GET /v1/promotion/manage-tips
// Response: { manage_tips: [{ id, content_id, title }, ...] }
export const fetchManageTipsApi = async () => {
  return request('/v1/promotion/manage-tips', { method: 'GET' });
};

export default {
  fetchManageTipsApi,
};


