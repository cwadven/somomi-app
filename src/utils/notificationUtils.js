import { isTemplateActive } from './validityUtils';
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
import { loadData, saveData, STORAGE_KEYS, loadAppPrefs, saveData as saveAny } from './storageUtils';

/**
 * 영역 알림을 처리하는 함수
 * @param {Array} notifications - 알림 설정 목록
 * @param {Array} products - 제품 목록
 * @param {Array} locations - 영역 목록
 * @returns {Array} 처리된 알림 정보 배열
 */
export const processLocationNotifications = (notifications, products, locations, templates = []) => {
  const notificationsToSend = [];
  const addLog = (msg, type = 'info') => {
    try {
      if (pushNotificationService && typeof pushNotificationService.addDebugLog === 'function') {
        pushNotificationService.addDebugLog(msg, type);
      }
    } catch (e) {}
  };
  
  // 영역 알림 필터링
  const locationNotifications = notifications.filter(n => n.type === 'location');
  
  const isLocationTemplateExpired = (locId) => {
    try {
      const tpl = (templates || []).find(t => t.usedInLocationId === locId);
      if (!tpl) return false;
      return !isTemplateActive(tpl, null); // 백그라운드 처리에서는 최신 subscription 주입이 어려울 수 있으므로 null 허용
    } catch (e) { return false; }
  };

  for (const locationNotif of locationNotifications) {
    const location = locations.find(loc => (loc.localId === locationNotif.targetId) || (loc.id === locationNotif.targetId));
    if (!location) continue;
    // 비활성화 또는 만료된 영역 제외
    if (location.disabled === true) {
      addLog(`[SKIP] 영역 비활성화: ${location.title} (${location.id})`, 'warning');
      continue;
    }
    const locKey = location.localId || location.id;
    if (isLocationTemplateExpired(locKey)) {
      addLog(`[SKIP] 영역 템플릿 만료: ${location.title} (${location.id})`, 'warning');
      continue;
    }
    
    // 해당 영역에 속한 제품들 찾기 (소진되지 않은 제품만)
    const locationProducts = products.filter(p => {
      const pLocKey = p.locationLocalId || p.locationId;
      return pLocKey === locKey && !p.isConsumed;
    });
    
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
          addLog(`[INCLUDE] 유통기한 알림 대상 제품: ${product.name} (${product.id}) @ ${location.title} (${locKey})`, 'success');
          // 알림 유형 정보 추가
          notification.source_type = 'location';
          notification.source_id = locKey;
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
          addLog(`[INCLUDE] 소진예상 알림 대상 제품: ${product.name} (${product.id}) @ ${location.title} (${locKey})`, 'success');
          // 알림 유형 정보 추가
          notification.source_type = 'location';
          notification.source_id = locKey;
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
export const processProductNotifications = (notifications, products, locations, templates = []) => {
  const notificationsToSend = [];
  const addLog = (msg, type = 'info') => {
    try {
      if (pushNotificationService && typeof pushNotificationService.addDebugLog === 'function') {
        pushNotificationService.addDebugLog(msg, type);
      }
    } catch (e) {}
  };
  
  // 제품 알림 필터링
  const productNotifications = notifications.filter(n => n.type === 'product');
  
  const isLocationTemplateExpired = (locId) => {
    try {
      const tpl = (templates || []).find(t => t.usedInLocationId === locId);
      const exp = tpl?.feature?.expiresAt;
      return !!exp && (Date.now() >= new Date(exp).getTime());
    } catch (e) { return false; }
  };

  for (const productNotif of productNotifications) {
    // 소진되지 않은 제품만 처리 (localId 우선)
    const product = products.find(p => (p.localId === productNotif.targetId || p.id === productNotif.targetId) && !p.isConsumed);
    if (!product) continue;
    
    const locKey = product.locationLocalId || product.locationId;
    const location = locations.find(loc => (loc.localId === locKey) || (loc.id === locKey));
    // 비활성화 또는 만료된 영역 소속 제품 제외
    if (!location) continue;
    if (location.disabled === true) {
      addLog(`[SKIP] 영역 비활성화(제품 제외): ${product.name} (${product.id}) @ ${product.locationId}`, 'warning');
      continue;
    }
    const lkey = location.localId || location.id;
    if (isLocationTemplateExpired(lkey)) {
      addLog(`[SKIP] 영역 템플릿 만료(제품 제외): ${product.name} (${product.id}) @ ${location.title} (${lkey})`, 'warning');
      continue;
    }
    
    // 알림 타입에 따른 처리
    if (productNotif.notifyType === 'expiry' && product.expiryDate) {
      const notification = createExpiryNotification(
        product, 
        location, 
        productNotif.daysBeforeTarget,
        productNotif.id
      );
      
      if (notification) {
        addLog(`[INCLUDE] 유통기한 알림 대상 제품(개별): ${product.name} (${product.id}) @ ${location.title} (${lkey})`, 'success');
        // 알림 유형 정보 추가
        notification.source_type = 'product';
        notification.source_id = product.localId || product.id;
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
        addLog(`[INCLUDE] 소진예상 알림 대상 제품(개별): ${product.name} (${product.id}) @ ${location.title} (${lkey})`, 'success');
        // 알림 유형 정보 추가
        notification.source_type = 'product';
        notification.source_id = product.localId || product.id;
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
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 오늘 자정 기준
  const expiryDate = new Date(product.expiryDate);
  const expiryEndOfDay = new Date(expiryDate);
  expiryEndOfDay.setHours(23, 59, 59, 999); // 대상일 끝 기준
  
  // 남은 일수 계산 (트리거용 - 기존 로직 유지)
  const rawDaysLeft = Math.ceil((expiryEndOfDay - today) / (1000 * 60 * 60 * 24));
  
  // 알림 조건 확인
  if (rawDaysLeft <= daysBeforeTarget && rawDaysLeft >= 0) {
    // 만료 시간은 당일 23:59:59로 설정
    const expireAt = expiryEndOfDay;
    
    // 표시용 남은 일수 보정: 당일 만료인 경우 1일로 표시
    const displayDaysLeft = rawDaysLeft === 0 ? 1 : rawDaysLeft;

    return {
      location_name: location ? location.title : null,
      product_name: product.name,
      notification_type: '유통기한',
      message: `${product.name}의 유통기한이 ${displayDaysLeft}일 남았습니다.`,
      expire_at: expireAt.toISOString(),
      location_id: location ? (location.localId || location.id) : null,
      product_id: product.localId || product.id,
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
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 오늘 자정 기준
  const estimatedDate = new Date(product.estimatedEndDate);
  const estimatedEndOfDay = new Date(estimatedDate);
  estimatedEndOfDay.setHours(23, 59, 59, 999); // 대상일 끝 기준
  
  // 남은 일수 계산 (트리거용 - 기존 로직 유지)
  const rawDaysLeft = Math.ceil((estimatedEndOfDay - today) / (1000 * 60 * 60 * 24));
  
  // 알림 조건 확인
  if (rawDaysLeft <= daysBeforeTarget && rawDaysLeft >= 0) {
    // 만료 시간은 당일 23:59:59로 설정
    const expireAt = estimatedEndOfDay;
    
    // 표시용 남은 일수 보정: 당일인 경우 1일로 표시
    const displayDaysLeft = rawDaysLeft === 0 ? 1 : rawDaysLeft;

    return {
      location_name: location ? location.title : null,
      product_name: product.name,
      notification_type: '소진 예상',
      message: `${product.name}의 소진예상일이 ${displayDaysLeft}일 남았습니다.`,
      expire_at: expireAt.toISOString(),
      location_id: location ? (location.localId || location.id) : null,
      product_id: product.localId || product.id,
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
    const addLog = (msg, type = 'info') => {
      try {
        if (pushNotificationService && typeof pushNotificationService.addDebugLog === 'function') {
          pushNotificationService.addDebugLog(msg, type);
        }
      } catch (e) {}
    };
    addLog('[9시 리마인더] 알림 후보 계산 시작', 'info');
    // 1. 필요한 데이터 로드
    const notifications = await loadData(STORAGE_KEYS.NOTIFICATIONS) || [];
    const products = await loadData(STORAGE_KEYS.PRODUCTS) || [];
    const locations = await loadData(STORAGE_KEYS.LOCATIONS) || [];
    const templates = await loadData(STORAGE_KEYS.USER_LOCATION_TEMPLATES) || [];
    
    // 2. 영역 알림과 제품 알림 처리
    const locationNotificationsToSend = processLocationNotifications(notifications, products, locations, templates);
    const productNotificationsToSend = processProductNotifications(notifications, products, locations, templates);
    
    // 3. 결과 합치기
    const notificationsToSend = [...locationNotificationsToSend, ...productNotificationsToSend];
    addLog(`[9시 리마인더] 후보 합계: ${notificationsToSend.length}건`, notificationsToSend.length > 0 ? 'success' : 'warning');
    
    // 4. 처리된 알림을 오늘 날짜 기준으로 저장
    if (notificationsToSend.length > 0) {
      await saveProcessedNotifications(notificationsToSend);
      
      // 웹 환경이 아니고 skipSending이 false인 경우에만 알림 전송
      if (Platform.OS !== 'web' && !skipSending) {
        const results = await sendNotifications(notificationsToSend);
        addLog(`[9시 리마인더] 전송 완료: ${results?.length || 0}건`, 'success');
      }
    }
    else {
      addLog('[9시 리마인더] 전송할 알림이 없습니다.', 'warning');
    }
    
    return notificationsToSend;
  } catch (error) {
    console.error('알림 처리 중 오류 발생:', error);
    try {
      if (pushNotificationService && typeof pushNotificationService.addDebugLog === 'function') {
        pushNotificationService.addDebugLog(`[오류] 알림 처리 실패: ${error?.message || String(error)}`, 'error');
      }
    } catch (e) {}
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

  // 1) 유통기한/소진예상 알림이 하나라도 존재하면 대표 1건만 전송
  //    나머지 유형은 기존대로 유지
  let finalNotifications = notifications;
  try {
    const expiryList = notifications.filter(n => n.notification_type === '유통기한');
    const estimatedList = notifications.filter(n => n.notification_type === '소진 예상');
    const combinedCount = expiryList.length + estimatedList.length;
    const others = notifications.filter(n => n.notification_type !== '유통기한' && n.notification_type !== '소진 예상');
    if (combinedCount >= 1) {
      const consolidated = {
        notification_type: '리마인더',
        message: '곧 소진 및 유통 기한 만료될 제품이 있습니다. 확인해주세요~',
        expire_at: new Date().toISOString(),
        location_id: null,
        product_id: null,
        notification_id: 'general_consolidated_' + Date.now(),
      };
      finalNotifications = [...others, consolidated];
    } else {
      finalNotifications = notifications;
    }
  } catch (e) {
    finalNotifications = notifications;
  }
  
  for (const notification of finalNotifications) {
    try {
      const title = `${notification.notification_type} 알림`;
      const body = notification.message;
      const data = {
        type: notification.notification_type,
        productId: notification.product_id ? String(notification.product_id) : '',
        locationId: notification.location_id ? String(notification.location_id) : '',
        notificationId: notification.notification_id ? String(notification.notification_id) : '',
        deepLink: 'somomi://notifications'
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
 * 매일 오전 9시에 리마인드 푸시를 보내는 스케줄러
 * - 앱 설정의 알림이 활성화되어 있고
 * - 오늘 보낼 수 있는 알림 후보가 하나라도 있을 때
 * - 중복 발송 방지: 하루 1회 기록
 */
export const scheduleDailyReminderIfNeeded = async () => {
  if (Platform.OS === 'web') return;
  try {
    const prefs = await loadAppPrefs();
    // 강제 활성화: notificationsEnabled와 무관하게 스케줄 진행
    const enabled = true;
    const allow9am = prefs?.remindExpiryEnabled !== false; // 기본 허용, 사용자가 끄면 false
    try { if (pushNotificationService) pushNotificationService.addDebugLog(`[9시] 스케줄 시도 - enabled(forced)=${enabled}, allow9am=${allow9am}`); } catch (e) {}
    if (!allow9am) { try { if (pushNotificationService) pushNotificationService.addDebugLog('[9시] 스킵: 9시 리마인더 스위치 OFF', 'warning'); } catch (e) {}; return; }

    // 오늘 이미 보냈는지 체크
    const sentMap = (await loadData(STORAGE_KEYS.DAILY_REMINDER_SENT)) || {};
    const todayKey = new Date().toISOString().split('T')[0];
    if (sentMap[todayKey]) { try { if (pushNotificationService) pushNotificationService.addDebugLog('[9시] 스킵: 이미 예약/발송 기록 있음', 'warning'); } catch (e) {}; return; }

    // 오늘 보낼 수 있는 알림 후보 계산
    const notifications = await processAllNotifications(true); // 생성만, 전송은 하지 않음
    if (!notifications || notifications.length === 0) { try { if (pushNotificationService) pushNotificationService.addDebugLog('[9시] 스킵: 후보 없음', 'warning'); } catch (e) {}; return; }

    // 오전 9시로 트리거 시간 설정
    const now = new Date();
    const trigger = new Date();
    trigger.setHours(9, 0, 0, 0);
    // 9시가 이미 지난 경우 즉시 전송
    const delaySec = Math.max(0, Math.floor((trigger.getTime() - now.getTime()) / 1000));

    const title = '리마인더 알림';
    const body = '곧 소진 및 유통 기한 만료될 제품이 있습니다. 확인해주세요~';
    const data = { type: 'reminder', deepLink: 'somomi://notifications' };

    let notifId = null;
    if (delaySec === 0) {
      // 9시가 이미 지난 경우에는 즉시 1회 발송
      notifId = await sendImmediateNotification(title, body, data);
      try { if (pushNotificationService) pushNotificationService.addDebugLog(`[9시] 즉시 발송 결과 id=${notifId}`); } catch (e) {}
    }
    // 다음 9시에 매일 반복 예약 (OS가 백그라운드에서도 처리)
    try {
      const dailyId = await pushNotificationService.scheduleDailyLocalNotification(title, body, data, 9, 0);
      try { if (pushNotificationService) pushNotificationService.addDebugLog(`[9시] 매일 반복 예약 완료 id=${dailyId}`); } catch (e) {}
      // 예약 성공 시 notifId를 dailyId로 간주하여 기록 저장 판단에 활용
      if (!notifId) notifId = dailyId;
    } catch (e) {}
 
    // 발송 기록 저장
    if (notifId) {
      sentMap[todayKey] = true;
      await saveAny(STORAGE_KEYS.DAILY_REMINDER_SENT, sentMap);
    } else {
      try { if (pushNotificationService) pushNotificationService.addDebugLog('[9시] 예약/발송 실패: 기록 저장 안함', 'error'); } catch (e) {}
    }
  } catch (error) {
    console.error('리마인더 스케줄링 오류:', error);
  }
};

/**
 * 매일 오후 8시에 작성 리마인드 푸시
 * - 앱 설정의 알림이 활성화되어 있을 때
 * - 중복 발송 방지: 하루 1회 기록
 * - 메시지: "최신화 하셨나요? 오늘의 제품 상태를 업데이트해 주세요."
 */
export const scheduleDailyUpdateReminderIfNeeded = async () => {
  if (Platform.OS === 'web') return;
  try {
    const prefs = await loadAppPrefs();
    // 강제 활성화: notificationsEnabled와 무관하게 스케줄 진행
    const enabled = true;
    const allow8pm = prefs?.remindAddEnabled !== false; // 기본 허용, 사용자가 끄면 false
    try { if (pushNotificationService) pushNotificationService.addDebugLog(`[20시] 스케줄 시도 - enabled(forced)=${enabled}, allow8pm=${allow8pm}`); } catch (e) {}
    if (!allow8pm) { try { if (pushNotificationService) pushNotificationService.addDebugLog('[20시] 스킵: 20시 리마인더 스위치 OFF', 'warning'); } catch (e) {}; return; }

    const sentMap = (await loadData(STORAGE_KEYS.DAILY_UPDATE_REMINDER_SENT)) || {};
    const todayKey = new Date().toISOString().split('T')[0];
    if (sentMap[todayKey]) { try { if (pushNotificationService) pushNotificationService.addDebugLog('[20시] 스킵: 이미 예약/발송 기록 있음', 'warning'); } catch (e) {}; return; }

    // 오후 8시 트리거
    const now = new Date();
    const trigger = new Date();
    trigger.setHours(20, 0, 0, 0);
    const delaySec = Math.max(0, Math.floor((trigger.getTime() - now.getTime()) / 1000));

    const title = '작성 리마인드';
    const body = '최신화 하셨나요? 오늘 구매하거나 배치한 제품을 추가해 주세요.';
    const data = { type: 'update_reminder', deepLink: 'somomi://notifications' };

    let notifId = null;
    if (delaySec === 0) {
      // 20시가 이미 지난 경우에는 즉시 1회 발송
      notifId = await sendImmediateNotification(title, body, data);
      try { if (pushNotificationService) pushNotificationService.addDebugLog(`[20시] 즉시 발송 결과 id=${notifId}`); } catch (e) {}
    }
    // 다음 20시에 매일 반복 예약 (OS가 백그라운드에서도 처리)
    try {
      const dailyId = await pushNotificationService.scheduleDailyLocalNotification(title, body, data, 20, 0);
      try { if (pushNotificationService) pushNotificationService.addDebugLog(`[20시] 매일 반복 예약 완료 id=${dailyId}`); } catch (e) {}
      if (!notifId) notifId = dailyId;
    } catch (e) {}
 
    if (notifId) {
      sentMap[todayKey] = true;
      await saveAny(STORAGE_KEYS.DAILY_UPDATE_REMINDER_SENT, sentMap);
    } else {
      try { if (pushNotificationService) pushNotificationService.addDebugLog('[20시] 예약/발송 실패: 기록 저장 안함', 'error'); } catch (e) {}
    }
  } catch (error) {
    console.error('작성 리마인더 스케줄링 오류:', error);
  }
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
 * 디버깅용: 5초마다 로컬 알림을 예약합니다.
 * - durationSeconds 동안 5초 간격으로 예약(백그라운드에서도 발송)
 * - 너무 많은 예약을 방지하기 위해 최대 300개로 제한
 */
export const scheduleDebugEveryFiveSeconds = async (durationSeconds = 300) => {
  if (Platform.OS === 'web' || !pushNotificationService) return;
  try {
    const total = Math.min(300, Math.floor(durationSeconds / 5));
    for (let i = 1; i <= total; i++) {
      const delay = i * 5; // seconds
      const title = '디버그 알림';
      const body = `5초 주기 테스트 (${i}/${total})`;
      const data = { type: 'debug', index: i, deepLink: 'somomi://notifications' };
      await pushNotificationService.sendLocalNotification(title, body, data, delay);
    }
  } catch (e) {
    console.error('디버그 알림 예약 실패:', e);
  }
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