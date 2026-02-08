import { API_BASE_URL } from '../config/apiConfig';
import { loadJwtToken, loadPushDeviceToken, removePushDeviceToken } from './storageUtils';

/**
 * 로그아웃/세션 만료 시점에 서버에 등록된 디바이스 토큰을 비활성화합니다.
 * - DELETE /v1/push/device-token { token }
 * - 가능한 경우 Authorization(jwt)을 포함해 호출합니다.
 * - 실패하더라도 로그아웃 흐름을 막지 않습니다.
 */
export async function deactivateStoredDeviceToken({ reason } = {}) {
  try {
    const jwt = await loadJwtToken();
    const isAnonymousToken = typeof jwt === 'string' && jwt.startsWith('anonymous_');
    if (!jwt || isAnonymousToken) return { ok: false, skipped: true, reason: 'no-jwt', meta: { reason } };

    const stored = await loadPushDeviceToken();
    let deviceToken =
      (typeof stored === 'string' ? stored : null) ||
      stored?.token ||
      stored?.deviceToken ||
      stored?.fcmToken ||
      null;

    // 저장된 토큰이 없으면 현재 기기에서 FCM 토큰 재조회 시도
    if (!deviceToken) {
      try {
        const { Platform } = require('react-native');
        if (Platform?.OS && Platform.OS !== 'web') {
          const messaging = require('@react-native-firebase/messaging').default;
          if (typeof messaging === 'function') {
            const fresh = await messaging().getToken();
            if (fresh) deviceToken = String(fresh);
          }
        }
      } catch (e) {}
    }

    if (!deviceToken) return { ok: false, skipped: true, reason: 'no-device-token', meta: { reason } };

    const res = await fetch(`${API_BASE_URL}/v1/push/device-token`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `jwt ${jwt}`,
      },
      body: JSON.stringify({ token: deviceToken }),
    });

    // 로그아웃 흐름에서는 로컬 캐시를 정리해 두는 편이 안전합니다.
    try { await removePushDeviceToken(); } catch (e) {}

    return { ok: !!res?.ok, status: res?.status, meta: { reason } };
  } catch (e) {
    try { await removePushDeviceToken(); } catch (err) {}
    return { ok: false, error: e, meta: { reason } };
  }
}

