import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DebugModal from './DebugModal';
import { 
  getPushNotificationLogs, 
  clearPushNotificationLogs, 
  setPushNotificationDebugCallback 
} from '../utils/pushNotificationService';
import { processAllNotifications, sendImmediateNotification, scheduleDebugEveryFiveSeconds } from '../utils/notificationUtils';

/**
 * 푸시 알림 디버깅을 위한 컴포넌트
 * 앱 내 어디서든 추가하여 디버깅 정보를 확인할 수 있습니다.
 */
const PushNotificationDebugger = () => {
  const [showModal, setShowModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [hasNewLogs, setHasNewLogs] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    // 초기 로그 로드
    setLogs(getPushNotificationLogs());
    
    // 로그 업데이트 콜백 설정
    setPushNotificationDebugCallback((newLogs) => {
      setLogs([...newLogs]);
      if (!showModal) {
        setHasNewLogs(true);
      }
    });
    
    return () => {
      // 컴포넌트 언마운트 시 콜백 제거
      setPushNotificationDebugCallback(null);
    };
  }, [showModal]);
  
  const handleOpenModal = () => {
    setShowModal(true);
    setHasNewLogs(false);
  };
  
  const handleCloseModal = () => {
    setShowModal(false);
  };
  
  const handleClearLogs = () => {
    clearPushNotificationLogs();
    setLogs([]);
  };

  // 9시 리마인더 즉시 발송 (알림 즉시 생성/전송 역할)
  const handleSend9amNow = async () => {
    try {
      setRunning(true);
      await processAllNotifications(false); // 생성 + 즉시 전송
    } finally {
      setRunning(false);
      setShowModal(true);
    }
  };

  // 20시 작성 리마인더 즉시 발송
  const handleSend8pmNow = async () => {
    try {
      setRunning(true);
      await sendImmediateNotification('작성 리마인더(디버그)', '최신화 하셨나요? 오늘 구매하거나 배치한 제품을 추가해 주세요.', { type: 'update_reminder', deepLink: 'somomi://notifications' });
    } finally {
      setRunning(false);
    }
  };
  
  return (
    <>
      <TouchableOpacity 
        style={[styles.debugButton, hasNewLogs && styles.newLogsButton]} 
        onPress={handleOpenModal}
      >
        <Ionicons name="notifications" size={24} color="#fff" />
        {logs.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{logs.length}</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <DebugModal
        visible={showModal}
        title="푸시 알림 디버깅"
        logs={logs}
        onClose={handleCloseModal}
        onClear={handleClearLogs}
        extra={(
          <View style={styles.quickActionsInline}>
            <TouchableOpacity style={[styles.qaButton, running && styles.qaButtonDisabled]} onPress={handleSend9amNow} disabled={running}>
              <Ionicons name="paper-plane-outline" size={18} color="#fff" />
              <Text style={styles.qaButtonText}>9시 리마인더 즉시 발송</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.qaButton, running && styles.qaButtonDisabled]} onPress={handleSend8pmNow} disabled={running}>
              <Ionicons name="alarm-outline" size={18} color="#fff" />
              <Text style={styles.qaButtonText}>20시 작성 리마인더 즉시 발송</Text>
            </TouchableOpacity>
            {/* 20시 작성 리마인더 스케줄 버튼 제거 */}
            <TouchableOpacity
              style={{ backgroundColor: '#2196F3', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginRight: 8, marginBottom: 8 }}
              onPress={async () => {
                await scheduleDebugEveryFiveSeconds(60);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>5초 주기(1분) 디버그</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </>
  );
};

const styles = StyleSheet.create({
  debugButton: {
    position: 'absolute',
    bottom: 80, // 기존 디버그 버튼보다 위에 위치하도록 조정
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 999, // App.js의 디버그 버튼보다 낮은 zIndex 설정
  },
  newLogsButton: {
    backgroundColor: '#F44336',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF9800',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickActions: {
    position: 'absolute',
    left: 80,
    bottom: 80,
    flexDirection: 'row',
  },
  quickActionsInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  qaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  qaButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  qaButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PushNotificationDebugger; 