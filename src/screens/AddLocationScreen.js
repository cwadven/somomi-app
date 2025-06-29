import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { addLocation } from '../redux/slices/locationsSlice';

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
  const { status } = useSelector(state => state.locations);
  
  // 폼 상태
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('cube-outline');
  const [image, setImage] = useState(null);
  
  // 등록 성공 모달
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredLocation, setRegisteredLocation] = useState(null);

  // 폼 유효성 검사
  const isFormValid = () => {
    if (!title.trim()) {
      Alert.alert('알림', '영역 제목을 입력해주세요.');
      return false;
    }
    
    return true;
  };

  // 이미지 선택 핸들러 (네이티브)
  const pickImageNative = async () => {
    if (!ImagePicker) return;
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('권한 오류', '갤러리 접근 권한이 필요합니다.');
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

  // 영역 등록 처리
  const handleSubmit = () => {
    if (!isFormValid()) return;
    
    const newLocation = {
      title,
      description,
      icon: selectedIcon,
      image,
    };
    
    dispatch(addLocation(newLocation))
      .unwrap()
      .then((result) => {
        // 등록된 영역 정보 저장 및 성공 모달 표시
        setRegisteredLocation(result);
        setShowSuccessModal(true);
      })
      .catch((error) => {
        Alert.alert('오류', `영역 등록에 실패했습니다: ${error.message}`);
      });
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
            "{registeredLocation?.title}" 영역이 성공적으로 등록되었습니다.
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
        <Text style={styles.title}>영역 추가</Text>
        
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
          <Text style={styles.label}>영역 설명 (선택)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="이 영역에 대한 설명을 입력하세요"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
        
        {/* 아이콘 선택 */}
        <IconSelector />
        
        {/* 이미지 선택 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>영역 이미지 (선택)</Text>
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={40} color="#CCCCCC" />
                <Text style={styles.imagePlaceholderText}>이미지 선택</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        {/* 등록 버튼 */}
        <TouchableOpacity 
          style={[
            styles.submitButton,
            status === 'loading' && styles.disabledButton
          ]} 
          onPress={handleSubmit}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={[styles.submitButtonText, styles.loadingText]}>등록 중...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>영역 등록</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      
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
  iconSelectorContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  iconsList: {
    flexDirection: 'row',
    paddingVertical: 8,
    flexWrap: 'wrap',
  },
  iconItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedIconItem: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  imagePickerButton: {
    width: '100%',
    height: 150,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#999',
    fontSize: 14,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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