import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calculateExpiryPercentage, calculateConsumptionPercentage } from '../utils/productUtils';

// HP 바 컴포넌트
const HPBar = ({ percentage, type }) => {
  // percentage가 NaN이면 0으로 처리
  const safePercentage = isNaN(percentage) ? 0 : percentage;
  
  // HP 바 색상은 퍼센트에 따라 변하지 않도록 고정 (요청사항)
  const barColor = type === 'expiry' ? '#2196F3' : '#4CAF50';

  return (
    <View style={styles.hpBarContainer}>
      <View 
        style={[
          styles.hpBar, 
          { width: `${safePercentage}%`, backgroundColor: barColor }
        ]} 
      />
    </View>
  );
};

const ProductCard = ({ product, onPress, locationName, showLocation = false }) => {
  const [iconLoadFailed, setIconLoadFailed] = useState(false);
  const expiryResult = calculateExpiryPercentage(product);
  const consumptionResult = calculateConsumptionPercentage(product);
  
  const expiryPercentage = expiryResult?.percentage;
  const expiryDaysLeft = expiryResult?.remainingDays;
  
  const consumptionPercentage = consumptionResult?.percentage;
  const consumptionDaysLeft = consumptionResult?.remainingDays;
  
  // 남은 일수가 0일 이하인지 확인
  const isZeroHP = 
    (expiryDaysLeft !== undefined && expiryDaysLeft <= 0) || 
    (consumptionDaysLeft !== undefined && consumptionDaysLeft <= 0);
  
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

  const iconUri = typeof product?.iconUrl === 'string' && product.iconUrl.trim() !== '' ? product.iconUrl : null;

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
          {iconUri && !iconLoadFailed ? (
            <Image
              source={{ uri: iconUri }}
              style={styles.iconImage}
              onError={() => setIconLoadFailed(true)}
            />
          ) : (
            <Ionicons name="cube-outline" size={40} color={isZeroHP ? "#888" : "#4CAF50"} />
          )}
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
            {/* 카테고리 표시 제거 */}
          </View>
          
          {/* 영역 정보 표시 (showLocation이 true일 때만) */}
          {showLocation && locationName && (
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={14} color={isZeroHP ? "#888" : "#4CAF50"} />
              <Text style={[
                styles.locationText,
                isZeroHP && styles.zeroHPSubText
              ]}>
                {locationName}
              </Text>
            </View>
          )}
          
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
                  {isNaN(expiryPercentage) ? '0' : expiryPercentage}%
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
                  {isNaN(consumptionPercentage) ? '0' : consumptionPercentage}%
                </Text>
              </View>
              <HPBar percentage={consumptionPercentage} type="consumption" />
            </View>
          )}
          
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={14} color={isZeroHP ? "#888" : "#666"} />
            <View style={styles.dateTextContainer}>
              {product.purchaseDate && (
                <Text style={[
                  styles.dateText,
                  isZeroHP && styles.zeroHPSubText
                ]}>
                  구매일: {new Date(product.purchaseDate).toLocaleDateString()}
                </Text>
              )}
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
                  소비기한: {new Date(product.estimatedEndDate).toLocaleDateString()}
                </Text>
              )}
              {product.createdAt && (
                <Text style={[
                  styles.dateText,
                  isZeroHP && styles.zeroHPSubText
                ]}>
                  등록일: {new Date(product.createdAt).toLocaleDateString()}
                </Text>
              )}
              {!product.purchaseDate && !product.expiryDate && !product.estimatedEndDate && !product.createdAt && (
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
    width: '100%',
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  zeroHPCard: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  characterImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  iconImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 10,
  },
  zeroHPImageContainer: {
    backgroundColor: '#e0e0e0',
  },
  warningIconContainer: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  zeroHPText: {
    color: '#888',
  },
  zeroHPSubText: {
    color: '#aaa',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  brand: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  // 카테고리 스타일 제거
  hpSection: {
    marginBottom: 6,
  },
  hpLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: '#f5f5f5',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  locationText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  hpLabel: {
    fontSize: 12,
    color: '#666',
  },
  hpPercentage: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  hpBarContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  hpBar: {
    height: '100%',
    borderRadius: 3,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dateTextContainer: {
    marginLeft: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  dDayBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dDayText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default ProductCard; 