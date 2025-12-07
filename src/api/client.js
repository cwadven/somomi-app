import { API_BASE_URL } from '../config/apiConfig';
import { loadJwtToken, loadRefreshToken, saveJwtToken, saveRefreshToken } from '../utils/storageUtils';

export const request = async (path, { method = 'GET', headers = {}, body, skipAuth = false, _retry = false } = {}) => {
  const token = await loadJwtToken();
  const reqHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...headers,
  };
  if (!skipAuth && token && typeof token === 'string' && !reqHeaders.Authorization) {
    reqHeaders.Authorization = `jwt ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    // 토큰 만료(expired-jwt-token) 처리 → 리프레시 후 1회 재시도
    const errorCode = json?.error_code || json?.errorCode;
    if (!skipAuth && !_retry && errorCode === 'expired-jwt-token') {
      try {
        const refreshToken = await loadRefreshToken();
        if (!refreshToken) {
          // 리프레시 토큰 없음 → 즉시 로그아웃 및 프로필 탭 이동
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
          throw new Error('no-refresh-token');
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
        const refreshJson = refreshText ? JSON.parse(refreshText) : null;
        if (!refreshRes.ok) {
          const msg = refreshJson?.message || '토큰 갱신 실패';
          // 리프레시 실패 → 로그아웃 및 프로필 탭 이동
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
        return await request(path, { method, headers, body, skipAuth, _retry: true });
      } catch (refreshErr) {
        const message = json?.message || '요청에 실패했습니다.';
        const error = new Error(message);
        error.response = { status: res.status, data: json };
        // 갱신 처리 중 예외 발생 시에도 로그아웃 및 이동 시도
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


