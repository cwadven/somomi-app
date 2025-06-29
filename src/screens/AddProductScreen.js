import React, { useState, useEffect } from 'react';
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
  ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addProductAsync } from '../redux/slices/productsSlice';
import { fetchLocations } from '../redux/slices/locationsSlice';

// 조건부 DateTimePicker 임포트
let DateTimePicker;
if (Platform.OS !== 'web') {
  // 네이티브 환경에서만 임포트
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

const AddProductScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const { locationId } = route.params || {};
  
  const { categories } = useSelector(state => state.categories);
  const { locations, status: locationsStatus } = useSelector(state => state.locations);
  const { status: productsStatus } = useSelector(state => state.products);
  
  // 폼 상태
  const [productName, setProductName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [expiryDate, setExpiryDate] = useState(null);
  const [estimatedEndDate, setEstimatedEndDate] = useState(null);
  const [purchaseMethod, setPurchaseMethod] = useState('');
  const [purchaseLink, setPurchaseLink] = useState('');
  const [price, setPrice] = useState('');
  const [memo, setMemo] = useState('');
  const [brand, setBrand] = useState('');
  
  // 날짜 선택기 표시 상태
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [showEstimatedEndDatePicker, setShowEstimatedEndDatePicker] = useState(false);
  
  // 웹용 날짜 입력 모달
  const [showWebDateModal, setShowWebDateModal] = useState(false);
  const [currentDateType, setCurrentDateType] = useState(null);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempDateString, setTempDateString] = useState('');
  
  // 등록 성공 모달
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredProduct, setRegisteredProduct] = useState(null);

  // 영역 데이터 로드
  useEffect(() => {
    if (locationsStatus === 'idle') {
      dispatch(fetchLocations());
    }
  }, [dispatch, locationsStatus]);

  // 초기 선택된 영역 설정
  useEffect(() => {
    if (locationId && locations.length > 0) {
      const location = locations.find(loc => loc.id === locationId);
      if (location) {
        setSelectedLocation(location);
      }
    }
  }, [locationId, locations]);

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

  // 제품 등록 처리
  const handleSubmit = () => {
    if (!isFormValid()) return;
    
    const newProduct = {
      name: productName,
      categoryId: selectedCategory ? selectedCategory.id : null,
      category: selectedCategory ? selectedCategory.name : '미분류',
      locationId: selectedLocation.id,
      purchaseDate: purchaseDate.toISOString(),
      expiryDate: expiryDate ? expiryDate.toISOString() : null,
      estimatedEndDate: estimatedEndDate ? estimatedEndDate.toISOString() : null,
      purchaseMethod,
      purchaseLink,
      price: price ? parseFloat(price) : null,
      memo,
      brand,
      createdAt: new Date().toISOString(),
    };
    
    dispatch(addProductAsync(newProduct))
      .unwrap()
      .then((result) => {
        // 등록된 제품 정보 저장 및 성공 모달 표시
        setRegisteredProduct(result);
        setShowSuccessModal(true);
      })
      .catch((error) => {
        Alert.alert('오류', `제품 등록에 실패했습니다: ${error.message}`);
      });
  };
  
  // 성공 모달 닫기 및 화면 이동
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    if (locationId) {
      navigation.navigate('LocationDetail', { locationId });
    } else {
      navigation.navigate('Locations');
    }
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

  // 카테고리 선택 컴포넌트
  const CategorySelector = () => (
    <View style={styles.categoriesContainer}>
      <Text style={styles.sectionTitle}>카테고리</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory?.id === category.id && styles.selectedCategoryChip
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory?.id === category.id && styles.selectedCategoryChipText
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // 영역 선택 컴포넌트
  const LocationSelector = () => (
    <View style={styles.categoriesContainer}>
      <Text style={styles.sectionTitle}>영역 *</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      >
        {locations.map(location => (
          <TouchableOpacity
            key={location.id}
            style={[
              styles.locationChip,
              selectedLocation?.id === location.id && styles.selectedLocationChip
            ]}
            onPress={() => setSelectedLocation(location)}
          >
            <Ionicons 
              name={location.icon || 'cube-outline'} 
              size={16} 
              color={selectedLocation?.id === location.id ? '#fff' : '#4CAF50'} 
              style={styles.locationChipIcon}
            />
            <Text
              style={[
                styles.locationChipText,
                selectedLocation?.id === location.id && styles.selectedLocationChipText
              ]}
            >
              {location.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
  
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
             currentDateType === 'expiry' ? '유통기한 선택' : '예상 소모 완료일 선택'}
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
  
  // 등록 성공 모달
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
          
          <Text style={styles.successTitle}>등록 완료!</Text>
          
          <Text style={styles.successMessage}>
            {registeredProduct?.name} 제품이 성공적으로 등록되었습니다.
          </Text>
          
          <View style={styles.productInfoContainer}>
            <View style={styles.productInfoRow}>
              <Text style={styles.productInfoLabel}>영역:</Text>
              <Text style={styles.productInfoValue}>
                {locations.find(l => l.id === registeredProduct?.locationId)?.title || ''}
              </Text>
            </View>
            
            {registeredProduct?.brand && (
              <View style={styles.productInfoRow}>
                <Text style={styles.productInfoLabel}>브랜드:</Text>
                <Text style={styles.productInfoValue}>{registeredProduct.brand}</Text>
              </View>
            )}
            
            <View style={styles.productInfoRow}>
              <Text style={styles.productInfoLabel}>구매일:</Text>
              <Text style={styles.productInfoValue}>
                {registeredProduct ? new Date(registeredProduct.purchaseDate).toLocaleDateString() : ''}
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

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>제품 등록</Text>
        
        {/* 제품명 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>제품명 *</Text>
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
        <CategorySelector />
        
        {/* 영역 선택 */}
        <LocationSelector />
        
        {/* 구매일 선택 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>구매일 *</Text>
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
        
        {/* 예상 소모 완료일 선택 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>예상 소모 완료일 (선택)</Text>
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
        
        {/* 구매 방법 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>구매 방법 (선택)</Text>
          <TextInput
            style={styles.input}
            value={purchaseMethod}
            onChangeText={setPurchaseMethod}
            placeholder="예: 오프라인 매장, 온라인 쇼핑몰 등"
          />
        </View>
        
        {/* 구매 링크 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>구매 링크 (선택)</Text>
          <TextInput
            style={styles.input}
            value={purchaseLink}
            onChangeText={setPurchaseLink}
            placeholder="구매한 온라인 스토어 링크"
            keyboardType="url"
          />
        </View>
        
        {/* 가격 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>가격 (선택)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="가격 입력"
            keyboardType="numeric"
          />
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
        
        {/* 등록 버튼 */}
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
              <Text style={[styles.submitButtonText, styles.loadingText]}>등록 중...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>제품 등록</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      
      {/* 웹용 날짜 선택 모달 */}
      {Platform.OS === 'web' && <WebDatePickerModal />}
      
      {/* 등록 성공 모달 */}
      <SuccessModal />
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
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
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
  sectionTitle: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  categoriesList: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  categoryChip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedCategoryChip: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#333',
  },
  selectedCategoryChipText: {
    color: '#fff',
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
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
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#333',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '500',
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

export default AddProductScreen; 