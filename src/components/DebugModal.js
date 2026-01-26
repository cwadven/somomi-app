import { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * 디버깅 정보를 표시하는 모달 컴포넌트
 * 
 * @param {Object} props
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {string} props.title - 모달 제목
 * @param {Array} props.logs - 로그 배열 [{message: '메시지', timestamp: '시간', type: 'info|success|warning|error'}]
 * @param {function} props.onClose - 모달 닫기 함수
 * @param {function} props.onClear - 로그 초기화 함수
 */
const DebugModal = ({ 
  visible, 
  title = '디버깅 정보', 
  logs = [], 
  onClose,
  onClear,
  extra = null, // 모달 내부에 추가 컨트롤을 렌더링할 때 사용
}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.controlsContainer}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.clearButton]} 
              onPress={onClear}
            >
              <Text style={styles.controlButtonText}>로그 초기화</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.controlButton, 
                autoScroll ? styles.activeButton : styles.inactiveButton
              ]} 
              onPress={() => setAutoScroll(!autoScroll)}
            >
              <Text style={styles.controlButtonText}>
                {autoScroll ? '자동 스크롤 ON' : '자동 스크롤 OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          {extra ? (
            <View style={styles.extraContainer}>
              {extra}
            </View>
          ) : null}
          
          <ScrollView 
            style={styles.logsContainer}
            ref={scrollView => {
              if (scrollView && autoScroll && logs.length > 0) {
                scrollView.scrollToEnd({ animated: true });
              }
            }}
          >
            {logs.length === 0 ? (
              <Text style={styles.emptyText}>로그가 없습니다.</Text>
            ) : (
              logs.map((log, index) => (
                <View key={index} style={styles.logItem}>
                  <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                  <Text style={[styles.logMessage, styles[`log_${log.type || 'info'}`]]}>
                    {log.message}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
          
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  controlButton: {
    padding: 8,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#ff6b6b',
  },
  activeButton: {
    backgroundColor: '#4CAF50',
  },
  inactiveButton: {
    backgroundColor: '#9E9E9E',
  },
  controlButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  logsContainer: {
    maxHeight: 400,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  extraContainer: {
    marginBottom: 12,
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  logItem: {
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 5,
  },
  logTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  logMessage: {
    fontSize: 14,
  },
  log_info: {
    color: '#2196F3',
  },
  log_success: {
    color: '#4CAF50',
  },
  log_warning: {
    color: '#FF9800',
  },
  log_error: {
    color: '#F44336',
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    padding: 10,
    elevation: 2,
    alignSelf: 'center',
    minWidth: 100,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default DebugModal; 