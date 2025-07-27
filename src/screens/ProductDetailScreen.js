import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Button
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchProductById, deleteProductAsync, markProductAsConsumedAsync } from '../redux/slices/productsSlice';
import AlertModal from '../components/AlertModal';
import ProductNotificationSettings from '../components/ProductNotificationSettings';
import CalendarView from '../components/CalendarView';
import { 
  getDaysInMonth, 
  getFirstDayOfMonth, 
  generateMonthOptions, 
  generateDayOptions, 
  generateYearOptions,
  formatDate
} from '../utils/dateUtils';

// HP 바 컴포넌트
const HPBar = ({ percentage, type }) => {
  // percentage가 NaN이면 0으로 처리
  const safePercentage = isNaN(percentage) ? 0 : percentage;
  
  // HP 바 색상 계산
  const getHPColor = (value, type) => {
    if (type === 'expiry') {
      // 유통기한용 색상 (파란색 계열)
      if (value > 70) return '#2196F3'; // 파란색
      if (value > 30) return '#03A9F4'; // 밝은 파란색
      return '#F44336'; // 빨간색 (위험)
    } else {
      // 소진용 색상 (녹색 계열)
      if (value > 70) return '#4CAF50'; // 녹색
      if (value > 30) return '#FFC107'; // 노란색
      return '#FF9800'; // 주황색
    }
  };

  return (
    <View style={styles.hpBarContainer}>
      <View 
        style={[
          styles.hpBar, 
          { width: `${safePercentage}%`, backgroundColor: getHPColor(safePercentage, type) }
        ]} 
      />
    </View>
  );
};

const ProductDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { productId } = route.params;
  const { currentProduct, status, error } = useSelector(state => state.products);
  
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
  
  // 소진 처리에 사용할 날짜 상태 (별도로 관리)
  const [consumptionDate, setConsumptionDate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    day: new Date().getDate()
  });
  
  // 활성화된 탭 상태
  const [activeTab, setActiveTab] = useState('details'); // 'details' 또는 'notifications'
  
  // 달력 표시 상태
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  useEffect(() => {
    dispatch(fetchProductById(productId));
  }, [dispatch, productId]);

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
            
            // 소진 처리 API 호출
            dispatch(markProductAsConsumedAsync({ 
              id: currentProduct.id, 
              consumedDate: date.toISOString() 
            }))
              .unwrap()
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
  
  // 제품 데이터가 로딩 중일 경우 로딩 화면 표시
  if (status === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }
  
  // 에러가 발생한 경우 에러 메시지 표시
  if (status === 'failed') {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>오류: {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => dispatch(fetchProductById(productId))}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // 제품 데이터가 없을 경우 메시지 표시
  if (!currentProduct) {
    return (
      <View style={styles.loadingContainer}>
        <Text>제품을 찾을 수 없습니다.</Text>
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

  // 카테고리에 맞는 아이콘 선택
  const getCategoryIcon = () => {
    const categoryIcons = {
      '식품': 'fast-food',
      '화장품': 'color-palette',
      '세제': 'water',
      '욕실용품': 'water-outline',
      '주방용품': 'restaurant',
    };
    
    // category가 객체인 경우 name 속성 사용
    const categoryName = currentProduct.category?.name || currentProduct.category;
    return categoryIcons[categoryName] || 'cube-outline';
  };
  
  // 제품 삭제 처리
  const handleDelete = () => {
    setAlertModalConfig({
      title: '제품 삭제',
      message: '정말 이 제품을 삭제하시겠습니까?',
      buttons: [
        { text: '취소', style: 'cancel' },
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
  
  // 제품 수정 화면으로 이동
  const handleEdit = () => {
            navigation.navigate('ProductForm', { mode: 'edit', productId: currentProduct.id });
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

  const expiryPercentage = calculateExpiryPercentage();
  const consumptionPercentage = calculateConsumptionPercentage();
  const expiryDays = calculateExpiryDays();
  const consumptionDays = calculateConsumptionDays();
  
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
            {currentProduct.image ? (
              <Image 
                source={{ uri: currentProduct.image }} 
                style={styles.productImage} 
                resizeMode="cover"
              />
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
            {currentProduct.category && (
            <Text style={styles.productCategory}>
              {/* category가 객체인 경우 name 속성 사용 */}
              {currentProduct.category?.name || currentProduct.category}
            </Text>
            )}
            
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
        
        {/* 추가 정보 섹션 */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>제품 정보</Text>
          
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
  
  // 알림 설정 탭 내용 렌더링
  const renderNotificationsTab = () => (
    <ScrollView style={styles.notificationsScrollContainer}>
      <View style={styles.notificationsContainer}>
        <ProductNotificationSettings 
          productId={productId}
          product={currentProduct}
        />
      </View>
    </ScrollView>
  );

  // 제품 상세 화면 렌더링
  return (
    <View style={styles.mainContainer}>
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

      {/* 탭 내용 */}
      {activeTab === 'details' ? (
        renderProductDetails()
      ) : (
        renderNotificationsTab()
      )}

      {/* 하단 액션 버튼 */}
      <View style={styles.bottomActionBar}>
        <TouchableOpacity 
          style={styles.bottomActionButton}
          onPress={handleEdit}
        >
          <Ionicons name="create-outline" size={24} color="#4CAF50" />
          <Text style={styles.bottomActionText}>수정</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.bottomActionButton}
          onPress={handleMarkAsConsumed}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="#FF9800" />
          <Text style={styles.bottomActionText}>소진 처리</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.bottomActionButton}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={24} color="#F44336" />
          <Text style={styles.bottomActionText}>삭제</Text>
        </TouchableOpacity>
      </View>
      
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