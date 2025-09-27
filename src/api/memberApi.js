import { request } from './client';

export const loginMember = async ({ username, password }) => {
  return request('/v1/member/login', {
    method: 'POST',
    body: { username, password },
    skipAuth: true,
  });
};

export default {
  loginMember,
};


