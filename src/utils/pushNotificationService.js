import { Platform, AppState } from 'react-native';
import messaging from '@react-native-firebase/messaging';
// import { apiClient } from '../api/client'; // 일단 무시하고 주석처리
import { Linking, NativeEventEmitter, NativeModules } from 'react-native';
import notifee, { 
  AndroidImportance, 
  AndroidStyle, 
  EventType,
  TriggerType,
  TimeUnit 
} from '@notifee/react-native';

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
  
  // 현재 로그 가져오기
  getDebugLogs() {
    return [...debugLogs];
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
      
      // 알림 설정 - 최소한의 필수 속성만 설정
      const notificationConfig = {
        id: notificationId,
        title: title || '알림',
        body: body || '',
        data: data || {},
      };
      
      // 안드로이드 설정 추가
      if (Platform.OS === 'android') {
        notificationConfig.android = {
          channelId,
          smallIcon: 'ic_launcher',
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

      // 여기에 서버에 토큰 등록 로직 추가
      /*
      try {
        await apiClient.post('/api/notifications/register', {
          token: token,
          deviceType: Platform.OS
        });
        addDebugLog('토큰 등록 성공', 'success');
      } catch (tokenError) {
        addDebugLog(`디바이스 토큰 등록 오류: ${tokenError.message}`, 'error');
      }
      */

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

      // Notifee 이벤트 리스너 (알림 클릭 이벤트)
      notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.PRESS && detail.notification) {
          addDebugLog(`Notifee 포그라운드 알림 클릭: ${JSON.stringify(detail.notification)}`, 'info');
          if (detail.notification.data) {
            this.handleNotificationAction(detail.notification.data);
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
      const { notification, data } = remoteMessage;
      
      if (!notification) return;
      
      // 알림 채널 ID 설정
      const channelId = 'default';
      
      // 알림 ID 생성
      const notificationId = `notification_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      // 알림 설정 - 최소한의 필수 속성만 설정
      const notificationConfig = {
        id: notificationId,
        title: notification.title || '알림',
        body: notification.body || '',
        data: data || {},
      };
      
      // 안드로이드 설정 추가
      if (Platform.OS === 'android') {
        notificationConfig.android = {
          channelId,
          smallIcon: 'ic_launcher',
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