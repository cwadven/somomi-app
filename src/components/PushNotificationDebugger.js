import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DebugModal from './DebugModal';
import { 
  getPushNotificationLogs, 
  clearPushNotificationLogs, 
  setPushNotificationDebugCallback 
} from '../utils/pushNotificationService';

/**
 * 푸시 알림 디버깅을 위한 컴포넌트
 * 앱 내 어디서든 추가하여 디버깅 정보를 확인할 수 있습니다.
 */
const PushNotificationDebugger = () => {
  const [showModal, setShowModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [hasNewLogs, setHasNewLogs] = useState(false);

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
      />
    </>
  );
};

const styles = StyleSheet.create({
  debugButton: {
    position: 'absolute',
    bottom: 80, // 기존 디버그 버튼보다 위에 위치하도록 조정
    right: 20,
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
});

export default PushNotificationDebugger; 