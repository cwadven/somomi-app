import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Platform, StyleSheet, Linking, AppState, View, ActivityIndicator, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import store from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import { verifyToken, getAnonymousToken, logout, loadUserLocationTemplateInstances, loadUserProductSlotTemplateInstances } from './src/redux/slices/authSlice';
import { reconcileLocationTemplates } from './src/redux/slices/authSlice';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import CodePushUpdateLoading from './src/components/CodePushUpdateLoading';
import { Ionicons } from '@expo/vector-icons';
// 알림 관련 코드는 pushNotificationService로 통합
import { initializeData } from './src/api/productsApi';
import { migrateLocalIdsAndMeta } from './src/utils/migration';
import { initializeNotificationsData } from './src/redux/slices/notificationsSlice';
import { loadCategories } from './src/redux/slices/categoriesSlice';
import PushNotificationDebugger from './src/components/PushNotificationDebugger';
import AlertModal from './src/components/AlertModal';
import { pushNotificationService } from './src/utils/pushNotificationService';
import { loginUser } from './src/redux/slices/authSlice';
import { fetchLocations, reconcileLocationsDisabled } from './src/redux/slices/locationsSlice';
import { fetchProducts, fetchConsumedProducts } from './src/redux/slices/productsSlice';
import { processSyncQueueIfOnline } from './src/utils/syncManager';
import { loadAppPrefs } from './src/utils/storageUtils';
import { scheduleDailyReminderIfNeeded, scheduleDailyUpdateReminderIfNeeded } from './src/utils/notificationUtils';

// Firebase 관련 모듈은 웹이 아닌 환경에서만 import
let messaging;
if (Platform.OS !== 'web') {
  try {
    messaging = require('@react-native-firebase/messaging').default;
    
    // 백그라운드 메시지 핸들러 설정 (앱이 로드되기 전에 설정해야 함)
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      try {
        // pushNotificationService를 사용하여 알림 표시
        if (remoteMessage.notification) {
          await pushNotificationService.displayNotification(remoteMessage);
        }
      } catch (error) {
        console.error('백그라운드 알림 표시 오류:', error);
      }
      
      return Promise.resolve();
    });
  } catch (error) {
    console.error('Firebase 모듈 로드 실패:', error);
  }
}

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
  const { isLoggedIn, isAnonymous, user, subscription, slots } = useSelector(state => state.auth);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [pushToken, setPushToken] = useState('');
  const [appState, setAppState] = useState(AppState.currentState);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  
  // 디버깅 모달 상태
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [updateLogs, setUpdateLogs] = useState([]);
  const [updateStatus, setUpdateStatus] = useState('idle'); // 'idle', 'checking', 'downloading', 'ready', 'error'

  // 로그 추가 함수
  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setUpdateLogs(prevLogs => [
      ...prevLogs,
      { message, timestamp, type }
    ]);
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (__DEV__ || Platform.OS === 'web') {
      return;
    }
    
    try {
      addLog('업데이트 확인 시작...', 'info');
      setUpdateStatus('checking');
      
      // Updates.isEnabled 확인
      const isEnabled = typeof Updates.isEnabled === 'function' 
        ? await Updates.isEnabled() 
        : Updates.isEnabled;
      
      if (!isEnabled) {
        addLog('expo-updates가 활성화되어 있지 않습니다.', 'warning');
        setUpdateStatus('error');
        return;
      }
      
      setUpdateError(null);
      
      addLog('업데이트 확인 중...', 'info');
      const update = await Updates.checkForUpdateAsync();
      addLog(`업데이트 확인 결과: ${JSON.stringify(update)}`, 'info');
      
      if (update.isAvailable) {
        addLog('새 업데이트가 있습니다. 다운로드 시작...', 'success');
        setUpdateStatus('downloading');
        setIsUpdating(true);
        
        try {
          // 업데이트 다운로드
          const fetchResult = await Updates.fetchUpdateAsync();
          addLog(`업데이트 다운로드 완료: ${JSON.stringify(fetchResult)}`, 'success');
          setUpdateStatus('ready');
          
          // 업데이트 자동 적용
          addLog('업데이트 자동 적용 시작...', 'info');
          try {
            await Updates.reloadAsync();
          } catch (reloadError) {
            console.error('업데이트 적용 오류:', reloadError);
            const errorMsg = `업데이트 적용 오류: ${reloadError instanceof Error ? reloadError.message : String(reloadError)}`;
            addLog(errorMsg, 'error');
            setUpdateError(errorMsg);
            setUpdateStatus('error');
            setIsUpdating(false);
          }
        } catch (fetchError) {
          console.error('Update fetch error:', fetchError);
          const errorMsg = `업데이트 다운로드 오류: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;
          addLog(errorMsg, 'error');
          setUpdateError(errorMsg);
          setUpdateStatus('error');
          setIsUpdating(false);
        }
      } else {
        addLog('사용 가능한 업데이트가 없습니다.', 'info');
        setUpdateStatus('idle');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      const errorMsg = `업데이트 확인 오류: ${error instanceof Error ? error.message : String(error)}`;
      addLog(errorMsg, 'error');
      setUpdateError(errorMsg);
      setUpdateStatus('error');
      setIsUpdating(false);
    }
  }, [addLog]);
  
  // 앱 상태 변경 핸들러
  const handleAppStateChange = useCallback((nextAppState) => {
    setAppState(nextAppState);
    
    // 앱이 백그라운드에서 포그라운드로 돌아올 때 알림 권한 확인
    if (appState.match(/inactive|background/) && nextAppState === 'active' && Platform.OS !== 'web') {
      pushNotificationService.requestNotificationPermission();
      // 포그라운드 전환 시 스케줄 재검사/예약
      try { scheduleDailyReminderIfNeeded(); } catch (e) { }
      try { scheduleDailyUpdateReminderIfNeeded(); } catch (e) { }
    }
  }, [appState]);

  // 구독 만료 감시 (20초 테스트 포함)
  useEffect(() => {
    if (!subscription?.isSubscribed || !subscription?.expiresAt) {
      setSubscriptionExpired(false);
      return;
    }

    const check = () => {
      const now = Date.now();
      const exp = new Date(subscription.expiresAt).getTime();
      const expired = now >= exp;
      setSubscriptionExpired(expired);
    };

    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [subscription?.isSubscribed, subscription?.expiresAt]);
  
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
  
  // 앱 초기화 함수
  const initializeApp = async () => {
    try {
      setIsLoading(true);
      // 7단계: 1회 마이그레이션 수행 (id/localId/메타 보강)
      await migrateLocalIdsAndMeta();
      
      // 토큰 검증
      await dispatch(verifyToken()).unwrap();
      
      // 사용자 영역 템플릿 인스턴스 로드
      await dispatch(loadUserLocationTemplateInstances()).unwrap();
      // 위치 데이터 로드 후 템플릿 사용 상태 동기화
      await dispatch(reconcileLocationTemplates());
      // 사용자 제품 슬롯 템플릿 인스턴스 로드
      await dispatch(loadUserProductSlotTemplateInstances()).unwrap();
      
      // 영역 데이터 로드
      await dispatch(fetchLocations()).unwrap();
      // 위치 로드 후 한 번 더 동기화 (순서상 보강)
      await dispatch(reconcileLocationTemplates());
      // 템플릿 미연동을 disabled=true로 반영
      await dispatch(reconcileLocationsDisabled()).unwrap();
      // 연동 상태가 바뀌었을 수 있으니 한 번 더 저장된 locations 로드
      await dispatch(fetchLocations()).unwrap();
      
      // 제품 데이터 로드
      await dispatch(fetchProducts()).unwrap();
      
      // 소진된 제품 데이터 로드
      await dispatch(fetchConsumedProducts()).unwrap();
      
      // 카테고리 로드
      await dispatch(loadCategories()).unwrap();
      
      // 알림 데이터 초기화
      await dispatch(initializeNotificationsData()).unwrap();
      
      // 푸시 알림 초기화
      if (Platform.OS !== 'web' && messaging) {
        const token = await pushNotificationService.initialize();
        if (token) {
          setPushToken(token);
        }
        // 일일 리마인더/작성 리마인더 스케줄링 시도
        try { await scheduleDailyReminderIfNeeded(); } catch (e) { }
        try { await scheduleDailyUpdateReminderIfNeeded(); } catch (e) { }
      }
      
      setDataInitialized(true);
    } catch (error) {
      console.error('앱 초기화 오류:', error);
      
      // 오류 발생 시 익명 토큰 발급 시도
      try {
        await dispatch(getAnonymousToken()).unwrap();
      } catch (anonymousError) {
        console.error('익명 토큰 발급 실패:', anonymousError);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    initializeApp();
    
    // 앱 상태 변경 리스너 등록
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // 웹이 아닌 환경에서만 알림 관련 코드 실행
    if (Platform.OS !== 'web') {
      // Firebase 관련 이벤트 리스너 등록
      let unsubscribe;
      let messagingUnsubscribe;

      return () => {
        // 앱 상태 변경 리스너 정리
        subscription.remove();
        pushNotificationService.cleanupNotificationHandler();
        
        // 이벤트 리스너 정리
        if (unsubscribe) unsubscribe();
        if (messagingUnsubscribe) messagingUnsubscribe();
      };
    } else {
      // 웹 환경에서는 앱 상태 변경 리스너만 정리
    return () => {
        subscription.remove();
    };
    }
    
    // 업데이트 확인
    if (!__DEV__) {
      checkForUpdates();
    }
  }, [dispatch, checkForUpdates, handleAppStateChange]);

  // 오프라인/온라인 모드 전환 시 동기화 큐 처리
  useEffect(() => {
    let interval;
    (async () => {
      // 최초 진입 시 한 번 처리
      await processSyncQueueIfOnline(dispatch, store.getState);
      // 주기적으로 모드 변경/큐 여부를 확인(가벼운 작업)
      interval = setInterval(async () => {
        const prefs = await loadAppPrefs();
        if (prefs?.syncMode === 'online' || prefs?.offlineMode === false) {
          await processSyncQueueIfOnline(dispatch, store.getState);
        }
      }, 2000);
    })();
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dispatch]);
  
  // 업데이트 디버깅 모달
  const UpdateDebugModal = () => (
    <Modal
      visible={showDebugModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDebugModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>업데이트 디버깅</Text>
            <TouchableOpacity onPress={() => setShowDebugModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {/* 로그인 상태 표시 및 전환 버튼 */}
          <View style={styles.loginStatusContainer}>
            <Text style={styles.statusLabel}>로그인 상태:</Text>
            <View style={[
              styles.statusBadge, 
              isLoggedIn ? styles.status_ready : (isAnonymous ? styles.status_checking : styles.status_idle)
            ]}>
              <Text style={styles.statusText}>
                {isLoggedIn ? '로그인됨' : (isAnonymous ? '비회원' : '로그아웃됨')}
              </Text>
            </View>
          </View>
          
          {isLoggedIn && user && (
            <View style={styles.userInfoContainer}>
              <Text style={styles.userInfoText}>
                사용자: {user.username || user.name || '알 수 없음'}
              </Text>
            </View>
          )}
          
          <View style={styles.loginButtonsContainer}>
            {isLoggedIn ? (
              <TouchableOpacity 
                style={[styles.loginButton, styles.logoutBtn]}
                onPress={() => {
                  dispatch(logout());
                  // 영역/로컬 상태 초기화
                  try {
                    const { resetLocationsState } = require('./src/redux/slices/locationsSlice');
                    dispatch(resetLocationsState());
                  } catch (e) {}
                  addLog('로그아웃 처리됨', 'warning');
                }}
              >
                <Text style={styles.loginButtonText}>로그아웃</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.loginButton, styles.loginBtn]}
                onPress={async () => {
                  try {
                    console.log('디버그 로그인 시작');
                    // 디버깅 목적으로 간단한 로그인 처리
                    // 실제 앱에서는 이 부분을 실제 로그인 프로세스로 대체해야 함
                    const mockCredentials = {
                      username: '디버그 사용자',
                      email: 'debug@example.com'
                    };
                    
                    // loginUser 액션을 사용하여 로그인 처리
                    const result = await dispatch(loginUser(mockCredentials)).unwrap();
                    console.log('디버그 로그인 성공:', result);
                    
                    addLog('디버그 사용자로 로그인됨', 'success');
                  } catch (error) {
                    console.error('디버그 로그인 실패:', error);
                    addLog(`로그인 실패: ${error.message}`, 'error');
                  }
                }}
              >
                <Text style={styles.loginButtonText}>디버그 로그인</Text>
              </TouchableOpacity>
            )}
            
            {!isAnonymous && !isLoggedIn && (
              <TouchableOpacity 
                style={[styles.loginButton, styles.anonymousBtn]}
                onPress={async () => {
                  try {
                    await dispatch(getAnonymousToken()).unwrap();
                    addLog('익명 사용자로 전환됨', 'info');
                  } catch (error) {
                    addLog(`익명 로그인 실패: ${error.message}`, 'error');
                  }
                }}
              >
                <Text style={styles.loginButtonText}>익명 사용자 전환</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>업데이트 상태:</Text>
            <View style={[styles.statusBadge, styles[`status_${updateStatus}`]]}>
              <Text style={styles.statusText}>
                {updateStatus === 'idle' && '대기 중'}
                {updateStatus === 'checking' && '확인 중'}
                {updateStatus === 'downloading' && '다운로드 중'}
                {updateStatus === 'ready' && '준비 완료'}
                {updateStatus === 'error' && '오류 발생'}
              </Text>
            </View>
          </View>
          
          {/* 기존 코드 유지 */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoLabel}>Runtime Version:</Text>
            <Text style={styles.infoValue}>{Constants.expoConfig?.runtimeVersion?.policy || '알 수 없음'}</Text>
          </View>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoLabel}>Update URL:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {Constants.expoConfig?.updates?.url || '알 수 없음'}
            </Text>
          </View>
          
          <Text style={styles.logTitle}>업데이트 로그:</Text>
          
          <ScrollView style={styles.logContainer}>
            {updateLogs.length === 0 ? (
              <Text style={styles.emptyLogText}>로그가 없습니다.</Text>
            ) : (
              updateLogs.map((log, index) => (
                <View key={index} style={styles.logItem}>
                  <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                  <Text style={[styles.logMessage, styles[`log_${log.type}`]]}>
                    {log.message}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.checkButton]} 
              onPress={checkForUpdates}
            >
              <Text style={styles.buttonText}>업데이트 확인</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.closeButton]} 
              onPress={() => setShowDebugModal(false)}
            >
              <Text style={styles.buttonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // 업데이트 로딩 중이거나 데이터 초기화 중이면 로딩 화면 표시
  if (isUpdating) {
    return (
      <>
        <CodePushUpdateLoading error={updateError} />
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={() => setShowDebugModal(true)}
        >
          <Ionicons name="bug-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <UpdateDebugModal />
      </>
    );
  }
  
  // 데이터 초기화 중이면 로딩 화면 표시
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={() => setShowDebugModal(true)}
        >
          <Ionicons name="bug-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <UpdateDebugModal />
      </View>
    );
  }
  
  return (
    <>
      <AppNavigator linking={linking} />
      <View style={styles.debugButtonsContainer}>
        <TouchableOpacity 
          style={[styles.debugButton, styles.updateDebugButton]}
          onPress={() => setShowDebugModal(true)}
        >
          <Ionicons name="bug-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <UpdateDebugModal />
      <PushNotificationDebugger />
    </>
  );
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  debugButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 1000,
  },
  updateDebugButton: {
    backgroundColor: '#4CAF50', // 업데이트 디버그 버튼 색상
  },
  debugButtonsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    zIndex: 1000,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  status_idle: {
    backgroundColor: '#e0e0e0',
  },
  status_checking: {
    backgroundColor: '#90CAF9',
  },
  status_downloading: {
    backgroundColor: '#FFD54F',
  },
  status_ready: {
    backgroundColor: '#A5D6A7',
  },
  status_error: {
    backgroundColor: '#EF9A9A',
  },
  statusText: {
    color: '#333',
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    fontWeight: 'bold',
    width: 120,
  },
  infoValue: {
    flex: 1,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  logContainer: {
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  emptyLogText: {
    fontStyle: 'italic',
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  logItem: {
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 5,
  },
  logTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  logMessage: {
    fontSize: 14,
  },
  log_info: {
    color: '#2196F3',
  },
  log_success: {
    color: '#4CAF50',
  },
  log_warning: {
    color: '#FF9800',
  },
  log_error: {
    color: '#F44336',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  checkButton: {
    backgroundColor: '#4CAF50',
  },
  closeButton: {
    backgroundColor: '#9E9E9E',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loginStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userInfoContainer: {
    marginBottom: 10,
    paddingVertical: 5,
  },
  userInfoText: {
    fontSize: 14,
    color: '#333',
  },
  loginButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  loginButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  loginBtn: {
    backgroundColor: '#4285F4',
  },
  logoutBtn: {
    backgroundColor: '#F44336',
  },
  anonymousBtn: {
    backgroundColor: '#9E9E9E',
  },
  loginButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
