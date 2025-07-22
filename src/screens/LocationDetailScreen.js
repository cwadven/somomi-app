import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  Modal,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { fetchProducts, deleteProductAsync } from '../redux/slices/productsSlice';
import { deleteLocation, fetchLocationById } from '../redux/slices/locationsSlice';
import LocationNotificationSettings from '../components/LocationNotificationSettings';
import AlertModal from '../components/AlertModal';
import SignupPromptModal from '../components/SignupPromptModal';
import ProductCard from '../components/ProductCard';
import { checkAnonymousLimits } from '../utils/authUtils';
import SlotStatusBar from '../components/SlotStatusBar';

const LocationDetailScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  
  const { locationId } = route.params || {};
  const isAllProducts = locationId === 'all';
  
  const [activeTab, setActiveTab] = useState('products');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: '',
    iconColor: '',
  });
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [slotAlertModalVisible, setSlotAlertModalVisible] = useState(false); // 슬롯 부족 알림 모달 상태 추가
  
  // 슬롯 상세 정보 모달 상태
  const [slotDetailModalVisible, setSlotDetailModalVisible] = useState(false);
  
  const { locations, status: locationStatus } = useSelector(state => state.locations);
  const { products, status: productStatus } = useSelector(state => state.products);
  const { isAnonymous, slots } = useSelector(state => state.auth);
  
  const currentLocation = locations.find(location => location.id === locationId);
  
  // 모든 제품 또는 특정 영역의 제품만 필터링 (메모이제이션 적용)
  const filteredProducts = useMemo(() => {
    return isAllProducts 
    ? products.filter(product => !product.isConsumed)  // 모든 제품 (소진되지 않은)
    : products.filter(product => product.locationId === locationId && !product.isConsumed);  // 특정 영역 제품만
  }, [products, locationId, isAllProducts]);
  
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchProducts());
      if (!isAllProducts && locationId) {
        dispatch(fetchLocationById(locationId));
      }
    }, [dispatch, locationId, isAllProducts])
  );

  // 영역 목록으로 돌아가기
  const handleBackToLocations = () => {
    navigation.navigate('LocationsScreen');
  };
  
  const handleAddProduct = () => {
    // Redux에서 제품 슬롯 정보 가져오기
    const totalProductSlots = slots.productSlots.baseSlots + slots.productSlots.additionalSlots;
    const usedProductSlots = filteredProducts.length;
    const hasAvailableSlots = usedProductSlots < totalProductSlots;
    
    // 슬롯이 없으면 구독/구매 유도
    if (!hasAvailableSlots) {
      // 비회원인 경우 회원가입 유도
      if (isAnonymous) {
      setShowSignupPrompt(true);
        return;
      }
      
      // 회원인 경우 구독/구매 유도 (Alert.alert 대신 AlertModal 사용)
      setAlertModalConfig({
        title: '슬롯 부족',
        message: '제품 슬롯이 부족합니다. 구독하거나 추가 슬롯을 구매하세요.',
        buttons: [
          { text: '취소', style: 'cancel' },
          { 
            text: '상점으로 이동', 
            onPress: () => navigation.navigate('Store')
          }
        ],
        icon: 'alert-circle',
        iconColor: '#FF9800',
      });
      setAlertModalVisible(true);
      return;
    }
    
            navigation.navigate('ProductForm', { mode: 'add', locationId });
  };
  
  const handleProductPress = (productId) => {
    navigation.navigate('ProductDetail', { productId });
  };
  
  const handleEditLocation = () => {
    if (currentLocation) {
      navigation.navigate('AddLocation', { 
        isEditing: true, 
        location: currentLocation 
      });
    }
  };
  
  const handleDeleteLocation = () => {
    if (filteredProducts.length > 0) {
      showErrorAlert(
        '이 영역에 제품이 있어 삭제할 수 없습니다. 먼저 제품을 다른 영역으로 이동하거나 삭제해주세요.'
      );
    } else {
      setDeleteConfirmVisible(true);
    }
  };
  
  const deleteLocationAndNavigate = () => {
    setDeleteConfirmVisible(false);
    
    if (locationId) {
      dispatch(deleteLocation(locationId))
        .unwrap()
        .then(() => {
          navigation.goBack();
        })
        .catch((error) => {
          showErrorAlert(`영역 삭제 중 오류가 발생했습니다: ${error}`);
        });
    }
  };
  
  const showErrorAlert = (message) => {
    setAlertModalConfig({
      title: '오류',
      message,
      buttons: [{ text: '확인', onPress: () => setAlertModalVisible(false) }],
      icon: 'alert-circle',
      iconColor: '#F44336',
    });
    setAlertModalVisible(true);
  };
  
  // 제품 카드 렌더링
  const renderProductCard = ({ item }) => {
    // 모든 제품 화면에서는 영역 이름을 표시
    const locationItem = isAllProducts ? 
      locations.find(loc => loc.id === item.locationId) : null;
    const locationName = locationItem ? locationItem.title : '미지정 영역';
    
    return (
      <ProductCard 
        product={item} 
        onPress={() => handleProductPress(item.id)}
        locationName={locationName}
        showLocation={isAllProducts} // 모든 제품 화면에서만 영역 표시
      />
    );
  };
  
  // Redux의 슬롯 정보를 사용하여 사용 가능한 슬롯 계산
  const totalProductSlots = slots.productSlots.baseSlots + slots.productSlots.additionalSlots;
  const usedProductSlots = !isAllProducts ? filteredProducts.length : 0;
  const availableSlots = !isAllProducts ? Math.max(0, totalProductSlots - usedProductSlots) : 0;
  
  // 삭제 확인 모달
  const DeleteConfirmModal = () => (
    <Modal
      visible={deleteConfirmVisible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>영역 삭제</Text>
          <Text style={styles.modalMessage}>
            정말 이 영역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setDeleteConfirmVisible(false)}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.deleteButton]}
              onPress={deleteLocationAndNavigate}
            >
              <Text style={styles.deleteButtonText}>삭제</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // 슬롯 상세 정보 모달
  const SlotDetailModal = () => (
    <Modal
      visible={slotDetailModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setSlotDetailModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>슬롯 상세 정보</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSlotDetailModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.slotDetailContainer}>
            <View style={styles.slotDetailItem}>
              <Text style={styles.slotDetailLabel}>사용 중인 슬롯:</Text>
              <Text style={styles.slotDetailValue}>{usedProductSlots}개</Text>
            </View>
            
            <View style={styles.slotDetailItem}>
              <Text style={styles.slotDetailLabel}>기본 제공 슬롯:</Text>
              <Text style={styles.slotDetailValue}>{slots.productSlots.baseSlots}개</Text>
            </View>
            
            <View style={styles.slotDetailItem}>
              <Text style={styles.slotDetailLabel}>추가 슬롯:</Text>
              <Text style={styles.slotDetailValue}>{slots.productSlots.additionalSlots}개</Text>
            </View>
            
            <View style={[styles.slotDetailItem, styles.slotDetailTotal]}>
              <Text style={styles.slotDetailTotalLabel}>총 사용 가능 슬롯:</Text>
              <Text style={styles.slotDetailTotalValue}>{totalProductSlots}개</Text>
            </View>
          </View>
          
          <View style={styles.slotDetailDescription}>
            <Text style={styles.slotDetailDescriptionText}>
              {isAnonymous ? 
                `이 영역에는 기본 ${slots.productSlots.baseSlots}개의 슬롯이 제공됩니다. 회원가입하면 아이템을 통해 더 많은 슬롯을 추가할 수 있습니다.` :
                `이 영역에는 기본 ${slots.productSlots.baseSlots}개의 슬롯이 제공됩니다. 아이템을 구매하여 더 많은 슬롯을 추가할 수 있습니다.`
              }
            </Text>
          </View>
          
          {isAnonymous && (
            <TouchableOpacity 
              style={styles.signupButton}
              onPress={() => {
                setSlotDetailModalVisible(false);
                setShowSignupPrompt(true);
              }}
            >
              <Text style={styles.signupButtonText}>회원가입하기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
  
  // 로딩 상태 변수
  const isLoading = locationStatus === 'loading' || (productStatus === 'loading' && !filteredProducts.length);
  
  // 로딩 컴포넌트 메모이제이션
  const loadingComponent = useMemo(() => {
    if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
    }
    return null;
  }, [isLoading]);
  
  // 로딩 중인 경우
  if (isLoading) {
    return loadingComponent;
  }
  
  const title = isAllProducts ? '모든 제품' : currentLocation?.title || '영역 상세';

  // 제품 슬롯 그리드 렌더링
  const renderProductSlots = () => {
    if (isAllProducts) {
      // 모든 제품 화면에서는 일반 리스트로 표시
      return (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>등록된 제품이 없습니다.</Text>
              <Text style={styles.emptySubText}>
                특정 영역에서 제품을 추가할 수 있습니다.
              </Text>
            </View>
          }
        />
      );
    }
    
    // 특정 영역 화면에서는 제품 목록만 표시
    return (
      <View style={styles.content}>
        {/* 등록된 제품 목록 */}
        <FlatList
          data={filteredProducts}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>등록된 제품이 없습니다.</Text>
              <Text style={styles.emptySubText}>
                오른쪽 하단의 + 버튼을 눌러 제품을 추가하세요.
              </Text>
            </View>
          }
        />
        
        {/* 제품 추가 버튼 (슬롯 개수 표시) */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddProduct}
        >
          <Ionicons name="add" size={30} color="white" />
          {availableSlots > 0 && (
            <View style={styles.slotCountBadge}>
              <Text style={styles.slotCountText}>{availableSlots}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToLocations}
          >
            <Ionicons name="arrow-back" size={24} color="#4CAF50" />
          </TouchableOpacity>
          
          {!isAllProducts && currentLocation && (
            <View style={styles.locationIconContainer}>
              <Ionicons 
                name={currentLocation.icon || 'cube-outline'} 
                size={30} 
                color="#4CAF50" 
              />
            </View>
          )}
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{title}</Text>
            {!isAllProducts && currentLocation && (
              <Text style={styles.description}>{currentLocation.description}</Text>
            )}
          </View>
          
          {!isAllProducts && (
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.headerActionButton}
                onPress={handleEditLocation}
              >
                <Ionicons name="create-outline" size={24} color="#4CAF50" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerActionButton}
                onPress={handleDeleteLocation}
              >
                <Ionicons name="trash-outline" size={24} color="#F44336" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* 슬롯 상태 표시 (특정 영역 화면에서만) */}
        {!isAllProducts && (
          <SlotStatusBar 
            used={usedProductSlots} 
            total={totalProductSlots} 
            type="product" 
            onDetailPress={() => setSlotDetailModalVisible(true)}
          />
        )}
        
          <View style={styles.tabContainer}>
            <TouchableOpacity
            style={[styles.tab, activeTab === 'products' && styles.activeTab]}
              onPress={() => setActiveTab('products')}
            >
            <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
                제품 목록
              </Text>
            </TouchableOpacity>
          {!isAllProducts && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
              onPress={() => setActiveTab('notifications')}
            >
              <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
                알림 설정
              </Text>
            </TouchableOpacity>
          )}
          </View>
      </View>
      
      <View style={styles.content}>
      {activeTab === 'products' ? (
          renderProductSlots()
        ) : (
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContentContainer}
            >
            {currentLocation && (
              <LocationNotificationSettings locationId={locationId} />
            )}
        </ScrollView>
      )}
      </View>
      
      <AlertModal
        visible={alertModalVisible}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        buttons={alertModalConfig.buttons}
        icon={alertModalConfig.icon}
        iconColor={alertModalConfig.iconColor}
        onClose={() => setAlertModalVisible(false)}
      />
      
      <DeleteConfirmModal />
      
      <SlotDetailModal />
      
      <SignupPromptModal 
        visible={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
        message="회원 가입하여 더 많은 제품을 등록하세요."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 12,
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  slotDetailContainer: {
    marginBottom: 15,
  },
  slotDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  slotDetailLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  slotDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  slotDetailSubItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 20,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  slotDetailSubLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  slotDetailSubValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  slotDetailTotal: {
    borderBottomWidth: 0,
    marginTop: 10,
  },
  slotDetailTotalLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  slotDetailTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  slotDetailDescription: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  slotDetailDescriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  signupButton: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  cancelButtonText: {
    color: '#333',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
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
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  slotCountBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#F44336',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  slotCountText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LocationDetailScreen; 