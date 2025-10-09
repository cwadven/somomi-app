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
import { fetchConsumedProducts } from '../redux/slices/productsSlice';
import { revokeConsumeInventoryItem } from '../api/inventoryApi';
import LocationSelectionModal from '../components/LocationSelectionModal';
import AlertModal from '../components/AlertModal';

const ConsumedProductDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { productId } = route.params;
  const { consumedProducts, consumedStatus, status, error } = useSelector(state => state.products);
  const { locations } = useSelector(state => state.locations);
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
  // 카테고리 제거: 고정 아이콘 사용
  const getCategoryIcon = () => 'cube-outline';

  // 소진 당시 영역 이름 결정 (현재 사용자의 영역 목록에서 id로 매칭)
  const consumedFromLocation = currentProduct && locations
    ? (locations.find(loc => loc.id === currentProduct.locationId) || null)
    : null;
  
  // 소진 철회 처리 함수: 기본 철회 시도 후 특정 에러코드면 영역 선택 유도
  const [reasonForSelection, setReasonForSelection] = useState('');

  const handleRestoreProduct = () => {
    setIsRestoring(true);
    revokeConsumeInventoryItem(currentProduct.id)
      .then(() => {
        navigation.goBack();
      })
      .catch((error) => {
        setIsRestoring(false);
        const code = error?.response?.data?.error_code;
        const msg = error?.response?.data?.message || error?.message || undefined;
        if (
          code === 'guest-section-not-exists' ||
          code === 'guest-section-exceed-base-slot' ||
          code === 'guest-inventory-item-template-invalid' ||
          code === 'guest-inventory-item-template-already-item-registered'
        ) {
          let reason = msg;
          if (!reason) {
            const map = {
              'guest-section-not-exists': '선택된 영역을 찾을 수 없습니다. 다른 영역을 선택해주세요.',
              'guest-section-exceed-base-slot': '해당 영역의 유효 슬롯을 초과했습니다. 다른 영역을 선택해주세요.',
              'guest-inventory-item-template-invalid': '연결 가능한 제품 템플릿이 유효하지 않습니다. 다른 영역을 선택하거나 템플릿을 확인해주세요.',
              'guest-inventory-item-template-already-item-registered': '이미 연결된 제품이 있는 템플릿입니다. 다른 영역을 선택해주세요.',
            };
            reason = map[code] || '해당 영역으로 복원할 수 없습니다. 다른 영역을 선택해주세요.';
          }
          setReasonForSelection(reason);
          setLocationSelectionVisible(true);
          return;
        }
        const finalMsg = msg || '소진 철회 중 오류가 발생했습니다.';
        showErrorModal(finalMsg);
      });
  };
  
  // 영역 선택 후 소진 철회 처리 (지정 영역으로 재시도)
  const handleLocationSelect = (location) => {
    setIsRestoring(true);
    revokeConsumeInventoryItem(currentProduct.id, { guest_section_id: location?.id })
      .then(() => {
        navigation.goBack();
      })
      .catch((error) => {
        setIsRestoring(false);
        const msg = error?.response?.data?.message || error?.message || '소진 철회 중 오류가 발생했습니다.';
        showErrorModal(msg);
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
            {/* 카테고리 표시 제거 */}
            
            {consumedFromLocation && (
              <View style={styles.locationBadge}>
                <Ionicons name="location-outline" size={12} color="#9E9E9E" />
                <Text style={styles.locationText}>{consumedFromLocation.title}</Text>
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

          <InfoItem 
            label="소진처리일" 
            value={currentProduct.processedAt ? formatDate(currentProduct.processedAt) : null} 
            icon="time-outline" 
          />

          <InfoItem 
            label="소진 당시 영역"
            value={consumedFromLocation ? consumedFromLocation.title : null}
            icon="location-outline"
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
        reasonMessage={reasonForSelection}
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