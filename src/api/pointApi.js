import { request } from './client';

// GET /v1/point/available → { available_point: number }
export const fetchAvailablePoint = async () => {
  return request('/v1/point/available', { method: 'GET' });
};

export default { fetchAvailablePoint };


