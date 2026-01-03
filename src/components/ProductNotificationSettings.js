import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * ProductNotificationSettings
 * - 제품별 알림 설정 UI (향후 구현 예정)
 * - 현재는 요구사항상 사용자에게 노출하지 않음
 */
const ProductNotificationSettings = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>알림 설정(미구현)</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  text: {
    color: '#666',
    fontSize: 14,
  },
});

export default ProductNotificationSettings;


