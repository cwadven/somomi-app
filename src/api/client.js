import { API_BASE_URL } from '../config/apiConfig';
import { loadJwtToken, loadRefreshToken, saveJwtToken, saveRefreshToken } from '../utils/storageUtils';
import { deactivateStoredDeviceToken } from '../utils/pushDeviceTokenManager';

// refresh 동시성 제어:
// 동시에 여러 요청이 401/만료로 실패하면 refresh-token API가 중복 호출되고
// (서버가 refresh token rotation/1회성 정책인 경우) 그 중 하나가 실패하며 "세션 만료"로 오인될 수 있음.
let refreshInFlight = null; // Promise<void> | null

export const request = async (path, { method = 'GET', headers = {}, body, skipAuth = false, _retry = false } = {}) => {
  const token = await loadJwtToken();
  const isAnonymousToken = typeof token === 'string' && token.startsWith('anonymous_');
  const reqHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...headers,
  };
  // 최신 토큰으로 Authorization을 항상 주입(기존 헤더에 stale 토큰이 남는 케이스 방지)
  // 익명 토큰(anonymous_*)은 서버에 Authorization으로 보내지 않음 (요청사항)
  if (!skipAuth && token && typeof token === 'string' && !isAnonymousToken) {
    try { if (reqHeaders.authorization) delete reqHeaders.authorization; } catch (e) {}
    reqHeaders.Authorization = `jwt ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    // JSON이 아닌 응답이 올 수 있음(특히 401/5xx) → 리프레시 로직까지 진행되도록 파싱 실패는 무시
    json = null;
  }
  if (!res.ok) {
    // 토큰 만료(expired-jwt-token) 처리 → 리프레시 후 1회 재시도
    const errorCode = json?.error_code || json?.errorCode;
    const refreshCandidate = !skipAuth && !_retry && (errorCode === 'expired-jwt-token' || res.status === 401);
    // refresh token이 존재할 때만 refresh 시도 (익명/초기 진입 등에서는 시도하지 않음)
    const existingRefreshToken = refreshCandidate ? await loadRefreshToken() : null;
    const shouldTryRefresh = refreshCandidate && !!existingRefreshToken;
    if (shouldTryRefresh) {
      try {
        // 이미 다른 요청이 refresh 중이면 그 결과를 기다린 뒤 재시도
        if (!refreshInFlight) {
          refreshInFlight = (async () => {
        const refreshToken = await loadRefreshToken();
            if (!refreshToken) {
              // 리프레시 토큰 없음: 최초 진입 등 케이스
              const err = new Error('no-refresh-token');
              err.response = { status: 401, data: { message: 'no-refresh-token' } };
              throw err;
            }
        const refreshRes = await fetch(`${API_BASE_URL}/v1/member/refresh-token`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken })
        });
        const refreshText = await refreshRes.text();
            let refreshJson = null;
            try { refreshJson = refreshText ? JSON.parse(refreshText) : null; } catch (e) { refreshJson = null; }
        if (!refreshRes.ok) {
          const msg = refreshJson?.message || '토큰 갱신 실패';
              const err = new Error(msg);
              err.response = { status: refreshRes.status, data: refreshJson };
              throw err;
        }
        const newAccess = refreshJson?.access_token;
        const newRefresh = refreshJson?.refresh_token;
        if (!newAccess) throw new Error('no-access-token');
        await saveJwtToken(newAccess);
        if (newRefresh) await saveRefreshToken(newRefresh);
          })()
            .finally(() => {
              refreshInFlight = null;
            });
        }

        // refresh 완료 대기 (실패하면 catch로)
        await refreshInFlight;

        // 재시도 (1회)
        const sanitizedHeaders = { ...(headers || {}) };
        delete sanitizedHeaders.Authorization;
        delete sanitizedHeaders.authorization;
        return await request(path, { method, headers: sanitizedHeaders, body, skipAuth, _retry: true });
      } catch (refreshErr) {
        // refresh 자체가 실패한 경우:
        // - refresh token이 "진짜" 만료/무효인 경우(대개 401/403)만 세션 만료 처리
        // - 네트워크 오류/일시적 5xx 등은 세션 만료로 보지 않음 (요청사항)
        try {
          const status = refreshErr?.response?.status;
          const msg = String(refreshErr?.message || '').toLowerCase();
          const isRefreshAuthInvalid =
            status === 401 ||
            status === 403 ||
            (status === 400 && (msg.includes('expired') || msg.includes('만료') || msg.includes('invalid') || msg.includes('unauthorized')));

          const existingRefresh = await loadRefreshToken();
          if (existingRefresh && isRefreshAuthInvalid) {
            // ✅ refresh token이 만료/무효인 경우: (access token이 아직 유효해도) 로그아웃 처리 전에
            // 서버의 디바이스 토큰을 비활성화하여 푸시 발송을 막습니다.
            try { await deactivateStoredDeviceToken({ reason: 'refresh-token-expired' }); } catch (e) {}
            const { store } = require('../redux/store');
            const { logout } = require('../redux/slices/authSlice');
            store.dispatch(logout());
            const { navigationRef } = require('../navigation/RootNavigation');
            setTimeout(() => {
              if (navigationRef?.isReady?.()) {
                navigationRef.navigate('Profile', { screen: 'ProfileScreen', params: { sessionExpired: true } });
              }
            }, 0);
          }
        } catch (e) {}
        // 원래 에러를 그대로 던지되, refreshErr가 Error면 그 메시지를 우선 사용
        const message = refreshErr?.message || json?.message || '요청에 실패했습니다.';
        const error = new Error(message);
        error.response = refreshErr?.response || { status: res.status, data: json };
        throw error;
      }
    }

    const message = json?.message || '요청에 실패했습니다.';
    const error = new Error(message);
    error.response = { status: res.status, data: json };
    throw error;
  }
  return json;
};

export default { request };


