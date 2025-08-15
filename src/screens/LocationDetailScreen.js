import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  FlatList,
  Modal
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchLocationById, deleteLocation } from '../redux/slices/locationsSlice';
import { fetchProductsByLocation } from '../redux/slices/productsSlice';
import { releaseTemplateInstance } from '../redux/slices/authSlice';
import { useSelector as useReduxSelector } from 'react-redux';
import ProductCard from '../components/ProductCard';
import SlotStatusBar from '../components/SlotStatusBar';
import SlotPlaceholder from '../components/SlotPlaceholder';
import LocationNotificationSettings from '../components/LocationNotificationSettings';

const LocationDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  
  const { locationId, isAllProducts } = route.params;
  const isAllProductsView = isAllProducts || locationId === 'all';
  
  const { currentLocation, status, error } = useSelector(state => state.locations);
  const { products } = useSelector(state => state.products);
  const { slots, userProductSlotTemplateInstances, subscription, userLocationTemplateInstances } = useSelector(state => state.auth);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [locationProducts, setLocationProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('products'); // 'products' 또는 'notifications'

  // 만료된 구독 템플릿이어도 상세 접근은 허용. 대신 UI 상에서 편집 유도로 처리.
  
  // 영역 정보 로드
  useEffect(() => {
    if (!isAllProductsView) {
      dispatch(fetchLocationById(locationId));
    }
  }, [dispatch, locationId, isAllProductsView]);
  
  // 제품 목록 로드
  useEffect(() => {
    dispatch(fetchProductsByLocation(isAllProductsView ? 'all' : locationId));
  }, [dispatch, locationId, isAllProductsView]);
  
  // 제품 목록 필터링
  useEffect(() => {
    if (isAllProductsView) {
      setLocationProducts(products);
    } else {
      const filteredProducts = products.filter(product => product.locationId === locationId);
      setLocationProducts(filteredProducts);
    }
  }, [products, locationId, isAllProductsView]);
  
  // 뒤로가기 핸들러
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // 영역 삭제 확인 모달 표시
  const handleDeletePress = () => {
    setShowDeleteConfirm(true);
  };
  
  // 영역 삭제 실행
  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    
    try {
      // 영역 삭제
      await dispatch(deleteLocation(locationId)).unwrap();
      
      // 템플릿 인스턴스 해제 (다시 사용 가능하게)
      if (currentLocation?.templateInstanceId) {
        dispatch(releaseTemplateInstance(locationId));
      }
      
      navigation.goBack();
    } catch (error) {
      Alert.alert('오류', '영역 삭제 중 문제가 발생했습니다.');
    }
  };
  
  // 영역 수정 화면으로 이동
  const handleEditPress = () => {
    navigation.navigate('AddLocation', { 
      isEditMode: true,
      location: currentLocation
    });
  };
  
  // 제품 추가 화면으로 이동
  const handleAddProduct = () => {
    navigation.navigate('ProductForm', { locationId });
  };
  
  // 제품 상세 화면으로 이동
  const handleProductPress = (product) => {
    navigation.navigate('ProductDetail', { productId: product.id });
  };
  
  // 탭 변경 핸들러
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  // 로딩 중 표시
  if (!isAllProductsView && status === 'loading') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleGoBack}
          >
            <Ionicons name="arrow-back" size={24} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </View>
    );
  }
  
  // 오류 표시
  if (!isAllProductsView && error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleGoBack}
          >
            <Ionicons name="arrow-back" size={24} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>오류</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>오류: {error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => dispatch(fetchLocationById(locationId))}
          >
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // 제품 슬롯 계산
  const calculateProductSlots = () => {
    if (isAllProductsView) {
      return { used: products.length, total: 999 }; // 모든 제품 보기에서는 슬롯 제한 없음
    }
    
    // 영역의 기본 슬롯 + 해당 영역에 등록된 추가 제품 슬롯 수
    const baseSlots = currentLocation?.feature?.baseSlots ?? slots.productSlots.baseSlots;
    const assignedExtra = (userProductSlotTemplateInstances || []).filter(t => t.assignedLocationId === locationId).length;
    const totalSlots = baseSlots === -1 ? -1 : (baseSlots + assignedExtra); // -1은 무제한
    
    return { 
      used: locationProducts.length,
      total: totalSlots
    };
  };
  
  const { used: usedSlots, total: totalSlots } = calculateProductSlots();
  
  // 슬롯 상태에 따른 제품 추가 가능 여부
  // 템플릿 만료 시에는 제품 추가/삭제/변경은 막고, 상세 조회/수정 화면 진입만 허용
  const linkedTemplate = (userLocationTemplateInstances || []).find(t => t.usedInLocationId === locationId) || null;
  const isTemplateExpired = linkedTemplate && linkedTemplate.origin === 'subscription' && linkedTemplate.subscriptionExpiresAt && (Date.now() >= new Date(linkedTemplate.subscriptionExpiresAt).getTime());
  const canAddProduct = !isTemplateExpired && (totalSlots === -1 || usedSlots < totalSlots);
  
  // 제품 목록 탭 렌더링
  const renderProductsTab = () => {
    return (
      <View style={styles.productsContainer}>
        {locationProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>등록된 제품이 없습니다.</Text>
            {!isAllProductsView && (
              <Text style={styles.emptySubText}>
                오른쪽 하단의 + 버튼을 눌러 제품을 추가하세요.
              </Text>
            )}
          </View>
        ) : (
          <FlatList
            data={locationProducts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ProductCard 
                product={item} 
                onPress={() => handleProductPress(item)}
              />
            )}
            contentContainerStyle={styles.productsList}
          />
        )}
        
        {/* 제품 추가 버튼 (모든 제품 보기가 아닐 때만 표시) */}
        {!isAllProductsView && (
          <TouchableOpacity 
            style={[
              styles.addButton,
              !canAddProduct && styles.disabledButton
            ]}
            onPress={handleAddProduct}
            disabled={!canAddProduct}
          >
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  // 알림 설정 탭 렌더링
  const renderNotificationsTab = () => {
    return (
      <ScrollView style={styles.notificationsContainer}>
        <LocationNotificationSettings locationId={locationId} location={currentLocation} />
      </ScrollView>
    );
  };
  
  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleGoBack}
          >
            <Ionicons name="arrow-back" size={24} color="#4CAF50" />
          </TouchableOpacity>
          
          {isAllProductsView ? (
            <>
              <View style={styles.locationIconContainer}>
                <Ionicons name="albums-outline" size={24} color="#4CAF50" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.locationTitle}>모든 제품</Text>
                <Text style={styles.locationDescription}>등록된 모든 제품을 확인합니다</Text>
              </View>
            </>
          ) : currentLocation && (
            <>
              <View style={styles.locationIconContainer}>
                <Ionicons name={currentLocation.icon || 'cube-outline'} size={24} color="#4CAF50" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.locationTitle}>{currentLocation.title}</Text>
                {currentLocation.description ? (
                  <Text style={styles.locationDescription}>{currentLocation.description}</Text>
                ) : null}
              </View>
            </>
          )}
        </View>
        
        {/* 영역 수정/삭제 버튼 (모든 제품 보기가 아닐 때만 표시) */}
        {!isAllProductsView && (
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={handleEditPress}
            >
              <Ionicons name="create-outline" size={24} color="#4CAF50" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={handleDeletePress}
            >
              <Ionicons name="trash-outline" size={24} color="#F44336" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* 슬롯 상태 표시 (모든 제품 보기가 아닐 때만 표시) */}
      {!isAllProductsView && (
        <SlotStatusBar 
          used={usedSlots} 
          total={totalSlots} 
          type="product" 
        />
      )}
      
      {/* 탭 메뉴 (모든 제품 보기가 아닐 때만 표시) */}
      {!isAllProductsView && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'products' && styles.activeTab]}
            onPress={() => handleTabChange('products')}
          >
            <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
              제품 목록
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
            onPress={() => handleTabChange('notifications')}
          >
            <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
              알림 설정
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* 탭 내용 */}
      {isAllProductsView || activeTab === 'products' ? renderProductsTab() : renderNotificationsTab()}
      
      {/* 삭제 확인 모달 */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>영역 삭제</Text>
            <Text style={styles.modalMessage}>
              이 영역을 삭제하시겠습니까? 영역 내의 모든 제품 정보도 함께 삭제됩니다.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleDeleteConfirm}
              >
                <Text style={styles.confirmButtonText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  locationIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  locationDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeTab: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
  },
  productsContainer: {
    flex: 1,
    position: 'relative',
  },
  notificationsContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  productsList: {
    padding: 16,
    paddingBottom: 80, // 하단 버튼을 위한 여백
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#9E9E9E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  confirmButton: {
    backgroundColor: '#F44336',
  },
  cancelButtonText: {
    color: '#333',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default LocationDetailScreen; 