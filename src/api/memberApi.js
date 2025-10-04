import { request } from './client';

export const loginMember = async ({ username, password }) => {
  return request('/v1/member/login', {
    method: 'POST',
    body: { username, password },
    skipAuth: true,
  });
};

export const refreshAccessToken = async (refreshToken) => {
  return request('/v1/member/refresh-token', {
    method: 'POST',
    body: { refresh_token: refreshToken },
    skipAuth: true,
  });
};

export const sendVerificationToken = async (email) => {
  return request('/v1/member/send-verification-token', {
    method: 'POST',
    body: { email },
    skipAuth: true,
  });
};

export const verifyVerificationToken = async (email, one_time_token) => {
  return request('/v1/member/verify-verification-token', {
    method: 'POST',
    body: { email, one_time_token },
    skipAuth: true,
  });
};

export const emailSignUp = async ({ email, one_time_token, password, password2 }) => {
  return request('/v1/member/email-sign-up', {
    method: 'POST',
    body: { email, one_time_token, password, password2 },
    skipAuth: true,
  });
};

export default {
  loginMember,
  refreshAccessToken,
  sendVerificationToken,
  verifyVerificationToken,
  emailSignUp,
};


