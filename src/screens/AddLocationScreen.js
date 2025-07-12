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
  Image,
  Modal,
  ActivityIndicator,
  Switch
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addLocation, updateLocation } from '../redux/slices/locationsSlice';
import { addNotification } from '../redux/slices/notificationsSlice';
import AlertModal from '../components/AlertModal';
import SignupPromptModal from '../components/SignupPromptModal';
import IconSelector from '../components/IconSelector';
import { checkAnonymousLimits } from '../utils/authUtils';

// 조건부 ImagePicker 임포트
let ImagePicker;
if (Platform.OS !== 'web') {
  // 네이티브 환경에서만 임포트
  ImagePicker = require('expo-image-picker');
}

// 사용 가능한 아이콘 목록
const availableIcons = [
  'home-outline',
  'restaurant-outline',
  'water-outline',
  'bed-outline',
  'desktop-outline',
  'shirt-outline',
  'tv-outline',
  'book-outline',
  'fitness-outline',
  'cube-outline',
  'paw-outline',
  'car-outline',
  'medical-outline',
  'briefcase-outline',
  'flower-outline'
];

const AddLocationScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const { status } = useSelector(state => state.locations);
  const { isAnonymous } = useSelector(state => state.auth);
  const { locations } = useSelector(state => state.locations);
  
  // 스크롤 뷰 참조
  const scrollViewRef = useRef(null);
  
  // 입력 필드 참조
  const titleInputRef = useRef(null);
  
  // 수정 모드 확인
  const isEditing = route.params?.isEditing || false;
  const locationToEdit = route.params?.location || null;
  
  // 상태
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('cube-outline');
  const [selectedColor, setSelectedColor] = useState('#4CAF50');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // 폼 유효성 검사 상태
  const [touched, setTouched] = useState({ title: false });
  const [errors, setErrors] = useState({ title: '' });
  
  // 모달 상태
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredLocation, setRegisteredLocation] = useState(null);
  
  // 커스텀 알림 모달 상태
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: '',
    iconColor: ''
  });

  // 회원가입 유도 모달 상태
  const [signupPromptVisible, setSignupPromptVisible] = useState(false);
  const [signupPromptMessage, setSignupPromptMessage] = useState('');
  const [limitInfo, setLimitInfo] = useState({ currentCount: 0, maxCount: 1 });

  // 수정 모드일 경우 기존 데이터 로드
  useEffect(() => {
    if (isEditing && locationToEdit) {
      setTitle(locationToEdit.title || '');
      setDescription(locationToEdit.description || '');
      setSelectedIcon(locationToEdit.icon || 'cube-outline');
      setSelectedColor(locationToEdit.color || '#4CAF50');
      
      // 알림 설정 관련 코드 제거 (알림 설정은 별도 화면에서 관리)
    }
  }, [isEditing, locationToEdit]);

  // 화면 진입 시 비회원 제한 확인 (수정 모드가 아닐 때만)
  useEffect(() => {
    if (!isEditing) {
      checkLocationLimits();
    }
  }, [isEditing, isAnonymous]);

  // 비회원 영역 제한 확인
  const checkLocationLimits = async () => {
    if (isAnonymous) {
      const limitResult = await checkAnonymousLimits('locations');
      
      if (limitResult.isLimited) {
        setSignupPromptMessage(limitResult.message);
        setLimitInfo({
          currentCount: limitResult.currentCount,
          maxCount: limitResult.maxCount
        });
        setSignupPromptVisible(true);
      }
    }
  };

  // 필드 유효성 검사 함수
  const validateField = (name, value) => {
    let errorMessage = '';
    
    switch (name) {
      case 'title':
        if (!value.trim()) {
          errorMessage = '영역 제목을 입력해주세요';
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
      case 'title':
        setTitle(value);
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

  // 폼 유효성 검사
  const isFormValid = () => {
    // 모든 필수 필드에 대해 유효성 검사 수행
    const newErrors = {
      title: validateField('title', title)
    };
    
    // 에러 상태 업데이트
    setErrors(newErrors);
    
    // 모든 필드가 터치되었음을 표시
    setTouched({
      title: true
    });
    
    // 에러가 있는지 확인
    const hasErrors = Object.values(newErrors).some(error => error !== '');
    
    // 에러가 있으면 해당 필드로 스크롤
    if (hasErrors) {
      if (newErrors.title) {
        scrollToField('title');
      }
    }
    
    return !hasErrors;
  };
  
  // 특정 필드로 스크롤하는 함수
  const scrollToField = (fieldName) => {
    if (scrollViewRef.current) {
      switch (fieldName) {
        case 'title':
          if (titleInputRef.current) {
            titleInputRef.current.measure((fx, fy, width, height, px, py) => {
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
  
  // 알림 표시 함수
  const showAlert = (title, message) => {
    setAlertModalConfig({
      title,
      message,
      buttons: [{ text: '확인', style: 'default' }],
      icon: 'information-circle',
      iconColor: '#4CAF50'
    });
    setAlertModalVisible(true);
  };
  
  // 오류 알림 표시
  const showErrorAlert = (message) => {
    Alert.alert('오류', message, [{ text: '확인', style: 'default' }]);
  };
  
  // 이미지 선택 핸들러 (네이티브)
  const pickImageNative = async () => {
    if (!ImagePicker) return;
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      showAlert('권한 오류', '갤러리 접근 권한이 필요합니다.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    
    if (!result.cancelled && result.assets && result.assets[0]) {
      // 현재 이미지 처리 기능은 구현되지 않았음
      showAlert('알림', '현재 버전에서는 이미지 업로드가 지원되지 않습니다.');
    }
  };
  
  // 이미지 선택 핸들러 (웹)
  const pickImageWeb = () => {
    showAlert('알림', '현재 버전에서는 이미지 업로드가 지원되지 않습니다.');
  };
  
  // 플랫폼에 따른 이미지 선택 함수
  const pickImage = () => {
    if (Platform.OS === 'web') {
      pickImageWeb();
    } else {
      pickImageNative();
    }
  };

  // 제출 처리
  const handleSubmit = async () => {
    // 폼 유효성 검사
    if (!isFormValid()) {
      return;
    }
    
    // 비회원 사용자의 영역 개수 제한 확인
    if (isAnonymous && !isEditing) {
      const limitResult = await checkAnonymousLimits('locations');
      if (limitResult.isLimited) {
        setLimitInfo({ currentCount: limitResult.currentCount, maxCount: limitResult.maxCount });
        setSignupPromptMessage(`무료 영역 등록은 ${limitResult.maxCount}개까지 가능합니다. 더 많은 영역을 등록하려면 회원가입이 필요합니다.`);
        setSignupPromptVisible(true);
        return;
      }
    }
    
    // 영역 데이터 구성
    const locationData = {
      title,
      description,
      icon: selectedIcon,
      color: selectedColor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (isEditing) {
      // 수정 모드: 기존 ID 포함
      const updatedLocation = {
        ...locationData,
        id: locationToEdit.id
      };
      
      dispatch(updateLocation(updatedLocation))
        .unwrap()
        .then((result) => {
          setRegisteredLocation(result);
          setShowSuccessModal(true);
        })
        .catch((error) => {
          showErrorAlert(`영역 수정에 실패했습니다: ${error.message}`);
        });
    } else {
      // 신규 등록 모드
      dispatch(addLocation(locationData))
        .unwrap()
        .then((result) => {
          setRegisteredLocation(result);
          setShowSuccessModal(true);
        })
        .catch((error) => {
          showErrorAlert(`영역 등록에 실패했습니다: ${error.message}`);
        });
    }
  };
  
  // 성공 모달 닫기 및 화면 이동
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  // 회원가입 유도 모달 닫기
  const handleSignupPromptClose = () => {
    setSignupPromptVisible(false);
    navigation.goBack();
  };

  // 아이콘 선택 컴포넌트 제거 (외부 컴포넌트로 대체)
  
  // 등록/수정 성공 모달
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
          
          <Text style={styles.successTitle}>{isEditing ? '수정 완료!' : '등록 완료!'}</Text>
          
          <Text style={styles.successMessage}>
            "{registeredLocation?.title}" 영역이 성공적으로 {isEditing ? '수정' : '등록'}되었습니다.
          </Text>
          
          <View style={styles.locationInfoContainer}>
            {registeredLocation?.description && (
              <View style={styles.locationInfoRow}>
                <Text style={styles.locationInfoLabel}>설명:</Text>
                <Text style={styles.locationInfoValue}>{registeredLocation.description}</Text>
              </View>
            )}
            
            <View style={styles.locationInfoRow}>
              <Text style={styles.locationInfoLabel}>아이콘:</Text>
              <View style={styles.iconPreview}>
                <Ionicons 
                  name={registeredLocation?.icon || 'cube-outline'} 
                  size={24} 
                  color="#4CAF50" 
                />
              </View>
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
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        removeClippedSubviews={false}
      >
        <Text style={styles.title}>{isEditing ? '영역 수정' : '영역 추가'}</Text>
        
        {/* 영역 제목 입력 */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>영역 제목</Text>
            <Text style={styles.requiredMark}>*</Text>
          </View>
          <TextInput
            ref={titleInputRef}
            style={[
              styles.input,
              touched.title && errors.title ? styles.inputError : null
            ]}
            value={title}
            onChangeText={(text) => handleFieldChange('title', text)}
            onBlur={() => handleFieldBlur('title', title)}
            placeholder="예: 주방, 화장실, 거실 등"
          />
          {touched.title && errors.title ? (
            <Text style={styles.errorText}>{errors.title}</Text>
          ) : null}
        </View>
        
        {/* 영역 설명 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>영역 설명</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="영역에 대한 설명을 입력하세요 (선택사항)"
            multiline
            numberOfLines={4}
          />
        </View>
        
        {/* 아이콘 선택 */}
        <IconSelector 
          icons={availableIcons}
          selectedIcon={selectedIcon}
          onSelectIcon={setSelectedIcon}
        />
        
        {/* 이미지 선택 (향후 구현) */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>대표 이미지 (선택사항)</Text>
          <Text style={styles.imageDescription}>
            현재 버전에서는 이미지 업로드가 지원되지 않습니다.
          </Text>
        </View>
        
        {/* 비회원 안내 메시지 */}
        {isAnonymous && !isEditing && (
          <View style={styles.anonymousInfoContainer}>
            <Ionicons name="information-circle" size={20} color="#2196F3" style={styles.infoIcon} />
            <Text style={styles.anonymousInfoText}>
              비회원은 영역을 1개만 추가할 수 있습니다. 현재 {locations.length}/1
            </Text>
          </View>
        )}
        
        {/* 등록/수정 버튼 */}
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditing ? '영역 수정하기' : '영역 등록하기'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      
      {/* 성공 모달 */}
      <SuccessModal />
      
      {/* 커스텀 알림 모달 */}
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
        visible={signupPromptVisible}
        onClose={handleSignupPromptClose}
        message={signupPromptMessage}
        currentCount={limitInfo.currentCount}
        maxCount={limitInfo.maxCount}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
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
  },
  requiredMark: {
    color: 'red',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  iconSelectorContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    color: '#333',
  },
  iconsList: {
    paddingVertical: 8,
  },
  iconItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedIconItem: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  imageSection: {
    marginBottom: 20,
  },
  imageDescription: {
    color: '#666',
    fontSize: 14,
    marginBottom: 8,
  },
  anonymousInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoIcon: {
    marginRight: 8,
  },
  anonymousInfoText: {
    color: '#0D47A1',
    fontSize: 14,
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  locationInfoContainer: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  locationInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  locationInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 60,
  },
  locationInfoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  iconPreview: {
    width: 36,
    height: 36,
    backgroundColor: '#f0f0f0',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  successButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
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
  notificationHelp: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
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
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
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

export default AddLocationScreen; 