import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { Platform, StyleSheet, Linking, AppState, View, ActivityIndicator, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import store from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import { verifyToken, getAnonymousToken } from './src/redux/slices/authSlice';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import CodePushUpdateLoading from './src/components/CodePushUpdateLoading';
import { Ionicons } from '@expo/vector-icons';
import { 
  initializeNotifications, 
  cleanupNotifications, 
  requestNotificationPermissions, 
  registerForPushNotifications
} from './src/utils/notificationUtils';
import { initializeData } from './src/api/productsApi';
import { initializeNotificationsData } from './src/redux/slices/notificationsSlice';
import { loadCategories } from './src/redux/slices/categoriesSlice';

// Firebase 관련 모듈은 웹이 아닌 환경에서만 import
let messaging;
let notifee;
if (Platform.OS !== 'web') {
  messaging = require('@react-native-firebase/messaging').default;
  notifee = require('@notifee/react-native').default;
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

// 백그라운드 메시지 핸들러 설정 (앱이 로드되기 전에 설정해야 함)
if (Platform.OS !== 'web' && messaging) {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('백그라운드 메시지 수신:', remoteMessage);

    try {
      // Notifee를 사용하여 알림 표시
      if (remoteMessage.notification && notifee) {
        await notifee.displayNotification({
          title: remoteMessage.notification.title || '알림',
          body: remoteMessage.notification.body || '새 알림이 있습니다',
          android: {
            channelId: 'default',
            smallIcon: 'ic_launcher',
            importance: notifee.AndroidImportance.HIGH,
            sound: 'default',
          },
          data: remoteMessage.data || {},
        });
      }
    } catch (error) {
      console.error('백그라운드 알림 처리 오류:', error);
    }

    return Promise.resolve();
  });
}

// 앱 내부 컴포넌트 - 토큰 검증 및 초기화 로직을 포함
const AppContent = () => {
  const dispatch = useDispatch();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [pushToken, setPushToken] = useState('');
  const [appState, setAppState] = useState(AppState.currentState);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
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

  // Firebase 푸시 토큰 등록
  const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === 'web') {
      console.log('웹에서는 푸시 알림을 지원하지 않습니다.');
      return;
    }

    // Firebase가 초기화되지 않았으면 실행하지 않음
    if (!messaging || !notifee) {
      console.log('Firebase가 초기화되지 않았습니다.');
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
      addLog('업데이트 확인 시작...', 'info');
      setUpdateStatus('checking');
      
      // Updates.isEnabled 확인
      const isEnabled = typeof Updates.isEnabled === 'function' 
        ? await Updates.isEnabled() 
        : Updates.isEnabled;
      
      if (!isEnabled) {
        console.log('expo-updates가 활성화되어 있지 않습니다.');
        addLog('expo-updates가 활성화되어 있지 않습니다.', 'warning');
        setUpdateStatus('error');
        return;
      }
      
      setUpdateError(null);
      
      console.log('업데이트 확인 중...');
      addLog('업데이트 확인 중...', 'info');
      const update = await Updates.checkForUpdateAsync();
      console.log('업데이트 확인 결과:', JSON.stringify(update));
      addLog(`업데이트 확인 결과: ${JSON.stringify(update)}`, 'info');
      
      if (update.isAvailable) {
        console.log('새 업데이트가 있습니다. 다운로드 시작...');
        addLog('새 업데이트가 있습니다. 다운로드 시작...', 'success');
        setUpdateStatus('downloading');
        setIsUpdating(true);
        
        try {
          // 업데이트 다운로드
          const fetchResult = await Updates.fetchUpdateAsync();
          console.log('업데이트 다운로드 완료:', JSON.stringify(fetchResult));
          addLog(`업데이트 다운로드 완료: ${JSON.stringify(fetchResult)}`, 'success');
          setUpdateStatus('ready');
          
          // 업데이트 자동 적용
          console.log('업데이트 자동 적용 시작...');
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
        console.log('사용 가능한 업데이트가 없습니다.');
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
        setIsLoading(true);
        // 로컬 데이터 초기화
        await initializeData();
        await initializeNotificationsData();
        
        // 카테고리 데이터 로드
        await dispatch(loadCategories());
        
        setDataInitialized(true);
        
        // 저장된 토큰 검증
        const result = await dispatch(verifyToken()).unwrap();
        
        // 토큰이 없는 경우 익명 토큰 발급
        if (!result) {
          await dispatch(getAnonymousToken()).unwrap();
        }
        
        // 웹이 아닌 환경에서만 알림 관련 코드 실행
        if (Platform.OS !== 'web' && messaging && notifee) {
          // 알림 권한 요청 및 초기화
          await registerForPushNotificationsAsync();
        }
      } catch (error) {
        console.error('인증 초기화 실패:', error);
        // 오류 발생 시 익명 토큰 발급
        try {
          await dispatch(getAnonymousToken()).unwrap();
        } catch (anonymousError) {
          console.error('익명 토큰 발급 실패:', anonymousError);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeApp();
    
    // 앱 상태 변경 리스너 등록
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // 웹이 아닌 환경에서만 알림 관련 코드 실행
    if (Platform.OS !== 'web') {
      // 알림 설정 초기화
      if (notifee) {
        initializeNotifications();
      }
      
      // Firebase 관련 이벤트 리스너 등록
      let unsubscribe;
      let messagingUnsubscribe;
      
      // Notifee 이벤트 리스너 (알림 클릭 이벤트)
      if (notifee) {
        unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
          if (type === notifee.EventType.PRESS && detail.notification) {
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
          
          if (type === notifee.EventType.PRESS && detail.notification) {
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
      }
      
      // Firebase 메시징 이벤트 리스너
      if (messaging) {
        messagingUnsubscribe = messaging().onMessage(async remoteMessage => {
          console.log('포그라운드 메시지 수신:', remoteMessage);
          
          // Notifee를 사용하여 포그라운드 알림 표시
          if (remoteMessage.notification && notifee) {
            await notifee.displayNotification({
              title: remoteMessage.notification.title,
              body: remoteMessage.notification.body,
              android: {
                channelId: 'default',
                smallIcon: 'ic_launcher',
                importance: notifee.AndroidImportance.HIGH,
                sound: 'default',
              },
              data: remoteMessage.data,
            });
          }
        });
      }
      
      return () => {
        // 앱 상태 변경 리스너 정리
        subscription.remove();
        
        // 알림 설정 정리
        if (notifee) {
          cleanupNotifications();
        }
        
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
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>상태:</Text>
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
      <TouchableOpacity 
        style={styles.debugButton}
        onPress={() => setShowDebugModal(true)}
      >
        <Ionicons name="bug-outline" size={24} color="#fff" />
      </TouchableOpacity>
      <UpdateDebugModal />
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
    position: 'absolute',
    bottom: 20,
    right: 20,
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
});
