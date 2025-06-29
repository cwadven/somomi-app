import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { deleteProduct } from '../redux/slices/productsSlice';

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
  const { products } = useSelector(state => state.products);
  const { categories } = useSelector(state => state.categories);
  
  // 제품 정보 가져오기
  const [product, setProduct] = useState(null);
  
  useEffect(() => {
    // 실제 제품 데이터가 있으면 해당 데이터 사용
    const foundProduct = products.find(p => p.id === productId);
    
    // 실제 데이터가 없으면 샘플 데이터 사용 (개발용)
    if (foundProduct) {
      setProduct(foundProduct);
    } else {
      // 샘플 데이터
      const sampleProducts = [
        {
          id: '1',
          name: '바디워시',
          category: '화장품',
          categoryId: '2',
          purchaseDate: '2025-05-01',
          estimatedEndDate: '2025-07-15',
          expiryDate: '2026-05-01',
          purchaseMethod: '온라인 쇼핑몰',
          purchaseLink: 'https://example.com/product',
          price: 12000,
          memo: '향이 좋아서 구매함',
        },
        {
          id: '2',
          name: '세탁세제',
          category: '세제',
          categoryId: '3',
          purchaseDate: '2025-04-15',
          estimatedEndDate: '2025-06-30',
          purchaseMethod: '마트',
          price: 15000,
        },
        {
          id: '3',
          name: '우유',
          category: '식품',
          categoryId: '1',
          purchaseDate: '2025-06-20',
          expiryDate: '2025-06-30',
          purchaseMethod: '편의점',
          price: 3000,
        },
      ];
      
      const sampleProduct = sampleProducts.find(p => p.id === productId);
      setProduct(sampleProduct);
    }
  }, [productId, products]);
  
  // 제품 데이터가 없을 경우 로딩 화면 표시
  if (!product) {
    return (
      <View style={styles.loadingContainer}>
        <Text>로딩 중...</Text>
      </View>
    );
  }
  
  // 남은 수명 계산 (%)
  const calculateRemainingLife = () => {
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
  
  // 남은 일수 계산
  const calculateRemainingDays = () => {
    if (!product.expiryDate && !product.estimatedEndDate) return null;
    
    const today = new Date();
    let targetDate;
    
    if (product.expiryDate) {
      targetDate = new Date(product.expiryDate);
    } else if (product.estimatedEndDate) {
      targetDate = new Date(product.estimatedEndDate);
    }
    
    const remainingDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    return remainingDays;
  };

  // 캐릭터 이미지 선택 (카테고리에 따라 다른 이미지 사용 가능)
  const getCharacterImage = () => {
    // 실제 구현 시 카테고리별 이미지 매핑
    return require('../../assets/icon.png');
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
            dispatch(deleteProduct(product.id));
            navigation.goBack();
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
        <Image source={getCharacterImage()} style={styles.characterImage} />
        <View style={styles.headerInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.categoryName}>{product.category}</Text>
          
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
          value={new Date(product.purchaseDate).toLocaleDateString()} 
          icon="calendar-outline" 
        />
        
        {product.expiryDate && (
          <InfoItem 
            label="유통기한" 
            value={new Date(product.expiryDate).toLocaleDateString()} 
            icon="alarm-outline" 
          />
        )}
        
        {product.estimatedEndDate && (
          <InfoItem 
            label="예상 소모 완료일" 
            value={new Date(product.estimatedEndDate).toLocaleDateString()} 
            icon="hourglass-outline" 
          />
        )}
        
        <InfoItem 
          label="구매 방법" 
          value={product.purchaseMethod} 
          icon="cart-outline" 
        />
        
        <InfoItem 
          label="구매 링크" 
          value={product.purchaseLink} 
          icon="link-outline" 
        />
        
        <InfoItem 
          label="가격" 
          value={product.price ? `${product.price.toLocaleString()}원` : null} 
          icon="pricetag-outline" 
        />
      </View>
      
      {/* 메모 섹션 */}
      {product.memo && (
        <View style={styles.memoSection}>
          <Text style={styles.sectionTitle}>메모</Text>
          <Text style={styles.memoText}>{product.memo}</Text>
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  characterImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
  categoryName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
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