import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  TouchableOpacity, 
  TextInput
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { 
  fetchLocationNotifications, 
  updateNotification, 
  addNotification
} from '../redux/slices/notificationsSlice';
import AlertModal from './AlertModal';

/**
 * 영역별 알림 설정 컴포넌트
 * @param {string} locationId - 영역 ID
 * @param {object} location - 영역 정보
 */
const LocationNotificationSettings = ({ locationId, location = {} }) => {
  const dispatch = useDispatch();
  const { currentNotifications, status } = useSelector(state => state.notifications);
  const { isAuthenticated } = useSelector(state => state.auth);
  
  // 영역 이름 안전하게 가져오기
  const locationTitle = location?.title || '영역';
  
  // 알림 설정 상태
  const [expiryEnabled, setExpiryEnabled] = useState(true);
  const [expiryDays, setExpiryDays] = useState('7');
  const [estimatedEnabled, setEstimatedEnabled] = useState(true);
  const [estimatedDays, setEstimatedDays] = useState('7');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isExpiryRepeating, setIsExpiryRepeating] = useState(false); // 유통기한 연속 알림
  const [isEstimatedRepeating, setIsEstimatedRepeating] = useState(false); // 소진예상 연속 알림
  
  // 알림 모달 상태
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: '',
    iconColor: ''
  });
  
  // 컴포넌트 마운트 시 영역 알림 설정 로드
  useEffect(() => {
    if (locationId) {
      dispatch(fetchLocationNotifications(locationId));
    }
  }, [dispatch, locationId]);
  
  // 알림 설정 초기화
  useEffect(() => {
    if (currentNotifications.length > 0) {
      // 기존 알림 설정 불러오기
      const expiryNotification = currentNotifications.find(n => n.notifyType === 'expiry');
      if (expiryNotification) {
        setExpiryEnabled(expiryNotification.isActive);
        setExpiryDays(expiryNotification.daysBeforeTarget !== null ? expiryNotification.daysBeforeTarget.toString() : '');
        setIsExpiryRepeating(expiryNotification.isRepeating || false); // 유통기한 연속 알림 설정 불러오기
      }
      
      const estimatedNotification = currentNotifications.find(n => n.notifyType === 'estimated');
      if (estimatedNotification) {
        setEstimatedEnabled(estimatedNotification.isActive);
        setEstimatedDays(estimatedNotification.daysBeforeTarget !== null ? estimatedNotification.daysBeforeTarget.toString() : '');
        setIsEstimatedRepeating(estimatedNotification.isRepeating || false); // 소진예상 연속 알림 설정 불러오기
      }
    } else {
      // 기본 설정 적용 (비회원도 알림 활성화 가능)
      setExpiryEnabled(true);
      setEstimatedEnabled(true);
      setExpiryDays('7');
      setEstimatedDays('7');
      setIsExpiryRepeating(false); // 유통기한 연속 알림 기본값 false
      setIsEstimatedRepeating(false); // 소진예상 연속 알림 기본값 false
    }
  }, [currentNotifications]);
  
  // 성공 모달 표시
  const showSuccessModal = () => {
    setAlertModalConfig({
      title: '성공',
      message: '영역 알림 설정이 저장되었습니다.',
      buttons: [{ text: '확인', style: 'default' }],
      icon: 'checkmark-circle-outline',
      iconColor: '#4CAF50'
    });
    setAlertModalVisible(true);
  };
  
  // 오류 모달 표시
  const showErrorModal = (errorMessage) => {
    setAlertModalConfig({
      title: '오류',
      message: errorMessage || '알림 설정을 저장하는 중 오류가 발생했습니다.',
      buttons: [{ text: '확인', style: 'default' }],
      icon: 'alert-circle-outline',
      iconColor: '#F44336'
    });
    setAlertModalVisible(true);
  };
  
  // 알림 설정 저장
  const saveNotificationSettings = async () => {
    try {
      // 유통기한 알림 설정 저장
      const expiryNotification = currentNotifications.find(n => n.notifyType === 'expiry');
      // 일수 값 처리 - 빈 값이면 null 사용
      const parsedExpiryDays = expiryDays.trim() === '' ? null : parseInt(expiryDays);
      // 0 이상인 경우 유효한 값으로 처리
      const safeExpiryDays = (parsedExpiryDays !== null && !isNaN(parsedExpiryDays) && parsedExpiryDays >= 0) ? parsedExpiryDays : null;
      
      if (expiryNotification) {
        // 기존 설정 업데이트
        await dispatch(updateNotification({
          id: expiryNotification.id,
          data: {
            isActive: expiryEnabled,
            daysBeforeTarget: safeExpiryDays,
            isRepeating: isExpiryRepeating // 유통기한 연속 알림 설정
          }
        })).unwrap();
      } else {
        // 새 설정 추가
        await dispatch(addNotification({
          type: 'location',
          targetId: locationId,
          title: `${locationTitle} 유통기한 알림`,
          message: `${locationTitle} 영역의 제품 유통기한 알림 설정입니다.`,
          notifyType: 'expiry',
          daysBeforeTarget: safeExpiryDays,
          isActive: expiryEnabled,
          isRepeating: isExpiryRepeating // 유통기한 연속 알림 설정
        })).unwrap();
      }
      
      // 소진예상 알림 설정 저장
      const estimatedNotification = currentNotifications.find(n => n.notifyType === 'estimated');
      // 일수 값 처리 - 빈 값이면 null 사용
      const parsedEstimatedDays = estimatedDays.trim() === '' ? null : parseInt(estimatedDays);
      // 0 이상인 경우 유효한 값으로 처리
      const safeEstimatedDays = (parsedEstimatedDays !== null && !isNaN(parsedEstimatedDays) && parsedEstimatedDays >= 0) ? parsedEstimatedDays : null;
      
      if (estimatedNotification) {
        // 기존 설정 업데이트
        await dispatch(updateNotification({
          id: estimatedNotification.id,
          data: {
            isActive: estimatedEnabled,
            daysBeforeTarget: safeEstimatedDays,
            isRepeating: isEstimatedRepeating // 소진예상 연속 알림 설정
          }
        })).unwrap();
      } else {
        // 새 설정 추가
        await dispatch(addNotification({
          type: 'location',
          targetId: locationId,
          title: `${locationTitle} 소진예상 알림`,
          message: `${locationTitle} 영역의 제품 소진예상 알림 설정입니다.`,
          notifyType: 'estimated',
          daysBeforeTarget: safeEstimatedDays,
          isActive: estimatedEnabled,
          isRepeating: isEstimatedRepeating // 소진예상 연속 알림 설정
        })).unwrap();
      }
      
      // AI 알림 설정 저장
      const aiNotification = currentNotifications.find(n => n.notifyType === 'ai');
      if (aiNotification) {
        // 기존 설정 업데이트
        await dispatch(updateNotification({
          id: aiNotification.id,
          data: {
            isActive: aiEnabled
          }
        })).unwrap();
      } else {
        // 새 설정 추가
        await dispatch(addNotification({
          type: 'location',
          targetId: locationId,
          title: `${locationTitle} AI 알림`,
          message: `${locationTitle} 영역의 AI 추천 알림 설정입니다.`,
          notifyType: 'ai',
          daysBeforeTarget: 7, // 기본값
          isActive: aiEnabled,
          isRepeating: false
        })).unwrap();
      }
      
      // 영역의 알림 설정을 해당 영역의 모든 제품에 적용하는 코드 제거
      
      // 성공 모달 표시
      showSuccessModal();
    } catch (error) {
      console.error('알림 설정 저장 오류:', error);
      showErrorModal('알림 설정을 저장하는 중 오류가 발생했습니다.');
    }
  };
  
  // 일수 입력 검증
  const validateDays = (text, setter) => {
    // 빈 문자열이나 null 값 처리
    if (!text || text.trim() === '') {
      setter(''); // 빈 값 유지
      return;
    }
    
    const numValue = parseInt(text);
    if (isNaN(numValue) || numValue < 0) { // 0 이상으로 변경
      setter('0'); // 최소값을 0으로 설정
    } else if (numValue > 30) {
      setter('30');
    } else {
      setter(text);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>영역별 알림 설정</Text>
      <Text style={styles.description}>
        이 영역에 있는 제품들에 대한 알림 설정을 관리합니다.
      </Text>
      
      {/* AI 알림 설정 */}
      <View style={styles.settingSection}>
        <View style={styles.settingHeader}>
          <Ionicons name="analytics-outline" size={20} color="#4CAF50" style={styles.settingIcon} />
          <Text style={styles.settingTitle}>AI 알림</Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>AI 추천 알림 활성화</Text>
          <Switch
            value={aiEnabled}
            onValueChange={setAiEnabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={aiEnabled ? '#4630EB' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.settingDescription}>
          AI가 제품 사용 패턴을 분석하여 구매 시점을 추천해 드립니다.
        </Text>
      </View>
      
      {/* 유통기한 알림 설정 */}
      <View style={styles.settingSection}>
        <View style={styles.settingHeader}>
          <Ionicons name="calendar-outline" size={20} color="#4CAF50" style={styles.settingIcon} />
          <Text style={styles.settingTitle}>유통기한 알림</Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>유통기한 알림 활성화</Text>
          <Switch
            value={expiryEnabled}
            onValueChange={setExpiryEnabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={expiryEnabled ? '#4630EB' : '#f4f3f4'}
          />
        </View>
        <View style={[styles.settingItem, styles.daysSettingItem]}>
          <Text style={styles.settingText}>유통기한 D-</Text>
          <TextInput
            style={styles.daysInput}
            value={expiryDays}
            onChangeText={(text) => validateDays(text, setExpiryDays)}
            keyboardType="number-pad"
            placeholder="7"
            maxLength={2}
            editable={expiryEnabled}
          />
          <Text style={styles.daysText}>일 전에 알림</Text>
        </View>
        
        {/* 연속 알림 설정 추가 */}
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>연속 알림</Text>
          <Switch
            value={isExpiryRepeating}
            onValueChange={setIsExpiryRepeating}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isExpiryRepeating ? '#4630EB' : '#f4f3f4'}
            disabled={!expiryEnabled}
          />
        </View>
        {isExpiryRepeating && (
          <Text style={styles.settingDescription}>
            D-{expiryDays}일부터 D-day까지 매일 알림을 받습니다.
          </Text>
        )}
        
        <Text style={styles.settingDescription}>
          이 영역의 모든 제품에 대해 유통기한 알림을 설정합니다.
        </Text>
      </View>
      
      {/* 소진예상 알림 설정 */}
      <View style={styles.settingSection}>
        <View style={styles.settingHeader}>
          <Ionicons name="hourglass-outline" size={20} color="#4CAF50" style={styles.settingIcon} />
          <Text style={styles.settingTitle}>소진예상 알림</Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>소진예상 알림 활성화</Text>
          <Switch
            value={estimatedEnabled}
            onValueChange={setEstimatedEnabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={estimatedEnabled ? '#4630EB' : '#f4f3f4'}
          />
        </View>
        <View style={[styles.settingItem, styles.daysSettingItem]}>
          <Text style={styles.settingText}>소진예상일 D-</Text>
          <TextInput
            style={styles.daysInput}
            value={estimatedDays}
            onChangeText={(text) => validateDays(text, setEstimatedDays)}
            keyboardType="number-pad"
            placeholder="7"
            maxLength={2}
            editable={estimatedEnabled}
          />
          <Text style={styles.daysText}>일 전에 알림</Text>
        </View>
        
        {/* 연속 알림 설정 추가 */}
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>연속 알림</Text>
          <Switch
            value={isEstimatedRepeating}
            onValueChange={setIsEstimatedRepeating}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isEstimatedRepeating ? '#4630EB' : '#f4f3f4'}
            disabled={!estimatedEnabled}
          />
        </View>
        {isEstimatedRepeating && (
          <Text style={styles.settingDescription}>
            D-{estimatedDays}일부터 D-day까지 매일 알림을 받습니다.
          </Text>
        )}
        
        <Text style={styles.settingDescription}>
          이 영역의 모든 제품에 대해 소진예상 알림을 설정합니다.
        </Text>
      </View>
      
      {/* 저장 버튼 */}
      <TouchableOpacity 
        style={styles.saveButton}
        onPress={saveNotificationSettings}
      >
        <Text style={styles.saveButtonText}>설정 저장</Text>
      </TouchableOpacity>
      
      {/* 알림 모달 */}
      <AlertModal
        visible={alertModalVisible}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        buttons={alertModalConfig.buttons}
        onClose={() => setAlertModalVisible(false)}
        icon={alertModalConfig.icon}
        iconColor={alertModalConfig.iconColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  settingSection: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingIcon: {
    marginRight: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  daysSettingItem: {
    justifyContent: 'flex-start',
  },
  settingText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  daysInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 50,
    marginHorizontal: 8,
    textAlign: 'center',
  },
  daysText: {
    fontSize: 15,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default LocationNotificationSettings; 