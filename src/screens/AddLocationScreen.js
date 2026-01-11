import React, { useState, useEffect, useRef } from 'react';
import { 

  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,

  ActivityIndicator,
  SafeAreaView } from
'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createLocation, updateLocation, fetchLocations } from '../redux/slices/locationsSlice';
















import { markTemplateInstanceAsUsed, releaseTemplateInstance, unassignProductSlotTemplate } from '../redux/slices/authSlice';
import { fetchProductsByLocation } from '../redux/slices/productsSlice';
import IconSelector from '../components/IconSelector';
import AlertModal from '../components/AlertModal';
import { isTemplateActive } from '../utils/validityUtils';

const MAX_LOCATION_TITLE_LEN = 50;
const MAX_LOCATION_DESC_LEN = 100;

const AddLocationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  
  // 수정 모드 여부 확인
  const isEditMode = route.params?.isEditMode || false;
  const locationToEdit = route.params?.location;
  
  // 템플릿 인스턴스 및 구독 상태
  const { userLocationTemplateInstances, slots, userProductSlotTemplateInstances, subscription, isLoggedIn } = useSelector((state) => state.auth);
  const additionalProductSlots = slots?.productSlots?.additionalSlots || 0;
  const { locationProducts } = useSelector((state) => state.products);
  const { locations: locationsList } = useSelector((state) => state.locations);
  
  // 만료 템플릿 판단: 정책 기반(validWhile) 또는 expiresAt
  const isTemplateExpired = (t) => {
    if (!t) return false;
    return !isTemplateActive(t, subscription);
  };
  // 사용 가능 + 미만료 템플릿만 필터링
  const availableTemplates = userLocationTemplateInstances.filter((template) => !template.used && !isTemplateExpired(template));

  // 수정 모드에서 현재 영역에 연결된 템플릿이 만료되었는지 판단
  const linkedTemplateInEdit = isEditMode && locationToEdit ?

  (userLocationTemplateInstances || []).find((t) => t.usedInLocationId === locationToEdit.id) ||
  locationToEdit.templateInstanceId && (userLocationTemplateInstances || []).find((t) => t.id === locationToEdit.templateInstanceId) || null :

  null;
  const isEditLockedByExpiry = !!(linkedTemplateInEdit && isTemplateExpired(linkedTemplateInEdit));
  const currentTemplate = isEditMode && locationToEdit ?

  userLocationTemplateInstances.find((t) => t.id === locationToEdit.templateInstanceId) ||
  userLocationTemplateInstances.find((t) => t.usedInLocationId === locationToEdit.id) || (
  locationToEdit.feature ? {
          id: 'derived_current_template',
          name: locationToEdit.title || '현재 템플릿',
          description: locationToEdit.description || '',
          icon: locationToEdit.icon || 'cube-outline',
    feature: locationToEdit.feature
  } : null) :

  null;
  const currentLocationProducts = isEditMode && locationToEdit ? locationProducts?.[locationToEdit.id] || [] : [];
  const currentProductCount = currentLocationProducts.length;
  const currentProductIdSet = new Set(currentLocationProducts.map((p) => p.id));
  // ✅ /v1/inventory/guest-templates 호출 제거 (요청사항)
  // - 제품 슬롯 템플릿은 Redux(auth 저장소) 또는 섹션 API로 내려오는 connected 템플릿 기반으로만 사용
  const sourceProductSlotTemplates = userProductSlotTemplateInstances || [];
  const usedProductSlotTemplatesInThisLocation = sourceProductSlotTemplates.filter((t) => t.used && currentProductIdSet.has(t.usedByProductId)).length;
  // 이 영역에 등록된 슬롯은 유효성 여부와 무관하게 표시 (만료/비활성도 포함)
  // 기준: 섹션 API의 connected_guest_inventory_item_templates (expires_at 포함)
  const assignedProductSlotTemplatesForThisLocation = (() => {
    if (!(isEditMode && locationToEdit)) return [];
    const reduxLoc = (locationsList || []).find((l) => String(l.id) === String(locationToEdit.id));
    const connected = reduxLoc?.feature?.connectedProductSlotTemplates || locationToEdit?.feature?.connectedProductSlotTemplates || [];
    return connected.map((ct) => ({
      id: String(ct.id),
      usedByProductId: ct.usedByProductId || null,
      used: !!ct.usedByProductId,
      expiresAt: ct.expiresAt || null
    }));
  })();
  const assignedCountForThisLocation = assignedProductSlotTemplatesForThisLocation.length;
  // 만료 여부(connected.expiresAt 기준) 판단 헬퍼
  const isAssignedExpired = (t) => {
    if (!t || !t.expiresAt) return false;
    const ts = new Date(t.expiresAt).getTime();
    return isFinite(ts) && ts <= Date.now();
  };
  // 미만료(활성) 등록 템플릿 목록과 카운트
  const assignedActiveTemplatesForThisLocation = assignedProductSlotTemplatesForThisLocation.filter((t) => !isAssignedExpired(t));
  const assignedActiveCountForThisLocation = assignedActiveTemplatesForThisLocation.length;
  const availableProductSlotTemplates = sourceProductSlotTemplates.filter((t) => !t.used && !t.assignedLocationId && isTemplateActive(t, subscription));
 
  // 스테이징 계산은 아래 선언 이후에 수행됩니다.
  
  // 사용자의 템플릿 인스턴스 목록 콘솔 출력 및 템플릿 부족 확인
  useEffect(() => {
    // 컴포넌트 마운트 시 한 번만 실행되는 로직
    const checkTemplates = () => {
      console.log('사용자의 현재 템플릿 인스턴스 목록:', userLocationTemplateInstances);
      console.log('사용 가능한 템플릿 인스턴스 목록:', availableTemplates);
      console.log('사용 중인 템플릿 인스턴스 목록:', userLocationTemplateInstances.filter((template) => template.used));
      
      // 수정 모드가 아니고 사용 가능한 템플릿이 없는 경우 뒤로 가기
      if (!isEditMode && availableTemplates.length === 0) {
        setAlertModalConfig({
          title: '템플릿 부족',
          message: '사용 가능한 영역 템플릿이 없습니다. 영역 목록으로 돌아갑니다.',
          buttons: [
            { 
              text: '확인',
              onPress: () => navigation.goBack()
          }],

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

  // 뒤로 가기 핸들러(헤더 버튼)
  const handleGoBack = () => {
    if (!hasUnsavedChanges()) {
      navigation.goBack();
      return;
    }
    confirmLeaveWithoutSaving(() => {
      setAlertModalVisible(false);
      isNavigatingAwayRef.current = true;
      navigation.goBack();
    });
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
    icon: isEditMode && locationToEdit ? locationToEdit.icon : 'cube-outline'
  });
  const [isIconSelectorVisible, setIsIconSelectorVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: '',
    iconColor: ''
  });
  // 스테이징: 등록/해제 예정 템플릿 ID 목록 (편집 모드에서만 사용)
  const [stagedAssignTemplateIds, setStagedAssignTemplateIds] = useState([]);
  const [stagedUnassignTemplateIds, setStagedUnassignTemplateIds] = useState([]);
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [reserveQuantity, setReserveQuantity] = useState(1);
  const draftTimerRef = useRef(null);
  const didCreateRef = useRef(false);
  const hasSubmittedRef = useRef(false);
  const draftSelectedTemplateIdRef = useRef(null);
  const pendingNavActionRef = useRef(null);
  const isNavigatingAwayRef = useRef(false);
  
  // 스테이징 미리보기 계산 (선언 이후)
  const stagedAssignCount = stagedAssignTemplateIds.length;
  const stagedUnassignCount = stagedUnassignTemplateIds.length;
  // 미만료 기준 프리뷰 등록 수 계산(해제는 활성에만 반영)
  const activeAssignedIdSet = new Set(assignedActiveTemplatesForThisLocation.map((t) => String(t.id)));
  const stagedUnassignActiveCount = stagedUnassignTemplateIds.filter((id) => activeAssignedIdSet.has(String(id))).length;
  const previewAssignedActiveCount = Math.max(0, assignedActiveCountForThisLocation - stagedUnassignActiveCount + stagedAssignCount);
  const previewAvailableTemplates = availableProductSlotTemplates.filter((t) => !stagedAssignTemplateIds.includes(t.id));
  const previewAssignedTemplates = assignedProductSlotTemplatesForThisLocation.filter((t) => !stagedUnassignTemplateIds.includes(t.id));
  const stagedAssignTemplates = availableProductSlotTemplates.filter((t) => stagedAssignTemplateIds.includes(t.id));



























































































  
  // 선택된 템플릿이 있으면 기본 정보 설정 (생성 모드에서만)
  useEffect(() => {
    if (selectedTemplateInstance && !isEditMode) {
      setLocationData({
        ...locationData,
        icon: selectedTemplateInstance.icon
      });
    }
  }, [selectedTemplateInstance, isEditMode]);

  // 첫 번째 템플릿을 자동으로 선택 (생성 모드에서만)
  useEffect(() => {
    if (hasSubmittedRef.current) return;
    if (draftSelectedTemplateIdRef.current) return; // 드래프트 복원을 우선
    if (availableTemplates.length > 0 && !selectedTemplateInstance && !isEditMode) {
      setSelectedTemplateInstance(availableTemplates[0]);
    }
  }, [availableTemplates, selectedTemplateInstance, isEditMode]);
  
  // 초안 로드 (생성 모드에서만) - 최초 1회만 로드
  useEffect(() => {

    (async () => {
      if (isEditMode) return;
      try {

        // 위치 폼 드래프트 로직 제거됨
      } catch (e) {}})();
    return () => {mounted = false;};
  }, []);

  // 드래프트에 저장된 템플릿 선택을, 템플릿 목록이 준비된 뒤 적용
  useEffect(() => {
    if (isEditMode) return;
    if (hasSubmittedRef.current) return;
    if (!selectedTemplateInstance && draftSelectedTemplateIdRef.current) {
      const found = availableTemplates.find((t) => t.id === draftSelectedTemplateIdRef.current);
      if (found) {
        setSelectedTemplateInstance(found);
        draftSelectedTemplateIdRef.current = null;
      }
    }
  }, [availableTemplates, isEditMode, selectedTemplateInstance]);

  // 초안 저장 (생성 모드에서만, 400ms 디바운스)
  useEffect(() => {
    if (isEditMode) return;
    if (hasSubmittedRef.current) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {

      // 위치 폼 드래프트 저장 로직 제거됨
    }, 400);return () => {if (draftTimerRef.current) clearTimeout(draftTimerRef.current);};
  }, [isEditMode, locationData.title, locationData.description, locationData.icon, selectedTemplateInstance?.id]);

  // 변경 여부 판단
  const hasUnsavedChanges = () => {
    if (hasSubmittedRef.current) return false;
    if (isEditMode) {
      const original = {
        title: locationToEdit?.title || '',
        description: locationToEdit?.description || '',
        icon: locationToEdit?.icon || 'cube-outline',
        templateInstanceId: locationToEdit?.templateInstanceId || null
      };
      const current = {
        title: locationData.title || '',
        description: locationData.description || '',
        icon: locationData.icon || 'cube-outline',
        templateInstanceId: selectedEditTemplateInstance?.id || original.templateInstanceId
      };
      const basicChanged =
        original.title !== current.title ||
        original.description !== current.description ||
      original.icon !== current.icon;

      const templateChanged = original.templateInstanceId !== current.templateInstanceId;
      const stagedChanged = stagedAssignTemplateIds.length > 0 || stagedUnassignTemplateIds.length > 0;
      return basicChanged || templateChanged || stagedChanged;
    }
    // 생성 모드: 텍스트 입력이 있는지만 체크(템플릿/아이콘 자동 반영은 제외)
    return (
      locationData.title && locationData.title.trim() !== '' ||
      locationData.description && locationData.description.trim() !== '');

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
      { text: '나가기', onPress: onConfirm }]

    });
    setAlertModalVisible(true);
  };

  // 네비게이션 뒤로가기/제스처 차단
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isNavigatingAwayRef.current) return; // 확인 후 실제 내비게이션 허용
      if (!hasUnsavedChanges()) return;
      e.preventDefault();
      pendingNavActionRef.current = e.data.action;
      confirmLeaveWithoutSaving(() => {
        setAlertModalVisible(false);
        isNavigatingAwayRef.current = true;
        if (pendingNavActionRef.current) {
          navigation.dispatch(pendingNavActionRef.current);
          pendingNavActionRef.current = null;
        }
      });
    });
    return unsubscribe;
  }, [navigation, isEditMode, locationData.title, locationData.description, locationData.icon, selectedEditTemplateInstance, stagedAssignTemplateIds, stagedUnassignTemplateIds]);
  
  // 입력값 변경 핸들러
  const handleInputChange = (key, value) => {
    let next = value;
    if (key === 'title') next = String(value || '').slice(0, MAX_LOCATION_TITLE_LEN);
    if (key === 'description') next = String(value || '').slice(0, MAX_LOCATION_DESC_LEN);
    setLocationData({
      ...locationData,
      [key]: next
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
    if (hasSubmittedRef.current) return;
    // 필수 입력값 검증
    const sanitizedTitle = String(locationData.title || '').trim();
    const sanitizedDesc = String(locationData.description || '').trim();

    if (!sanitizedTitle) {
      setAlertModalConfig({
        title: '입력 오류',
        message: '영역 이름을 입력해주세요.',
        buttons: [
        { text: '확인' }],

        icon: 'alert-circle',
        iconColor: '#F44336'
      });
      setAlertModalVisible(true);
      return;
    }

    if (sanitizedTitle.length > MAX_LOCATION_TITLE_LEN) {
      setAlertModalConfig({
        title: '입력 오류',
        message: `영역 이름은 최대 ${MAX_LOCATION_TITLE_LEN}자까지 입력할 수 있어요.`,
        buttons: [{ text: '확인' }],
        icon: 'alert-circle',
        iconColor: '#F44336',
      });
      setAlertModalVisible(true);
      return;
    }

    if (sanitizedDesc.length > MAX_LOCATION_DESC_LEN) {
      setAlertModalConfig({
        title: '입력 오류',
        message: `영역 설명은 최대 ${MAX_LOCATION_DESC_LEN}자까지 입력할 수 있어요.`,
        buttons: [{ text: '확인' }],
        icon: 'alert-circle',
        iconColor: '#F44336',
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
        { text: '확인' }],

        icon: 'alert-circle',
        iconColor: '#F44336'
    });
    setAlertModalVisible(true);
      return;
    }
    
    hasSubmittedRef.current = true;
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
          // 이전 템플릿을 해제하여 만료된 상태 표기가 남지 않도록 정리
          try {
            await dispatch(releaseTemplateInstance(locationToEdit.id));
          } catch (e) {

            // no-op
          } // 선택된 새 템플릿의 허용 슬롯 계산 및 검증
          const baseSlots = selectedEditTemplateInstance?.feature?.baseSlots;
          const allowedSlots = baseSlots === -1 ?
          Number.POSITIVE_INFINITY :
          baseSlots + previewAssignedCount;
          if (currentProductCount > allowedSlots) {
            setIsLoading(false);
            setAlertModalConfig({
              title: '변경 불가',
              message: `현재 제품 ${currentProductCount}개가 새 템플릿 허용치(${baseSlots === -1 ? '무제한' : `${allowedSlots}개`} = 기본 ${baseSlots} + 추가(미리보기) ${previewAssignedCount})를 초과합니다.\n제품을 줄이거나 다른 템플릿을 선택하세요.`,
              buttons: [{ text: '확인' }],
              icon: 'alert-circle',
              iconColor: '#F44336'
            });
            setAlertModalVisible(true);
      return;
          }
          newTemplateInstanceId = selectedEditTemplateInstance.id;
          newProductId = selectedEditTemplateInstance.productId;
          newFeature = selectedEditTemplateInstance.feature;
        }
        
        // 영역 수정 API 호출 (실패 시 모달 표시 후 중단)
        let updatedLocation = null;
        try {
          updatedLocation = await dispatch(updateLocation({
            id: locationToEdit.id,
            title: sanitizedTitle,
            description: sanitizedDesc || null,
            icon: locationData.icon,
            templateInstanceId: newTemplateInstanceId,
            productId: newProductId,
            feature: newFeature
          })).unwrap();
          console.log('영역 수정 성공:', updatedLocation);
        } catch (e) {
          setIsLoading(false);
          setAlertModalConfig({
            title: '수정 실패',
            message: e?.response?.data?.message || '영역 수정 중 오류가 발생했습니다.',
            buttons: [{ text: '확인' }],
            icon: 'alert-circle',
            iconColor: '#F44336'
          });
          setAlertModalVisible(true);
          return;
        }
        // 새 템플릿을 해당 영역에 사용 처리 (UI 동기화)
        try {
          if (changingTemplate) {
            await dispatch(markTemplateInstanceAsUsed({ templateId: newTemplateInstanceId, locationId: locationToEdit.id }));
          }
        } catch (e) {}

        // 스테이징된 제품 슬롯 등록/해제 적용 - API 호출로 변경 (실패 시 모달 표시 후 중단)
        try {
          if (stagedAssignTemplateIds.length > 0 || stagedUnassignTemplateIds.length > 0) {
            const assignIds = stagedAssignTemplateIds.map((id) => Number(id)).filter((n) => Number.isFinite(n));
            const revokeIds = stagedUnassignTemplateIds.map((id) => Number(id)).filter((n) => Number.isFinite(n));
            const { assignGuestInventoryItemTemplatesToSection } = require('../api/inventoryApi');
            await assignGuestInventoryItemTemplatesToSection(Number(locationToEdit.id), { assign: assignIds, revoke: revokeIds });
            // 연결/해제 반영 후 섹션 목록을 재조회하여 등록 템플릿 목록 즉시 최신화
            try {await dispatch(fetchLocations()).unwrap();} catch (_) {}
          }
        } catch (e) {
          setIsLoading(false);
          setAlertModalConfig({
            title: '템플릿 적용 실패',
            message: e?.response?.data?.message || '제품 템플릿 연결/해제 중 오류가 발생했습니다.',
            buttons: [{ text: '확인' }],
            icon: 'alert-circle',
            iconColor: '#F44336'
          });
          setAlertModalVisible(true);
      return;
    }
    
        // 스테이징 초기화
        setStagedAssignTemplateIds([]);
        setStagedUnassignTemplateIds([]);
        
        setIsLoading(false);
        
        // 성공 후 스택을 재구성: [영역 목록, 영역 상세]로 리셋하여 뒤로가기 한 번에 목록으로 복귀
        try {dispatch(fetchProductsByLocation(String(locationToEdit.id)));} catch (e) {}
        navigation.reset({
          index: 1,
          routes: [
            { name: 'LocationsScreen' },
          { name: 'LocationDetail', params: { locationId: String(locationToEdit.id) } }]

        });
      } else {
        // 영역 생성 로직
        console.log('영역 생성 시작:', {
          locationData,
          selectedTemplateInstance
        });
        
        // 영역 생성 API 호출
        const result = await dispatch(createLocation({
        ...locationData,
          title: sanitizedTitle,
          description: sanitizedDesc || null,
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
          }],

          icon: 'checkmark-circle',
          iconColor: '#4CAF50'
        });
        setAlertModalVisible(true);
        // 드래프트 삭제 로직 제거됨
      }
    } catch (error) {
      setIsLoading(false);
      hasSubmittedRef.current = false;
      console.error('영역 처리 실패:', error);
      setAlertModalConfig({
        title: '오류',
        message: isEditMode ? '영역 수정 중 오류가 발생했습니다.' : '영역 생성 중 오류가 발생했습니다.',
        buttons: [
        { text: '확인' }],

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
        <Text style={styles.headerTitle}>영역</Text>
        <View style={styles.headerRight} />
          </View>
      
      <ScrollView style={styles.container}>
        {/* 템플릿 선택 섹션 (생성 모드에서만 표시) */}
        {!isEditMode &&
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>템플릿 선택</Text>
            <Text style={styles.sectionDescription}>
              영역을 생성할 템플릿을 선택하세요. 템플릿에 따라 제공되는 기능이 다릅니다.
          </Text>
            
            {/* 단일 스크롤 리스트로 통합 */}
            {availableTemplates.length > 0 ?
              <View style={styles.templateOptionsContainer}>
                <ScrollView style={styles.templateOptionsScroll} nestedScrollEnabled>
                  <View style={styles.templateOptions}>
                    {availableTemplates.map((template) =>
          <TouchableOpacity 
                        key={template.id}
                        style={[
                          styles.templateOption,
                  selectedTemplateInstance?.id === template.id && styles.selectedTemplateOption]
                  }
                  onPress={() => handleTemplateSelect(template)}>

                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={styles.templateIconContainer}>
                            <Ionicons name={template.icon || 'cube-outline'} size={24} color="#4CAF50" />
          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.templateOptionTitle}>
                              {template.name} · 기본 슬롯: {renderSlotCount(template.feature?.baseSlots)}
          </Text>
                            {/* 생성 화면에서는 템플릿 description 비표시 */}
                          </View>
                        </View>
                        {selectedTemplateInstance?.id === template.id &&
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  }
          </TouchableOpacity>
                )}
        </View>
                </ScrollView>
      </View> :

              <View style={styles.emptyTemplates}>
                <Text style={styles.emptyTemplatesText}>사용 가능한 템플릿이 없습니다. 상점에서 구매 후 다시 시도하세요.</Text>
              </View>
          }
          </View>
        }
        {/* 템플릿 변경 섹션 (수정 모드에서만 표시) */}
        {isEditMode &&
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>템플릿 변경</Text>
            {currentTemplate ?
              <View style={[styles.templateGroupHeader, { marginBottom: 8 }]}>
                <View style={styles.templateIconContainer}>
                  <Ionicons name={currentTemplate.icon || 'cube-outline'} size={24} color="#4CAF50" />
                </View>
                <View style={styles.templateGroupInfo}>
                  <Text style={styles.templateGroupName}>현재 템플릿: {currentTemplate.name}</Text>
                  <Text style={styles.templateGroupDescription}>기본 슬롯: {renderSlotCount(currentTemplate.feature?.baseSlots)}</Text>
                </View>
              </View> :

              <Text style={styles.sectionDescription}>현재 템플릿 정보를 불러올 수 없습니다.</Text>
          }
            {availableTemplates.length > 0 ?
              <View style={styles.templateOptionsContainer}>
                <ScrollView style={styles.templateOptionsScroll} nestedScrollEnabled>
                  <View style={styles.templateOptions}>
                    {availableTemplates.map((template) => {
                      const baseSlots = template.feature?.baseSlots;
                  const allowedSlots = baseSlots === -1 ? Number.POSITIVE_INFINITY : baseSlots + additionalProductSlots;
                      const isDisabled = currentProductCount > allowedSlots;
  return (
          <TouchableOpacity 
                          key={template.id}
                          style={[
                            styles.templateOption,
                            selectedEditTemplateInstance?.id === template.id && styles.selectedTemplateOption,
                      isDisabled && styles.disabledTemplateOption]
                      }
                          disabled={isDisabled}
                      onPress={() => !isDisabled && handleEditTemplateSelect(template)}>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.templateOptionTitle}>
                              {template.name} · 기본 슬롯: {renderSlotCount(baseSlots)}
                            </Text>
                            {isDisabled &&
                              <Text style={styles.templateOptionSubtitle}>
                                현재 {currentProductCount}개 / 허용 {allowedSlots === Number.POSITIVE_INFINITY ? '무제한' : `${allowedSlots}개`}
                              </Text>
                        }
          </View>
                          {selectedEditTemplateInstance?.id === template.id &&
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      }
          </TouchableOpacity>);

                    })}
        </View>
                </ScrollView>
      </View> :

              <Text style={styles.sectionDescription}>사용 가능한 템플릿이 없습니다.</Text>
          }
          </View>
        }
        
        {/* 영역 정보 입력 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>영역 정보</Text>
          {isEditMode && isEditLockedByExpiry &&
            <View style={{ backgroundColor: '#fff8e1', borderWidth: 1, borderColor: '#ffe082', borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <Text style={{ color: '#ff6f00', fontSize: 12 }}>이 영역은 만료된 영역 템플릿에 연결되어 있어 영역 정보는 수정할 수 없습니다. 상단의 템플릿 변경을 이용해주세요.</Text>
          </View>
          }
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>이름</Text>
          <TextInput
              style={styles.input}
              value={locationData.title}
              onChangeText={(text) => handleInputChange('title', text)}
              placeholder="영역 이름 입력..."
              placeholderTextColor="#999"
              maxLength={MAX_LOCATION_TITLE_LEN}
              editable={!(isEditMode && isEditLockedByExpiry)} />
          <Text style={styles.inputHint}>최대 {MAX_LOCATION_TITLE_LEN}자</Text>

        </View>
        
          <View style={styles.formGroup}>
            <Text style={styles.label}>설명 (선택사항)</Text>
          <TextInput
              style={[styles.input, styles.textArea, styles.placeholderLight]}
              value={locationData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder={"영역 설명 입력..."}
              placeholderTextColor="#999"
            maxLength={MAX_LOCATION_DESC_LEN}
            multiline
              editable={!(isEditMode && isEditLockedByExpiry)} />
          <Text style={styles.inputHint}>최대 {MAX_LOCATION_DESC_LEN}자</Text>

        </View>
        
          <View style={styles.formGroup}>
            <Text style={styles.label}>아이콘</Text>
            <TouchableOpacity
              style={[styles.iconSelector, isEditMode && isEditLockedByExpiry ? { opacity: 0.6 } : null]}
              onPress={() => {if (!(isEditMode && isEditLockedByExpiry)) setIsIconSelectorVisible(true);}}
              disabled={isEditMode && isEditLockedByExpiry}>

              <View style={styles.selectedIconContainer}>
                <Ionicons name={locationData.icon} size={24} color="#4CAF50" />
              </View>
              <Text style={styles.iconSelectorText}>아이콘 선택</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        {/* (제거) 제품 슬롯 / 보유한 추가 제품 슬롯 섹션 (요청사항) */}

        {/* 저장 버튼 (영역 생성/수정은 기능적으로 수행하되 문구는 '저장'으로 통일) */}
                      <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateLocation}
          disabled={isLoading}>

          {isLoading ?
          <ActivityIndicator size="small" color="#fff" /> :

          <Text style={styles.createButtonText}>저장</Text>
          }
        </TouchableOpacity>
        
        {/* 아이콘 선택 모달 */}
        <IconSelector
          visible={isIconSelectorVisible}
          onClose={() => setIsIconSelectorVisible(false)}
          onSelect={handleIconSelect}
          selectedIcon={locationData.icon} />

        
        {/* 알림 모달 */}
      <AlertModal
        visible={alertModalVisible}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        buttons={alertModalConfig.buttons}
        onClose={() => setAlertModalVisible(false)}
        icon={alertModalConfig.icon}
          iconColor={alertModalConfig.iconColor} />

      
        {/* (제거) 추가 제품 슬롯 등록 수량 선택 모달 */}
      </ScrollView>
    </SafeAreaView>);

};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  headerRight: {
    width: 40
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 16
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
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16
  },
  formGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333'
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  placeholderLight: {
    color: '#333'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  inputHint: {
    marginTop: 6,
    fontSize: 12,
    color: '#9E9E9E'
  },
  iconSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 56
  },
  selectedIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  iconSelectorText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginRight: 8
  },
  createButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  templateGroup: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden'
  },
  templateGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  templateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  templateGroupInfo: {
    flex: 1
  },
  templateGroupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  templateGroupDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  templateOptions: {
    padding: 12
  },
  templateOptionsContainer: {
    maxHeight: 280
  },
  templateOptionsScroll: {
    flexGrow: 0
  },
  templateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8
  },
  disabledTemplateOption: {
    opacity: 0.5
  },
  selectedTemplateOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9'
  },
  templateOptionTitle: {
    fontSize: 15,
    color: '#333'
  },
  templateOptionSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 4
  },
  emptyTemplates: {
    padding: 16,
    alignItems: 'center'
  },
  emptyTemplatesText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16
  },
  emptySlotCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center'
  },
  emptySlotTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#444',
    marginBottom: 4,
    textAlign: 'center'
  },
  emptySlotSubtitle: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    lineHeight: 18
  },
  storeButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  storeButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  planButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  planButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  productSlotSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  productSlotList: {
    marginTop: 16
  },
  slotScrollableList: {
    maxHeight: 260
  },
  productSlotSummary: {
    marginTop: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  productSlotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6
  },
  productSlotLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600'
  },
  productSlotValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '700'
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
    backgroundColor: '#f9f9f9'
  },
  productSlotInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  productSlotText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
    fontWeight: '500'
  },
  productSlotSubText: {
    fontSize: 13,
    color: '#777',
    marginTop: 4
  },
  productSlotLinkedText: {
    fontSize: 13,
    color: '#555',
    marginTop: 6
  },
  assignButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  assignButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold'
  },
  stagingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#c8e6c9'
  },
  stagingNoticeText: {
    fontSize: 12,
    color: '#2e7d32'
  },
  stagingHelpText: {
    fontSize: 12,
    color: '#777',
    marginTop: 6,
    textAlign: 'center'
  }
});

export default AddLocationScreen; 