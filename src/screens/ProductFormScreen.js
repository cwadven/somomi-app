import { isTemplateActive } from '../utils/validityUtils';
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
  FlatList,
  SafeAreaView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addProductAsync, updateProductAsync, fetchProducts, fetchProductById, fetchProductsByLocation } from '../redux/slices/productsSlice';
import { markProductSlotTemplateAsUsed } from '../redux/slices/authSlice';
import { fetchLocations } from '../redux/slices/locationsSlice';
import { addNotification } from '../redux/slices/notificationsSlice';
import { saveData, loadData, removeData, STORAGE_KEYS } from '../utils/storageUtils';
import LocationSelector from '../components/LocationSelector';
import SignupPromptModal from '../components/SignupPromptModal';
import AlertModal from '../components/AlertModal';
import { createInventoryItemInSection, updateInventoryItem } from '../api/inventoryApi';

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
  const { mode = 'add', productId, locationId, product: passedProduct } = route.params || {};
  const isEditMode = mode === 'edit';
  
  // Redux 상태
  // 카테고리 슬라이스 사용 제거
  const { locations, status: locationsStatus } = useSelector(state => state.locations);
  const { products, currentProduct, status: productsStatus, locationProducts } = useSelector(state => state.products);
  const { isLoggedIn, isAnonymous, slots, userProductSlotTemplateInstances, subscription, userLocationTemplateInstances } = useSelector(state => state.auth);

  // 폼 상태
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [purchasePlace, setPurchasePlace] = useState('');
  const [price, setPrice] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [expiryDate, setExpiryDate] = useState(null);
  const [estimatedEndDate, setEstimatedEndDate] = useState(null);
  const [memo, setMemo] = useState('');
  // 초안 저장용 디바운스 타이머
  const draftTimerRef = useRef(null);
  
  // 템플릿 만료 판단 (정책 기반)
  const isTemplateExpired = (template) => {
    if (!template) return false;
    return !isTemplateActive(template, subscription);
  };

  // 특정 영역이 만료 템플릿에 연결되어 있는지
  const isLocationExpired = (locId) => {
    const tpl = (userLocationTemplateInstances || []).find(t => t.usedInLocationId === locId);
    return isTemplateExpired(tpl);
  };
  
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
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [createdProduct, setCreatedProduct] = useState(null);
  const didSubmitRef = useRef(false);
  const pendingNavActionRef = useRef(null);
  const isNavigatingAwayRef = useRef(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: '',
    iconColor: ''
  });
  
  // 추가 모드 전용 상태
  const [currentLocationProducts, setCurrentLocationProducts] = useState([]);
  
  // 스크롤 뷰 참조
  const scrollViewRef = useRef(null);
  const productNameInputRef = useRef(null);
  const purchaseDateSectionRef = useRef(null);
  // 카테고리 제거로 참조 삭제
  
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

  // 영역 데이터 로드
  useEffect(() => {
      dispatch(fetchLocations());
    dispatch(fetchProducts());
  }, [dispatch]);

  // 초안 로드 (추가 모드에서만 1회)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (isEditMode) return;
      try {
        const draft = await loadData(STORAGE_KEYS.PRODUCT_FORM_DRAFT);
        if (mounted && draft) {
          setProductName(draft.productName || '');
          setBrand(draft.brand || '');
          setPurchasePlace(draft.purchasePlace || '');
          setPrice(draft.price || '');
          setSelectedLocation(draft.selectedLocation || null);
          setPurchaseDate(draft.purchaseDate ? new Date(draft.purchaseDate) : new Date());
          setExpiryDate(draft.expiryDate ? new Date(draft.expiryDate) : null);
          setEstimatedEndDate(draft.estimatedEndDate ? new Date(draft.estimatedEndDate) : null);
          setMemo(draft.memo || '');
        }
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, [isEditMode]);

  // 초안 저장 (추가 모드에서만, 400ms 디바운스)
  useEffect(() => {
    if (isEditMode) return;
    if (didSubmitRef.current) return; // 생성 성공 후에는 초안 저장 중단
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const draft = {
        productName,
        brand,
        purchasePlace,
        price,
        selectedLocation,
        purchaseDate: purchaseDate ? purchaseDate.toISOString() : null,
        expiryDate: expiryDate ? expiryDate.toISOString() : null,
        estimatedEndDate: estimatedEndDate ? estimatedEndDate.toISOString() : null,
        memo,
      };
      saveData(STORAGE_KEYS.PRODUCT_FORM_DRAFT, draft);
    }, 400);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [isEditMode, productName, brand, purchasePlace, price, selectedLocation, purchaseDate, expiryDate, estimatedEndDate, memo]);

  // 폼 변경 여부 판단
  const hasUnsavedChanges = () => {
    if (didSubmitRef.current) return false;
    // 추가 모드: 사용자가 뭔가 입력했는지 단순 휴리스틱으로 판단
    if (!isEditMode) {
      return (
        (productName && productName.trim() !== '') ||
        (brand && brand.trim() !== '') ||
        (purchasePlace && purchasePlace.trim() !== '') ||
        (price && String(price).trim() !== '') ||
        false ||
        !!expiryDate ||
        !!estimatedEndDate ||
        (memo && memo.trim() !== '')
      );
    }
    // 수정 모드: 기존 값과 비교
    if (!currentProduct) return false;
    const original = {
      name: currentProduct.name || '',
      brand: currentProduct.brand || '',
      purchasePlace: currentProduct.purchasePlace || '',
      price: typeof currentProduct.price === 'number' ? String(currentProduct.price) : '',
      locationId: currentProduct.locationId || null,
      purchaseDate: currentProduct.purchaseDate ? new Date(currentProduct.purchaseDate).toISOString().slice(0,10) : null,
      expiryDate: currentProduct.expiryDate ? new Date(currentProduct.expiryDate).toISOString().slice(0,10) : null,
      estimatedEndDate: currentProduct.estimatedEndDate ? new Date(currentProduct.estimatedEndDate).toISOString().slice(0,10) : null,
      memo: currentProduct.memo || ''
    };
    const current = {
      name: productName || '',
      brand: brand || '',
      purchasePlace: purchasePlace || '',
      price: price ? String(price) : '',
      locationId: selectedLocation?.id || currentProduct.locationId || null,
      purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString().slice(0,10) : null,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString().slice(0,10) : null,
      estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate).toISOString().slice(0,10) : null,
      memo: memo || ''
    };
    // 카테고리 비교: id 우선 → name 비교 폴백
    const categoryChanged = (() => {
      const o = null; const c = null;
      const ov = o ? (o.id || o.name || null) : null;
      const cv = c ? (c.id || c.name || null) : null;
      return ov !== cv;
    })();
    const basicChanged = (
      original.name !== current.name ||
      original.brand !== current.brand ||
      original.purchasePlace !== current.purchasePlace ||
      original.price !== current.price ||
      original.locationId !== current.locationId ||
      original.purchaseDate !== current.purchaseDate ||
      original.expiryDate !== current.expiryDate ||
      original.estimatedEndDate !== current.estimatedEndDate ||
      original.memo !== current.memo
    );
    return categoryChanged || basicChanged;
  };

  // 나가기 확인 모달
  const confirmLeaveWithoutSaving = (onConfirm) => {
    setAlertModalConfig({
      title: '저장하지 않고 나가시겠어요?',
      message: '작성된 내용이 있습니다. 저장하지 않고 나가면 입력한 내용이 사라집니다.',
      icon: 'help-circle',
      iconColor: '#FF9800',
      buttons: [
        { text: '취소', style: 'cancel' },
        { text: '나가기', onPress: onConfirm }
      ]
    });
    setAlertModalVisible(true);
  };

  // 뒤로가기/제스처 차단 및 확인 흐름 (리스너 중복 등록 방지: 의존성 최소화)
  useEffect(() => {
    const handler = async (e) => {
      if (didSubmitRef.current) return; // 제출 완료 시 차단하지 않음
      if (isNavigatingAwayRef.current) return; // 확인 후 실제 내비게이션은 허용
      if (!hasUnsavedChanges()) {
        // 추가 모드일 땐 초안 정리만 수행
        if (!isEditMode) { try { await removeData(STORAGE_KEYS.PRODUCT_FORM_DRAFT); } catch (err) {} }
        return;
      }
      e.preventDefault();
      pendingNavActionRef.current = e.data.action;
      confirmLeaveWithoutSaving(async () => {
        setAlertModalVisible(false);
        isNavigatingAwayRef.current = true;
        if (!isEditMode) { try { await removeData(STORAGE_KEYS.PRODUCT_FORM_DRAFT); } catch (err) {} }
        if (pendingNavActionRef.current) {
          navigation.dispatch(pendingNavActionRef.current);
          pendingNavActionRef.current = null;
        }
      });
    };
    const unsubscribe = navigation.addListener('beforeRemove', handler);
    return unsubscribe;
  }, [navigation, isEditMode]);

  // 헤더 뒤로가기 버튼 핸들러
  const handleBackPress = async () => {
    if (didSubmitRef.current || !hasUnsavedChanges()) {
      if (!isEditMode) { try { await removeData(STORAGE_KEYS.PRODUCT_FORM_DRAFT); } catch (err) {} }
      navigation.goBack();
      return;
    }
    confirmLeaveWithoutSaving(async () => {
      setAlertModalVisible(false);
      isNavigatingAwayRef.current = true;
      if (!isEditMode) { try { await removeData(STORAGE_KEYS.PRODUCT_FORM_DRAFT); } catch (err) {} }
      navigation.goBack();
    });
  };

  // 수정 모드인 경우 제품 데이터 로드
  useEffect(() => {
    if (isEditMode && (passedProduct || productId)) {
      if (passedProduct) return; // 이미 전달됨
      dispatch(fetchProductById(productId));
    }
  }, [dispatch, isEditMode, productId, passedProduct]);

  // 제품 데이터가 로드되면 폼에 채우기 (수정 모드)
  const editingProduct = passedProduct || currentProduct;

  useEffect(() => {
    if (isEditMode && editingProduct) {
      setProductName(editingProduct.name || '');
      setBrand(editingProduct.brand || '');
      setPurchasePlace(editingProduct.purchasePlace || '');
      setPrice(
        typeof editingProduct.price === 'number' && !isNaN(editingProduct.price)
          ? String(editingProduct.price)
          : ''
      );
      setMemo(editingProduct.memo || '');
      
      // 날짜 설정
      if (editingProduct.purchaseDate) {
        setPurchaseDate(new Date(editingProduct.purchaseDate));
      }
      
      if (editingProduct.expiryDate) {
        setExpiryDate(new Date(editingProduct.expiryDate));
      }
      
      if (editingProduct.estimatedEndDate) {
        setEstimatedEndDate(new Date(editingProduct.estimatedEndDate));
      }
      
      // 카테고리 설정 제거
      // if (categories.length > 0) { // 카테고리 제거로 인한 변경
      //   const resolveCategory = () => {
      //     // 1) 제품에 categoryId가 있는 경우
      //     if (editingProduct.categoryId) {
      //       return categories.find(cat => cat.id === editingProduct.categoryId);
      //     }
      //     const c = editingProduct.category;
      //     if (!c) return null;
      //     // 2) 제품에 category가 객체로 저장된 경우
      //     if (typeof c === 'object') {
      //       if (c.id) {
      //         return categories.find(cat => cat.id === c.id) || c;
      //       }
      //       if (c.name) {
      //         return categories.find(cat => cat.name === c.name) || c;
      //       }
      //     }
      //     // 3) 제품에 category가 문자열(이름)로 저장된 경우
      //     if (typeof c === 'string') {
      //       return categories.find(cat => cat.name === c);
      //     }
      //     return null;
      //   };
      //   const resolved = resolveCategory();
      //   if (resolved) {
      //     // setSelectedCategory(resolved); // 카테고리 제거로 인한 변경
      //   }
      // }
      
      // 영역 설정
      if (editingProduct.locationId && locations.length > 0) {
        const location = locations.find(loc => loc.id === editingProduct.locationId);
        if (location) {
          setSelectedLocation(location);
        }
      }
    }
  }, [isEditMode, editingProduct, locations]); // 카테고리 제거로 인한 변경

  // 초기 선택된 영역 설정 및 해당 영역의 제품 개수 확인 (추가 모드)
  useEffect(() => {
    if (!isEditMode && locationId) {
      if (locations.length > 0) {
        const location = locations.find(loc => loc.id === locationId);
        if (location) {
          setSelectedLocation(location);
          
          // 해당 영역의 제품 목록 필터링 (소진 전 제품만 고려)
          const productsInLocation = (products || []).filter(p => p.locationId === locationId && !p.isConsumed);
          setCurrentLocationProducts(productsInLocation);
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
  }, [isEditMode, locationId, locations, products, dispatch]);

  // 카테고리 추가 모달 열기
  // const handleOpenCategoryModal = () => {
  //   setShowCategoryModal(true);
  // };

  // 카테고리 추가 처리
  // const handleAddCategory = (newCategory) => {
  //   // 카테고리 추가 후 선택
  //   // setSelectedCategory(newCategory); // 카테고리 제거로 인한 변경
  //   setShowCategoryModal(false);
    
  //   // 성공 메시지 표시
  //   showInfoAlert('알림', '새 카테고리가 추가되었습니다.');
  // };

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
    // 입력된 날짜 문자열 파싱
    const datePattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    const match = tempDateString.match(datePattern);
    
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // JavaScript 월은 0부터 시작
      const day = parseInt(match[3], 10);
      
      const parsedDate = new Date(year, month, day);
      
      // 유효한 날짜인지 확인
      if (
        parsedDate.getFullYear() === year &&
        parsedDate.getMonth() === month &&
        parsedDate.getDate() === day
      ) {
        // 선택된 날짜 타입에 따라 상태 업데이트
        if (currentDateType === 'purchase') {
          setPurchaseDate(parsedDate);
        } else if (currentDateType === 'expiry') {
          setExpiryDate(parsedDate);
        } else if (currentDateType === 'estimated') {
          setEstimatedEndDate(parsedDate);
        }
        
        // 모달 닫기
        setShowWebDateModal(false);
      } else {
        showErrorAlert('유효한 날짜 형식이 아닙니다. (YYYY-MM-DD)');
      }
    } else {
      showErrorAlert('유효한 날짜 형식이 아닙니다. (YYYY-MM-DD)');
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
      return false;
    }
    
    // 영역이 존재하는지 확인 (추가 모드에서는 이미 선택된 영역이 있어야 함)
    if (!selectedLocation) {
      showErrorAlert(
        '알림',
        '현재 영역 정보를 찾을 수 없습니다. 다시 시도해주세요.',
        [{ text: '확인' }]
      );
      return false;
    }
    
    // 영역별 슬롯 한도 확인: 기본 슬롯 + 해당 영역에 등록된 추가 제품 슬롯 수 (-1은 무제한)
    const locId = locationId || (selectedLocation ? selectedLocation.id : null);
    const baseSlots = selectedLocation?.feature?.baseSlots ?? slots?.productSlots?.baseSlots ?? 0;
    const assignedExtra = (userProductSlotTemplateInstances || []).filter(t => t.assignedLocationId === locId && isTemplateActive(t, subscription)).length;
    const totalSlots = baseSlots === -1 ? -1 : baseSlots + assignedExtra;
    const usedCount = currentLocationProducts.length;

    if (totalSlots !== -1 && usedCount >= totalSlots) {
      // 사용 가능한 제품 슬롯 템플릿이 있는지 확인
      const availableProductSlot = (userProductSlotTemplateInstances || []).find(t => !t.used);
      if (!availableProductSlot) {
        showErrorAlert('슬롯 한도 초과', '해당 영역의 제품 슬롯이 가득 찼습니다. 상점에서 제품 슬롯을 추가 구매하세요.');
        return false;
      }
    }
    
    return true;
  };

  // 제품 등록/수정 처리
  const handleSubmit = async () => {
    // 해당 영역에 연결된 템플릿이 구독 만료일 때만 작업 차단
    const locId = locationId || selectedLocation?.id;
    const tpl = (userLocationTemplateInstances || []).find(t => t.usedInLocationId === locId);
    const isExpired = tpl ? !isTemplateActive(tpl, subscription) : false;
    if (isExpired) {
      setAlertModalConfig({
        title: '템플릿 만료',
        message: '이 영역의 템플릿이 만료되어 제품을 등록/수정할 수 없습니다.',
        icon: 'alert-circle',
        iconColor: '#F44336',
        buttons: [{ text: '확인', onPress: () => setAlertModalVisible(false) }]
      });
      setAlertModalVisible(true);
      return;
    }
    // 폼 유효성 검사
    if (!isFormValid()) {
      // 오류가 있으면 첫 번째 오류 필드로 스크롤
      if (errors.productName) {
        scrollToField('productName');
        return;
      } else if (errors.location) {
        scrollToField('location');
        return;
      } else if (errors.purchaseDate) {
        scrollToField('purchaseDate');
        return;
      }
      return;
    }

    // 로그인/비로그인 여부에 따른 추가 제한 없이 슬롯 로직만 적용 (비회원도 슬롯 내에서 등록 가능)

    // 영역이 선택되지 않은 경우 확인
    if (!selectedLocation && !locationId) {
      showConfirmAlert(
        '영역 선택 필요',
        '영역이 선택되지 않았습니다. 영역을 선택하시겠습니까?',
        handleAddLocation
      );
      return;
    }

    try {
      const productData = {
        name: productName,
        brand: brand || null,
        // category: selectedCategory, // 카테고리 제거로 인한 변경
        purchasePlace: purchasePlace ? purchasePlace : null,
        price: price && price.trim() !== '' ? parseInt(price.replace(/[^0-9]/g, ''), 10) : null,
        // 영역 위치 이동 반영: 수정 모드에서는 selectedLocation 우선 적용
        locationId: isEditMode ? ((selectedLocation && selectedLocation.id) || currentProduct.locationId) : (locationId || (selectedLocation ? selectedLocation.id : null)),
        purchaseDate: purchaseDate.toISOString(),
        expiryDate: expiryDate ? expiryDate.toISOString() : null,
        estimatedEndDate: estimatedEndDate ? estimatedEndDate.toISOString() : null,
        memo: memo || null
      };

      let result;
      if (isEditMode) {
        // 수정 모드 → 서버 API로 업데이트
        const locIdAfter = selectedLocation?.id || currentProduct.locationId || null;
        const body = {
          guest_section_id: locIdAfter ? Number(locIdAfter) : null,
          name: productName,
          memo: memo || null,
          brand: brand || null,
          point_of_purchase: purchasePlace || null,
          purchase_price: price && String(price).trim() !== '' ? parseFloat(String(price)) : null,
          purchase_at: purchaseDate.toISOString(),
          icon_url: null,
          expected_expire_at: estimatedEndDate ? estimatedEndDate.toISOString() : null,
          expire_at: expiryDate ? expiryDate.toISOString() : null,
        };
        try {
          await updateInventoryItem(productId, body);
        } catch (e) {
          throw e;
        }
        // 수정 후: 해당 영역 목록 최신화 + 제품 상세 화면을 위해 최신 데이터 확보
        if (locIdAfter) {
          try { await dispatch(fetchProductsByLocation(String(locIdAfter))).unwrap(); } catch (e) {}
        }
        result = {
          id: String(productId),
          locationId: locIdAfter ? String(locIdAfter) : null,
          name: body.name,
          memo: body.memo,
          brand: body.brand,
          purchasePlace: body.point_of_purchase,
          price: body.purchase_price,
          purchaseDate: body.purchase_at,
          expiryDate: body.expire_at,
          estimatedEndDate: body.expected_expire_at,
        };
      } else {
        // 추가 모드 → 서버 API로 생성
        const locIdAfter = locationId || selectedLocation?.id;
        const baseSlotsInSubmit = selectedLocation?.feature?.baseSlots ?? slots?.productSlots?.baseSlots ?? 0;
        // 영역별 제품 목록: locationProducts 캐시 우선, 없으면 products 폴백
        const cachedList = (locationProducts && (locationProducts[String(locIdAfter)] || locationProducts[locIdAfter])) || [];
        const productsInLocation = (cachedList && cachedList.length > 0)
          ? cachedList.filter(p => !p.isConsumed)
          : (products || []).filter(p => String(p.locationId) === String(locIdAfter) && !p.isConsumed);
        const usedCount = productsInLocation.length;
        // 유효한 추가 제품 슬롯 템플릿: 이 영역에 배정되어 있고 아직 어떤 제품에도 사용되지 않음
        const availableAssignedTemplates = (userProductSlotTemplateInstances || []).filter(t => 
          String(t.assignedLocationId) === String(locIdAfter) && (t.usedByProductId == null)
        );
        const needTemplate = baseSlotsInSubmit !== -1 && usedCount >= baseSlotsInSubmit && availableAssignedTemplates.length > 0;
        const availableAssigned = needTemplate ? availableAssignedTemplates[0] : null;

        const templateIdForBody = (availableAssigned && !isNaN(Number(availableAssigned.id))) ? Number(availableAssigned.id) : null;
        const body = {
          name: productName,
          memo: memo || null,
          guest_inventory_item_template_id: templateIdForBody,
          brand: brand || null,
          point_of_purchase: purchasePlace || null,
          purchase_price: price && String(price).trim() !== '' ? parseFloat(String(price)) : null,
          purchase_at: purchaseDate.toISOString(),
          icon_url: null,
          expected_expire_at: estimatedEndDate ? estimatedEndDate.toISOString() : null,
          expire_at: expiryDate ? expiryDate.toISOString() : null,
        };
        const createRes = await createInventoryItemInSection(locIdAfter, body);
        const newId = createRes?.guest_inventory_item_id ? String(createRes.guest_inventory_item_id) : undefined;
        // 생성 후 목록 최신화
        try { await dispatch(fetchProductsByLocation(locIdAfter)).unwrap(); } catch (e) {}
        result = {
          id: newId,
          locationId: String(locIdAfter),
          name: body.name,
          memo: body.memo,
          brand: body.brand,
          purchasePlace: body.point_of_purchase,
          price: body.purchase_price,
          purchaseDate: body.purchase_at,
          expiryDate: body.expire_at,
          estimatedEndDate: body.expected_expire_at,
        };
        // 템플릿으로 생성한 경우 프론트 상태 동기화를 위해 사용 처리
        if (availableAssigned && result.id) {
          dispatch(markProductSlotTemplateAsUsed({ templateId: availableAssigned.id, productId: result.id }));
        }
      }

      setCreatedProduct(result);
      setShowSuccessModal(true);
      // 성공 시 초안 제거 (추가 모드)
      if (!isEditMode) {
        try { await removeData(STORAGE_KEYS.PRODUCT_FORM_DRAFT); } catch (e) {}
        didSubmitRef.current = true;
      }
    } catch (error) {
      showErrorAlert('오류', `제품 ${isEditMode ? '수정' : '등록'} 중 오류가 발생했습니다: ${error.message}`);
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
      // setSelectedCategory(null); // 카테고리 제거로 인한 변경
      setBrand('');
      setPurchasePlace('');
      setPrice('');
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
  // const CategoryModal = () => (
  //   <CategoryAddModal
  //     visible={showCategoryModal}
  //     onClose={() => setShowCategoryModal(false)}
  //     onCategoryAdded={handleAddCategory}
  //   />
  // );
  
  // 로딩 중이면 로딩 화면 표시 (수정 모드만)
  if (isEditMode && productsStatus === 'loading' && !currentProduct) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // 오류 모달 표시
  const showErrorAlert = (title, message, buttons = [{ text: '확인' }]) => {
    setAlertModalConfig({
      title,
      message,
      icon: 'alert-circle',
      iconColor: '#F44336',
      buttons
    });
    setAlertModalVisible(true);
  };

  // 정보 모달 표시
  const showInfoAlert = (title, message, buttons = [{ text: '확인' }]) => {
    setAlertModalConfig({
      title,
      message,
      icon: 'information-circle',
      iconColor: '#2196F3',
      buttons
    });
    setAlertModalVisible(true);
  };

  // 확인 모달 표시
  const showConfirmAlert = (title, message, onConfirm) => {
    setAlertModalConfig({
      title,
      message,
      icon: 'help-circle',
      iconColor: '#FF9800',
      buttons: [
        { text: '취소', style: 'cancel' },
        { text: '확인', onPress: onConfirm }
      ]
    });
    setAlertModalVisible(true);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? '제품 수정' : '제품 등록'}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>
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
            placeholderTextColor="#999"
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
            placeholderTextColor="#999"
            />
          </View>

          {/* 구매처 입력 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>구매처 (선택)</Text>
            <TextInput
              style={styles.input}
              value={purchasePlace}
              onChangeText={setPurchasePlace}
            placeholder="구매처를 입력하세요"
            placeholderTextColor="#999"
            />
          </View>

          {/* 가격 입력 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>가격 (선택)</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={(text) => setPrice(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
            placeholder="숫자만 입력"
            placeholderTextColor="#999"
            />
          </View>
          
          {/* 영역 이동 (수정 모드에서만 노출) */}
          {isEditMode && (
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>영역 위치</Text>
              </View>
              <LocationSelector
                locations={locations.map(loc => ({
                  ...loc,
                  // 만료 라벨 용도로 title에 표시를 추가하거나 스타일은 LocationSelector에서 처리 가능
                  title: isLocationExpired(loc.id) ? `${loc.title} (만료)` : loc.title,
                }))}
                selectedLocation={selectedLocation || (currentProduct && locations.find(l => l.id === currentProduct.locationId))}
                onSelectLocation={(loc) => {
                  if (isLocationExpired(loc.id)) {
                    setAlertModalConfig({
                      title: '이동 불가',
                      message: '만료된 영역으로는 이동할 수 없습니다. 다른 영역을 선택하세요.',
                      buttons: [{ text: '확인' }],
                      icon: 'alert-circle',
                      iconColor: '#F44336'
                    });
                    setAlertModalVisible(true);
                    return;
                  }
                  setSelectedLocation(loc);
                }}
                hideAddButton
                isLoading={locationsStatus === 'loading'}
              />
            </View>
          )}
          
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
            placeholderTextColor="#999"
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
        {/* <CategoryModal /> */}
        
        {/* 회원가입 유도 모달 (추가 모드만) */}
        {!isEditMode && showSignupPrompt && (
          <SignupPromptModal 
            visible={showSignupPrompt}
            onClose={() => setShowSignupPrompt(false)}
            onSignup={() => navigation.navigate('Signup')}
          />
        )}
        
        {/* 알림 모달 */}
        <AlertModal
          visible={alertModalVisible}
          title={alertModalConfig.title}
          message={alertModalConfig.message}
          buttons={alertModalConfig.buttons}
          onClose={() => setAlertModalVisible(false)}
          icon={alertModalConfig.icon}
          iconColor={alertModalConfig.iconColor}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 40 : 10, // SafeAreaView에 맞추기
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40, // 뒤로가기 버튼과 제목 사이의 간격을 조정
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