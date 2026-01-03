import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Button
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { fetchProductById, deleteProductAsync, fetchProductsByLocation, patchProductById, upsertActiveProduct } from '../redux/slices/productsSlice';
import { loadUserProductSlotTemplateInstances, markProductSlotTemplateAsUsed } from '../redux/slices/authSlice';
import { consumeInventoryItem, createInventoryItemInSection, updateInventoryItem } from '../api/inventoryApi';
import { givePresignedUrl } from '../api/commonApi';
import { isTemplateActive } from '../utils/validityUtils';
import AlertModal from '../components/AlertModal';
// ProductNotificationSettings는 아직 미구현(요청사항: 사용자에게 노출하지 않음)
// import ProductNotificationSettings from '../components/ProductNotificationSettings';
import CalendarView from '../components/CalendarView';
import { emitEvent, EVENT_NAMES } from '../utils/eventBus';
import { 
  getDaysInMonth, 
  getFirstDayOfMonth, 
  generateMonthOptions, 
  generateDayOptions, 
  generateYearOptions,
  formatDate
} from '../utils/dateUtils';

// 조건부 DateTimePicker 임포트 (웹 제외)
let DateTimePicker;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (error) {
    // ignore
  }
}

// HP 바 컴포넌트
const HPBar = ({ percentage, type }) => {
  // percentage가 NaN이면 0으로 처리
  const safePercentage = isNaN(percentage) ? 0 : percentage;
  
  // HP 바 색상은 퍼센트에 따라 변하지 않도록 고정 (요청사항)
  const barColor = type === 'expiry' ? '#2196F3' : '#4CAF50';

  return (
    <View style={styles.hpBarContainer}>
      <View 
        style={[
          styles.hpBar, 
          { width: `${safePercentage}%`, backgroundColor: barColor }
        ]} 
      />
    </View>
  );
};

const ProductDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { productId, product: passedProduct, mode: routeMode, locationId: createLocationId } = route.params || {};
  const [screenMode, setScreenMode] = useState(routeMode === 'create' ? 'create' : (routeMode === 'edit' ? 'edit' : 'view')); // view | edit | create
  const { currentProduct: selectedProduct, status, error, locationProducts, products } = useSelector(state => state.products);
  // 섹션 인벤토리 API로 채워진 캐시에서 우선 탐색
  const cachedFromSections = (() => {
    try {
      const lists = Object.values(locationProducts || {});
      for (const list of lists) {
        const found = Array.isArray(list) ? list.find(p => String(p.id) === String(productId)) : null;
        if (found) return found;
      }
      return null;
    } catch {
      return null;
    }
  })();
  const currentProduct = cachedFromSections || selectedProduct || passedProduct;
  const { userLocationTemplateInstances, userProductSlotTemplateInstances, subscription, slots } = useSelector(state => state.auth);
  const { locations } = useSelector(state => state.locations);
  const isConsumed = currentProduct?.isConsumed === true || currentProduct?.is_consumed === true;
  const [iconLoadFailed, setIconLoadFailed] = useState(false);
  const iconUri = typeof currentProduct?.iconUrl === 'string' && currentProduct.iconUrl.trim() !== '' ? currentProduct.iconUrl : null;
  const [imageViewerVisible, setImageViewerVisible] = useState(false);

  // 이미지가 바뀌면 로드 실패 상태를 초기화
  useEffect(() => {
    setIconLoadFailed(false);
  }, [iconUri]);
  useEffect(() => {
    setImageViewerVisible(false);
  }, [iconUri]);
  
  // 최신 상태를 참조하기 위한 ref
  const consumptionDateRef = useRef({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    day: new Date().getDate()
  });
  
  // 소진 처리 성공 모달 상태
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successModalConfig, setSuccessModalConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => {}
  });
  
  // 커스텀 알림 모달 상태
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: '',
    iconColor: ''
  });
  
  // 소진 날짜 선택 모달 상태
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // 날짜 선택을 위한 상태
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  
  // 날짜 선택 모달의 임시 상태 - 모달 내에서만 사용
  const [tempYear, setTempYear] = useState(selectedYear);
  const [tempMonth, setTempMonth] = useState(selectedMonth);
  const [tempDay, setTempDay] = useState(selectedDay);
  
  // 날짜 선택 스크롤 중앙 정렬을 위한 참조 및 상수
  const yearScrollRef = useRef(null);
  const monthScrollRef = useRef(null);
  const dayScrollRef = useRef(null);
  const ITEM_HEIGHT = 40; // styles.datePickerOption.height
  const VISIBLE_HEIGHT = 150; // styles.datePickerScroll.height
  const CENTER_OFFSET = (VISIBLE_HEIGHT - ITEM_HEIGHT) / 2;

  // 모달이 열릴 때 현재 선택값이 중앙에 오도록 스크롤
  useEffect(() => {
    if (!datePickerVisible) return;
    try {
      const years = generateYearOptions();
      const yearIndex = Math.max(0, years.findIndex((y) => y === tempYear));
      const monthIndex = Math.max(0, tempMonth);
      const dayIndex = Math.max(0, (tempDay || 1) - 1);

      const safeScrollTo = (ref, index) => {
        if (!ref?.current || index < 0) return;
        const y = Math.max(0, index * ITEM_HEIGHT - CENTER_OFFSET);
        try {
          ref.current.scrollTo({ y, animated: false });
        } catch (e) {}
      };

      // 다음 프레임에서 스크롤 수행(렌더 보장)
      setTimeout(() => {
        safeScrollTo(yearScrollRef, yearIndex);
        safeScrollTo(monthScrollRef, monthIndex);
        safeScrollTo(dayScrollRef, dayIndex);
      }, 0);
    } catch (e) {}
  }, [datePickerVisible, tempYear, tempMonth, tempDay]);

  // 소진 처리에 사용할 날짜 상태 (별도로 관리)
  const [consumptionDate, setConsumptionDate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    day: new Date().getDate()
  });
  
  // 활성화된 탭 상태
  const [activeTab, setActiveTab] = useState('details'); // 'details' 또는 'notifications'
  // 소진된 항목이면 탭을 강제로 'details'로 유지
  useEffect(() => {
    if (isConsumed && activeTab !== 'details') {
      setActiveTab('details');
    }
  }, [isConsumed, activeTab]);
  
  // 달력 표시 상태
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  useEffect(() => {
    // 리스트/캐시/파라미터에 데이터가 없을 때만 개별 상세 로드
    if (!currentProduct && productId) {
    dispatch(fetchProductById(productId));
    }
  }, [dispatch, productId, currentProduct]);
  
  // 목록 자동 재호출 제거 (요청사항): 제품 상세 진입/복귀 시 영역 목록 API 호출 금지
  
  // 소진 처리 날짜 상태 변화 감지 및 로깅
  useEffect(() => {
    // consumptionDate 상태가 변경될 때마다 ref 업데이트
    consumptionDateRef.current = consumptionDate;
  }, [consumptionDate]);
  
  // 날짜 선택 모달이 열릴 때 현재 선택된 날짜로 임시 상태 초기화
  useEffect(() => {
    if (datePickerVisible) {
      setTempYear(selectedYear);
      setTempMonth(selectedMonth);
      setTempDay(selectedDay);
    }
  }, [datePickerVisible, selectedYear, selectedMonth, selectedDay]);
  
  // 소진 처리 모달이 열려있을 때 선택된 날짜가 변경되면 모달 내용 업데이트
  useEffect(() => {
    if (alertModalVisible && alertModalConfig.title === '소진 처리') {
      // 현재 선택된 날짜 텍스트
      const dateText = `${selectedYear}년 ${selectedMonth + 1}월 ${selectedDay}일`;
      
      // 소진 처리용 상태도 함께 업데이트
      setConsumptionDate({
        year: selectedYear,
        month: selectedMonth,
        day: selectedDay
      });
      
      // 소진 처리 모달의 내용 업데이트
      setAlertModalConfig(prevConfig => ({
        ...prevConfig,
        content: (
          <View style={styles.consumptionDateContainer}>
            <Text style={styles.consumptionDateLabel}>소진 날짜</Text>
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => {
                // 알림 모달을 닫지 않고 날짜 선택 모달만 표시
                setDatePickerVisible(true);
              }}
            >
              <Text style={styles.datePickerButtonText}>{dateText}</Text>
              <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        )
      }));
    }
  }, [selectedYear, selectedMonth, selectedDay, alertModalVisible]);
  
  // 날짜 선택 모달 확인 버튼 처리
  const handleDatePickerConfirm = () => {
    // 선택된 날짜를 상태에 저장
    setSelectedYear(tempYear);
    setSelectedMonth(tempMonth);
    setSelectedDay(tempDay);
    
    // 소진 처리용 상태에도 저장
    setConsumptionDate({
      year: tempYear,
      month: tempMonth,
      day: tempDay
    });
    
    // 소진 처리 모달의 내용 업데이트 - 약간의 지연 후 실행하여 상태 업데이트가 반영되도록 함
    setTimeout(() => {
      setAlertModalConfig(prevConfig => {
        // 현재 선택된 날짜 텍스트 - 임시 변수에서 직접 가져옴
        const dateText = `${tempYear}년 ${tempMonth + 1}월 ${tempDay}일`;
        
        return {
          ...prevConfig,
          content: (
            <View style={styles.consumptionDateContainer}>
              <Text style={styles.consumptionDateLabel}>소진 날짜</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => {
                  // 알림 모달을 닫지 않고 날짜 선택 모달만 표시
                  setDatePickerVisible(true);
                }}
              >
                <Text style={styles.datePickerButtonText}>{dateText}</Text>
                <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
              </TouchableOpacity>
            </View>
          )
        };
      });
    }, 100);
    
    // 날짜 선택 모달 닫기
    setDatePickerVisible(false);
  };
  
  // 날짜 선택 모달 취소 버튼 처리
  const handleDatePickerCancel = () => {
    setDatePickerVisible(false);
  };
  
  // 소진 처리 함수
  const handleMarkAsConsumed = () => {
    // 임시 날짜 변수도 함께 초기화
    setTempYear(selectedYear);
    setTempMonth(selectedMonth);
    setTempDay(selectedDay);
    
    // 소진 처리용 상태 초기화 (현재 선택된 날짜로)
    setConsumptionDate({
      year: selectedYear,
      month: selectedMonth,
      day: selectedDay
    });
    
    // 현재 선택된 날짜 텍스트
    const dateText = `${selectedYear}년 ${selectedMonth + 1}월 ${selectedDay}일`;
    
    // 소진 처리 모달 표시 - 함수형 업데이트 사용
    setAlertModalConfig({
      title: '소진 처리',
      message: '이 제품을 소진 처리하시겠습니까?\n소진 처리된 제품은 소진 처리 목록으로 이동합니다.',
      content: (
        <View style={styles.consumptionDateContainer}>
          <Text style={styles.consumptionDateLabel}>소진 날짜</Text>
          <TouchableOpacity 
            style={styles.datePickerButton}
            onPress={() => {
              // 알림 모달을 닫지 않고 날짜 선택 모달만 표시
              setDatePickerVisible(true);
            }}
          >
            <Text style={styles.datePickerButtonText}>{dateText}</Text>
            <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      ),
      buttons: [
        { text: '취소', style: 'cancel' },
        { 
          text: '소진 처리', 
          style: 'default',
          // 소진 처리 버튼 클릭 시 최신 상태를 참조하는 함수
          onPress: function() {
            // 소진 처리 전에 필요한 정보 저장
            const productName = currentProduct.name;
            
            // consumptionDateRef에서 최신 날짜 정보 가져오기
            const { year, month, day } = consumptionDateRef.current;
            
            // 선택한 날짜로 소진 처리
            const date = new Date(year, month, day);
            const formattedDate = formatDate(date);
            
            // 알림 모달 닫기
            setAlertModalVisible(false);
            
            // 소진 처리 API 호출 (서버)
            consumeInventoryItem(currentProduct.id, date.toISOString())
              .then(() => {
                // 약간의 지연 후 성공 모달 표시 (애니메이션 충돌 방지)
                setTimeout(() => {
                  // 성공 모달 설정 및 표시
                  setSuccessModalConfig({
                    title: '소진 처리 완료',
                    message: `${productName} 제품이 ${formattedDate}에 소진 처리되었습니다.`,
                    onConfirm: () => {
                      // 모달 닫기 후 이전 화면으로 이동
                      setSuccessModalVisible(false);
                      try {
                        if (currentProduct?.locationId) {
                          dispatch(fetchProductsByLocation(currentProduct.locationId));
                        }
                      } catch (e) {}
                      // 템플릿 최신화
                      try { dispatch(loadUserProductSlotTemplateInstances()); } catch (e) {}
                      navigation.goBack();
                    }
                  });
                  setSuccessModalVisible(true);
                }, 300);
              })
              .catch((err) => {
                showErrorAlert(`소진 처리 중 오류가 발생했습니다: ${err.message}`);
              });
          }
        }
      ],
      icon: 'checkmark-circle',
      iconColor: '#4CAF50'
    });
    setAlertModalVisible(true);
  };
  
  // 날짜 선택 모달 렌더링
  const renderDatePicker = () => {
    if (!datePickerVisible) return null;
    
    const years = generateYearOptions();
    const months = generateMonthOptions();
    const days = generateDayOptions(tempYear, tempMonth);
    
    return (
      <Modal
        visible={datePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleDatePickerCancel}
      >
        <View style={styles.datePickerModalOverlay}>
          <View style={styles.datePickerModalContent}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>소진 날짜 선택</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleDatePickerCancel}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerContainer}>
              {/* 년도 선택 */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>년도</Text>
                <View style={styles.datePickerScrollWrapper}>
                  <ScrollView 
                    ref={yearScrollRef}
                    style={styles.datePickerScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    {years.map((year) => (
                      <TouchableOpacity
                        key={`year-${year}`}
                        style={[
                          styles.datePickerOption,
                          tempYear === year && styles.datePickerOptionSelected
                        ]}
                        onPress={() => setTempYear(year)}
                      >
                        <Text
                          style={[
                            styles.datePickerOptionText,
                            tempYear === year && styles.datePickerOptionTextSelected
                          ]}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={styles.datePickerSelector} />
                </View>
              </View>
              
              {/* 월 선택 */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>월</Text>
                <View style={styles.datePickerScrollWrapper}>
                  <ScrollView 
                    ref={monthScrollRef}
                    style={styles.datePickerScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    {months.map((monthName, index) => (
                      <TouchableOpacity
                        key={`month-${index}`}
                        style={[
                          styles.datePickerOption,
                          tempMonth === index && styles.datePickerOptionSelected
                        ]}
                        onPress={() => {
                          setTempMonth(index);
                          // 일수가 변경될 수 있으므로 선택한 일이 유효한지 확인
                          const daysInNewMonth = getDaysInMonth(tempYear, index);
                          if (tempDay > daysInNewMonth) {
                            setTempDay(daysInNewMonth);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.datePickerOptionText,
                            tempMonth === index && styles.datePickerOptionTextSelected
                          ]}
                        >
                          {monthName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={styles.datePickerSelector} />
                </View>
              </View>
              
              {/* 일 선택 */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>일</Text>
                <View style={styles.datePickerScrollWrapper}>
                  <ScrollView 
                    ref={dayScrollRef}
                    style={styles.datePickerScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    {generateDayOptions(tempYear, tempMonth).map((day) => (
                      <TouchableOpacity
                        key={`day-${day}`}
                        style={[
                          styles.datePickerOption,
                          tempDay === day && styles.datePickerOptionSelected
                        ]}
                        onPress={() => setTempDay(day)}
                      >
                        <Text
                          style={[
                            styles.datePickerOptionText,
                            tempDay === day && styles.datePickerOptionTextSelected
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={styles.datePickerSelector} />
                </View>
              </View>
            </View>
            
            {/* 선택된 날짜 표시 */}
            <Text style={styles.selectedDateText}>
              선택된 날짜: {tempYear}년 {tempMonth + 1}월 {tempDay}일
            </Text>
            
            <View style={styles.datePickerButtons}>
              <TouchableOpacity 
                style={[styles.datePickerButton, styles.datePickerCancelButton]}
                onPress={handleDatePickerCancel}
              >
                <Text style={styles.datePickerCancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.datePickerButton, styles.datePickerConfirmButton]}
                onPress={handleDatePickerConfirm}
              >
                <Text style={styles.datePickerConfirmButtonText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  
  // 제품 데이터가 로딩 중일 경우 로딩 화면 표시 (create 모드 제외)
  if (screenMode !== 'create' && !currentProduct && status === 'loading') {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>제품 상세</Text>
          <View style={styles.headerRight} />
        </View>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </View>
    );
  }
  
  // 에러가 발생한 경우 에러 메시지 표시 (create 모드 제외)
  if (screenMode !== 'create' && !currentProduct && status === 'failed') {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>제품 상세</Text>
          <View style={styles.headerRight} />
        </View>
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>오류: {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => dispatch(fetchProductById(productId))}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // 제품 데이터가 없을 경우 메시지 표시 (create 모드 제외)
  if (screenMode !== 'create' && !currentProduct) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>제품 상세</Text>
          <View style={styles.headerRight} />
        </View>
      <View style={styles.loadingContainer}>
        <Text>제품을 찾을 수 없습니다.</Text>
        </View>
      </View>
    );
  }
  
  // 유통기한 남은 수명 계산 (%)
  const calculateExpiryPercentage = () => {
    if (!currentProduct.expiryDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 오늘 날짜의 시작(자정)으로 설정
    
    const expiryDate = new Date(currentProduct.expiryDate);
    expiryDate.setHours(23, 59, 59, 999); // 만료일의 끝(23:59:59.999)으로 설정
    
    // purchaseDate가 없는 경우 오늘 날짜를 기준으로 계산
    const purchaseDate = currentProduct.purchaseDate ? new Date(currentProduct.purchaseDate) : new Date();
    purchaseDate.setHours(0, 0, 0, 0); // 구매일의 시작(자정)으로 설정
    
    // 날짜가 유효한지 확인
    if (isNaN(expiryDate.getTime()) || isNaN(purchaseDate.getTime())) {
      return 100;
    }
    
    const totalDays = (expiryDate - purchaseDate) / (1000 * 60 * 60 * 24);
    
    // totalDays가 0이거나 음수인 경우 처리
    if (totalDays <= 0) {
      return 0;
    }
    
    const remainingDays = (expiryDate - today) / (1000 * 60 * 60 * 24);
    
    // 유통기한이 가까워질수록 HP바가 줄어들도록 계산
    // 남은 일수의 비율을 직접 사용 (구매일부터 유통기한까지의 총 기간 중 남은 비율)
    const percentage = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
    return Math.round(percentage);
  };
  
  // 소진 예상일 남은 수명 계산 (%)
  const calculateConsumptionPercentage = () => {
    if (!currentProduct.estimatedEndDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 오늘 날짜의 시작(자정)으로 설정
    
    const endDate = new Date(currentProduct.estimatedEndDate);
    endDate.setHours(23, 59, 59, 999); // 소진 예상일의 끝(23:59:59.999)으로 설정
    
    // purchaseDate가 없는 경우 오늘 날짜를 기준으로 계산
    const purchaseDate = currentProduct.purchaseDate ? new Date(currentProduct.purchaseDate) : new Date();
    purchaseDate.setHours(0, 0, 0, 0); // 구매일의 시작(자정)으로 설정
    
    // 날짜가 유효한지 확인
    if (isNaN(endDate.getTime()) || isNaN(purchaseDate.getTime())) {
      return 100;
    }
    
    const totalDays = (endDate - purchaseDate) / (1000 * 60 * 60 * 24);
    
    // totalDays가 0이거나 음수인 경우 처리
    if (totalDays <= 0) {
      return 0;
    }
    
    const remainingDays = (endDate - today) / (1000 * 60 * 60 * 24);
    
    // 소진예상일이 가까워질수록 HP바가 줄어들도록 계산
    // 남은 일수의 비율을 직접 사용 (구매일부터 소진예상일까지의 총 기간 중 남은 비율)
    const percentage = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
    return Math.round(percentage);
  };
  
  // 유통기한 남은 일수 계산
  const calculateExpiryDays = () => {
    if (!currentProduct.expiryDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 오늘 날짜의 시작(자정)으로 설정
    
    const expiryDate = new Date(currentProduct.expiryDate);
    expiryDate.setHours(23, 59, 59, 999); // 만료일의 끝(23:59:59.999)으로 설정
    
    const remainingDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    return remainingDays;
  };
  
  // 소진 예상일 남은 일수 계산
  const calculateConsumptionDays = () => {
    if (!currentProduct.estimatedEndDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 오늘 날짜의 시작(자정)으로 설정
    
    const endDate = new Date(currentProduct.estimatedEndDate);
    endDate.setHours(23, 59, 59, 999); // 소진 예상일의 끝(23:59:59.999)으로 설정
    
    const remainingDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    return remainingDays;
  };

  // 카테고리 제거: 고정 아이콘 사용
  const getCategoryIcon = () => 'cube-outline';

  // ====== create/edit 폼 상태 ======
  const [productName, setProductName] = useState('');
  const [memo, setMemo] = useState('');
  const [brand, setBrand] = useState('');
  const [purchasePlace, setPurchasePlace] = useState('');
  const [price, setPrice] = useState('');
  const [purchaseDateText, setPurchaseDateText] = useState('');
  const [expiryDateText, setExpiryDateText] = useState('');
  const [estimatedEndDateText, setEstimatedEndDateText] = useState('');
  // 앱에서 날짜 선택 UI를 사용하기 위한 Date 상태
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [expiryDate, setExpiryDate] = useState(null);
  const [estimatedEndDate, setEstimatedEndDate] = useState(null);
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [showEstimatedEndDatePicker, setShowEstimatedEndDatePicker] = useState(false);

  // 이미지 업로드 상태 (선택 즉시 presigned + S3 업로드)
  const [imagePreviewUri, setImagePreviewUri] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadedIconUrl, setUploadedIconUrl] = useState(null); // read_host + key
  const [pickedImageMeta, setPickedImageMeta] = useState(null); // { uri, fileName, mimeType, ext }
  const pendingSubmitRef = useRef(false);

  const ALLOWED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
  const getFileExtension = (nameOrUri) => {
    if (!nameOrUri || typeof nameOrUri !== 'string') return null;
    const clean = nameOrUri.split('?')[0].split('#')[0];
    const last = clean.split('/').pop() || clean;
    const idx = last.lastIndexOf('.');
    if (idx === -1) return null;
    return last.slice(idx + 1).toLowerCase();
  };
  const guessMimeTypeFromExtension = (ext) => {
    switch ((ext || '').toLowerCase()) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      default: return 'application/octet-stream';
    }
  };
  const guessExtensionFromMimeType = (mimeType) => {
    switch ((mimeType || '').toLowerCase()) {
      case 'image/png': return 'png';
      case 'image/jpeg': return 'jpg';
      case 'image/gif': return 'gif';
      case 'image/webp': return 'webp';
      default: return null;
    }
  };
  const buildSafeFileName = (ext) => `inventory_item_${Date.now()}.${String(ext || '').toLowerCase()}`;
  const joinReadHostAndKey = (readHost, key) => {
    if (!readHost || !key) return null;
    const host = String(readHost);
    const k = String(key);
    if (host.endsWith('/') && k.startsWith('/')) return host + k.slice(1);
    if (!host.endsWith('/') && !k.startsWith('/')) return `${host}/${k}`;
    return host + k;
  };
  const parseYMD = (text) => {
    const t = (text || '').trim();
    if (!t) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
    const [y, m, d] = t.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (isNaN(dt.getTime())) return null;
    if (dt.getFullYear() !== y || dt.getMonth() !== (m - 1) || dt.getDate() !== d) return null;
    return dt;
  };
  const formatYMD = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const optimizeImageIfNeeded = async ({ uri, ext }) => {
    if (ext === 'gif') return { uri, ext };
    const MAX_DIM = 1280;
    let format = SaveFormat.JPEG;
    let outExt = 'jpg';
    let compress = 0.78;
    if (ext === 'png' || ext === 'webp') {
      format = SaveFormat.WEBP;
      outExt = 'webp';
      compress = 0.8;
    }
    // 리사이즈는 화면 크기 정보가 없어도 웹/모바일 공통으로 안전하게 width 기준
    const result = await manipulateAsync(uri, [{ resize: { width: MAX_DIM } }], { compress, format });
    return { uri: result?.uri || uri, ext: outExt };
  };

  const uploadPickedImage = async ({ transactionPk, meta }) => {
    if (!meta?.uri || !meta?.fileName) return null;
    setImageUploading(true);
    try {
      const presigned = await givePresignedUrl('inventory-item-image', String(transactionPk), meta.fileName);
      const url = presigned?.url;
      const fields = presigned?.data;
      const key = fields?.key;
      const readHost = presigned?.read_host;
      if (!url || !fields || !key) throw new Error('invalid-presigned-response');

      const form = new FormData();
      Object.entries(fields).forEach(([k, v]) => {
        if (v == null) return;
        form.append(k, String(v));
      });

      const ext = meta.ext || getFileExtension(meta.fileName) || 'jpg';
      const mime = meta.mimeType || guessMimeTypeFromExtension(ext);
      if (Platform.OS === 'web') {
        const blob = await fetch(meta.uri).then(r => r.blob());
        if (typeof File !== 'undefined') {
          const file = new File([blob], meta.fileName, { type: mime });
          form.append('file', file);
        } else {
          form.append('file', blob, meta.fileName);
        }
      } else {
        form.append('file', { uri: meta.uri, name: meta.fileName, type: mime });
      }

      const uploadRes = await fetch(url, { method: 'POST', body: form });
      if (!uploadRes.ok) {
        const t = await uploadRes.text().catch(() => '');
        throw new Error(`s3-upload-failed:${uploadRes.status}:${t}`);
      }
      const full = joinReadHostAndKey(readHost, key);
      const iconUrl = full || key;
      setUploadedIconUrl(iconUrl);
      return iconUrl;
    } finally {
      setImageUploading(false);
    }
  };

  const submitCreateOrEdit = async () => {
    const isCreate = screenMode === 'create';
    const canSaveNow = (productName || '').trim().length > 0;
    if (!canSaveNow) {
      showErrorAlert('제품명을 입력해 주세요.');
      return;
    }

    const purchaseDateObj = parseYMD(purchaseDateText) || new Date();
    const expiryDateObj = parseYMD(expiryDateText);
    const estimatedEndDateObj = parseYMD(estimatedEndDateText);

    if (isCreate) {
      if (!createLocationId) {
        showErrorAlert('영역 정보가 없습니다. 다시 시도해 주세요.');
        return;
      }

      const locIdAfter = String(createLocationId);
      const location = (locations || []).find(l => String(l.id) === locIdAfter) || null;
      const baseSlotsInSubmit = location?.feature?.baseSlots ?? slots?.productSlots?.baseSlots ?? 0;
      const cachedList = (locationProducts && (locationProducts[String(locIdAfter)] || locationProducts[locIdAfter])) || [];
      const productsInLocation = (cachedList && cachedList.length > 0)
        ? cachedList.filter(p => !p.isConsumed)
        : (products || []).filter(p => String(p.locationId) === String(locIdAfter) && !p.isConsumed);
      const usedCount = productsInLocation.length;
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
        purchase_at: purchaseDateObj.toISOString(),
        icon_url: uploadedIconUrl || null,
        expected_expire_at: estimatedEndDateObj ? estimatedEndDateObj.toISOString() : null,
        expire_at: expiryDateObj ? expiryDateObj.toISOString() : null,
      };
      const createRes = await createInventoryItemInSection(locIdAfter, body);
      const newId = createRes?.guest_inventory_item_id ? String(createRes.guest_inventory_item_id) : undefined;
      const created = {
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
        iconUrl: body.icon_url || null,
        isConsumed: false,
      };
      try { dispatch(upsertActiveProduct({ product: created })); } catch (e) {}
      try { emitEvent(EVENT_NAMES.PRODUCT_CREATED, { product: created }); } catch (e) {}
      if (availableAssigned && created.id) {
        try { dispatch(markProductSlotTemplateAsUsed({ templateId: availableAssigned.id, productId: created.id })); } catch (e) {}
      }
      navigation.goBack();
      return;
    }

    // edit
    if (!currentProduct?.id) return;
    const body = {
      guest_section_id: currentProduct.locationId ? Number(currentProduct.locationId) : null,
      name: productName,
      memo: memo || null,
      brand: brand || null,
      point_of_purchase: purchasePlace || null,
      purchase_price: price && String(price).trim() !== '' ? parseFloat(String(price)) : null,
      purchase_at: purchaseDateObj.toISOString(),
      icon_url: uploadedIconUrl || currentProduct.iconUrl || null,
      expected_expire_at: estimatedEndDateObj ? estimatedEndDateObj.toISOString() : null,
      expire_at: expiryDateObj ? expiryDateObj.toISOString() : null,
    };
    await updateInventoryItem(String(currentProduct.id), body);
    try {
      dispatch(patchProductById({
        id: String(currentProduct.id),
        patch: {
          iconUrl: body.icon_url,
          name: body.name,
          memo: body.memo,
          brand: body.brand,
          purchasePlace: body.point_of_purchase,
          price: body.purchase_price,
          purchaseDate: body.purchase_at,
          expiryDate: body.expire_at,
          estimatedEndDate: body.expected_expire_at,
        }
      }));
    } catch (e) {}
    try {
      emitEvent(EVENT_NAMES.PRODUCT_UPDATED, {
        id: String(currentProduct.id),
        patch: {
          iconUrl: body.icon_url,
          name: body.name,
          memo: body.memo,
          brand: body.brand,
          purchasePlace: body.point_of_purchase,
          price: body.purchase_price,
          purchaseDate: body.purchase_at,
          expiryDate: body.expire_at,
          estimatedEndDate: body.expected_expire_at,
        },
        locationId: currentProduct.locationId != null ? String(currentProduct.locationId) : null,
      });
    } catch (e) {}
    setScreenMode('view');
  };

  // 업로드 중 "등록/저장"을 눌렀다면 업로드 완료 후 자동으로 제출
  useEffect(() => {
    if (!imageUploading && pendingSubmitRef.current) {
      pendingSubmitRef.current = false;
      // 업로드가 끝난 시점에 자동 저장
      submitCreateOrEdit().catch((e) => {
        showErrorAlert(`저장 중 오류가 발생했습니다: ${e?.message || String(e)}`);
      });
    }
  }, [imageUploading, submitCreateOrEdit]);

  const pickImageForForm = async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm?.granted) {
          showErrorAlert('갤러리 접근 권한이 필요합니다.');
          return;
        }
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (res.canceled) return;
      const asset = Array.isArray(res.assets) ? res.assets[0] : null;
      if (!asset?.uri) return;

      const extFromNameOrUri = getFileExtension(asset.fileName || asset.uri);
      const extFromMime = guessExtensionFromMimeType(asset.mimeType);
      const ext = (extFromNameOrUri || extFromMime || '').toLowerCase();
      if (!ext || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
        showErrorAlert('png, jpg, jpeg, gif, webp 파일만 업로드할 수 있어요.');
        return;
      }

      const optimized = await optimizeImageIfNeeded({ uri: asset.uri, ext }).catch(() => ({ uri: asset.uri, ext }));
      const finalExt = optimized.ext || ext;
      const meta = {
        uri: optimized.uri,
        ext: finalExt,
        fileName: buildSafeFileName(finalExt),
        mimeType: guessMimeTypeFromExtension(finalExt),
      };
      setPickedImageMeta(meta);
      setImagePreviewUri(meta.uri);
      setUploadedIconUrl(null);
      // ✅ 선택 즉시 업로드
      await uploadPickedImage({
        transactionPk: screenMode === 'create' ? 0 : (currentProduct?.id || 0),
        meta,
      });
    } catch (e) {
      showErrorAlert(`이미지 선택 중 오류가 발생했습니다: ${e?.message || String(e)}`);
    }
  };

  const enterEditMode = () => {
    if (!currentProduct) return;
    setProductName(currentProduct.name || '');
    setMemo(currentProduct.memo || '');
    setBrand(currentProduct.brand || '');
    setPurchasePlace(currentProduct.purchasePlace || '');
    setPrice(currentProduct.price != null ? String(currentProduct.price) : '');
    const pd = currentProduct.purchaseDate ? new Date(currentProduct.purchaseDate) : new Date();
    const ed = currentProduct.expiryDate ? new Date(currentProduct.expiryDate) : null;
    const eed = currentProduct.estimatedEndDate ? new Date(currentProduct.estimatedEndDate) : null;
    setPurchaseDate(pd);
    setExpiryDate(ed);
    setEstimatedEndDate(eed);
    setPurchaseDateText(formatYMD(pd));
    setExpiryDateText(ed ? formatYMD(ed) : '');
    setEstimatedEndDateText(eed ? formatYMD(eed) : '');
    setImagePreviewUri(currentProduct.iconUrl || null);
    setPickedImageMeta(null);
    setUploadedIconUrl(null);
    setScreenMode('edit');
  };

  useEffect(() => {
    if (screenMode === 'create') {
      setProductName('');
      setMemo('');
      setBrand('');
      setPurchasePlace('');
      setPrice('');
      const today = new Date();
      setPurchaseDate(today);
      setExpiryDate(null);
      setEstimatedEndDate(null);
      setPurchaseDateText(formatYMD(today));
      setExpiryDateText('');
      setEstimatedEndDateText('');
      setImagePreviewUri(null);
      setPickedImageMeta(null);
      setUploadedIconUrl(null);
    }
  }, [screenMode]);
  
  // 제품 삭제 처리
  const handleDelete = () => {
    setAlertModalConfig({
      title: '제품 삭제',
      message: '정말 이 제품을 삭제하시겠습니까?',
      buttons: [
        { text: '취소', style: 'plain' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: () => {
            dispatch(deleteProductAsync(currentProduct.id))
              .unwrap()
              .then(() => {
                navigation.goBack();
              })
              .catch((err) => {
                showErrorAlert(`삭제 중 오류가 발생했습니다: ${err.message}`);
              });
          }
        }
      ],
      icon: 'trash-outline',
      iconColor: '#F44336'
    });
    setAlertModalVisible(true);
  };
  
  // 제품 수정: 별도 화면 이동 없이 현재 화면에서 edit 모드로 전환
  const handleEdit = () => {
    enterEditMode();
  };
  
  // 알림 설정 탭으로 전환
  const handleNotification = () => {
    setActiveTab('notifications');
  };
  
  // 오류 알림 표시 함수
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

  const renderCreateEditForm = () => {
    const isCreate = screenMode === 'create';
    // 업로드 중이어도 "등록/저장" 버튼은 항상 보이고 누를 수 있게 유지
    const canSave = (productName || '').trim().length > 0;

    const onCancel = () => {
      if (isCreate) navigation.goBack();
      else setScreenMode('view');
    };

    const onSave = async () => {
      try {
        if (!canSave) {
          showErrorAlert('제품명을 입력해 주세요.');
          return;
        }
        // 업로드 중이라면 일단 "누를 수는 있게" 하고, 완료 후 자동 저장되도록 큐잉
        if (imageUploading) {
          pendingSubmitRef.current = true;
          showErrorAlert('이미지 업로드 중입니다. 업로드가 완료되면 자동으로 등록/저장됩니다.');
          return;
        }
        const purchaseDateObj = parseYMD(purchaseDateText) || new Date();
        const expiryDateObj = parseYMD(expiryDateText);
        const estimatedEndDateObj = parseYMD(estimatedEndDateText);

        const iconUrlForBody = imagePreviewUri
          ? (uploadedIconUrl || (currentProduct?.iconUrl || null))
          : null;

        if (isCreate) {
          if (!createLocationId) {
            showErrorAlert('영역 정보가 없습니다. 다시 시도해 주세요.');
            return;
          }
          const locIdAfter = String(createLocationId);
          const location = (locations || []).find(l => String(l.id) === locIdAfter) || null;
          const baseSlotsInSubmit = location?.feature?.baseSlots ?? slots?.productSlots?.baseSlots ?? 0;
          const cachedList = (locationProducts && (locationProducts[String(locIdAfter)] || locationProducts[locIdAfter])) || [];
          const productsInLocation = (cachedList && cachedList.length > 0)
            ? cachedList.filter(p => !p.isConsumed)
            : (products || []).filter(p => String(p.locationId) === String(locIdAfter) && !p.isConsumed);
          const usedCount = productsInLocation.length;
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
            purchase_at: purchaseDateObj.toISOString(),
            icon_url: uploadedIconUrl || null,
            expected_expire_at: estimatedEndDateObj ? estimatedEndDateObj.toISOString() : null,
            expire_at: expiryDateObj ? expiryDateObj.toISOString() : null,
          };
          const createRes = await createInventoryItemInSection(locIdAfter, body);
          const newId = createRes?.guest_inventory_item_id ? String(createRes.guest_inventory_item_id) : undefined;
          const created = {
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
            iconUrl: body.icon_url || null,
            isConsumed: false,
          };
          try { dispatch(upsertActiveProduct({ product: created })); } catch (e) {}
          try { emitEvent(EVENT_NAMES.PRODUCT_CREATED, { product: created }); } catch (e) {}
          if (availableAssigned && created.id) {
            try { dispatch(markProductSlotTemplateAsUsed({ templateId: availableAssigned.id, productId: created.id })); } catch (e) {}
          }
          navigation.goBack();
          return;
        }

        // edit
        if (!currentProduct?.id) return;
        const body = {
          guest_section_id: currentProduct.locationId ? Number(currentProduct.locationId) : null,
          name: productName,
          memo: memo || null,
          brand: brand || null,
          point_of_purchase: purchasePlace || null,
          purchase_price: price && String(price).trim() !== '' ? parseFloat(String(price)) : null,
          purchase_at: purchaseDateObj.toISOString(),
          icon_url: uploadedIconUrl || currentProduct.iconUrl || null,
          expected_expire_at: estimatedEndDateObj ? estimatedEndDateObj.toISOString() : null,
          expire_at: expiryDateObj ? expiryDateObj.toISOString() : null,
        };
        await updateInventoryItem(String(currentProduct.id), body);
        try {
          dispatch(patchProductById({
            id: String(currentProduct.id),
            patch: {
              iconUrl: body.icon_url,
              name: body.name,
              memo: body.memo,
              brand: body.brand,
              purchasePlace: body.point_of_purchase,
              price: body.purchase_price,
              purchaseDate: body.purchase_at,
              expiryDate: body.expire_at,
              estimatedEndDate: body.expected_expire_at,
            }
          }));
        } catch (e) {}
        // ✅ Event-driven refresh: 목록 refetch 없이 현재 아이템만 부분 업데이트
        try {
          emitEvent(EVENT_NAMES.PRODUCT_UPDATED, {
            id: String(currentProduct.id),
            patch: {
              iconUrl: body.icon_url,
              name: body.name,
              memo: body.memo,
              brand: body.brand,
              purchasePlace: body.point_of_purchase,
              price: body.purchase_price,
              purchaseDate: body.purchase_at,
              expiryDate: body.expire_at,
              estimatedEndDate: body.expected_expire_at,
            },
            locationId: currentProduct.locationId != null ? String(currentProduct.locationId) : null,
          });
        } catch (e) {}
        setScreenMode('view');
      } catch (e) {
        showErrorAlert(`저장 중 오류가 발생했습니다: ${e?.message || String(e)}`);
      }
    };

    return (
      <ScrollView style={styles.container}>
        <View style={styles.productHeader}>
          <View style={styles.imageContainer}>
            {imagePreviewUri ? (
              <Image source={{ uri: imagePreviewUri }} style={styles.productImage} resizeMode="cover" />
            ) : (
              <View style={styles.noImageContainer}>
                <Ionicons name={getCategoryIcon()} size={60} color="#4CAF50" />
                <Text style={styles.noImageText}>이미지 없음</Text>
              </View>
            )}
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.sectionTitle}>{isCreate ? '제품 등록' : '제품 수정'}</Text>
            <TouchableOpacity style={styles.formImageButton} onPress={pickImageForForm} disabled={imageUploading}>
              <Ionicons name="images-outline" size={18} color="#fff" />
              <Text style={styles.formImageButtonText}>{imageUploading ? '업로드 중...' : '이미지 선택'}</Text>
            </TouchableOpacity>
            <Text style={styles.formHint}>png, jpg, jpeg, gif, webp</Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <Text style={styles.formLabel}>제품명 *</Text>
          <TextInput style={styles.formInput} value={productName} onChangeText={setProductName} placeholder="제품명을 입력하세요" />

          {/* 날짜 입력: 웹은 텍스트, 앱(iOS/Android)은 DateTimePicker UI */}
          {Platform.OS === 'web' ? (
            <>
              <Text style={styles.formLabel}>구매일 (YYYY-MM-DD)</Text>
              <TextInput style={styles.formInput} value={purchaseDateText} onChangeText={setPurchaseDateText} placeholder="2026-01-03" />

              <Text style={styles.formLabel}>유통기한 (YYYY-MM-DD)</Text>
              <TextInput style={styles.formInput} value={expiryDateText} onChangeText={setExpiryDateText} placeholder="선택" />

              <Text style={styles.formLabel}>소진 예상일 (YYYY-MM-DD)</Text>
              <TextInput style={styles.formInput} value={estimatedEndDateText} onChangeText={setEstimatedEndDateText} placeholder="선택" />
            </>
          ) : (
            <>
              <Text style={styles.formLabel}>구매일</Text>
              <TouchableOpacity
                style={styles.datePickButton}
                onPress={() => setShowPurchaseDatePicker(true)}
              >
                <Text style={styles.datePickButtonText}>{formatDate(purchaseDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
              </TouchableOpacity>
              {showPurchaseDatePicker && DateTimePicker ? (
                <DateTimePicker
                  value={purchaseDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (Platform.OS !== 'ios') setShowPurchaseDatePicker(false);
                    if (!date) return;
                    setPurchaseDate(date);
                    setPurchaseDateText(formatYMD(date));
                  }}
                />
              ) : null}

              <Text style={styles.formLabel}>유통기한</Text>
              <TouchableOpacity
                style={styles.datePickButton}
                onPress={() => setShowExpiryDatePicker(true)}
              >
                <Text style={styles.datePickButtonText}>{expiryDate ? formatDate(expiryDate) : '날짜 선택'}</Text>
                <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
              </TouchableOpacity>
              {showExpiryDatePicker && DateTimePicker ? (
                <DateTimePicker
                  value={expiryDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (Platform.OS !== 'ios') setShowExpiryDatePicker(false);
                    if (date === undefined) return;
                    // 취소 시 date가 undefined로 올 수 있음
                    if (!date) return;
                    setExpiryDate(date);
                    setExpiryDateText(formatYMD(date));
                  }}
                />
              ) : null}

              <Text style={styles.formLabel}>소진 예상일</Text>
              <TouchableOpacity
                style={styles.datePickButton}
                onPress={() => setShowEstimatedEndDatePicker(true)}
              >
                <Text style={styles.datePickButtonText}>{estimatedEndDate ? formatDate(estimatedEndDate) : '날짜 선택'}</Text>
                <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
              </TouchableOpacity>
              {showEstimatedEndDatePicker && DateTimePicker ? (
                <DateTimePicker
                  value={estimatedEndDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (Platform.OS !== 'ios') setShowEstimatedEndDatePicker(false);
                    if (date === undefined) return;
                    if (!date) return;
                    setEstimatedEndDate(date);
                    setEstimatedEndDateText(formatYMD(date));
                  }}
                />
              ) : null}

              {Platform.OS === 'ios' ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  {showPurchaseDatePicker || showExpiryDatePicker || showEstimatedEndDatePicker ? (
                    <>
                      <TouchableOpacity
                        style={[styles.datePickerIosDone, { backgroundColor: '#E0E0E0' }]}
                        onPress={() => {
                          setShowPurchaseDatePicker(false);
                          setShowExpiryDatePicker(false);
                          setShowEstimatedEndDatePicker(false);
                        }}
                      >
                        <Text style={{ color: '#333', fontWeight: '700' }}>닫기</Text>
                      </TouchableOpacity>
                      <View />
                    </>
                  ) : null}
                </View>
              ) : null}
            </>
          )}

          <Text style={styles.formLabel}>브랜드</Text>
          <TextInput style={styles.formInput} value={brand} onChangeText={setBrand} placeholder="선택" />

          <Text style={styles.formLabel}>구매처</Text>
          <TextInput style={styles.formInput} value={purchasePlace} onChangeText={setPurchasePlace} placeholder="선택" />

          <Text style={styles.formLabel}>가격</Text>
          <TextInput style={styles.formInput} value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="숫자만 입력" />

          <Text style={styles.formLabel}>메모</Text>
          <TextInput style={[styles.formInput, styles.formTextArea]} value={memo} onChangeText={setMemo} placeholder="선택" multiline />

          <TouchableOpacity style={[styles.formSaveButton, !canSave && { opacity: 0.5 }]} disabled={!canSave} onPress={onSave}>
            <Text style={styles.formSaveButtonText}>{isCreate ? '등록' : '저장'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.formCancelButton} onPress={onCancel}>
            <Text style={styles.formCancelButtonText}>취소</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // create/edit 모드에서는 currentProduct가 없을 수 있으므로(특히 create),
  // 상세 계산 로직을 실행하지 않도록 가드해서 빈 화면(런타임 에러)을 방지합니다.
  const expiryPercentage = screenMode === 'view' ? calculateExpiryPercentage() : null;
  const consumptionPercentage = screenMode === 'view' ? calculateConsumptionPercentage() : null;
  const expiryDays = screenMode === 'view' ? calculateExpiryDays() : null;
  const consumptionDays = screenMode === 'view' ? calculateConsumptionDays() : null;
  
  // 소진 처리가 필요한지 확인 (남은 일수가 0일 이하인 경우)
  const needsConsumption = 
    (expiryDays !== null && expiryDays <= 0) || 
    (consumptionDays !== null && consumptionDays <= 0);
  
  // 정보 항목 컴포넌트
  const InfoItem = ({ label, value, icon }) => {
    // value가 없어도 항목을 표시하고 '정보 없음'으로 표시
    const displayValue = value || '정보 없음';
    
    return (
      <View style={styles.infoItem}>
        <View style={styles.infoItemLeft}>
          <Ionicons name={icon} size={20} color="#4CAF50" style={styles.infoIcon} />
          <Text style={styles.infoLabel}>{label}</Text>
        </View>
        <Text style={styles.infoValue}>{displayValue}</Text>
      </View>
    );
  };
  
  // 소진 처리 모달은 더 이상 필요하지 않으므로 제거
  // 소진 처리 모달 닫기 및 화면 이동
  const handleConsumedModalClose = () => {
    setShowConsumedModal(false);
    navigation.goBack();
  };


  
  // 달력에 표시할 날짜 생성
  const getMarkedDates = () => {
    const markedDates = [];
    
    // 유통기한 추가
    if (currentProduct.expiryDate) {
      markedDates.push({
        date: new Date(currentProduct.expiryDate),
        type: 'expiry',
        label: '유통기한'
      });
    }
    
    // 소진 예상일 추가
    if (currentProduct.estimatedEndDate) {
      markedDates.push({
        date: new Date(currentProduct.estimatedEndDate),
        type: 'end',
        label: '소진 예상일'
      });
    }
    
    return markedDates;
  };
  
  // 달력에 표시할 날짜 범위 생성
  const getDateRanges = () => {
    const dateRanges = [];
    
    // 구매일이 있는 경우에만 범위 추가
    if (currentProduct.purchaseDate) {
      const purchaseDate = new Date(currentProduct.purchaseDate);
      
      // 구매일 ~ 유통기한 범위 추가
      if (currentProduct.expiryDate) {
        dateRanges.push({
          startDate: purchaseDate,
          endDate: new Date(currentProduct.expiryDate),
          type: 'expiry',
          label: '구매일~유통기한'
        });
      }
      
      // 구매일 ~ 소진 예상일 범위 추가
      if (currentProduct.estimatedEndDate) {
        dateRanges.push({
          startDate: purchaseDate,
          endDate: new Date(currentProduct.estimatedEndDate),
          type: 'end',
          label: '구매일~소진예상'
        });
      }
    }
    
    return dateRanges;
  };
  
  // 유통기한 및 소진 예상일 정보 섹션에 달력 보기 버튼 추가
  const renderInfoSection = () => {
    return (
      <View style={styles.infoSection}>
        {/* 유통기한 정보 */}
        {currentProduct.expiryDate && (
          <View style={styles.hpSection}>
            <View style={styles.hpHeader}>
              <Ionicons name="calendar-outline" size={20} color="#2196F3" />
              <Text style={styles.hpTitle}>유통기한</Text>
              <Text style={styles.hpDate}>
                {new Date(currentProduct.expiryDate).toLocaleDateString()}
              </Text>
            </View>
            
            <HPBar 
              percentage={calculateExpiryPercentage() || 0} 
              type="expiry" 
            />
            
            <Text style={styles.hpText}>
              {expiryDays > 0 
                ? `유통기한까지 ${expiryDays}일 남았습니다.`
                : '유통기한이 지났습니다!'
              }
            </Text>
          </View>
        )}
        
        {/* 소진 예상일 정보 */}
        {currentProduct.estimatedEndDate && (
          <View style={styles.hpSection}>
            <View style={styles.hpHeader}>
              <Ionicons name="hourglass-outline" size={20} color="#4CAF50" />
              <Text style={styles.hpTitle}>소진 예상</Text>
              <Text style={styles.hpDate}>
                {new Date(currentProduct.estimatedEndDate).toLocaleDateString()}
              </Text>
            </View>
            
            <HPBar 
              percentage={calculateConsumptionPercentage() || 0} 
              type="consumption" 
            />
            
            <Text style={styles.hpText}>
              {consumptionDays > 0 
                ? `소진 예상일까지 ${consumptionDays}일 남았습니다.`
                : '소진 예상일이 지났습니다!'
              }
            </Text>
          </View>
        )}
        
        {/* 달력으로 보기 버튼 */}
        {(currentProduct.expiryDate || currentProduct.estimatedEndDate) && (
          <TouchableOpacity 
            style={styles.calendarButton}
            onPress={() => setShowCalendar(!showCalendar)}
          >
            <Ionicons 
              name={showCalendar ? "calendar" : "calendar-outline"} 
              size={20} 
              color="#4CAF50" 
            />
            <Text style={styles.calendarButtonText}>
              {showCalendar ? "달력 닫기" : "달력으로 보기"}
            </Text>
            <Ionicons 
              name={showCalendar ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#4CAF50" 
            />
          </TouchableOpacity>
        )}
        
        {/* 달력 렌더링 */}
        {showCalendar && (
          <CalendarView 
            currentMonth={currentMonth}
            onMonthChange={(newMonth) => setCurrentMonth(newMonth)}
            markedDates={getMarkedDates()}
            dateRanges={getDateRanges()}
          />
        )}
      </View>
    );
  };
  
  // 제품 상세 정보 렌더링
  const renderProductDetails = () => {
    return (
      <ScrollView style={styles.container}>
        {/* 제품 이미지 및 기본 정보 */}
        <View style={styles.productHeader}>
          <View style={styles.imageContainer}>
            {iconUri && !iconLoadFailed ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setImageViewerVisible(true)}
              >
              <Image 
                  source={{ uri: iconUri }} 
                style={styles.productImage} 
                resizeMode="cover"
                  onError={() => setIconLoadFailed(true)}
              />
              </TouchableOpacity>
            ) : (
              <View style={styles.noImageContainer}>
                <Ionicons 
                  name={getCategoryIcon()} 
                  size={60} 
                  color="#4CAF50" 
                />
                <Text style={styles.noImageText}>이미지 없음</Text>
              </View>
            )}
          </View>
          
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{currentProduct.name}</Text>
            
            {currentProduct.location && (
              <View style={styles.locationBadge}>
                <Ionicons name="location-outline" size={12} color="#4CAF50" />
                <Text style={styles.locationText}>
                  {/* location이 객체인 경우 title 속성 사용 */}
                  {currentProduct.location?.title || currentProduct.location}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* 유통기한 및 소진 예상일 정보 */}
        {renderInfoSection()}

        {/* 이미지 전체보기 모달 */}
        <Modal
          visible={imageViewerVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setImageViewerVisible(false)}
        >
          <View style={styles.imageViewerOverlay}>
            <TouchableOpacity
              style={styles.imageViewerClose}
              onPress={() => setImageViewerVisible(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.imageViewerBody}>
              {iconUri ? (
                <Image source={{ uri: iconUri }} style={styles.imageViewerImage} resizeMode="contain" />
              ) : null}
            </View>
          </View>
        </Modal>
        
        {/* 추가 정보 섹션 */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>제품 정보</Text>
          
          <InfoItem 
            label="등록일" 
            value={currentProduct.createdAt ? new Date(currentProduct.createdAt).toLocaleDateString() : null} 
            icon="time-outline" 
          />
          
          <InfoItem 
            label="구매일" 
            value={currentProduct.purchaseDate ? new Date(currentProduct.purchaseDate).toLocaleDateString() : null} 
            icon="calendar-outline" 
          />
          
          <InfoItem 
            label="브랜드" 
            value={currentProduct.brand || '정보 없음'} 
            icon="pricetag-outline" 
          />
          
          <InfoItem 
            label="구매처" 
            value={currentProduct.purchasePlace || '정보 없음'} 
            icon="cart-outline" 
          />
          
          <InfoItem 
            label="가격" 
            value={currentProduct.price ? `${currentProduct.price.toLocaleString()}원` : '정보 없음'} 
            icon="cash-outline" 
          />
          
          {currentProduct.memo && (
            <View style={styles.memoContainer}>
              <Text style={styles.memoLabel}>메모</Text>
              <Text style={styles.memoText}>{currentProduct.memo}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };
  
  // 알림 설정 탭은 아직 미구현(요청사항: 사용자에게 노출하지 않음)

  // 제품 상세 화면 렌더링
  return (
    <View style={styles.mainContainer}>
      {/* 헤더 */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {screenMode === 'create' ? '제품 등록' : (screenMode === 'edit' ? '제품 수정' : '제품 상세')}
        </Text>
        <View style={styles.headerRight} />
      </View>
      {/* 탭 메뉴 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'details' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('details')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'details' && styles.activeTabButtonText
          ]}>
            제품 상세
          </Text>
        </TouchableOpacity>
        {/* 알림 설정 탭 숨김 (미구현) */}
      </View>

      {/* 탭 내용 */}
      {(screenMode === 'edit' || screenMode === 'create') ? renderCreateEditForm() : renderProductDetails()}

      {/* 하단 액션 버튼 */}
      {(screenMode === 'view' && !isConsumed) && (
      <View style={styles.bottomActionBar}>
        {(() => {
          const tpl = (userLocationTemplateInstances || []).find(t => t.usedInLocationId === currentProduct.locationId);
          const isLocationExpired = tpl ? !isTemplateActive(tpl, subscription) : false;
          const onBlocked = (msg) => {
            setAlertModalConfig({
              title: '불가',
              message: msg || '이 영역 템플릿이 만료되어 이 작업을 수행할 수 없습니다. 제품 수정에서 영역 위치를 변경하세요.',
              buttons: [{ text: '확인' }],
              icon: 'alert-circle',
              iconColor: '#F44336'
            });
            setAlertModalVisible(true);
          };
          return (
            <>
        <TouchableOpacity 
          style={styles.bottomActionButton}
          onPress={handleEdit}
        >
          <Ionicons name="create-outline" size={24} color="#4CAF50" />
          <Text style={styles.bottomActionText}>수정</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
                style={[styles.bottomActionButton, isLocationExpired ? { opacity: 0.5 } : null]}
                onPress={() => isLocationExpired ? onBlocked('만료된 영역에서는 소진 처리를 할 수 없습니다.') : handleMarkAsConsumed()}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="#FF9800" />
          <Text style={styles.bottomActionText}>소진 처리</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
                style={[styles.bottomActionButton, isLocationExpired ? { opacity: 0.5 } : null]}
                onPress={() => isLocationExpired ? onBlocked('만료된 영역에서는 제품을 삭제할 수 없습니다.') : handleDelete()}
        >
          <Ionicons name="trash-outline" size={24} color="#F44336" />
          <Text style={styles.bottomActionText}>삭제</Text>
        </TouchableOpacity>
            </>
          );
        })()}
      </View>
      )}
      
      {/* 알림 모달 */}
      <AlertModal
        visible={alertModalVisible}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        content={alertModalConfig.content}
        buttons={alertModalConfig.buttons}
        onClose={() => setAlertModalVisible(false)}
        icon={alertModalConfig.icon}
        iconColor={alertModalConfig.iconColor}
      />
      
      {/* 소진 처리 성공 모달 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>{successModalConfig.title}</Text>
            <Text style={styles.successMessage}>{successModalConfig.message}</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={successModalConfig.onConfirm}
            >
              <Text style={styles.successButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* 날짜 선택 모달 */}
      {renderDatePicker()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 32,
  },
  formLabel: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  formInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formImageButton: {
    marginTop: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  formImageButtonText: {
    marginLeft: 6,
    color: '#fff',
    fontWeight: '700',
  },
  formHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  formSaveButton: {
    marginTop: 18,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  formSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  formCancelButton: {
    marginTop: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  formCancelButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '700',
  },
  datePickButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  datePickerIosDone: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loadingContainer: {
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  characterImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  brandCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  categoryName: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hpSectionContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  hpSection: {
    marginBottom: 16,
  },
  hpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hpTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hpIcon: {
    marginRight: 6,
  },
  hpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  hpDate: {
    fontSize: 14,
    color: '#666',
  },
  hpLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  hpLabel: {
    fontSize: 14,
    color: '#666',
  },
  hpPercentage: {
    fontSize: 14,
    fontWeight: '500',
  },
  hpBarContainer: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  hpBar: {
    height: '100%',
    borderRadius: 5,
  },
  remainingDays: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  memoSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#333',
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
  },
  memoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  // 소진 처리 버튼 스타일
  consumeButtonContainer: {
    padding: 16,
    marginTop: 16,
  },
  consumeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentConsumeButton: {
    backgroundColor: '#FF9800',
  },
  consumeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // 모달 스타일
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
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
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
  productHeader: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    resizeMode: 'cover',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  imageViewerClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    right: 16,
    zIndex: 2,
    padding: 8,
  },
  imageViewerBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 14,
    color: '#666',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  locationText: {
    fontSize: 10,
    color: '#4CAF50',
    marginLeft: 2,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
  },
  bottomActionBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  bottomActionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bottomActionText: {
    fontSize: 14,
    marginTop: 4,
    color: '#666',
  },
  detailsSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  memoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  memoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  buttonSection: {
    padding: 16,
    marginBottom: 16,
  },
  consumedButton: {
    backgroundColor: '#4CAF50',
  },
  hpText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  // 알림 설정 컨테이너 스타일 추가
  notificationsContainer: {
    padding: 16,
    paddingBottom: 80, // 하단 여백 추가
  },
  notificationsScrollContainer: {
    flex: 1,
  },
  // 날짜 선택 모달 스타일
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    alignItems: 'center',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  closeButton: {
    padding: 5,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 15,
    height: 200,
  },
  datePickerScrollWrapper: {
    position: 'relative',
    width: '100%',
    height: 150,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  datePickerScroll: {
    width: '100%',
    height: 150,
  },
  datePickerColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  datePickerLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  datePickerOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    height: 40, // 고정 높이 설정
  },
  datePickerOptionSelected: {
    backgroundColor: '#4CAF50',
  },
  datePickerOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  datePickerOptionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  selectedDateText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 15,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  datePickerCancelButton: {
    backgroundColor: '#E0E0E0',
  },
  datePickerCancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  datePickerConfirmButton: {
    backgroundColor: '#4CAF50',
  },
  datePickerConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  consumptionDateContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  consumptionDateLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  datePickerSelector: {
    display: 'none', // 선택 표시선 숨기기
  },

  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2F7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  calendarButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: 'bold',
    marginHorizontal: 5,
  },
});

export default ProductDetailScreen; 