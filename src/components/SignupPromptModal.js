import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const SignupPromptModal = ({ visible, onClose, message, currentCount, maxCount }) => {
  const navigation = useNavigation();

  const handleSignup = () => {
    onClose();
    // 회원가입 화면으로 이동
    navigation.navigate('Profile', { screen: 'ProfileScreen', params: { initialMode: 'signup' } });
  };

  const handleLogin = () => {
    onClose();
    // 로그인 화면으로 이동
    navigation.navigate('Profile', { screen: 'ProfileScreen', params: { initialMode: 'login' } });
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
          <View style={styles.headerContainer}>
            <Ionicons name="alert-circle" size={40} color="#FF9800" />
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>제한된 기능</Text>
          
          {currentCount !== undefined && maxCount !== undefined && (
            <View style={styles.limitContainer}>
              <Text style={styles.limitText}>
                {currentCount}/{maxCount}
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(currentCount / maxCount) * 100}%` }
                  ]} 
                />
              </View>
            </View>
          )}
          
          <Text style={styles.message}>{message || '비회원은 일부 기능이 제한됩니다.\n회원가입 후 모든 기능을 이용해보세요.'}</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.signupButton]}
              onPress={handleSignup}
            >
              <Text style={styles.signupButtonText}>회원가입</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.loginButton]}
              onPress={handleLogin}
            >
              <Text style={styles.loginButtonText}>로그인</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.laterButton} onPress={onClose}>
            <Text style={styles.laterButtonText}>나중에 하기</Text>
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
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
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
  headerContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  limitContainer: {
    width: '100%',
    marginBottom: 15,
  },
  limitText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 5,
    color: '#555',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF9800',
  },
  message: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  button: {
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    flex: 1,
    marginHorizontal: 5,
  },
  signupButton: {
    backgroundColor: '#4CAF50',
  },
  loginButton: {
    backgroundColor: '#2196F3',
  },
  signupButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  loginButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  laterButton: {
    marginTop: 10,
    padding: 10,
  },
  laterButtonText: {
    color: '#666',
    fontSize: 14,
  },
});

export default SignupPromptModal; 