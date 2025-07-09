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
  Switch,
  TouchableWithoutFeedback,
  Keyboard,
  FlatList
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addProductAsync } from '../redux/slices/productsSlice';
import { fetchCategories } from '../redux/slices/categoriesSlice';
import { fetchLocations } from '../redux/slices/locationsSlice';
import { addNotification } from '../redux/slices/notificationsSlice';
import SignupPromptModal from '../components/SignupPromptModal';
import CategoryAddModal from '../components/CategoryAddModal';

// 조건부 DateTimePicker 임포트
let DateTimePicker;
if (Platform.OS !== 'web') {
  try {
    // 네이티브 환경에서만 임포트
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (error) {
    console.error('DateTimePicker 임포트 실패:', error);
  }
}

const AddProductScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  
  // 라우트 파라미터에서 영역 ID 가져오기
  const { locationId } = route.params || {};
  
  // Redux 상태
  const { categories, status: categoriesStatus } = useSelector(state => state.categories);
  const { locations, status: locationsStatus } = useSelector(state => state.locations);
  const { allProducts, status: productsStatus } = useSelector(state => state.products);
  const { isAuthenticated } = useSelector(state => state.auth);
  
  // 상태
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
  
  // 알림 설정
  const [enableExpiryNotification, setEnableExpiryNotification] = useState(true);
  const [expiryNotificationDays, setExpiryNotificationDays] = useState(7);
  const [enableEstimatedNotification, setEnableEstimatedNotification] = useState(true);
  const [estimatedNotificationDays, setEstimatedNotificationDays] = useState(7);
  
  // 모달
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [createdProduct, setCreatedProduct] = useState(null);
  
  // 현재 영역의 제품 목록
  const [currentLocationProducts, setCurrentLocationProducts] = useState([]);

  // 스크롤 뷰 참조
  const scrollViewRef = useRef(null);
  
  // 입력 필드 참조
  const productNameInputRef = useRef(null);
  const locationSectionRef = useRef(null);
  const purchaseDateSectionRef = useRef(null);
  
  // 폼 유효성 검사 상태
  const [errors, setErrors] = useState({
    productName: '',
    location: '',
    purchaseDate: ''
  });
  
  // 필드 터치 상태 (사용자가 필드를 터치했는지 여부를 추적)
  const [touched, setTouched] = useState({
    productName: false,
    location: false,
    purchaseDate: false
  });
  
  // 날짜 선택기 표시 상태
  const [notificationType, setNotificationType] = useState('expiry'); // 'expiry' 또는 'estimated'
  const [isRepeating, setIsRepeating] = useState(false);

  // 상태 추가
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [categoryError, setCategoryError] = useState('');

  // 카테고리 및 영역 데이터 로드
  useEffect(() => {
    if (categoriesStatus === 'idle') {
      dispatch(fetchCategories());
    }
    
    if (locationsStatus === 'idle') {
      dispatch(fetchLocations());
    }
  }, [dispatch, categoriesStatus, locationsStatus]);

  // 초기 선택된 영역 설정 및 해당 영역의 제품 개수 확인
  useEffect(() => {
    if (locationId && locations.length > 0) {
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
        
        // 영역의 알림 설정 적용 (실제로는 API에서 가져와야 함)
        if (location.enableNotifications !== false) {
          setEnableExpiryNotification(true);
          setExpiryNotificationDays(location.daysBeforeTarget || 7);
          setEnableEstimatedNotification(true);
          setEstimatedNotificationDays(location.daysBeforeTarget || 7);
          setIsRepeating(location.isRepeating || false);
        } else {
          setEnableExpiryNotification(false);
          setEnableEstimatedNotification(false);
        }
      }
    }
  }, [locationId, locations, allProducts, isAuthenticated]);

  // 카테고리 추가 모달 열기
  const handleOpenCategoryModal = () => {
    setShowCategoryModal(true);
  };

  // 카테고리 추가 처리
  const handleAddCategory = (newCategory) => {
    // 새 카테고리 선택
    setSelectedCategory(newCategory);
    setShowCategoryModal(false);
    
    // 스크롤 위치 유지
    if (categoryListRef.current) {
      setTimeout(() => {
        categoryListRef.current.scrollToOffset({
          offset: categoryScrollPosition,
          animated: false
        });
      }, 100);
    }
  };

  // 카테고리 선택 컴포넌트
  const CategorySelector = () => (
    <View style={styles.categoriesContainer}>
      <Text style={styles.sectionTitle}>카테고리</Text>
      {categoriesStatus === 'loading' ? (
        <ActivityIndicator size="small" color="#4CAF50" style={styles.loader} />
      ) : categories.length > 0 ? (
        <View style={styles.categoryListContainer}>
          <FlatList
            ref={categoryListRef}
            data={[...categories, { id: 'add-category', isAddButton: true }]}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
            renderItem={({ item }) => {
              if (item.isAddButton) {
                return (
                  <TouchableOpacity
                    style={styles.addCategoryChip}
                    onPress={handleOpenCategoryModal}
                  >
                    <Ionicons name="add" size={18} color="#4CAF50" style={styles.addCategoryIcon} />
                    <Text style={styles.addCategoryText}>카테고리 추가</Text>
                  </TouchableOpacity>
                );
              }
              
              return (
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    selectedCategory?.id === item.id && styles.selectedCategoryChip
                  ]}
                  onPress={() => setSelectedCategory(item)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory?.id === item.id && styles.selectedCategoryChipText
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
            onScroll={(e) => {
              setCategoryScrollPosition(e.nativeEvent.contentOffset.x);
            }}
          />
        </View>
      ) : (
        <View style={styles.emptyCategories}>
          <Text style={styles.emptyText}>등록된 카테고리가 없습니다.</Text>
          <TouchableOpacity
            style={styles.addCategoryButton}
            onPress={handleOpenCategoryModal}
          >
            <Text style={styles.addCategoryButtonText}>카테고리 추가하기</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // 영역 선택 컴포넌트
  const LocationSelector = () => (
    <View 
      ref={locationSectionRef}
      style={styles.categoriesContainer}
    >
      <View style={styles.labelContainer}>
        <Text style={styles.sectionTitle}>영역</Text>
        <Text style={styles.requiredMark}>*</Text>
      </View>
      {locationsStatus === 'loading' ? (
        <ActivityIndicator size="small" color="#4CAF50" style={styles.loader} />
      ) : locations.length > 0 ? (
        <>
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
                  selectedLocation?.id === location.id && styles.selectedLocationChip,
                  touched.location && errors.location && !selectedLocation ? styles.locationChipError : null
                ]}
                onPress={() => handleFieldChange('location', location)}
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
          {touched.location && errors.location ? (
            <Text style={styles.errorText}>{errors.location}</Text>
          ) : null}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>등록된 영역이 없습니다.</Text>
          <TouchableOpacity 
            style={styles.addLocationButton}
            onPress={() => navigation.navigate('AddLocation')}
          >
            <Text style={styles.addLocationButtonText}>영역 추가하기</Text>
          </TouchableOpacity>
        </View>
      )}
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
              onPress={() => {
                handleConfirmWebDate();
                if (currentDateType === 'purchase') {
                  // 필드 터치 표시 및 유효성 검사
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
            {createdProduct?.name || '제품'}이(가) 성공적으로 등록되었습니다.
          </Text>
          
          <View style={styles.productInfoContainer}>
            {selectedLocation && (
              <View style={styles.productInfoRow}>
                <Text style={styles.productInfoLabel}>영역:</Text>
                <Text style={styles.productInfoValue}>
                  {selectedLocation.title || ''}
                </Text>
              </View>
            )}
            
            {brand && (
              <View style={styles.productInfoRow}>
                <Text style={styles.productInfoLabel}>브랜드:</Text>
                <Text style={styles.productInfoValue}>{brand}</Text>
              </View>
            )}
            
            <View style={styles.productInfoRow}>
              <Text style={styles.productInfoLabel}>구매일:</Text>
              <Text style={styles.productInfoValue}>
                {formatDate(purchaseDate)}
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

  // 날짜 선택 핸들러 (네이티브)
  const handleDateChange = (event, selectedDate, dateType) => {
    // 안드로이드에서는 취소 시 selectedDate가 undefined
    if (event.type === 'dismissed' || !selectedDate) {
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
      // 입력된 문자열에서 날짜 객체 생성
      const [year, month, day] = tempDateString.split('-').map(Number);
      
      // 유효한 날짜 형식인지 확인
      if (!year || !month || !day || 
          isNaN(year) || isNaN(month) || isNaN(day) ||
          month < 1 || month > 12 || day < 1 || day > 31) {
        throw new Error('유효하지 않은 날짜 형식');
      }
      
      // JavaScript의 월은 0부터 시작하므로 1을 빼줌
      const date = new Date(year, month - 1, day);
      
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
      case 'location':
        if (!value) {
          errorMessage = '영역을 선택해주세요';
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
    // 필드 값 업데이트
    switch (name) {
      case 'productName':
        setProductName(value);
        break;
      case 'location':
        setSelectedLocation(value);
        break;
      case 'purchaseDate':
        setPurchaseDate(value);
        break;
      default:
        break;
    }
    
    // 필드가 터치되었음을 표시
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // 유효성 검사 수행
    const errorMessage = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: errorMessage }));
  };
  
  // 필드 블러(포커스 아웃) 핸들러
  const handleFieldBlur = (name, value) => {
    // 필드가 터치되었음을 표시
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // 유효성 검사 수행
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
        case 'location':
          if (locationSectionRef.current) {
            locationSectionRef.current.measure((fx, fy, width, height, px, py) => {
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
    // 모든 필수 필드에 대해 유효성 검사 수행
    const newErrors = {
      productName: validateField('productName', productName),
      location: validateField('location', selectedLocation),
      purchaseDate: validateField('purchaseDate', purchaseDate)
    };
    
    // 에러 상태 업데이트
    setErrors(newErrors);
    
    // 모든 필드가 터치되었음을 표시
    setTouched({
      productName: true,
      location: true,
      purchaseDate: true
    });
    
    // 에러가 있는지 확인
    const hasErrors = Object.values(newErrors).some(error => error !== '');
    
    // 에러가 있으면 해당 필드로 스크롤
    if (hasErrors) {
      if (newErrors.productName) {
        scrollToField('productName');
      } else if (newErrors.location) {
        scrollToField('location');
      } else if (newErrors.purchaseDate) {
        scrollToField('purchaseDate');
      }
    }
    
    // 영역이 존재하는지 확인
    if (locations.length === 0) {
      Alert.alert(
        '알림',
        '등록된 영역이 없습니다. 영역을 먼저 등록해주세요.',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '영역 등록하기', 
            onPress: () => navigation.navigate('AddLocation')
          }
        ]
      );
      return false;
    }
    
    // 비회원인 경우 제품 개수 제한 확인
    if (!isAuthenticated && currentLocationProducts.length >= 5) {
      setShowSignupPrompt(true);
      return false;
    }
    
    return !hasErrors;
  };

  // 제품 등록 처리
  const handleSubmit = async () => {
    if (!isFormValid()) return;
    
    // 비회원 제한 확인
    if (!isAuthenticated && selectedLocation) {
      const productsInLocation = allProducts && allProducts.filter(p => p.locationId === selectedLocation.id) || [];
      if (productsInLocation.length >= 5) {
        setShowSignupPrompt(true);
        return;
      }
    }
    
    // 비회원인 경우 알림 설정 비활성화
    const notificationEnabled = isAuthenticated ? enableExpiryNotification : false;
    const estimatedNotificationEnabled = isAuthenticated ? enableEstimatedNotification : false;
    
    const productData = {
      name: productName,
      category: selectedCategory?.name || null,
      locationId: selectedLocation?.id || null,
      location: selectedLocation?.title || null,
      purchaseDate: purchaseDate ? purchaseDate.toISOString() : null,
      expiryDate: expiryDate ? expiryDate.toISOString() : null,
      estimatedEndDate: estimatedEndDate ? estimatedEndDate.toISOString() : null,
      purchaseMethod: '', // 입력 필드 제거
      purchaseLink: '', // 입력 필드 제거
      price: null, // 입력 필드 제거
      memo,
      brand,
      enableNotifications: notificationEnabled,
      useLocationNotifications: false, // 비회원은 영역 기본 알림 비활성화
      notificationType: 'expiry', // 기본값
      daysBeforeTarget: expiryNotificationDays,
      isRepeating: isRepeating,
    };
    
    try {
      const result = await dispatch(addProductAsync(productData)).unwrap();
      
      // 알림 설정이 활성화되어 있고 비회원이 아닌 경우에만 알림 추가
      if (notificationEnabled && isAuthenticated) {
        try {
          await saveNotificationSettings(result.id);
        } catch (notificationError) {
          console.error('알림 설정 저장 중 오류 발생:', notificationError);
          // 알림 설정 실패해도 제품 등록은 성공으로 처리
        }
      }
      
      setCreatedProduct(result);
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert('오류', `제품 등록에 실패했습니다: ${error.message}`);
    }
  };
  
  // 알림 설정 저장
  const saveNotificationSettings = async (productId) => {
    try {
      const notificationData = {
        type: 'product',
        targetId: productId,
        title: `${productName} 유통기한 알림`,
        message: `${productName}의 유통기한이 ${expiryNotificationDays}일 남았습니다.`,
        notifyType: 'expiry',
        daysBeforeTarget: expiryNotificationDays,
        isActive: true,
        isRepeating: isRepeating,
      };
      
      // 알림 설정은 별도의 액션으로 처리하거나, 제품 등록 시 함께 저장
      // 현재는 제품 등록 시 알림 설정을 저장하도록 변경
      // 알림 설정 저장 로직은 별도의 액션으로 분리하는 것이 더 좋을 수 있음
      // 여기서는 제품 등록 성공 시 알림 설정을 저장하도록 변경
      // 실제 알림 설정 저장은 알림 관리 화면에서 처리
      return notificationData;
    } catch (error) {
      console.error('알림 설정 생성 중 오류 발생:', error);
      throw error;
    }
  };
  
  // 성공 모달 닫기 및 화면 이동
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    
    // 폼 초기화
    setProductName('');
    setSelectedCategory(null);
    setBrand('');
    setPurchaseDate(new Date()); // 구매일 초기화
    setExpiryDate(null); // 유통기한 초기화
    setEstimatedEndDate(null); // 예상 소모 완료일 초기화
    setMemo(''); // 메모 초기화
    
    // 화면 이동 - replace 사용하여 현재 화면을 대체
    if (locationId) {
      // 현재 화면을 LocationDetail로 교체하여 뒤로가기 시 Locations로 이동하게 함
      navigation.reset({
        index: 1,
        routes: [
          { name: 'LocationsScreen' },
          { name: 'LocationDetail', params: { locationId } }
        ],
      });
    } else {
      // 현재 화면을 Locations로 교체
      navigation.reset({
        index: 0,
        routes: [{ name: 'LocationsScreen' }],
      });
    }
  };

  // 카테고리 선택 처리 함수 - 스크롤 위치 유지
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    // 스크롤 위치는 변경하지 않음 (기존 위치 유지)
  };

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
        <Text style={styles.title}>제품 등록</Text>
        
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
        <CategorySelector />
        
        {/* 영역 선택 */}
        <LocationSelector />

        {/* 카테고리 추가 모달 */}
        <CategoryModal />

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
              // 필드 터치 표시
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
        
        {/* 알림 설정 */}
        <View style={styles.notificationSection}>
          <Text style={styles.sectionTitle}>알림 설정</Text>
          
          {!isAuthenticated ? (
            <View style={styles.anonymousNotificationContainer}>
              <Ionicons name="lock-closed" size={24} color="#888" style={styles.lockIcon} />
              <Text style={styles.anonymousNotificationText}>
                알림 설정은 회원 전용 기능입니다. 회원가입 후 이용해주세요.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>제품 알림 사용</Text>
                <Switch
                  value={enableExpiryNotification}
                  onValueChange={setEnableExpiryNotification}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={enableExpiryNotification ? '#f5dd4b' : '#f4f3f4'}
                />
              </View>
              
              {enableExpiryNotification && (
                <>
                  <View style={styles.notificationTypeContainer}>
                    <TouchableOpacity
                      style={[
                        styles.notificationTypeButton,
                        notificationType === 'expiry' && styles.selectedNotificationType
                      ]}
                      onPress={() => setNotificationType('expiry')}
                    >
                      <Text style={[
                        styles.notificationTypeText,
                        notificationType === 'expiry' && styles.selectedNotificationTypeText
                      ]}>
                        유통기한 기준
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.notificationTypeButton,
                        notificationType === 'estimated' && styles.selectedNotificationType
                      ]}
                      onPress={() => setNotificationType('estimated')}
                    >
                      <Text style={[
                        styles.notificationTypeText,
                        notificationType === 'estimated' && styles.selectedNotificationTypeText
                      ]}>
                        소진 예상 기준
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.daysBeforeLabel}>
                    {notificationType === 'expiry' ? '유통기한' : '소진 예상일'}까지 며칠 전에 알림을 받을까요?
                  </Text>
                  
                  <View style={styles.daysBeforeContainer}>
                    {[1, 3, 5, 7, 14, 30].map(days => (
                      <TouchableOpacity
                        key={days}
                        style={[
                          styles.daysBeforeButton,
                          daysBeforeTarget === days && styles.selectedDaysBeforeButton
                        ]}
                        onPress={() => setDaysBeforeTarget(days)}
                      >
                        <Text style={[
                          styles.daysBeforeText,
                          daysBeforeTarget === days && styles.selectedDaysBeforeText
                        ]}>
                          {days}일 전
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>연속 알림</Text>
                    <Switch
                      value={isRepeating}
                      onValueChange={setIsRepeating}
                      trackColor={{ false: '#767577', true: '#81b0ff' }}
                      thumbColor={isRepeating ? '#f5dd4b' : '#f4f3f4'}
                    />
                  </View>
                  
                  {isRepeating && (
                    <Text style={styles.repeatDescription}>
                      D-{daysBeforeTarget}일부터 D-day까지 매일 알림을 받습니다.
                    </Text>
                  )}
                </>
              )}
            </>
          )}
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
      
      {/* 회원가입 유도 모달 */}
      {showSignupPrompt && (
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
  categoriesContainer: {
    marginBottom: 20,
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
    height: 44,  // 높이 약간 증가
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
  locationChipError: {
    borderColor: 'red',
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
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  addLocationButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  addLocationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 16,
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
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  productInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  productInfoLabel: {
    fontSize: 14,
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
  notificationSection: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  notificationTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  notificationTypeButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginHorizontal: 4,
  },
  selectedNotificationType: {
    backgroundColor: '#4CAF50',
  },
  notificationTypeText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  selectedNotificationTypeText: {
    color: '#fff',
  },
  daysBeforeLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  daysBeforeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  daysBeforeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
    margin: 4,
  },
  selectedDaysBeforeButton: {
    backgroundColor: '#4CAF50',
  },
  daysBeforeText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  selectedDaysBeforeText: {
    color: '#fff',
  },
  repeatDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  anonymousNotificationContainer: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIcon: {
    marginRight: 12,
  },
  anonymousNotificationText: {
    flex: 1,
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
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
  modalInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
  },
});

export default AddProductScreen; 