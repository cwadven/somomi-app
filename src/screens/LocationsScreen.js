import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { fetchGuestSectionsExpiredCount } from '../api/sectionApi';
import { loadUserLocationTemplateInstances, loadUserProductSlotTemplateInstances } from '../redux/slices/authSlice';
import AlertModal from '../components/AlertModal';
import SignupPromptModal from '../components/SignupPromptModal';
import SlotStatusBar from '../components/SlotStatusBar';
// 로그인 폼/소셜 버튼은 내 카테고리에서 노출하지 않음
import { setTutorialStep, TUTORIAL_STEPS } from '../redux/slices/tutorialSlice';
import TutorialTouchBlocker from '../components/TutorialTouchBlocker';
import { fetchLocations, updateLocation } from '../redux/slices/locationsSlice';
import { isTemplateActive } from '../utils/validityUtils';
import styles from './LocationsScreen.styles';
import { useLocationsTutorial } from './LocationsScreen.tutorial';

const LocationsScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const route = useRoute();
  
  const { locations, status, error } = useSelector(state => state.locations);
  const tutorial = useSelector((state) => state.tutorial);
  const { isLoggedIn, userLocationTemplateInstances, subscription, locationTemplatesStatus } = useSelector(state => state.auth);

  // 자동 연동 모달 제거 (요청사항)
 
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: '',
    iconColor: ''
  });
  // 템플릿 선택 모달 상태
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [templatePickerLocation, setTemplatePickerLocation] = useState(null);
  const [freeTemplates, setFreeTemplates] = useState([]);
  const [templatePickerSelectedTemplateId, setTemplatePickerSelectedTemplateId] = useState(null);
  const [expiredCountsByLocationId, setExpiredCountsByLocationId] = useState({});
  const [expiredTotalCount, setExpiredTotalCount] = useState(0);
  const {
    addButtonRef,
    addButtonRect,
    newestLocationRowRef,
    newestLocationRowRect,
    blockerActive,
    blockerActiveNewestLocation,
    locationsSorted,
    tutorialTargetTitle,
    tutorialTargetLocationId,
    isAllowedCreatedLocation,
    measureAddButton,
    measureNewestLocationRow,
  } = useLocationsTutorial({
    tutorial,
    isFocused,
    dispatch,
    locations,
    templatePickerVisible,
    alertModalVisible,
    showCongratsModal: (onConfirm) => {
      setAlertModalConfig({
        title: '튜토리얼',
        message: "축하드려요~\n새로운 '카테고리'를 처음으로 만드셨네요~\n이제 '제품'을 만들러 가볼까요?",
        buttons: [
          {
            text: '확인',
            onPress: () => {
              try { setAlertModalVisible(false); } catch (e) {}
              try { onConfirm?.(); } catch (e) {}
            },
          },
        ],
        icon: 'checkmark-circle',
        iconColor: '#4CAF50',
      });
      setAlertModalVisible(true);
    },
  });

  const formatDateOnly = useCallback((isoLike) => {
    try {
      const s = String(isoLike || '').trim();
      if (!s) return null;
      // YYYY-MM-DD 형태는 그대로 사용 (이미 날짜-only)
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const d = new Date(s);
      const t = d.getTime();
      if (!Number.isFinite(t)) return null;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch (e) {
      return null;
    }
  }, []);

  const getTemplateExpiryText = useCallback((tpl) => {
    try {
      if (!tpl) return null;
      const exp = tpl?.feature?.expiresAt || tpl?.feature?.validWhile?.expiresAt || null;
      if (!exp) return null;
      const expMs = new Date(exp).getTime();
      if (!Number.isFinite(expMs)) return null;
      const dateOnly = formatDateOnly(exp);
      const remainingDays = Math.ceil((expMs - Date.now()) / (24 * 60 * 60 * 1000));
      if (remainingDays > 0) return `만료까지 ${remainingDays}일${dateOnly ? ` · ${dateOnly}` : ''}`;
      if (remainingDays === 0) return `오늘 만료${dateOnly ? ` · ${dateOnly}` : ''}`;
      return `만료됨${dateOnly ? ` · ${dateOnly}` : ''}`;
    } catch (e) {
      return null;
    }
  }, [formatDateOnly]);

  // ✅ 게스트 섹션 API(feature.expiresAt) 기반 남은 기간 + 날짜 표시
  const getTemplateRemainingTextForLocation = useCallback((locId) => {
    try {
      const id = locId == null ? null : String(locId);
      if (!id) return null;
      const loc = (locations || []).find(l => String(l?.id || '') === id) || null;
      // guest_section_template_id가 없는 경우는 "만료"가 아니라 그냥 템플릿 미연동 상태 (표시/만료처리 안함)
      if (!loc?.templateInstanceId) return null;
      const exp = loc?.feature?.expiresAt || loc?.feature?.expires_at || null;
      // expires_at이 null이면 기간 제한이 없는 템플릿일 수 있으므로 표시하지 않음
      if (!exp) return null;
      const expMs = new Date(exp).getTime();
      if (!Number.isFinite(expMs)) return null;

      const dateOnly = formatDateOnly(exp);
      const todayOnly = formatDateOnly(new Date().toISOString());
      const dayMs = 24 * 60 * 60 * 1000;

      // ✅ 이미 지난 경우는 무조건 만료됨 (ceil 때문에 '오늘 만료'로 뜨는 문제 방지)
      if (expMs < Date.now()) return `만료됨${dateOnly ? ` · ${dateOnly}` : ''}`;

      // ✅ 달력 기준: 같은 날짜면 "오늘 만료"
      if (dateOnly && todayOnly && dateOnly === todayOnly) {
        return `오늘 만료${dateOnly ? ` · ${dateOnly}` : ''}`;
      }

      // ✅ 날짜 단위로 남은 일수 계산 (오늘 제외, 내일=1일)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const expDate = new Date(expMs);
      expDate.setHours(0, 0, 0, 0);
      const diffDays = Math.max(0, Math.round((expDate.getTime() - startOfToday.getTime()) / dayMs));
      if (diffDays <= 0) return `오늘 만료${dateOnly ? ` · ${dateOnly}` : ''}`;
      return `만료까지 ${diffDays}일${dateOnly ? ` · ${dateOnly}` : ''}`;
    } catch (e) {
      return null;
    }
  }, [locations, formatDateOnly]);

  // ✅ 게스트 섹션 API(feature.expiresAt) 기반 만료 여부
  const isLocationExpired = useCallback((loc) => {
    const locId = loc?.id == null ? null : String(loc.id);
    if (!locId) return false;
    // guest_section_template_id가 없으면 만료 개념 없음
    if (!loc?.templateInstanceId) return false;
    const exp = loc?.feature?.expiresAt || loc?.feature?.expires_at || null;
    if (!exp) return false; // 기간 제한 없는 템플릿이면 만료 아님
    const expMs = new Date(exp).getTime();
    if (!Number.isFinite(expMs)) return false;
    return expMs <= Date.now();
  }, []);

  // 템플릿 만료 판별 헬퍼
  const isTemplateExpired = useCallback((tpl) => {
    if (!tpl) return false;
    return !isTemplateActive(tpl, subscription);
  }, [subscription]);

  // 템플릿 선택 모달 콘텐츠를 선택 상태에 맞게 갱신
  useEffect(() => {
    if (!templatePickerVisible) return;
    const selected = freeTemplates.find(t => t.id === templatePickerSelectedTemplateId) || null;
    const summary = selected
      ? `선택됨: ${selected.name || '템플릿'} (기본 슬롯: ${selected.feature?.baseSlots === -1 ? '무제한' : selected.feature?.baseSlots})`
      : '선택된 템플릿이 없습니다';
    setAlertModalConfig(prev => ({
      ...prev,
      message: summary,
      buttons: [
        { text: '취소', style: 'cancel', onPress: () => setTemplatePickerVisible(false) },
        {
          text: selected ? '확인' : '확인(선택 필요)',
          onPress: () => {
            if (!selected || !templatePickerLocation) return;
            // 선택된 템플릿의 feature/baseSlots를 카테고리에 반영
            const selectedTpl = freeTemplates.find(t => t.id === selected.id);
            if (selectedTpl) {
              dispatch(updateLocation({
                ...templatePickerLocation,
                templateInstanceId: selectedTpl.id,
                productId: selectedTpl.productId,
                feature: selectedTpl.feature,
                disabled: false, // 템플릿 연동 시 활성화
              }));
            }
            // 템플릿 사용 처리
            dispatch({ type: 'auth/markTemplateInstanceAsUsed', payload: { templateId: selected.id, locationId: templatePickerLocation.id } });
            setTemplatePickerVisible(false);
            navigation.navigate('LocationDetail', { locationId: templatePickerLocation.id, from: 'Locations' });
          }
        }
      ],
      content: (
        <ScrollView style={styles.templatePickerList}>
          {freeTemplates.map((tpl) => {
            const isSelected = templatePickerSelectedTemplateId === tpl.id;
            return (
              <TouchableOpacity
                key={tpl.id}
                style={[styles.templatePickerItem, isSelected && styles.templatePickerItemSelected]}
                onPress={() => setTemplatePickerSelectedTemplateId(tpl.id)}
              >
                <View style={styles.templatePickerLeft}>
                  <View style={styles.templatePickerIconBox}>
                    <Ionicons name={tpl.icon || 'cube-outline'} size={18} color="#4CAF50" />
                  </View>
                  <View>
                    <Text style={styles.templatePickerTitle}>{tpl.name || '템플릿'}</Text>
                    <Text style={styles.templatePickerDesc}>
                      기본 슬롯: {tpl.feature?.baseSlots === -1 ? '무제한' : tpl.feature?.baseSlots}
                    </Text>
                    {(() => {
                      const txt = getTemplateExpiryText(tpl);
                      return txt ? (
                        <Text style={[styles.templatePickerDesc, txt.startsWith('만료됨') && { color: '#F44336' }]}>
                          {txt}
                        </Text>
                      ) : null;
                    })()}
                  </View>
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#999" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )
    }));
  }, [templatePickerVisible, templatePickerSelectedTemplateId, freeTemplates, templatePickerLocation, dispatch, navigation, getTemplateExpiryText]);

  // 화면이 포커스될 때마다 카테고리 데이터 로드
  useEffect(() => {
    if (isFocused) {
      console.log('LocationsScreen: 카테고리 목록 로드 시작');
      // 로그인 상태에서 진입 시 템플릿 최신화
      try { if (isLoggedIn) { dispatch(loadUserLocationTemplateInstances()); } } catch (e) {}
      try { if (isLoggedIn) { dispatch(loadUserProductSlotTemplateInstances()); } } catch (e) {}
      if (isLoggedIn) {
        dispatch(fetchLocations())
        .then(result => {
          console.log('LocationsScreen: 카테고리 목록 로드 성공', result);
        })
        .catch(err => {
          console.error('LocationsScreen: 카테고리 목록 로드 실패', err);
        });
        // 만료 카운트 조회(카테고리별 + 전체)
        (async () => {
          try {
            const res = await fetchGuestSectionsExpiredCount();
            const list = Array.isArray(res?.guest_sections) ? res.guest_sections : [];
            const map = {};
            for (const it of list) {
              const id = it?.guest_section_id;
              const count = it?.count;
              if (id == null) continue;
              const n = Number(count);
              map[String(id)] = Number.isFinite(n) ? n : 0;
            }
            const total = Number(res?.total_count);
            setExpiredCountsByLocationId(map);
            setExpiredTotalCount(Number.isFinite(total) ? total : 0);
          } catch (e) {
            // 실패해도 화면은 유지 (뱃지만 미표시)
            setExpiredCountsByLocationId({});
            setExpiredTotalCount(0);
          }
        })();
      }
    }
  }, [dispatch, isFocused]);

  // 로그인 후 자동 연동 모달은 표시하지 않음 (요청사항)
  useEffect(() => {
    // no-op
  }, [isLoggedIn, userLocationTemplateInstances, locations]);

  // route.params.refresh가 변경될 때마다 카테고리 목록 새로고침
  useEffect(() => {
    if (route.params?.refresh) {
      console.log('LocationsScreen: refresh 파라미터 감지, 카테고리 목록 새로고침', route.params.refresh);
      dispatch(fetchLocations());
    }
  }, [dispatch, route.params?.refresh]);
  
  // 디버깅용: locations 변경 감지
  useEffect(() => {
    console.log('LocationsScreen: 현재 카테고리 목록', locations);
  }, [locations]);
  
  // 뒤로가기 버튼 처리
  useEffect(() => {
    const handleBackPress = () => {
      // LocationsScreen이 포커스 상태일 때만 처리
      if (isFocused) {
        // 탭 네비게이터의 홈 탭으로 이동
        navigation.navigate('Home');
        return true; // 기본 뒤로가기 동작 방지
      }
      return false; // 다른 화면에서는 기본 뒤로가기 동작 수행
    };

    // 뒤로가기 이벤트 리스너 등록
    BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
  }, [isFocused, navigation]);

  // 카테고리 추가 화면으로 이동 (카테고리 생성/수정 UI는 최소화하고, 제품 슬롯 관련 UI는 제거됨)
  const handleAddLocation = () => {
    if (tutorial?.active && tutorial?.step === TUTORIAL_STEPS.WAIT_LOCATIONS_PLUS) {
      try { dispatch(setTutorialStep({ step: TUTORIAL_STEPS.WAIT_TEMPLATE_TOP })); } catch (e) {}
      navigation.navigate('AddLocation', { tutorial: true });
      return;
    }
    navigation.navigate('AddLocation');
  };
  
  // 회원가입 유도 메시지 가져오기
  const getSignupPromptMessage = () => {
    // 템플릿이 부족한 경우 (사용 가능한 템플릿이 없는 경우)
    const availableTemplates = userLocationTemplateInstances.filter(template => !template.used);
    if (availableTemplates.length === 0) {
      return '비회원은 최대 1개의 카테고리 템플릿만 사용할 수 있습니다. 회원가입하여 더 많은 카테고리를 생성하세요!';
    }
    
    // 기본 메시지
    return '비회원은 일부 기능이 제한됩니다.\n회원가입 후 모든 기능을 이용해보세요.';
  };

  const handleLocationPress = (location) => {
    // ✅ 튜토리얼: 생성된 카테고리만 클릭 가능
    if (tutorial?.active && tutorial?.step === TUTORIAL_STEPS.WAIT_CREATED_LOCATION_CLICK) {
      if (!isAllowedCreatedLocation(location)) {
        setAlertModalConfig({
          title: '튜토리얼',
          message: '방금 만든 카테고리를 눌러주세요.',
          icon: 'information-circle-outline',
          iconColor: '#4CAF50',
          buttons: [{ text: '확인', style: 'plain' }],
        });
        setAlertModalVisible(true);
        return;
      }
      try { dispatch(setTutorialStep({ step: TUTORIAL_STEPS.WAIT_LOCATION_ADD_PRODUCT })); } catch (e) {}
    }

    // 템플릿 정보가 아직 로드되지 않은 상태(앱 재실행 직후 캐시만 있는 상태)에서는
    // "템플릿 미연동" 같은 오판단을 막기 위해 잠시 대기 안내만 보여줌
    if (isLoggedIn && !location?.templateInstanceId && locationTemplatesStatus !== 'succeeded') {
      setAlertModalConfig({
        title: '불러오는 중',
        message: '템플릿 정보를 불러오는 중입니다.\n잠시만 기다려주세요.',
        icon: 'time-outline',
        iconColor: '#4CAF50',
        buttons: [{ text: '확인', style: 'plain', onPress: () => setAlertModalVisible(false) }],
      });
      setAlertModalVisible(true);
      return;
    }
    // ✅ 만료된 카테고리는 상세 진입 차단 (요청사항: guest-sections.feature.expires_at 기준)
    if (isLoggedIn && isLocationExpired(location)) {
      // 만료된 카테고리라도, 사용 가능한 템플릿이 있으면 즉시 교체 선택으로 유도
      const hasFreeTemplate = userLocationTemplateInstances.some(t => !t.used && !isTemplateExpired(t));
      if (hasFreeTemplate) {
        const free = userLocationTemplateInstances.filter(t => !t.used && !isTemplateExpired(t));
        setFreeTemplates(free);
        setTemplatePickerLocation(location);
        setTemplatePickerSelectedTemplateId(null);
        setAlertModalConfig({
          title: '템플릿 만료됨',
          message: '이 카테고리의 템플릿이 만료되어 상세 화면에 들어갈 수 없습니다.\n사용 가능한 템플릿으로 변경해주세요.',
          icon: 'alert-circle',
          iconColor: '#F44336',
          buttons: [
            { text: '취소', style: 'cancel', onPress: () => setTemplatePickerVisible(false) },
            {
              text: '템플릿 변경',
              onPress: () => {
                // 실제 선택은 모달 리스트에서 수행
                setTemplatePickerVisible(true);
              }
            }
          ],
          content: null
        });
        setTemplatePickerVisible(true);
      } else {
        setAlertModalConfig({
          title: '템플릿 만료됨',
          message: '이 카테고리의 템플릿이 만료되어 상세 화면에 들어갈 수 없습니다.\n새 템플릿을 확보한 뒤 다시 시도해주세요.',
          icon: 'alert-circle',
          iconColor: '#F44336',
          buttons: [{ text: '닫기', style: 'cancel' }],
        });
        setAlertModalVisible(true);
      }
      return;
    }

    // 로그인 상태에서 템플릿에 연동되지 않은 카테고리는 접근 차단
    const linked = !!location?.templateInstanceId;
    const hasFreeTemplate = userLocationTemplateInstances.some(t => !t.used && !isTemplateExpired(t));
    if (isLoggedIn && !linked) {
      if (hasFreeTemplate) {
        // 템플릿 선택 목록 구성
        const free = userLocationTemplateInstances.filter(t => !t.used && !isTemplateExpired(t));
        setFreeTemplates(free);
        setTemplatePickerLocation(location);
        setTemplatePickerSelectedTemplateId(null);
        setAlertModalConfig({
          title: '템플릿 선택',
          message: '선택된 템플릿이 없습니다',
          icon: 'link-outline',
          iconColor: '#4CAF50',
          buttons: [
            { text: '취소', style: 'cancel', onPress: () => setTemplatePickerVisible(false) },
            {
              text: '확인',
              onPress: () => {
                const selected = templatePickerSelectedTemplateId;
                if (!selected) return; // 선택 없으면 무시
                const selectedTpl = freeTemplates.find(t => t.id === selected);
                if (selectedTpl) {
                  dispatch(updateLocation({
                    ...location,
                    templateInstanceId: selectedTpl.id,
                    productId: selectedTpl.productId,
                    feature: selectedTpl.feature,
                    disabled: false, // 템플릿 연동 시 활성화
                  }));
                }
                dispatch({ type: 'auth/markTemplateInstanceAsUsed', payload: { templateId: selected, locationId: location.id } });
                setTemplatePickerVisible(false);
                navigation.navigate('LocationDetail', { locationId: location.id });
              }
            }
          ],
          content: null
        });
        setTemplatePickerVisible(true);
      } else {
        setAlertModalConfig({
          title: '템플릿 부족',
          message: '이 카테고리는 템플릿이 없어 접근할 수 없습니다.',
          icon: 'alert-circle',
          iconColor: '#F44336',
          buttons: [
            { text: '닫기', style: 'cancel' }
          ]
        });
        setAlertModalVisible(true);
      }
      return;
    }
    navigation.navigate('LocationDetail', { locationId: location.id, from: 'Locations' });
  };

  const handleAllProductsPress = () => {
    navigation.navigate('LocationDetail', { 
      locationId: 'all',
      isAllProducts: true,
      from: 'Locations'
    });
  };

  // 로딩 및 에러 상태 처리를 위한 변수
  const isLoading = status === 'loading' && !locations.length;
  const hasError = !!error;
  
  // useMemo로 조건부 렌더링 컴포넌트 준비
  const loadingOrErrorComponent = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      );
    }

    if (hasError) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>오류: {error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => dispatch(fetchLocations())}
          >
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return null;
  }, [isLoading, hasError, error, dispatch]);

  // 로그인 게이트 컴포넌트
  const loginGateComponent = useMemo(() => {
    if (isLoggedIn) return null;
    return (
      <View style={[styles.centered, { paddingHorizontal: 24 }]}>
        <Ionicons name="lock-closed" size={48} color="#4CAF50" style={{ marginBottom: 12 }} />
        <Text style={styles.loginTitle}>로그인이 필요합니다</Text>
        <Text style={styles.loginSubtitle}>내 카테고리 기능을 이용하려면 로그인해주세요.</Text>
        <View style={{ width: '100%', marginTop: 16 }}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.primaryBtnText}>로그인 하러 가기</Text>
          </TouchableOpacity>
        </View>

        {/* 예시 프리뷰 (반투명 카드 + 하단 페이드) */}
        <View style={styles.previewContainer}>
          {[1,2,3].map((i) => (
            <View key={`preview-${i}`} style={styles.previewCard}>
              <View style={styles.previewLeft}>
                <View style={styles.previewIconCircle}>
                  <Ionicons name="cube-outline" size={18} color="#4CAF50" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.previewTitleBar} />
                  <View style={styles.previewSubtitleBar} />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
            </View>
          ))}
          <View pointerEvents="none" style={styles.previewFade} />
        </View>
      </View>
    );
  }, [isLoggedIn]);
  
  // 주의: 훅 호출 순서를 보장하기 위해 중간 early return 금지

  // 템플릿 인스턴스 기준으로 사용 가능한 슬롯 계산 (메모이제이션)
  const nonExpiredTemplates = useMemo(() => userLocationTemplateInstances.filter(t => !isTemplateExpired(t)), [userLocationTemplateInstances, isTemplateExpired]);
  const availableTemplates = useMemo(() => nonExpiredTemplates.filter(template => !template.used), [nonExpiredTemplates]);
  const usedTemplates = useMemo(() => nonExpiredTemplates.filter(template => template.used), [nonExpiredTemplates]);
  const totalTemplates = nonExpiredTemplates.length;
  // 원본(만료 포함) 기준 카운트
  const rawTotalTemplates = userLocationTemplateInstances.length;
  const rawUsedTemplates = useMemo(() => userLocationTemplateInstances.filter(t => t.used).length, [userLocationTemplateInstances]);
  // ✅ 상단 "사용 중"은 '내 카테고리 목록(연동된 카테고리)' 기준으로 표시
  // - 템플릿 목록 API에서 만료된 템플릿이 내려오지 않아도(=실사용 가능 수는 줄어도)
  //   카테고리 목록에는 만료된 카테고리가 남아있을 수 있으므로
  //   사용 중(분자) = 카테고리 목록의 연동된 카테고리 수
  //   전체(분모) = 사용 가능한 템플릿 수(만료 제외)
  const usedLocationCount = useMemo(() => {
    try {
      return (locations || []).filter((l) => !!l?.templateInstanceId).length;
    } catch (e) {
      return 0;
    }
  }, [locations]);
  
  // 템플릿 상태 변경시에만 로그 출력
  useEffect(() => {
    console.log('LocationsScreen - 템플릿 상태:', {
      totalTemplatesValid: totalTemplates,
      usedTemplatesValid: usedTemplates.length,
      availableTemplatesValid: availableTemplates.length,
      expiredTemplateCount: userLocationTemplateInstances.length - nonExpiredTemplates.length,
      templates: userLocationTemplateInstances
    });
  }, [totalTemplates, usedTemplates.length, availableTemplates.length, userLocationTemplateInstances.length, nonExpiredTemplates.length]);

  return (
    <View style={styles.container}>
      {!isLoggedIn ? (
        loginGateComponent
      ) : (isLoading || hasError) ? (
        loadingOrErrorComponent
      ) : (
        <>
          {/* 구독 만료 배너 */}
          {/* 전역 만료 배너 제거. 카테고리별로 안내 */}
          {/* 슬롯 상태 표시 바 - 템플릿 인스턴스 기준 */}
          <SlotStatusBar 
            used={usedLocationCount} 
            total={totalTemplates} 
            type="location" 
          />
          {/* 자동 연동 모달 제거됨 */}
          
          {/* 모든 제품 버튼 */}
          <TouchableOpacity 
            style={styles.allProductsCard}
            onPress={handleAllProductsPress}
          >
            <View style={styles.allProductsIconContainer}>
              <Ionicons name="albums-outline" size={30} color="#4CAF50" />
              {expiredTotalCount > 0 ? (
                <View pointerEvents="none" style={styles.expiredBadgeOnIcon}>
                  <Text style={styles.expiredBadgeText}>{expiredTotalCount}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationTitle}>모든 제품</Text>
              <Text style={styles.locationDescription} numberOfLines={1}>
                등록된 모든 제품을 확인합니다
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#999" style={styles.chevronIcon} />
          </TouchableOpacity>
          
          {/* 카테고리 목록 */}
          <Text style={styles.sectionTitle}>내 카테고리 목록</Text>
          {tutorial?.active && tutorial?.step === TUTORIAL_STEPS.WAIT_LOCATIONS_PLUS ? (
            null
          ) : null}
          {/* 튜토리얼: 목록 클릭 유도는 오버레이로만 처리 */}
          {/* 튜토리얼: 카테고리 상세 진입/제품 등록 유도는 오버레이로만 처리 */}
          
          {/* 카테고리 슬롯 리스트 */}
          <View style={styles.locationsContainer}>
            {locations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>등록된 카테고리가 없습니다.</Text>
                <Text style={styles.emptySubText}>
                  오른쪽 하단의 + 버튼을<br></br> 눌러 카테고리를 추가하세요.
                </Text>
              </View>
            ) : (
              <FlatList
                data={locationsSorted}
                keyExtractor={(item) => String(item.localId || item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    // NOTE: 일부 데이터는 localId만 존재할 수 있어 localId||id로 일관되게 비교합니다.
                    // (튜토리얼 타겟/비활성화/측정 모두 동일 키 사용)
                    // eslint-disable-next-line no-shadow
                    ref={
                      (() => {
                        const itemKey = item?.localId != null ? String(item.localId) : (item?.id != null ? String(item.id) : null);
                        const canMeasure =
                          blockerActiveNewestLocation &&
                          isAllowedCreatedLocation(item) &&
                          (!tutorialTargetLocationId || (itemKey && String(itemKey) === String(tutorialTargetLocationId)));
                        if (canMeasure) {
                          return newestLocationRowRef;
                        }
                        return undefined;
                      })()
                    }
                    collapsable={false}
                    onLayout={() => {
                      const itemKey = item?.localId != null ? String(item.localId) : (item?.id != null ? String(item.id) : null);
                      const canMeasure =
                        blockerActiveNewestLocation &&
                        isAllowedCreatedLocation(item) &&
                        (!tutorialTargetLocationId || (itemKey && String(itemKey) === String(tutorialTargetLocationId)));
                      if (canMeasure) {
                        measureNewestLocationRow();
                      }
                    }}
                    style={[
                      styles.locationListItem,
                      (() => {
                        const itemKey = item?.localId != null ? String(item.localId) : (item?.id != null ? String(item.id) : null);
                        return tutorial?.active && tutorial?.step === TUTORIAL_STEPS.WAIT_CREATED_LOCATION_CLICK && isAllowedCreatedLocation(item)
                          ? styles.tutorialHighlight
                          : null;
                      })(),
                      (() => {
                        const itemKey = item?.localId != null ? String(item.localId) : (item?.id != null ? String(item.id) : null);
                        return tutorial?.active && tutorial?.step === TUTORIAL_STEPS.WAIT_CREATED_LOCATION_CLICK && !isAllowedCreatedLocation(item)
                          ? { opacity: 0.5 }
                          : null;
                      })(),
                    ]}
                    onPress={() => handleLocationPress(item)}
                    disabled={
                      tutorial?.active &&
                      tutorial?.step === TUTORIAL_STEPS.WAIT_CREATED_LOCATION_CLICK &&
                      !isAllowedCreatedLocation(item)
                    }
                  >
                    <View style={styles.locationListItemContent}>
                      <View style={styles.locationIconContainer}>
                        {(() => {
                          const uri = String(item?.imageUrl || item?.image_url || '').trim();
                          if (uri) {
                            return <Image source={{ uri }} style={styles.locationIconImage} resizeMode="cover" />;
                          }
                          return <Ionicons name={item?.icon || 'cube-outline'} size={24} color="#4CAF50" />;
                        })()}
                        {Number(expiredCountsByLocationId?.[String(item.id)] || 0) > 0 ? (
                          <View pointerEvents="none" style={styles.expiredBadgeOnIcon}>
                            <Text style={styles.expiredBadgeText}>
                              {Number(expiredCountsByLocationId[String(item.id)] || 0)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.locationListItemTextContainer}>
                        <Text style={styles.locationListItemTitle}>{item.title}</Text>
                        {item.description ? (
                          <Text style={styles.locationListItemDescription} numberOfLines={1}>
                            {item.description}
                          </Text>
                        ) : null}
                        {(() => {
                          const txt = getTemplateRemainingTextForLocation(item.id);
                          if (!txt) return null;
                          const expired = txt.startsWith('만료됨');
                          return (
                            <Text style={[styles.templateRemainingText, expired && styles.templateRemainingTextExpired]}>
                              {txt}
                            </Text>
                          );
                        })()}
                        {isLoggedIn && locationTemplatesStatus === 'succeeded' && !userLocationTemplateInstances.some(t => t.usedInLocationId === item.id) && (
                          <Text style={{ color: '#F44336', marginTop: 4, fontSize: 12 }}>
                            템플릿 미연동(비활성화)
                          </Text>
                        )}
                        {isLoggedIn && !item?.templateInstanceId && (
                          <Text style={{ color: '#F44336', marginTop: 4, fontSize: 12 }}>
                            템플릿 미연동(비활성화)
                          </Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#999" style={styles.chevronIcon} />
                  </TouchableOpacity>
                )}
              />
            )}
            
            {/* 카테고리 추가 버튼 (우측 하단에 고정) */}
            <TouchableOpacity
              ref={addButtonRef}
              style={[
                styles.addButton,
                tutorial?.active && tutorial?.step === TUTORIAL_STEPS.WAIT_LOCATIONS_PLUS ? styles.tutorialAddButton : null,
              ]}
              onPress={handleAddLocation}
              collapsable={false}
              onLayout={() => {
                if (blockerActive) measureAddButton();
              }}
            >
              <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
          </View>
          
          {/* 회원가입 유도 모달 */}
          <SignupPromptModal 
            visible={showSignupPrompt}
            onClose={() => setShowSignupPrompt(false)}
            message={getSignupPromptMessage()}
            currentCount={userLocationTemplateInstances.filter(template => template.used).length}
            maxCount={1}
          />
          <AlertModal
            visible={alertModalVisible || templatePickerVisible}
            title={alertModalConfig.title}
            message={alertModalConfig.message}
            content={alertModalConfig.content}
            buttons={alertModalConfig.buttons}
            onClose={() => { setAlertModalVisible(false); setTemplatePickerVisible(false); }}
            icon={alertModalConfig.icon}
            iconColor={alertModalConfig.iconColor}
          />
        </>
      )}

      <TutorialTouchBlocker
        active={blockerActive}
        holeRect={addButtonRect}
        hideUntilHole={true}
        message={"'카테고리'를 생성하기 위해서는\n오른쪽 하단의 + 버튼을 터치합니다"}
      />
      <TutorialTouchBlocker
        active={blockerActiveNewestLocation}
        holeRect={newestLocationRowRect}
        hideUntilHole={true}
        messagePlacement={'near'}
        messagePlacementPreference={'below'}
        message={
          tutorialTargetTitle
            ? `"${tutorialTargetTitle}" 카테고리를 터치해주세요.`
            : '방금 만든 카테고리를 터치해주세요.'
        }
      />
    </View>
  );
};

export default LocationsScreen; 