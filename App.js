import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { Platform, StyleSheet, Linking, AppState } from 'react-native';
import store from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import { verifyToken, getAnonymousToken } from './src/redux/slices/authSlice';
import * as Updates from 'expo-updates';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType, AndroidImportance } from '@notifee/react-native';
import Constants from 'expo-constants';
import CodePushUpdateLoading from './src/components/CodePushUpdateLoading';
import { 
  initializeNotifications, 
  cleanupNotifications, 
  requestNotificationPermissions, 
  registerForPushNotifications
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

// 백그라운드 메시지 핸들러 설정 (앱이 로드되기 전에 설정해야 함)
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('백그라운드 메시지 수신:', remoteMessage);
  
  // Notifee를 사용하여 알림 표시
  if (remoteMessage.notification) {
    await notifee.displayNotification({
      title: remoteMessage.notification.title,
      body: remoteMessage.notification.body,
      android: {
        channelId: 'default',
        smallIcon: 'ic_launcher',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      },
      data: remoteMessage.data,
    });
  }
  
  return Promise.resolve();
});

// 앱 내부 컴포넌트 - 토큰 검증 및 초기화 로직을 포함
const AppContent = () => {
  const dispatch = useDispatch();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [pushToken, setPushToken] = useState('');
  const [appState, setAppState] = useState(AppState.currentState);

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
  
  // 앱 상태 변경 핸들러
  const handleAppStateChange = useCallback((nextAppState) => {
    console.log('App state changed:', nextAppState);
    setAppState(nextAppState);
    
    // 앱이 백그라운드에서 포그라운드로 돌아올 때 알림 권한 확인
    if (appState.match(/inactive|background/) && nextAppState === 'active' && Platform.OS !== 'web') {
      console.log('앱이 포그라운드로 돌아왔습니다. 알림 권한 확인...');
      requestNotificationPermissions();
    }
  }, [appState]);
  
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
      
      // Notifee 백그라운드 이벤트 리스너 설정
      notifee.onBackgroundEvent(async ({ type, detail }) => {
        console.log('Notifee 백그라운드 이벤트:', type, detail);
        
        if (type === EventType.PRESS && detail.notification) {
          // 알림 데이터 처리
          const data = detail.notification.data;
          console.log('백그라운드 알림 데이터:', data);
          
          // 딥링크 처리
          if (data && data.deepLink) {
            Linking.openURL(data.deepLink).catch(err => {
              console.error('딥링크 오류:', err);
            });
          }
        }
        
        return Promise.resolve();
      });
      
      // Firebase 메시징 이벤트 리스너
      const messagingUnsubscribe = messaging().onMessage(async remoteMessage => {
        console.log('포그라운드 메시지 수신:', remoteMessage);
        
        // Notifee를 사용하여 포그라운드 알림 표시
        if (remoteMessage.notification) {
          await notifee.displayNotification({
            title: remoteMessage.notification.title,
            body: remoteMessage.notification.body,
            android: {
              channelId: 'default',
              smallIcon: 'ic_launcher',
              importance: AndroidImportance.HIGH,
              sound: 'default',
            },
            data: remoteMessage.data,
          });
        }
      });
      
      // 앱 상태 변경 리스너 등록
      const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
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
        
        // 앱 상태 변경 리스너 정리
        appStateSubscription.remove();
      }
      
      clearTimeout(checkUpdateTimer);
      updateSubscription.remove();
    };
  }, [dispatch, checkForUpdates, handleAppStateChange]);
  
  if (isUpdating) {
    return <CodePushUpdateLoading error={updateError || undefined} />;
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
  }
});
