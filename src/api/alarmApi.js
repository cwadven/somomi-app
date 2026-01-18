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

// 특정 카테고리(게스트 섹션) 알림 설정 조회
// GET /v1/alarm/guest-section/{guest_section_id}
export const fetchGuestSectionAlarm = async (guest_section_id) => {
  return await request(`/v1/alarm/guest-section/${guest_section_id}`, { method: 'GET' });
};

// 특정 카테고리(게스트 섹션) 알림 설정 수정
// PUT /v1/alarm/guest-section/{guest_section_id}
export const updateGuestSectionAlarm = async (guest_section_id, body) => {
  return await request(`/v1/alarm/guest-section/${guest_section_id}`, {
    method: 'PUT',
    body,
  });
};

export default { fetchGuestAlarms };


