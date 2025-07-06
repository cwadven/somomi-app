import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { pushNotificationService } from './pushNotificationService';

// TaskManager는 웹에서 지원되지 않으므로 조건부 import
let TaskManager;
let BACKGROUND_NOTIFICATION_TASK;

if (Platform.OS !== 'web') {
  TaskManager = require('expo-task-manager');
  // pushNotificationService에서 BACKGROUND_NOTIFICATION_TASK 가져오기
  const { BACKGROUND_NOTIFICATION_TASK: TASK_NAME } = require('./pushNotificationService');
  BACKGROUND_NOTIFICATION_TASK = TASK_NAME;
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

    // 알림 트리거 설정
    const trigger = {
      date: notifyDate,
    };

    // 알림 내용 설정
    const title = `${productName} 유통기한 알림`;
    const body = `${productName}의 유통기한이 ${daysBeforeExpiry}일 남았습니다.`;
    const data = {
      type: 'product',
      productId,
      notificationType: 'expiry',
      daysBeforeExpiry,
      deepLink: `somomi://product/detail/${productId}`
    };

    // 알림 예약
    return await pushNotificationService.scheduleNotification(title, body, data, trigger);
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

    // 알림 트리거 설정
    const trigger = {
      date: notifyDate,
    };

    // 알림 내용 설정
    const title = `${locationName} 알림`;
    const body = message || `${locationName}에 대한 알림입니다.`;
    const data = {
      type: 'location',
      locationId,
      deepLink: `somomi://location/detail/${locationId}`
    };

    // 알림 예약
    return await pushNotificationService.scheduleNotification(title, body, data, trigger);
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
    console.log('웹에서는 알림을 지원하지 않습니다.');
    return null;
  }
  
  try {
    return await pushNotificationService.scheduleNotification(title, body, data);
  } catch (error) {
    console.error('즉시 알림 전송 실패:', error);
    return null;
  }
};

/**
 * 백그라운드 테스트 알림을 보내는 함수
 * @param {string} title - 알림 제목
 * @param {string} body - 알림 내용
 * @param {Object} data - 알림 데이터
 * @param {number} delayInSeconds - 지연 시간(초)
 * @returns {Promise<string>} - 알림 ID
 */
export const sendBackgroundNotification = async (title, body, data = {}, delayInSeconds = 10) => {
  if (Platform.OS === 'web') {
    console.log('웹에서는 백그라운드 알림을 지원하지 않습니다.');
    return null;
  }
  
  try {
    return await pushNotificationService.scheduleBackgroundNotification(title, body, data, delayInSeconds);
  } catch (error) {
    console.error('백그라운드 알림 전송 실패:', error);
    return null;
  }
};

/**
 * 알림 권한을 요청하는 함수
 * @returns {Promise<boolean>} - 권한 부여 여부
 */
export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'web') {
    console.log('웹에서는 알림 권한을 지원하지 않습니다.');
    return false;
  }
  
  return await pushNotificationService.requestNotificationPermission();
};

/**
 * 푸시 알림 등록 함수
 * @returns {Promise<string>} - 푸시 토큰
 */
export const registerForPushNotifications = async () => {
  if (Platform.OS === 'web') {
    console.log('웹에서는 푸시 알림을 지원하지 않습니다.');
    return null;
  }
  
  return await pushNotificationService.registerForPushNotifications();
};

/**
 * 알림 취소 함수
 * @param {string} notificationId - 취소할 알림 ID
 */
export const cancelNotification = async (notificationId) => {
  if (Platform.OS === 'web') {
    console.log('웹에서는 알림 취소를 지원하지 않습니다.');
    return;
  }
  
  await pushNotificationService.cancelNotification(notificationId);
};

/**
 * 모든 알림 취소 함수
 */
export const cancelAllNotifications = async () => {
  if (Platform.OS === 'web') {
    console.log('웹에서는 알림 취소를 지원하지 않습니다.');
    return;
  }
  
  await pushNotificationService.cancelAllNotifications();
};

/**
 * 알림 설정 초기화 함수
 */
export const initializeNotifications = () => {
  if (Platform.OS === 'web') {
    console.log('웹에서는 알림 초기화를 지원하지 않습니다.');
    return;
  }
  
  pushNotificationService.setupNotificationHandler();
};

/**
 * 알림 설정 정리 함수
 */
export const cleanupNotifications = () => {
  if (Platform.OS === 'web') {
    console.log('웹에서는 알림 정리를 지원하지 않습니다.');
    return;
  }
  
  pushNotificationService.cleanupNotificationHandler();
};

/**
 * 백그라운드 알림 태스크 등록 함수
 */
export const registerBackgroundNotificationTask = async () => {
  if (Platform.OS === 'web') {
    console.log('웹에서는 백그라운드 알림 태스크를 지원하지 않습니다.');
    return;
  }
  
  if (!TaskManager || !BACKGROUND_NOTIFICATION_TASK) {
    console.error('TaskManager 또는 BACKGROUND_NOTIFICATION_TASK가 정의되지 않았습니다.');
    return;
  }
  
  if (!TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK)) {
    console.log('백그라운드 알림 태스크 정의...');
    TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error, executionInfo }) => {
      if (error) {
        console.error('백그라운드 알림 처리 오류:', error);
        return;
      }
      
      if (data) {
        const { notification } = data;
        console.log('백그라운드에서 알림 수신:', notification);
      }
    });
  }
  
  try {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    console.log('백그라운드 알림 태스크 등록 성공');
  } catch (error) {
    console.error('백그라운드 알림 태스크 등록 실패:', error);
  }
}; 