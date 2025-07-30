import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createLocation, updateLocation } from '../redux/slices/locationsSlice';
import { markTemplateInstanceAsUsed, addTemplateInstance } from '../redux/slices/authSlice';
import IconSelector from '../components/IconSelector';
import AlertModal from '../components/AlertModal';

const AddLocationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  
  // 수정 모드 여부 확인
  const isEditMode = route.params?.isEditMode || false;
  const locationToEdit = route.params?.location;
  
  // 템플릿 인스턴스 목록 가져오기
  const { userLocationTemplateInstances } = useSelector(state => state.auth);
  
  // 사용 가능한 템플릿 인스턴스만 필터링
  const availableTemplates = userLocationTemplateInstances.filter(template => !template.used);
  
  // 사용자의 템플릿 인스턴스 목록 콘솔 출력
  useEffect(() => {
    console.log('사용자의 현재 템플릿 인스턴스 목록:', userLocationTemplateInstances);
    console.log('사용 가능한 템플릿 인스턴스 목록:', availableTemplates);
    console.log('사용 중인 템플릿 인스턴스 목록:', userLocationTemplateInstances.filter(template => template.used));
  }, [userLocationTemplateInstances, availableTemplates]);
  
  // 뒤로 가기 핸들러
  const handleGoBack = () => {
    navigation.goBack();
  };

  // 템플릿 인스턴스를 productId별로 그룹화
  const groupedTemplates = availableTemplates.reduce((groups, template) => {
    const { productId } = template;
    if (!groups[productId]) {
      groups[productId] = [];
    }
    groups[productId].push(template);
    return groups;
  }, {});
  
  // 상태 관리
  const [selectedTemplateInstance, setSelectedTemplateInstance] = useState(null);
  const [locationData, setLocationData] = useState({
    title: isEditMode && locationToEdit ? locationToEdit.title : '',
    description: isEditMode && locationToEdit ? locationToEdit.description : '',
    icon: isEditMode && locationToEdit ? locationToEdit.icon : 'cube-outline',
  });
  const [isIconSelectorVisible, setIsIconSelectorVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: '',
    iconColor: '',
  });
  
  // 선택된 템플릿이 있으면 기본 정보 설정 (생성 모드에서만)
  useEffect(() => {
    if (selectedTemplateInstance && !isEditMode) {
      setLocationData({
        ...locationData,
        title: selectedTemplateInstance.name,
        description: selectedTemplateInstance.description,
        icon: selectedTemplateInstance.icon,
      });
    }
  }, [selectedTemplateInstance, isEditMode]);

  // 첫 번째 템플릿을 자동으로 선택 (생성 모드에서만)
  useEffect(() => {
    if (availableTemplates.length > 0 && !selectedTemplateInstance && !isEditMode) {
      setSelectedTemplateInstance(availableTemplates[0]);
    }
  }, [availableTemplates, selectedTemplateInstance, isEditMode]);
  
  // 입력값 변경 핸들러
  const handleInputChange = (key, value) => {
    setLocationData({
      ...locationData,
      [key]: value
    });
  };
  
  // 아이콘 선택 핸들러
  const handleIconSelect = (icon) => {
    setLocationData({
      ...locationData,
      icon
    });
    setIsIconSelectorVisible(false);
  };
  
  // 템플릿 인스턴스 선택 핸들러
  const handleTemplateSelect = (template) => {
    setSelectedTemplateInstance(template);
  };
  
  // 영역 생성/수정 버튼 클릭 핸들러
  const handleCreateLocation = async () => {
    // 필수 입력값 검증
    if (!locationData.title.trim()) {
      setAlertModalConfig({
        title: '입력 오류',
        message: '영역 이름을 입력해주세요.',
        buttons: [
          { text: '확인' }
        ],
        icon: 'alert-circle',
        iconColor: '#F44336'
      });
      setAlertModalVisible(true);
      return;
    }
    
    // 수정 모드가 아니고 템플릿이 선택되지 않은 경우에만 검증
    if (!selectedTemplateInstance && !isEditMode) {
      setAlertModalConfig({
        title: '선택 오류',
        message: '템플릿을 선택해주세요.',
        buttons: [
          { text: '확인' }
        ],
        icon: 'alert-circle',
        iconColor: '#F44336'
      });
      setAlertModalVisible(true);
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isEditMode) {
        // 영역 수정 로직
        console.log('영역 수정 시작:', {
          locationData,
          locationId: locationToEdit.id
        });
        
        // 영역 수정 API 호출
        const updatedLocation = await dispatch(updateLocation({
          id: locationToEdit.id,
          title: locationData.title,
          description: locationData.description,
          icon: locationData.icon,
          // 기존 데이터 유지
          templateInstanceId: locationToEdit.templateInstanceId,
          productId: locationToEdit.productId,
          feature: locationToEdit.feature
        })).unwrap();
        
        console.log('영역 수정 성공:', updatedLocation);
        
        setIsLoading(false);
        
        // 성공 메시지 표시 후 내 영역 탭으로 이동
        setAlertModalConfig({
          title: '성공',
          message: '영역이 성공적으로 수정되었습니다.',
          buttons: [
            {
              text: '확인',
              onPress: () => {
                // 스택의 최상위 화면(영역 목록)으로 이동
                navigation.popToTop();
              }
            }
          ],
          icon: 'checkmark-circle',
          iconColor: '#4CAF50'
        });
        setAlertModalVisible(true);
      } else {
        // 영역 생성 로직
        console.log('영역 생성 시작:', {
          locationData,
          selectedTemplateInstance
        });
        
        // 영역 생성 API 호출
        const result = await dispatch(createLocation({
          ...locationData,
          templateInstanceId: selectedTemplateInstance.id,
          productId: selectedTemplateInstance.productId,
          feature: selectedTemplateInstance.feature
        })).unwrap();
        
        console.log('영역 생성 성공:', result);
        
        // 생성된 영역 ID로 템플릿 인스턴스를 사용됨으로 표시
        dispatch(markTemplateInstanceAsUsed({
          templateId: selectedTemplateInstance.id,
          locationId: result.id
        }));
        
        setIsLoading(false);
        
        // 영역 목록 화면으로 돌아가기
        console.log('영역 생성 완료, 영역 목록 화면으로 이동');
        
        // 성공 메시지 표시 후 내 영역 탭으로 이동
        setAlertModalConfig({
          title: '성공',
          message: '영역이 성공적으로 생성되었습니다.',
          buttons: [
            {
              text: '확인',
              onPress: () => {
                // 스택의 최상위 화면(영역 목록)으로 이동
                navigation.popToTop();
              }
            }
          ],
          icon: 'checkmark-circle',
          iconColor: '#4CAF50'
        });
        setAlertModalVisible(true);
      }
    } catch (error) {
      setIsLoading(false);
      console.error('영역 처리 실패:', error);
      setAlertModalConfig({
        title: '오류',
        message: isEditMode ? '영역 수정 중 오류가 발생했습니다.' : '영역 생성 중 오류가 발생했습니다.',
        buttons: [
          { text: '확인' }
        ],
        icon: 'close-circle',
        iconColor: '#F44336'
      });
      setAlertModalVisible(true);
    }
  };
  
  // baseSlots 값을 표시하는 함수
  const renderSlotCount = (baseSlots) => {
    if (baseSlots === -1) {
      return '무제한';
    }
    return `${baseSlots}개`;
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? '영역 수정' : '영역 생성'}</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.container}>
        {/* 템플릿 선택 섹션 (생성 모드에서만 표시) */}
        {!isEditMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>템플릿 선택</Text>
            <Text style={styles.sectionDescription}>
              영역을 생성할 템플릿을 선택하세요. 템플릿에 따라 제공되는 기능이 다릅니다.
            </Text>
            
            {Object.entries(groupedTemplates).map(([productId, templates]) => {
              // 해당 productId의 첫 번째 템플릿에서 공통 정보 가져오기
              const { name, description, icon } = templates[0];
              
              return (
                <View key={productId} style={styles.templateGroup}>
                  <View style={styles.templateGroupHeader}>
                    <View style={styles.templateIconContainer}>
                      <Ionicons name={icon} size={24} color="#4CAF50" />
                    </View>
                    <View style={styles.templateGroupInfo}>
                      <Text style={styles.templateGroupName}>{name}</Text>
                      <Text style={styles.templateGroupDescription}>{description}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.templateOptions}>
                    {templates.map(template => (
                      <TouchableOpacity
                        key={template.id}
                        style={[
                          styles.templateOption,
                          selectedTemplateInstance?.id === template.id && styles.selectedTemplateOption
                        ]}
                        onPress={() => handleTemplateSelect(template)}
                      >
                        <Text style={styles.templateOptionTitle}>
                          기본 슬롯: {renderSlotCount(template.feature.baseSlots)}
                        </Text>
                        {selectedTemplateInstance?.id === template.id && (
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        
        {/* 영역 정보 입력 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>영역 정보</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>이름</Text>
            <TextInput
              style={styles.input}
              value={locationData.title}
              onChangeText={(text) => handleInputChange('title', text)}
              placeholder="영역 이름을 입력하세요"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>설명 (선택사항)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={locationData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="영역에 대한 설명을 입력하세요"
              multiline
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>아이콘</Text>
            <TouchableOpacity
              style={styles.iconSelector}
              onPress={() => setIsIconSelectorVisible(true)}
            >
              <View style={styles.selectedIconContainer}>
                <Ionicons name={locationData.icon} size={24} color="#4CAF50" />
              </View>
              <Text style={styles.iconSelectorText}>아이콘 선택</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 영역 생성/수정 버튼 */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateLocation}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>
              {isEditMode ? '영역 수정' : '영역 생성'}
            </Text>
          )}
        </TouchableOpacity>
        
        {/* 아이콘 선택 모달 */}
        <IconSelector
          visible={isIconSelectorVisible}
          onClose={() => setIsIconSelectorVisible(false)}
          onSelect={handleIconSelect}
          selectedIcon={locationData.icon}
        />
        
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    height: 56,
    paddingHorizontal: 16,
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
    width: 40,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  iconSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconSelectorText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  templateGroup: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  templateGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  templateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  templateGroupInfo: {
    flex: 1,
  },
  templateGroupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  templateGroupDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  templateOptions: {
    padding: 12,
  },
  templateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedTemplateOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  templateOptionTitle: {
    fontSize: 15,
    color: '#333',
  },
  emptyTemplates: {
    padding: 16,
    alignItems: 'center',
  },
  emptyTemplatesText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  storeButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  storeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default AddLocationScreen; 