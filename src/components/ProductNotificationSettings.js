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
  fetchProductNotifications, 
  updateNotification, 
  addNotification 
} from '../redux/slices/notificationsSlice';
import { 
  scheduleProductExpiryNotification,
  cancelNotification
} from '../utils/notificationUtils';
import AlertModal from './AlertModal';

/**
 * 제품별 알림 설정 컴포넌트
 * @param {string} productId - 제품 ID
 * @param {object} product - 제품 정보
 */
const ProductNotificationSettings = ({ productId, product }) => {
  const dispatch = useDispatch();
  const { currentNotifications, status } = useSelector(state => state.notifications);
  const { isAuthenticated } = useSelector(state => state.auth);
  
  // 알림 설정 상태
  const [expiryEnabled, setExpiryEnabled] = useState(true);
  const [expiryDays, setExpiryDays] = useState('7');
  const [estimatedEnabled, setEstimatedEnabled] = useState(true);
  const [estimatedDays, setEstimatedDays] = useState('7');
  
  // 알림 모달 상태
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: '',
    iconColor: ''
  });
  
  // 컴포넌트 마운트 시 제품 알림 설정 로드
  useEffect(() => {
    if (productId) {
      dispatch(fetchProductNotifications(productId));
    }
  }, [dispatch, productId]);
  
  // 알림 설정 초기화
  useEffect(() => {
    if (currentNotifications.length > 0) {
      // 기존 알림 설정 불러오기
      const expiryNotification = currentNotifications.find(n => n.notifyType === 'expiry');
      if (expiryNotification) {
        setExpiryEnabled(expiryNotification.isActive);
        setExpiryDays(expiryNotification.daysBeforeTarget !== null ? expiryNotification.daysBeforeTarget.toString() : '');
      }
      
      const estimatedNotification = currentNotifications.find(n => n.notifyType === 'estimated');
      if (estimatedNotification) {
        setEstimatedEnabled(estimatedNotification.isActive);
        setEstimatedDays(estimatedNotification.daysBeforeTarget !== null ? estimatedNotification.daysBeforeTarget.toString() : '');
      }
    } else {
      // 기본 설정 적용 (비회원도 알림 활성화 가능)
      setExpiryEnabled(true);
      setEstimatedEnabled(true);
      setExpiryDays('7');
      setEstimatedDays('7');
    }
  }, [currentNotifications]);
  
  // 성공 모달 표시
  const showSuccessModal = () => {
    setAlertModalConfig({
      title: '성공',
      message: '알림 설정이 저장되었습니다. 설정한 날짜에 알림을 받게 됩니다.',
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
        // 기존 알림 취소
        await cancelNotification(expiryNotification.id);
        
        // 기존 설정 업데이트
        await dispatch(updateNotification({
          id: expiryNotification.id,
          data: {
            isActive: expiryEnabled,
            daysBeforeTarget: safeExpiryDays
          }
        })).unwrap();
        
        // 알림이 활성화된 경우 새로 스케줄링 (daysBeforeTarget이 null이 아닌 경우만)
        if (expiryEnabled && product.expiryDate && safeExpiryDays !== null) {
          const expiryDate = new Date(product.expiryDate);
          await scheduleProductExpiryNotification(
            productId,
            product.name,
            expiryDate,
            safeExpiryDays
          );
        }
      } else if (product.expiryDate) {
        // 새 설정 추가 (유통기한이 있는 경우에만)
        await dispatch(addNotification({
          type: 'product',
          targetId: productId,
          title: `${product.name} 유통기한 알림`,
          message: safeExpiryDays === 0 
            ? `${product.name}의 유통기한이 오늘까지입니다.` 
            : `${product.name}의 유통기한이 ${safeExpiryDays !== null ? safeExpiryDays + '일' : ''} 남았습니다.`,
          notifyType: 'expiry',
          daysBeforeTarget: safeExpiryDays,
          isActive: expiryEnabled,
          isRepeating: false
        })).unwrap();
        
        // 알림이 활성화된 경우 스케줄링 (daysBeforeTarget이 null이 아닌 경우만)
        if (expiryEnabled && safeExpiryDays !== null) {
          const expiryDate = new Date(product.expiryDate);
          await scheduleProductExpiryNotification(
            productId,
            product.name,
            expiryDate,
            safeExpiryDays
          );
        }
      }
      
      // 소진예상 알림 설정 저장
      const estimatedNotification = currentNotifications.find(n => n.notifyType === 'estimated');
      // 일수 값 처리 - 빈 값이면 null 사용
      const parsedEstimatedDays = estimatedDays.trim() === '' ? null : parseInt(estimatedDays);
      // 0 이상인 경우 유효한 값으로 처리
      const safeEstimatedDays = (parsedEstimatedDays !== null && !isNaN(parsedEstimatedDays) && parsedEstimatedDays >= 0) ? parsedEstimatedDays : null;
      
      if (estimatedNotification) {
        // 기존 알림 취소
        await cancelNotification(estimatedNotification.id);
        
        // 기존 설정 업데이트
        await dispatch(updateNotification({
          id: estimatedNotification.id,
          data: {
            isActive: estimatedEnabled,
            daysBeforeTarget: safeEstimatedDays
          }
        })).unwrap();
        
        // 알림이 활성화된 경우 새로 스케줄링 (daysBeforeTarget이 null이 아닌 경우만)
        if (estimatedEnabled && product.estimatedEndDate && safeEstimatedDays !== null) {
          const estimatedEndDate = new Date(product.estimatedEndDate);
          await scheduleProductExpiryNotification(
            productId,
            product.name,
            estimatedEndDate,
            safeEstimatedDays
          );
        }
      } else if (product.estimatedEndDate) {
        // 새 설정 추가 (소진예상일이 있는 경우에만)
        await dispatch(addNotification({
          type: 'product',
          targetId: productId,
          title: `${product.name} 소진예상 알림`,
          message: safeEstimatedDays === 0 
            ? `${product.name}이(가) 오늘 소진될 예정입니다.` 
            : `${product.name}이(가) ${safeEstimatedDays !== null ? safeEstimatedDays + '일' : ''} 후에 소진될 예정입니다.`,
          notifyType: 'estimated',
          daysBeforeTarget: safeEstimatedDays,
          isActive: estimatedEnabled,
          isRepeating: false
        })).unwrap();
        
        // 알림이 활성화된 경우 스케줄링 (daysBeforeTarget이 null이 아닌 경우만)
        if (estimatedEnabled && safeEstimatedDays !== null) {
          const estimatedEndDate = new Date(product.estimatedEndDate);
          await scheduleProductExpiryNotification(
            productId,
            product.name,
            estimatedEndDate,
            safeEstimatedDays
          );
        }
      }
      
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
      <Text style={styles.title}>제품별 알림 설정</Text>
      <Text style={styles.description}>
        이 제품에 대한 알림 설정을 관리합니다.
      </Text>
      
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
            disabled={!product.expiryDate}
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
            editable={expiryEnabled && !!product.expiryDate}
          />
          <Text style={styles.daysText}>일 전에 알림</Text>
        </View>
        {!product.expiryDate && (
          <Text style={styles.warningText}>
            유통기한이 설정되지 않았습니다. 유통기한을 먼저 설정해주세요.
          </Text>
        )}
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
            disabled={!product.estimatedEndDate}
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
            editable={estimatedEnabled && !!product.estimatedEndDate}
          />
          <Text style={styles.daysText}>일 전에 알림</Text>
        </View>
        {!product.estimatedEndDate && (
          <Text style={styles.warningText}>
            소진예상일이 설정되지 않았습니다. 소진예상일을 먼저 설정해주세요.
          </Text>
        )}
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
  warningText: {
    fontSize: 13,
    color: '#F44336',
    marginTop: 8,
    fontStyle: 'italic',
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
    marginBottom: 8,
    fontStyle: 'italic',
  },
});

export default ProductNotificationSettings; 