import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  AppState,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  sendImmediateNotification, 
  sendBackgroundNotification 
} from '../utils/notificationUtils';
// pushNotificationService 추가
import { pushNotificationService } from '../utils/pushNotificationService';
import AlertModal from './AlertModal';

const PushNotificationTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState(null);

  // 모달 닫기 핸들러
  const handleModalClose = () => {
    setModalVisible(false);
    if (modalAction) {
      modalAction();
    }
  };

  // 즉시 알림 테스트
  const handleImmediateNotification = async () => {
    // 먼저 로딩 상태 설정
    setIsLoading(true);
    
    try {
      // 알림 카운터 증가 (먼저 처리)
      const newCount = notificationCount + 1;
      setNotificationCount(newCount);
      
      // 알림 데이터 설정
      const title = '테스트 알림';
      const body = '앱 푸시 알림이 정상적으로 작동합니다!';
      const data = {
          type: 'test',
          testData: '테스트 데이터',
          timestamp: new Date().toISOString(),
        count: newCount,
        deepLink: 'somomi://home'
      };
      
      // 알림 전송 - 별도의 함수로 분리하여 실행
      // 이 함수는 성공하든 실패하든 앱이 계속 실행되도록 함
      sendTestNotification(title, body, data);
      
      // 사용자에게 알림이 전송되었다는 메시지 표시
      setModalTitle('알림 전송 시작');
      setModalMessage('알림이 전송 중입니다. 잠시 후 확인해주세요.');
      setModalAction(null);
      setModalVisible(true);
    } catch (error) {
      console.error('알림 전송 준비 중 오류:', error);
      
      // 오류가 발생해도 앱이 종료되지 않도록 함
      setModalTitle('알림 전송 오류');
      setModalMessage('알림 전송 준비 중 문제가 발생했습니다.');
      setModalAction(null);
      setModalVisible(true);
    } finally {
      // 항상 로딩 상태 해제
      setIsLoading(false);
    }
  };
  
  // 별도의 함수로 알림 전송 로직 분리
  const sendTestNotification = async (title, body, data) => {
    try {
      // 디버그 로그에 알림 시도 기록
      pushNotificationService && pushNotificationService.addDebugLog(`즉시 알림 테스트 시도: ${title}`, 'info');
      
      // 알림 전송 시도
      const notificationId = await sendImmediateNotification(title, body, data);
      
      // 디버그 로그에 결과 기록
      if (notificationId) {
        pushNotificationService && pushNotificationService.addDebugLog(`즉시 알림 전송 성공: ID=${notificationId}`, 'success');
      } else {
        pushNotificationService && pushNotificationService.addDebugLog('즉시 알림 전송 실패: 알림 ID가 없음', 'error');
      }
      
      return notificationId;
    } catch (error) {
      console.error('알림 전송 실패:', error);
      pushNotificationService && pushNotificationService.addDebugLog(`즉시 알림 전송 실패: ${error.message}`, 'error');
      return null;
    }
  };

  // 지연 알림 테스트
  const handleDelayedNotification = async () => {
    try {
      setIsLoading(true);
      
      // 지연 시간 설정 (초)
      const delaySeconds = 10;
      
      // 현재 앱 상태 확인
      const currentAppState = AppState.currentState;
      
      // 알림 데이터 설정
      const title = '지연 알림 테스트';
      const body = `${delaySeconds}초 후 알림이 발송되었습니다! (${notificationCount + 1}번째)`;
      const data = {
        type: 'delayed',
        testData: '지연 알림 테스트 데이터',
        deepLink: 'somomi://product/detail/1',
        count: notificationCount + 1,
        appStateAtSend: currentAppState
      };
      
      setModalTitle('지연 알림 테스트');
      setModalMessage(`${delaySeconds}초 후에 알림이 발송됩니다.\n\n알림을 백그라운드에서 받으려면:\n1. '확인' 버튼을 누른 후\n2. 즉시 홈 버튼을 눌러 앱을 백그라운드로 전환하세요.\n\n${Platform.OS === 'ios' ? '(iOS에서는 앱을 완전히 종료하지 마세요)' : ''}`);
      setModalAction(async () => {
        try {
          // 디버그 로그에 알림 시도 기록
          pushNotificationService && pushNotificationService.addDebugLog(`지연 알림 테스트 시도: ${title} (${delaySeconds}초 후)`, 'info');
          
          // 지연 알림 예약
          const notificationId = await sendBackgroundNotification(
            title,
            body,
            data,
            delaySeconds
          );
          
          // 디버그 로그에 결과 기록
          if (notificationId) {
            pushNotificationService && pushNotificationService.addDebugLog(`지연 알림 예약 성공: ID=${notificationId}`, 'success');
          } else {
            pushNotificationService && pushNotificationService.addDebugLog('지연 알림 예약 실패: 알림 ID가 없음', 'error');
          }
          
          setNotificationCount(prev => prev + 1);
          
          // 사용자에게 백그라운드로 전환하라는 메시지 표시
          setTimeout(() => {
            if (AppState.currentState === 'active') {
              setModalTitle('앱이 아직 활성 상태입니다');
              setModalMessage('백그라운드 알림을 테스트하려면 홈 버튼을 눌러 앱을 백그라운드로 전환하세요.');
              setModalAction(null);
              setModalVisible(true);
            }
          }, 2000); // 2초 후 확인
          
        } catch (error) {
          console.error('지연 알림 예약 실패:', error);
          pushNotificationService && pushNotificationService.addDebugLog(`지연 알림 예약 실패: ${error.message}`, 'error');
          setModalTitle('알림 예약 실패');
          setModalMessage(`오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
          setModalAction(null);
          setModalVisible(true);
        } finally {
          setIsLoading(false);
        }
      });
      setModalVisible(true);
    } catch (error) {
      setModalTitle('알림 예약 실패');
      setModalMessage(`오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
      setModalAction(null);
      setModalVisible(true);
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="notifications" size={24} color="#4CAF50" />
        <Text style={styles.title}>앱푸시 알림 테스트</Text>
      </View>
      
      <Text style={styles.description}>
        앱푸시 알림 기능을 테스트할 수 있습니다. 즉시 알림은 바로 표시되고, 
        지연 알림은 앱을 백그라운드로 전환한 후 10초 뒤에 표시됩니다.
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.immediateButton]} 
          onPress={handleImmediateNotification}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>즉시 알림 테스트</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.delayedButton]} 
          onPress={handleDelayedNotification}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>10초 후 알림 테스트</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4CAF50" />
          <Text style={styles.loadingText}>처리 중...</Text>
        </View>
      )}
      
      <Text style={styles.counter}>테스트 횟수: {notificationCount}</Text>
      
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  immediateButton: {
    backgroundColor: '#4CAF50',
  },
  delayedButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  counter: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
});

export default PushNotificationTest; 