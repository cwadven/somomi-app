import { Platform, AppState } from 'react-native';
import messaging from '@react-native-firebase/messaging';
// import { apiClient } from '../api/client'; // 일단 무시하고 주석처리
import { Linking, NativeEventEmitter, NativeModules } from 'react-native';
import notifee, { 
  AndroidImportance, 
  TriggerType,
  TimeUnit,
  RepeatFrequency,
} from '@notifee/react-native';
import { registerDeviceToken } from '../api/pushApi';
import { savePushDeviceToken } from './storageUtils';

// 웹 환경에서는 PermissionsAndroid를 조건부로 가져옴
let PermissionsAndroid;
if (Platform.OS === 'android') {
  try {
    PermissionsAndroid = require('react-native').PermissionsAndroid;
  } catch (error) {
    console.error('PermissionsAndroid is not available on this platform:', error);
  }
}

// 앱 시작 시 Notifee 초기화
if (Platform.OS !== 'web') {
  try {
    // Notifee 초기화 및 기본 설정
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      console.log('Notifee 백그라운드 이벤트:', type, detail);
      return Promise.resolve();
    });
  } catch (error) {
    console.error('Notifee 초기화 오류:', error);
  }
}

// 알림 처리 중인지 확인하는 플래그
let isHandlingNotification = false;

// 앱 시작 시 한 번만 알림 채널 생성
let channelsCreated = false;

// 디버깅 로그 관리
const MAX_LOGS = 100;
let debugLogs = [];
let debugCallback = null;

// 디버깅 로그 추가 함수
const addDebugLog = (message, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
  const log = { message, timestamp, type };
  
  // 콘솔에도 출력
  const logPrefix = `[${type.toUpperCase()}]`;
  switch (type) {
    case 'error':
      console.error(logPrefix, message);
      break;
    case 'warning':
      console.warn(logPrefix, message);
      break;
    default:
      console.log(logPrefix, message);
  }
  
  // 로그 배열에 추가
  debugLogs.push(log);
  
  // 최대 로그 수 제한
  if (debugLogs.length > MAX_LOGS) {
    debugLogs.shift();
  }
  
  // 콜백 함수가 있으면 호출
  if (debugCallback && typeof debugCallback === 'function') {
    debugCallback(debugLogs);
  }
};

// 로그 초기화
const clearDebugLogs = () => {
  debugLogs = [];
  if (debugCallback) {
    debugCallback(debugLogs);
  }
};

class PushNotificationService {
  // 앱 상태 리스너
  appStateListener = null;
  notificationReceivedListener = null;
  notificationResponseListener = null;
  nativeNotificationListener = null;

  // 디버깅 콜백 설정
  setDebugCallback(callback) {
    debugCallback = callback;
    // 이미 로그가 있으면 바로 전달
    if (debugLogs.length > 0 && callback) {
      callback(debugLogs);
    }
  }
  
  // 푸시 알림 서비스 초기화
  async initialize() {
    try {
      this.addDebugLog('푸시 알림 서비스 초기화 시작');
      
      // 알림 핸들러 설정
      this.setupNotificationHandler();
      
      // 알림 권한 요청 및 토큰 등록
      const token = await this.registerForPushNotifications();
      if (token) {
        this.addDebugLog(`푸시 알림 토큰 획득: ${token}`);
      }
      
      this.addDebugLog('푸시 알림 서비스 초기화 완료');
      return token;
    } catch (error) {
      this.addDebugLog(`푸시 알림 서비스 초기화 오류: ${error.message}`, 'error');
      return null;
    }
  }

  // 디버그 로그 가져오기
  getDebugLogs() {
    return debugLogs;
  }
  
  // 로그 초기화
  clearDebugLogs() {
    clearDebugLogs();
  }
  
  // 로그 추가 메서드 - 외부에서 호출 가능
  addDebugLog(message, type = 'info') {
    addDebugLog(message, type);
  }
  
  // 로컬 알림 전송 메서드
  async sendLocalNotification(title, body, data = {}, delayInSeconds = 0) {
    if (Platform.OS === 'web') {
      addDebugLog('웹 환경에서는 알림을 지원하지 않습니다.', 'info');
      return null;
    }
    
    try {
      // 알림 채널 생성 확인
      await this.createNotificationChannels();
      
      // 알림 채널 ID 설정
      const channelId = 'default';
      
      // 알림 ID 생성
      const notificationId = `notification_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      // data 값을 모두 문자열로 정규화
      const normalizeData = (raw) => {
        const result = {};
        try {
          Object.entries(raw || {}).forEach(([key, value]) => {
            if (value === null || value === undefined) return;
            result[String(key)] = String(value);
          });
        } catch (e) {}
        return result;
      };

      // 알림 설정 - 최소한의 필수 속성만 설정
      const notificationConfig = {
        id: notificationId,
        title: title || '알림',
        body: body || '',
        data: normalizeData(data),
      };
      
      // 안드로이드 설정 추가
      if (Platform.OS === 'android') {
        notificationConfig.android = {
          channelId,
          smallIcon: 'ic_stat_notification',
          pressAction: {
            id: 'default',
          },
          importance: AndroidImportance.HIGH,
        };
      }
      
      // iOS 설정 추가
      if (Platform.OS === 'ios') {
        notificationConfig.ios = {
          sound: 'default',
        };
      }
      
      // 지연 알림인 경우
      if (delayInSeconds > 0) {
        addDebugLog(`${delayInSeconds}초 후 알림 예약: ${title}`, 'info');
        
        let trigger = null;
        
        // 플랫폼별 트리거 설정
        if (Platform.OS === 'android') {
          // 안드로이드는 timestamp 트리거 사용
          const timestamp = Date.now() + (delayInSeconds * 1000);
          trigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: timestamp,
          };
        } else if (Platform.OS === 'ios') {
          // iOS는 interval 트리거 사용
          trigger = {
            type: TriggerType.INTERVAL,
            interval: delayInSeconds,
            timeUnit: TimeUnit.SECONDS,
          };
        }
        
        if (trigger) {
          // 알림 예약
          await notifee.createTriggerNotification(notificationConfig, trigger);
          addDebugLog(`알림 예약 완료: ID=${notificationId}`, 'success');
        } else {
          // 트리거를 지원하지 않는 경우 즉시 알림으로 대체
          addDebugLog(`지연 알림을 지원하지 않는 플랫폼이므로 즉시 알림으로 대체합니다.`, 'warning');
          await notifee.displayNotification(notificationConfig);
          addDebugLog(`즉시 알림으로 대체 완료: ID=${notificationId}`, 'success');
        }
      } else {
        // 즉시 알림
        addDebugLog(`즉시 알림 전송: ${title}`, 'info');
        await notifee.displayNotification(notificationConfig);
        addDebugLog(`알림 전송 완료: ID=${notificationId}`, 'success');
      }
      
      return notificationId;
    } catch (error) {
      addDebugLog(`알림 전송 오류: ${error.message}`, 'error');
      return null;
    }
  }

  // 매일 특정 시각에 반복 알림 예약 (OS가 백그라운드에서도 처리)
  async scheduleDailyLocalNotification(title, body, data = {}, hour = 9, minute = 0) {
    if (Platform.OS === 'web') {
      addDebugLog('웹 환경에서는 알림을 지원하지 않습니다.', 'info');
      return null;
    }
    try {
      await this.createNotificationChannels();
      const channelId = 'default';
      // 고정 ID 사용: 동일 스케줄 재설정 시 항상 1개만 유지
      const notificationId = `daily_${String(hour).padStart(2, '0')}_${String(minute).padStart(2, '0')}`;

      const normalizeData = (raw) => {
        const result = {};
        try {
          Object.entries(raw || {}).forEach(([key, value]) => {
            if (value === null || value === undefined) return;
            result[String(key)] = String(value);
          });
        } catch (e) {}
        return result;
      };

      const notificationConfig = {
        id: notificationId,
        title: title || '알림',
        body: body || '',
        data: normalizeData(data),
      };

      if (Platform.OS === 'android') {
        notificationConfig.android = {
          channelId,
          smallIcon: 'ic_stat_notification',
          pressAction: { id: 'default' },
          importance: AndroidImportance.HIGH,
        };
      }
      if (Platform.OS === 'ios') {
        notificationConfig.ios = { sound: 'default' };
      }

      // 다음 발생 시각 계산
      const now = new Date();
      const next = new Date(now);
      next.setHours(hour, minute, 0, 0);
      if (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 1);
      }

      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: next.getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
      };
      // 기존 동일 ID 트리거 제거 후 재등록 → 항상 1개 유지
      try {
        await notifee.cancelTriggerNotification(notificationId);
      } catch (e) {}
      await notifee.createTriggerNotification(notificationConfig, trigger);
      addDebugLog(`매일 알림 예약 완료: ${hour}:${minute.toString().padStart(2, '0')} id=${notificationId}`, 'success');
      return notificationId;
    } catch (error) {
      addDebugLog(`매일 알림 예약 오류: ${error.message}`, 'error');
      return null;
    }
  }

  // 알림 채널 생성
  async createNotificationChannels() {
    if (Platform.OS === 'web') return; // 웹은 지원 안함
    if (Platform.OS !== 'android') return; // 안드로이드만 채널 필요
    if (channelsCreated) return; // 이미 생성된 경우 건너뜀
    
    try {
      // 기본 채널 - 단순화된 설정
      await notifee.createChannel({
        id: 'default',
        name: '일반 알림',
        lights: true,
        vibration: true,
        importance: AndroidImportance.HIGH
      });
      
      channelsCreated = true;
      addDebugLog('알림 채널 생성 완료', 'success');
    } catch (error) {
      addDebugLog(`알림 채널 생성 오류: ${error.message}`, 'error');
    }
  }

  async requestNotificationPermission() {
    if (Platform.OS === 'web') {
      addDebugLog('웹에서는 알림 권한을 지원하지 않습니다.', 'info');
      return false;
    }
    
    try {
      if (Platform.OS === 'android' && PermissionsAndroid && Platform.Version >= 33) {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          addDebugLog(`Android 13+ 알림 권한 결과: ${granted}`, 'info');
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
          addDebugLog(`Android 알림 권한 요청 오류: ${err.message}`, 'error');
          return false;
        }
      }
      
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      addDebugLog(`Firebase 알림 권한 상태: ${authStatus}, 허용됨: ${enabled}`, 'info');
      return enabled;
    } catch (err) {
      addDebugLog(`알림 권한 요청 오류: ${err.message}`, 'error');
      return false;
    }
  }

  async registerForPushNotifications() {
    if (Platform.OS === 'web') {
      addDebugLog('웹에서는 푸시 알림을 지원하지 않습니다.', 'info');
      return null;
    }
    
    try {
      const hasPermission = await this.requestNotificationPermission();
      if (!hasPermission) {
        addDebugLog('알림 권한이 거부되었습니다.', 'warning');
        return null;
      }

      // Firebase 토큰 가져오기
      const token = await messaging().getToken();
      addDebugLog(`Firebase 푸시 토큰: ${token}`, 'success');
      // 서버에 디바이스 토큰 등록/갱신
      try {
        const res = await registerDeviceToken({ token, deviceType: Platform.OS });
        // 저장 포맷: 서버 응답 그대로 보존
        try {
          await savePushDeviceToken({
            token: res?.token || token,
            deviceType: res?.device_type || Platform.OS,
            createdAt: res?.created_at || new Date().toISOString(),
          });
        } catch (e) {}
        addDebugLog('디바이스 토큰 서버 등록 성공', 'success');
      } catch (tokenError) {
        addDebugLog(`디바이스 토큰 서버 등록 오류: ${tokenError?.message || String(tokenError)}`, 'error');
      }

      return token;
    } catch (error) {
      addDebugLog(`푸시 알림 등록 오류: ${error.message}`, 'error');
      return null;
    }
  }

  setupNotificationHandler() {
    if (Platform.OS === 'web') {
      addDebugLog('웹에서는 푸시 알림 핸들러를 지원하지 않습니다.', 'info');
      return;
    }
    
    // 알림 채널 생성
    this.createNotificationChannels();

    try {
      // Firebase 메시징 포그라운드 핸들러
      this.notificationReceivedListener = messaging().onMessage(async (remoteMessage) => {
        addDebugLog(`포그라운드 메시지 수신: ${JSON.stringify(remoteMessage.notification)}`, 'info');
        // Notifee를 사용하여 포그라운드 알림 표시
        await this.displayNotification(remoteMessage);
      });

      // Firebase 메시징 백그라운드 핸들러 (앱이 백그라운드에서 알림 클릭 시)
      this.notificationResponseListener = messaging().onNotificationOpenedApp((remoteMessage) => {
        addDebugLog(`백그라운드에서 알림 클릭: ${JSON.stringify(remoteMessage.notification)}`, 'info');
        if (remoteMessage.data) {
          this.handleNotificationAction(remoteMessage.data);
        }
      });

      // 앱이 종료된 상태에서 알림 클릭으로 열린 경우 확인
      messaging()
        .getInitialNotification()
        .then(remoteMessage => {
          if (remoteMessage) {
            addDebugLog(`종료 상태에서 알림으로 앱 시작: ${JSON.stringify(remoteMessage.notification)}`, 'info');
            if (remoteMessage.data) {
              this.handleNotificationAction(remoteMessage.data);
            }
          }
        });

      // Android 네이티브에서 전달되는 알림 데이터 처리
      if (Platform.OS === 'android') {
        const eventEmitter = new NativeEventEmitter(NativeModules.RCTDeviceEventEmitter);
        this.nativeNotificationListener = eventEmitter.addListener('notificationOpened', (notification) => {
          addDebugLog(`네이티브 알림 이벤트 수신: ${JSON.stringify(notification)}`, 'info');
          if (notification) {
            this.handleNotificationAction(notification);
          }
        });
      }

      // 앱 상태 변경 리스너
      this.appStateListener = AppState.addEventListener('change', this.handleAppStateChange);
      
      addDebugLog('알림 핸들러 설정 완료', 'success');
    } catch (error) {
      addDebugLog(`알림 핸들러 설정 오류: ${error.message}`, 'error');
    }
  }

  handleAppStateChange = async (nextAppState) => {
    if (nextAppState === 'active') {
      // 앱이 포그라운드로 돌아왔을 때 권한 확인
      addDebugLog('앱이 활성화 상태로 전환됨', 'info');
      await this.requestNotificationPermission();
    }
  };

  // 알림 표시 함수 (Notifee 사용)
  async displayNotification(remoteMessage) {
    if (!remoteMessage) return;
    
    try {
      // Android 8+에서 채널이 없으면 크래시가 발생할 수 있어 선제적으로 생성
      await this.createNotificationChannels();

      const { notification, data } = remoteMessage;
      
      if (!notification) return;
      
      // 알림 채널 ID 설정
      const channelId = 'default';
      
      // 알림 ID 생성
      const notificationId = `notification_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      // data 값을 모두 문자열로 정규화
      const normalizeData = (raw) => {
        const result = {};
        try {
          Object.entries(raw || {}).forEach(([key, value]) => {
            if (value === null || value === undefined) return;
            result[String(key)] = String(value);
          });
        } catch (e) {}
        return result;
      };

      // 알림 설정 - 최소한의 필수 속성만 설정
      const notificationConfig = {
        id: notificationId,
        title: notification.title || '알림',
        body: notification.body || '',
        data: normalizeData(data),
      };
      
      // 안드로이드 설정 추가
      if (Platform.OS === 'android') {
        notificationConfig.android = {
          channelId,
          smallIcon: 'ic_stat_notification',
          pressAction: {
            id: 'default',
          },
        };
      }
      
      // iOS 설정 추가
      if (Platform.OS === 'ios') {
        notificationConfig.ios = {
          sound: 'default',
        };
      }
      
      // 알림 표시
      await notifee.displayNotification(notificationConfig);
      addDebugLog('알림 표시 완료', 'success');
    } catch (error) {
      addDebugLog(`알림 표시 오류: ${error.message}`, 'error');
    }
  }

  // 알림 액션 처리 함수
  handleNotificationAction(data) {
    if (!data) {
      addDebugLog('알림 데이터가 없습니다.', 'warning');
      return;
    }
    
    // 중복 처리 방지
    if (isHandlingNotification) {
      addDebugLog('이미 알림을 처리 중입니다.', 'warning');
      return;
    }
    
    isHandlingNotification = true;
    
    try {
      addDebugLog(`알림 액션 처리 시작: ${JSON.stringify(data)}`, 'info');
      
      // 딥링크 생성 및 처리
      const deepLink = this.buildDeepLinkFromNotificationData(data);
      if (deepLink) {
        addDebugLog(`딥링크 처리: ${deepLink}`, 'info');
        
        // 딥링크 처리 지연 (앱이 완전히 로드된 후 처리)
        setTimeout(() => {
          Linking.openURL(deepLink)
            .then(() => {
              addDebugLog('딥링크 처리 성공', 'success');
            })
            .catch(err => {
              addDebugLog(`딥링크 오류: ${err.message}`, 'error');
            })
            .finally(() => {
              isHandlingNotification = false;
            });
        }, 1000);
      } else {
        addDebugLog('유효한 딥링크가 없습니다.', 'warning');
        isHandlingNotification = false;
      }
    } catch (error) {
      addDebugLog(`알림 액션 처리 중 오류 발생: ${error.message}`, 'error');
      isHandlingNotification = false;
    }
  }

  // 안전한 네비게이션 처리를 위한 새 함수
  handleSafeNavigation() {
    // 아무 작업도 수행하지 않음 - 앱이 자체적으로 시작되도록 함
    addDebugLog('안전 모드로 앱 시작', 'info');
  }

  // 알림 핸들러 정리
  cleanupNotificationHandler() {
    if (Platform.OS === 'web') {
      return;
    }
    
    // 리스너 제거
    if (this.appStateListener) {
      this.appStateListener.remove();
    }
    
    if (this.notificationReceivedListener) {
      this.notificationReceivedListener();
    }
    
    if (this.notificationResponseListener) {
      this.notificationResponseListener();
    }
    
    if (this.nativeNotificationListener) {
      this.nativeNotificationListener.remove();
    }
    
    addDebugLog('알림 핸들러 정리 완료', 'success');
  }

  // 단일 알림 취소
  async cancelNotification(id) {
    if (Platform.OS === 'web') return;
    try {
      // 표시된 알림/트리거 알림 모두 취소 시도
      await Promise.all([
        notifee.cancelNotification(id).catch(() => {}),
        notifee.cancelTriggerNotification(id).catch(() => {}),
      ]);
      addDebugLog(`알림 취소 완료: id=${id}`, 'success');
    } catch (e) {
      addDebugLog(`알림 취소 오류(id=${id}): ${e?.message || String(e)}`, 'error');
    }
  }

  // 모든 알림/예약 취소 (표시/트리거 모두)
  async cancelAllNotifications() {
    if (Platform.OS === 'web') return;
    try {
      await Promise.all([
        notifee.cancelAllNotifications().catch(() => {}),
        notifee.cancelDisplayedNotifications().catch(() => {}),
        notifee.cancelTriggerNotifications().catch(() => {}),
      ]);
      addDebugLog('모든 알림/예약 취소 완료', 'success');
    } catch (e) {
      addDebugLog(`모든 알림 취소 오류: ${e?.message || String(e)}`, 'error');
    }
  }

  // 알림 데이터에서 딥링크 생성 함수
  buildDeepLinkFromNotificationData(data) {
    if (!data) return null;
    
    // 기본 스킴
    const scheme = 'somomi://';
    
    // 딥링크 생성
    if (data.deepLink) {
      return data.deepLink;
    } else if (data.type === 'product' && data.productId) {
      return `${scheme}product/detail/${data.productId}`;
    } else if (data.type === 'location' && data.locationId) {
      return `${scheme}location/detail/${data.locationId}`;
    }
    
    // 기본 딥링크
    return `${scheme}home`;
  }
}

// 싱글톤 인스턴스 생성
export const pushNotificationService = new PushNotificationService();

// 디버깅 함수 내보내기
export const getPushNotificationLogs = () => pushNotificationService.getDebugLogs();
export const clearPushNotificationLogs = () => pushNotificationService.clearDebugLogs();
export const setPushNotificationDebugCallback = (callback) => pushNotificationService.setDebugCallback(callback); 

// 푸시 알림 서비스 초기화 (권한 요청 및 토큰 설정)
export const initializePushNotificationService = async () => {
  try {
    console.log('푸시 알림 서비스 초기화 시작');
    
    // 알림 핸들러 설정
    pushNotificationService.setupNotificationHandler();
    
    // 알림 권한 요청 및 토큰 등록
    const token = await pushNotificationService.registerForPushNotifications();
    if (token) {
      console.log('푸시 알림 토큰 획득:', token);
    }
    
    console.log('푸시 알림 서비스 초기화 완료');
    return token;
  } catch (error) {
    console.error('푸시 알림 서비스 초기화 오류:', error);
    return null;
  }
}; 