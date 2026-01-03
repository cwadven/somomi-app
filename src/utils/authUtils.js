import { store } from '../redux/store';

// 사용되지 않는 getToken/setAuthHeader/ensureToken 제거됨

// 비회원 제한 확인
export const checkAnonymousLimits = async (type, locationId = null) => {
  const state = store.getState();
  const { isAnonymous } = state.auth;
  
  // 비회원이 아니면 제한 없음
  if (!isAnonymous) {
    return { limited: false };
  }
  
  // 비회원인 경우 제한 확인
  if (type === 'location') {
    // 영역 추가 제한 (1개)
    const { locations } = state.locations;
    return {
      limited: locations.length >= 1,
      message: '비회원은 영역을 1개만 추가할 수 있습니다.\n회원가입 후 더 많은 영역을 추가해보세요.',
      currentCount: locations.length,
      maxCount: 1
    };
  } else if (type === 'product') {
    // 상품 추가 제한 (영역당 5개)
    const { products } = state.products;
    const locationProducts = products.filter(p => p.locationId === locationId);
    
    return {
      limited: locationProducts.length >= 5,
      message: '비회원은 영역당 상품을 5개만 추가할 수 있습니다.\n회원가입 후 더 많은 상품을 추가해보세요.',
      currentCount: locationProducts.length,
      maxCount: 5
    };
  }
  
  return { limited: false };
}; 