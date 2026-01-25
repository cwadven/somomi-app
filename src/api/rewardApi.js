import { request } from './client';

// AdMob 보상형 광고 SSV 요청 레코드 생성
// POST /v1/reward/admob/request
export const createAdMobRewardRequest = async () => {
  return request('/v1/reward/admob/request', { method: 'POST' });
};

export default { createAdMobRewardRequest };

