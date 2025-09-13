// 제품 관련 공용 유틸리티

// 내부: 날짜 정규화 헬퍼
const normalizeStartOfDay = (d) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};
const normalizeEndOfDay = (d) => {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
};

// 내부: 안전 숫자 결과 포맷
const result = (percentage, remainingDays) => ({
  percentage: Math.max(0, Math.min(100, Math.round(Number.isFinite(percentage) ? percentage : 0))),
  remainingDays: Number.isFinite(remainingDays) ? Math.ceil(remainingDays) : 0,
});

// 유통기한 남은 수명 계산 (% / 일)
export const calculateExpiryPercentage = (product) => {
  if (!product?.expiryDate) return null;

  const today = normalizeStartOfDay(new Date());
  const expiryDate = normalizeEndOfDay(product.expiryDate);
  const purchaseDate = normalizeStartOfDay(product.purchaseDate || new Date());

  if (isNaN(expiryDate.getTime()) || isNaN(purchaseDate.getTime())) {
    return result(100, 0);
  }

  const totalDays = (expiryDate - purchaseDate) / (1000 * 60 * 60 * 24);
  if (totalDays <= 0) return result(0, 0);

  const remainingDays = (expiryDate - today) / (1000 * 60 * 60 * 24);
  const percentage = (remainingDays / totalDays) * 100;
  return result(percentage, remainingDays);
};

// 소진 예상 남은 수명 계산 (% / 일)
export const calculateConsumptionPercentage = (product) => {
  if (!product?.estimatedEndDate) return null;

  const today = normalizeStartOfDay(new Date());
  const endDate = normalizeEndOfDay(product.estimatedEndDate);
  const purchaseDate = normalizeStartOfDay(product.purchaseDate || new Date());

  if (isNaN(endDate.getTime()) || isNaN(purchaseDate.getTime())) {
    return result(100, 0);
  }

  const totalDays = (endDate - purchaseDate) / (1000 * 60 * 60 * 24);
  if (totalDays <= 0) return result(0, 0);

  const remainingDays = (endDate - today) / (1000 * 60 * 60 * 24);
  const percentage = (remainingDays / totalDays) * 100;
  return result(percentage, remainingDays);
};

// 카테고리 → Ionicons 이름 매핑
export const getCategoryIconName = (product) => {
  const categoryIcons = {
    '식품': 'fast-food',
    '화장품': 'color-palette',
    '세제': 'water',
    '욕실용품': 'water-outline',
    '주방용품': 'restaurant',
  };
  const name = product?.category?.name || product?.category;
  return categoryIcons[name] || 'cube-outline';
};
