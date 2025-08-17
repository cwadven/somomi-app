import { loadAppPrefs, loadSyncQueue, clearSyncQueue, loadLocations, saveLocations, loadProducts, saveProducts } from './storageUtils';
import { fetchLocations, reconcileLocationsDisabled } from '../redux/slices/locationsSlice';
import { reconcileLocationTemplates } from '../redux/slices/authSlice';
import { fetchProducts } from '../redux/slices/productsSlice';

const markSyncedMeta = (entity) => {
  if (!entity) return entity;
  const next = { ...entity };
  next.syncStatus = 'synced';
  next.lastSyncedAt = new Date().toISOString();
  if (!next.updatedAt) next.updatedAt = next.lastSyncedAt;
  return next;
};

export const processSyncQueueIfOnline = async (dispatch, getState) => {
  const prefs = await loadAppPrefs();
  const isOnline = (prefs?.syncMode === 'online') || (prefs && prefs.offlineMode === false);
  if (!isOnline) return;

  const queue = await loadSyncQueue();
  if (!queue || queue.length === 0) return;

  // 현재 저장 데이터 로드
  let locations = await loadLocations();
  let products = await loadProducts();

  for (const op of queue) {
    const { entityType, action, payload } = op || {};
    if (!entityType || !action || !payload) continue;
    try {
      if (entityType === 'location') {
        if (action === 'create') {
          const exists = locations.some(l => (l.id === payload.id) || (l.localId && l.localId === payload.localId));
          if (!exists) {
            locations.push(markSyncedMeta(payload));
          }
        } else if (action === 'update') {
          locations = locations.map(l => {
            const match = (l.id === payload.id) || (l.localId && l.localId === payload.localId);
            return match ? markSyncedMeta({ ...l, ...payload }) : l;
          });
        } else if (action === 'delete') {
          locations = locations.filter(l => (l.id !== payload.id) && (l.localId !== payload.localId));
        }
      } else if (entityType === 'product') {
        if (action === 'create') {
          const exists = products.some(p => (p.id === payload.id) || (p.localId && p.localId === payload.localId));
          if (!exists) {
            products.push(markSyncedMeta(payload));
          }
        } else if (action === 'update') {
          products = products.map(p => {
            const match = (p.id === payload.id) || (p.localId && p.localId === payload.localId);
            return match ? markSyncedMeta({ ...p, ...payload }) : p;
          });
        } else if (action === 'delete') {
          products = products.filter(p => (p.id !== payload.id) && (p.localId !== payload.localId));
        }
      }
    } catch (e) {
      // 개별 작업 실패는 무시하고 다음으로 진행 (서버 도입 시 재시도/백오프 적용)
      // console.warn('Sync 작업 처리 중 오류:', e);
    }
  }

  // 저장 반영
  try { await saveLocations(locations); } catch (e) {}
  try { await saveProducts(products); } catch (e) {}

  // 큐 비우기
  try { await clearSyncQueue(); } catch (e) {}

  // Redux 상태 재동기화
  try {
    await dispatch(fetchLocations()).unwrap();
    await dispatch(reconcileLocationTemplates());
    await dispatch(reconcileLocationsDisabled()).unwrap();
    await dispatch(fetchProducts()).unwrap();
  } catch (e) {
    // 상태 동기화 실패는 치명적이지 않음
  }
};


