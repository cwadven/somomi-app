/**
 * ID 생성 유틸리티 함수
 * 
 * 다양한 항목(영역, 제품, 카테고리 등)에 대한 고유 ID를 생성합니다.
 * 
 * 사용 예시:
 * - 영역 ID 생성: generateId('location')
 * - 제품 ID 생성: generateId('product')
 * - 카테고리 ID 생성: generateId('category')
 * - 알림 ID 생성: generateId('notification')
 * 
 * 생성된 ID 형식: "{type}-{timestamp}-{randomString}"
 * 예: "location-1623456789123-a1b2c3"
 */

/**
 * 고유한 ID를 생성하는 함수
 * @param {string} type - ID를 생성할 항목의 유형 (예: 'location', 'product', 'category' 등)
 * @returns {string} 생성된 고유 ID
 */
export const generateId = (type) => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  
  if (type) {
    return `${type}-${timestamp}-${randomStr}`;
  }
  
  return `item-${timestamp}-${randomStr}`;
}; 

/**
 * 간단한 ULID 유사 ID 생성기 (의존성 없이 사용)
 * 실제 ULID 규격은 아니지만, 시간/랜덤 조합으로 충분히 고유합니다.
 */
export const generateUlid = () => {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  return `${time}${rand}`.substring(0, 26);
};

/**
 * 로컬(오프라인) 전용 ID 생성기
 * 형식: `${type}-local-${deviceId}-${ulid}`
 */
export const generateLocalId = (type, deviceId) => {
  const safeType = type || 'item';
  const ulid = generateUlid();
  const safeDeviceId = deviceId || 'dev';
  return `${safeType}-local-${safeDeviceId}-${ulid}`;
};

/**
 * 비동기 로컬 ID 생성기 (AsyncStorage에서 deviceId 로드)
 */
export const generateLocalIdAsync = async (type) => {
  try {
    const { loadDeviceId } = await import('./storageUtils');
    const deviceId = await loadDeviceId();
    return generateLocalId(type, deviceId || 'dev');
  } catch (e) {
    // 폴백: 기존 ID 생성 사용
    return generateId(type);
  }
};

/**
 * 주어진 ID가 로컬(오프라인) ID인지 판별
 */
export const isLocalId = (id, deviceId) => {
  if (!id || typeof id !== 'string') return false;
  if (id.includes('-local-')) {
    if (!deviceId) return true;
    return id.includes(`-local-${deviceId}-`);
  }
  return false;
};