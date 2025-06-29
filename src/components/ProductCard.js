import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// HP 바 컴포넌트
const HPBar = ({ percentage }) => {
  // HP 바 색상 계산
  const getHPColor = () => {
    if (percentage > 70) return '#4CAF50'; // 녹색
    if (percentage > 30) return '#FFC107'; // 노란색
    return '#F44336'; // 빨간색
  };

  return (
    <View style={styles.hpBarContainer}>
      <View 
        style={[
          styles.hpBar, 
          { width: `${percentage}%`, backgroundColor: getHPColor() }
        ]} 
      />
    </View>
  );
};

const ProductCard = ({ product, onPress }) => {
  // 남은 수명 계산 (%)
  const calculateRemainingLife = () => {
    // remainingPercentage가 있으면 그대로 사용
    if (product.remainingPercentage !== undefined) {
      return product.remainingPercentage;
    }
    
    // 없으면 계산
    if (!product.expiryDate && !product.estimatedEndDate) return 100;
    
    const today = new Date();
    let targetDate;
    
    if (product.expiryDate) {
      targetDate = new Date(product.expiryDate);
    } else if (product.estimatedEndDate) {
      targetDate = new Date(product.estimatedEndDate);
    }
    
    const purchaseDate = new Date(product.purchaseDate);
    const totalDays = (targetDate - purchaseDate) / (1000 * 60 * 60 * 24);
    const remainingDays = (targetDate - today) / (1000 * 60 * 60 * 24);
    
    const percentage = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
    return Math.round(percentage);
  };

  // 카테고리에 맞는 아이콘 선택
  const getCategoryIcon = () => {
    const categoryIcons = {
      '식품': 'fast-food',
      '화장품': 'color-palette',
      '세제': 'water',
      '욕실용품': 'water-outline',
      '주방용품': 'restaurant',
    };
    
    return categoryIcons[product.category] || 'cube-outline';
  };

  const hpPercentage = calculateRemainingLife();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.card}>
        <View style={styles.characterImageContainer}>
          <Ionicons name={getCategoryIcon()} size={40} color="#4CAF50" />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.brandContainer}>
            <Text style={styles.brand}>{product.brand}</Text>
            <Text style={styles.category}>{product.category}</Text>
          </View>
          <HPBar percentage={hpPercentage} />
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.dateText}>
              {product.expiryDate 
                ? `유통기한: ${new Date(product.expiryDate).toLocaleDateString()}`
                : product.estimatedEndDate 
                  ? `예상 소진일: ${new Date(product.estimatedEndDate).toLocaleDateString()}`
                  : '날짜 정보 없음'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  card: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  characterImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  brand: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  category: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hpBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  hpBar: {
    height: '100%',
    borderRadius: 4,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});

export default ProductCard; 