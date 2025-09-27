import { API_BASE_URL } from '../config/apiConfig';
import { loadJwtToken } from '../utils/storageUtils';

export const request = async (path, { method = 'GET', headers = {}, body } = {}) => {
  const token = await loadJwtToken();
  const reqHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...headers,
  };
  if (token && typeof token === 'string' && !reqHeaders.Authorization) {
    reqHeaders.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = json?.message || '요청에 실패했습니다.';
    const error = new Error(message);
    error.response = { status: res.status, data: json };
    throw error;
  }
  return json;
};

export default { request };


