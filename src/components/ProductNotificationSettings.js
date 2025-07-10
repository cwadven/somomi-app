import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  TouchableOpacity, 
  TextInput,
  Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { 
  fetchProductNotifications, 
  updateNotification, 
  addNotification 
} from '../redux/slices/notificationsSlice';

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
  
  // 컴포넌트 마운트 시 제품 알림 설정 로드
  useEffect(() => {
    if (productId) {
      dispatch(fetchProductNotifications(productId));
    }
  }, [dispatch, productId]);
  
  // 알림 설정 데이터 로드
  useEffect(() => {
    if (currentNotifications.length > 0) {
      // 유통기한 알림 설정 찾기
      const expiryNotification = currentNotifications.find(n => n.notifyType === 'expiry');
      if (expiryNotification) {
        setExpiryEnabled(expiryNotification.isActive);
        setExpiryDays(expiryNotification.daysBeforeTarget.toString());
      }
      
      // 소진예상 알림 설정 찾기
      const estimatedNotification = currentNotifications.find(n => n.notifyType === 'estimated');
      if (estimatedNotification) {
        setEstimatedEnabled(estimatedNotification.isActive);
        setEstimatedDays(estimatedNotification.daysBeforeTarget.toString());
      }
    }
  }, [currentNotifications]);
  
  // 알림 설정 저장
  const saveNotificationSettings = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        '알림',
        '알림 설정을 저장하려면 로그인이 필요합니다.',
        [{ text: '확인', style: 'default' }]
      );
      return;
    }
    
    try {
      // 유통기한 알림 설정 저장
      const expiryNotification = currentNotifications.find(n => n.notifyType === 'expiry');
      if (expiryNotification) {
        // 기존 설정 업데이트
        await dispatch(updateNotification({
          id: expiryNotification.id,
          data: {
            isActive: expiryEnabled,
            daysBeforeTarget: parseInt(expiryDays) || 7
          }
        })).unwrap();
      } else if (product.expiryDate) {
        // 새 설정 추가 (유통기한이 있는 경우에만)
        await dispatch(addNotification({
          type: 'product',
          targetId: productId,
          title: `${product.name} 유통기한 알림`,
          message: `${product.name}의 유통기한이 ${expiryDays}일 남았습니다.`,
          notifyType: 'expiry',
          daysBeforeTarget: parseInt(expiryDays) || 7,
          isActive: expiryEnabled,
          isRepeating: false
        })).unwrap();
      }
      
      // 소진예상 알림 설정 저장
      const estimatedNotification = currentNotifications.find(n => n.notifyType === 'estimated');
      if (estimatedNotification) {
        // 기존 설정 업데이트
        await dispatch(updateNotification({
          id: estimatedNotification.id,
          data: {
            isActive: estimatedEnabled,
            daysBeforeTarget: parseInt(estimatedDays) || 7
          }
        })).unwrap();
      } else if (product.estimatedEndDate) {
        // 새 설정 추가 (소진예상일이 있는 경우에만)
        await dispatch(addNotification({
          type: 'product',
          targetId: productId,
          title: `${product.name} 소진예상 알림`,
          message: `${product.name}의 소진예상일이 ${estimatedDays}일 남았습니다.`,
          notifyType: 'estimated',
          daysBeforeTarget: parseInt(estimatedDays) || 7,
          isActive: estimatedEnabled,
          isRepeating: false
        })).unwrap();
      }
      
      Alert.alert('성공', '알림 설정이 저장되었습니다.');
    } catch (error) {
      console.error('알림 설정 저장 오류:', error);
      Alert.alert('오류', '알림 설정을 저장하는 중 오류가 발생했습니다.');
    }
  };
  
  // 일수 입력 검증
  const validateDays = (text, setter) => {
    const numValue = parseInt(text);
    if (isNaN(numValue) || numValue < 1) {
      setter('1');
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
        {!product.expiryDate && (
          <Text style={styles.warningText}>
            유통기한이 설정되지 않았습니다. 제품 정보를 수정하여 유통기한을 설정해주세요.
          </Text>
        )}
        {product.expiryDate && (
          <View style={[styles.settingItem, styles.daysSettingItem]}>
            <Text style={styles.settingText}>유통기한 D-</Text>
            <TextInput
              style={styles.daysInput}
              value={expiryDays}
              onChangeText={(text) => validateDays(text, setExpiryDays)}
              keyboardType="number-pad"
              maxLength={2}
              editable={expiryEnabled}
            />
            <Text style={styles.daysText}>일 전에 알림</Text>
          </View>
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
        {!product.estimatedEndDate && (
          <Text style={styles.warningText}>
            소진예상일이 설정되지 않았습니다. 제품 정보를 수정하여 소진예상일을 설정해주세요.
          </Text>
        )}
        {product.estimatedEndDate && (
          <View style={[styles.settingItem, styles.daysSettingItem]}>
            <Text style={styles.settingText}>소진예상 D-</Text>
            <TextInput
              style={styles.daysInput}
              value={estimatedDays}
              onChangeText={(text) => validateDays(text, setEstimatedDays)}
              keyboardType="number-pad"
              maxLength={2}
              editable={estimatedEnabled}
            />
            <Text style={styles.daysText}>일 전에 알림</Text>
          </View>
        )}
      </View>
      
      {/* 저장 버튼 */}
      <TouchableOpacity 
        style={styles.saveButton}
        onPress={saveNotificationSettings}
      >
        <Text style={styles.saveButtonText}>설정 저장</Text>
      </TouchableOpacity>
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
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  settingSection: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
  },
  warningText: {
    fontSize: 13,
    color: '#FF6B6B',
    marginTop: 4,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  daysInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 40,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  daysText: {
    fontSize: 15,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProductNotificationSettings; 