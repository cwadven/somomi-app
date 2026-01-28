import { request } from './client';

// AdMob 보상형 광고 SSV 요청 레코드 생성
// POST /v1/reward/admob/request
export const createAdMobRewardRequest = async ({ rewardRuleId } = {}) => {
  const rid = Number(rewardRuleId);
  if (!Number.isFinite(rid)) {
    throw new Error('reward_rule_id가 필요합니다.');
  }
  return request('/v1/reward/admob/request', { method: 'POST', body: { reward_rule_id: rid } });
};

// AdMob 리워드 룰 목록 조회
// GET /v1/reward/admob/rules
export const fetchAdMobRewardRules = async () => {
  return request('/v1/reward/admob/rules', { method: 'GET' });
};

export default { createAdMobRewardRequest, fetchAdMobRewardRules };

