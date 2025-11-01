import { request } from './client';

// 디바이스 토큰 등록/갱신
// POST /v1/push/device-token { token, device_type }
export const registerDeviceToken = async ({ token, deviceType }) => {
  if (!token) throw new Error('token is required');
  const device_type = deviceType === 'ios' || deviceType === 'android' ? deviceType : 'android';
  return await request('/v1/push/device-token', {
    method: 'POST',
    body: { token, device_type },
  });
};

// 디바이스 토큰 비활성화
// DELETE /v1/push/device-token { token }
export const deactivateDeviceToken = async ({ token }) => {
  if (!token) throw new Error('token is required');
  return await request('/v1/push/device-token', {
    method: 'DELETE',
    body: { token },
  });
};

export default { registerDeviceToken, deactivateDeviceToken };


