// 샘플 데이터 (나중에 실제 API로 대체)
import { loadData, saveData, STORAGE_KEYS } from '../utils/storageUtils';
import { generateId } from '../utils/idUtils';

// 초기 샘플 데이터
const initialSampleProducts = [];

// 메모리 내 데이터 (AsyncStorage에서 로드될 예정)
let sampleProducts = [...initialSampleProducts];
let consumedProducts = [];

// 샘플 카테고리 데이터
const initialSampleCategories = [];

// 샘플 영역(Location) 데이터
const initialSampleLocations = [];

let sampleLocations = [...initialSampleLocations];
let sampleCategories = [...initialSampleCategories];

// 데이터 초기화 함수 - 앱 시작 시 호출
export const initializeData = async () => {
  try {
    // 제품 데이터 로드
    const storedProducts = await loadData(STORAGE_KEYS.PRODUCTS);
    if (storedProducts) {
      sampleProducts = storedProducts;
    } else {
      // 저장된 데이터가 없으면 초기 데이터 저장
      await saveData(STORAGE_KEYS.PRODUCTS, initialSampleProducts);
    }

    // 소진된 제품 데이터 로드
    const storedConsumedProducts = await loadData(STORAGE_KEYS.CONSUMED_PRODUCTS);
    if (storedConsumedProducts) {
      consumedProducts = storedConsumedProducts;
    } else {
      await saveData(STORAGE_KEYS.CONSUMED_PRODUCTS, []);
    }

    // 영역 데이터 로드
    const storedLocations = await loadData(STORAGE_KEYS.LOCATIONS);
    if (storedLocations) {
      sampleLocations = storedLocations;
    } else {
      await saveData(STORAGE_KEYS.LOCATIONS, initialSampleLocations);
      sampleLocations = [...initialSampleLocations]; // 메모리에도 초기 데이터 설정
    }

    // 카테고리 데이터 로드
    const storedCategories = await loadData(STORAGE_KEYS.CATEGORIES);
    if (storedCategories) {
      sampleCategories = storedCategories;
    } else {
      await saveData(STORAGE_KEYS.CATEGORIES, initialSampleCategories);
    }

    return true;
  } catch (error) {
    console.error('데이터 초기화 중 오류 발생:', error);
    return false;
  }
};

// API 서비스 함수
// 실제 API 구현 시 이 함수들만 수정하면 됩니다.
export const fetchProductsApi = async () => {
      try {
    // 저장된 최신 데이터 로드
    const storedProducts = await loadData(STORAGE_KEYS.PRODUCTS);
    if (storedProducts) {
      sampleProducts = storedProducts;
    }
    
        // 소진 처리된 제품 제외
        const activeProducts = sampleProducts.filter(p => !p.isConsumed);
    return [...activeProducts]; // 배열 복사본 반환
      } catch (error) {
    console.error('제품 조회 중 오류 발생:', error);
    throw new Error('Failed to fetch products');
      }
};

export const fetchProductByIdApi = async (id) => {
  try {
    // 저장된 최신 데이터 로드
    const storedProducts = await loadData(STORAGE_KEYS.PRODUCTS);
    const storedConsumedProducts = await loadData(STORAGE_KEYS.CONSUMED_PRODUCTS);
    if (storedProducts) {
      sampleProducts = storedProducts;
    }
    if (storedConsumedProducts) {
      consumedProducts = storedConsumedProducts;
    }

    const matchById = (p) => String(p.id) === String(id) || (p.localId != null && String(p.localId) === String(id));
    let product = sampleProducts.find(matchById);
    if (!product && Array.isArray(consumedProducts)) {
      product = consumedProducts.find(matchById);
    }

    if (product) {
      return { ...product }; // 객체 복사본 반환
    } else {
      throw new Error('Product not found');
    }
  } catch (error) {
    console.error('제품 상세 조회 중 오류 발생:', error);
    throw error;
  }
};

export const addProductApi = async (product) => {
  try {
    // 저장된 최신 데이터 로드
    const storedProducts = await loadData(STORAGE_KEYS.PRODUCTS);
    if (storedProducts) {
      sampleProducts = storedProducts;
    }
    
    // 새로운 ID 생성
    const newId = generateId('product');
    const newProduct = {
      ...product,
      id: newId,
      remainingPercentage: 100, // 새 제품은 100% 남음
    };
    
    // 데이터베이스에 추가
    const updatedProducts = [...sampleProducts, newProduct];
    sampleProducts = updatedProducts;
    
    // AsyncStorage에 저장
    await saveData(STORAGE_KEYS.PRODUCTS, updatedProducts);
    
    return {...newProduct}; // 객체 복사본 반환
  } catch (error) {
    console.error('제품 추가 중 오류 발생:', error);
    throw new Error('Failed to add product');
  }
};

export const updateProductApi = async (product) => {
  try {
    // 저장된 최신 데이터 로드
    const storedProducts = await loadData(STORAGE_KEYS.PRODUCTS);
    if (storedProducts) {
      sampleProducts = storedProducts;
    }
    
      const index = sampleProducts.findIndex(p => p.id === product.id);
      if (index !== -1) {
        // 데이터베이스 업데이트
      const updatedProducts = [
          ...sampleProducts.slice(0, index),
          {...product},
          ...sampleProducts.slice(index + 1)
        ];
      sampleProducts = updatedProducts;
      
      // AsyncStorage에 저장
      await saveData(STORAGE_KEYS.PRODUCTS, updatedProducts);
      
      return {...product}; // 객체 복사본 반환
      } else {
      throw new Error('Product not found');
      }
  } catch (error) {
    console.error('제품 업데이트 중 오류 발생:', error);
    throw error;
  }
};

export const deleteProductApi = async (id) => {
  try {
    // 저장된 최신 데이터 로드
    const storedProducts = await loadData(STORAGE_KEYS.PRODUCTS);
    if (storedProducts) {
      sampleProducts = storedProducts;
    }
    
      const index = sampleProducts.findIndex(p => p.id === id);
      if (index !== -1) {
        // 데이터베이스에서 삭제
      const updatedProducts = [
          ...sampleProducts.slice(0, index),
          ...sampleProducts.slice(index + 1)
        ];
      sampleProducts = updatedProducts;
      
      // AsyncStorage에 저장
      await saveData(STORAGE_KEYS.PRODUCTS, updatedProducts);
      
      return { success: true, id };
      } else {
      throw new Error('Product not found');
      }
  } catch (error) {
    console.error('제품 삭제 중 오류 발생:', error);
    throw error;
  }
};

// 소진 처리 API 함수
export const markProductAsConsumedApi = async (id, consumptionDate = null) => {
  try {
    console.log('소진 처리 API 호출:', { id, consumptionDate });
    
    // 저장된 최신 데이터 로드
    const storedProducts = await loadData(STORAGE_KEYS.PRODUCTS);
    const storedConsumedProducts = await loadData(STORAGE_KEYS.CONSUMED_PRODUCTS) || [];
    
    if (storedProducts) {
      sampleProducts = storedProducts;
    }
    
    console.log('소진 처리할 제품 ID:', id);
    console.log('현재 제품 목록:', sampleProducts.map(p => ({ id: p.id, name: p.name })));
    
    const index = sampleProducts.findIndex(p => p.id === id);
    console.log('제품 인덱스:', index);
    
    if (index !== -1) {
      // 제품 복사
      const product = { ...sampleProducts[index] };
      
      // 소진 처리 정보 추가
      // 소진 날짜가 제공되면 해당 날짜 사용, 아니면 현재 날짜 사용(소진일)
      product.consumedAt = consumptionDate || new Date().toISOString();
      // 소진처리일(목록 이동 시각) 별도 기록
      product.processedAt = new Date().toISOString();
      product.isConsumed = true;
      
      console.log('소진 처리된 제품:', product);
      
      // 일반 제품 목록에서 제거
      const updatedProducts = [
        ...sampleProducts.slice(0, index),
        ...sampleProducts.slice(index + 1)
      ];
      
      // 소진 처리된 제품 목록에 추가
      const updatedConsumedProducts = [...storedConsumedProducts, product];
      
      // AsyncStorage에 저장
      await saveData(STORAGE_KEYS.PRODUCTS, updatedProducts);
      await saveData(STORAGE_KEYS.CONSUMED_PRODUCTS, updatedConsumedProducts);
      
      // 메모리 상태 업데이트
      sampleProducts = updatedProducts;
      consumedProducts = updatedConsumedProducts;
      
      return product;
    } else {
      console.error('제품을 찾을 수 없음:', id);
      throw new Error('Product not found');
    }
  } catch (error) {
    console.error('제품 소진 처리 중 오류 발생:', error);
    throw error;
  }
};

// 소진 처리된 제품 목록 조회 API 함수
export const fetchConsumedProductsApi = async () => {
  try {
    // 저장된 최신 데이터 로드
    const storedConsumedProducts = await loadData(STORAGE_KEYS.CONSUMED_PRODUCTS);
    if (storedConsumedProducts) {
      consumedProducts = storedConsumedProducts;
    }
    
    // 소진처리일(processedAt) 기준으로 최신순 정렬, 없으면 consumedAt로 대체
    const sortedConsumedProducts = [...consumedProducts].sort((a, b) => {
      const dateA = a.processedAt ? new Date(a.processedAt).getTime() : (a.consumedAt ? new Date(a.consumedAt).getTime() : 0);
      const dateB = b.processedAt ? new Date(b.processedAt).getTime() : (b.consumedAt ? new Date(b.consumedAt).getTime() : 0);
      return dateB - dateA; // 내림차순 정렬 (최신순)
    });
    
    return sortedConsumedProducts;
  } catch (error) {
    console.error('소진 제품 조회 중 오류 발생:', error);
    throw new Error('Failed to fetch consumed products');
  }
};

export const fetchCategoriesApi = async () => {
  try {
    // 저장된 최신 데이터 로드
    const storedCategories = await loadData(STORAGE_KEYS.CATEGORIES);
    if (storedCategories) {
      sampleCategories = storedCategories;
    }
    
    return [...sampleCategories]; // 배열 복사본 반환
  } catch (error) {
    console.error('카테고리 조회 중 오류 발생:', error);
    throw new Error('Failed to fetch categories');
  }
};

export const fetchLocationsApi = async () => {
  try {
    // 저장된 최신 데이터 로드
    const storedLocations = await loadData(STORAGE_KEYS.LOCATIONS);
    if (storedLocations) {
      sampleLocations = storedLocations;
    } else {
      // 저장된 데이터가 없으면 초기 데이터 저장
      await saveData(STORAGE_KEYS.LOCATIONS, initialSampleLocations);
      sampleLocations = [...initialSampleLocations];
    }
    
    return [...sampleLocations]; // 배열 복사본 반환
  } catch (error) {
    console.error('카테고리 조회 중 오류 발생:', error);
    throw new Error('Failed to fetch locations');
  }
};

export const fetchLocationByIdApi = async (id) => {
  try {
    // 저장된 최신 데이터 로드
    const storedLocations = await loadData(STORAGE_KEYS.LOCATIONS);
    if (storedLocations) {
      sampleLocations = storedLocations;
    }
    
      const location = sampleLocations.find(location => location.id === id);
      if (location) {
      return {...location}; // 객체 복사본 반환
      } else {
      throw new Error('Location not found');
      }
  } catch (error) {
    console.error('카테고리 상세 조회 중 오류 발생:', error);
    throw error;
  }
};

export const addLocationApi = async (location) => {
  try {
    // 저장된 최신 데이터 로드
    const storedLocations = await loadData(STORAGE_KEYS.LOCATIONS);
    if (storedLocations) {
      sampleLocations = storedLocations;
    }
    
    // 새로운 ID 생성
    const newId = generateId('location');
    const newLocation = {
      ...location,
      id: newId,
    };
    
    // 데이터베이스에 추가
    const updatedLocations = [...sampleLocations, newLocation];
    sampleLocations = updatedLocations;
    
    // AsyncStorage에 저장
    await saveData(STORAGE_KEYS.LOCATIONS, updatedLocations);
    
    return {...newLocation}; // 객체 복사본 반환
  } catch (error) {
    console.error('카테고리 추가 중 오류 발생:', error);
    throw new Error('Failed to add location');
  }
};

export const updateLocationApi = async (location) => {
  try {
    // 저장된 최신 데이터 로드
    const storedLocations = await loadData(STORAGE_KEYS.LOCATIONS);
    if (storedLocations) {
      sampleLocations = storedLocations;
    }
    
      const index = sampleLocations.findIndex(l => l.id === location.id);
      if (index !== -1) {
        // 데이터베이스 업데이트
      const updatedLocations = [
          ...sampleLocations.slice(0, index),
          {...location},
          ...sampleLocations.slice(index + 1)
        ];
      sampleLocations = updatedLocations;
      
      // AsyncStorage에 저장
      await saveData(STORAGE_KEYS.LOCATIONS, updatedLocations);
      
      return {...location}; // 객체 복사본 반환
      } else {
      throw new Error('Location not found');
      }
  } catch (error) {
    console.error('카테고리 업데이트 중 오류 발생:', error);
    throw error;
  }
};

export const deleteLocationApi = async (id) => {
  try {
    // 저장된 최신 데이터 로드
    const storedLocations = await loadData(STORAGE_KEYS.LOCATIONS);
    if (storedLocations) {
      sampleLocations = storedLocations;
    }
    
      const index = sampleLocations.findIndex(l => l.id === id);
      if (index !== -1) {
        // 데이터베이스에서 삭제
      const updatedLocations = [
          ...sampleLocations.slice(0, index),
          ...sampleLocations.slice(index + 1)
        ];
      sampleLocations = updatedLocations;
      
      // AsyncStorage에 저장
      await saveData(STORAGE_KEYS.LOCATIONS, updatedLocations);
      
      return id;
      } else {
      throw new Error('Location not found');
      }
  } catch (error) {
    console.error('카테고리 삭제 중 오류 발생:', error);
    throw error;
  }
};

export const fetchProductsByLocationApi = async (locationId) => {
  try {
    // 저장된 최신 데이터 로드
    const storedProducts = await loadData(STORAGE_KEYS.PRODUCTS);
    if (storedProducts) {
      sampleProducts = storedProducts;
    }
    
    // 해당 영역의 제품만 필터링 (localId 우선)
    const locationProducts = sampleProducts.filter(
      product => (product.locationLocalId === locationId || product.locationId === locationId) && !product.isConsumed
          );
    
    return [...locationProducts]; // 배열 복사본 반환
      } catch (error) {
    console.error('카테고리별 제품 조회 중 오류 발생:', error);
    throw new Error(`Failed to fetch products for location ${locationId}`);
  }
};

export const fetchPopularProductsApi = async () => {
  try {
    // 저장된 최신 데이터 로드
    const storedProducts = await loadData(STORAGE_KEYS.PRODUCTS);
    if (storedProducts) {
      sampleProducts = storedProducts;
    }
    
    // 실제로는 인기 제품을 서버에서 계산하겠지만, 여기서는 임의로 선택
    const popularProducts = sampleProducts
      .filter(p => !p.isConsumed)
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.min(3, sampleProducts.length));
    
    return [...popularProducts]; // 배열 복사본 반환
  } catch (error) {
    console.error('인기 제품 조회 중 오류 발생:', error);
    throw new Error('Failed to fetch popular products');
  }
}; 

// 소진 철회 API 함수
export const restoreConsumedProductApi = async (id, locationId = null) => {
  try {
    console.log('소진 철회 API 호출:', { id, locationId });
    
    // 저장된 최신 데이터 로드
    const storedProducts = await loadData(STORAGE_KEYS.PRODUCTS) || [];
    const storedConsumedProducts = await loadData(STORAGE_KEYS.CONSUMED_PRODUCTS) || [];
    
    console.log('소진 철회 - 현재 제품 목록:', storedProducts.length);
    console.log('소진 철회 - 현재 소진된 제품 목록:', storedConsumedProducts.length);
    console.log('소진 철회 - 소진된 제품 ID 목록:', storedConsumedProducts.map(p => p.id));
    
    // 소진 처리된 제품 목록에서 제품 찾기
    const index = storedConsumedProducts.findIndex(p => p.id === id);
    console.log('소진 철회 - 제품 인덱스:', index);
    
    if (index !== -1) {
      // 제품 복사
      const product = { ...storedConsumedProducts[index] };
      console.log('소진 철회 - 찾은 제품:', product);
      
      // 소진 처리 정보 제거
      delete product.consumedAt;
      product.isConsumed = false;
      
      // 영역 ID 설정 (새 영역이 지정된 경우)
      if (locationId) {
        product.locationId = locationId;
      }
      
      // 소진 처리된 제품 목록에서 제거
      const updatedConsumedProducts = [
        ...storedConsumedProducts.slice(0, index),
        ...storedConsumedProducts.slice(index + 1)
      ];
      
      // 일반 제품 목록에 추가
      const updatedProducts = [...storedProducts, product];
      
      // AsyncStorage에 저장
      await saveData(STORAGE_KEYS.PRODUCTS, updatedProducts);
      await saveData(STORAGE_KEYS.CONSUMED_PRODUCTS, updatedConsumedProducts);
      
      // 메모리 상태 업데이트
      sampleProducts = updatedProducts;
      consumedProducts = updatedConsumedProducts;
      
      console.log('소진 철회 성공:', product);
      return product;
    } else {
      console.error('소진된 제품 목록에서 제품을 찾을 수 없음:', id);
      throw new Error('Product not found in consumed products');
    }
  } catch (error) {
    console.error('제품 소진 철회 중 오류 발생:', error);
    throw error;
  }
}; 