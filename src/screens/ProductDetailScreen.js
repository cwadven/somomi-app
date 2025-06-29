import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchProductById, deleteProductAsync, markProductAsConsumedAsync } from '../redux/slices/productsSlice';
import AlertModal from '../components/AlertModal';

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

const ProductDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { productId } = route.params;
  const { currentProduct, status, error } = useSelector(state => state.products);
  
  // 소진 처리 성공 모달 상태
  const [showConsumedModal, setShowConsumedModal] = useState(false);
  const [consumedProduct, setConsumedProduct] = useState(null);
  
  // 커스텀 알림 모달 상태
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: '',
    iconColor: ''
  });
  
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
  
  // 유통기한 남은 수명 계산 (%)
  const calculateExpiryPercentage = () => {
    if (!currentProduct.expiryDate) return null;
    
    const today = new Date();
    const expiryDate = new Date(currentProduct.expiryDate);
    const purchaseDate = new Date(currentProduct.purchaseDate);
    
    const totalDays = (expiryDate - purchaseDate) / (1000 * 60 * 60 * 24);
    const remainingDays = (expiryDate - today) / (1000 * 60 * 60 * 24);
    
    // 유통기한이 가까워질수록 HP바가 줄어들도록 계산
    // 남은 일수의 비율을 직접 사용 (구매일부터 유통기한까지의 총 기간 중 남은 비율)
    const percentage = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
    return Math.round(percentage);
  };
  
  // 소진 예상일 남은 수명 계산 (%)
  const calculateConsumptionPercentage = () => {
    if (!currentProduct.estimatedEndDate) return null;
    
    const today = new Date();
    const endDate = new Date(currentProduct.estimatedEndDate);
    const purchaseDate = new Date(currentProduct.purchaseDate);
    
    const totalDays = (endDate - purchaseDate) / (1000 * 60 * 60 * 24);
    const remainingDays = (endDate - today) / (1000 * 60 * 60 * 24);
    
    // 소진예상일이 가까워질수록 HP바가 줄어들도록 계산
    // 남은 일수의 비율을 직접 사용 (구매일부터 소진예상일까지의 총 기간 중 남은 비율)
    const percentage = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
    return Math.round(percentage);
  };
  
  // 유통기한 남은 일수 계산
  const calculateExpiryDays = () => {
    if (!currentProduct.expiryDate) return null;
    
    const today = new Date();
    const expiryDate = new Date(currentProduct.expiryDate);
    
    const remainingDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    return remainingDays;
  };
  
  // 소진 예상일 남은 일수 계산
  const calculateConsumptionDays = () => {
    if (!currentProduct.estimatedEndDate) return null;
    
    const today = new Date();
    const endDate = new Date(currentProduct.estimatedEndDate);
    
    const remainingDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
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
    setAlertModalConfig({
      title: '제품 삭제',
      message: '정말 이 제품을 삭제하시겠습니까?',
      buttons: [
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
                showErrorAlert(`삭제 중 오류가 발생했습니다: ${err.message}`);
              });
          }
        }
      ],
      icon: 'trash-outline',
      iconColor: '#F44336'
    });
    setAlertModalVisible(true);
  };
  
  // 제품 수정 화면으로 이동
  const handleEdit = () => {
    navigation.navigate('EditProduct', { productId: currentProduct.id });
  };
  
  // 알림 설정 화면으로 이동
  const handleNotification = () => {
    Alert.alert('알림', '알림 설정 기능은 아직 구현되지 않았습니다.');
  };
  
  // 소진 처리 함수
  const handleMarkAsConsumed = () => {
    setAlertModalConfig({
      title: '소진 처리',
      message: '이 제품을 소진 처리하시겠습니까?\n소진 처리된 제품은 소진 처리 목록으로 이동합니다.',
      buttons: [
        { text: '취소', style: 'cancel' },
        { 
          text: '소진 처리', 
          style: 'default',
          onPress: () => {
            // 소진 처리 전에 필요한 정보 저장
            const locationId = currentProduct.locationId;
            
            dispatch(markProductAsConsumedAsync(currentProduct.id))
              .unwrap()
              .then((result) => {
                // 소진 처리 성공 후 바로 이전 화면으로 이동
                navigation.goBack();
                
                // 약간의 딜레이 후 영역 상세 화면으로 이동
                setTimeout(() => {
                  if (locationId) {
                    // 특정 영역이 있는 경우 해당 영역 상세로 이동
                    navigation.navigate('Locations', { 
                      screen: 'LocationDetail',
                      params: { locationId }
                    });
                  } else {
                    // 영역이 없는 경우 전체 제품 목록으로 이동
                    navigation.navigate('Locations', { 
                      screen: 'LocationDetail',
                      params: { locationId: 'all' }
                    });
                  }
                }, 100);
              })
              .catch((err) => {
                showErrorAlert(`소진 처리 중 오류가 발생했습니다: ${err.message}`);
              });
          }
        }
      ],
      icon: 'checkmark-circle',
      iconColor: '#4CAF50'
    });
    setAlertModalVisible(true);
  };
  
  // 오류 알림 표시 함수
  const showErrorAlert = (message) => {
    setAlertModalConfig({
      title: '오류',
      message,
      buttons: [{ text: '확인', style: 'default' }],
      icon: 'alert-circle',
      iconColor: '#F44336'
    });
    setAlertModalVisible(true);
  };

  const expiryPercentage = calculateExpiryPercentage();
  const consumptionPercentage = calculateConsumptionPercentage();
  const expiryDays = calculateExpiryDays();
  const consumptionDays = calculateConsumptionDays();
  
  // 소진 처리가 필요한지 확인 (HP가 0%인 경우)
  const needsConsumption = 
    (expiryPercentage !== null && expiryPercentage === 0) || 
    (consumptionPercentage !== null && consumptionPercentage === 0);
  
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
  
  // 소진 처리 모달은 더 이상 필요하지 않으므로 제거
  // 소진 처리 모달 닫기 및 화면 이동
  const handleConsumedModalClose = () => {
    setShowConsumedModal(false);
    navigation.goBack();
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
        </View>
      </View>
      
      {/* HP 바 섹션 */}
      <View style={styles.hpSectionContainer}>
        {expiryPercentage !== null && (
          <View style={styles.hpSection}>
            <View style={styles.hpHeader}>
              <View style={styles.hpTitleContainer}>
                <Ionicons name="alarm-outline" size={18} color="#2196F3" style={styles.hpIcon} />
                <Text style={styles.hpTitle}>유통기한</Text>
              </View>
              <Text style={styles.hpDate}>
                {new Date(currentProduct.expiryDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.hpLabelContainer}>
              <Text style={styles.hpLabel}>남은 수명</Text>
              <Text style={[styles.hpPercentage, { color: '#2196F3' }]}>
                {expiryPercentage}%
              </Text>
            </View>
            <HPBar percentage={expiryPercentage} type="expiry" />
            {expiryDays !== null && (
              <Text style={styles.remainingDays}>
                {expiryDays > 0 
                  ? `${expiryDays}일 남음` 
                  : expiryDays === 0 
                    ? '오늘까지' 
                    : `${Math.abs(expiryDays)}일 지남`}
              </Text>
            )}
          </View>
        )}
        
        {consumptionPercentage !== null && (
          <View style={styles.hpSection}>
            <View style={styles.hpHeader}>
              <View style={styles.hpTitleContainer}>
                <Ionicons name="hourglass-outline" size={18} color="#4CAF50" style={styles.hpIcon} />
                <Text style={styles.hpTitle}>소진 예상</Text>
              </View>
              <Text style={styles.hpDate}>
                {new Date(currentProduct.estimatedEndDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.hpLabelContainer}>
              <Text style={styles.hpLabel}>남은 수명</Text>
              <Text style={[styles.hpPercentage, { color: '#4CAF50' }]}>
                {consumptionPercentage}%
              </Text>
            </View>
            <HPBar percentage={consumptionPercentage} type="consumption" />
            {consumptionDays !== null && (
              <Text style={styles.remainingDays}>
                {consumptionDays > 0 
                  ? `${consumptionDays}일 남음` 
                  : consumptionDays === 0 
                    ? '오늘까지' 
                    : `${Math.abs(consumptionDays)}일 지남`}
              </Text>
            )}
          </View>
        )}
      </View>
      
      {/* 제품 정보 */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>제품 정보</Text>
        
        <InfoItem 
          label="구매일" 
          value={currentProduct.purchaseDate ? new Date(currentProduct.purchaseDate).toLocaleDateString() : null} 
          icon="calendar-outline" 
        />
        
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
      
      {/* 소진 처리 버튼 (항상 표시) */}
      <TouchableOpacity 
        style={styles.consumeButtonContainer}
        onPress={handleMarkAsConsumed}
      >
        <View style={[
          styles.consumeButton,
          needsConsumption && styles.urgentConsumeButton
        ]}>
          <Ionicons 
            name="checkmark-circle" 
            size={24} 
            color="#fff" 
          />
          <Text style={styles.consumeButtonText}>
            {needsConsumption ? '소진 처리하기 (필요)' : '소진 처리하기'}
          </Text>
        </View>
      </TouchableOpacity>
      
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
      
      {/* 커스텀 알림 모달 */}
      <AlertModal
        visible={alertModalVisible}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        buttons={alertModalConfig.buttons}
        onClose={() => setAlertModalVisible(false)}
        icon={alertModalConfig.icon}
        iconColor={alertModalConfig.iconColor}
      />
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
  hpSectionContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  hpSection: {
    marginBottom: 16,
  },
  hpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hpTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hpIcon: {
    marginRight: 6,
  },
  hpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  hpDate: {
    fontSize: 14,
    color: '#666',
  },
  hpLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  hpLabel: {
    fontSize: 14,
    color: '#666',
  },
  hpPercentage: {
    fontSize: 14,
    fontWeight: '500',
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
  // 소진 처리 버튼 스타일
  consumeButtonContainer: {
    padding: 16,
    marginTop: 16,
  },
  consumeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentConsumeButton: {
    backgroundColor: '#FF9800',
  },
  consumeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  productInfoContainer: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  productInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  productInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 80,
  },
  productInfoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  successButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProductDetailScreen; 