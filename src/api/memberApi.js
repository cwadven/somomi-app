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

export const fetchMemberProfile = async () => {
  return request('/v1/member/profile', {
    method: 'GET',
  });
};

// PUT /v1/member/profile
// ProfileUpdateRequest: { nickname: string, profile_image_url?: string|null, category_alarm_enabled: boolean, seen_tutorial?: boolean }
export const updateMemberProfile = async ({
  nickname,
  profile_image_url = null,
  category_alarm_enabled = true,
  seen_tutorial,
}) => {
  const body = {
    nickname,
    profile_image_url,
    category_alarm_enabled: !!category_alarm_enabled,
  };
  if (typeof seen_tutorial === 'boolean') body.seen_tutorial = seen_tutorial;
  return request('/v1/member/profile', {
    method: 'PUT',
    body,
  });
};

// PUT /v1/member/tutorial/success
// 튜토리얼 완료 처리 (seen_tutorial=true)
export const markTutorialSeenSuccess = async () => {
  return request('/v1/member/tutorial/success', {
    method: 'PUT',
  });
};

export default {
  loginMember,
  refreshAccessToken,
  sendVerificationToken,
  verifyVerificationToken,
  emailSignUp,
  fetchMemberProfile,
  updateMemberProfile,
  markTutorialSeenSuccess,
};


