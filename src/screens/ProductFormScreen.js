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
import { addProductAsync, updateProductAsync, fetchProducts, fetchProductById } from '../redux/slices/productsSlice';
import { fetchLocations } from '../redux/slices/locationsSlice';
import { fetchCategories } from '../redux/slices/categoriesSlice';
import { addNotification } from '../redux/slices/notificationsSlice';
import CategoryAddModal from '../components/CategoryAddModal';
import CategorySelector from '../components/CategorySelector';
import LocationSelector from '../components/LocationSelector';
import SignupPromptModal from '../components/SignupPromptModal';

// 조건부 DateTimePicker 임포트
let DateTimePicker;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (error) {
    console.error('DateTimePicker 임포트 실패:', error);
  }
}

const ProductFormScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  
  // 라우트 파라미터에서 모드와 관련 정보 가져오기
  const { mode = 'add', productId, locationId } = route.params || {};
  const isEditMode = mode === 'edit';
  
  // Redux 상태
  const { categories, status: categoriesStatus } = useSelector(state => state.categories);
  const { locations, status: locationsStatus } = useSelector(state => state.locations);
  const { allProducts, currentProduct, status: productsStatus } = useSelector(state => state.products);
  const { isAuthenticated } = useSelector(state => state.auth);
  
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
  
  // 모달 상태
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [createdProduct, setCreatedProduct] = useState(null);
  
  // 추가 모드 전용 상태
  const [currentLocationProducts, setCurrentLocationProducts] = useState([]);
  
  // 스크롤 뷰 참조
  const scrollViewRef = useRef(null);
  const productNameInputRef = useRef(null);
  const purchaseDateSectionRef = useRef(null);
  const categoryListRef = useRef(null);
  
  // 폼 유효성 검사 상태
  const [errors, setErrors] = useState({
    productName: '',
    location: '',
    purchaseDate: ''
  });
  
  // 필드 터치 상태
  const [touched, setTouched] = useState({
    productName: false,
    location: false,
    purchaseDate: false
  });

  // 카테고리 및 영역 데이터 로드
  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchLocations());
    dispatch(fetchProducts());
  }, [dispatch]);

  // 수정 모드인 경우 제품 데이터 로드
  useEffect(() => {
    if (isEditMode && productId) {
      dispatch(fetchProductById(productId));
    }
  }, [dispatch, isEditMode, productId]);

  // 제품 데이터가 로드되면 폼에 채우기 (수정 모드)
  useEffect(() => {
    if (isEditMode && currentProduct) {
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
  }, [isEditMode, currentProduct, categories, locations]);

  // 초기 선택된 영역 설정 및 해당 영역의 제품 개수 확인 (추가 모드)
  useEffect(() => {
    if (!isEditMode && locationId) {
      if (locations.length > 0) {
        const location = locations.find(loc => loc.id === locationId);
        if (location) {
          setSelectedLocation(location);
          
          // 해당 영역의 제품 목록 필터링
          const productsInLocation = allProducts && allProducts.filter(p => p.locationId === locationId) || [];
          setCurrentLocationProducts(productsInLocation);
          
          // 비회원이고 제품이 5개 이상인 경우 회원가입 유도 모달 표시
          if (!isAuthenticated && productsInLocation.length >= 5) {
            setShowSignupPrompt(true);
          }
        } else {
          // 영역을 찾지 못한 경우 다시 로드 시도
          console.log('영역을 찾지 못했습니다. 다시 로드합니다:', locationId);
          dispatch(fetchLocations());
        }
      } else {
        // 영역 데이터가 없는 경우 다시 로드 시도
        console.log('영역 데이터가 없습니다. 다시 로드합니다.');
        dispatch(fetchLocations());
      }
    }
  }, [isEditMode, locationId, locations, allProducts, isAuthenticated, dispatch]);

  // 카테고리 추가 모달 열기
  const handleOpenCategoryModal = () => {
    setShowCategoryModal(true);
  };

  // 카테고리 추가 처리
  const handleAddCategory = (newCategory) => {
    setSelectedCategory(newCategory);
    setShowCategoryModal(false);
    
    if (categoryListRef && categoryListRef.current) {
      setTimeout(() => {
        categoryListRef.current.scrollToEnd({ animated: true });
      }, 300);
    }
    
    Alert.alert('알림', '새 카테고리가 추가되었습니다.');
  };

  // 영역 추가 화면으로 이동
  const handleAddLocation = () => {
    navigation.navigate('AddLocation');
  };

  // 날짜 선택 핸들러 (네이티브)
  const handleDateChange = (event, selectedDate, dateType) => {
    if (event.type === 'dismissed') {
      setShowPurchaseDatePicker(false);
      setShowExpiryDatePicker(false);
      setShowEstimatedEndDatePicker(false);
      return;
    }
    
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
    try {
      let date;
      if (tempDateString.includes('-')) {
        const [year, month, day] = tempDateString.split('-').map(Number);
        
        if (!year || !month || !day || 
            isNaN(year) || isNaN(month) || isNaN(day) ||
            month < 1 || month > 12 || day < 1 || day > 31) {
          throw new Error('유효하지 않은 날짜 형식');
        }
        
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(tempDateString);
      }
      
      if (isNaN(date.getTime())) {
        throw new Error('유효하지 않은 날짜');
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
    
    try {
      return date.toLocaleDateString();
    } catch (error) {
      console.error('날짜 포맷 오류:', error);
      return '날짜 선택';
    }
  };
  
  // 입력용 날짜 포맷 함수 (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    if (!date) return '';
    
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('입력용 날짜 포맷 오류:', error);
      return '';
    }
  };

  // 필드 유효성 검사 함수
  const validateField = (name, value) => {
    let errorMessage = '';
    
    switch (name) {
      case 'productName':
        if (!value.trim()) {
          errorMessage = '제품명을 입력해주세요';
        }
        break;
      case 'purchaseDate':
        if (!value) {
          errorMessage = '구매일을 선택해주세요';
        }
        break;
      default:
        break;
    }
    
    return errorMessage;
  };
  
  // 필드 변경 핸들러
  const handleFieldChange = (name, value) => {
    switch (name) {
      case 'productName':
        setProductName(value);
        break;
      case 'purchaseDate':
        setPurchaseDate(value);
        break;
      default:
        break;
    }
    
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const errorMessage = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: errorMessage }));
  };
  
  // 필드 블러 핸들러
  const handleFieldBlur = (name, value) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const errorMessage = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: errorMessage }));
  };

  // 특정 필드로 스크롤하는 함수
  const scrollToField = (fieldName) => {
    if (scrollViewRef.current) {
      switch (fieldName) {
        case 'productName':
          if (productNameInputRef.current) {
            productNameInputRef.current.measure((fx, fy, width, height, px, py) => {
              scrollViewRef.current.scrollTo({
                y: py - 50,
                animated: true
              });
            });
          }
          break;
        case 'purchaseDate':
          if (purchaseDateSectionRef.current) {
            purchaseDateSectionRef.current.measure((fx, fy, width, height, px, py) => {
              scrollViewRef.current.scrollTo({
                y: py - 50,
                animated: true
              });
            });
          }
          break;
        default:
          break;
      }
    }
  };

  // 폼 전체 유효성 검사
  const isFormValid = () => {
    const newErrors = {
      productName: validateField('productName', productName),
      purchaseDate: validateField('purchaseDate', purchaseDate)
    };
    
    setErrors(newErrors);
    
    setTouched({
      productName: true,
      purchaseDate: true
    });
    
    const hasErrors = Object.values(newErrors).some(error => error !== '');
    
    if (hasErrors) {
      if (newErrors.productName) {
        scrollToField('productName');
      } else if (newErrors.purchaseDate) {
        scrollToField('purchaseDate');
      }
    }
    
    // 영역이 존재하는지 확인 (추가 모드에서는 이미 선택된 영역이 있어야 함)
    if (!selectedLocation) {
      Alert.alert(
        '알림',
        '현재 영역 정보를 찾을 수 없습니다. 다시 시도해주세요.',
        [{ text: '확인', style: 'cancel' }]
      );
      return false;
    }
    
    // 비회원인 경우 제품 개수 제한 확인 (추가 모드만)
    if (!isEditMode && !isAuthenticated && currentLocationProducts.length >= 5) {
      setShowSignupPrompt(true);
      return false;
    }
    
    return !hasErrors;
  };

  // 제품 등록/수정 처리
  const handleSubmit = async () => {
    try {
      if (!isFormValid()) {
        return;
      }
      
      if (isEditMode) {
        // 수정 모드
        const updatedProductData = {
          id: productId,
          name: productName,
          brand: brand,
          categoryId: selectedCategory ? selectedCategory.id : null,
          category: selectedCategory || null,
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
        
        const result = await dispatch(updateProductAsync(updatedProductData)).unwrap();
        setCreatedProduct(result);
        setShowSuccessModal(true);
      } else {
        // 추가 모드
        const productData = {
          name: productName,
          brand: brand,
          category: selectedCategory || null,
          categoryId: selectedCategory?.id || null,
          locationId: selectedLocation?.id || null,
          purchaseDate: purchaseDate ? purchaseDate.toISOString() : new Date().toISOString(),
          expiryDate: expiryDate ? expiryDate.toISOString() : null,
          estimatedEndDate: estimatedEndDate ? estimatedEndDate.toISOString() : null,
          memo: memo,
          createdAt: new Date().toISOString()
        };
        
        const result = await dispatch(addProductAsync(productData)).unwrap();
        setCreatedProduct(result);
        setShowSuccessModal(true);
        
        // 비회원 사용자인 경우 회원가입 유도 모달 표시 (제품 3개 이상 등록 시)
        const products = await dispatch(fetchProducts()).unwrap();
        if (!isAuthenticated && products.length >= 3) {
          setTimeout(() => {
            setShowSignupPrompt(true);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('제품 처리 오류:', error);
      Alert.alert(
        '오류',
        `제품 ${isEditMode ? '수정' : '등록'} 중 오류가 발생했습니다. 다시 시도해주세요.`,
        [{ text: '확인', style: 'default' }]
      );
    }
  };
  
  // 성공 모달 닫기 및 화면 이동
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    
    if (isEditMode) {
      // 수정 모드: 이전 화면으로 돌아가기
      navigation.goBack();
    } else {
      // 추가 모드: 폼 초기화 및 화면 이동
      setProductName('');
      setSelectedCategory(null);
      setBrand('');
      setPurchaseDate(new Date());
      setExpiryDate(null);
      setEstimatedEndDate(null);
      setMemo('');
      
      if (locationId) {
        navigation.reset({
          index: 1,
          routes: [
            { name: 'LocationsScreen' },
            { name: 'LocationDetail', params: { locationId } }
          ],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'LocationsScreen' }],
        });
      }
    }
  };

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
              onPress={() => {
                handleConfirmWebDate();
                if (currentDateType === 'purchase') {
                  setTouched(prev => ({ ...prev, purchaseDate: true }));
                  const errorMessage = validateField('purchaseDate', tempDate);
                  setErrors(prev => ({ ...prev, purchaseDate: errorMessage }));
                }
              }}
            >
              <Text style={styles.confirmButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // 성공 모달
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
          
          <Text style={styles.successTitle}>
            {isEditMode ? '수정 완료!' : '등록 완료!'}
          </Text>
          
          <Text style={styles.successMessage}>
            {createdProduct?.name || '제품'}이(가) 성공적으로 {isEditMode ? '수정' : '등록'}되었습니다.
          </Text>
          
          <View style={styles.productInfoContainer}>
            <View style={styles.productInfoRow}>
              <Text style={styles.productInfoLabel}>영역:</Text>
              <Text style={styles.productInfoValue}>
                {isEditMode 
                  ? (locations.find(l => l.id === createdProduct?.locationId)?.title || selectedLocation?.title || '')
                  : (selectedLocation?.title || '')
                }
              </Text>
            </View>
            
            {brand && (
              <View style={styles.productInfoRow}>
                <Text style={styles.productInfoLabel}>브랜드:</Text>
                <Text style={styles.productInfoValue}>{brand}</Text>
              </View>
            )}
            
            <View style={styles.productInfoRow}>
              <Text style={styles.productInfoLabel}>구매일:</Text>
              <Text style={styles.productInfoValue}>
                {isEditMode 
                  ? (createdProduct ? new Date(createdProduct.purchaseDate).toLocaleDateString() : '')
                  : formatDate(purchaseDate)
                }
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
  
  // 로딩 중이면 로딩 화면 표시 (수정 모드만)
  if (isEditMode && productsStatus === 'loading' && !currentProduct) {
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
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          {isEditMode ? '제품 수정' : '제품 등록'}
        </Text>
        
        {/* 제품명 입력 */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>제품명</Text>
            <Text style={styles.requiredMark}>*</Text>
          </View>
          <TextInput
            ref={productNameInputRef}
            style={[
              styles.input,
              touched.productName && errors.productName ? styles.inputError : null
            ]}
            value={productName}
            onChangeText={(text) => handleFieldChange('productName', text)}
            onBlur={() => handleFieldBlur('productName', productName)}
            placeholder="제품명을 입력하세요"
          />
          {touched.productName && errors.productName ? (
            <Text style={styles.errorText}>{errors.productName}</Text>
          ) : null}
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
        
        {/* 구매일 선택 */}
        <View 
          ref={purchaseDateSectionRef}
          style={styles.inputGroup}
        >
          <View style={styles.labelContainer}>
            <Text style={styles.label}>구매일</Text>
            <Text style={styles.requiredMark}>*</Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.dateInput,
              touched.purchaseDate && errors.purchaseDate ? styles.inputError : null
            ]}
            onPress={() => {
              if (Platform.OS === 'web') {
                handleWebDateSelect('purchase');
              } else {
                setShowPurchaseDatePicker(true);
              }
              setTouched(prev => ({ ...prev, purchaseDate: true }));
            }}
          >
            <Text style={styles.dateText}>
              {formatDate(purchaseDate)}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>
          {touched.purchaseDate && errors.purchaseDate ? (
            <Text style={styles.errorText}>{errors.purchaseDate}</Text>
          ) : null}
          {Platform.OS !== 'web' && showPurchaseDatePicker && (
            <DateTimePicker
              value={purchaseDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => {
                handleDateChange(event, date, 'purchase');
                handleFieldChange('purchaseDate', date);
              }}
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
            placeholder="메모를 입력하세요"
            multiline={true}
            numberOfLines={4}
          />
        </View>
        
        {/* 등록/수정 버튼 */}
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
              <Text style={[styles.submitButtonText, styles.loadingText]}>
                {isEditMode ? '수정 중...' : '등록 중...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditMode ? '제품 수정' : '제품 등록'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      
      {/* 웹용 날짜 선택 모달 */}
      {Platform.OS === 'web' && <WebDatePickerModal />}
      
      {/* 성공 모달 */}
      <SuccessModal />
      
      {/* 카테고리 추가 모달 */}
      <CategoryModal />
      
      {/* 회원가입 유도 모달 (추가 모드만) */}
      {!isEditMode && showSignupPrompt && (
        <SignupPromptModal 
          visible={showSignupPrompt}
          onClose={() => setShowSignupPrompt(false)}
          onSignup={() => navigation.navigate('Signup')}
        />
      )}
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
  inputError: {
    borderColor: 'red',
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
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
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
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#757575',
    fontWeight: '600',
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
  formGroup: {
    marginBottom: 20,
  },
  selectedLocationContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedLocationIcon: {
    marginRight: 8,
  },
  selectedLocationText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  noLocationText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default ProductFormScreen; 