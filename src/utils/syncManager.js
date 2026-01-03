import { loadLocations, saveLocations, loadProducts, saveProducts } from './storageUtils';
import { fetchLocations, reconcileLocationsDisabled } from '../redux/slices/locationsSlice';
import { reconcileLocationTemplates } from '../redux/slices/authSlice';
import { fetchProducts } from '../redux/slices/productsSlice';

export const processSyncQueueIfOnline = async (dispatch, getState) => {
  // 오프라인 모드 제거: 항상 큐를 처리 (서버 미도입 상태에서는 로컬 커밋만 수행)

  // 큐 제거: 즉시 반환
  return;

  // 현재 저장 데이터 로드
  let locations = await loadLocations();
  let products = await loadProducts();

  // 큐 제거로 처리 루프 없음

  // 저장 반영
  try {await saveLocations(locations);} catch (e) {}
  try {await saveProducts(products);} catch (e) {}

  // 큐 비우기
  // 큐 제거: 초기화 불필요

  // Redux 상태 재동기화
  try {
    await dispatch(fetchLocations()).unwrap();
    await dispatch(reconcileLocationTemplates());
    await dispatch(reconcileLocationsDisabled()).unwrap();
    await dispatch(fetchProducts()).unwrap();
  } catch (e) {

    // 상태 동기화 실패는 치명적이지 않음
  }};