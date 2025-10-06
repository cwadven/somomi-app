import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const PaymentFailScreen = () => {
  const navigation = useNavigation();

  const goToShop = () => {
    try {
      const parentNav = navigation.getParent && navigation.getParent();
      if (parentNav && typeof parentNav.navigate === 'function') {
        parentNav.navigate('Profile', { screen: 'Store' });
        return;
      }
    } catch (_) {}
    try {
      navigation.navigate('Profile', { screen: 'Store' });
    } catch (_) {
      navigation.navigate('Store');
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="close-circle" size={64} color="#E53935" />
      <Text style={styles.title}>결제가 실패했습니다</Text>
      <Text style={styles.message}>입력 정보를 확인하시고 다시 시도해주세요.</Text>
      <TouchableOpacity style={styles.button} onPress={goToShop}>
        <Text style={styles.buttonText}>상점으로 이동</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default PaymentFailScreen;


