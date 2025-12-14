import { API_BASE_URL } from '../config/apiConfig';
import { loadJwtToken, loadRefreshToken, saveJwtToken, saveRefreshToken } from '../utils/storageUtils';

export const request = async (path, { method = 'GET', headers = {}, body, skipAuth = false, _retry = false } = {}) => {
  const token = await loadJwtToken();
  const reqHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...headers,
  };
  // 최신 토큰으로 Authorization을 항상 주입(기존 헤더에 stale 토큰이 남는 케이스 방지)
  if (!skipAuth && token && typeof token === 'string') {
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
    const shouldTryRefresh = !skipAuth && !_retry && (errorCode === 'expired-jwt-token' || res.status === 401);
    if (shouldTryRefresh) {
      try {
        const refreshToken = await loadRefreshToken();
        if (!refreshToken) {
          // 리프레시 토큰 없음: 최초 진입 등 케이스 → 리프레시/리다이렉트/모달 없음
          const message = json?.message || '요청에 실패했습니다.';
          const error = new Error(message);
          error.response = { status: res.status, data: json };
          throw error;
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
          // 실패 시: 로그아웃 + 프로필로 이동하면서 세션 만료 모달 표시
          try {
            const { store } = require('../redux/store');
            const { logout } = require('../redux/slices/authSlice');
            store.dispatch(logout());
          } catch (e) {}
          try {
            const { navigationRef } = require('../navigation/RootNavigation');
            setTimeout(() => {
              if (navigationRef?.isReady?.()) {
                navigationRef.navigate('Profile', { screen: 'ProfileScreen', params: { sessionExpired: true } });
              }
            }, 0);
          } catch (e) {}
          const err = new Error(msg);
          err.response = { status: refreshRes.status, data: refreshJson };
          throw err;
        }
        const newAccess = refreshJson?.access_token;
        const newRefresh = refreshJson?.refresh_token;
        if (!newAccess) throw new Error('no-access-token');
        await saveJwtToken(newAccess);
        if (newRefresh) await saveRefreshToken(newRefresh);
        // 재시도 (1회)
        const sanitizedHeaders = { ...(headers || {}) };
        delete sanitizedHeaders.Authorization;
        delete sanitizedHeaders.authorization;
        return await request(path, { method, headers: sanitizedHeaders, body, skipAuth, _retry: true });
      } catch (refreshErr) {
        // refresh 자체가 실패한 경우에만 “세션 만료” 처리(리프레시 토큰이 존재할 때)
        try {
          const existingRefresh = await loadRefreshToken();
          if (existingRefresh) {
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


