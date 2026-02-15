import { request } from './client';

// GET /v1/point/available → { available_point: number }
export const fetchAvailablePoint = async () => {
  return request('/v1/point/available', { method: 'GET' });
};

// GET /v1/point/history → { guest_point_items, has_more, next_cursor }
export const fetchPointHistory = async ({ nextCursor, size = 20 } = {}) => {
  const params = new URLSearchParams();
  if (size) params.append('size', String(size));
  if (nextCursor) params.append('next_cursor', nextCursor);
  const qs = params.toString();
  return request(`/v1/point/history${qs ? `?${qs}` : ''}`, { method: 'GET' });
};


