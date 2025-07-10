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
  fetchLocationNotifications, 
  updateNotification, 
  addNotification 
} from '../redux/slices/notificationsSlice';

/**
 * 영역별 알림 설정 컴포넌트
 * @param {string} locationId - 영역 ID
 * @param {object} location - 영역 정보
 */
const LocationNotificationSettings = ({ locationId, location }) => {
  const dispatch = useDispatch();
  const { currentNotifications, status } = useSelector(state => state.notifications);
  const { isAuthenticated } = useSelector(state => state.auth);
  
  // 알림 설정 상태
  const [expiryEnabled, setExpiryEnabled] = useState(true);
  const [expiryDays, setExpiryDays] = useState('7');
  const [estimatedEnabled, setEstimatedEnabled] = useState(true);
  const [estimatedDays, setEstimatedDays] = useState('7');
  const [aiEnabled, setAiEnabled] = useState(false);
  
  // 컴포넌트 마운트 시 영역 알림 설정 로드
  useEffect(() => {
    if (locationId) {
      dispatch(fetchLocationNotifications(locationId));
    }
  }, [dispatch, locationId]);
  
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
      
      // AI 알림 설정 찾기
      const aiNotification = currentNotifications.find(n => n.notifyType === 'ai');
      if (aiNotification) {
        setAiEnabled(aiNotification.isActive);
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
      } else {
        // 새 설정 추가
        await dispatch(addNotification({
          type: 'location',
          targetId: locationId,
          title: `${location.title} 유통기한 알림`,
          message: `${location.title} 영역의 제품 유통기한 알림 설정입니다.`,
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
      } else {
        // 새 설정 추가
        await dispatch(addNotification({
          type: 'location',
          targetId: locationId,
          title: `${location.title} 소진예상 알림`,
          message: `${location.title} 영역의 제품 소진예상 알림 설정입니다.`,
          notifyType: 'estimated',
          daysBeforeTarget: parseInt(estimatedDays) || 7,
          isActive: estimatedEnabled,
          isRepeating: false
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
          title: `${location.title} AI 알림`,
          message: `${location.title} 영역의 AI 추천 알림 설정입니다.`,
          notifyType: 'ai',
          daysBeforeTarget: 7, // 기본값
          isActive: aiEnabled,
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
            maxLength={2}
            editable={expiryEnabled}
          />
          <Text style={styles.daysText}>일 전에 알림</Text>
        </View>
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
  settingDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
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

export default LocationNotificationSettings; 