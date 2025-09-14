// 영역 관련 유틸리티
import { isTemplateActive } from './validityUtils';

// 템플릿 만료 여부 판별
// params:
// - locationId: string
// - context: { userLocationTemplateInstances?: Array, locations?: Array }
export const isLocationExpired = (locationId, { userLocationTemplateInstances = [], locations = [], subscription } = {}) => {
  const tpl = (userLocationTemplateInstances || []).find(t => t.usedInLocationId === locationId);
  if (!tpl) {
    // fallback: 위치에 박힌 feature를 볼 수 있지만 정책 일관성을 위해 없음으로 간주
    const fallbackLocation = (locations || []).find(l => l.id === locationId);
    const exp = fallbackLocation?.feature?.expiresAt;
    return !!exp && (Date.now() >= new Date(exp).getTime());
  }
  return !isTemplateActive(tpl, subscription);
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
