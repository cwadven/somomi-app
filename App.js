import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { Platform, StyleSheet, Linking, Button, View, Alert, Text } from 'react-native';
import store from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import { verifyToken, getAnonymousToken } from './src/redux/slices/authSlice';
import * as Updates from 'expo-updates';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import Constants from 'expo-constants';
import CodePushUpdateLoading from './src/components/CodePushUpdateLoading';
import { 
  initializeNotifications, 
  cleanupNotifications, 
  requestNotificationPermissions, 
  registerForPushNotifications,
  sendImmediateNotification,
  sendBackgroundNotification
} from './src/utils/notificationUtils';

// localStorage 폴리필
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    _data: {},
    setItem(id, val) { return this._data[id] = String(val); },
    getItem(id) { return this._data.hasOwnProperty(id) ? this._data[id] : null; },
    removeItem(id) { return delete this._data[id]; },
    clear() { return this._data = {}; }
  };
}

// 앱 내부 컴포넌트 - 토큰 검증 및 초기화 로직을 포함
const AppContent = () => {
  const dispatch = useDispatch();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [pushToken, setPushToken] = useState('');
  const [isNotificationSending, setIsNotificationSending] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // 테스트 알림 전송 함수
  const sendTestNotification = async () => {
    if (Platform.OS !== 'web') {
      try {
        console.log('테스트 알림 전송 시도...');
        setIsNotificationSending(true);
        
        const notificationId = await sendImmediateNotification(
          '테스트 알림',
          '앱 푸시 알림이 정상적으로 작동합니다!',
          {
            type: 'test',
            testData: '테스트 데이터',
            timestamp: new Date().toISOString(),
            count: notificationCount + 1
          }
        );
        
        setNotificationCount(prev => prev + 1);
        console.log('테스트 알림 전송 완료, ID:', notificationId);
        
        // 성공 피드백
        Alert.alert(
          '알림 전송 성공',
          `알림이 성공적으로 전송되었습니다. (ID: ${notificationId})`,
          [{ text: '확인', onPress: () => console.log('알림 전송 확인') }]
        );
      } catch (error) {
        console.error('알림 전송 실패:', error);
        Alert.alert(
          '알림 전송 실패',
          `오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`,
          [{ text: '확인', onPress: () => console.log('알림 전송 오류 확인') }]
        );
      } finally {
        setIsNotificationSending(false);
      }
    }
  };

  // 지연 알림 전송 함수
  const sendDelayedNotification = async () => {
    if (Platform.OS !== 'web') {
      try {
        console.log('지연 알림 예약 시도...');
        setIsNotificationSending(true);
        
        // 알림 예약 전 안내
        Alert.alert(
          '지연 알림 테스트',
          '3초 후에 알림이 발송됩니다. 지금 홈 버튼을 눌러 앱을 백그라운드로 전환하세요.',
          [{ text: '확인', onPress: async () => {
            // 3초 후에 알림 발송
            const notificationId = await sendBackgroundNotification(
              '지연 알림 테스트',
              `3초 후 알림이 발송되었습니다! (${notificationCount + 1}번째)`,
              {
                type: 'delayed',
                testData: '지연 알림 테스트 데이터',
                deepLink: 'somomi://product/detail/1',
                count: notificationCount + 1
              },
              3 // 3초 후
            );
            
            setNotificationCount(prev => prev + 1);
            console.log('지연 알림 예약 완료, ID:', notificationId);
            setIsNotificationSending(false);
          }}]
        );
      } catch (error) {
        console.error('지연 알림 예약 실패:', error);
        Alert.alert(
          '알림 예약 실패',
          `오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`,
          [{ text: '확인', onPress: () => console.log('알림 예약 오류 확인') }]
        );
        setIsNotificationSending(false);
      }
    }
  };

  // Firebase 푸시 토큰 등록
  const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === 'web') {
      console.log('웹에서는 푸시 알림을 지원하지 않습니다.');
      return;
    }

    try {
      // 권한 확인
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        console.log('알림 권한이 거부되었습니다!');
        return;
      }
      
      // Firebase 푸시 토큰 가져오기
      const token = await registerForPushNotifications();
      if (token) {
        console.log('Firebase 푸시 토큰:', token);
        setPushToken(token);
      }
    } catch (error) {
      console.error('푸시 토큰 등록 오류:', error);
    }
  };

  const checkForUpdates = useCallback(async () => {
    if (__DEV__ || Platform.OS === 'web') {
      console.log('개발 모드 또는 웹 환경에서는 업데이트를 확인하지 않습니다.');
      return;
    }
    
    try {
      console.log('업데이트 확인 시작...');
      
      // Updates.isEnabled 확인
      const isEnabled = typeof Updates.isEnabled === 'function' 
        ? await Updates.isEnabled() 
        : Updates.isEnabled;
      
      if (!isEnabled) {
        console.log('expo-updates가 활성화되어 있지 않습니다.');
        return;
      }
      
      setUpdateError(null);
      
      console.log('업데이트 확인 중...');
      const update = await Updates.checkForUpdateAsync();
      console.log('업데이트 확인 결과:', JSON.stringify(update));
      
      if (update.isAvailable) {
        console.log('새 업데이트가 있습니다. 다운로드 시작...');
        setIsUpdating(true);
        
        try {
          // 업데이트 다운로드
          const fetchResult = await Updates.fetchUpdateAsync();
          console.log('업데이트 다운로드 완료:', JSON.stringify(fetchResult));
          
          // 업데이트 자동 적용
          console.log('업데이트 자동 적용 시작...');
          try {
            await Updates.reloadAsync();
          } catch (reloadError) {
            console.error('업데이트 적용 오류:', reloadError);
            setUpdateError(`업데이트 적용 오류: ${reloadError instanceof Error ? reloadError.message : String(reloadError)}`);
            setIsUpdating(false);
          }
        } catch (fetchError) {
          console.error('Update fetch error:', fetchError);
          setUpdateError(`업데이트 다운로드 오류: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
          setIsUpdating(false);
        }
      } else {
        console.log('사용 가능한 업데이트가 없습니다.');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      setUpdateError(`업데이트 확인 오류: ${error instanceof Error ? error.message : String(error)}`);
      setIsUpdating(false);
    }
  }, []);
  
  // 딥링크 설정
  const linking = {
    prefixes: [
      'somomi://',
      'https://somomi.co.kr',
    ],
    config: {
      screens: {
        ProductDetail: 'product/detail/:productId',
        LocationDetail: 'location/detail/:locationId',
      }
    }
  };
  
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 저장된 토큰 검증
        const result = await dispatch(verifyToken()).unwrap();
        
        // 토큰이 없는 경우 익명 토큰 발급
        if (!result) {
          await dispatch(getAnonymousToken()).unwrap();
        }
        
        // 웹이 아닌 환경에서만 알림 관련 코드 실행
        if (Platform.OS !== 'web') {
          // 알림 권한 요청 및 초기화
          await registerForPushNotificationsAsync();
          
          // 테스트 알림 전송 (앱 시작 3초 후)
          setTimeout(() => {
            sendTestNotification();
          }, 3000);
        }
      } catch (error) {
        console.error('인증 초기화 실패:', error);
        // 오류 발생 시 익명 토큰 발급
        await dispatch(getAnonymousToken()).unwrap();
      }
    };
    
    initializeApp();
    
    // 웹이 아닌 환경에서만 알림 관련 코드 실행
    if (Platform.OS !== 'web') {
      // 알림 설정 초기화
      initializeNotifications();
      
      // Notifee 이벤트 리스너 (알림 클릭 이벤트)
      const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.PRESS && detail.notification) {
          console.log('Notifee 알림 클릭:', detail.notification);
          
          // 알림 데이터 처리
          const data = detail.notification.data;
          console.log('알림 데이터:', data);
          
          // 딥링크 처리
          if (data && data.deepLink) {
            Linking.openURL(data.deepLink).catch(err => {
              console.error('딥링크 오류:', err);
            });
          }
        }
      });
      
      // Firebase 메시징 이벤트 리스너
      const messagingUnsubscribe = messaging().onMessage(async remoteMessage => {
        console.log('포그라운드 메시지 수신:', remoteMessage);
      });
    }
    
    // 앱 시작 시 업데이트 확인
    const checkUpdateTimer = setTimeout(() => {
      checkForUpdates();
    }, 2000); // 앱 시작 후 2초 후에 업데이트 확인
    
    // 앱이 포그라운드로 돌아올 때마다 업데이트 확인
    const updateSubscription = Updates.addListener(event => {
      console.log('Updates 이벤트 발생:', event.type);
      
      if (event.type === Updates.UpdateEventType.ERROR) {
        console.error('업데이트 이벤트: 오류 발생', event.message);
        setUpdateError(`업데이트 처리 중 오류가 발생했습니다: ${event.message}`);
        setIsUpdating(false);
      }
    });

    return () => {
      // 웹이 아닌 환경에서만 알림 관련 코드 실행
      if (Platform.OS !== 'web') {
        // 알림 설정 정리
        cleanupNotifications();
        
        // Notifee 이벤트 리스너 정리
        unsubscribe();
        
        // Firebase 메시징 이벤트 리스너 정리
        messagingUnsubscribe();
      }
      
      clearTimeout(checkUpdateTimer);
      updateSubscription.remove();
    };
  }, [dispatch, checkForUpdates]);
  
  if (isUpdating) {
    return <CodePushUpdateLoading error={updateError || undefined} />;
  }
  
  // 테스트 알림 버튼 추가 (웹이 아닌 환경에서 항상 표시)
  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.testButtonContainer}>
          <Button 
            title={`즉시 알림 테스트 (${notificationCount})`}
            onPress={sendTestNotification}
            disabled={isNotificationSending}
          />
          <View style={{ height: 10 }} />
          <Button 
            title={`3초 후 알림 테스트 (${notificationCount})`}
            onPress={sendDelayedNotification}
            color="#FF4500"
            disabled={isNotificationSending}
          />
          {isNotificationSending && (
            <View style={styles.loadingText}>
              <Text style={{ color: 'gray', marginTop: 5 }}>처리 중...</Text>
            </View>
          )}
        </View>
        <AppNavigator linking={linking} />
      </View>
    );
  }
  
  return <AppNavigator linking={linking} />;
};

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: 'red',
    marginTop: 8,
  },
  testButtonContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  loadingText: {
    alignItems: 'center',
    marginTop: 5,
  }
});
