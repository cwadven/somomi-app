import { Platform } from 'react-native';

// Firebase 관련 모듈은 웹이 아닌 환경에서만 import
let messaging;
let pushNotificationService;

// 웹 환경이 아닌 경우에만 Firebase 모듈 로드
if (Platform.OS !== 'web') {
  try {
    messaging = require('@react-native-firebase/messaging').default;
    pushNotificationService = require('./pushNotificationService').pushNotificationService;
  } catch (error) {
    console.error('Firebase 모듈 로드 실패:', error);
  }
}

// 알림 데이터 처리를 위한 import 추가
import { loadData, saveData, STORAGE_KEYS } from './storageUtils';

/**
 * 영역 알림을 처리하는 함수
 * @param {Array} notifications - 알림 설정 목록
 * @param {Array} products - 제품 목록
 * @param {Array} locations - 영역 목록
 * @returns {Array} 처리된 알림 정보 배열
 */
export const processLocationNotifications = (notifications, products, locations) => {
  const notificationsToSend = [];
  
  // 영역 알림 필터링
  const locationNotifications = notifications.filter(n => n.type === 'location');
  
  for (const locationNotif of locationNotifications) {
    const location = locations.find(loc => loc.id === locationNotif.targetId);
    if (!location) continue;
    
    // 해당 영역에 속한 제품들 찾기 (소진되지 않은 제품만)
    const locationProducts = products.filter(p => 
      p.locationId === locationNotif.targetId && !p.isConsumed
    );
    
    for (const product of locationProducts) {
      // 제품 알림 설정 확인
      const productNotif = notifications.find(n => 
        n.type === 'product' && 
        n.targetId === product.id
      );
      
      // 영역 알림 무시 설정이 true인 제품은 건너뜀
      if (productNotif && productNotif.ignoreLocationNotification === true) {
        continue;
      }
      
      // 알림 타입에 따른 처리
      if (locationNotif.notifyType === 'expiry' && product.expiryDate) {
        const notification = createExpiryNotification(
          product, 
          location, 
          locationNotif.daysBeforeTarget,
          locationNotif.id
        );
        
        if (notification) {
          // 알림 유형 정보 추가
          notification.source_type = 'location';
          notification.source_id = location.id;
          notification.source_name = location.title;
          
          notificationsToSend.push(notification);
        }
      } else if (locationNotif.notifyType === 'estimated' && product.estimatedEndDate) {
        const notification = createEstimatedNotification(
          product, 
          location, 
          locationNotif.daysBeforeTarget,
          locationNotif.id
        );
        
        if (notification) {
          // 알림 유형 정보 추가
          notification.source_type = 'location';
          notification.source_id = location.id;
          notification.source_name = location.title;
          
          notificationsToSend.push(notification);
        }
      }
    }
  }
  
  return notificationsToSend;
};

/**
 * 제품 알림을 처리하는 함수
 * @param {Array} notifications - 알림 설정 목록
 * @param {Array} products - 제품 목록
 * @param {Array} locations - 영역 목록
 * @returns {Array} 처리된 알림 정보 배열
 */
export const processProductNotifications = (notifications, products, locations) => {
  const notificationsToSend = [];
  
  // 제품 알림 필터링
  const productNotifications = notifications.filter(n => n.type === 'product');
  
  for (const productNotif of productNotifications) {
    // 소진되지 않은 제품만 처리
    const product = products.find(p => p.id === productNotif.targetId && !p.isConsumed);
    if (!product) continue;
    
    const location = locations.find(loc => loc.id === product.locationId);
    
    // 알림 타입에 따른 처리
    if (productNotif.notifyType === 'expiry' && product.expiryDate) {
      const notification = createExpiryNotification(
        product, 
        location, 
        productNotif.daysBeforeTarget,
        productNotif.id
      );
      
      if (notification) {
        // 알림 유형 정보 추가
        notification.source_type = 'product';
        notification.source_id = product.id;
        notification.source_name = product.name;
        
        notificationsToSend.push(notification);
      }
    } else if (productNotif.notifyType === 'estimated' && product.estimatedEndDate) {
      const notification = createEstimatedNotification(
        product, 
        location, 
        productNotif.daysBeforeTarget,
        productNotif.id
      );
      
      if (notification) {
        // 알림 유형 정보 추가
        notification.source_type = 'product';
        notification.source_id = product.id;
        notification.source_name = product.name;
        
        notificationsToSend.push(notification);
      }
    }
  }
  
  return notificationsToSend;
};

/**
 * 유통기한 알림 정보를 생성하는 함수
 * @param {Object} product - 제품 정보
 * @param {Object} location - 영역 정보 (nullable)
 * @param {number} daysBeforeTarget - 알림 발생 기준 일수
 * @param {string} notificationId - 알림 설정 ID
 * @returns {Object|null} 알림 정보 객체 또는 null
 */
export const createExpiryNotification = (product, location, daysBeforeTarget, notificationId) => {
  const expiryDate = new Date(product.expiryDate);
  const today = new Date();
  
  // 남은 일수 계산
  const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
  
  // 알림 조건 확인
  if (daysLeft <= daysBeforeTarget && daysLeft >= 0) {
    // 만료 시간은 당일 23:59:59로 설정
    const expireAt = new Date(expiryDate);
    expireAt.setHours(23, 59, 59, 999);
    
    return {
      location_name: location ? location.title : null,
      product_name: product.name,
      notification_type: '유통기한',
      message: `${product.name}의 유통기한이 ${daysLeft}일 남았습니다.`,
      expire_at: expireAt.toISOString(),
      location_id: location ? location.id : null,
      product_id: product.id,
      notification_id: notificationId
    };
  }
  
  return null;
};

/**
 * 소진예상 알림 정보를 생성하는 함수
 * @param {Object} product - 제품 정보
 * @param {Object} location - 영역 정보 (nullable)
 * @param {number} daysBeforeTarget - 알림 발생 기준 일수
 * @param {string} notificationId - 알림 설정 ID
 * @returns {Object|null} 알림 정보 객체 또는 null
 */
export const createEstimatedNotification = (product, location, daysBeforeTarget, notificationId) => {
  const estimatedDate = new Date(product.estimatedEndDate);
  const today = new Date();
  
  // 남은 일수 계산
  const daysLeft = Math.ceil((estimatedDate - today) / (1000 * 60 * 60 * 24));
  
  // 알림 조건 확인
  if (daysLeft <= daysBeforeTarget && daysLeft >= 0) {
    // 만료 시간은 당일 23:59:59로 설정
    const expireAt = new Date(estimatedDate);
    expireAt.setHours(23, 59, 59, 999);
    
    return {
      location_name: location ? location.title : null,
      product_name: product.name,
      notification_type: '소진 예상',
      message: `${product.name}의 소진예상일이 ${daysLeft}일 남았습니다.`,
      expire_at: expireAt.toISOString(),
      location_id: location ? location.id : null,
      product_id: product.id,
      notification_id: notificationId
    };
  }
  
  return null;
};

/**
 * 모든 알림을 처리하고 보낼 알림 목록을 생성하는 함수
 * @param {boolean} skipSending - true일 경우 알림 전송을 건너뜁니다.
 * @returns {Promise<Array>} 알림 정보 배열
 */
export const processAllNotifications = async (skipSending = false) => {
  try {
    // 1. 필요한 데이터 로드
    const notifications = await loadData(STORAGE_KEYS.NOTIFICATIONS) || [];
    const products = await loadData(STORAGE_KEYS.PRODUCTS) || [];
    const locations = await loadData(STORAGE_KEYS.LOCATIONS) || [];
    
    // 2. 영역 알림과 제품 알림 처리
    const locationNotificationsToSend = processLocationNotifications(notifications, products, locations);
    const productNotificationsToSend = processProductNotifications(notifications, products, locations);
    
    // 3. 결과 합치기
    const notificationsToSend = [...locationNotificationsToSend, ...productNotificationsToSend];
    
    // 4. 처리된 알림을 오늘 날짜 기준으로 저장
    if (notificationsToSend.length > 0) {
      await saveProcessedNotifications(notificationsToSend);
      
      // 웹 환경이 아니고 skipSending이 false인 경우에만 알림 전송
      if (Platform.OS !== 'web' && !skipSending) {
        await sendNotifications(notificationsToSend);
      }
    }
    
    return notificationsToSend;
  } catch (error) {
    console.error('알림 처리 중 오류 발생:', error);
    return [];
  }
};

/**
 * 처리된 알림을 오늘 날짜 기준으로 저장하는 함수
 * @param {Array} notifications - 저장할 알림 목록
 * @returns {Promise<boolean>} 저장 성공 여부
 */
export const saveProcessedNotifications = async (notifications) => {
  try {
    // 1. 기존 저장된 알림 데이터 로드
    const savedNotifications = await loadData(STORAGE_KEYS.PROCESSED_NOTIFICATIONS) || {};
    
    // 2. 오늘 날짜를 키로 사용 (YYYY-MM-DD 형식)
    const today = new Date().toISOString().split('T')[0];
    
    // 3. 오늘 날짜에 해당하는 알림 데이터 업데이트
    savedNotifications[today] = notifications;
    
    // 4. 저장
    await saveData(STORAGE_KEYS.PROCESSED_NOTIFICATIONS, savedNotifications);
    
    return true;
  } catch (error) {
    console.error('알림 저장 중 오류 발생:', error);
    return false;
  }
};

/**
 * 저장된 알림을 불러오는 함수
 * @param {string} date - 불러올 날짜 (YYYY-MM-DD 형식, 기본값은 오늘)
 * @returns {Promise<Array>} 해당 날짜의 알림 목록
 */
export const loadProcessedNotifications = async (date) => {
  try {
    // 1. 날짜가 지정되지 않은 경우 오늘 날짜 사용
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // 2. 저장된 알림 데이터 로드
    const savedNotifications = await loadData(STORAGE_KEYS.PROCESSED_NOTIFICATIONS) || {};
    
    // 3. 해당 날짜의 알림 반환
    return savedNotifications[targetDate] || [];
  } catch (error) {
    console.error('알림 로드 중 오류 발생:', error);
    return [];
  }
};

/**
 * 모든 저장된 알림을 날짜별로 불러오는 함수
 * @returns {Promise<Object>} 날짜별 알림 목록 객체
 */
export const loadAllProcessedNotifications = async () => {
  try {
    // 저장된 알림 데이터 로드
    const savedNotifications = await loadData(STORAGE_KEYS.PROCESSED_NOTIFICATIONS) || {};
    return savedNotifications;
  } catch (error) {
    console.error('모든 알림 로드 중 오류 발생:', error);
    return {};
  }
};

/**
 * 알림을 실제로 전송하는 함수
 * @param {Array} notifications - 전송할 알림 목록
 * @returns {Promise<Array>} 전송 결과 배열
 */
export const sendNotifications = async (notifications) => {
  // 웹 환경이거나 알림 서비스를 사용할 수 없는 경우
  if (Platform.OS === 'web' || !pushNotificationService) {
    console.log('웹 환경이거나 알림 서비스를 사용할 수 없습니다.');
    
    // 알림 데이터는 저장
    if (notifications.length > 0) {
      await saveProcessedNotifications(notifications);
    }
    
    // 알림 전송은 건너뛰고 성공으로 처리
    return notifications.map(notification => ({
      success: true,
      notification,
      notificationId: 'web-' + Date.now()
    }));
  }
  
  const results = [];
  
  for (const notification of notifications) {
    try {
      const title = `${notification.notification_type} 알림`;
      const body = notification.message;
      const data = {
        type: notification.notification_type,
        productId: notification.product_id,
        locationId: notification.location_id,
        notificationId: notification.notification_id,
        deepLink: `somomi://product/detail/${notification.product_id}`
      };
      
      const notificationId = await sendImmediateNotification(title, body, data);
      
      results.push({
        success: !!notificationId,
        notification,
        notificationId
      });
    } catch (error) {
      console.error('알림 전송 실패:', error);
      results.push({
        success: false,
        notification,
        error: error.message
      });
    }
  }
  
  return results;
};

/**
 * 제품 알림을 스케줄링하는 함수
 * @param {string} productId - 제품 ID
 * @param {string} productName - 제품 이름
 * @param {Date} expiryDate - 유통기한
 * @param {number} daysBeforeExpiry - 유통기한 몇 일 전에 알림을 보낼지
 * @returns {Promise<string>} - 알림 ID
 */
export const scheduleProductExpiryNotification = async (
  productId,
  productName,
  expiryDate,
  daysBeforeExpiry = 3
) => {
  if (Platform.OS === 'web' || !pushNotificationService) {
    console.log('웹 환경이거나 알림 서비스를 사용할 수 없습니다.');
    return null;
  }

  if (!productId || !productName || !expiryDate) {
    console.error('필수 정보가 누락되었습니다.');
    return null;
  }

  try {
    // 알림 날짜 계산 (유통기한 - daysBeforeExpiry일)
    const notifyDate = new Date(expiryDate);
    notifyDate.setDate(notifyDate.getDate() - daysBeforeExpiry);

    // 현재 시간과 비교하여 과거인 경우 알림을 예약하지 않음
    const now = new Date();
    if (notifyDate <= now) {
      console.log('알림 날짜가 이미 지났습니다.');
      return null;
    }

    // 알림 발송 시간까지의 초 계산
    const delayInSeconds = Math.floor((notifyDate.getTime() - now.getTime()) / 1000);

    // 알림 내용 설정
    const title = `${productName} 유통기한 알림`;
    // 0일인 경우 당일 알림 메시지 사용
    const body = daysBeforeExpiry === 0
      ? `${productName}의 유통기한이 오늘까지입니다.`
      : `${productName}의 유통기한이 ${daysBeforeExpiry}일 남았습니다.`;
    
    const data = {
      type: 'product',
      productId,
      notificationType: 'expiry',
      daysBeforeExpiry,
      deepLink: `somomi://product/detail/${productId}`
    };

    // 알림 예약
    return await pushNotificationService.sendLocalNotification(title, body, data, delayInSeconds);
  } catch (error) {
    console.error('제품 유통기한 알림 예약 실패:', error);
    return null;
  }
};

/**
 * 위치 알림을 스케줄링하는 함수
 * @param {string} locationId - 위치 ID
 * @param {string} locationName - 위치 이름
 * @param {string} message - 알림 메시지
 * @param {Date} notifyDate - 알림 날짜
 * @returns {Promise<string>} - 알림 ID
 */
export const scheduleLocationNotification = async (
  locationId,
  locationName,
  message,
  notifyDate
) => {
  if (Platform.OS === 'web' || !pushNotificationService) {
    console.log('웹 환경이거나 알림 서비스를 사용할 수 없습니다.');
    return null;
  }

  if (!locationId || !locationName || !notifyDate) {
    console.error('필수 정보가 누락되었습니다.');
    return null;
  }

  try {
    // 현재 시간과 비교하여 과거인 경우 알림을 예약하지 않음
    const now = new Date();
    if (notifyDate <= now) {
      console.log('알림 날짜가 이미 지났습니다.');
      return null;
    }

    // 알림 발송 시간까지의 초 계산
    const delayInSeconds = Math.floor((notifyDate.getTime() - now.getTime()) / 1000);

    // 알림 내용 설정
    const title = `${locationName} 알림`;
    const body = message || `${locationName}에 대한 알림입니다.`;
    const data = {
      type: 'location',
      locationId,
      deepLink: `somomi://location/detail/${locationId}`
    };

    // 알림 예약
    return await pushNotificationService.sendLocalNotification(title, body, data, delayInSeconds);
  } catch (error) {
    console.error('위치 알림 예약 실패:', error);
    return null;
  }
};

/**
 * 즉시 알림을 보내는 함수
 * @param {string} title - 알림 제목
 * @param {string} body - 알림 내용
 * @param {Object} data - 알림 데이터
 * @returns {Promise<string>} - 알림 ID
 */
export const sendImmediateNotification = async (title, body, data = {}) => {
  if (Platform.OS === 'web') {
    console.log('웹 환경에서는 알림을 지원하지 않습니다.');
    return null;
  }
  
  // 알림 서비스가 초기화되지 않았는지 확인
  if (!pushNotificationService) {
    console.error('알림 서비스가 초기화되지 않았습니다.');
    return null;
  }
  
  // 안전하게 알림 전송
  return new Promise((resolve) => {
    try {
      // 알림 전송 전 안전 확인
      if (!title || typeof title !== 'string') {
        console.error('알림 제목이 유효하지 않습니다:', title);
        title = '알림';
      }
      
      if (!body || typeof body !== 'string') {
        console.error('알림 내용이 유효하지 않습니다:', body);
        body = '새로운 알림이 있습니다.';
      }
      
      if (!data || typeof data !== 'object') {
        console.error('알림 데이터가 유효하지 않습니다:', data);
        data = {};
      }
      
      // 비동기 작업을 setTimeout으로 감싸서 메인 스레드 차단 방지
      setTimeout(async () => {
        try {
          // 알림 전송
          const notificationId = await pushNotificationService.sendLocalNotification(title, body, data, 0);
          resolve(notificationId);
        } catch (innerError) {
          console.error('알림 전송 내부 오류:', innerError);
          resolve(null); // 오류가 발생해도 Promise는 resolve
        }
      }, 0);
    } catch (outerError) {
      console.error('즉시 알림 전송 준비 오류:', outerError);
      resolve(null); // 오류가 발생해도 Promise는 resolve
    }
  });
};

/**
 * 지연 알림을 보내는 함수
 * @param {string} title - 알림 제목
 * @param {string} body - 알림 내용
 * @param {Object} data - 알림 데이터
 * @param {number} delayInSeconds - 지연 시간(초)
 * @returns {Promise<string>} - 알림 ID
 */
export const sendBackgroundNotification = async (title, body, data = {}, delayInSeconds = 3) => {
  if (Platform.OS === 'web' || !pushNotificationService) {
    console.log('웹 환경이거나 알림 서비스를 사용할 수 없습니다.');
    return null;
  }
  
  try {
    return await pushNotificationService.sendLocalNotification(title, body, data, delayInSeconds);
  } catch (error) {
    console.error('지연 알림 전송 실패:', error);
    return null;
  }
};

/**
 * 알림 권한을 요청하는 함수
 * @returns {Promise<boolean>} - 권한 부여 여부
 */
export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'web' || !pushNotificationService) {
    console.log('웹 환경이거나 알림 서비스를 사용할 수 없습니다.');
    return false;
  }
  
  return await pushNotificationService.requestNotificationPermission();
};

/**
 * 푸시 알림 등록 함수
 * @returns {Promise<string>} - 푸시 토큰
 */
export const registerForPushNotifications = async () => {
  if (Platform.OS === 'web' || !pushNotificationService) {
    console.log('웹 환경이거나 알림 서비스를 사용할 수 없습니다.');
    return null;
  }
  
  return await pushNotificationService.registerForPushNotifications();
};

/**
 * 알림 취소 함수
 * @param {string} notificationId - 취소할 알림 ID
 */
export const cancelNotification = async (notificationId) => {
  if (Platform.OS === 'web' || !pushNotificationService) {
    console.log('웹 환경이거나 알림 서비스를 사용할 수 없습니다.');
    return;
  }
  
  await pushNotificationService.cancelNotification(notificationId);
};

/**
 * 모든 알림 취소 함수
 */
export const cancelAllNotifications = async () => {
  if (Platform.OS === 'web' || !pushNotificationService) {
    console.log('웹 환경이거나 알림 서비스를 사용할 수 없습니다.');
    return;
  }
  
  await pushNotificationService.cancelAllNotifications();
};

/**
 * 알림 설정 초기화 함수
 */
export const initializeNotifications = () => {
  if (Platform.OS === 'web' || !pushNotificationService || !messaging) {
    console.log('웹 환경이거나 알림 서비스를 사용할 수 없습니다.');
    return;
  }
  
  try {
    // 알림 채널 생성
    if (Platform.OS === 'android' && notifee) {
      notifee.createChannel({
        id: 'default',
        name: '일반 알림',
        importance: notifee.AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      }).then(() => {
        console.log('기본 알림 채널 생성 완료');
      }).catch(err => {
        console.error('알림 채널 생성 오류:', err);
      });
    }
    
    // null 체크 후 호출
    if (pushNotificationService && typeof pushNotificationService.setupNotificationHandler === 'function') {
      pushNotificationService.setupNotificationHandler();
    } else {
      console.log('알림 서비스 초기화 실패: 서비스 객체 또는 메서드가 없음');
    }
    
    console.log('알림 초기화 완료');
  } catch (error) {
    console.error('알림 초기화 실패:', error);
  }
};

/**
 * 알림 설정 정리 함수
 */
export const cleanupNotifications = () => {
  if (Platform.OS === 'web' || !pushNotificationService) {
    console.log('웹 환경이거나 알림 서비스를 사용할 수 없습니다.');
    return;
  }
  
  try {
    // null 체크 후 호출
    if (pushNotificationService && typeof pushNotificationService.cleanupNotificationHandler === 'function') {
      pushNotificationService.cleanupNotificationHandler();
    } else {
      console.log('알림 서비스 정리 실패: 서비스 객체 또는 메서드가 없음');
    }
  } catch (error) {
    console.error('알림 정리 실패:', error);
  }
}; 