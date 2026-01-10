import { request } from './client';

// GET /v1/promotion/manage-tips
// Response: { manage_tips: [{ id, content_id, title }, ...] }
export const fetchManageTipsApi = async () => {
  return request('/v1/promotion/manage-tips', { method: 'GET' });
};

// GET /v1/promotion/banners?target_layer=HOME_TOP&page=1&size=10
export const fetchPromotionBannersApi = async ({ target_layer = 'HOME_TOP', page = 1, size = 10 } = {}) => {
  if (!target_layer) throw new Error('target_layer is required');
  const qs = new URLSearchParams();
  qs.set('target_layer', String(target_layer));
  if (page != null) qs.set('page', String(page));
  if (size != null) qs.set('size', String(size));
  return request(`/v1/promotion/banners?${qs.toString()}`, { method: 'GET', skipAuth: true });
};

export default {
  fetchManageTipsApi,
  fetchPromotionBannersApi,
};


