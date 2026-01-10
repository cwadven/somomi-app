// 제품 관련 공용 유틸리티

const DAY_MS = 24 * 60 * 60 * 1000;
const toMs = (v) => {
  if (!v) return null;
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : null;
};
const toEndOfLocalDayMs = (v) => {
  if (!v) return null;
  const d = new Date(v);
  const t = d.getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
};
const getStartMs = (product, endMs) => {
  const fromPurchase = toMs(product?.purchaseDate);
  const fromCreated = toMs(product?.createdAt);
  let start = fromPurchase ?? fromCreated ?? null;
  // 시작이 없거나 비정상(시작>=끝)이면, 보수적으로 "끝 - 30일"을 가정
  if (!Number.isFinite(start) || (Number.isFinite(endMs) && start >= endMs)) {
    start = Number.isFinite(endMs) ? (endMs - 30 * DAY_MS) : null;
  }
  return start;
};

// 내부: 안전 숫자 결과 포맷
const result = (percentage, remainingDays) => ({
  percentage: Math.max(0, Math.min(100, Math.round(Number.isFinite(percentage) ? percentage : 0))),
  // D-day는 "당일 = D-0"을 원하므로 올림이 아닌 내림(경과 후 음수)
  remainingDays: Number.isFinite(remainingDays) ? Math.floor(remainingDays) : 0,
});

// 유통기한 남은 수명 계산 (% / 일)
export const calculateExpiryPercentage = (product) => {
  if (!product?.expiryDate) return null;

  const nowMs = Date.now();
  const endMs = toEndOfLocalDayMs(product.expiryDate);
  const startMs = getStartMs(product, endMs);
  if (!Number.isFinite(endMs) || !Number.isFinite(startMs)) return result(100, 0);

  const totalMs = endMs - startMs;
  if (totalMs <= 0) return result(0, 0);

  const remainingMs = endMs - nowMs;
  const remainingDays = remainingMs / DAY_MS;
  const percentage = (remainingMs / totalMs) * 100;
  return result(percentage, remainingDays);
};

// 소진 예상 남은 수명 계산 (% / 일)
export const calculateConsumptionPercentage = (product) => {
  if (!product?.estimatedEndDate) return null;

  const nowMs = Date.now();
  const endMs = toEndOfLocalDayMs(product.estimatedEndDate);
  const startMs = getStartMs(product, endMs);
  if (!Number.isFinite(endMs) || !Number.isFinite(startMs)) return result(100, 0);

  const totalMs = endMs - startMs;
  if (totalMs <= 0) return result(0, 0);

  const remainingMs = endMs - nowMs;
  const remainingDays = remainingMs / DAY_MS;
  const percentage = (remainingMs / totalMs) * 100;
  return result(percentage, remainingDays);
};

// 카테고리 관련 유틸 제거
