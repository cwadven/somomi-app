import { Platform, Alert, AppState } from 'react-native';
import messaging from '@react-native-firebase/messaging';
// import { apiClient } from '../api/client'; // 일단 무시하고 주석처리
import { Linking, NativeEventEmitter, NativeModules } from 'react-native';
import notifee, { AndroidImportance, AndroidStyle, EventType } from '@notifee/react-native';

// 웹 환경에서는 PermissionsAndroid를 조건부로 가져옴
let PermissionsAndroid;
if (Platform.OS === 'android') {
  try {
    PermissionsAndroid = require('react-native').PermissionsAndroid;
  } catch (error) {
    console.error('PermissionsAndroid is not available on this platform:', error);
  }
}

// 앱 시작 시 한 번만 알림 채널 생성
let channelsCreated = false;

class PushNotificationService {
  // 앱 상태 리스너
  appStateListener = null;
  notificationReceivedListener = null;
  notificationResponseListener = null;
  nativeNotificationListener = null;

  // 알림 채널 생성
  async createNotificationChannels() {
    if (Platform.OS === 'web' || channelsCreated) return; // 웹이거나 이미 생성된 경우 건너뜀
    
    if (Platform.OS === 'android') {
      try {
        // 기본 채널
        await notifee.createChannel({
          id: 'default',
          name: '일반 알림',
          description: '일반적인 알림 메시지',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
          lights: true,
        });

        // 제품 알림 채널
        await notifee.createChannel({
          id: 'product_alerts',
          name: '제품 알림',
          description: '제품 유통기한 및 소진 관련 알림',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
          lights: true,
        });

        // 위치 알림 채널
        await notifee.createChannel({
          id: 'location_alerts',
          name: '위치 알림',
          description: '위치 관련 알림',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
          lights: true,
        });
        
        channelsCreated = true;
        console.log('알림 채널 생성 완료');
      } catch (error) {
        console.error('알림 채널 생성 오류:', error);
      }
    }
  }

  async requestNotificationPermission() {
    if (Platform.OS === 'web') {
      console.log('웹에서는 알림 권한을 지원하지 않습니다.');
      return false;
    }
    
    try {
      if (Platform.OS === 'android' && PermissionsAndroid && Platform.Version >= 33) {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
          console.error('Android notification permission request error:', err);
          return false;
        }
      }
      
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        
      return enabled;
    } catch (err) {
      console.error('알림 권한 요청 오류:', err);
      return false;
    }
  }

  async registerForPushNotifications() {
    if (Platform.OS === 'web') {
      console.log('웹에서는 푸시 알림을 지원하지 않습니다.');
      return null;
    }
    
    try {
      const hasPermission = await this.requestNotificationPermission();
      if (!hasPermission) {
        console.log('알림 권한이 거부되었습니다.');
        return null;
      }

      // Firebase 토큰 가져오기
      const token = await messaging().getToken();
      console.log('Firebase 푸시 토큰:', token);

      // 여기에 서버에 토큰 등록 로직 추가
      /*
      try {
        await apiClient.post('/api/notifications/register', {
          token: token,
          deviceType: Platform.OS
        });
        console.log('토큰 등록 성공');
      } catch (tokenError) {
        console.error('디바이스 토큰 등록 오류:', tokenError);
      }
      */

      return token;
    } catch (error) {
      console.error('푸시 알림 등록 오류:', error);
      return null;
    }
  }

  setupNotificationHandler() {
    if (Platform.OS === 'web') {
      return;
    }
    
    // 알림 채널 생성
    this.createNotificationChannels();

    // Firebase 메시징 포그라운드 핸들러
    this.notificationReceivedListener = messaging().onMessage(async (remoteMessage) => {
      // Notifee를 사용하여 포그라운드 알림 표시
      await this.displayNotification(remoteMessage);
    });

    // Firebase 메시징 백그라운드 핸들러 (앱이 백그라운드에서 알림 클릭 시)
    this.notificationResponseListener = messaging().onNotificationOpenedApp((remoteMessage) => {
      if (remoteMessage.data) {
        this.handleNotificationAction(remoteMessage.data);
      }
    });

    // 앱이 종료된 상태에서 알림 클릭으로 열린 경우 확인
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          if (remoteMessage.data) {
            this.handleNotificationAction(remoteMessage.data);
          }
        }
      });

    // Notifee 이벤트 리스너 (알림 클릭 이벤트)
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && detail.notification) {
        if (detail.notification.data) {
          this.handleNotificationAction(detail.notification.data);
        }
      }
    });

    // Android 네이티브에서 전달되는 알림 데이터 처리
    if (Platform.OS === 'android') {
      const eventEmitter = new NativeEventEmitter(NativeModules.RCTDeviceEventEmitter);
      this.nativeNotificationListener = eventEmitter.addListener('notificationOpened', (notification) => {
        if (notification) {
          this.handleNotificationAction(notification);
        }
      });
    }

    // 앱 상태 변경 리스너
    this.appStateListener = AppState.addEventListener('change', this.handleAppStateChange);
  }

  handleAppStateChange = async (nextAppState) => {
    if (nextAppState === 'active') {
      // 앱이 포그라운드로 돌아왔을 때 권한 확인
      await this.requestNotificationPermission();
    }
  };

  // 알림 표시 함수 (Notifee 사용)
  async displayNotification(remoteMessage) {
    if (!remoteMessage) return;
    
    try {
      const { notification, data } = remoteMessage;
      
      if (!notification) return;
      
      // 알림 채널 ID 결정
      let channelId = 'default';
      if (data && data.type) {
        if (data.type === 'product') {
          channelId = 'product_alerts';
        } else if (data.type === 'location') {
          channelId = 'location_alerts';
        }
      }
      
      // 알림 표시
      await notifee.displayNotification({
        title: notification.title,
        body: notification.body,
        android: {
          channelId,
          smallIcon: 'ic_launcher', // 앱 아이콘을 기본 아이콘으로 사용
          pressAction: {
            id: 'default',
          },
          importance: AndroidImportance.HIGH,
        },
        data: data || {},
      });
    } catch (error) {
      console.error('알림 표시 오류:', error);
    }
  }

  // 알림 액션 처리 함수
  handleNotificationAction(data) {
    if (!data) {
      console.log('알림 데이터가 없습니다.');
      return;
    }
    
    try {
      console.log('알림 액션 처리 시작:', JSON.stringify(data));
      
      // 딥링크 생성 시도
      let deepLink = null;
      try {
        deepLink = this.buildDeepLinkFromNotificationData(data);
        console.log('생성된 딥링크:', deepLink);
      } catch (deepLinkError) {
        console.error('딥링크 생성 중 오류:', deepLinkError);
        // 딥링크 생성에 실패해도 계속 진행
        deepLink = 'somomi://home';
      }
      
      if (deepLink) {
        // 딥링크 열기 전에 약간의 지연을 줘서 UI 스레드 블로킹 방지
        console.log('딥링크 열기 시도:', deepLink);
        
        // setTimeout을 Promise로 감싸서 안전하게 처리
        setTimeout(() => {
          try {
            Linking.openURL(deepLink).catch(err => {
              console.error('딥링크 열기 실패:', err);
              
              // 딥링크 실패 시 기본 화면으로 이동 시도
              try {
                console.log('기본 화면으로 이동 시도');
                Linking.openURL('somomi://home').catch((fallbackErr) => {
                  console.error('기본 화면으로 이동 실패:', fallbackErr);
                });
              } catch (fallbackError) {
                console.error('기본 화면 이동 중 오류:', fallbackError);
              }
            });
          } catch (linkingError) {
            console.error('Linking.openURL 호출 중 오류:', linkingError);
          }
        }, 500); // 지연 시간을 300ms에서 500ms로 증가
      } else {
        console.log('유효한 딥링크가 생성되지 않았습니다.');
      }
    } catch (error) {
      console.error('알림 액션 처리 중 오류 발생:', error);
      
      // 오류 발생 시 기본 화면으로 이동 시도
      try {
        console.log('오류 발생 후 기본 화면으로 이동 시도');
        setTimeout(() => {
          Linking.openURL('somomi://home').catch(() => {
            console.error('오류 후 기본 화면 이동 실패');
          });
        }, 500);
      } catch (recoveryError) {
        console.error('오류 복구 시도 중 추가 오류:', recoveryError);
      }
    }
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
  }

  // 로컬 알림 전송 함수 (Notifee 사용)
  async sendLocalNotification(title, body, data = {}, delay = 0) {
    if (Platform.OS === 'web') {
      return null;
    }
    
    try {
      // 알림 권한 확인
      let hasPermission = false;
      try {
        hasPermission = await this.requestNotificationPermission();
      } catch (permError) {
        console.error('알림 권한 확인 오류:', permError);
      }
      
      if (!hasPermission) {
        return null;
      }
      
      // 알림 채널 생성 확인
      try {
        await this.createNotificationChannels();
      } catch (channelError) {
        console.error('알림 채널 생성 오류:', channelError);
      }
      
      // 알림 채널 ID 결정
      let channelId = 'default';
      if (data && data.type) {
        if (data.type === 'product') {
          channelId = 'product_alerts';
        } else if (data.type === 'location') {
          channelId = 'location_alerts';
        }
      }
      
      // 알림 ID 생성
      const notificationId = `notification-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // 알림 설정
      const notificationConfig = {
        id: notificationId,
        title: title || '알림',
        body: body || '새로운 알림이 있습니다.',
        android: {
          channelId,
          smallIcon: 'ic_launcher',
          pressAction: {
            id: 'default',
          },
          importance: AndroidImportance.HIGH,
          // 알림음 추가
          sound: 'default',
        },
        ios: {
          // iOS 설정 추가
          sound: 'default',
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
        data: {
          ...data,
          timestamp: Date.now(),
          notificationId,
        },
      };
      
      // 지연 알림 설정
      if (delay > 0) {
        console.log(`${delay}초 후 알림 예약 중...`);
        
        // 타이머를 사용하여 지연 알림 구현
        setTimeout(() => {
          // 비동기 함수를 별도로 실행하여 앱 크래시 방지
          this.safeDisplayNotification(notificationConfig)
            .then(() => console.log(`${delay}초 후 알림 전송 완료:`, notificationId))
            .catch(err => console.error('지연 알림 표시 오류:', err));
        }, delay * 1000);
        
        console.log(`${delay}초 후 알림 예약 완료:`, notificationId);
      } else {
        // 즉시 알림 표시 - 별도 함수로 분리하여 안전하게 처리
        try {
          // 비동기 함수를 별도로 실행하여 앱 크래시 방지
          this.safeDisplayNotification(notificationConfig)
            .then(() => console.log('즉시 알림 전송 완료:', notificationId))
            .catch(err => console.error('즉시 알림 표시 오류:', err));
        } catch (displayError) {
          console.error('즉시 알림 표시 오류:', displayError);
          // 오류가 발생해도 notificationId는 반환
        }
      }
      
      return notificationId;
    } catch (error) {
      console.error('알림 전송 실패:', error);
      return null;
    }
  }
  
  // 알림 표시 함수 - 안전하게 분리
  async safeDisplayNotification(notificationConfig) {
    return new Promise((resolve, reject) => {
      // 메인 스레드를 차단하지 않도록 setTimeout 사용
      setTimeout(async () => {
        try {
          // notifee 호출을 try-catch로 감싸서 오류 처리
          await notifee.displayNotification(notificationConfig);
          resolve();
        } catch (error) {
          console.error('Notifee 알림 표시 오류:', error);
          reject(error);
        }
      }, 0);
    });
  }

  // 알림 취소 함수
  async cancelNotification(notificationId) {
    if (Platform.OS === 'web' || !notificationId) {
      console.log('웹에서는 알림 취소를 지원하지 않거나 알림 ID가 없습니다.');
      return;
    }
    
    try {
      await notifee.cancelNotification(notificationId);
      console.log('알림 취소 성공:', notificationId);
    } catch (error) {
      console.error('알림 취소 실패:', error);
    }
  }

  // 모든 알림 취소 함수
  async cancelAllNotifications() {
    if (Platform.OS === 'web') {
      console.log('웹에서는 알림 취소를 지원하지 않습니다.');
      return;
    }
    
    try {
      await notifee.cancelAllNotifications();
      console.log('모든 알림 취소 성공');
    } catch (error) {
      console.error('모든 알림 취소 실패:', error);
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