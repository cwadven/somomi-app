import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * 슬롯 사용 현황을 표시하는 컴포넌트
 * @param {Object} props
 * @param {number} props.used - 사용 중인 슬롯 수
 * @param {number} props.total - 전체 슬롯 수
 * @param {string} props.type - 슬롯 유형 ('location' 또는 'product')
 */
const SlotStatusBar = ({ used, total, type = 'product' }) => {
  // 사용률 계산 (0으로 나누기 방지)
  const usagePercent = total > 0 ? (used / total) * 100 : 0;
  
  // 사용률에 따른 색상 설정
  const getStatusColor = () => {
    if (usagePercent >= 90) return '#F44336'; // 빨간색 (위험)
    if (usagePercent >= 70) return '#FF9800'; // 주황색 (경고)
    return '#4CAF50'; // 초록색 (양호)
  };
  
  // 슬롯 유형에 따른 텍스트 설정
  const typeText = type === 'location' ? '영역' : '슬롯';
  
  // 사용 중인 슬롯과 전체 슬롯 수를 안전하게 표시
  const safeUsed = isNaN(used) ? 0 : used;
  const safeTotal = isNaN(total) || total <= 0 ? 1 : total;
  
  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>
        사용 중: {safeUsed}/{safeTotal} {typeText}
      </Text>
      <View style={styles.barContainer}>
        <View 
          style={[
            styles.bar, 
            { width: `${Math.min(100, usagePercent)}%`, backgroundColor: getStatusColor() }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  barContainer: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  }
});

export default SlotStatusBar; 