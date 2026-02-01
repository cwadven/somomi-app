import { useState, useEffect, useMemo } from 'react';
import { View, Text, Switch, StyleSheet, Platform, TouchableOpacity, Modal, TextInput } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
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

const NotificationSettings = ({ categoryAlarmEnabled, onChangeCategoryAlarmEnabled }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [remindExpiryEnabled, setRemindExpiryEnabled] = useState(true); // 9시 리마인더
  const [remindAddEnabled, setRemindAddEnabled] = useState(true); // 20시 리마인더
  const [offlineMode, setOfflineMode] = useState(false); // 제거 예정 (UI 숨김)
  const [remindExpiryTime, setRemindExpiryTime] = useState({ hour: 9, minute: 0 });
  const [remindAddTime, setRemindAddTime] = useState({ hour: 20, minute: 0 });
  const [timePickerTarget, setTimePickerTarget] = useState(null); // 'expiry' | 'add' | null
  const [tempTime, setTempTime] = useState(new Date());
  const [webTimeDraft, setWebTimeDraft] = useState({ hourText: '09', minuteText: '00' });

  const effectiveEnabled = useMemo(() => {
    // 제품 리마인더(로컬)는 "기기 알림 권한" 기준으로만 동작 (카테고리 알림 허용과는 별개)
    // 웹은 실제 알림은 없지만 설정/저장은 가능
    if (Platform.OS === 'web') return true;
    return !!notificationsEnabled;
  }, [notificationsEnabled, categoryAlarmEnabled]);

  // NOTE: canUseDeviceNotifications 제거 (권한 안내는 상단 공통 문구로 처리)

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

  // 카테고리 알림 허용 토글 (OS 설정 이동 X)
  const toggleCategoryNotifications = async (nextValue) => {
    try {
      if (saving) return;
      setSaving(true);

      // OFF: 서버 알림만 끔 (OS 권한은 별도 메뉴에서 관리)
      if (!nextValue) {
        if (typeof onChangeCategoryAlarmEnabled === 'function') {
          await onChangeCategoryAlarmEnabled(false);
        }
        return;
      }

      // ON: 서버 알림 허용 ON (OS 권한/설정은 별도 메뉴에서)
      if (typeof onChangeCategoryAlarmEnabled === 'function') {
        await onChangeCategoryAlarmEnabled(true);
      }

      // OS 권한이 꺼져있다면 안내만 표시
      if (Platform.OS !== 'web' && !notificationsEnabled) {
        setModalTitle('안내');
        setModalMessage(
          '매일 15:00에 발송돼요.\n\n프로필 > "안드로이드 앱 푸시 설정"에서 기기 알림 권한을 켜주세요.'
        );
        setModalVisible(true);
      }
    } catch (error) {
      console.error('알림 설정 변경 오류:', error);
      setModalTitle('오류');
      setModalMessage(error?.message ? String(error.message) : '알림 설정을 변경하는 중 오류가 발생했습니다.');
      setModalVisible(true);
    } finally {
      setSaving(false);
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
        if (prefs.remindExpiryTime && typeof prefs.remindExpiryTime === 'object') {
          const h = Number(prefs.remindExpiryTime.hour);
          const m = Number(prefs.remindExpiryTime.minute);
          if (Number.isFinite(h) && Number.isFinite(m)) {
            setRemindExpiryTime({ hour: Math.min(23, Math.max(0, Math.floor(h))), minute: Math.min(59, Math.max(0, Math.floor(m))) });
          }
        }
        if (prefs.remindAddTime && typeof prefs.remindAddTime === 'object') {
          const h = Number(prefs.remindAddTime.hour);
          const m = Number(prefs.remindAddTime.minute);
          if (Number.isFinite(h) && Number.isFinite(m)) {
            setRemindAddTime({ hour: Math.min(23, Math.max(0, Math.floor(h))), minute: Math.min(59, Math.max(0, Math.floor(m))) });
          }
        }
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

  const formatHM = (t) => {
    const h = String(t?.hour ?? 0).padStart(2, '0');
    const m = String(t?.minute ?? 0).padStart(2, '0');
    return `${h}:${m}`;
  };

  const openTimePicker = (target) => {
    const base = target === 'add' ? remindAddTime : remindExpiryTime;
    const d = new Date();
    d.setHours(base?.hour ?? 0, base?.minute ?? 0, 0, 0);
    // Android: 다이얼로그로 바로 열기 (모달 중첩에서도 확실하게 동작)
    if (Platform.OS === 'android') {
      try {
        DateTimePickerAndroid.open({
          value: d,
          mode: 'time',
          is24Hour: true,
          onChange: async (event, date) => {
            if (event?.type === 'dismissed') return;
            if (event?.type === 'set' && date) {
              await applyPickedTime(date, target);
            }
          },
        });
      } catch (e) {
        // fallback: iOS/web 방식으로 렌더
        setTempTime(d);
        setTimePickerTarget(target);
      }
      return;
    }

    // Web/iOS: 컴포넌트 렌더로 표시
    setTempTime(d);
    setTimePickerTarget(target);
    // Web: 입력값 초기화
    if (Platform.OS === 'web') {
      const hh = String(base?.hour ?? 0).padStart(2, '0');
      const mm = String(base?.minute ?? 0).padStart(2, '0');
      setWebTimeDraft({ hourText: hh, minuteText: mm });
    }
  };

  const applyPickedTime = async (dateObj, targetOverride) => {
    const hour = Math.min(23, Math.max(0, dateObj.getHours()));
    const minute = Math.min(59, Math.max(0, dateObj.getMinutes()));

    const target = targetOverride || timePickerTarget;
    if (target === 'add') {
      const next = { hour, minute };
      setRemindAddTime(next);
      await saveAppPrefs({ remindAddTime: next });
      try {
        const { scheduleDailyUpdateReminderIfNeeded } = require('../utils/notificationUtils');
        scheduleDailyUpdateReminderIfNeeded();
      } catch (e) {}
      return;
    }

    const next = { hour, minute };
    setRemindExpiryTime(next);
    await saveAppPrefs({ remindExpiryTime: next });
    scheduleDailyReminderIfNeeded();
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* 오프라인 모드 UI 제거 */}

      {Platform.OS !== 'web' && !notificationsEnabled && (
        <View style={styles.permissionNotice}>
          <Text style={styles.permissionNoticeText}>
            현재 기기 알림 권한이 꺼져 있으면 실제 알림이 오지 않을 수 있어요.
          </Text>
        </View>
      )}

      <View style={styles.inlineSettingCard}>
        <View style={styles.inlineSettingRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.inlineSettingTitle}>카테고리 알림 허용</Text>
            <Text style={styles.inlineSettingDesc}>
              {categoryAlarmEnabled
                ? (notificationsEnabled
                    ? '카테고리 알림이 활성화되어 있습니다.'
                    : '매일 15:00에 발송돼요.')
                : '카테고리 알림이 비활성화되어 있습니다.'}
            </Text>
          </View>
          <Switch
            value={!!categoryAlarmEnabled}
            onValueChange={toggleCategoryNotifications}
            disabled={isLoading || saving}
            trackColor={{ false: '#767577', true: '#A5D6A7' }}
            thumbColor={categoryAlarmEnabled ? '#4CAF50' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* 9시 리마인더 (소진/유통기한) */}
      <View style={styles.inlineSettingCard}>
        <View style={styles.inlineSettingRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.inlineSettingTitle}>제품 소진 리마인더 알림</Text>
            <Text style={styles.inlineSettingDesc}>소진/유통기한 관리를 잊지 않도록 알려드려요.</Text>
          </View>
          <Switch
            value={remindExpiryEnabled}
            onValueChange={async (v) => {
              setRemindExpiryEnabled(v);
              await saveAppPrefs({ remindExpiryEnabled: v });
              scheduleDailyReminderIfNeeded();
            }}
            disabled={Platform.OS !== 'web' && !notificationsEnabled}
            trackColor={{ false: '#767577', true: '#A5D6A7' }}
            thumbColor={remindExpiryEnabled ? '#4CAF50' : '#f4f3f4'}
          />
        </View>
        <View style={styles.inlineSubRow}>
          <Text style={styles.inlineSubLabel}>알림 시간</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => openTimePicker('expiry')}
            disabled={Platform.OS !== 'web' && !notificationsEnabled}
          >
            <Text style={styles.timeButtonText}>{formatHM(remindExpiryTime)}</Text>
            <Text style={styles.timeButtonHint}>변경</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* 20시 리마인더 (제품 추가) */}
      <View style={styles.inlineSettingCard}>
        <View style={styles.inlineSettingRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.inlineSettingTitle}>제품 추가 리마인더 알림</Text>
            <Text style={styles.inlineSettingDesc}>저녁에 오늘 추가할 제품(또는 할 일)을 기록하도록 알려드려요.</Text>
          </View>
          <Switch
            value={remindAddEnabled}
            onValueChange={async (v) => {
              setRemindAddEnabled(v);
              await saveAppPrefs({ remindAddEnabled: v });
              // 별도 스케줄러 호출
              const { scheduleDailyUpdateReminderIfNeeded } = require('../utils/notificationUtils');
              scheduleDailyUpdateReminderIfNeeded();
            }}
            disabled={Platform.OS !== 'web' && !notificationsEnabled}
            trackColor={{ false: '#767577', true: '#A5D6A7' }}
            thumbColor={remindAddEnabled ? '#4CAF50' : '#f4f3f4'}
          />
        </View>
        <View style={styles.inlineSubRow}>
          <Text style={styles.inlineSubLabel}>알림 시간</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => openTimePicker('add')}
            disabled={Platform.OS !== 'web' && !notificationsEnabled}
          >
            <Text style={styles.timeButtonText}>{formatHM(remindAddTime)}</Text>
            <Text style={styles.timeButtonHint}>변경</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {timePickerTarget && Platform.OS !== 'web' && (
        <View style={styles.timePickerInline}>
          <DateTimePicker
            value={tempTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={async (event, date) => {
              if (date) setTempTime(date);
            }}
          />
          {Platform.OS === 'ios' && (
            <View style={styles.timePickerIosActions}>
              <TouchableOpacity
                style={[styles.timePickerActionBtn, styles.timePickerActionCancel]}
                onPress={() => setTimePickerTarget(null)}
              >
                <Text style={styles.timePickerActionText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timePickerActionBtn, styles.timePickerActionOk]}
                onPress={async () => {
                  await applyPickedTime(tempTime);
                  setTimePickerTarget(null);
                }}
              >
                <Text style={[styles.timePickerActionText, { color: '#fff' }]}>확인</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Web: 시간 선택 모달 (datetimepicker 미지원 대체) */}
      <Modal
        visible={Platform.OS === 'web' && !!timePickerTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerTarget(null)}
      >
        <View style={styles.webTimeModalOverlay}>
          <View style={styles.webTimeModalCard}>
            <Text style={styles.webTimeModalTitle}>알림 시간 설정</Text>
            <Text style={styles.webTimeModalDesc}>시간(0~23)과 분(0~59)을 입력해 주세요.</Text>
            <View style={styles.webTimeInputsRow}>
              <View style={styles.webTimeInputBox}>
                <Text style={styles.webTimeLabel}>시</Text>
                <TextInput
                  value={webTimeDraft.hourText}
                  onChangeText={(t) => setWebTimeDraft((p) => ({ ...p, hourText: t.replace(/[^\d]/g, '').slice(0, 2) }))}
                  style={styles.webTimeInput}
                  keyboardType="number-pad"
                  placeholder="09"
                />
              </View>
              <Text style={styles.webTimeColon}>:</Text>
              <View style={styles.webTimeInputBox}>
                <Text style={styles.webTimeLabel}>분</Text>
                <TextInput
                  value={webTimeDraft.minuteText}
                  onChangeText={(t) => setWebTimeDraft((p) => ({ ...p, minuteText: t.replace(/[^\d]/g, '').slice(0, 2) }))}
                  style={styles.webTimeInput}
                  keyboardType="number-pad"
                  placeholder="00"
                />
              </View>
            </View>
            <View style={styles.webTimeActionsRow}>
              <TouchableOpacity
                style={[styles.timePickerActionBtn, styles.timePickerActionCancel]}
                onPress={() => setTimePickerTarget(null)}
              >
                <Text style={styles.timePickerActionText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timePickerActionBtn, styles.timePickerActionOk]}
                onPress={async () => {
                  const h = Number(webTimeDraft.hourText);
                  const m = Number(webTimeDraft.minuteText);
                  const hour = Number.isFinite(h) ? Math.min(23, Math.max(0, Math.floor(h))) : 0;
                  const minute = Number.isFinite(m) ? Math.min(59, Math.max(0, Math.floor(m))) : 0;
                  const d = new Date();
                  d.setHours(hour, minute, 0, 0);
                  await applyPickedTime(d);
                  setTimePickerTarget(null);
                }}
              >
                <Text style={[styles.timePickerActionText, { color: '#fff' }]}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    // 최상위 박스(카드) 제거: 모달 안에서 카드가 이중으로 보이는 문제 방지
    padding: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    marginBottom: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
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
  inlineSettingCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
    marginBottom: 12,
  },
  inlineSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineSettingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  inlineSettingDesc: {
    marginTop: 6,
    fontSize: 12,
    color: '#777',
    lineHeight: 16,
  },
  inlineSubRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineSubLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  timeButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#333',
    marginRight: 8,
  },
  timeButtonHint: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '700',
  },
  timePickerInline: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 10,
    marginBottom: 12,
  },
  timePickerIosActions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  timePickerActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 8,
  },
  timePickerActionCancel: {
    backgroundColor: '#E0E0E0',
  },
  timePickerActionOk: {
    backgroundColor: '#4CAF50',
  },
  timePickerActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#333',
  },
  permissionNotice: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  permissionNoticeText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    fontWeight: '700',
  },
  webTimeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  webTimeModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 14,
  },
  webTimeModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
  },
  webTimeModalDesc: {
    marginTop: 6,
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  webTimeInputsRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webTimeInputBox: {
    width: 110,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  webTimeLabel: {
    fontSize: 11,
    color: '#777',
    fontWeight: '700',
  },
  webTimeInput: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    paddingVertical: 6,
  },
  webTimeColon: {
    width: 24,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
  webTimeActionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});

export default NotificationSettings; 