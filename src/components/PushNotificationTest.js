import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  sendImmediateNotification, 
  sendBackgroundNotification 
} from '../utils/notificationUtils';

const PushNotificationTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // 즉시 알림 테스트
  const handleImmediateNotification = async () => {
    try {
      setIsLoading(true);
      
      const notificationId = await sendImmediateNotification(
        '테스트 알림',
        '앱 푸시 알림이 정상적으로 작동합니다!',
        {
          type: 'test',
          testData: '테스트 데이터',
          timestamp: new Date().toISOString(),
          count: notificationCount + 1
        }
      );
      
      setNotificationCount(prev => prev + 1);
      
      Alert.alert(
        '알림 전송 성공',
        `알림이 성공적으로 전송되었습니다. (ID: ${notificationId})`,
        [{ text: '확인' }]
      );
    } catch (error) {
      Alert.alert(
        '알림 전송 실패',
        `오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`,
        [{ text: '확인' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 지연 알림 테스트
  const handleDelayedNotification = async () => {
    try {
      setIsLoading(true);
      
      Alert.alert(
        '지연 알림 테스트',
        '3초 후에 알림이 발송됩니다. 지금 홈 버튼을 눌러 앱을 백그라운드로 전환하세요.',
        [{ 
          text: '확인', 
          onPress: async () => {
            const notificationId = await sendBackgroundNotification(
              '지연 알림 테스트',
              `3초 후 알림이 발송되었습니다! (${notificationCount + 1}번째)`,
              {
                type: 'delayed',
                testData: '지연 알림 테스트 데이터',
                deepLink: 'somomi://product/detail/1',
                count: notificationCount + 1
              },
              3 // 3초 후
            );
            
            setNotificationCount(prev => prev + 1);
            setIsLoading(false);
          }
        }]
      );
    } catch (error) {
      Alert.alert(
        '알림 예약 실패',
        `오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`,
        [{ text: '확인' }]
      );
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
        지연 알림은 앱을 백그라운드로 전환한 후 3초 뒤에 표시됩니다.
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
          <Text style={styles.buttonText}>지연 알림 테스트</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4CAF50" />
          <Text style={styles.loadingText}>처리 중...</Text>
        </View>
      )}
      
      <Text style={styles.counter}>테스트 횟수: {notificationCount}</Text>
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