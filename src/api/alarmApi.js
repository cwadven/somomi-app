import { request } from './client';

// 게스트 알람 정보 조회 API
// GET /v1/alarm/guest
export const fetchGuestAlarms = async () => {
  return await request('/v1/alarm/guest', { method: 'GET' });
};

// 게스트 알림 히스토리 조회 API
// GET /v1/alarm/history
export const fetchGuestAlarmHistory = async () => {
  return await request('/v1/alarm/guest/history', { method: 'GET' });
};

export default { fetchGuestAlarms };


