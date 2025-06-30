import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { 
  addNotification, 
  updateNotification, 
  deleteNotification, 
  fetchProductNotifications, 
  fetchLocationNotifications 
} from '../redux/slices/notificationsSlice';

const NotificationSettings = ({ type, targetId, isLocation = false }) => {
  const dispatch = useDispatch();
  const { currentNotifications, status, error } = useSelector(state => state.notifications);
  
  const [notifications, setNotifications] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNotification, setNewNotification] = useState({
    notifyType: 'expiry', // 'expiry', 'estimated', 'ai'
    daysBeforeTarget: 3,
    isActive: true,
    isRepeating: false,
    notifyDate: new Date(),
    title: '',
    message: '',
  });
  
  // 알림 유형별 존재 여부 확인
  const [hasExpiryNotification, setHasExpiryNotification] = useState(false);
  const [hasEstimatedNotification, setHasEstimatedNotification] = useState(false);
  const [hasAiNotification, setHasAiNotification] = useState(false);
  
  useEffect(() => {
    // 제품 또는 영역에 따라 알림 데이터 로드
    if (isLocation) {
      dispatch(fetchLocationNotifications(targetId));
    } else {
      dispatch(fetchProductNotifications(targetId));
    }
  }, [dispatch, targetId, isLocation]);
  
  useEffect(() => {
    if (currentNotifications) {
      // AI 알림 유형으로 변환 (custom -> ai)
      const updatedNotifications = currentNotifications.map(notification => {
        if (notification.notifyType === 'custom') {
          return { ...notification, notifyType: 'ai' };
        }
        return notification;
      });
      
      setNotifications(updatedNotifications);
      
      // 알림 유형별 존재 여부 확인
      if (isLocation) {
        const expiryNotification = updatedNotifications.find(n => n.notifyType === 'expiry');
        const estimatedNotification = updatedNotifications.find(n => n.notifyType === 'estimated');
        const aiNotification = updatedNotifications.find(n => n.notifyType === 'ai');
        
        setHasExpiryNotification(!!expiryNotification);
        setHasEstimatedNotification(!!estimatedNotification);
        setHasAiNotification(!!aiNotification);
      }
    }
  }, [currentNotifications, isLocation]);
  
  useEffect(() => {
    if (status === 'failed' && error) {
      Alert.alert('오류', error);
    }
  }, [status, error]);
  
  const handleAddNotification = () => {
    // 영역 알림 제한 확인 (영역인 경우 알림 유형별 1개씩만 허용)
    if (isLocation) {
      if (newNotification.notifyType === 'expiry' && hasExpiryNotification) {
        Alert.alert('알림 제한', '유통기한 알림은 이미 설정되어 있습니다. 기존 알림을 수정하거나 삭제한 후 다시 시도해주세요.');
        return;
      }
      
      if (newNotification.notifyType === 'estimated' && hasEstimatedNotification) {
        Alert.alert('알림 제한', '소진 예상 알림은 이미 설정되어 있습니다. 기존 알림을 수정하거나 삭제한 후 다시 시도해주세요.');
        return;
      }
      
      if (newNotification.notifyType === 'ai' && hasAiNotification) {
        Alert.alert('알림 제한', 'AI 알림은 이미 설정되어 있습니다. 기존 알림을 수정하거나 삭제한 후 다시 시도해주세요.');
        return;
      }
    }
    // 제품 알림 제한 확인 (제품별 최대 3개)
    else if (!isLocation && notifications.length >= 3) {
      Alert.alert('알림 제한', '제품당 최대 3개의 알림만 설정할 수 있습니다.');
      return;
    }
    
    const notificationData = {
      type: isLocation ? 'location' : 'product',
      targetId,
      ...newNotification,
    };
    
    // AI 알림인 경우 기본 메시지 설정
    if (newNotification.notifyType === 'ai') {
      notificationData.title = 'AI 알림';
      notificationData.message = 'AI가 분석한 최적의 시점에 알림을 보내드립니다.';
    }
    
    dispatch(addNotification(notificationData))
      .unwrap()
      .then(() => {
        setShowAddForm(false);
        setNewNotification({
          notifyType: 'expiry',
          daysBeforeTarget: 3,
          isActive: true,
          isRepeating: false,
          notifyDate: new Date(),
          title: '',
          message: '',
        });
        
        // 영역인 경우 알림 유형별 존재 여부 업데이트
        if (isLocation) {
          if (notificationData.notifyType === 'expiry') {
            setHasExpiryNotification(true);
          } else if (notificationData.notifyType === 'estimated') {
            setHasEstimatedNotification(true);
          } else if (notificationData.notifyType === 'ai') {
            setHasAiNotification(true);
          }
        }
      })
      .catch(err => {
        Alert.alert('알림 추가 실패', err);
      });
  };
  
  const handleUpdateNotification = (id, data) => {
    dispatch(updateNotification({ id, ...data }))
      .unwrap()
      .catch(err => {
        Alert.alert('알림 업데이트 실패', err);
      });
  };
  
  const handleDeleteNotification = (id) => {
    // 삭제할 알림 정보 찾기
    const notificationToDelete = notifications.find(n => n.id === id);
    
    Alert.alert(
      '알림 삭제',
      '이 알림을 삭제하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          onPress: () => {
            dispatch(deleteNotification(id))
              .unwrap()
              .then(() => {
                // 영역인 경우 알림 유형별 존재 여부 업데이트
                if (isLocation && notificationToDelete) {
                  if (notificationToDelete.notifyType === 'expiry') {
                    setHasExpiryNotification(false);
                  } else if (notificationToDelete.notifyType === 'estimated') {
                    setHasEstimatedNotification(false);
                  } else if (notificationToDelete.notifyType === 'ai') {
                    setHasAiNotification(false);
                  }
                }
              })
              .catch(err => {
                Alert.alert('알림 삭제 실패', err);
              });
          },
          style: 'destructive',
        },
      ]
    );
  };
  
  // 알림 유형 선택 시 이미 존재하는 유형인지 확인
  const handleNotifyTypeChange = (type) => {
    if (isLocation) {
      if (type === 'expiry' && hasExpiryNotification) {
        Alert.alert('알림 제한', '유통기한 알림은 이미 설정되어 있습니다.');
        return;
      }
      
      if (type === 'estimated' && hasEstimatedNotification) {
        Alert.alert('알림 제한', '소진 예상 알림은 이미 설정되어 있습니다.');
        return;
      }
      
      if (type === 'ai' && hasAiNotification) {
        Alert.alert('알림 제한', 'AI 알림은 이미 설정되어 있습니다.');
        return;
      }
    }
    
    setNewNotification({ ...newNotification, notifyType: type });
  };
  
  const renderNotificationItem = (notification) => {
    const { id, notifyType, daysBeforeTarget, isActive, isRepeating, notifyDate, title } = notification;
    
    return (
      <View key={id} style={styles.notificationItem}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>
            {title || (
              notifyType === 'expiry' 
                ? '유통기한 알림' 
                : notifyType === 'estimated' 
                  ? '소진 예상 알림' 
                  : 'AI 알림'
            )}
          </Text>
          <View style={styles.notificationActions}>
            <Switch
              value={isActive}
              onValueChange={(value) => handleUpdateNotification(id, { isActive: value })}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={isActive ? '#f5dd4b' : '#f4f3f4'}
            />
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteNotification(id)}
            >
              <Ionicons name="trash-outline" size={24} color="red" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.notificationDetails}>
          {notifyType !== 'ai' ? (
            <>
              <Text style={styles.notificationDetail}>
                {notifyType === 'expiry' ? '유통기한' : '소진 예상일'}까지 {daysBeforeTarget}일 전 알림
              </Text>
              
              {isRepeating && (
                <View style={styles.repeatInfoContainer}>
                  <Text style={styles.notificationDetail}>
                    연속 알림: 매일 알림 (D-{daysBeforeTarget}부터 D-day까지)
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.notificationDetail}>
              AI가 분석한 최적의 시점에 알림을 보내드립니다.
            </Text>
          )}
        </View>
      </View>
    );
  };
  
  // 알림 추가 버튼 활성화 여부 확인
  const canAddMoreNotifications = () => {
    if (!isLocation) {
      // 제품인 경우 최대 3개까지 허용
      return notifications.length < 3;
    } else {
      // 영역인 경우 각 유형별로 1개씩만 허용
      return !hasExpiryNotification || !hasEstimatedNotification || !hasAiNotification;
    }
  };
  
  // 알림 유형 선택 버튼 활성화 여부 확인
  const isNotifyTypeAvailable = (type) => {
    if (!isLocation) return true;
    
    if (type === 'expiry') return !hasExpiryNotification;
    if (type === 'estimated') return !hasEstimatedNotification;
    if (type === 'ai') return !hasAiNotification;
    
    return true;
  };
  
  return (
    <ScrollView style={styles.container}>
      {/* 알림 목록 */}
      <View style={styles.notificationsContainer}>
        <Text style={styles.sectionTitle}>알림 설정</Text>
        
        {notifications.length === 0 ? (
          <Text style={styles.emptyText}>설정된 알림이 없습니다.</Text>
        ) : (
          notifications.map(notification => renderNotificationItem(notification))
        )}
        
        {/* 알림 추가 버튼 */}
        {!showAddForm && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(true)}
            disabled={!canAddMoreNotifications()}
          >
            <Ionicons 
              name="add-circle-outline" 
              size={24} 
              color={!canAddMoreNotifications() ? '#ccc' : '#007AFF'} 
            />
            <Text 
              style={[
                styles.addButtonText, 
                !canAddMoreNotifications() && styles.disabledText
              ]}
            >
              알림 추가하기 {!isLocation && `(${notifications.length}/3)`}
              {isLocation && ' (유형별 1개씩)'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* 알림 추가 폼 */}
      {showAddForm && (
        <View style={styles.addFormContainer}>
          <Text style={styles.formTitle}>새 알림 설정</Text>
          
          {/* 알림 타입 선택 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>알림 타입</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  newNotification.notifyType === 'expiry' && styles.activeSegment,
                  isLocation && hasExpiryNotification && styles.disabledSegment
                ]}
                onPress={() => handleNotifyTypeChange('expiry')}
                disabled={isLocation && hasExpiryNotification}
              >
                <Text style={[
                  styles.segmentText,
                  newNotification.notifyType === 'expiry' && styles.activeSegmentText,
                  isLocation && hasExpiryNotification && styles.disabledSegmentText
                ]}>
                  유통기한
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  newNotification.notifyType === 'estimated' && styles.activeSegment,
                  isLocation && hasEstimatedNotification && styles.disabledSegment
                ]}
                onPress={() => handleNotifyTypeChange('estimated')}
                disabled={isLocation && hasEstimatedNotification}
              >
                <Text style={[
                  styles.segmentText,
                  newNotification.notifyType === 'estimated' && styles.activeSegmentText,
                  isLocation && hasEstimatedNotification && styles.disabledSegmentText
                ]}>
                  소진 예상
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  newNotification.notifyType === 'ai' && styles.activeSegment,
                  isLocation && hasAiNotification && styles.disabledSegment
                ]}
                onPress={() => handleNotifyTypeChange('ai')}
                disabled={isLocation && hasAiNotification}
              >
                <Text style={[
                  styles.segmentText,
                  newNotification.notifyType === 'ai' && styles.activeSegmentText,
                  isLocation && hasAiNotification && styles.disabledSegmentText
                ]}>
                  AI 알림
                </Text>
              </TouchableOpacity>
            </View>
            
            {isLocation && (
              <Text style={styles.typeInfoText}>
                영역 알림은 각 유형별로 1개씩만 설정할 수 있습니다.
              </Text>
            )}
          </View>
          
          {/* AI 알림 설정 (영역 상세에서만 표시) */}
          {isLocation && newNotification.notifyType === 'ai' && (
            <View style={styles.aiNotificationInfo}>
              <Ionicons name="bulb-outline" size={24} color="#FF9800" style={styles.aiIcon} />
              <Text style={styles.aiInfoText}>
                AI 알림은 제품의 사용 패턴과 유통기한을 분석하여 최적의 시점에 알림을 보내드립니다.
              </Text>
            </View>
          )}
          
          {/* 유통기한/소진 예상 알림 설정 */}
          {newNotification.notifyType !== 'ai' && (
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                {newNotification.notifyType === 'expiry' ? '유통기한' : '소진 예상일'}까지 며칠 전에 알림을 받을까요?
              </Text>
              <View style={styles.daysBeforeContainer}>
                {[1, 3, 5, 7, 14, 30].map(days => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.daysBeforeButton,
                      newNotification.daysBeforeTarget === days && styles.selectedDaysBeforeButton,
                    ]}
                    onPress={() => setNewNotification({ ...newNotification, daysBeforeTarget: days })}
                  >
                    <Text style={[
                      styles.daysBeforeText,
                      newNotification.daysBeforeTarget === days && styles.selectedDaysBeforeText,
                    ]}>
                      {days}일 전
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          
          {/* 연속 알림 설정 */}
          {newNotification.notifyType !== 'ai' && (
            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>연속 알림</Text>
                <Switch
                  value={newNotification.isRepeating}
                  onValueChange={(value) => setNewNotification({ ...newNotification, isRepeating: value })}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={newNotification.isRepeating ? '#f5dd4b' : '#f4f3f4'}
                />
              </View>
              
              {newNotification.isRepeating && (
                <Text style={styles.repeatDescription}>
                  D-{newNotification.daysBeforeTarget}일부터 D-day까지 매일 알림을 받습니다.
                </Text>
              )}
            </View>
          )}
          
          {/* 알림 제목 및 내용 (AI 알림이 아닌 경우에만 표시) */}
          {newNotification.notifyType !== 'ai' && (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>알림 제목 (선택사항)</Text>
                <TextInput
                  style={styles.input}
                  value={newNotification.title}
                  onChangeText={(text) => setNewNotification({ ...newNotification, title: text })}
                  placeholder="알림 제목을 입력하세요"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>알림 내용 (선택사항)</Text>
                <TextInput
                  style={styles.input}
                  value={newNotification.message}
                  onChangeText={(text) => setNewNotification({ ...newNotification, message: text })}
                  placeholder="알림 내용을 입력하세요"
                  multiline
                />
              </View>
            </>
          )}
          
          {/* 버튼 */}
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowAddForm(false)}
            >
              <Text style={styles.buttonText}>취소</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleAddNotification}
            >
              <Text style={styles.buttonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  notificationsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  notificationItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    marginLeft: 12,
    padding: 4,
  },
  notificationDetails: {
    marginTop: 8,
  },
  notificationDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  repeatInfoContainer: {
    marginTop: 4,
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ccc',
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
  },
  disabledText: {
    color: '#ccc',
  },
  addFormContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  activeSegment: {
    backgroundColor: '#007AFF',
  },
  disabledSegment: {
    backgroundColor: '#f0f0f0',
  },
  segmentText: {
    fontSize: 14,
    color: '#007AFF',
  },
  activeSegmentText: {
    color: '#fff',
  },
  disabledSegmentText: {
    color: '#999',
  },
  typeInfoText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  daysBeforeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  daysBeforeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    margin: 4,
  },
  selectedDaysBeforeButton: {
    backgroundColor: '#007AFF',
  },
  daysBeforeText: {
    fontSize: 14,
    color: '#007AFF',
  },
  selectedDaysBeforeText: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repeatDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 4,
  },
  aiNotificationInfo: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIcon: {
    marginRight: 12,
  },
  aiInfoText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default NotificationSettings; 