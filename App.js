import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';
import { Platform, Alert } from 'react-native';
import store from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import { verifyToken, getAnonymousToken } from './src/redux/slices/authSlice';
import * as Updates from 'expo-updates';

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

  const checkForUpdates = useCallback(async () => {
    if (__DEV__ || Platform.OS === 'web') {
      console.log('개발 모드 또는 웹 환경에서는 업데이트를 확인하지 않습니다.');
      return;
    }
    
    try {
      console.log('업데이트 확인 시작...');
      
      // Updates 객체가 존재하는지 확인
      if (!Updates) {
        console.error('expo-updates가 로드되지 않았습니다.');
        return;
      }
      
      // Updates.isEnabled 확인
      if (!Updates.isEnabled()) {
        console.log('expo-updates가 활성화되어 있지 않습니다. 앱 설정을 확인하세요.');
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
          
          // 사용자에게 업데이트 알림
          Alert.alert(
            '업데이트 알림',
            '새로운 버전이 다운로드되었습니다. 지금 적용하시겠습니까?',
            [
              {
                text: '나중에',
                onPress: () => {
                  console.log('업데이트 연기됨');
                  setIsUpdating(false);
                },
                style: 'cancel'
              },
              {
                text: '지금 적용',
                onPress: async () => {
                  console.log('업데이트 적용 시작...');
                  try {
                    await Updates.reloadAsync();
                  } catch (reloadError) {
                    console.error('업데이트 적용 오류:', reloadError);
                    setUpdateError(`업데이트 적용 오류: ${reloadError instanceof Error ? reloadError.message : String(reloadError)}`);
                    setIsUpdating(false);
                  }
                }
              }
            ]
          );
        } catch (fetchError) {
          const errorMessage = fetchError instanceof Error ? 
            fetchError.message : String(fetchError);
          console.error('Update fetch error:', fetchError);
          setUpdateError(`업데이트 다운로드 오류: ${errorMessage}`);
          setIsUpdating(false);
        }
      } else {
        console.log('사용 가능한 업데이트가 없습니다.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error checking for updates:', error);
      setUpdateError(`업데이트 확인 오류: ${errorMessage}`);
      setIsUpdating(false);
    }
  }, []);
  
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // 저장된 토큰 검증
        const result = await dispatch(verifyToken()).unwrap();
        
        // 토큰이 없는 경우 익명 토큰 발급
        if (!result) {
          await dispatch(getAnonymousToken()).unwrap();
        }
      } catch (error) {
        console.error('인증 초기화 실패:', error);
        // 오류 발생 시 익명 토큰 발급
        await dispatch(getAnonymousToken()).unwrap();
      }
    };
    
    initializeAuth();
    
    // 앱 시작 시 업데이트 확인
    checkForUpdates();
  }, [dispatch, checkForUpdates]);
  
  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}
