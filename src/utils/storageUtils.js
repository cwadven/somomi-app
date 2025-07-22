import AsyncStorage from '@react-native-async-storage/async-storage';

// 스토리지 키 상수
export const STORAGE_KEYS = {
  PRODUCTS: 'somomi_products',
  LOCATIONS: 'somomi_locations',
  CATEGORIES: 'somomi_categories',
  NOTIFICATIONS: 'somomi_notifications',
  CONSUMED_PRODUCTS: 'somomi_consumed_products',
  PROCESSED_NOTIFICATIONS: 'somomi_processed_notifications',
  USER_SLOTS: 'somomi_user_slots', // 사용자 슬롯 정보
};

// 데이터 저장 함수
export const saveData = async (key, data) => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonValue);
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
    return jsonValue != null ? JSON.parse(jsonValue) : null;
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

// 사용자 슬롯 정보 저장 함수
export const saveUserSlots = async (slots) => {
  try {
    await saveData(STORAGE_KEYS.USER_SLOTS, slots);
    console.log('사용자 슬롯 정보가 저장되었습니다:', slots);
    return true;
  } catch (error) {
    console.error('사용자 슬롯 정보 저장 중 오류:', error);
    return false;
  }
};

// 사용자 슬롯 정보 로드 함수
export const loadUserSlots = async () => {
  try {
    const slots = await loadData(STORAGE_KEYS.USER_SLOTS);
    console.log('사용자 슬롯 정보 로드:', slots);
    return slots;
  } catch (error) {
    console.error('사용자 슬롯 정보 로드 중 오류:', error);
    return null;
  }
}; 