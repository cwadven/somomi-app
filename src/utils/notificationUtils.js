import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { pushNotificationService } from './pushNotificationService';

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
  try {
    return await pushNotificationService.scheduleNotification(title, body, data);
  } catch (error) {
    console.error('즉시 알림 전송 실패:', error);
    return null;
  }
};

/**
 * 알림 권한을 요청하는 함수
 * @returns {Promise<boolean>} - 권한 부여 여부
 */
export const requestNotificationPermissions = async () => {
  return await pushNotificationService.requestNotificationPermission();
};

/**
 * 푸시 알림 등록 함수
 * @returns {Promise<string>} - 푸시 토큰
 */
export const registerForPushNotifications = async () => {
  return await pushNotificationService.registerForPushNotifications();
};

/**
 * 알림 취소 함수
 * @param {string} notificationId - 취소할 알림 ID
 */
export const cancelNotification = async (notificationId) => {
  await pushNotificationService.cancelNotification(notificationId);
};

/**
 * 모든 알림 취소 함수
 */
export const cancelAllNotifications = async () => {
  await pushNotificationService.cancelAllNotifications();
};

/**
 * 알림 설정 초기화 함수
 */
export const initializeNotifications = () => {
  pushNotificationService.setupNotificationHandler();
};

/**
 * 알림 설정 정리 함수
 */
export const cleanupNotifications = () => {
  pushNotificationService.cleanupNotificationHandler();
}; 