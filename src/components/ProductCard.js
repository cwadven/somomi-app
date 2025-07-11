import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// HP 바 컴포넌트
const HPBar = ({ percentage, type }) => {
  // HP 바 색상 계산
  const getHPColor = (value, type) => {
    if (type === 'expiry') {
      // 유통기한용 색상 (파란색 계열)
      if (value > 70) return '#2196F3'; // 파란색
      if (value > 30) return '#03A9F4'; // 밝은 파란색
      return '#F44336'; // 빨간색 (위험)
    } else {
      // 소진용 색상 (녹색 계열)
      if (value > 70) return '#4CAF50'; // 녹색
      if (value > 30) return '#FFC107'; // 노란색
      return '#FF9800'; // 주황색
    }
  };

  return (
    <View style={styles.hpBarContainer}>
      <View 
        style={[
          styles.hpBar, 
          { width: `${percentage}%`, backgroundColor: getHPColor(percentage, type) }
        ]} 
      />
    </View>
  );
};

const ProductCard = ({ product, onPress }) => {
  // 유통기한 남은 수명 계산 (%)
  const calculateExpiryPercentage = () => {
    if (!product.expiryDate) return null;
    
    const today = new Date();
    const expiryDate = new Date(product.expiryDate);
    const purchaseDate = new Date(product.purchaseDate);
    
    const totalDays = (expiryDate - purchaseDate) / (1000 * 60 * 60 * 24);
    const remainingDays = (expiryDate - today) / (1000 * 60 * 60 * 24);
    
    // 유통기한이 가까워질수록 HP바가 줄어들도록 변경
    // 남은 일수의 비율을 직접 사용 (구매일부터 유통기한까지의 총 기간 중 남은 비율)
    const percentage = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
    return {
      percentage: Math.round(percentage),
      remainingDays: Math.ceil(remainingDays)
    };
  };

  // 소진 예상일 남은 수명 계산 (%)
  const calculateConsumptionPercentage = () => {
    if (!product.estimatedEndDate) return null;
    
    const today = new Date();
    const endDate = new Date(product.estimatedEndDate);
    const purchaseDate = new Date(product.purchaseDate);
    
    const totalDays = (endDate - purchaseDate) / (1000 * 60 * 60 * 24);
    const remainingDays = (endDate - today) / (1000 * 60 * 60 * 24);
    
    // 소진예상일이 가까워질수록 HP바가 줄어들도록 변경
    // 남은 일수의 비율을 직접 사용 (구매일부터 소진예상일까지의 총 기간 중 남은 비율)
    const percentage = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
    return {
      percentage: Math.round(percentage),
      remainingDays: Math.ceil(remainingDays)
    };
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

  const expiryResult = calculateExpiryPercentage();
  const consumptionResult = calculateConsumptionPercentage();
  
  const expiryPercentage = expiryResult?.percentage;
  const expiryDaysLeft = expiryResult?.remainingDays;
  
  const consumptionPercentage = consumptionResult?.percentage;
  const consumptionDaysLeft = consumptionResult?.remainingDays;
  
  // HP가 0%인지 확인
  const isZeroHP = (expiryPercentage === 0 || consumptionPercentage === 0);
  
  // 유통기한 또는 소진 예상일이 3일 이하로 남았는지 확인
  const showExpiryBadge = expiryDaysLeft !== undefined && expiryDaysLeft <= 3 && expiryDaysLeft > 0;
  const showConsumptionBadge = consumptionDaysLeft !== undefined && consumptionDaysLeft <= 3 && consumptionDaysLeft > 0;
  
  // 뱃지 텍스트 생성
  const getBadgeText = () => {
    if (showExpiryBadge) {
      return `D-${expiryDaysLeft}`;
    }
    if (showConsumptionBadge) {
      return `D-${consumptionDaysLeft}`;
    }
    return null;
  };
  
  // 뱃지 색상 결정
  const getBadgeColor = () => {
    const daysLeft = showExpiryBadge ? expiryDaysLeft : consumptionDaysLeft;
    if (daysLeft === 1) return '#F44336'; // 빨간색 (D-1)
    if (daysLeft === 2) return '#FF9800'; // 주황색 (D-2)
    return '#FFC107'; // 노란색 (D-3)
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[
        styles.card,
        isZeroHP && styles.zeroHPCard
      ]}>
        <View style={[
          styles.characterImageContainer,
          isZeroHP && styles.zeroHPImageContainer
        ]}>
          <Ionicons 
            name={getCategoryIcon()} 
            size={40} 
            color={isZeroHP ? "#888" : "#4CAF50"} 
          />
          {isZeroHP && (
            <View style={styles.warningIconContainer}>
              <Ionicons name="warning" size={20} color="#FFF" />
            </View>
          )}
          
          {/* D-day 뱃지 */}
          {(showExpiryBadge || showConsumptionBadge) && (
            <View style={[styles.dDayBadge, { backgroundColor: getBadgeColor() }]}>
              <Text style={styles.dDayText}>{getBadgeText()}</Text>
            </View>
          )}
        </View>
        <View style={styles.infoContainer}>
          <Text style={[
            styles.productName,
            isZeroHP && styles.zeroHPText
          ]}>
            {product.name}
            {isZeroHP && " (소진/만료)"}
          </Text>
          <View style={styles.brandContainer}>
            <Text style={[
              styles.brand,
              isZeroHP && styles.zeroHPSubText
            ]}>
              {product.brand}
            </Text>
            {product.category && (
            <Text style={[
              styles.category,
              isZeroHP && styles.zeroHPCategory
            ]}>
              {product.category}
            </Text>
            )}
          </View>
          
          {/* 유통기한 정보가 있는 경우에만 HP 바 표시 */}
          {product.expiryDate && expiryPercentage !== null && (
            <View style={styles.hpSection}>
              <View style={styles.hpLabelContainer}>
                <Text style={[
                  styles.hpLabel,
                  isZeroHP && styles.zeroHPSubText
                ]}>
                  유통기한
                </Text>
                <Text style={[
                  styles.hpPercentage,
                  isZeroHP && styles.zeroHPSubText
                ]}>
                  {expiryPercentage}%
                </Text>
              </View>
              <HPBar percentage={expiryPercentage} type="expiry" />
            </View>
          )}
          
          {/* 소진예상일 정보가 있는 경우에만 HP 바 표시 */}
          {product.estimatedEndDate && consumptionPercentage !== null && (
            <View style={styles.hpSection}>
              <View style={styles.hpLabelContainer}>
                <Text style={[
                  styles.hpLabel,
                  isZeroHP && styles.zeroHPSubText
                ]}>
                  소진 예상
                </Text>
                <Text style={[
                  styles.hpPercentage,
                  isZeroHP && styles.zeroHPSubText
                ]}>
                  {consumptionPercentage}%
                </Text>
              </View>
              <HPBar percentage={consumptionPercentage} type="consumption" />
            </View>
          )}
          
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={14} color={isZeroHP ? "#888" : "#666"} />
            <View style={styles.dateTextContainer}>
              {product.expiryDate && (
                <Text style={[
                  styles.dateText,
                  isZeroHP && styles.zeroHPSubText
                ]}>
                  유통기한: {new Date(product.expiryDate).toLocaleDateString()}
                </Text>
              )}
              {product.estimatedEndDate && (
                <Text style={[
                  styles.dateText,
                  isZeroHP && styles.zeroHPSubText
                ]}>
                  소진예상: {new Date(product.estimatedEndDate).toLocaleDateString()}
                </Text>
              )}
              {!product.expiryDate && !product.estimatedEndDate && (
                <Text style={[
                  styles.dateText,
                  isZeroHP && styles.zeroHPSubText
                ]}>
                  날짜 정보 없음
                </Text>
              )}
            </View>
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
  // HP가 0%인 카드의 스타일
  zeroHPCard: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  characterImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  // HP가 0%인 이미지 컨테이너 스타일
  zeroHPImageContainer: {
    backgroundColor: '#e0e0e0',
  },
  // 경고 아이콘 컨테이너
  warningIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#F44336',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // D-day 뱃지 스타일
  dDayBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  dDayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  // HP가 0%인 텍스트 스타일
  zeroHPText: {
    color: '#888',
  },
  zeroHPSubText: {
    color: '#999',
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
  zeroHPCategory: {
    backgroundColor: '#9E9E9E',
  },
  hpSection: {
    marginBottom: 6,
  },
  hpLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  hpLabel: {
    fontSize: 12,
    color: '#666',
  },
  hpPercentage: {
    fontSize: 12,
    color: '#666',
  },
  hpBarContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  hpBar: {
    height: '100%',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  dateTextContainer: {
    flex: 1,
    flexDirection: 'column',
    marginLeft: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
});

export default ProductCard; 