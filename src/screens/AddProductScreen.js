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
  Switch
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addProductAsync } from '../redux/slices/productsSlice';
import { fetchLocations } from '../redux/slices/locationsSlice';
import { fetchCategories } from '../redux/slices/categoriesSlice';
import { addNotification } from '../redux/slices/notificationsSlice';
import SignupPromptModal from '../components/SignupPromptModal';

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
  const { locationId } = route.params || {};
  
  // 스크롤 뷰 참조
  const scrollViewRef = useRef(null);
  
  // 입력 필드 참조
  const productNameInputRef = useRef(null);
  const locationSectionRef = useRef(null);
  const purchaseDateSectionRef = useRef(null);
  
  const { categories, status: categoriesStatus } = useSelector(state => state.categories);
  const { locations, status: locationsStatus } = useSelector(state => state.locations);
  const { products: allProducts, status: productsStatus } = useSelector(state => state.products);
  const { isAnonymous } = useSelector(state => state.auth);
  
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
  
  // 회원가입 유도 모달
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  
  // 현재 선택된 영역의 제품 개수
  const [currentLocationProducts, setCurrentLocationProducts] = useState([]);

  // 알림 설정 상태
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [useLocationNotifications, setUseLocationNotifications] = useState(true);
  const [notificationType, setNotificationType] = useState('expiry'); // 'expiry' 또는 'estimated'
  const [daysBeforeTarget, setDaysBeforeTarget] = useState(3);
  const [isRepeating, setIsRepeating] = useState(false);

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
        const productsInLocation = allProducts.filter(p => p.locationId === locationId);
        setCurrentLocationProducts(productsInLocation);
        
        // 비회원이고 제품이 5개 이상인 경우 회원가입 유도 모달 표시
        if (isAnonymous && productsInLocation.length >= 5) {
          setShowSignupPrompt(true);
        }
        
        // 영역의 알림 설정 적용 (실제로는 API에서 가져와야 함)
        if (location.enableNotifications !== false) {
          setEnableNotifications(true);
          setUseLocationNotifications(true);
          setNotificationType(location.notificationType || 'expiry');
          setDaysBeforeTarget(location.daysBeforeTarget || 3);
          setIsRepeating(location.isRepeating || false);
        } else {
          setUseLocationNotifications(false);
        }
      }
    }
  }, [locationId, locations, allProducts, isAnonymous]);

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
    if (isAnonymous && currentLocationProducts.length >= 5) {
      setShowSignupPrompt(true);
      return false;
    }
    
    return !hasErrors;
  };

  // 제품 등록 처리
  const handleSubmit = async () => {
    if (!isFormValid()) return;
    
    // 비회원 제한 확인
    if (isAnonymous && selectedLocation) {
      const productsInLocation = allProducts.filter(p => p.locationId === selectedLocation.id);
      if (productsInLocation.length >= 5) {
        setShowSignupPrompt(true);
        return;
      }
    }
    
    // 비회원인 경우 알림 설정 비활성화
    const notificationEnabled = isAnonymous ? false : enableNotifications;
    
    const productData = {
      name: productName,
      category: selectedCategory?.name || null,
      locationId: selectedLocation?.id || null,
      location: selectedLocation?.title || null,
      purchaseDate: purchaseDate ? purchaseDate.toISOString() : null,
      expiryDate: expiryDate ? expiryDate.toISOString() : null,
      estimatedEndDate: estimatedEndDate ? estimatedEndDate.toISOString() : null,
      purchaseMethod,
      purchaseLink,
      price: price ? parseFloat(price) : null,
      memo,
      brand,
      enableNotifications: notificationEnabled,
      useLocationNotifications: isAnonymous ? false : useLocationNotifications,
      notificationType,
      daysBeforeTarget,
      isRepeating
    };
    
    dispatch(addProductAsync(productData))
      .unwrap()
      .then((result) => {
        // 알림 설정이 활성화되어 있고 비회원이 아닌 경우에만 알림 추가
        if (notificationEnabled && !isAnonymous) {
          saveNotificationSettings(result.id);
        }
        
        setRegisteredProduct(result);
        setShowSuccessModal(true);
      })
      .catch((error) => {
        Alert.alert('오류', `제품 등록에 실패했습니다: ${error.message}`);
      });
  };
  
  // 알림 설정 저장
  const saveNotificationSettings = (productId) => {
    const notificationData = {
      type: 'product',
      targetId: productId,
      title: `${productName} ${notificationType === 'expiry' ? '유통기한' : '소진 예상'} 알림`,
      message: `${productName}의 ${notificationType === 'expiry' ? '유통기한' : '소진 예상일'}이 ${daysBeforeTarget}일 남았습니다.`,
      notifyType: notificationType,
      daysBeforeTarget: daysBeforeTarget,
      isActive: true,
      isRepeating: isRepeating,
    };
    
    dispatch(addNotification(notificationData))
      .unwrap()
      .catch((error) => {
        console.error('알림 설정 저장 실패:', error);
      });
  };
  
  // 성공 모달 닫기 및 화면 이동
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    
    // 폼 초기화
    setProductName('');
    setSelectedCategory(null);
    setBrand('');
    setPurchaseMethod('');
    setPurchaseLink('');
    setPrice('');
    setMemo('');
    setExpiryDate(null);
    setEstimatedEndDate(null);
    
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

  // 카테고리 선택 컴포넌트
  const CategorySelector = () => (
    <View style={styles.categoriesContainer}>
      <Text style={styles.sectionTitle}>카테고리</Text>
      {categoriesStatus === 'loading' ? (
        <ActivityIndicator size="small" color="#4CAF50" style={styles.loader} />
      ) : categories.length > 0 ? (
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
      ) : (
        <Text style={styles.emptyText}>등록된 카테고리가 없습니다.</Text>
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
            {registeredProduct?.name || '제품'}이(가) 성공적으로 등록되었습니다.
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

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
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
        
        {/* 알림 설정 */}
        <View style={styles.notificationSection}>
          <Text style={styles.sectionTitle}>알림 설정</Text>
          
          {isAnonymous ? (
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
                  value={enableNotifications}
                  onValueChange={setEnableNotifications}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={enableNotifications ? '#f5dd4b' : '#f4f3f4'}
                />
              </View>
              
              {enableNotifications && selectedLocation && (
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>영역 기본 알림 설정 사용</Text>
                  <Switch
                    value={useLocationNotifications}
                    onValueChange={setUseLocationNotifications}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={useLocationNotifications ? '#f5dd4b' : '#f4f3f4'}
                  />
                </View>
              )}
              
              {enableNotifications && !useLocationNotifications && (
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
      <SignupPromptModal 
        visible={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
        message="비회원은 영역당 최대 5개의 제품만 등록할 수 있습니다. 회원가입하여 무제한으로 제품을 등록하세요!"
      />
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
  sectionTitle: {
    fontSize: 16,
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
});

export default AddProductScreen; 