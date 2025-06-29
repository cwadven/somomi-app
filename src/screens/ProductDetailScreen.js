import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchProductById, deleteProductAsync } from '../redux/slices/productsSlice';

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

const ProductDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { productId } = route.params;
  const { currentProduct, status, error } = useSelector(state => state.products);
  
  useEffect(() => {
    dispatch(fetchProductById(productId));
  }, [dispatch, productId]);
  
  // 제품 데이터가 로딩 중일 경우 로딩 화면 표시
  if (status === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }
  
  // 에러가 발생한 경우 에러 메시지 표시
  if (status === 'failed') {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>오류: {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => dispatch(fetchProductById(productId))}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // 제품 데이터가 없을 경우 메시지 표시
  if (!currentProduct) {
    return (
      <View style={styles.loadingContainer}>
        <Text>제품을 찾을 수 없습니다.</Text>
      </View>
    );
  }
  
  // 남은 수명 계산 (%)
  const calculateRemainingLife = () => {
    // remainingPercentage가 있으면 그대로 사용
    if (currentProduct.remainingPercentage !== undefined) {
      return currentProduct.remainingPercentage;
    }
    
    if (!currentProduct.expiryDate && !currentProduct.estimatedEndDate) return 100;
    
    const today = new Date();
    let targetDate;
    
    if (currentProduct.expiryDate) {
      targetDate = new Date(currentProduct.expiryDate);
    } else if (currentProduct.estimatedEndDate) {
      targetDate = new Date(currentProduct.estimatedEndDate);
    }
    
    const purchaseDate = new Date(currentProduct.purchaseDate);
    const totalDays = (targetDate - purchaseDate) / (1000 * 60 * 60 * 24);
    const remainingDays = (targetDate - today) / (1000 * 60 * 60 * 24);
    
    const percentage = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
    return Math.round(percentage);
  };
  
  // 남은 일수 계산
  const calculateRemainingDays = () => {
    if (!currentProduct.expiryDate && !currentProduct.estimatedEndDate) return null;
    
    const today = new Date();
    let targetDate;
    
    if (currentProduct.expiryDate) {
      targetDate = new Date(currentProduct.expiryDate);
    } else if (currentProduct.estimatedEndDate) {
      targetDate = new Date(currentProduct.estimatedEndDate);
    }
    
    const remainingDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    return remainingDays;
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
    
    return categoryIcons[currentProduct.category] || 'cube-outline';
  };
  
  // 제품 삭제 처리
  const handleDelete = () => {
    Alert.alert(
      '제품 삭제',
      '정말 이 제품을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: () => {
            dispatch(deleteProductAsync(currentProduct.id))
              .unwrap()
              .then(() => {
                navigation.goBack();
              })
              .catch((err) => {
                Alert.alert('오류', `삭제 중 오류가 발생했습니다: ${err.message}`);
              });
          }
        }
      ]
    );
  };
  
  // 제품 수정 화면으로 이동
  const handleEdit = () => {
    Alert.alert('알림', '제품 수정 기능은 아직 구현되지 않았습니다.');
  };
  
  // 알림 설정 화면으로 이동
  const handleNotification = () => {
    Alert.alert('알림', '알림 설정 기능은 아직 구현되지 않았습니다.');
  };

  const hpPercentage = calculateRemainingLife();
  const remainingDays = calculateRemainingDays();
  
  // 정보 항목 컴포넌트
  const InfoItem = ({ label, value, icon }) => {
    if (!value) return null;
    
    return (
      <View style={styles.infoItem}>
        <View style={styles.infoItemLeft}>
          <Ionicons name={icon} size={20} color="#4CAF50" style={styles.infoIcon} />
          <Text style={styles.infoLabel}>{label}</Text>
        </View>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* 제품 헤더 */}
      <View style={styles.header}>
        <View style={styles.characterImageContainer}>
          <Ionicons name={getCategoryIcon()} size={50} color="#4CAF50" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.productName}>{currentProduct.name}</Text>
          <View style={styles.brandCategoryContainer}>
            <Text style={styles.brandName}>{currentProduct.brand}</Text>
            <Text style={styles.categoryName}>{currentProduct.category}</Text>
          </View>
          
          <View style={styles.hpSection}>
            <View style={styles.hpLabelContainer}>
              <Text style={styles.hpLabel}>남은 수명</Text>
              <Text style={styles.hpPercentage}>{hpPercentage}%</Text>
            </View>
            <HPBar percentage={hpPercentage} />
            {remainingDays !== null && (
              <Text style={styles.remainingDays}>
                {remainingDays > 0 
                  ? `${remainingDays}일 남음` 
                  : remainingDays === 0 
                    ? '오늘까지' 
                    : `${Math.abs(remainingDays)}일 지남`}
              </Text>
            )}
          </View>
        </View>
      </View>
      
      {/* 제품 정보 */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>제품 정보</Text>
        
        <InfoItem 
          label="구매일" 
          value={currentProduct.purchaseDate ? new Date(currentProduct.purchaseDate).toLocaleDateString() : null} 
          icon="calendar-outline" 
        />
        
        {currentProduct.expiryDate && (
          <InfoItem 
            label="유통기한" 
            value={new Date(currentProduct.expiryDate).toLocaleDateString()} 
            icon="alarm-outline" 
          />
        )}
        
        {currentProduct.estimatedEndDate && (
          <InfoItem 
            label="예상 소모 완료일" 
            value={new Date(currentProduct.estimatedEndDate).toLocaleDateString()} 
            icon="hourglass-outline" 
          />
        )}
        
        <InfoItem 
          label="구매 방법" 
          value={currentProduct.purchaseMethod} 
          icon="cart-outline" 
        />
        
        <InfoItem 
          label="구매 링크" 
          value={currentProduct.purchaseLink} 
          icon="link-outline" 
        />
        
        <InfoItem 
          label="가격" 
          value={currentProduct.price ? `${currentProduct.price.toLocaleString()}원` : null} 
          icon="pricetag-outline" 
        />
      </View>
      
      {/* 메모 섹션 */}
      {currentProduct.memo && (
        <View style={styles.memoSection}>
          <Text style={styles.sectionTitle}>메모</Text>
          <Text style={styles.memoText}>{currentProduct.memo}</Text>
        </View>
      )}
      
      {/* 작업 버튼 */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>수정</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleNotification}>
          <Ionicons name="notifications-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>알림 설정</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>삭제</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  characterImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  brandCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandName: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  categoryName: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hpSection: {
    marginTop: 8,
  },
  hpLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  hpLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  hpPercentage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  hpBarContainer: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  hpBar: {
    height: '100%',
    borderRadius: 5,
  },
  remainingDays: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  memoSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#333',
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
  },
  memoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default ProductDetailScreen; 