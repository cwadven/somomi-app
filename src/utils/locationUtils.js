// 카테고리 관련 유틸리티
import { isTemplateActive } from './validityUtils';

// 템플릿 만료 여부 판별
// params:
// - locationId: string
// - context: { userLocationTemplateInstances?: Array, locations?: Array }
export const isLocationExpired = (locationId, { userLocationTemplateInstances = [], locations = [], subscription } = {}) => {
  const tpl = (userLocationTemplateInstances || []).find(t => t.usedInLocationId === locationId);
  if (!tpl) {
    // 템플릿이 없으면 만료 아님
    return false;
  }
  return !isTemplateActive(tpl, subscription);
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
