import { store } from '../redux/store';
import { getAnonymousToken, verifyToken } from '../redux/slices/authSlice';

// JWT 토큰 가져오기
export const getToken = async () => {
  try {
    const token = localStorage.getItem('jwt_token');
    return token;
  } catch (error) {
    console.error('토큰 가져오기 실패:', error);
    return null;
  }
};

// JWT 토큰 설정 (헤더에 추가)
export const setAuthHeader = async () => {
  try {
    const token = await getToken();
    
    if (token) {
      return {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      };
    }
    
    return {
      headers: {
        'Content-Type': 'application/json',
      }
    };
  } catch (error) {
    console.error('인증 헤더 설정 실패:', error);
    return {
      headers: {
        'Content-Type': 'application/json',
      }
    };
  }
};

// 토큰 검증 및 필요시 익명 토큰 발급
export const ensureToken = async () => {
  const state = store.getState();
  const { token, isAnonymous } = state.auth;
  
  // 토큰이 없는 경우
  if (!token) {
    // 토큰 검증 시도
    await store.dispatch(verifyToken());
    
    // 검증 후에도 토큰이 없으면 익명 토큰 발급
    const updatedState = store.getState();
    if (!updatedState.auth.token) {
      await store.dispatch(getAnonymousToken());
    }
  }
  
  return store.getState().auth;
};

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