import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchConsumedProducts, restoreConsumedProductAsync } from '../redux/slices/productsSlice';
import LocationSelectionModal from '../components/LocationSelectionModal';
import AlertModal from '../components/AlertModal';

const ConsumedProductDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { productId } = route.params;
  const { consumedProducts, consumedStatus, status, error } = useSelector(state => state.products);
  const [locationSelectionVisible, setLocationSelectionVisible] = useState(false);
  
  // 제품 정보를 로컬 상태로 관리
  const [localProduct, setLocalProduct] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  
  // 알림 모달 상태
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: '',
    iconColor: ''
  });
  
  // 현재 제품 찾기
  const currentProduct = consumedProducts.find(product => product.id === productId) || localProduct;
  
  // 컴포넌트 마운트 시 한 번만 실행
  useEffect(() => {
    // 소진 처리된 제품 목록이 없으면 로드
    if (consumedProducts.length === 0) {
      dispatch(fetchConsumedProducts());
    }
    
    // 현재 제품 정보를 로컬 상태에 저장 (최초 1회)
    const product = consumedProducts.find(product => product.id === productId);
    if (product && !localProduct) {
      setLocalProduct(product);
    }
  }, [dispatch]);
  
  // 날짜 포맷팅 함수
  const formatDate = (dateString) => {
    if (!dateString) return '정보 없음';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  // 카테고리에 맞는 아이콘 선택
  const getCategoryIcon = () => {
    if (!currentProduct || !currentProduct.category) return 'cube-outline';
    
    const categoryIcons = {
      '식품': 'fast-food',
      '화장품': 'color-palette',
      '세제': 'water',
      '욕실용품': 'water-outline',
      '주방용품': 'restaurant',
    };
    
    // category가 객체인 경우 name 속성 사용
    const categoryName = typeof currentProduct.category === 'object' 
      ? currentProduct.category.name 
      : currentProduct.category;
      
    return categoryIcons[categoryName] || 'cube-outline';
  };
  
  // 소진 철회 처리 함수
  const handleRestoreProduct = () => {
    // 제품에 영역 정보가 있는지 확인
    if (currentProduct.locationId) {
      // 소진 철회 전에 현재 제품 정보 저장
      const productName = currentProduct.name;
      
      // 영역 정보가 있으면 바로 소진 철회 처리
      setAlertModalConfig({
        title: '소진 철회',
        message: '이 제품을 소진 철회하시겠습니까?\n제품이 원래 있던 영역으로 복원됩니다.',
        icon: 'refresh-circle',
        iconColor: '#2196F3',
        buttons: [
          { text: '취소', style: 'cancel' },
          { 
            text: '소진 철회', 
            onPress: () => {
              setIsRestoring(true);
              dispatch(restoreConsumedProductAsync({ id: currentProduct.id }))
                .unwrap()
                .then(() => {
                  // 성공 시 바로 이전 화면으로 이동
                  navigation.goBack();
                })
                .catch((error) => {
                  setIsRestoring(false);
                  showErrorModal(`소진 철회 중 오류가 발생했습니다: ${error.message}`);
                });
            }
          }
        ]
      });
      setAlertModalVisible(true);
    } else {
      // 영역 정보가 없으면 영역 선택 모달 표시
      setLocationSelectionVisible(true);
    }
  };
  
  // 영역 선택 후 소진 철회 처리
  const handleLocationSelect = (location) => {
    // 소진 철회 전에 현재 제품 정보 저장
    const productName = currentProduct.name;
    
    setIsRestoring(true);
    dispatch(restoreConsumedProductAsync({ id: currentProduct.id, locationId: location.id }))
      .unwrap()
      .then(() => {
        // 성공 시 바로 이전 화면으로 이동
        navigation.goBack();
      })
      .catch((error) => {
        setIsRestoring(false);
        showErrorModal(`소진 철회 중 오류가 발생했습니다: ${error.message}`);
      });
  };
  
  // 오류 모달 표시
  const showErrorModal = (message) => {
    setAlertModalConfig({
      title: '오류',
      message,
      icon: 'alert-circle',
      iconColor: '#F44336',
      buttons: [
        { text: '확인' }
      ]
    });
    setAlertModalVisible(true);
  };
  
  // 제품 데이터가 로딩 중이거나 소진 철회 중일 경우 로딩 화면 표시
  if (consumedStatus === 'loading' || isRestoring) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }
  
  // 에러가 발생한 경우 에러 메시지 표시
  if (consumedStatus === 'failed') {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>오류: {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => dispatch(fetchConsumedProducts())}
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
  
  // 정보 항목 컴포넌트
  const InfoItem = ({ label, value, icon }) => {
    // value가 없어도 항목을 표시하고 '정보 없음'으로 표시
    const displayValue = value || '정보 없음';
    
    return (
      <View style={styles.infoItem}>
        <View style={styles.infoItemLeft}>
          <Ionicons name={icon} size={20} color="#9E9E9E" style={styles.infoIcon} />
          <Text style={styles.infoLabel}>{label}</Text>
        </View>
        <Text style={styles.infoValue}>{displayValue}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>소진 처리된 상품 상세</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.container}>
        {/* 제품 이미지 및 기본 정보 */}
        <View style={styles.productHeader}>
          <View style={styles.imageContainer}>
            {currentProduct.image ? (
              <Image 
                source={{ uri: currentProduct.image }} 
                style={styles.productImage} 
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noImageContainer}>
                <Ionicons 
                  name={getCategoryIcon()} 
                  size={60} 
                  color="#9E9E9E" 
                />
                <Text style={styles.noImageText}>이미지 없음</Text>
              </View>
            )}
          </View>
          
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{currentProduct.name}</Text>
            {currentProduct.category && (
              <Text style={styles.productCategory}>
                {typeof currentProduct.category === 'object' 
                  ? currentProduct.category.name 
                  : currentProduct.category}
              </Text>
            )}
            
            {currentProduct.location && (
              <View style={styles.locationBadge}>
                <Ionicons name="location-outline" size={12} color="#9E9E9E" />
                <Text style={styles.locationText}>
                  {typeof currentProduct.location === 'object' 
                    ? currentProduct.location.title 
                    : currentProduct.location}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* 소진 정보 섹션 */}
        <View style={styles.consumedSection}>
          <Text style={styles.sectionTitle}>소진 정보</Text>
          
          <View style={styles.consumedInfo}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" style={styles.consumedIcon} />
            <Text style={styles.consumedText}>
              {formatDate(currentProduct.consumedAt)}에 소진 처리됨
            </Text>
          </View>
        </View>
        
        {/* 제품 정보 섹션 */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>제품 정보</Text>
          
          <InfoItem 
            label="구매일" 
            value={currentProduct.purchaseDate ? formatDate(currentProduct.purchaseDate) : null} 
            icon="calendar-outline" 
          />
          
          <InfoItem 
            label="유통기한" 
            value={currentProduct.expiryDate ? formatDate(currentProduct.expiryDate) : null} 
            icon="calendar-outline" 
          />
          
          <InfoItem 
            label="브랜드" 
            value={currentProduct.brand || '정보 없음'} 
            icon="pricetag-outline" 
          />
          
          <InfoItem 
            label="구매처" 
            value={currentProduct.purchasePlace || '정보 없음'} 
            icon="cart-outline" 
          />
          
          <InfoItem 
            label="가격" 
            value={currentProduct.price ? `${currentProduct.price.toLocaleString()}원` : '정보 없음'} 
            icon="cash-outline" 
          />
          
          {currentProduct.memo && (
            <View style={styles.memoContainer}>
              <Text style={styles.memoLabel}>메모</Text>
              <Text style={styles.memoText}>{currentProduct.memo}</Text>
            </View>
          )}
        </View>
        
        {/* 소진 철회 버튼 */}
        <TouchableOpacity 
          style={styles.restoreButton}
          onPress={handleRestoreProduct}
        >
          <Ionicons name="refresh" size={20} color="#fff" style={styles.restoreButtonIcon} />
          <Text style={styles.restoreButtonText}>소진 철회</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* 영역 선택 모달 */}
      <LocationSelectionModal
        visible={locationSelectionVisible}
        onClose={() => setLocationSelectionVisible(false)}
        onSelectLocation={handleLocationSelect}
      />
      
      {/* 알림 모달 */}
      <AlertModal
        visible={alertModalVisible}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        buttons={alertModalConfig.buttons}
        icon={alertModalConfig.icon}
        iconColor={alertModalConfig.iconColor}
        onClose={() => setAlertModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 32,
  },
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
  productHeader: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    resizeMode: 'cover',
  },
  noImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 14,
    color: '#666',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  consumedSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  consumedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
  },
  consumedIcon: {
    marginRight: 8,
  },
  consumedText: {
    fontSize: 16,
    color: '#4CAF50',
  },
  detailsSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
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
  memoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  memoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  memoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  restoreButtonIcon: {
    marginRight: 8,
  },
  restoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ConsumedProductDetailScreen; 