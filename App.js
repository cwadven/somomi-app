import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Platform, StyleSheet, Linking, AppState, View, ActivityIndicator, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import store from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import { verifyToken, getAnonymousToken, logout, loadUserLocationTemplateInstances, loadUserProductSlotTemplateInstances, updateSubscription } from './src/redux/slices/authSlice';
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
import { loadData, saveData, STORAGE_KEYS } from './src/utils/storageUtils';
import { scheduleDailyReminderIfNeeded, scheduleDailyUpdateReminderIfNeeded } from './src/utils/notificationUtils';

// Firebase 관련 모듈은 웹이 아닌 환경에서만 import
let messaging;
let FileSystem;
let Sharing;
if (Platform.OS !== 'web') {
  try {
    messaging = require('@react-native-firebase/messaging').default;
    try {
      FileSystem = require('expo-file-system');
    } catch (e) {
      console.warn('expo-file-system 로드 실패:', e?.message || String(e));
    }
    try {
      Sharing = require('expo-sharing');
    } catch (e) {
      console.warn('expo-sharing 로드 실패:', e?.message || String(e));
    }
    
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
  const prevAppStateRef = useRef(AppState.currentState);
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
        try {
          // 업데이트 다운로드 (현재 세션에선 적용하지 않음)
          const fetchResult = await Updates.fetchUpdateAsync();
          addLog(`업데이트 다운로드 완료: ${JSON.stringify(fetchResult)}\n다음 앱 재시작 시 적용됩니다.`, 'success');
          setUpdateStatus('ready');
          // 다음 포그라운드 진입 시 자동 적용
          updateReadyRef.current = true;
        } catch (fetchError) {
          console.error('Update fetch error:', fetchError);
          const errorMsg = `업데이트 다운로드 오류: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;
          addLog(errorMsg, 'error');
          setUpdateError(errorMsg);
          setUpdateStatus('error');
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

  // 앱 재시작 1회만으로 적용되도록: 실행 초기에 미리 다운로드, 백그라운드 전환 시에도 미리 다운로드
  const isPrefetchingRef = useRef(false);
  const updateReadyRef = useRef(false);
  const prefetchUpdateIfAvailable = useCallback(async () => {
    if (__DEV__ || Platform.OS === 'web') return;
    if (isPrefetchingRef.current) return;
    try {
      isPrefetchingRef.current = true;
      const update = await Updates.checkForUpdateAsync();
      if (update?.isAvailable) {
        try {
          await Updates.fetchUpdateAsync();
          addLog('업데이트 사전 다운로드 완료. 다음 재시작 시 적용됩니다.', 'info');
          // 다음 포그라운드 진입 시 자동 적용
          updateReadyRef.current = true;
        } catch (e) {
          addLog(`업데이트 사전 다운로드 실패: ${e instanceof Error ? e.message : String(e)}`, 'warning');
        }
      }
    } catch (e) {
      // ignore
    } finally {
      isPrefetchingRef.current = false;
    }
  }, [addLog]);
  
  // 앱 상태 변경 핸들러
  const handleAppStateChange = useCallback(async (nextAppState) => {
    const previousState = prevAppStateRef.current;
    setAppState(nextAppState);
    
    // 앱이 백그라운드/비활성 → 활성으로 전환될 때만 처리
    if (previousState?.match(/inactive|background/) && nextAppState === 'active' && Platform.OS !== 'web') {
      pushNotificationService.requestNotificationPermission();
      try { scheduleDailyReminderIfNeeded(); } catch (e) { }
      try { scheduleDailyUpdateReminderIfNeeded(); } catch (e) { }
      // 포그라운드 복귀 시 업데이트가 준비되어 있으면 즉시 적용
      if (updateReadyRef.current) {
        updateReadyRef.current = false;
        try {
          addLog('포그라운드 복귀: 다운로드된 업데이트 적용', 'info');
          await Updates.reloadAsync();
        } catch (e) {
          addLog(`업데이트 적용 실패: ${e instanceof Error ? e.message : String(e)}`, 'error');
        }
      }
    }
    // 활성 → 비활성/백그라운드로 갈 때, 업데이트 사전 다운로드 시도
    if (previousState === 'active' && nextAppState?.match(/inactive|background/)) {
      prefetchUpdateIfAvailable();
    }
    prevAppStateRef.current = nextAppState;
  }, []);

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
      // 프로덕션: 앱 시작 시 업데이트 사전 다운로드 시도 (다음 1회 재시작에 적용)
      try { await prefetchUpdateIfAvailable(); } catch (e) {}
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
      // 단, 기존에 저장된 Access Token(비-익명)이 있으면 절대 덮어쓰지 않음
      try {
        const existingToken = await loadData(STORAGE_KEYS.JWT_TOKEN);
        const isAnonymousToken = existingToken && typeof existingToken === 'string' && existingToken.startsWith('anonymous_');
        if (!existingToken || isAnonymousToken) {
          await dispatch(getAnonymousToken()).unwrap();
        }
      } catch (anonymousError) {
        console.error('익명 토큰 발급 실패:', anonymousError);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // 초기화: 마운트 시 1회만 수행
  useEffect(() => {
    initializeApp();
  }, [dispatch]);

  // 앱 상태 변경 리스너 등록
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      appStateSubscription.remove();
      pushNotificationService.cleanupNotificationHandler();
    };
  }, [handleAppStateChange]);

  // 업데이트 확인 (프로덕션에서만)
  useEffect(() => {
    if (!__DEV__) {
      checkForUpdates();
    }
  }, [checkForUpdates]);

  // 주기적으로 동기화 큐 처리 (모드 제거)
  useEffect(() => {
    let interval;
    (async () => {
      // 최초 진입 시 한 번 처리
      await processSyncQueueIfOnline(dispatch, store.getState);
      // 주기적으로 큐 여부를 확인(가벼운 작업)
      interval = setInterval(async () => {
        await processSyncQueueIfOnline(dispatch, store.getState);
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
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} nestedScrollEnabled>
            {/* 디버그 로그인 영역 (최상단으로 이동) */}
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
                      const mockCredentials = {
                        username: '디버그 사용자',
                        email: 'debug@example.com'
                      };
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
            
            {/* 데이터 내보내기 섹션 */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.infoLabel}>데이터 내보내기 (JSON)</Text>
              <View style={{ flexDirection: 'column', marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.button, styles.checkButton, { marginBottom: 8 }]}
                  onPress={async () => {
                    try {
                      const data = await loadData(STORAGE_KEYS.LOCATIONS) || [];
                      await exportJsonFile('locations', data);
                    } catch (e) {
                      addLog(`영역 export 실패: ${e?.message || String(e)}`, 'error');
                    }
                  }}
                >
                  <Text style={styles.buttonText}>영역 export</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.checkButton, { marginBottom: 8 }]}
                  onPress={async () => {
                    try {
                      const data = await loadData(STORAGE_KEYS.PRODUCTS) || [];
                      await exportJsonFile('products', data);
                    } catch (e) {
                      addLog(`제품 export 실패: ${e?.message || String(e)}`, 'error');
                    }
                  }}
                >
                  <Text style={styles.buttonText}>제품 export</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.checkButton]}
                  onPress={async () => {
                    try {
                      const data = await loadData(STORAGE_KEYS.CONSUMED_PRODUCTS) || [];
                      await exportJsonFile('consumed_products', data);
                    } catch (e) {
                      addLog(`소진된 제품 export 실패: ${e?.message || String(e)}`, 'error');
                    }
                  }}
                >
                  <Text style={styles.buttonText}>소진된 제품 export</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 데이터 가져오기 섹션 제거됨 */}
 
            {isLoggedIn && user && (
              <View style={styles.userInfoContainer}>
                <Text style={styles.userInfoText}>
                  사용자: {user.username || user.name || '알 수 없음'}
                </Text>
              </View>
            )}
            
            {/* 구독 디버깅 섹션 */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.infoLabel}>구독 디버깅</Text>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.button, styles.logoutBtn, { marginRight: 6 }]}
                  onPress={() => {
                    dispatch(updateSubscription({ isSubscribed: false, plan: null, expiresAt: null }));
                    addLog('구독 해제 처리됨(isSubscribed=false, plan=null)', 'warning');
                  }}
                >
                  <Text style={styles.buttonText}>구독 해제</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.checkButton, { marginLeft: 6 }]}
                  onPress={() => {
                    const nowIso = new Date().toISOString();
                    dispatch(updateSubscription({ isSubscribed: false, expiresAt: nowIso }));
                    addLog(`구독 만료 처리됨(isSubscribed=false, expiresAt=${nowIso})`, 'warning');
                  }}
                >
                  <Text style={styles.buttonText}>구독 만료(즉시)</Text>
                </TouchableOpacity>
              </View>
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
            
            <ScrollView style={styles.logContainer} nestedScrollEnabled>
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // JSON 내보내기 헬퍼
  const exportJsonFile = async (baseName, data) => {
    try {
      const json = JSON.stringify(data, null, 2);
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `somomi_export_${baseName}_${ts}.json`;
      // 1) 웹: 브라우저 다운로드 처리
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          addLog(`다운로드 시작(웹): ${fileName}`, 'success');
          return fileName;
        } catch (e) {
          console.error('웹 다운로드 실패:', e);
          addLog(`웹 다운로드 실패: ${e?.message || String(e)}`, 'error');
        }
      }

      // 2) Android: SAF로 Downloads 등에 저장 시도
      if (Platform.OS === 'android' && FileSystem && FileSystem.StorageAccessFramework) {
        try {
          const { granted, directoryUri } = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (granted && directoryUri) {
            const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
              directoryUri,
              fileName,
              'application/json'
            );
            await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
            addLog(`다운로드 완료(안드로이드 SAF): ${fileName}`, 'success');
            return fileUri;
          } else {
            addLog('디렉토리 권한이 거부되어 공유 시트로 전환합니다.', 'warning');
          }
        } catch (safErr) {
          console.warn('SAF 저장 실패:', safErr?.message || String(safErr));
          addLog(`SAF 저장 실패: ${safErr?.message || String(safErr)}`, 'error');
        }
      }

      // 3) iOS 또는 SAF 실패 시: 문서 디렉토리에 저장 후 공유 시트
      if (Platform.OS !== 'web' && FileSystem && FileSystem.documentDirectory) {
        const uri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
        addLog(`파일 저장 완료: ${fileName}\n경로: ${uri}`, 'success');
        if (Sharing && typeof Sharing.isAvailableAsync === 'function') {
          try {
            const available = await Sharing.isAvailableAsync();
            if (available && typeof Sharing.shareAsync === 'function') {
              await Sharing.shareAsync(uri, {
                mimeType: 'application/json',
                dialogTitle: `${baseName} JSON 내보내기`,
                UTI: 'public.json',
              });
              addLog('공유 시트 표시 완료', 'info');
            } else {
              addLog('공유 시트를 사용할 수 없습니다. 파일은 앱 문서 디렉토리에 저장되었습니다.', 'warning');
            }
          } catch (shareErr) {
            console.warn('공유 시트 표시 실패:', shareErr?.message || String(shareErr));
            addLog(`공유 시트 표시 실패: ${shareErr?.message || String(shareErr)}`, 'error');
          }
        }
        return uri;
      }

      // 4) 마지막 수단: 콘솔 로그
      console.log(`[EXPORT:${baseName}]`, json);
      addLog(`파일 시스템을 사용할 수 없어 로그로 내보냈습니다. [${baseName}]`, 'warning');
      return null;
    } catch (e) {
      addLog(`내보내기 실패(${baseName}): ${e?.message || String(e)}`, 'error');
      return null;
    }
  };

  // JSON 가져오기 헬퍼 (파일 선택 → 저장 → 후처리)
  const importJsonFromPicker = async (label, storageKey, afterSave) => {
    try {
      if (Platform.OS === 'web' || !DocumentPicker || !FileSystem) {
        addLog(`${label} import는 현재 플랫폼에서 지원되지 않습니다. (웹/모듈 미존재)`, 'warning');
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result?.type !== 'success') {
        addLog(`${label} import 취소됨`, 'info');
        return;
      }

      const fileUri = result.assets?.[0]?.uri || result.uri;
      if (!fileUri) {
        addLog(`${label} import 실패: 파일 경로를 확인할 수 없습니다.`, 'error');
        return;
      }

      const content = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        addLog(`${label} JSON 파싱 실패: ${e?.message || String(e)}`, 'error');
        return;
      }

      if (!Array.isArray(parsed)) {
        addLog(`${label} import 실패: 최상위 구조는 배열이어야 합니다.`, 'error');
        return;
      }

      await saveData(storageKey, parsed);
      addLog(`${label} import 완료: ${parsed.length}건 저장`, 'success');
      if (typeof afterSave === 'function') {
        await afterSave();
      }
    } catch (e) {
      addLog(`${label} import 중 오류: ${e?.message || String(e)}`, 'error');
    }
  };
  
  // 업데이트 로딩 중이거나 데이터 초기화 중이면 로딩 화면 표시
  if (isUpdating) {
    return (
      <>
        <CodePushUpdateLoading error={updateError} />
        {Platform.OS === 'web' && (
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={() => setShowDebugModal(true)}
          >
            <Ionicons name="bug-outline" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        <UpdateDebugModal />
      </>
    );
  }
  
  // 데이터 초기화 중이면 로딩 화면 표시
  if (isLoading) {
    return (
      <CodePushUpdateLoading />
    );
  }
  
  return (
    <>
      <AppNavigator linking={linking} />
      {Platform.OS === 'web' && (
        <View style={styles.debugButtonsContainer}>
          <TouchableOpacity 
            style={[styles.debugButton, styles.updateDebugButton]}
            onPress={() => setShowDebugModal(true)}
          >
            <Ionicons name="bug-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      <UpdateDebugModal />
      {Platform.OS === 'web' && <PushNotificationDebugger />}
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
  modalScroll: {
    maxHeight: '100%',
  },
  modalScrollContent: {
    paddingBottom: 20,
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
