import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * 모든 환경에서 사용 가능한 커스텀 알림 모달
 * 
 * @param {Object} props
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {string} props.title - 알림 제목
 * @param {string} props.message - 알림 메시지
 * @param {Array} props.buttons - 버튼 배열 [{text: '확인', style: 'default', onPress: () => {}}]
 * @param {function} props.onClose - 모달 닫기 함수
 * @param {string} props.icon - 아이콘 이름 (Ionicons)
 * @param {string} props.iconColor - 아이콘 색상
 */
const AlertModal = ({ 
  visible, 
  title, 
  message, 
  buttons = [{ text: '확인', style: 'default', onPress: () => {} }],
  onClose,
  icon,
  iconColor = '#4CAF50'
}) => {
  // 안드로이드 뒤로가기 버튼 처리
  useEffect(() => {
    if (Platform.OS === 'android' && visible) {
      const backAction = () => {
        if (onClose) {
          onClose();
        }
        return true; // 이벤트 소비
      };
      
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, [visible, onClose]);

  // 버튼 스타일 계산
  const getButtonStyle = (style) => {
    switch (style) {
      case 'cancel':
        return styles.cancelButton;
      case 'destructive':
        return styles.destructiveButton;
      case 'default':
      default:
        return styles.defaultButton;
    }
  };

  // 버튼 텍스트 스타일 계산
  const getButtonTextStyle = (style) => {
    switch (style) {
      case 'cancel':
        return styles.cancelButtonText;
      case 'destructive':
        return styles.destructiveButtonText;
      case 'default':
      default:
        return styles.defaultButtonText;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              {icon && (
                <View style={styles.iconContainer}>
                  <Ionicons name={icon} size={48} color={iconColor} />
                </View>
              )}
              
              {title && <Text style={styles.title}>{title}</Text>}
              
              {message && <Text style={styles.message}>{message}</Text>}
              
              <View style={[
                styles.buttonContainer,
                buttons.length > 2 && styles.buttonContainerVertical
              ]}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      getButtonStyle(button.style),
                      buttons.length <= 2 && { flex: 1 },
                      buttons.length <= 2 && index > 0 && { marginLeft: 8 }
                    ]}
                    onPress={() => {
                      if (button.onPress) button.onPress();
                      if (onClose) onClose();
                    }}
                  >
                    <Text style={[styles.buttonText, getButtonTextStyle(button.style)]}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  buttonContainerVertical: {
    flexDirection: 'column',
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    marginVertical: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  defaultButton: {
    backgroundColor: '#4CAF50',
  },
  defaultButtonText: {
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
  },
  destructiveButton: {
    backgroundColor: '#F44336',
  },
  destructiveButtonText: {
    color: '#fff',
  },
});

export default AlertModal; 