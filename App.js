import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { Platform, StyleSheet, Linking, Button, View } from 'react-native';
import store from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import { verifyToken, getAnonymousToken } from './src/redux/slices/authSlice';
import * as Updates from 'expo-updates';
import CodePushUpdateLoading from './src/components/CodePushUpdateLoading';
import { 
  initializeNotifications, 
  cleanupNotifications, 
  requestNotificationPermissions, 
  registerForPushNotifications,
  sendImmediateNotification
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

  // 테스트 알림 전송 함수
  const sendTestNotification = async () => {
    if (Platform.OS !== 'web') {
      console.log('테스트 알림 전송 시도...');
      const notificationId = await sendImmediateNotification(
        '테스트 알림',
        '앱 푸시 알림이 정상적으로 작동합니다!',
        {
          type: 'test',
          testData: '테스트 데이터'
        }
      );
      console.log('테스트 알림 전송 완료, ID:', notificationId);
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
        
        // 알림 권한 요청 및 초기화
        await requestNotificationPermissions();
        await registerForPushNotifications();
        
        // 테스트 알림 전송 (앱 시작 3초 후)
        if (Platform.OS !== 'web') {
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
    
    // 알림 설정 초기화
    initializeNotifications();
    
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
      clearTimeout(checkUpdateTimer);
      updateSubscription.remove();
      cleanupNotifications();
    };
  }, [dispatch, checkForUpdates]);
  
  if (isUpdating) {
    return <CodePushUpdateLoading error={updateError || undefined} />;
  }
  
  // 테스트 알림 버튼 추가
  if (__DEV__ && Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.testButtonContainer}>
          <Button 
            title="테스트 알림 보내기" 
            onPress={sendTestNotification} 
          />
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
    top: 40,
    right: 20,
    zIndex: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 10,
    borderRadius: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  }
});
