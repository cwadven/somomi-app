import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  processAllNotifications, 
  sendNotifications, 
  loadAllProcessedNotifications,
  loadProcessedNotifications
} from '../utils/notificationUtils';

const NotificationDebugger = () => {
  const [loading, setLoading] = useState(false);
  const [notificationsToSend, setNotificationsToSend] = useState([]);
  const [results, setResults] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications' or 'results'
  const [savedNotifications, setSavedNotifications] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  
  // 컴포넌트 마운트 시 저장된 알림 데이터 로드
  useEffect(() => {
    loadSavedNotifications();
  }, []);
  
  // 저장된 알림 데이터 로드
  const loadSavedNotifications = async () => {
    try {
      const allNotifications = await loadAllProcessedNotifications();
      setSavedNotifications(allNotifications);
      
      // 가장 최근 날짜(오늘 또는 마지막으로 처리된 날짜) 선택
      const dates = Object.keys(allNotifications);
      if (dates.length > 0) {
        // 날짜 내림차순 정렬
        dates.sort((a, b) => b.localeCompare(a));
        setSelectedDate(dates[0]);
        
        // 선택된 날짜의 알림 설정
        setNotificationsToSend(allNotifications[dates[0]] || []);
      }
    } catch (error) {
      console.error('저장된 알림 로드 중 오류 발생:', error);
    }
  };
  
  // 알림 처리 로직 실행
  const handleProcessNotifications = async () => {
    setLoading(true);
    try {
      // 알림 처리 및 저장
      const notifications = await processAllNotifications();
      setNotificationsToSend(notifications);
      
      // 오늘 날짜 설정
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      
      // 저장된 알림 데이터 다시 로드
      await loadSavedNotifications();
      
      setActiveTab('notifications');
      setShowModal(true);
    } catch (error) {
      console.error('알림 처리 중 오류 발생:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 날짜 선택 처리
  const handleDateSelect = async (date) => {
    setSelectedDate(date);
    try {
      const dateNotifications = await loadProcessedNotifications(date);
      setNotificationsToSend(dateNotifications);
    } catch (error) {
      console.error(`${date} 날짜의 알림 로드 중 오류 발생:`, error);
    }
  };
  
  // 선택된 날짜의 알림 전송
  const handleSendSelectedDateNotifications = async () => {
    if (!selectedDate || notificationsToSend.length === 0) return;
    
    setLoading(true);
    try {
      const sendResults = await sendNotifications(notificationsToSend);
      setResults(sendResults);
      setActiveTab('results');
    } catch (error) {
      console.error('알림 전송 중 오류 발생:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 날짜 포맷팅 함수 (YYYY-MM-DD -> YYYY년 MM월 DD일)
  const formatDateString = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${year}년 ${month}월 ${day}일`;
  };
  
  // 알림 정보 모달
  const renderNotificationModal = () => (
    <Modal
      visible={showModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>알림 디버거</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[
                styles.tab, 
                activeTab === 'notifications' && styles.activeTab
              ]}
              onPress={() => setActiveTab('notifications')}
            >
              <Text style={[
                styles.tabText, 
                activeTab === 'notifications' && styles.activeTabText
              ]}>
                알림 목록 ({notificationsToSend.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.tab, 
                activeTab === 'results' && styles.activeTab
              ]}
              onPress={() => setActiveTab('results')}
            >
              <Text style={[
                styles.tabText, 
                activeTab === 'results' && styles.activeTabText
              ]}>
                전송 결과 ({results.length})
              </Text>
            </TouchableOpacity>
          </View>
          
          {activeTab === 'notifications' && (
            <ScrollView horizontal={true} style={styles.dateScrollView}>
              {Object.keys(savedNotifications)
                .sort((a, b) => b.localeCompare(a)) // 날짜 내림차순 정렬
                .map(date => (
                  <TouchableOpacity
                    key={date}
                    style={[
                      styles.dateButton,
                      selectedDate === date && styles.selectedDateButton
                    ]}
                    onPress={() => handleDateSelect(date)}
                  >
                    <Text style={[
                      styles.dateButtonText,
                      selectedDate === date && styles.selectedDateButtonText
                    ]}>
                      {formatDateString(date)}
                    </Text>
                    <Text style={[
                      styles.dateCountText,
                      selectedDate === date && styles.selectedDateButtonText
                    ]}>
                      ({savedNotifications[date]?.length || 0})
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          )}
          
          <ScrollView style={styles.modalBody}>
            {activeTab === 'notifications' ? (
              notificationsToSend.length > 0 ? (
                <>
                  {selectedDate && (
                    <View style={styles.selectedDateHeader}>
                      <Text style={styles.selectedDateTitle}>
                        {formatDateString(selectedDate)} 알림 목록
                      </Text>
                    </View>
                  )}
                  {notificationsToSend.map((notification, index) => (
                    <View key={index} style={styles.notificationItem}>
                      <View style={styles.notificationHeader}>
                        <Text style={styles.notificationType}>
                          {notification.notification_type}
                        </Text>
                        <Text style={styles.productName}>
                          {notification.product_name}
                        </Text>
                      </View>
                      <Text style={styles.message}>{notification.message}</Text>
                      <View style={styles.notificationFooter}>
                        <View style={styles.footerLeft}>
                          <Text style={styles.sourceType}>
                            {notification.source_type === 'location' ? '영역 알림' : '제품 알림'}
                          </Text>
                          {notification.source_type === 'location' && (
                            <Text style={styles.sourceName}>
                              {notification.source_name}
                            </Text>
                          )}
                        </View>
                        <View style={styles.footerRight}>
                          <Text style={styles.locationName}>
                            영역: {notification.location_name || '없음'}
                          </Text>
                          <Text style={styles.expireAt}>
                            만료: {new Date(notification.expire_at).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={styles.emptyText}>
                  {selectedDate 
                    ? `${formatDateString(selectedDate)}에 전송할 알림이 없습니다.`
                    : '전송할 알림이 없습니다.'
                  }
                </Text>
              )
            ) : (
              results.length > 0 ? (
                results.map((result, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.resultItem, 
                      result.success ? styles.successResult : styles.failedResult
                    ]}
                  >
                    <View style={styles.resultHeader}>
                      <Ionicons 
                        name={result.success ? "checkmark-circle" : "alert-circle"} 
                        size={20} 
                        color={result.success ? "#4CAF50" : "#F44336"} 
                      />
                      <Text style={styles.resultStatus}>
                        {result.success ? '성공' : '실패'}
                      </Text>
                    </View>
                    <Text style={styles.resultMessage}>
                      {result.notification.message}
                    </Text>
                    {!result.success && result.error && (
                      <Text style={styles.errorMessage}>{result.error}</Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>전송 결과가 없습니다.</Text>
              )
            )}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            {activeTab === 'notifications' && notificationsToSend.length > 0 && (
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={handleSendSelectedDateNotifications}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sendButtonText}>
                    {selectedDate ? `${formatDateString(selectedDate)} 알림 전송` : '알림 전송'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.button}
        onPress={handleProcessNotifications}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="notifications" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>알림 테스트</Text>
          </>
        )}
      </TouchableOpacity>
      {renderNotificationModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  dateScrollView: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dateButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDateButton: {
    backgroundColor: '#4CAF50',
  },
  dateButtonText: {
    fontSize: 12,
    color: '#333',
  },
  selectedDateButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  dateCountText: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  selectedDateHeader: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedDateTitle: {
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  notificationItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationType: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 12,
    marginRight: 8,
  },
  productName: {
    fontWeight: '600',
    fontSize: 16,
  },
  message: {
    marginBottom: 8,
    color: '#333',
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  sourceType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9C27B0',
    marginBottom: 2,
  },
  sourceName: {
    fontSize: 12,
    color: '#9C27B0',
  },
  locationName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  expireAt: {
    fontSize: 12,
    color: '#666',
  },
  resultItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  successResult: {
    backgroundColor: '#E8F5E9',
  },
  failedResult: {
    backgroundColor: '#FFEBEE',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultStatus: {
    fontWeight: '600',
    marginLeft: 8,
  },
  resultMessage: {
    marginBottom: 4,
  },
  errorMessage: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default NotificationDebugger; 