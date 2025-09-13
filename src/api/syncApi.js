// 동기화 게이트웨이: 오프라인/온라인 모드에 따라 동작 분기 + 큐 적재
// 사용처는 점진적으로 기존 slice 호출부를 대체하도록 합니다.

// 큐 제거로 no-op 대체
const enqueue = async () => {};

// 엔터티 타입 상수 (가이드용)
export const ENTITY_TYPES = {
  LOCATION: 'location',
  PRODUCT: 'product',
  LOCATION_TEMPLATE: 'location_template',
  PRODUCT_SLOT_TEMPLATE: 'product_slot_template',
  NOTIFICATION: 'notification',
};

// 동기화 모드 제거: 항상 온라인 커밋이 없으므로 로컬 큐 적재 경로만 사용
export const getSyncMode = async () => 'online';

const nowIso = () => new Date().toISOString();

// 공통 메타 보정 (생성 시)
const ensureCreateMeta = (payload, { deviceId, ownerUserId } = {}) => {
  const meta = { ...payload };
  if (!meta.localId) meta.localId = meta.id;
  if (!meta.createdAt) meta.createdAt = nowIso();
  meta.updatedAt = nowIso();
  if (!meta.deviceId && deviceId) meta.deviceId = deviceId;
  if (!meta.ownerUserId && ownerUserId) meta.ownerUserId = ownerUserId;
  if (!meta.syncStatus) meta.syncStatus = 'dirty';
  return meta;
};

// 공통 메타 보정 (수정 시)
const ensureUpdateMeta = (payload, { deviceId, ownerUserId } = {}) => {
  const meta = { ...payload };
  meta.updatedAt = nowIso();
  meta.syncStatus = 'dirty';
  if (!meta.deviceId && deviceId) meta.deviceId = deviceId;
  if (!meta.ownerUserId && ownerUserId) meta.ownerUserId = ownerUserId;
  return meta;
};

// 온라인 모드에서 서버 커밋이 성공했다고 가정하고 메타 반영 (현재는 서버 미구현이므로 스텁)
const markSynced = (payload) => ({
  ...payload,
  syncStatus: 'synced',
  lastSyncedAt: nowIso(),
});

// 큐 제거: enqueue는 더 이상 수행하지 않음

// 생성
export const createEntity = async (entityType, payload, context = {}) => {
  const enriched = ensureCreateMeta(payload, context);
  // 서버 미존재: 큐 적재 후 즉시 로컬 적용
  await enqueue(entityType, 'create', enriched);
  return markSynced(enriched);
};

// 업데이트
export const updateEntity = async (entityType, payload, context = {}) => {
  const enriched = ensureUpdateMeta(payload, context);
  await enqueue(entityType, 'update', enriched);
  return markSynced(enriched);
};

// 삭제 (tombstone는 호출부에서 관리)
export const deleteEntity = async (entityType, payload, context = {}) => {
  const enriched = ensureUpdateMeta(payload, context);
  enriched.syncStatus = 'deleted';
  await enqueue(entityType, 'delete', enriched);
  return markSynced(enriched);
};


