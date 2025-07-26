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