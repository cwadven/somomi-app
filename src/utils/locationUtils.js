// 영역 관련 유틸리티

// 템플릿 만료 여부 판별
// params:
// - locationId: string
// - context: { userLocationTemplateInstances?: Array, locations?: Array }
export const isLocationExpired = (locationId, { userLocationTemplateInstances = [], locations = [] } = {}) => {
  const tpl = (userLocationTemplateInstances || []).find(t => t.usedInLocationId === locationId);
  const fallbackLocation = (locations || []).find(l => l.id === locationId);
  const exp = tpl?.expiresAt || tpl?.feature?.expiresAt || fallbackLocation?.feature?.expiresAt;
  return !!exp && (Date.now() >= new Date(exp).getTime());
};

// 슬롯 용량 정보 계산
// params:
// - locationId: string
// - context: { locations, products, userProductSlotTemplateInstances }
// returns { used, total, isFull }
export const getLocationCapacityInfo = (locationId, { locations = [], products = [], userProductSlotTemplateInstances = [] } = {}) => {
  const location = (locations || []).find(l => l.id === locationId);
  const baseSlots = location?.feature?.baseSlots ?? 0;
  const assignedExtra = (userProductSlotTemplateInstances || []).filter(t => t.assignedLocationId === locationId).length;
  const total = baseSlots === -1 ? -1 : baseSlots + assignedExtra;
  const used = (products || []).filter(p => p.locationId === locationId && !p.isConsumed).length;
  const isFull = total !== -1 && used >= total;
  return { used, total, isFull };
};
