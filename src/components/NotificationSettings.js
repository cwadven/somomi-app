import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, Platform, Linking } from 'react-native';
import AlertModal from './AlertModal';

// Firebase 관련 모듈은 웹이 아닌 환경에서만 import
let messaging;
if (Platform.OS !== 'web') {
  try {
    messaging = require('@react-native-firebase/messaging').default;
  } catch (error) {
    console.error('Firebase 모듈 로드 실패:', error);
  }
}

import { requestNotificationPermissions, scheduleDailyReminderIfNeeded } from '../utils/notificationUtils';
import { saveAppPrefs, loadAppPrefs } from '../utils/storageUtils';

const NotificationSettings = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState(null);
  const [remindExpiryEnabled, setRemindExpiryEnabled] = useState(true); // 9시 리마인더
  const [remindAddEnabled, setRemindAddEnabled] = useState(true); // 20시 리마인더
  const [offlineMode, setOfflineMode] = useState(false); // 수동 오프라인 모드

  // 알림 권한 상태 확인
  const checkNotificationPermission = async () => {
    if (Platform.OS === 'web') {
      setNotificationsEnabled(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      if (!messaging) {
        console.warn('Firebase Messaging이 초기화되지 않았습니다.');
        setNotificationsEnabled(false);
        setIsLoading(false);
        return;
      }
      
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().hasPermission();
        const enabled = 
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
          
        setNotificationsEnabled(enabled);
      } else {
        // 안드로이드는 API 레벨 33 이상에서만 권한 확인이 필요
        const PermissionsAndroid = require('react-native').PermissionsAndroid;
        
        if (Platform.Version >= 33 && PermissionsAndroid) {
          const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          setNotificationsEnabled(granted);
        } else {
          // 안드로이드 13 미만은 기본적으로 허용됨
          setNotificationsEnabled(true);
        }
      }
    } catch (error) {
      console.error('알림 권한 확인 오류:', error);
      setNotificationsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 설정으로 이동하는 함수
  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
    setModalVisible(false);
  };

  // 알림 권한 요청
  const toggleNotifications = async () => {
    if (Platform.OS === 'web') {
      setModalTitle('알림 설정');
      setModalMessage('웹에서는 알림 설정을 지원하지 않습니다.');
      setModalAction(null);
      setModalVisible(true);
      return;
    }

    try {
      if (notificationsEnabled) {
        // 이미 활성화된 경우 설정으로 이동
        setModalTitle('알림 비활성화');
        setModalMessage('알림을 비활성화하려면 기기의 설정에서 변경해야 합니다.');
        setModalAction(openSettings);
        setModalVisible(true);
      } else {
        // 권한 요청
        const granted = await requestNotificationPermissions();
        setNotificationsEnabled(granted);
        if (granted) {
          await saveAppPrefs({ notificationsEnabled: true });
          // 리마인더 스케줄링 (앱 진입 시점 기준)
          scheduleDailyReminderIfNeeded();
        }
        
        if (!granted) {
          // 권한 거부된 경우 설정으로 이동 안내
          setModalTitle('알림 권한 거부됨');
          setModalMessage('알림을 활성화하려면 기기의 설정에서 권한을 허용해주세요.');
          setModalAction(openSettings);
          setModalVisible(true);
        }
      }
    } catch (error) {
      console.error('알림 설정 변경 오류:', error);
      setModalTitle('오류');
      setModalMessage('알림 설정을 변경하는 중 오류가 발생했습니다.');
      setModalAction(null);
      setModalVisible(true);
    }
  };

  // 컴포넌트 마운트 시 권한/설정 확인
  useEffect(() => {
    (async () => {
      checkNotificationPermission();
      const prefs = await loadAppPrefs();
      if (prefs) {
        if (typeof prefs.remindExpiryEnabled === 'boolean') setRemindExpiryEnabled(prefs.remindExpiryEnabled);
        if (typeof prefs.remindAddEnabled === 'boolean') setRemindAddEnabled(prefs.remindAddEnabled);
        if (typeof prefs.offlineMode === 'boolean') setOfflineMode(prefs.offlineMode);
      }
    })();
    // 설정 로드 후 스케줄 확인
    scheduleDailyReminderIfNeeded();
    
    // 웹 환경이 아니고 messaging이 있을 때만 실행
    if (Platform.OS !== 'web' && messaging) {
      try {
    // 앱이 포그라운드로 돌아올 때마다 권한 상태 확인
    const subscription = messaging().onMessage(async () => {
      checkNotificationPermission();
    });
    
    return () => {
      subscription();
    };
      } catch (error) {
        console.error('메시징 리스너 설정 오류:', error);
      }
    }
    
    // 웹 환경이거나 messaging이 없는 경우 빈 클린업 함수 반환
    return () => {};
  }, []);

  const handleModalClose = () => {
    setModalVisible(false);
    if (modalAction) {
      modalAction();
    }
  };

  return (
    <View style={styles.container}>
      {/* 오프라인 모드 (수동 전환) */}
      <View style={styles.settingItem}>
        <Text style={styles.settingText}>오프라인 모드</Text>
        <Switch
          value={offlineMode}
          onValueChange={async (v) => {
            setOfflineMode(v);
            await saveAppPrefs({ offlineMode: v, syncMode: v ? 'offline' : 'online' });
          }}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={offlineMode ? '#4630EB' : '#f4f3f4'}
        />
      </View>
      <Text style={styles.description}>
        {offlineMode
          ? '오프라인 모드입니다. 서버와 통신하지 않고 이 기기의 데이터만 사용합니다.'
          : '온라인 모드입니다. 서버와 데이터를 동기화할 수 있습니다.'}
      </Text>

      <View style={styles.settingItem}>
        <Text style={styles.settingText}>알림 허용</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={toggleNotifications}
          disabled={isLoading}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={notificationsEnabled ? '#4630EB' : '#f4f3f4'}
        />
      </View>
      <Text style={styles.description}>
        {notificationsEnabled
          ? '알림이 활성화되어 있습니다. 제품 유통기한 알림 및 기타 중요 정보를 받을 수 있습니다.'
          : '알림이 비활성화되어 있습니다. 제품 유통기한 알림 및 기타 중요 정보를 받으려면 알림을 활성화하세요.'}
      </Text>

      {/* 9시 리마인더 (소진/유통기한) */}
      <View style={styles.settingItem}>
        <Text style={styles.settingText}>제품 소진 리마인더 알림 (오전 9시)</Text>
        <Switch
          value={remindExpiryEnabled}
          onValueChange={async (v) => {
            setRemindExpiryEnabled(v);
            await saveAppPrefs({ remindExpiryEnabled: v });
            scheduleDailyReminderIfNeeded();
          }}
          disabled={!notificationsEnabled}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={remindExpiryEnabled ? '#4630EB' : '#f4f3f4'}
        />
      </View>
      {/* 20시 리마인더 (제품 추가) */}
      <View style={styles.settingItem}>
        <Text style={styles.settingText}>제품 추가 리마인더 알림 (오후 8시)</Text>
        <Switch
          value={remindAddEnabled}
          onValueChange={async (v) => {
            setRemindAddEnabled(v);
            await saveAppPrefs({ remindAddEnabled: v });
            // 별도 스케줄러 호출
            const { scheduleDailyUpdateReminderIfNeeded } = require('../utils/notificationUtils');
            scheduleDailyUpdateReminderIfNeeded();
          }}
          disabled={!notificationsEnabled}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={remindAddEnabled ? '#4630EB' : '#f4f3f4'}
        />
      </View>
      
      <AlertModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        onClose={handleModalClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});

export default NotificationSettings; 