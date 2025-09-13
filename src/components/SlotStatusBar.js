import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * 슬롯 사용 현황을 표시하는 컴포넌트
 * @param {Object} props
 * @param {number} props.used - 사용 중인 슬롯 수
 * @param {number} props.total - 전체 슬롯 수
 * @param {string} props.type - 슬롯 유형 ('location' 또는 'product')
 * @param {Function} props.onDetailPress - 자세히 버튼 클릭 시 호출될 함수
 */
const SlotStatusBar = ({ used, total, type = 'product', onDetailPress }) => {
  const isUnlimited = total === -1;
  // 사용률 계산 (무제한이면 0으로 처리)
  const usagePercent = isUnlimited ? 0 : (total > 0 ? (used / total) * 100 : 0);
  
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
  const safeTotal = isUnlimited ? -1 : (isNaN(total) || total <= 0 ? 1 : total);
  
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.statusText}>
          {safeTotal === -1 ? '무한 슬롯' : `사용 중: ${safeUsed}/${safeTotal} ${typeText}`}
        </Text>
        {onDetailPress && (
          <TouchableOpacity 
            style={styles.detailButton}
            onPress={onDetailPress}
          >
            <Text style={styles.detailButtonText}>자세히</Text>
            <Ionicons name="chevron-forward" size={14} color="#4CAF50" />
          </TouchableOpacity>
        )}
      </View>
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },
  detailButtonText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginRight: 2,
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