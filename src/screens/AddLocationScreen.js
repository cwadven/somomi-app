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
  Image,
  Modal,
  ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addLocation, updateLocation } from '../redux/slices/locationsSlice';
import AlertModal from '../components/AlertModal';

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
  
  // 수정 모드 확인
  const isEditing = route.params?.isEditing || false;
  const locationToEdit = route.params?.location || null;
  
  // 폼 상태
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('cube-outline');
  const [image, setImage] = useState(null);
  
  // 등록/수정 성공 모달
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

  // 수정 모드일 경우 기존 데이터 로드
  useEffect(() => {
    if (isEditing && locationToEdit) {
      setTitle(locationToEdit.title || '');
      setDescription(locationToEdit.description || '');
      setSelectedIcon(locationToEdit.icon || 'cube-outline');
      setImage(locationToEdit.image || null);
    }
  }, [isEditing, locationToEdit]);

  // 폼 유효성 검사
  const isFormValid = () => {
    if (!title.trim()) {
      showAlert('알림', '영역 제목을 입력해주세요.');
      return false;
    }
    
    return true;
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
      setImage(result.assets[0].uri);
    }
  };
  
  // 이미지 선택 핸들러 (웹)
  const pickImageWeb = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImage(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  };
  
  // 플랫폼에 따른 이미지 선택 함수
  const pickImage = () => {
    if (Platform.OS === 'web') {
      pickImageWeb();
    } else {
      pickImageNative();
    }
  };

  // 영역 등록/수정 처리
  const handleSubmit = () => {
    if (!isFormValid()) return;
    
    const locationData = {
      title,
      description,
      icon: selectedIcon,
      image,
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

  // 아이콘 선택 컴포넌트
  const IconSelector = () => (
    <View style={styles.iconSelectorContainer}>
      <Text style={styles.sectionTitle}>아이콘 선택</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.iconsList}
      >
        {availableIcons.map((icon, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.iconItem,
              selectedIcon === icon && styles.selectedIconItem
            ]}
            onPress={() => setSelectedIcon(icon)}
          >
            <Ionicons 
              name={icon} 
              size={24} 
              color={selectedIcon === icon ? '#fff' : '#4CAF50'} 
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
  
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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>{isEditing ? '영역 수정' : '영역 추가'}</Text>
        
        {/* 영역 제목 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>영역 제목 *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="예: 주방, 화장실, 거실 등"
          />
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
        <IconSelector />
        
        {/* 이미지 선택 (향후 구현) */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>대표 이미지 (선택사항)</Text>
          <Text style={styles.imageDescription}>
            현재 버전에서는 이미지 업로드가 지원되지 않습니다.
          </Text>
        </View>
        
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
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
  },
  locationInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 80,
  },
  locationInfoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  iconPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
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

export default AddLocationScreen; 