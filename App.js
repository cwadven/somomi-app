import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';
import { Platform, Text, View, StyleSheet } from 'react-native';
import store from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import { verifyToken, getAnonymousToken } from './src/redux/slices/authSlice';
import * as Updates from 'expo-updates';
import CodePushUpdateLoading from './src/components/CodePushUpdateLoading';

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
  const [updateInfo, setUpdateInfo] = useState({
    version: '1.0.0',
    updateTime: new Date().toLocaleString(),
    isUpdated: false,
    updateStatus: '초기화 중',
    checkStartTime: '',
    updateCheckStatus: '',
    updateCheckResult: ''
  });

  const checkForUpdates = useCallback(async (forceCheck = false) => {
    if ((__DEV__ || Platform.OS === 'web') && !forceCheck) {
      console.log('개발 모드 또는 웹 환경에서는 업데이트를 확인하지 않습니다. forceCheck를 true로 설정하여 강제 확인할 수 있습니다.');
      setUpdateInfo(prevInfo => ({
        ...prevInfo,
        updateStatus: '개발 모드 - 업데이트 확인 건너뜀'
      }));
      return;
    }
    
    try {
      console.log('업데이트 확인 시작...');
      console.log('Updates 객체 확인:', Updates ? '존재함' : '존재하지 않음');
      
      // Updates.isEnabled 확인
      console.log('Updates.isEnabled 값:', Updates.isEnabled());
      
      if (!Updates.isEnabled()) {
        console.log('expo-updates가 활성화되어 있지 않습니다. 앱 설정을 확인하세요.');
        return;
      }
      
      console.log('Updates 설정:', {
        channel: Updates.channel,
        runtimeVersion: Updates.runtimeVersion,
        updateId: Updates.updateId,
        createdAt: Updates.createdAt
      });
      
      setUpdateError(null);
      
      // 테스트용: 업데이트 정보 표시 (업데이트 확인 전)
      setUpdateInfo(prevInfo => ({
        ...prevInfo,
        checkStartTime: new Date().toLocaleString(),
        updateCheckStatus: '업데이트 확인 중...'
      }));
      
      console.log('업데이트 확인 중...');
      const update = await Updates.checkForUpdateAsync();
      console.log('업데이트 확인 결과:', JSON.stringify(update));
      
      // 테스트용: 업데이트 확인 결과 표시
      setUpdateInfo(prevInfo => ({
        ...prevInfo,
        updateCheckResult: JSON.stringify(update),
        updateCheckStatus: update.isAvailable ? '업데이트 있음' : '업데이트 없음'
      }));
      
      if (update.isAvailable) {
        console.log('새 업데이트가 있습니다. 다운로드 시작...');
        setIsUpdating(true);
        
        try {
          // 업데이트 다운로드
          const fetchResult = await Updates.fetchUpdateAsync();
          console.log('업데이트 다운로드 완료:', JSON.stringify(fetchResult));
          
          // 업데이트 정보 저장
          setUpdateInfo(prevInfo => ({
            ...prevInfo,
            version: '1.0.1', // 업데이트 버전
            updateTime: new Date().toLocaleString(),
            isUpdated: true,
            updateStatus: '다운로드 완료, 적용 대기 중'
          }));
          
          // 업데이트 자동 적용
          console.log('업데이트 자동 적용 시작...');
          try {
            await Updates.reloadAsync();
          } catch (reloadError) {
            console.error('업데이트 적용 오류:', reloadError);
            setUpdateError(`업데이트 적용 오류: ${reloadError instanceof Error ? reloadError.message : String(reloadError)}`);
            setIsUpdating(false);
            
            // 오류 정보 저장
            setUpdateInfo(prevInfo => ({
              ...prevInfo,
              updateStatus: `적용 오류: ${reloadError instanceof Error ? reloadError.message : String(reloadError)}`
            }));
          }
        } catch (fetchError) {
          const errorMessage = fetchError instanceof Error ? 
            fetchError.message : String(fetchError);
          console.error('Update fetch error:', fetchError);
          setUpdateError(`업데이트 다운로드 오류: ${errorMessage}`);
          setIsUpdating(false);
          
          // 오류 정보 저장
          setUpdateInfo(prevInfo => ({
            ...prevInfo,
            updateStatus: `다운로드 오류: ${errorMessage}`
          }));
        }
      } else {
        console.log('사용 가능한 업데이트가 없습니다.');
        
        // 업데이트 없음 정보 저장
        setUpdateInfo(prevInfo => ({
          ...prevInfo,
          updateStatus: '사용 가능한 업데이트 없음'
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error checking for updates:', error);
      setUpdateError(`업데이트 확인 오류: ${errorMessage}`);
      setIsUpdating(false);
      
      // 오류 정보 저장
      setUpdateInfo(prevInfo => ({
        ...prevInfo,
        updateStatus: `확인 오류: ${errorMessage}`
      }));
    }
  }, []);
  
  // 수동으로 업데이트 확인을 강제하는 함수
  const forceCheckForUpdates = useCallback(() => {
    setUpdateInfo(prevInfo => ({
      ...prevInfo,
      updateStatus: '강제 업데이트 확인 시작...'
    }));
    checkForUpdates(true);
  }, [checkForUpdates]);
  
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
    const checkUpdateTimer = setTimeout(() => {
      // 개발 모드에서도 강제로 업데이트 확인 (테스트용)
      if (__DEV__) {
        console.log('개발 모드에서 테스트를 위해 강제로 업데이트 확인');
        forceCheckForUpdates();
      } else {
        checkForUpdates();
      }
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
    };
  }, [dispatch, checkForUpdates, forceCheckForUpdates]);
  
  if (isUpdating) {
    return <CodePushUpdateLoading error={updateError || undefined} />;
  }
  
  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
      {/* 업데이트 정보 표시 */}
      <View style={styles.updateInfoContainer}>
        <Text style={styles.updateInfoText}>
          버전: {updateInfo.version} {updateInfo.isUpdated ? '(업데이트됨)' : ''}
        </Text>
        <Text style={styles.updateInfoText}>
          업데이트 시간: {updateInfo.updateTime}
        </Text>
        <Text style={styles.updateInfoText}>
          상태: {updateInfo.updateStatus}
        </Text>
        <Text style={styles.updateInfoText}>
          확인 시작: {updateInfo.checkStartTime}
        </Text>
        <Text style={styles.updateInfoText}>
          확인 결과: {updateInfo.updateCheckStatus}
        </Text>
        <Text style={styles.updateInfoText}>
          테스트 마커: 2024-07-05 17:45
        </Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  updateInfoContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
  },
  updateInfoText: {
    color: 'white',
    fontSize: 12,
  }
});

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}
