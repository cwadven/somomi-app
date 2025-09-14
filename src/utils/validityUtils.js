// 템플릿 유효성 정책 유틸

export const getActivePlanIds = (subscription) => {
  if (!subscription) return [];
  // 향후 다중 플랜을 지원하기 위해 activePlanIds 우선 사용, 없으면 단일 plan을 배열로 변환
  const ids = Array.isArray(subscription.activePlanIds)
    ? subscription.activePlanIds
    : (subscription?.plan ? [subscription.plan] : []);
  return (subscription.isSubscribed === false) ? [] : ids;
};

// 템플릿이 현재 시점에 유효한가?
export const isTemplateActive = (template, subscription) => {
  if (!template) return false;
  const validWhile = template?.feature?.validWhile;

  // 정책 기반 판정
  if (validWhile && typeof validWhile === 'object') {
    const type = validWhile.type;
    if (type === 'subscriptionActive') {
      const mode = validWhile.mode === 'all' ? 'all' : 'any';
      const plans = Array.isArray(validWhile.plans) ? validWhile.plans : [];
      const active = new Set(getActivePlanIds(subscription));
      if (plans.length === 0) return false; // 계획이 비어있으면 유효하지 않음
      if (mode === 'all') {
        return plans.every(p => active.has(p));
      }
      // any
      return plans.some(p => active.has(p));
    }
    if (type === 'fixed') {
      const exp = template?.feature?.expiresAt;
      if (!exp) return true; // fixed인데 만료일이 없으면 무기한으로 간주
      return Date.now() < new Date(exp).getTime();
    }
  }

  // 레거시/백워드 호환: validWhile가 없으면 expiresAt 기준
  const exp = template?.feature?.expiresAt;
  if (!exp) return true;
  return Date.now() < new Date(exp).getTime();
};

export const isTemplateExpired = (template, subscription) => !isTemplateActive(template, subscription);


