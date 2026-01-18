// 공통 배지 라벨 유틸

// 카테고리 슬롯: feature.baseSlots 배열을 받아 "N 슬롯 카테고리 x M" 그룹 라벨 목록 생성
export const getLocationSlotChipLabels = (baseSlotsArray = []) => {
  const values = (Array.isArray(baseSlotsArray) ? baseSlotsArray : [])
    .filter(v => typeof v === 'number');
  const countsMap = values.reduce((acc, v) => {
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(countsMap).map(([vStr, count]) => {
    const v = Number(vStr);
    const label = (v === -1) ? '무제한 슬롯 카테고리' : `${v} 슬롯 카테고리`;
    return count > 1 ? `${label} x ${count}` : label;
  });
};

// 기간: 일수를 받아 "N일" 라벨 또는 null
export const getDurationChipLabel = (durationDays) => {
  if (typeof durationDays !== 'number') return null;
  return `${durationDays}일`;
};

// 제품 슬롯: 개수를 받아 "제품 슬롯 x N" 또는 null
export const getProductSlotChipLabel = (count) => {
  const n = typeof count === 'number' ? count : 0;
  if (n <= 0) return null;
  return `제품 슬롯 x ${n}`;
};


