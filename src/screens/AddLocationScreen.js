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
import { markTemplateInstanceAsUsed, releaseTemplateInstance, addTemplateInstance, assignProductSlotTemplatesToLocation, unassignProductSlotTemplate, releaseProductSlotTemplateByProduct } from '../redux/slices/authSlice';
import { useSelector as useReduxSelector } from 'react-redux';
import { fetchProductsByLocation } from '../redux/slices/productsSlice';
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
  const { userLocationTemplateInstances, slots, userProductSlotTemplateInstances } = useSelector(state => state.auth);
  const additionalProductSlots = slots?.productSlots?.additionalSlots || 0;
  const { locationProducts } = useSelector(state => state.products);
  
  // 사용 가능한 템플릿 인스턴스만 필터링
  const availableTemplates = userLocationTemplateInstances.filter(template => !template.used);
  const currentTemplate = isEditMode && locationToEdit
    ? userLocationTemplateInstances.find(t => t.id === locationToEdit.templateInstanceId)
    : null;
  const currentLocationProducts = isEditMode && locationToEdit ? (locationProducts?.[locationToEdit.id] || []) : [];
  const currentProductCount = currentLocationProducts.length;
  const currentProductIdSet = new Set(currentLocationProducts.map(p => p.id));
  const usedProductSlotTemplatesInThisLocation = (userProductSlotTemplateInstances || []).filter(t => t.used && currentProductIdSet.has(t.usedByProductId)).length;
  const assignedProductSlotTemplatesForThisLocation = (isEditMode && locationToEdit)
    ? (userProductSlotTemplateInstances || []).filter(t => t.assignedLocationId === locationToEdit.id)
    : [];
  const assignedCountForThisLocation = assignedProductSlotTemplatesForThisLocation.length;
  const availableProductSlotTemplates = (userProductSlotTemplateInstances || []).filter(t => !t.used && !t.assignedLocationId);
  
  // 사용자의 템플릿 인스턴스 목록 콘솔 출력 및 템플릿 부족 확인
  useEffect(() => {
    // 컴포넌트 마운트 시 한 번만 실행되는 로직
    const checkTemplates = () => {
      console.log('사용자의 현재 템플릿 인스턴스 목록:', userLocationTemplateInstances);
      console.log('사용 가능한 템플릿 인스턴스 목록:', availableTemplates);
      console.log('사용 중인 템플릿 인스턴스 목록:', userLocationTemplateInstances.filter(template => template.used));
      
      // 수정 모드가 아니고 사용 가능한 템플릿이 없는 경우 뒤로 가기
      if (!isEditMode && availableTemplates.length === 0) {
        setAlertModalConfig({
          title: '템플릿 부족',
          message: '사용 가능한 영역 템플릿이 없습니다. 영역 목록으로 돌아갑니다.',
          buttons: [
            { 
              text: '확인',
              onPress: () => navigation.goBack()
            }
          ],
          icon: 'alert-circle',
          iconColor: '#F44336'
        });
        setAlertModalVisible(true);
      }
    };
    
    // 초기 실행
    checkTemplates();
    
    // 이 useEffect는 컴포넌트 마운트 시 한 번만 실행
  }, []);

  // 수정 모드일 때 현재 위치의 제품 목록을 로드하여 현재 개수 기반 검증이 가능하도록 함
  useEffect(() => {
    if (isEditMode && locationToEdit?.id) {
      dispatch(fetchProductsByLocation(locationToEdit.id));
    }
  }, [dispatch, isEditMode, locationToEdit?.id]);

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
  const [selectedEditTemplateInstance, setSelectedEditTemplateInstance] = useState(null);
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
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [reserveQuantity, setReserveQuantity] = useState(1);

  const openProductSlotsInfo = () => {
    const baseSlots = (isEditMode
      ? (selectedEditTemplateInstance?.feature?.baseSlots ?? currentTemplate?.feature?.baseSlots)
      : selectedTemplateInstance?.feature?.baseSlots);
    const freeTemplates = (userProductSlotTemplateInstances || []).filter(t => !t.used).length;
    const used = isEditMode ? currentProductCount : 0;
    const usedHere = isEditMode ? usedProductSlotTemplatesInThisLocation : 0;
    const allowed = typeof baseSlots === 'number' && baseSlots === -1
      ? '무제한'
      : (typeof baseSlots === 'number' ? `${(baseSlots || 0) + freeTemplates + usedHere}개` : '-');

    let message = '';
    message += `보유 추가 제품 슬롯: ${freeTemplates}개\n`;
    if (typeof baseSlots === 'number' && baseSlots === -1) {
      message += `현재 템플릿은 기본 슬롯 무제한입니다. 추가 슬롯이 없어도 모든 제품을 등록할 수 있습니다.\n`;
    } else {
      message += `이 영역 허용치(기본+추가): ${allowed} / 현재 사용: ${used}개\n`;
    }
    message += `\n안내\n- 추가 슬롯은 모든 영역에 자동 적용됩니다.\n- 추가 슬롯으로 사용 중인 제품을 다른 곳으로 옮기려면, 해당 제품을 먼저 제거한 뒤 다른 영역에 다시 등록해야 합니다.`;

    // 어떤 제품이 추가 슬롯을 사용 중인지(기본 초과분) 목록 표시 (수정 모드에서만 가능)
    if (isEditMode && typeof baseSlots === 'number' && baseSlots !== -1) {
      const overflow = Math.max(0, used - (baseSlots || 0));
      if (overflow > 0 && currentLocationProducts && currentLocationProducts.length) {
        const overflowProducts = currentLocationProducts.slice(-overflow);
        const names = overflowProducts.map(p => p.name || p.title || `제품(${p.id})`).join(', ');
        message += `\n\n추가 슬롯 사용 중인 제품: ${names}`;
      }
    }

    setAlertModalConfig({
      title: '제품 슬롯 안내',
      message,
      buttons: [
        {
          text: '수량 선택',
          onPress: () => setQuantityModalVisible(true)
        },
        {
          text: '상점으로 이동',
          onPress: () => navigation.navigate('Profile', { screen: 'Store' })
        },
        { text: '닫기' }
      ],
      icon: 'information-circle',
      iconColor: '#4CAF50'
    });
    setAlertModalVisible(true);
  };

  const handleAssignProductSlots = () => {
    const freeCount = availableProductSlotTemplates.length;
    const count = Math.max(0, Math.min(reserveQuantity, freeCount));
    if (count <= 0) {
      setAlertModalConfig({
        title: '등록 불가',
        message: '등록 가능한 추가 제품 슬롯이 없습니다. 상점에서 추가 구매해주세요.',
        buttons: [{ text: '확인' }],
        icon: 'alert-circle',
        iconColor: '#F44336'
      });
      setAlertModalVisible(true);
      setQuantityModalVisible(false);
      return;
    }
    const locId = isEditMode && locationToEdit ? locationToEdit.id : null;
    if (!locId) {
      setAlertModalConfig({
        title: '등록 불가',
        message: '영역이 아직 생성되지 않았습니다. 먼저 영역을 생성한 후 등록해 주세요.',
        buttons: [{ text: '확인' }],
        icon: 'alert-circle',
        iconColor: '#F44336'
      });
      setAlertModalVisible(true);
      setQuantityModalVisible(false);
      return;
    }
    dispatch(assignProductSlotTemplatesToLocation({ locationId: locId, count }));
    setQuantityModalVisible(false);
    setAlertModalConfig({
      title: '등록 완료',
      message: `추가 제품 슬롯 ${count}개를 이 영역에 등록했습니다.`,
      buttons: [{ text: '확인' }],
      icon: 'checkmark-circle',
      iconColor: '#4CAF50'
    });
    setAlertModalVisible(true);
  };
  
  // 선택된 템플릿이 있으면 기본 정보 설정 (생성 모드에서만)
  useEffect(() => {
    if (selectedTemplateInstance && !isEditMode) {
      setLocationData({
        ...locationData,
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
  
  // 템플릿 인스턴스 선택 핸들러 (생성)
  const handleTemplateSelect = (template) => {
    setSelectedTemplateInstance(template);
  };
  // 템플릿 인스턴스 선택 핸들러 (수정)
  const handleEditTemplateSelect = (template) => {
    setSelectedEditTemplateInstance(template);
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
          locationId: locationToEdit.id,
          selectedEditTemplateInstance
        });
        
        let newTemplateInstanceId = locationToEdit.templateInstanceId;
        let newProductId = locationToEdit.productId;
        let newFeature = locationToEdit.feature;
        const changingTemplate = selectedEditTemplateInstance && selectedEditTemplateInstance.id !== locationToEdit.templateInstanceId;
        
        if (changingTemplate) {
          // 선택된 새 템플릿의 허용 슬롯 계산 및 검증
          const baseSlots = selectedEditTemplateInstance?.feature?.baseSlots;
          const allowedSlots = baseSlots === -1 
            ? Number.POSITIVE_INFINITY 
            : (baseSlots + assignedCountForThisLocation);
          if (currentProductCount > allowedSlots) {
            setIsLoading(false);
            setAlertModalConfig({
              title: '변경 불가',
              message: `현재 제품 ${currentProductCount}개가 새 템플릿 허용치(${baseSlots === -1 ? '무제한' : `${allowedSlots}개`} = 기본 ${baseSlots} + 추가 사용가능 ${assignedCountForThisLocation})를 초과합니다.\n제품을 줄이거나 다른 템플릿을 선택하세요.`,
              buttons: [{ text: '확인' }],
              icon: 'alert-circle',
              iconColor: '#F44336',
            });
            setAlertModalVisible(true);
            return;
          }
          newTemplateInstanceId = selectedEditTemplateInstance.id;
          newProductId = selectedEditTemplateInstance.productId;
          newFeature = selectedEditTemplateInstance.feature;
        }
        
        // 영역 수정 API 호출
        const updatedLocation = await dispatch(updateLocation({
          id: locationToEdit.id,
          title: locationData.title,
          description: locationData.description,
          icon: locationData.icon,
          templateInstanceId: newTemplateInstanceId,
          productId: newProductId,
          feature: newFeature
        })).unwrap();
        
        console.log('영역 수정 성공:', updatedLocation);
        
        // 템플릿 교체 처리: 이전 템플릿 해제, 새 템플릿 사용 표시
        if (changingTemplate) {
          // 이전 템플릿 해제
          dispatch(releaseTemplateInstance(locationToEdit.id));
          // 새 템플릿 사용 표시
          dispatch(markTemplateInstanceAsUsed({ templateId: newTemplateInstanceId, locationId: locationToEdit.id }));
        }

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

  const handleUnassignProductSlot = (templateId) => {
    const t = (userProductSlotTemplateInstances || []).find(x => x.id === templateId);
    if (!t) return;
    if (t.used && t.usedByProductId) {
      const linkedProduct = currentLocationProducts.find(p => p.id === t.usedByProductId);
      setAlertModalConfig({
        title: '등록 해제 불가',
        message: `이 슬롯은 제품과 연결되어 있습니다.${linkedProduct ? `\n연결된 제품: ${linkedProduct.name || linkedProduct.title || `제품(${linkedProduct.id})`}` : ''}\n등록을 해제하려면 먼저 해당 제품을 처리해 주세요.`,
        buttons: [
          {
            text: '제품 확인',
            onPress: () => {
              setAlertModalVisible(false);
              navigation.navigate('ProductDetail', { productId: t.usedByProductId });
            }
          },
          { text: '닫기' }
        ],
        icon: 'alert-circle',
        iconColor: '#F44336'
      });
      setAlertModalVisible(true);
      return;
    }
    // 연결된 제품이 없으면 즉시 등록 해제
    dispatch(unassignProductSlotTemplate({ templateId }));
    setAlertModalConfig({
      title: '등록 해제',
      message: '해당 추가 제품 슬롯의 등록을 해제했습니다.',
      buttons: [{ text: '확인' }],
      icon: 'information-circle',
      iconColor: '#4CAF50'
    });
    setAlertModalVisible(true);
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
                  
                  <View style={styles.templateOptionsContainer}>
                    <ScrollView style={styles.templateOptionsScroll} nestedScrollEnabled>
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
                    </ScrollView>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        {/* 템플릿 변경 섹션 (수정 모드에서만 표시) */}
        {isEditMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>템플릿 변경</Text>
            {currentTemplate ? (
              <View style={[styles.templateGroupHeader, { marginBottom: 8 }]}>
                <View style={styles.templateIconContainer}>
                  <Ionicons name={currentTemplate.icon || 'cube-outline'} size={24} color="#4CAF50" />
                </View>
                <View style={styles.templateGroupInfo}>
                  <Text style={styles.templateGroupName}>현재 템플릿: {currentTemplate.name}</Text>
                  <Text style={styles.templateGroupDescription}>기본 슬롯: {renderSlotCount(currentTemplate.feature?.baseSlots)}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.sectionDescription}>현재 템플릿 정보를 불러올 수 없습니다.</Text>
            )}
            {availableTemplates.length > 0 ? (
              <View style={styles.templateOptionsContainer}>
                <ScrollView style={styles.templateOptionsScroll} nestedScrollEnabled>
                  <View style={styles.templateOptions}>
                    {availableTemplates.map(template => {
                      const baseSlots = template.feature?.baseSlots;
                      const allowedSlots = baseSlots === -1 ? Number.POSITIVE_INFINITY : (baseSlots + additionalProductSlots);
                      const isDisabled = currentProductCount > allowedSlots;
                      return (
                        <TouchableOpacity
                          key={template.id}
                          style={[
                            styles.templateOption,
                            selectedEditTemplateInstance?.id === template.id && styles.selectedTemplateOption,
                            isDisabled && styles.disabledTemplateOption
                          ]}
                          disabled={isDisabled}
                          onPress={() => !isDisabled && handleEditTemplateSelect(template)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.templateOptionTitle}>
                              {template.name} · 기본 슬롯: {renderSlotCount(baseSlots)}
                            </Text>
                            {isDisabled && (
                              <Text style={styles.templateOptionSubtitle}>
                                현재 {currentProductCount}개 / 허용 {allowedSlots === Number.POSITIVE_INFINITY ? '무제한' : `${allowedSlots}개`}
                              </Text>
                            )}
                          </View>
                          {selectedEditTemplateInstance?.id === template.id && (
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ) : (
              <Text style={styles.sectionDescription}>사용 가능한 템플릿이 없습니다. 상점에서 템플릿을 구매하세요.</Text>
            )}
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
              placeholder={selectedTemplateInstance ? selectedTemplateInstance.name : "영역 이름을 입력하세요"}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>설명 (선택사항)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={locationData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder={selectedTemplateInstance ? selectedTemplateInstance.description : "영역에 대한 설명을 입력하세요"}
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

        {/* 제품 슬롯 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제품 슬롯</Text>
          <Text style={styles.sectionDescription}>
            {(() => {
              const baseSlots = (isEditMode ? (selectedEditTemplateInstance?.feature?.baseSlots ?? currentTemplate?.feature?.baseSlots) : selectedTemplateInstance?.feature?.baseSlots);
              const baseDisplay = (typeof baseSlots === 'number') ? (baseSlots === -1 ? '무제한' : `${baseSlots}개`) : '선택 필요';
              const allowedDisplay = (typeof baseSlots === 'number' && baseSlots === -1) ? '무제한' : (typeof baseSlots === 'number' ? `${(baseSlots || 0) + (isEditMode ? assignedCountForThisLocation : 0)}개` : '-');
              const used = isEditMode ? currentProductCount : 0;
              return `기본 슬롯: ${baseDisplay}  |  추가 슬롯(등록됨): ${isEditMode ? assignedCountForThisLocation : 0}개  |  허용: ${allowedDisplay}  |  사용: ${used}개`;
            })()}
          </Text>

          {/* 보유한 추가 제품 슬롯 리스트 */}
          <View style={styles.productSlotList}>
            <Text style={styles.productSlotSectionTitle}>보유한 추가 제품 슬롯 (미등록)</Text>
            {availableProductSlotTemplates && availableProductSlotTemplates.length > 0 ? (
              availableProductSlotTemplates.map(t => (
                  <View key={t.id} style={styles.productSlotItem}>
                    <View style={styles.productSlotInfo}>
                      <Ionicons name="cube" size={18} color="#4CAF50" />
                      <Text style={styles.productSlotText}>추가 제품 슬롯</Text>
                    </View>
                    {isEditMode && locationToEdit ? (
                      <TouchableOpacity
                        style={styles.assignButton}
                        onPress={() => dispatch(assignProductSlotTemplatesToLocation({ locationId: locationToEdit.id, count: 1 }))}
                      >
                        <Text style={styles.assignButtonText}>이 영역에 등록</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.productSlotSubText}>영역 생성 후 등록 가능</Text>
                    )}
                  </View>
                ))
            ) : (
              <Text style={styles.emptyTemplatesText}>보유한 추가 제품 슬롯이 없습니다. 상점에서 구매하세요.</Text>
            )}
          </View>

          {/* 이 영역에 등록된 추가 제품 슬롯 리스트 (수정 모드에서만) */}
          {isEditMode && (
            <View style={styles.productSlotList}>
              <Text style={styles.productSlotSectionTitle}>이 영역에 등록된 추가 제품 슬롯</Text>
              {assignedProductSlotTemplatesForThisLocation.length > 0 ? (
                assignedProductSlotTemplatesForThisLocation.map(t => {
                  const linkedProduct = t.usedByProductId ? currentLocationProducts.find(p => p.id === t.usedByProductId) : null;
                  return (
                  <View key={t.id} style={styles.productSlotItem}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.productSlotInfo}>
                        <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                        <Text style={styles.productSlotText}>등록됨</Text>
                      </View>
                      {linkedProduct && (
                        <Text style={styles.productSlotLinkedText}>연결된 제품: {linkedProduct.name || linkedProduct.title || `제품(${linkedProduct.id})`}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.assignButton, { backgroundColor: '#9E9E9E' }]}
                      onPress={() => handleUnassignProductSlot(t.id)}
                    >
                      <Text style={styles.assignButtonText}>등록 해제</Text>
                    </TouchableOpacity>
                  </View>
                  );
                })
              ) : (
                <Text style={styles.emptyTemplatesText}>등록된 추가 제품 슬롯이 없습니다.</Text>
              )}
            </View>
          )}


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

        {/* 수량 선택 모달 (간단 구현: AlertModal의 content로 입력 UI 구성 가능하나, 여기서는 프리셋 버튼 제공) */}
        {quantityModalVisible && (
          <AlertModal
            visible={quantityModalVisible}
            title="추가 제품 슬롯 등록"
            message={`등록할 수량을 선택하세요. (보유: ${(userProductSlotTemplateInstances || []).filter(t => !t.used && !t.assignedLocationId).length}개)`}
            buttons={[
              { text: '1개', onPress: () => { setReserveQuantity(1); handleAssignProductSlots(); } },
              { text: '3개', onPress: () => { setReserveQuantity(3); handleAssignProductSlots(); } },
              { text: '5개', onPress: () => { setReserveQuantity(5); handleAssignProductSlots(); } },
              { text: '취소', onPress: () => setQuantityModalVisible(false) },
            ]}
            onClose={() => setQuantityModalVisible(false)}
            icon="list"
            iconColor="#4CAF50"
          />
        )}
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
    minHeight: 56,
  },
  selectedIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconSelectorText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginRight: 8,
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
  templateOptionsContainer: {
    maxHeight: 280,
  },
  templateOptionsScroll: {
    // no-op: 스타일 확장 여지
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
  disabledTemplateOption: {
    opacity: 0.5,
  },
  selectedTemplateOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  templateOptionTitle: {
    fontSize: 15,
    color: '#333',
  },
  templateOptionSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
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
  planButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  planButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  productSlotSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  productSlotList: {
    marginTop: 16,
  },
  productSlotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  productSlotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productSlotText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  productSlotSubText: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
  },
  productSlotLinkedText: {
    fontSize: 13,
    color: '#555',
    marginTop: 6,
  },
  assignButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  assignButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

export default AddLocationScreen; 