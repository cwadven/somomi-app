import AsyncStorage from '@react-native-async-storage/async-storage';

// 스토리지 키 상수
export const STORAGE_KEYS = {
  PRODUCTS: 'somomi_products',
  LOCATIONS: 'somomi_locations',
  CATEGORIES: 'somomi_categories',
  NOTIFICATIONS: 'somomi_notifications',
  CONSUMED_PRODUCTS: 'somomi_consumed_products',
  PROCESSED_NOTIFICATIONS: 'somomi_processed_notifications',
  USER_LOCATION_TEMPLATES: 'somomi_user_location_templates', // 사용자 영역 템플릿 인스턴스
  USER_PRODUCT_SLOT_TEMPLATES: 'somomi_user_product_slot_templates', // 사용자 제품 슬롯 템플릿 인스턴스
  JWT_TOKEN: 'somomi_jwt_token',
  DEVICE_ID: 'somomi_device_id',
  APP_PREFS: 'somomi_app_prefs', // 앱 설정(알림 등)
  DAILY_REMINDER_SENT: 'somomi_daily_reminder_sent', // 일자별 리마인더 발송 기록
  DAILY_UPDATE_REMINDER_SENT: 'somomi_daily_update_reminder_sent', // 일자별 작성 리마인더 발송 기록
  PRODUCT_FORM_DRAFT: 'somomi_product_form_draft', // 제품 등록 초안
  LOCATION_FORM_DRAFT: 'somomi_location_form_draft', // 영역 생성 초안
};

// 데이터 저장 함수
export const saveData = async (key, data) => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonValue);
    console.log(`데이터 저장 성공 (${key}):`, data);
    return true;
  } catch (error) {
    console.error(`Error saving data for key ${key}:`, error);
    return false;
  }
};

// 데이터 로드 함수
export const loadData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    const data = jsonValue != null ? JSON.parse(jsonValue) : null;
    console.log(`데이터 로드 (${key}):`, data);
    return data;
  } catch (error) {
    console.error(`Error loading data for key ${key}:`, error);
    return null;
  }
};

// 데이터 삭제 함수
export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing data for key ${key}:`, error);
    return false;
  }
};

// 앱 설정 저장/로드
export const saveAppPrefs = async (prefs) => {
  try {
    const current = (await loadData(STORAGE_KEYS.APP_PREFS)) || {};
    const merged = { ...current, ...prefs };
    await saveData(STORAGE_KEYS.APP_PREFS, merged);
    return true;
  } catch (error) {
    console.error('앱 설정 저장 오류:', error);
    return false;
  }
};

export const loadAppPrefs = async () => {
  try {
    const prefs = await loadData(STORAGE_KEYS.APP_PREFS);
    // 기본값 축소: 오프라인/온라인 모드 개념 제거
    const defaults = {};
    return { ...defaults, ...(prefs || {}) };
  } catch (error) {
    console.error('앱 설정 로드 오류:', error);
    // 오류 시에도 빈 기본값 반환
    return {};
  }
};

// 모든 데이터 초기화 함수
export const clearAllData = async () => {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
}; 

// =====================
// 동기화 보조 스토리지 관련 항목 제거됨
// =====================

// 영역 데이터 저장 함수
export const saveLocations = async (locations) => {
  try {
    await saveData(STORAGE_KEYS.LOCATIONS, locations);
    console.log('영역 데이터가 저장되었습니다. 개수:', locations.length);
    return true;
  } catch (error) {
    console.error('영역 데이터 저장 중 오류:', error);
    return false;
  }
};

// 영역 데이터 로드 함수
export const loadLocations = async () => {
  try {
    const locations = await loadData(STORAGE_KEYS.LOCATIONS);
    console.log('영역 데이터 로드. 개수:', locations ? locations.length : 0);
    return locations || [];
  } catch (error) {
    console.error('영역 데이터 로드 중 오류:', error);
    return [];
  }
};

// 제품 데이터 저장 함수
export const saveProducts = async (products) => {
  try {
    await saveData(STORAGE_KEYS.PRODUCTS, products);
    console.log('제품 데이터가 저장되었습니다. 개수:', products.length);
    return true;
  } catch (error) {
    console.error('제품 데이터 저장 중 오류:', error);
    return false;
  }
};

// 제품 데이터 로드 함수
export const loadProducts = async () => {
  try {
    const products = await loadData(STORAGE_KEYS.PRODUCTS);
    console.log('제품 데이터 로드. 개수:', products ? products.length : 0);
    return products || [];
  } catch (error) {
    console.error('제품 데이터 로드 중 오류:', error);
    return [];
  }
};

// 소진된 제품 데이터 저장 함수
export const saveConsumedProducts = async (consumedProducts) => {
  try {
    await saveData(STORAGE_KEYS.CONSUMED_PRODUCTS, consumedProducts);
    console.log('소진된 제품 데이터가 저장되었습니다. 개수:', consumedProducts.length);
    return true;
  } catch (error) {
    console.error('소진된 제품 데이터 저장 중 오류:', error);
    return false;
  }
};

// 소진된 제품 데이터 로드 함수
export const loadConsumedProducts = async () => {
  try {
    const consumedProducts = await loadData(STORAGE_KEYS.CONSUMED_PRODUCTS);
    console.log('소진된 제품 데이터 로드. 개수:', consumedProducts ? consumedProducts.length : 0);
    return consumedProducts || [];
  } catch (error) {
    console.error('소진된 제품 데이터 로드 중 오류:', error);
    return [];
  }
};

// 사용자 영역 템플릿 인스턴스 저장 함수
export const saveUserLocationTemplates = async (templates) => {
  try {
    await saveData(STORAGE_KEYS.USER_LOCATION_TEMPLATES, templates);
    console.log('사용자 영역 템플릿 인스턴스가 저장되었습니다. 개수:', templates.length);
    return true;
  } catch (error) {
    console.error('사용자 영역 템플릿 인스턴스 저장 중 오류:', error);
    return false;
  }
};

// 사용자 영역 템플릿 인스턴스 로드 함수
export const loadUserLocationTemplates = async () => {
  try {
    const templates = await loadData(STORAGE_KEYS.USER_LOCATION_TEMPLATES);
    console.log('사용자 영역 템플릿 인스턴스 로드. 개수:', templates ? templates.length : 0);
    return templates;
  } catch (error) {
    console.error('사용자 영역 템플릿 인스턴스 로드 중 오류:', error);
    return null;
  }
};

// 사용자 제품 슬롯 템플릿 인스턴스 저장/로드 함수
export const saveUserProductSlotTemplates = async (templates) => {
  try {
    await saveData(STORAGE_KEYS.USER_PRODUCT_SLOT_TEMPLATES, templates);
    console.log('사용자 제품 슬롯 템플릿 인스턴스 저장. 개수:', templates.length);
    return true;
  } catch (error) {
    console.error('사용자 제품 슬롯 템플릿 인스턴스 저장 중 오류:', error);
    return false;
  }
};

export const loadUserProductSlotTemplates = async () => {
  try {
    const templates = await loadData(STORAGE_KEYS.USER_PRODUCT_SLOT_TEMPLATES);
    console.log('사용자 제품 슬롯 템플릿 인스턴스 로드. 개수:', templates ? templates.length : 0);
    return templates || [];
  } catch (error) {
    console.error('사용자 제품 슬롯 템플릿 인스턴스 로드 중 오류:', error);
    return [];
  }
};

// JWT 토큰 영구 저장/로드/삭제
export const saveJwtToken = async (token) => {
  return saveData(STORAGE_KEYS.JWT_TOKEN, token);
};
export const loadJwtToken = async () => {
  return loadData(STORAGE_KEYS.JWT_TOKEN);
};
export const removeJwtToken = async () => {
  return removeData(STORAGE_KEYS.JWT_TOKEN);
};

// 디바이스 ID 영구 저장/로드
export const saveDeviceId = async (deviceId) => {
  return saveData(STORAGE_KEYS.DEVICE_ID, deviceId);
};
export const loadDeviceId = async () => {
  return loadData(STORAGE_KEYS.DEVICE_ID);
}; 