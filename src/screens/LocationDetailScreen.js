import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  Platform
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchLocationById, fetchProductsByLocation, deleteLocation, updateLocation } from '../redux/slices/locationsSlice';
import ProductCard from '../components/ProductCard';
import AlertModal from '../components/AlertModal';
import SignupPromptModal from '../components/SignupPromptModal';

const LocationDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { locationId } = route.params;
  const isAllProducts = locationId === 'all';
  
  const { 
    currentLocation, 
    locationProducts, 
    status, 
    error 
  } = useSelector(state => state.locations);
  
  const { products: allProducts } = useSelector(state => state.products);
  const [products, setProducts] = useState([]);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: '',
    iconColor: ''
  });
  
  // 회원 상태 확인
  const { isAnonymous } = useSelector(state => state.auth);
  
  // 회원가입 유도 모달
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={{ marginLeft: 16 }}
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'LocationsScreen' }],
            });
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!isAllProducts) {
        dispatch(fetchLocationById(locationId));
      }
      dispatch(fetchProductsByLocation(locationId));
    }, [dispatch, locationId, isAllProducts])
  );

  useEffect(() => {
    if (locationProducts && locationProducts[locationId]) {
      setProducts(locationProducts[locationId]);
    }
  }, [locationProducts, locationId]);

  const handleAddProduct = () => {
    // 비회원인 경우 제품 개수 제한 체크
    if (isAnonymous && products.length >= 5) {
      setShowSignupPrompt(true);
      return;
    }
    
    navigation.navigate('AddProduct', { locationId });
  };

  const handleProductPress = (productId) => {
    navigation.navigate('ProductDetail', { productId });
  };
  
  const handleEditLocation = () => {
    if (isAllProducts) return;
    
    navigation.navigate('AddLocation', { 
      isEditing: true, 
      location: currentLocation 
    });
  };
  
  const handleDeleteLocation = () => {
    if (isAllProducts) return;
    
    if (products && products.length > 0) {
      setShowDeleteModal(true);
    } else {
      confirmDeleteLocation();
    }
  };
  
  const confirmDeleteLocation = () => {
    setAlertModalConfig({
      title: '영역 삭제',
      message: '이 영역을 삭제하시겠습니까?',
      buttons: [
        { 
          text: '취소', 
          style: 'cancel', 
          onPress: () => setShowDeleteModal(false) 
        },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: () => {
            setShowDeleteModal(false);
            dispatch(deleteLocation(locationId))
              .unwrap()
              .then(() => {
                navigation.goBack();
              })
              .catch((err) => {
                showErrorAlert(`영역 삭제 중 오류가 발생했습니다: ${err.message}`);
              });
          }
        }
      ],
      icon: 'trash-outline',
      iconColor: '#F44336'
    });
    setAlertModalVisible(true);
  };

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

  const renderItem = ({ item }) => (
    <ProductCard 
      product={item} 
      onPress={() => handleProductPress(item.id)}
    />
  );
  
  const DeleteConfirmModal = () => (
    <Modal
      visible={showDeleteModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowDeleteModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.warningIconContainer}>
            <Ionicons name="warning" size={60} color="#FF9800" />
          </View>
          
          <Text style={styles.warningTitle}>주의!</Text>
          
          <Text style={styles.warningMessage}>
            이 영역에는 {products.length}개의 제품이 등록되어 있습니다.
            영역을 삭제하면 모든 제품 데이터가 함께 삭제됩니다.
          </Text>
          
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowDeleteModal(false)}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.deleteButton]}
              onPress={confirmDeleteLocation}
            >
              <Text style={styles.deleteButtonText}>삭제</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (status === 'loading' && !products.length) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>오류: {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            if (!isAllProducts) {
              dispatch(fetchLocationById(locationId));
            }
            dispatch(fetchProductsByLocation(locationId));
          }}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const title = isAllProducts ? '모든 제품' : currentLocation?.title || '영역 상세';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
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
              비회원은 영역당 최대 5개의 제품만 등록할 수 있습니다. ({products.length}/5)
            </Text>
          </View>
        )}
      </View>
      
      <FlatList
        data={products}
        renderItem={renderItem}
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
      
      <TouchableOpacity 
        style={[
          styles.addButton,
          // 비회원이고 제품이 5개 이상이면 버튼 비활성화 스타일 적용
          isAnonymous && products.length >= 5 && styles.disabledAddButton
        ]}
        onPress={handleAddProduct}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
      
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
  warningIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800',
    textAlign: 'center',
    marginBottom: 8,
  },
  warningMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButtonContainer: {
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
});

export default LocationDetailScreen; 