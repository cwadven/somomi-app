import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AlertModal = ({ visible, title, message, content, onClose, buttons, icon, iconColor }) => {
  // 버튼이 제공되지 않은 경우 기본 확인 버튼 사용
  const renderButtons = () => {
    if (buttons && buttons.length > 0) {
      return buttons.map((button, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.button,
            button.style === 'cancel' && styles.cancelButton,
            button.style === 'destructive' && styles.destructiveButton,
            button.style === 'success' && styles.successButton,
            button.style === 'plain' && styles.plainButton,
            index > 0 && styles.buttonMargin
          ]}
          onPress={() => {
            if (button.onPress) {
              button.onPress();
            } else {
              onClose();
            }
          }}
        >
          <Text style={[
            styles.buttonText,
            button.style === 'cancel' && styles.cancelButtonText,
            button.style === 'destructive' && styles.destructiveButtonText,
            button.style === 'plain' && styles.plainButtonText
          ]}>
            {button.text || '확인'}
          </Text>
        </TouchableOpacity>
      ));
    } else {
      return (
        <TouchableOpacity
          style={styles.button}
          onPress={onClose}
        >
          <Text style={styles.buttonText}>확인</Text>
        </TouchableOpacity>
      );
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          {icon && (
            <View style={styles.iconContainer}>
              <Ionicons 
                name={icon} 
                size={40} 
                color={iconColor || '#4CAF50'} 
              />
            </View>
          )}
          <Text style={styles.modalTitle}>{title || '알림'}</Text>
          <Text style={styles.modalText}>{message}</Text>
          
          {/* 커스텀 콘텐츠 영역 */}
          {content && <View style={styles.contentContainer}>{content}</View>}
          
          <View style={styles.buttonContainer}>
            {renderButtons()}
          </View>
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
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  contentContainer: {
    width: '100%',
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 5,
    padding: 10,
    elevation: 2,
    minWidth: 80,
    flex: 1,
    marginHorizontal: 5,
  },
  buttonMargin: {
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  destructiveButton: {
    backgroundColor: '#F44336',
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  plainButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButtonText: {
    color: 'white',
  },
  destructiveButtonText: {
    color: 'white',
  },
  plainButtonText: {
    color: '#333',
  },
});

export default AlertModal; 