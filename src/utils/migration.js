import { 

  loadLocations,
  saveLocations,
  loadProducts,
  saveProducts,
  loadConsumedProducts,
  saveConsumedProducts,
  loadData,
  saveData,
  STORAGE_KEYS,
  loadUserLocationTemplates,
  saveUserLocationTemplates,
  loadUserProductSlotTemplates,
  saveUserProductSlotTemplates,
  loadDeviceId,
} from './storageUtils';

const nowIso = () => new Date().toISOString();

const ensureMeta = (entity, { deviceId } = {}) => {
  if (!entity || typeof entity !== 'object') return entity;
  const next = { ...entity };
  // localId 기본: id와 동일
  if (!next.localId) next.localId = next.id;
  // 생성/수정 시각 기본값
  if (!next.createdAt) next.createdAt = nowIso();
  if (!next.updatedAt) next.updatedAt = nowIso();
  // 동기화 상태 기본값
  if (!next.syncStatus) next.syncStatus = 'synced';
  // 디바이스 ID
  if (!next.deviceId && deviceId) next.deviceId = deviceId;
  return next;
};

export const migrateLocalIdsAndMeta = async () => {
  try {
    const deviceId = (await loadDeviceId()) || 'unknown';

    // 1) Locations
    try {
      const locations = (await loadLocations()) || [];
      const migrated = locations.map(loc => {
        const next = ensureMeta(loc, { deviceId });
        // 관계 필드 보강
        next.templateInstanceLocalId = next.templateInstanceLocalId || next.templateInstanceId;
        // 필수 필드 보강
        if (typeof next.disabled !== 'boolean') next.disabled = !!next.disabled;
        return next;
      });
      await saveLocations(migrated);
    } catch (e) {}

    // 2) Products
    try {
      const products = (await loadProducts()) || [];
      const migrated = products.map(p => {
        const next = ensureMeta(p, { deviceId });
        // 관계 필드 보강
        next.locationLocalId = next.locationLocalId || next.locationId;
        return next;
      });
      await saveProducts(migrated);
    } catch (e) {}

    // 3) Consumed Products (옵션)
    try {
      const consumed = (await loadConsumedProducts()) || [];
      const migrated = consumed.map(p => ensureMeta(p, { deviceId }));
      await saveConsumedProducts(migrated);
    } catch (e) {}

    // 4) Notifications
    try {
      const notifs = (await loadData(STORAGE_KEYS.NOTIFICATIONS)) || [];
      const migrated = notifs.map(n => {
        const next = ensureMeta(n, { deviceId });
        if (!next.localId) next.localId = next.id;
        return next;
      });
      await saveData(STORAGE_KEYS.NOTIFICATIONS, migrated);
    } catch (e) {}

    // 5) Location Templates
    try {
      const templates = (await loadUserLocationTemplates()) || [];
      const migrated = templates.map(t => {
        const next = ensureMeta(t, { deviceId });
        // usedInLocationId는 나중에 reconcile에서 정리되므로 그대로 유지
        return next;
      });
      await saveUserLocationTemplates(migrated);
    } catch (e) {}

    // 6) Product Slot Templates (옵션)
    try {
      const pst = (await loadUserProductSlotTemplates()) || [];
      const migrated = pst.map(t => {
        const next = ensureMeta(t, { deviceId });
        // 관계 보강: assignedLocationLocalId가 없으면 기존 assignedLocationId 사용
        if (next.assignedLocationId && !next.assignedLocationLocalId) {
          next.assignedLocationLocalId = next.assignedLocationId;
        }
        return next;
      });
      await saveUserProductSlotTemplates(migrated);
    } catch (e) {}

    return true;
  } catch (e) {
    // 마이그레이션 실패는 앱 동작을 막지 않음
    return false;
  }
};


