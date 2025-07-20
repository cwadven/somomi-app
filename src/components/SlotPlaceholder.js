import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * 빈 슬롯을 표시하는 컴포넌트
 * @param {Object} props
 * @param {string} props.type - 슬롯 유형 ('location' 또는 'product')
 * @param {function} props.onPress - 슬롯 클릭 시 호출될 함수
 * @param {boolean} props.disabled - 슬롯 사용 불가 여부
 * @param {string} props.size - 슬롯 크기 ('small', 'medium', 'large')
 */
const SlotPlaceholder = ({ 
  type = 'product', 
  onPress, 
  disabled = false,
  size = 'medium'
}) => {
  // 슬롯 유형에 따른 텍스트 설정
  const slotText = type === 'location' ? '새 영역 추가' : '새 제품 추가';
  
  // 슬롯 크기에 따른 스타일 설정
  const sizeStyles = {
    small: {
      container: { width: 80, height: 80 },
      icon: 24,
      text: { fontSize: 12 }
    },
    medium: {
      container: { width: 120, height: 120 },
      icon: 32,
      text: { fontSize: 14 }
    },
    large: {
      container: { width: 150, height: 150 },
      icon: 40,
      text: { fontSize: 16 }
    }
  };
  
  const selectedSize = sizeStyles[size] || sizeStyles.medium;
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        selectedSize.container,
        disabled && styles.disabledContainer
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons 
        name="add-circle-outline" 
        size={selectedSize.icon} 
        color={disabled ? "#ccc" : "#4CAF50"} 
      />
      <Text style={[
        styles.text,
        selectedSize.text,
        disabled && styles.disabledText
      ]}>
        {slotText}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#4CAF50',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    margin: 8,
  },
  disabledContainer: {
    borderColor: '#ccc',
    backgroundColor: '#f0f0f0',
  },
  text: {
    color: '#4CAF50',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  disabledText: {
    color: '#999',
  }
});

export default SlotPlaceholder; 