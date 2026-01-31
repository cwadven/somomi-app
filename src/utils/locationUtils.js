// 카테고리 관련 유틸리티
import { isTemplateActive } from './validityUtils';

// ✅ 게스트 섹션 API(feature.expiresAt) 기반 만료 여부 판별
// params:
// - locationId: string
// - context: { locations?: Array }
export const isLocationExpired = (locationId, { userLocationTemplateInstances = [], locations = [], subscription } = {}) => {
  try {
    const id = locationId == null ? null : String(locationId);
    if (!id) return false;
    const loc = (locations || []).find(l => String(l?.id) === id) || null;
    if (!loc?.templateInstanceId) return false; // 미연동이면 만료 개념 없음
    const exp = loc?.feature?.expiresAt || loc?.feature?.expires_at || null;
    if (exp) {
      const expMs = new Date(exp).getTime();
      if (Number.isFinite(expMs)) return expMs <= Date.now();
    }
    // (폴백) 혹시 locations에 expiresAt이 아직 없으면 기존 방식 유지
    const tpl = (userLocationTemplateInstances || []).find(t => String(t?.usedInLocationId) === id) || null;
    if (!tpl) return false;
    return !isTemplateActive(tpl, subscription);
  } catch (e) {
    return false;
  }
};

// 슬롯 용량 정보 계산
// params:
// - locationId: string
// - context: { locations, products, userProductSlotTemplateInstances }
// returns { used, total, isFull }
export const getLocationCapacityInfo = (locationId, { locations = [], products = [], locationProducts = null, userProductSlotTemplateInstances = [], subscription = null } = {}) => {
  const location = (locations || []).find(l => l.id === locationId);
  const baseSlots = location?.feature?.baseSlots ?? 0;
  const assignedExtra = (userProductSlotTemplateInstances || [])
    .filter(t => t.assignedLocationId === locationId)
    .filter(t => isTemplateActive(t, subscription))
    .length;
  const total = baseSlots === -1 ? -1 : baseSlots + assignedExtra;
  const usedSource = Array.isArray(locationProducts?.[locationId])
    ? locationProducts[locationId]
    : (products || []);
  const used = (usedSource || []).filter(p => p.locationId === locationId && !p.isConsumed).length;
  const isFull = total !== -1 && used >= total;
  return { used, total, isFull };
};
