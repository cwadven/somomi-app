import { Platform, Alert, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Linking, NativeEventEmitter, NativeModules } from 'react-native';

// 앱 시작 시 한 번만 알림 채널 생성
let channelsCreated = false;

class PushNotificationService {
  // 앱 상태 리스너
  appStateListener = null;

  // 알림 채널 생성
  async createNotificationChannels() {
    if (channelsCreated) return; // 이미 생성된 경우 건너뜀
    
    if (Platform.OS === 'android') {
      // 기본 채널
      await Notifications.setNotificationChannelAsync('default', {
        name: '일반 알림',
        description: '일반적인 알림 메시지',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      // 제품 알림 채널
      await Notifications.setNotificationChannelAsync('product_alerts', {
        name: '제품 알림',
        description: '제품 유통기한 및 소진 관련 알림',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      // 위치 알림 채널
      await Notifications.setNotificationChannelAsync('location_alerts', {
        name: '위치 알림',
        description: '위치 관련 알림',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      
      channelsCreated = true;
      console.log('알림 채널 생성 완료');
    }
  }

  async requestNotificationPermission() {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        return finalStatus === 'granted';
      } catch (err) {
        console.error('Android notification permission request error:', err);
        return false;
      }
    }
    return true; // 안드로이드 13 미만 또는 다른 플랫폼은 자동 허용
  }

  async registerForPushNotifications() {
    try {
      if (Platform.OS === 'web') {
        console.log('Push notifications are not supported on web');
        return;
      }
      
      const hasPermission = await this.requestNotificationPermission();
      if (!hasPermission) {
        console.log('알림 권한이 거부되었습니다.');
        return;
      }

      // Expo 푸시 토큰 가져오기
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig.extra.eas.projectId,
      });

      console.log('Expo 푸시 토큰:', token);
      
      // 여기에 서버에 토큰 등록 로직 추가
      try {
        // API 호출로 토큰 등록
        // await apiClient.post('/api/notifications/register', {
        //   token: token.data,
        //   deviceType: Platform.OS
        // });
        console.log('토큰 등록 성공');
      } catch (tokenError) {
        console.error('디바이스 토큰 등록 오류:', tokenError);
      }

      return token.data;
    } catch (error) {
      console.error('푸시 알림 등록 오류:', error);
    }
  }

  setupNotificationHandler() {
    if (Platform.OS === 'web') {
      console.log('Push notification handlers are not supported on web');
      return;
    }
    
    // 알림 채널 생성
    this.createNotificationChannels();

    // 백그라운드 알림 핸들러 설정
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // 알림 수신 리스너
    this.notificationReceivedListener = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('알림 수신:', notification);
      }
    );

    // 알림 응답 리스너 (사용자가 알림을 탭했을 때)
    this.notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
      response => {
        console.log('알림 응답:', response);
        this.handleNotificationAction(response.notification.request.content.data);
      }
    );

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

  // 알림 액션 처리 함수
  handleNotificationAction(data) {
    if (!data) return;
    
    const deepLink = this.buildDeepLinkFromNotificationData(data);
    if (deepLink) {
      Linking.openURL(deepLink).catch(err => {
        console.error('딥링크 오류:', err);
      });
    }
  }

  // 알림 핸들러 정리
  cleanupNotificationHandler() {
    if (this.notificationReceivedListener) {
      Notifications.removeNotificationSubscription(this.notificationReceivedListener);
    }
    
    if (this.notificationResponseListener) {
      Notifications.removeNotificationSubscription(this.notificationResponseListener);
    }
    
    if (this.nativeNotificationListener) {
      this.nativeNotificationListener.remove();
    }
    
    if (this.appStateListener) {
      this.appStateListener.remove();
    }
  }

  // 알림 전송 함수 (로컬 알림)
  async scheduleNotification(title, body, data = {}, trigger = null) {
    if (Platform.OS === 'web') {
      console.log('Local notifications are not supported on web');
      return;
    }
    
    try {
      const notificationContent = {
        title,
        body,
        data,
        sound: true,
      };
      
      // Android 특정 옵션
      if (Platform.OS === 'android') {
        notificationContent.channelId = data.type === 'product' ? 'product_alerts' : 
                                        data.type === 'location' ? 'location_alerts' : 'default';
      }
      
      // 알림 예약
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: trigger || null, // null이면 즉시 전송
      });
      
      console.log('알림 예약 성공:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('알림 예약 실패:', error);
    }
  }

  // 특정 알림 취소
  async cancelNotification(notificationId) {
    if (!notificationId) return;
    
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('알림 취소 성공:', notificationId);
    } catch (error) {
      console.error('알림 취소 실패:', error);
    }
  }

  // 모든 알림 취소
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('모든 알림 취소 성공');
    } catch (error) {
      console.error('모든 알림 취소 실패:', error);
    }
  }

  // 딥링크 생성 함수
  buildDeepLinkFromNotificationData(data) {
    if (!data) return null;
    
    // 제품 알림
    if (data.type === 'product' && data.productId) {
      return `somomi://product/detail/${data.productId}`;
    }
    
    // 위치 알림
    if (data.type === 'location' && data.locationId) {
      return `somomi://location/detail/${data.locationId}`;
    }
    
    // 기타 딥링크가 있는 경우
    if (data.deepLink) {
      return data.deepLink;
    }
    
    return null;
  }
}

export const pushNotificationService = new PushNotificationService(); 