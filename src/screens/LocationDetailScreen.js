import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  Alert,
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
  
  const { locations, status: locationStatus } = useSelector(state => state.locations);
  const { products, status: productStatus } = useSelector(state => state.products);
  const { isAnonymous } = useSelector(state => state.auth);
  
  const currentLocation = locations.find(location => location.id === locationId);
  
  // 모든 제품 또는 특정 영역의 제품만 필터링
  const filteredProducts = isAllProducts 
    ? products.filter(product => !product.isConsumed)  // 모든 제품 (소진되지 않은)
    : products.filter(product => product.locationId === locationId && !product.isConsumed);  // 특정 영역 제품만
  
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
    // 비회원 제한 확인
    if (isAnonymous && filteredProducts.length >= 5) {
      setShowSignupPrompt(true);
      return;
    }
    
    navigation.navigate('AddProduct', { locationId });
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
  
  const renderItem = ({ item }) => {
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
  
  // 로딩 중이거나 데이터가 없는 경우
  if (locationStatus === 'loading' || (productStatus === 'loading' && !filteredProducts.length)) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }
  
  const title = isAllProducts ? '모든 제품' : currentLocation?.title || '영역 상세';

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
        
        {/* 비회원 사용자의 경우 제품 개수 표시 */}
        {isAnonymous && !isAllProducts && (
          <View style={styles.limitInfoContainer}>
            <Text style={styles.limitInfoText}>
              비회원은 영역당 최대 5개의 제품만 등록할 수 있습니다. ({filteredProducts.length}/5)
            </Text>
          </View>
        )}
        
        {/* 탭 메뉴 (제품 목록 / 알림 설정) */}
        {!isAllProducts && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'products' && styles.activeTabButton
              ]}
              onPress={() => setActiveTab('products')}
            >
              <Text style={[
                styles.tabButtonText,
                activeTab === 'products' && styles.activeTabButtonText
              ]}>
                제품 목록
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'notifications' && styles.activeTabButton
              ]}
              onPress={() => setActiveTab('notifications')}
            >
              <Text style={[
                styles.tabButtonText,
                activeTab === 'notifications' && styles.activeTabButtonText
              ]}>
                알림 설정
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {activeTab === 'products' ? (
        <>
          <FlatList
            data={filteredProducts}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>등록된 제품이 없습니다.</Text>
                <Text style={styles.emptySubText}>
                  {!isAllProducts ? '오른쪽 하단의 + 버튼을 눌러 제품을 추가하세요.' : '특정 영역에서 제품을 추가할 수 있습니다.'}
                </Text>
              </View>
            }
          />
          
          {!isAllProducts && (
            <TouchableOpacity 
              style={[
                styles.addButton,
                // 비회원이고 제품이 5개 이상이면 버튼 비활성화 스타일 적용
                isAnonymous && filteredProducts.length >= 5 && styles.disabledAddButton
              ]}
              onPress={handleAddProduct}
            >
              <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
          )}
        </>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          <LocationNotificationSettings 
            locationId={locationId}
            location={currentLocation}
          />
        </ScrollView>
      )}
      
      <DeleteConfirmModal />
      
      <AlertModal
        visible={alertModalVisible}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        buttons={alertModalConfig.buttons}
        onClose={() => setAlertModalVisible(false)}
        icon={alertModalConfig.icon}
        iconColor={alertModalConfig.iconColor}
      />
      
      {/* 회원가입 유도 모달 */}
      <SignupPromptModal 
        visible={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
        message="비회원은 영역당 최대 5개의 제품만 등록할 수 있습니다. 회원가입하여 무제한으로 제품을 등록하세요!"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  locationIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  centered: {
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
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
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
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
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
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  limitInfoContainer: {
    backgroundColor: '#FFF9C4',
    padding: 8,
    marginTop: 8,
    borderRadius: 4,
  },
  limitInfoText: {
    fontSize: 12,
    color: '#FF8F00',
    textAlign: 'center',
  },
  disabledAddButton: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabButtonText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  notificationsContainer: {
    padding: 16,
  },
  scrollContainer: {
    flex: 1,
  },
});

export default LocationDetailScreen; 