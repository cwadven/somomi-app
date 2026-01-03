import { useState, useEffect } from 'react';
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
import AlertModal from './AlertModal';
import { isLocationExpired as isLocationExpiredUtil } from '../utils/locationUtils';

/**
 * 제품별 알림 설정 컴포넌트
 * @param {string} productId - 제품 ID
 * @param {object} product - 제품 정보
 */
const ProductNotificationSettings = ({ productId, product }) => {
  const dispatch = useDispatch();
  const { currentNotifications, status } = useSelector(state => state.notifications);
  const { isAuthenticated, userLocationTemplateInstances } = useSelector(state => state.auth);

  // 영역 템플릿 만료 여부 (공용 유틸 사용)
  const isLocationExpired = isLocationExpiredUtil(product?.locationId, { userLocationTemplateInstances });

  
  // 알림 설정 상태
  const [expiryEnabled, setExpiryEnabled] = useState(true);
  const [expiryDays, setExpiryDays] = useState('7');
  const [estimatedEnabled, setEstimatedEnabled] = useState(true);
  const [estimatedDays, setEstimatedDays] = useState('7');
  const [isExpiryRepeating, setIsExpiryRepeating] = useState(false); // 유통기한 연속 알림
  const [isEstimatedRepeating, setIsEstimatedRepeating] = useState(false); // 소진예상 연속 알림
  const [ignoreLocationExpiryNotification, setIgnoreLocationExpiryNotification] = useState(false); // 유통기한 영역 알림 무시
  const [ignoreLocationEstimatedNotification, setIgnoreLocationEstimatedNotification] = useState(false); // 소진예상 영역 알림 무시
  
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
        setIsExpiryRepeating(expiryNotification.isRepeating || false); // 유통기한 연속 알림 설정 불러오기
        setIgnoreLocationExpiryNotification(expiryNotification.ignoreLocationNotification || false); // 유통기한 영역 알림 무시 설정 불러오기
      }
      
      const estimatedNotification = currentNotifications.find(n => n.notifyType === 'estimated');
      if (estimatedNotification) {
        setEstimatedEnabled(estimatedNotification.isActive);
        setEstimatedDays(estimatedNotification.daysBeforeTarget !== null ? estimatedNotification.daysBeforeTarget.toString() : '');
        setIsEstimatedRepeating(estimatedNotification.isRepeating || false); // 소진예상 연속 알림 설정 불러오기
        setIgnoreLocationEstimatedNotification(estimatedNotification.ignoreLocationNotification || false); // 소진예상 영역 알림 무시 설정 불러오기
      }
    } else {
      // 기본 설정 적용 (비회원도 알림 활성화 가능)
      setExpiryEnabled(true);
      setEstimatedEnabled(true);
      setExpiryDays('7');
      setEstimatedDays('7');
      setIsExpiryRepeating(false); // 유통기한 연속 알림 기본값 false
      setIsEstimatedRepeating(false); // 소진예상 연속 알림 기본값 false
      setIgnoreLocationExpiryNotification(false); // 유통기한 영역 알림 무시 기본값 false
      setIgnoreLocationEstimatedNotification(false); // 소진예상 영역 알림 무시 기본값 false
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
  const showErrorModal = (message) => {
    setAlertModalConfig({
      title: '오류',
      message: message || '알림 설정 저장 중 오류가 발생했습니다.',
      buttons: [{ text: '확인', style: 'default' }],
      icon: 'alert-circle-outline',
      iconColor: '#F44336'
    });
    setAlertModalVisible(true);
  };
  
  // 숫자만 입력 가능하도록 검증
  const validateDays = (text, setter) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setter(numericValue);
  };
  
  // 알림 설정 저장
  const saveNotificationSettings = async () => {
    if (!isAuthenticated && !productId) {
      showErrorModal('로그인 후 이용 가능합니다.');
      return;
    }
    
    try {
      // 유통기한 알림 설정 저장
      if (product.expiryDate) {
        const expiryNotification = currentNotifications.find(n => n.notifyType === 'expiry');
        const expiryDaysNum = parseInt(expiryDays, 10) || 7;
        
        if (expiryNotification) {
          // 기존 알림 업데이트
          dispatch(updateNotification({
            id: expiryNotification.id,
            isActive: expiryEnabled,
            daysBeforeTarget: expiryDaysNum,
            isRepeating: isExpiryRepeating, // 연속 알림 설정 추가
            ignoreLocationNotification: ignoreLocationExpiryNotification, // 영역 알림 무시 설정 추가
          }));
        } else {
          // 새 알림 추가
          dispatch(addNotification({
            type: 'product',
            targetId: productId,
            notifyType: 'expiry',
            isActive: expiryEnabled,
            daysBeforeTarget: expiryDaysNum,
            isRepeating: isExpiryRepeating, // 연속 알림 설정 추가
            ignoreLocationNotification: ignoreLocationExpiryNotification, // 영역 알림 무시 설정 추가
          }));
        }
      }
      
      // 소진예상 알림 설정 저장
      if (product.estimatedEndDate) {
        const estimatedNotification = currentNotifications.find(n => n.notifyType === 'estimated');
        const estimatedDaysNum = parseInt(estimatedDays, 10) || 7;
        
        if (estimatedNotification) {
          // 기존 알림 업데이트
          dispatch(updateNotification({
            id: estimatedNotification.id,
            isActive: estimatedEnabled,
            daysBeforeTarget: estimatedDaysNum,
            isRepeating: isEstimatedRepeating, // 연속 알림 설정 추가
            ignoreLocationNotification: ignoreLocationEstimatedNotification, // 영역 알림 무시 설정 추가
          }));
        } else {
          // 새 알림 추가
          dispatch(addNotification({
            type: 'product',
            targetId: productId,
            notifyType: 'estimated',
            isActive: estimatedEnabled,
            daysBeforeTarget: estimatedDaysNum,
            isRepeating: isEstimatedRepeating, // 연속 알림 설정 추가
            ignoreLocationNotification: ignoreLocationEstimatedNotification, // 영역 알림 무시 설정 추가
          }));
        }
      }
      
      showSuccessModal();
    } catch (error) {
      console.error('알림 설정 저장 중 오류 발생:', error);
      showErrorModal();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>제품별 알림 설정</Text>
      <Text style={styles.description}>
        이 제품에 대한 알림 설정을 관리합니다.
      </Text>
      {isLocationExpired && (
        <View style={styles.blockBanner}>
          <Ionicons name="alert-circle" size={16} color="#F44336" style={{ marginRight: 6 }} />
          <Text style={styles.blockBannerText}>이 제품의 영역 템플릿이 만료되어 알림 설정을 변경할 수 없습니다. 설정되어 있어도 동작하지 않습니다.</Text>
        </View>
      )}
      
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
            disabled={!product.expiryDate || isLocationExpired}
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
            editable={expiryEnabled && !!product.expiryDate && !isLocationExpired}
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
            disabled={!expiryEnabled || !product.expiryDate || isLocationExpired}
          />
        </View>
        {isExpiryRepeating && (
          <Text style={styles.settingDescription}>
            D-{expiryDays}일부터 D-day까지 매일 알림을 받습니다.
          </Text>
        )}
        
        {/* 영역 알림 무시 설정 추가 */}
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>영역 상세 알림 무시</Text>
          <Switch
            value={ignoreLocationExpiryNotification}
            onValueChange={setIgnoreLocationExpiryNotification}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={ignoreLocationExpiryNotification ? '#4630EB' : '#f4f3f4'}
            disabled={!expiryEnabled || !product.expiryDate || isLocationExpired}
          />
        </View>
        {ignoreLocationExpiryNotification && (
          <Text style={styles.settingDescription}>
            이 제품은 영역의 유통기한 알림 설정을 무시하고 개별 설정을 따릅니다.
          </Text>
        )}
        
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
            disabled={!product.estimatedEndDate || isLocationExpired}
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
            editable={estimatedEnabled && !!product.estimatedEndDate && !isLocationExpired}
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
            disabled={!estimatedEnabled || !product.estimatedEndDate || isLocationExpired}
          />
        </View>
        {isEstimatedRepeating && (
          <Text style={styles.settingDescription}>
            D-{estimatedDays}일부터 D-day까지 매일 알림을 받습니다.
          </Text>
        )}
        
        {/* 영역 알림 무시 설정 추가 */}
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>영역 상세 알림 무시</Text>
          <Switch
            value={ignoreLocationEstimatedNotification}
            onValueChange={setIgnoreLocationEstimatedNotification}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={ignoreLocationEstimatedNotification ? '#4630EB' : '#f4f3f4'}
            disabled={!estimatedEnabled || !product.estimatedEndDate || isLocationExpired}
          />
        </View>
        {ignoreLocationEstimatedNotification && (
          <Text style={styles.settingDescription}>
            이 제품은 영역의 소진예상 알림 설정을 무시하고 개별 설정을 따릅니다.
          </Text>
        )}
        
        {!product.estimatedEndDate && (
          <Text style={styles.warningText}>
            소진예상일이 설정되지 않았습니다. 소진예상일을 먼저 설정해주세요.
          </Text>
        )}
      </View>
      
      {/* 저장 버튼 */}
      <TouchableOpacity 
        style={[styles.saveButton, isLocationExpired && styles.disabledSaveButton]}
        onPress={() => {
          if (isLocationExpired) {
            setAlertModalConfig({
              title: '저장 불가',
              message: '이 제품의 영역 템플릿이 만료되어 알림 설정을 저장할 수 없습니다.',
              buttons: [{ text: '확인' }],
              icon: 'alert-circle',
              iconColor: '#F44336'
            });
            setAlertModalVisible(true);
            return;
          }
          saveNotificationSettings();
        }}
        disabled={isLocationExpired}
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
  disabledSaveButton: {
    backgroundColor: '#9E9E9E',
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
  blockBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fdecea',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  blockBannerText: {
    color: '#b71c1c',
    flex: 1,
    fontSize: 13,
  },
});

export default ProductNotificationSettings; 