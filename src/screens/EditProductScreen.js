import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  FlatList
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { updateProductAsync, fetchProductById } from '../redux/slices/productsSlice';
import { fetchLocations } from '../redux/slices/locationsSlice';
import { fetchCategories } from '../redux/slices/categoriesSlice';
import CategoryAddModal from '../components/CategoryAddModal';
import CategorySelector from '../components/CategorySelector';
import LocationSelector from '../components/LocationSelector';

// 조건부 DateTimePicker 임포트
let DateTimePicker;
if (Platform.OS !== 'web') {
  // 네이티브 환경에서만 임포트
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

const EditProductScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  
  // 라우트 파라미터에서 제품 ID 가져오기
  const { productId } = route.params || {};
  
  // Redux 상태
  const { categories, status: categoriesStatus } = useSelector(state => state.categories);
  const { locations, status: locationsStatus } = useSelector(state => state.locations);
  const { currentProduct, status: productsStatus } = useSelector(state => state.products);
  
  // 폼 상태
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [expiryDate, setExpiryDate] = useState(null);
  const [estimatedEndDate, setEstimatedEndDate] = useState(null);
  const [memo, setMemo] = useState('');
  
  // 날짜 선택기 상태
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [showEstimatedEndDatePicker, setShowEstimatedEndDatePicker] = useState(false);
  const [showWebDateModal, setShowWebDateModal] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempDateString, setTempDateString] = useState('');
  const [currentDateType, setCurrentDateType] = useState('');
  
  // 수정 성공 모달
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [updatedProduct, setUpdatedProduct] = useState(null);
  
  // 카테고리 추가 관련 상태
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // 카테고리 스크롤뷰 참조 추가
  const categoryScrollViewRef = useRef(null);

  // 카테고리 스크롤 위치 상태 추가
  const [categoryScrollPosition, setCategoryScrollPosition] = useState(0);
  const categoryListRef = useRef(null);

  // 카테고리 추가 모달 열기
  const handleOpenCategoryModal = () => {
    setShowCategoryModal(true);
  };

  // 카테고리 추가 처리
  const handleAddCategory = (newCategory) => {
    // 새 카테고리 선택
    setSelectedCategory(newCategory);
    setShowCategoryModal(false);
    
    // 카테고리 선택 후 스크롤 위치 조정
    // 스크롤 위치 유지 코드는 제거하고 새로운 카테고리가 보이도록 조정
    if (categoryListRef && categoryListRef.current) {
      // 약간의 지연 후 새 카테고리가 추가된 위치로 스크롤
      setTimeout(() => {
        // categories 배열의 마지막 인덱스로 스크롤
        categoryListRef.current.scrollToEnd({ animated: true });
      }, 300);
    }
    
    // 성공 메시지 표시
    Alert.alert('알림', '새 카테고리가 추가되었습니다.');
  };
  
  // 제품 데이터 로드
  useEffect(() => {
    dispatch(fetchProductById(productId));
  }, [dispatch, productId]);
  
  // 영역 데이터 로드
  useEffect(() => {
    if (locationsStatus === 'idle') {
      dispatch(fetchLocations());
    }
  }, [dispatch, locationsStatus]);
  
  // 카테고리 데이터 로드
  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);
  
  // 제품 데이터가 로드되면 폼에 채우기
  useEffect(() => {
    if (currentProduct) {
      setProductName(currentProduct.name || '');
      setBrand(currentProduct.brand || '');
      setMemo(currentProduct.memo || '');
      
      // 날짜 설정
      if (currentProduct.purchaseDate) {
        setPurchaseDate(new Date(currentProduct.purchaseDate));
      }
      
      if (currentProduct.expiryDate) {
        setExpiryDate(new Date(currentProduct.expiryDate));
      }
      
      if (currentProduct.estimatedEndDate) {
        setEstimatedEndDate(new Date(currentProduct.estimatedEndDate));
      }
      
      // 카테고리 설정
      if (currentProduct.categoryId && categories.length > 0) {
        const category = categories.find(cat => cat.id === currentProduct.categoryId);
        if (category) {
          setSelectedCategory(category);
        }
      }
      
      // 영역 설정
      if (currentProduct.locationId && locations.length > 0) {
        const location = locations.find(loc => loc.id === currentProduct.locationId);
        if (location) {
          setSelectedLocation(location);
        }
      }
    }
  }, [currentProduct, categories, locations]);

  // 폼 유효성 검사
  const isFormValid = () => {
    if (!productName.trim()) {
      Alert.alert('알림', '제품명을 입력해주세요.');
      return false;
    }
    
    if (!purchaseDate) {
      Alert.alert('알림', '구매일을 선택해주세요.');
      return false;
    }
    
    if (!selectedLocation) {
      Alert.alert('알림', '영역을 선택해주세요.');
      return false;
    }
    
    return true;
  };

  // 제품 수정 처리
  const handleSubmit = () => {
    if (!isFormValid()) return;
    
    const updatedProductData = {
      id: productId,
      name: productName,
      brand: brand,
      categoryId: selectedCategory ? selectedCategory.id : null,
      category: selectedCategory,
      locationId: selectedLocation.id,
      purchaseDate: purchaseDate.toISOString(),
      expiryDate: expiryDate ? expiryDate.toISOString() : null,
      estimatedEndDate: estimatedEndDate ? estimatedEndDate.toISOString() : null,
      memo,
      updatedAt: new Date().toISOString(),
      // 기존 데이터 유지
      image: currentProduct.image,
      remainingPercentage: currentProduct.remainingPercentage,
      createdAt: currentProduct.createdAt || currentProduct.purchaseDate,
    };
    
    dispatch(updateProductAsync(updatedProductData))
      .unwrap()
      .then((result) => {
        // 수정된 제품 정보 저장 및 성공 모달 표시
        setUpdatedProduct(result);
        setShowSuccessModal(true);
      })
      .catch((error) => {
        Alert.alert('오류', `제품 수정에 실패했습니다: ${error.message}`);
      });
  };
  
  // 성공 모달 닫기 및 화면 이동
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  // 날짜 선택 핸들러 (네이티브)
  const handleDateChange = (event, selectedDate, dateType) => {
    if (Platform.OS === 'android') {
      setShowPurchaseDatePicker(false);
      setShowExpiryDatePicker(false);
      setShowEstimatedEndDatePicker(false);
    }
    
    if (selectedDate) {
      if (dateType === 'purchase') {
        setPurchaseDate(selectedDate);
      } else if (dateType === 'expiry') {
        setExpiryDate(selectedDate);
      } else if (dateType === 'estimated') {
        setEstimatedEndDate(selectedDate);
      }
    }
  };
  
  // 웹용 날짜 선택 핸들러
  const handleWebDateSelect = (dateType) => {
    setCurrentDateType(dateType);
    
    let initialDate;
    if (dateType === 'purchase') {
      initialDate = purchaseDate || new Date();
    } else if (dateType === 'expiry') {
      initialDate = expiryDate || new Date();
    } else if (dateType === 'estimated') {
      initialDate = estimatedEndDate || new Date();
    }
    
    setTempDate(initialDate);
    setTempDateString(formatDateForInput(initialDate));
    setShowWebDateModal(true);
  };
  
  // 웹용 날짜 입력 확인
  const handleConfirmWebDate = () => {
    let date;
    try {
      // 입력된 문자열에서 날짜 객체 생성
      date = new Date(tempDateString);
      
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      
      if (currentDateType === 'purchase') {
        setPurchaseDate(date);
      } else if (currentDateType === 'expiry') {
        setExpiryDate(date);
      } else if (currentDateType === 'estimated') {
        setEstimatedEndDate(date);
      }
      
      setShowWebDateModal(false);
    } catch (error) {
      Alert.alert('오류', '유효한 날짜 형식이 아닙니다. (YYYY-MM-DD)');
    }
  };
  
  // 날짜 포맷 함수
  const formatDate = (date) => {
    if (!date) return '날짜 선택';
    
    return date.toLocaleDateString();
  };
  
  // 입력용 날짜 포맷 함수 (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  // 카테고리 선택 처리 함수 - 스크롤 위치 유지
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    // 스크롤 위치는 변경하지 않음 (기존 위치 유지)
  };

  // 카테고리 선택 컴포넌트 제거 (외부 컴포넌트로 대체)

  // 영역 추가 화면으로 이동
  const handleAddLocation = () => {
    navigation.navigate('AddLocation');
  };

  // 영역 선택 컴포넌트 제거 (외부 컴포넌트로 대체)
  
  // 웹용 날짜 선택 모달
  const WebDatePickerModal = () => (
    <Modal
      visible={showWebDateModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowWebDateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {currentDateType === 'purchase' ? '구매일 선택' : 
             currentDateType === 'expiry' ? '유통기한 선택' : '소진 예상일 선택'}
          </Text>
          
          <TextInput
            style={styles.dateInput}
            value={tempDateString}
            onChangeText={setTempDateString}
            placeholder="YYYY-MM-DD"
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={() => setShowWebDateModal(false)}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.confirmButton]} 
              onPress={handleConfirmWebDate}
            >
              <Text style={styles.confirmButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // 수정 성공 모달
  const SuccessModal = () => (
    <Modal
      visible={showSuccessModal}
      transparent={true}
      animationType="fade"
      onRequestClose={handleSuccessModalClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
          </View>
          
          <Text style={styles.successTitle}>수정 완료!</Text>
          
          <Text style={styles.successMessage}>
            {updatedProduct?.name} 제품이 성공적으로 수정되었습니다.
          </Text>
          
          <View style={styles.productInfoContainer}>
            <View style={styles.productInfoRow}>
              <Text style={styles.productInfoLabel}>영역:</Text>
              <Text style={styles.productInfoValue}>
                {locations.find(l => l.id === updatedProduct?.locationId)?.title || ''}
              </Text>
            </View>
            
            {updatedProduct?.brand && (
              <View style={styles.productInfoRow}>
                <Text style={styles.productInfoLabel}>브랜드:</Text>
                <Text style={styles.productInfoValue}>{updatedProduct.brand}</Text>
              </View>
            )}
            
            <View style={styles.productInfoRow}>
              <Text style={styles.productInfoLabel}>구매일:</Text>
              <Text style={styles.productInfoValue}>
                {updatedProduct ? new Date(updatedProduct.purchaseDate).toLocaleDateString() : ''}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.successButton}
            onPress={handleSuccessModalClose}
          >
            <Text style={styles.successButtonText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  // 카테고리 추가 모달
  const CategoryModal = () => (
    <CategoryAddModal
      visible={showCategoryModal}
      onClose={() => setShowCategoryModal(false)}
      onCategoryAdded={handleAddCategory}
    />
  );
  
  // 로딩 중이면 로딩 화면 표시
  if (productsStatus === 'loading' && !currentProduct) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>제품 수정</Text>
        
        {/* 제품명 입력 */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>제품명</Text>
            <Text style={styles.requiredMark}>*</Text>
          </View>
          <TextInput
            style={styles.input}
            value={productName}
            onChangeText={setProductName}
            placeholder="제품명을 입력하세요"
          />
        </View>
        
        {/* 브랜드 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>브랜드 (선택)</Text>
          <TextInput
            style={styles.input}
            value={brand}
            onChangeText={setBrand}
            placeholder="브랜드명을 입력하세요"
          />
        </View>
        
        {/* 카테고리 선택 */}
        <CategorySelector 
          ref={categoryListRef}
          categories={categories} 
          selectedCategory={selectedCategory} 
          onSelectCategory={setSelectedCategory} 
          onAddCategory={handleOpenCategoryModal}
          status={categoriesStatus}
        />
        
        {/* 영역 선택 */}
        <LocationSelector
          locations={locations}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          onAddLocation={handleAddLocation}
          status={locationsStatus}
          isRequired={true}
        />
        
        {/* 구매일 선택 */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>구매일</Text>
            <Text style={styles.requiredMark}>*</Text>
          </View>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => {
              if (Platform.OS === 'web') {
                handleWebDateSelect('purchase');
              } else {
                setShowPurchaseDatePicker(true);
              }
            }}
          >
            <Text style={styles.dateText}>
              {formatDate(purchaseDate)}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>
          {Platform.OS !== 'web' && showPurchaseDatePicker && (
            <DateTimePicker
              value={purchaseDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => handleDateChange(event, date, 'purchase')}
            />
          )}
        </View>
        
        {/* 유통기한 선택 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>유통기한 (선택)</Text>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => {
              if (Platform.OS === 'web') {
                handleWebDateSelect('expiry');
              } else {
                setShowExpiryDatePicker(true);
              }
            }}
          >
            <Text style={styles.dateText}>
              {expiryDate ? formatDate(expiryDate) : '날짜 선택'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>
          {Platform.OS !== 'web' && showExpiryDatePicker && (
            <DateTimePicker
              value={expiryDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => handleDateChange(event, date, 'expiry')}
            />
          )}
        </View>
        
        {/* 소진 예상일 선택 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>소진 예상일 (선택)</Text>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => {
              if (Platform.OS === 'web') {
                handleWebDateSelect('estimated');
              } else {
                setShowEstimatedEndDatePicker(true);
              }
            }}
          >
            <Text style={styles.dateText}>
              {estimatedEndDate ? formatDate(estimatedEndDate) : '날짜 선택'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>
          {Platform.OS !== 'web' && showEstimatedEndDatePicker && (
            <DateTimePicker
              value={estimatedEndDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => handleDateChange(event, date, 'estimated')}
            />
          )}
        </View>
        
        {/* 메모 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>메모 (선택)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={memo}
            onChangeText={setMemo}
            placeholder="추가 정보 입력"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
        
        {/* 수정 버튼 */}
        <TouchableOpacity 
          style={[
            styles.submitButton,
            productsStatus === 'loading' && styles.disabledButton
          ]} 
          onPress={handleSubmit}
          disabled={productsStatus === 'loading'}
        >
          {productsStatus === 'loading' ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={[styles.submitButtonText, styles.loadingText]}>수정 중...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>제품 수정</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      
      {/* 웹용 날짜 선택 모달 */}
      {Platform.OS === 'web' && <WebDatePickerModal />}
      
      {/* 수정 성공 모달 */}
      <SuccessModal />

      {/* 카테고리 추가 모달 */}
      <CategoryModal />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  requiredMark: {
    color: 'red',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 100,
  },
  dateInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoryFlatList: {
    minHeight: 80,
    flexGrow: 0,
  },
  categoryListContainer: {
    height: 70,  // FlatList의 높이 증가
  },
  sectionTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 10,
  },
  categoriesList: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  categoryChip: {
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCategoryChip: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    elevation: 3,
    shadowOpacity: 0.2,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  selectedCategoryChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  locationChip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedLocationChip: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  locationChipIcon: {
    marginRight: 4,
  },
  locationChipText: {
    fontSize: 14,
    color: '#333',
  },
  selectedLocationChipText: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#757575',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  addCategoryChip: {
    backgroundColor: '#f0f9f0',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  addCategoryIcon: {
    marginRight: 6,
  },
  addCategoryText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  modalInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputError: {
    borderColor: '#FF6B6B',
    borderWidth: 1,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
  },
  emptyCategories: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  addCategoryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  addCategoryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditProductScreen; 