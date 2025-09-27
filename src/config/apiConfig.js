import Constants from 'expo-constants';

// 우선순위:
// 1) 환경변수(API_BASE_URL) - EXPO_PUBLIC_API_BASE_URL는 사용하지 않음
// 2) npx expo start 개발 모드(__DEV__) → http://localhost:8000
// 3) app.json extra.apiBaseUrl (프로덕션 기본값)

const extra = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};

const envBaseUrl = process.env.API_BASE_URL || null;

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export const API_BASE_URL = envBaseUrl
  || (isDev ? 'http://localhost:8000' : (extra.apiBaseUrl || ''));

export default {
  API_BASE_URL,
};


