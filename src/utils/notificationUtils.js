import { Platform } from 'react-native';

// Firebase 관련 모듈은 웹이 아닌 환경에서만 import
let messaging;
let pushNotificationService;

if (Platform.OS !== 'web') {
  try {
    messaging = require('@react-native-firebase/messaging').default;
    pushNotificationService = require('./pushNotificationService').pushNotificationService;
  } catch (error) {
    console.error('Firebase 모듈 로드 실패:', error);
  }
}

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
  // Firebase Cloud Messaging 백그라운드 핸들러 설정
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('백그라운드 메시지 처리:', remoteMessage);
    return Promise.resolve();
  });
  
  pushNotificationService.setupNotificationHandler();
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
  pushNotificationService.cleanupNotificationHandler();
  } catch (error) {
    console.error('알림 정리 실패:', error);
  }
}; 