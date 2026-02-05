import { isTemplateActive } from '../utils/validityUtils';
import React, { useEffect, useState, useCallback } from 'react';
import { 

  View, 
  Text, 
  Image,
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { completeTutorial, setTutorialStep, TUTORIAL_STEPS } from '../redux/slices/tutorialSlice';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchLocationById, deleteLocation } from '../redux/slices/locationsSlice';
import { fetchProductsByLocation } from '../redux/slices/productsSlice';
import { releaseTemplateInstance, loadUserProductSlotTemplateInstances } from '../redux/slices/authSlice';
import ProductCard from '../components/ProductCard';
import SlotStatusBar from '../components/SlotStatusBar';
import LocationNotificationSettings from '../components/LocationNotificationSettings';
import { onEvent, EVENT_NAMES } from '../utils/eventBus';
import TutorialTouchBlocker from '../components/TutorialTouchBlocker';

const LocationDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  
  const { locationId, isAllProducts, from } = route.params;
  const isAllProductsView = isAllProducts || locationId === 'all';
  
  const { currentLocation, status, error, locations } = useSelector(state => state.locations);
  const { products, locationProducts: locationProductsCache, status: productsStatus, error: productsError, locationProductsMeta } = useSelector(state => state.products);
  const { user, slots, userProductSlotTemplateInstances, subscription, userLocationTemplateInstances } = useSelector(state => state.auth);
  const tutorial = useSelector(state => state.tutorial);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [locationProducts, setLocationProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('products'); // 'products' 또는 'notifications'
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  // ✅ 앱에서 로컬 정렬/기본 sort 강제하지 않음: 백엔드 응답 순서 그대로 사용
  // (정렬을 쓰고 싶다면 서버 sort 파라미터로만 동작)
  const [sortKey, setSortKey] = useState(null); // null | 'estimated' | 'expiry' | 'created' | 'name' | 'estimatedRate' | 'expiryRate'
  const [sortDesc, setSortDesc] = useState(true);
  const [productsTimedOut, setProductsTimedOut] = useState(false);
  const PRODUCTS_TIMEOUT_MS = 8000;
  const [productsTimerId, setProductsTimerId] = useState(null);
  const didInitialFetchRef = React.useRef(false);
  const listKeyRef = React.useRef(null); // 'all' | locationId (화면 전환 감지용)
  const productsListRef = React.useRef(null);
  const lastScrollOffsetRef = React.useRef(0);
  const shouldRestoreScrollRef = React.useRef(false);
  const addProductButtonRef = React.useRef(null);
  const [addProductButtonRect, setAddProductButtonRect] = useState(null);
  const createdProductRowRef = React.useRef(null);
  const [createdProductRowRect, setCreatedProductRowRect] = useState(null);

  // ✅ 튜토리얼(제품 등록 단계): 이 화면에서는 + 버튼만 터치 가능하게 완전 잠금
  const lockAddProductTutorial = !!(
    tutorial?.active &&
    tutorial?.step === TUTORIAL_STEPS.WAIT_LOCATION_ADD_PRODUCT &&
    !isAllProductsView
  );

  const lockCreatedProductCongrats = !!(
    tutorial?.active &&
    tutorial?.step === TUTORIAL_STEPS.WAIT_CREATED_PRODUCT_CONGRATS &&
    !isAllProductsView &&
    tutorial?.createdProductLocationId != null &&
    String(tutorial.createdProductLocationId) === String(locationId)
  );

  const measureCreatedProductRow = useCallback(() => {
    try {
      const node = createdProductRowRef.current;
      if (!node || typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && typeof y === 'number') {
          setCreatedProductRowRect({ x, y, width, height });
        }
      });
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!lockCreatedProductCongrats) return;
    const t = setTimeout(() => measureCreatedProductRow(), 50);
    return () => clearTimeout(t);
  }, [lockCreatedProductCongrats, measureCreatedProductRow, locationProducts?.length]);

  const measureAddProductButton = useCallback(() => {
    try {
      const node = addProductButtonRef.current;
      if (!node || typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && typeof y === 'number') {
          setAddProductButtonRect({ x, y, width, height });
        }
      });
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!lockAddProductTutorial) return;
    const t = setTimeout(() => measureAddProductButton(), 0);
    return () => clearTimeout(t);
  }, [lockAddProductTutorial, measureAddProductButton]);

  // 백엔드 정렬 파라미터 계산
  const getBackendSortParam = useCallback(() => {
    // sortKey: 'created' | 'estimated' | 'expiry' | 'estimatedRate' | 'expiryRate' | 'name' | null
    // sortDesc: true -> 내림차순 → 접두사 '-'
    const prefix = sortDesc ? '-' : '';
    if (!sortKey) return null; // 정렬 해제 시 서버 기본값 사용(-created)
    if (sortKey === 'created') return `${prefix}created`;
    if (sortKey === 'estimated') return `${prefix}expected_expire`;
    if (sortKey === 'expiry') return `${prefix}expire`;
    if (sortKey === 'estimatedRate') return `${prefix}percent_expected_expire`;
    if (sortKey === 'expiryRate') return `${prefix}percent_expire`;
    if (sortKey === 'name') return `${prefix}title`;
    return null;
  }, [sortKey, sortDesc]);

  // 만료된 구독 템플릿이어도 상세 접근은 허용. 대신 UI 상에서 편집 유도로 처리.
  
  // 카테고리 정보 로드
  useEffect(() => {
    if (!isAllProductsView) {
      dispatch(fetchLocationById(locationId));
    }
  }, [dispatch, locationId, isAllProductsView]);

  // 카테고리(또는 이미지)가 바뀌면 뷰어 닫기
  useEffect(() => {
    setImageViewerVisible(false);
  }, [locationId, isAllProductsView, currentLocation?.imageUrl, currentLocation?.image_url]);
  
  // 제품 목록 로드
  useEffect(() => {
    // 초기 진입: 내 카테고리에서 들어온 경우에만 초기 로딩/초기화 수행
    if (!didInitialFetchRef.current && from === 'Locations') {
      const metaKey = isAllProductsView ? 'all' : locationId;
      const cachedAlready = locationProductsCache?.[metaKey];
      // ✅ 이미 무한스크롤로 쌓아둔 캐시가 있으면, 다시 첫 페이지 fetch로 덮어쓰지 않음
      if (Array.isArray(cachedAlready) && cachedAlready.length > 0) {
        didInitialFetchRef.current = true;
        return;
      }
      setProductsTimedOut(false);
      try { if (productsTimerId) clearTimeout(productsTimerId); } catch (e) {}
      setLocationProducts([]);
      const id = setTimeout(() => {
        if (productsStatus === 'loading') {
          setProductsTimedOut(true);
        }
      }, PRODUCTS_TIMEOUT_MS);
      setProductsTimerId(id);
      if (isAllProductsView) {
        dispatch(fetchProductsByLocation({ locationId: 'all', size: 20, sort: getBackendSortParam() }));
      } else {
        dispatch(fetchProductsByLocation({ locationId, size: 20, sort: getBackendSortParam() }));
      }
      didInitialFetchRef.current = true;
    }
  }, [dispatch, locationId, isAllProductsView, from, getBackendSortParam, locationProductsCache, productsStatus, productsTimerId]);

  // 포커스 시점마다 제품/템플릿 최신화 (슬롯 계산 즉시 반영)
  useFocusEffect(
    React.useCallback(() => {
      // 포커스 시에는 제품 API 재호출 금지(요청사항), 템플릿만 최신화
      try { dispatch(loadUserProductSlotTemplateInstances()); } catch (e) {}
      // ✅ 제품 등록/수정 화면 다녀온 뒤 FlatList 스크롤이 0으로 리셋되는 케이스 방지
      // (detachInactiveScreens를 쓰지 않는 대신, 화면 포커스 복귀 시 1회만 복원 시도)
      shouldRestoreScrollRef.current = true;
      return () => {};
    }, [dispatch, isAllProductsView, locationId])
  );

  const tryRestoreScroll = React.useCallback(() => {
    if (!shouldRestoreScrollRef.current) return;
    const offset = lastScrollOffsetRef.current || 0;
    // 0이면 복원할 게 없음
    if (offset <= 0) {
      shouldRestoreScrollRef.current = false;
      return;
    }
    // 데이터가 없으면 다음 기회에
    if (!Array.isArray(locationProducts) || locationProducts.length === 0) return;
    try {
      productsListRef.current?.scrollToOffset?.({ offset, animated: false });
      shouldRestoreScrollRef.current = false;
    } catch (e) {}
  }, [locationProducts]);

  // ✅ Event-driven refresh: 생성/수정 이벤트를 받아 현재 리스트만 부분 업데이트 (refetch/초기화 없이)
  useEffect(() => {
    const unsubUpdated = onEvent(EVENT_NAMES.PRODUCT_UPDATED, (payload) => {
      const id = String(payload?.id ?? '');
      if (!id) return;
      setLocationProducts((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        const idx = prev.findIndex((p) => String(p?.id) === id);
        if (idx === -1) return prev;
        // 카테고리가 변경된 수정이라면, 현재 화면이 특정 카테고리 보기일 때 리스트에서 제거
        const newLocId = payload?.patch?.locationId != null ? String(payload.patch.locationId) : (payload?.locationId != null ? String(payload.locationId) : null);
        if (!isAllProductsView && newLocId && String(locationId) !== String(newLocId)) {
          const next = prev.filter((p) => String(p?.id) !== id);
          return next;
        }
        const next = [...prev];
        next[idx] = { ...next[idx], ...(payload?.patch || {}) };
        return next;
      });
    });

    const unsubCreated = onEvent(EVENT_NAMES.PRODUCT_CREATED, (payload) => {
      const product = payload?.product;
      const id = product?.id != null ? String(product.id) : '';
      if (!id) return;
      const targetLocId = product?.locationId != null ? String(product.locationId) : null;

      // 현재 화면이 특정 카테고리 보기라면 해당 카테고리일 때만 반영
      if (!isAllProductsView && String(locationId) !== String(targetLocId)) return;

      setLocationProducts((prev) => {
        if (!Array.isArray(prev)) return prev;
        if (prev.some((p) => String(p?.id) === id)) return prev;
        // 신규 생성품은 목록 맨 위에 노출
        return [product, ...prev];
      });
    });

    // ✅ 소진/삭제 등으로 활성 목록에서 제거되는 이벤트
    const unsubRemoved = onEvent(EVENT_NAMES.PRODUCT_REMOVED, (payload) => {
      const id = String(payload?.id ?? '');
      if (!id) return;
      setLocationProducts((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        return prev.filter((p) => String(p?.id) !== id);
      });
    });

    return () => {
      try { unsubUpdated(); } catch (e) {}
      try { unsubCreated(); } catch (e) {}
      try { unsubRemoved(); } catch (e) {}
    };
  }, [isAllProductsView, locationId]);

  // 데이터가 도착하면 타임아웃 타이머 해제
  useEffect(() => {
    if (productsStatus !== 'loading') {
      try { if (productsTimerId) clearTimeout(productsTimerId); } catch (e) {}
      setProductsTimedOut(false);
    }
  }, [productsStatus]);
  
  // 활성화/만료 상태 헬퍼 (카테고리)
  const isLocExpired = useCallback((loc) => {
    try {
      const locKey = loc?.id;
      const tpl = (userLocationTemplateInstances || []).find(t => t.usedInLocationId === locKey) || null;
      if (!tpl) return false;
      return !isTemplateActive(tpl, subscription);
    } catch (e) { return false; }
  }, [userLocationTemplateInstances, subscription]);

  // 제품 목록 필터링
  useEffect(() => {
    const key = isAllProductsView ? 'all' : String(locationId);
    const prevKey = listKeyRef.current;
    const keyChanged = prevKey !== key;
    if (keyChanged) listKeyRef.current = key;

    const isSameOrderById = (a, b) => {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i += 1) {
        const aid = String(a[i]?.id ?? a[i]?.localId ?? '');
        const bid = String(b[i]?.id ?? b[i]?.localId ?? '');
        if (aid !== bid) return false;
      }
      return true;
    };

    // ✅ 스크롤 점프 방지:
    // - 화면 key가 바뀐 경우(다른 카테고리/모든 제품으로 이동)만 캐시/필터 결과를 주입
    // - 같은 화면 key에서 Redux 캐시가 갱신되더라도(예: 수정 patch), 여기서 리스트를 통째로 set 하지 않음
    //   → 이벤트 기반 부분 업데이트로만 반영
    if (!keyChanged) {
      // 단, 초기 상태(비어있음)이고 캐시가 있다면 1회 채움은 허용
      if (locationProducts.length === 0) {
        const cached = locationProductsCache?.[key];
        if (Array.isArray(cached) && cached.length > 0) {
          setLocationProducts(cached);
        }
      }
      // ✅ 백엔드/Redux 캐시의 "순서"가 바뀐 경우는 반영해야 함
      // (예: 서버가 정렬/커서 기준으로 새 순서를 내려줬는데, 로컬 state가 이전 순서로 남아있는 경우)
      const cached = locationProductsCache?.[key];
      if (Array.isArray(cached) && cached.length > 0 && Array.isArray(locationProducts) && locationProducts.length > 0) {
        if (!isSameOrderById(locationProducts, cached)) {
          // 현재 스크롤 위치는 유지하도록 복원 플래그 세팅
          shouldRestoreScrollRef.current = true;
          setLocationProducts(cached);
        }
      }
      return;
    }

    // keyChanged === true: 새 화면으로 전환된 경우에만 리스트 구성
    const cached = locationProductsCache?.[key];
    if (Array.isArray(cached)) {
      setLocationProducts(cached);
      return;
    }

    // 캐시가 없으면 로컬 필터 폴백
    if (isAllProductsView) {
        // locationId 타입(number/string)이 섞여도 필터에서 누락되지 않도록 String으로 통일
        const activeLocIds = new Set(
          (locations || [])
            .filter(loc => loc && loc.disabled !== true && !isLocExpired(loc))
            .map(loc => String(loc.id))
        );
        const fallback = (products || []).filter(p => {
        const k = p.locationLocalId || p.locationId;
        return !!k && activeLocIds.has(String(k)) && p.syncStatus !== 'deleted' && !p.isConsumed;
        });
        setLocationProducts(fallback);
      } else {
        const filteredProducts = (products || []).filter(product => 
        String(product.locationId) === String(locationId) && product.syncStatus !== 'deleted' && !product.isConsumed
        );
        setLocationProducts(filteredProducts);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, locationProductsCache, locationId, isAllProductsView, locations, isLocExpired, locationProducts.length]);

  // 비율 계산 헬퍼
  const computeRate = useCallback((startIso, endIso) => {
    try {
      const now = Date.now();
      const start = startIso ? new Date(startIso).getTime() : null;
      const end = endIso ? new Date(endIso).getTime() : null;
      if (!end || !isFinite(end)) return null;
      const s = start && isFinite(start) ? start : null;
      // 시작이 없으면 종료 30일 전을 가정(보수적 기본치)
      const assumedStart = s || (end - 30 * 24 * 60 * 60 * 1000);
      const total = end - assumedStart;
      if (total <= 0) return null;
      const elapsed = Math.max(0, Math.min(total, now - assumedStart));
      return Math.round((elapsed / total) * 100);
    } catch {
      return null;
    }
  }, []);

  const getExpiryRate = useCallback((p) => {
    // 유통률: purchaseDate(있으면) 또는 createdAt ~ expiryDate 진행률
    return computeRate(p.purchaseDate || p.createdAt, p.expiryDate);
  }, [computeRate]);

  const getEstimatedRate = useCallback((p) => {
    // 소진률: purchaseDate(있으면) 또는 createdAt ~ estimatedEndDate 진행률
    return computeRate(p.purchaseDate || p.createdAt, p.estimatedEndDate);
  }, [computeRate]);

  // 정렬 로직
  const sortProducts = useCallback((list) => {
    const input = list || [];
    if (!sortKey) return [...input]; // 정렬 취소 시 원본 순서 유지

    const dir = sortDesc ? -1 : 1; // 내림차순: -1, 오름차순: 1
    const getName = (x) => (x?.name || x?.title || '').toString();
    const cmpByName = (a, b) => getName(a).localeCompare(getName(b)) * (sortDesc ? -1 : 1);
    const cmpNum = (av, bv) => (av === bv ? 0 : (av > bv ? dir : -dir));
    const normalizeRate = (r) => {
      if (r == null) return null;
      const n = Number(r);
      if (!isFinite(n)) return null;
      return Math.max(0, Math.min(100, Math.round(n)));
    };

    // 1) 소진순: 소진예상 없음 → 끝으로 보냄(원래 순서 유지)
    if (sortKey === 'estimated') {
      const present = input.filter(p => !!p.estimatedEndDate);
      const missing = input.filter(p => !p.estimatedEndDate);
      present.sort((a, b) => {
        const av = new Date(a.estimatedEndDate).getTime();
        const bv = new Date(b.estimatedEndDate).getTime();
        if (av === bv) return getName(a).localeCompare(getName(b));
        return cmpNum(av, bv);
      });
      return [...present, ...missing];
    }

    // 2) 유통순: 유통기한 없음 → 끝으로 보냄(원래 순서 유지)
    if (sortKey === 'expiry') {
      const present = input.filter(p => !!p.expiryDate);
      const missing = input.filter(p => !p.expiryDate);
      present.sort((a, b) => {
        const av = new Date(a.expiryDate).getTime();
        const bv = new Date(b.expiryDate).getTime();
        if (av === bv) return getName(a).localeCompare(getName(b));
        return cmpNum(av, bv);
      });
      return [...present, ...missing];
    }

    // 3) 소진률%: 계산 불가(null) → 끝으로 보냄(원래 순서 유지), 소진예상 있는 항목 우선
    if (sortKey === 'estimatedRate') {
      const present = input.filter(p => !!p.estimatedEndDate);
      const missing = input.filter(p => !p.estimatedEndDate);
      present.sort((a, b) => {
        const ra = normalizeRate(getEstimatedRate(a));
        const rb = normalizeRate(getEstimatedRate(b));
        const av = ra == null ? 0 : ra;
        const bv = rb == null ? 0 : rb;
        if (av === bv) {
          const ad = new Date(a.estimatedEndDate).getTime();
          const bd = new Date(b.estimatedEndDate).getTime();
          if (ad !== bd) return cmpNum(ad, bd);
          return getName(a).localeCompare(getName(b));
        }
        return cmpNum(av, bv);
      });
      return [...present, ...missing];
    }

    // 4) 유통률%: 계산 불가(null) → 끝으로 보냄(원래 순서 유지), 유통기한 있는 항목 우선
    if (sortKey === 'expiryRate') {
      const present = input.filter(p => !!p.expiryDate);
      const missing = input.filter(p => !p.expiryDate);
      present.sort((a, b) => {
        const ra = normalizeRate(getExpiryRate(a));
        const rb = normalizeRate(getExpiryRate(b));
        const av = ra == null ? 0 : ra;
        const bv = rb == null ? 0 : rb;
        if (av === bv) {
          const ad = new Date(a.expiryDate).getTime();
          const bd = new Date(b.expiryDate).getTime();
          if (ad !== bd) return cmpNum(ad, bd);
          return getName(a).localeCompare(getName(b));
        }
        return cmpNum(av, bv);
      });
      return [...present, ...missing];
    }

    // 5) 등록순 / 이름순 기존 동작 유지
    if (sortKey === 'created') {
      const arr = [...input];
      arr.sort((a, b) => {
        const av = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bv = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (av === bv) return getName(a).localeCompare(getName(b));
        return cmpNum(av, bv);
      });
      return arr;
    }

    // name
    const arr = [...input];
    arr.sort(cmpByName);
    return arr;
  }, [sortKey, sortDesc, getEstimatedRate, getExpiryRate]);

  // 정렬 칩 클릭 시: 내림차순 → 오름차순 → 정렬 해제 순환
  const handleSortPress = useCallback((key) => {
    // 다음 상태 계산
    let nextKey = sortKey;
    let nextDesc = sortDesc;
    if (sortKey !== key) {
      nextKey = key;
      nextDesc = true; // 새 키는 기본 내림차순
    } else if (sortDesc) {
      nextDesc = false; // 오름차순
    } else {
      nextKey = null; // 정렬 해제
    }
    setSortKey(nextKey);
    setSortDesc(nextDesc);

    // 서버 정렬 적용: 정렬 해제가 아닌 경우만 호출
    if (nextKey) {
      // ✅ 정렬을 눌렀을 때는 스크롤을 항상 맨 위로 이동
      shouldRestoreScrollRef.current = false;
      lastScrollOffsetRef.current = 0;
      try { productsListRef.current?.scrollToOffset?.({ offset: 0, animated: true }); } catch (e) {}
      setProductsTimedOut(false);
      try { if (productsTimerId) clearTimeout(productsTimerId); } catch (e) {}
      setLocationProducts([]);
      const id = setTimeout(() => {
        if (productsStatus === 'loading') {
          setProductsTimedOut(true);
        }
      }, PRODUCTS_TIMEOUT_MS);
      setProductsTimerId(id);
      const prefix = nextDesc ? '-' : '';
      const sortParam =
        nextKey === 'created' ? `${prefix}created` :
        nextKey === 'estimated' ? `${prefix}expected_expire` :
        nextKey === 'expiry' ? `${prefix}expire` :
        nextKey === 'estimatedRate' ? `${prefix}percent_expected_expire` :
        nextKey === 'expiryRate' ? `${prefix}percent_expire` :
        nextKey === 'name' ? `${prefix}title` : null;
      const targetId = isAllProductsView ? 'all' : locationId;
      dispatch(fetchProductsByLocation({ locationId: targetId, size: 20, sort: sortParam }));
    }
  }, [sortKey, sortDesc, isAllProductsView, productsTimerId, productsStatus, PRODUCTS_TIMEOUT_MS, dispatch, locationId]);
  
  // 뒤로가기 핸들러
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // 카테고리 삭제 확인 모달 표시
  const handleDeletePress = () => {
    setShowDeleteConfirm(true);
  };
  
  // 카테고리 삭제 실행
  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
    
    try {
      // 카테고리 삭제
      await dispatch(deleteLocation(locationId)).unwrap();
      
      // 템플릿 인스턴스 해제 (다시 사용 가능하게)
      if (currentLocation?.templateInstanceId) {
        dispatch(releaseTemplateInstance(locationId));
      }
      
          navigation.goBack();
    } catch (error) {
      Alert.alert('오류', '카테고리 삭제 중 문제가 발생했습니다.');
    }
  };
  
  // (제거) 카테고리 수정 화면으로 이동 UI (요청사항)
  
  // 제품 추가 화면으로 이동
  const handleAddProduct = () => {
    if (tutorial?.active && tutorial?.step === TUTORIAL_STEPS.WAIT_LOCATION_ADD_PRODUCT) {
      try { dispatch(setTutorialStep({ step: TUTORIAL_STEPS.WAIT_PRODUCT_NAME })); } catch (e) {}
      // ✅ 튜토리얼에서는 네비게이션 헤더를 숨겨 오버레이 좌표계/레이아웃 꼬임 방지
      navigation.navigate('ProductDetail', { mode: 'create', locationId, tutorial: true, hideHeader: true });
      return;
    }
    navigation.navigate('ProductDetail', { mode: 'create', locationId });
  };
  
  // 제품 상세 화면으로 이동
  const handleProductPress = (product) => {
    // 제품 상세로 이동 시, 리스트에서 가져온 제품 객체를 함께 전달
    navigation.navigate('ProductDetail', { productId: product.id, product });
  };
  
  // 탭 변경 핸들러
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  // 로딩 중 표시
  if (!isAllProductsView && status === 'loading') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity 
            style={styles.backButton}
            onPress={handleGoBack}
            >
            <Ionicons name="arrow-back" size={24} color="#4CAF50" />
            </TouchableOpacity>
          <Text style={styles.loadingText}>로딩 중...</Text>
          </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </View>
    );
  }
  
  // 오류 표시
  if (!isAllProductsView && error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity 
            style={styles.backButton}
            onPress={handleGoBack}
            >
            <Ionicons name="arrow-back" size={24} color="#4CAF50" />
            </TouchableOpacity>
          <Text style={styles.headerTitle}>오류</Text>
          </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>오류: {error}</Text>
            <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => dispatch(fetchLocationById(locationId))}
            >
            <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
            </View>
    );
  }
  
  // 제품 슬롯 계산
  const calculateProductSlots = () => {
    if (isAllProductsView) {
      return { used: products.length, total: 999 }; // 모든 제품 보기에서는 슬롯 제한 없음
    }
    
    // 카테고리의 기본 슬롯 + 해당 카테고리에 등록된 추가 제품 슬롯 수
    const baseSlots = currentLocation?.feature?.baseSlots ?? slots.productSlots.baseSlots;
    const assignedExtra = (userProductSlotTemplateInstances || [])
      .filter(t => t.assignedLocationId === locationId)
      .filter(t => isTemplateActive(t, subscription))
      .length;
    const totalSlots = baseSlots === -1 ? -1 : (baseSlots + assignedExtra); // -1은 무제한
    
    return { 
      used: locationProducts.length,
      total: totalSlots
    };
  };
  
  const { used: usedSlots, total: totalSlots } = calculateProductSlots();
  
  // 슬롯 상태에 따른 제품 추가 가능 여부
  // 템플릿 만료 시에는 제품 추가/삭제/변경은 막고, 상세 조회/수정 화면 진입만 허용
  const linkedTemplate = (userLocationTemplateInstances || []).find(t => t.usedInLocationId === locationId) || null;
  const isTemplateExpired = linkedTemplate ? !isTemplateActive(linkedTemplate, subscription) : false;
  const canAddProduct = !isTemplateExpired && (totalSlots === -1 || usedSlots < totalSlots);
  
  // 제품 목록 탭 렌더링
  const renderProductsTab = () => {
    return (
      <View style={styles.productsContainer}>
        <View style={styles.sortBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortBarContent}>
            <TouchableOpacity style={[styles.sortChip, sortKey === 'created' && styles.sortChipActive]} onPress={() => handleSortPress('created')}>
              <Text style={[styles.sortChipText, sortKey === 'created' && styles.sortChipTextActive]}>등록순</Text>
              {sortKey === 'created' && (
                <Ionicons name={sortDesc ? 'arrow-down' : 'arrow-up'} size={14} color="#4CAF50" style={styles.sortChipArrow} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sortChip, sortKey === 'estimated' && styles.sortChipActive]} onPress={() => handleSortPress('estimated')}>
              <Text style={[styles.sortChipText, sortKey === 'estimated' && styles.sortChipTextActive]}>소진순</Text>
              {sortKey === 'estimated' && (
                <Ionicons name={sortDesc ? 'arrow-down' : 'arrow-up'} size={14} color="#4CAF50" style={styles.sortChipArrow} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sortChip, sortKey === 'expiry' && styles.sortChipActive]} onPress={() => handleSortPress('expiry')}>
              <Text style={[styles.sortChipText, sortKey === 'expiry' && styles.sortChipTextActive]}>유통순</Text>
              {sortKey === 'expiry' && (
                <Ionicons name={sortDesc ? 'arrow-down' : 'arrow-up'} size={14} color="#4CAF50" style={styles.sortChipArrow} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sortChip, sortKey === 'estimatedRate' && styles.sortChipActive]} onPress={() => handleSortPress('estimatedRate')}>
              <Text style={[styles.sortChipText, sortKey === 'estimatedRate' && styles.sortChipTextActive]}>소진률%</Text>
              {sortKey === 'estimatedRate' && (
                <Ionicons name={sortDesc ? 'arrow-down' : 'arrow-up'} size={14} color="#4CAF50" style={styles.sortChipArrow} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sortChip, sortKey === 'expiryRate' && styles.sortChipActive]} onPress={() => handleSortPress('expiryRate')}>
              <Text style={[styles.sortChipText, sortKey === 'expiryRate' && styles.sortChipTextActive]}>유통률%</Text>
              {sortKey === 'expiryRate' && (
                <Ionicons name={sortDesc ? 'arrow-down' : 'arrow-up'} size={14} color="#4CAF50" style={styles.sortChipArrow} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sortChip, sortKey === 'name' && styles.sortChipActive]} onPress={() => handleSortPress('name')}>
              <Text style={[styles.sortChipText, sortKey === 'name' && styles.sortChipTextActive]}>이름순</Text>
              {sortKey === 'name' && (
                <Ionicons name={sortDesc ? 'arrow-down' : 'arrow-up'} size={14} color="#4CAF50" style={styles.sortChipArrow} />
              )}
            </TouchableOpacity>
          </ScrollView>
      </View>
        {/* 정렬 바 아래에서 상태별로 렌더링 */}
        <View>
        {(productsStatus === 'loading' && !productsTimedOut) ? (
          <View style={styles.loadingListContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingInlineText}>제품 목록을 불러오는 중...</Text>
          </View>
        ) : (!isAllProductsView && productsTimedOut) ? (
          <View style={styles.loadingListContainer}>
            <Text style={styles.errorText}>연결 지연으로 제품 목록을 가져오지 못했습니다.</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setProductsTimedOut(false);
                try { if (productsTimerId) clearTimeout(productsTimerId); } catch (e) {}
                const id = setTimeout(() => {
                  if (productsStatus === 'loading') setProductsTimedOut(true);
                }, PRODUCTS_TIMEOUT_MS);
                setProductsTimerId(id);
                setLocationProducts([]);
                const targetId = isAllProductsView ? 'all' : locationId;
                dispatch(fetchProductsByLocation({ locationId: targetId, size: 20, sort: getBackendSortParam() }));
              }}
            >
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : (!isAllProductsView && productsStatus === 'failed') ? (
          <View style={styles.loadingListContainer}>
            <Text style={styles.errorText}>오류: {productsError || '제품 목록을 불러오지 못했습니다.'}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setProductsTimedOut(false);
                setLocationProducts([]);
                const targetId = isAllProductsView ? 'all' : locationId;
                dispatch(fetchProductsByLocation({ locationId: targetId, size: 20, sort: getBackendSortParam() }));
              }}
            >
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // 정상 데이터 렌더링
          <>
            {locationProducts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>등록된 제품이 없습니다.</Text>
                {!isAllProductsView && (
                  <Text style={styles.emptySubText}>
                    오른쪽 하단의 + 버튼을<br></br> 눌러 제품을 추가하세요.
                  </Text>
                )}
              </View>
            ) : (
              <FlatList
                ref={productsListRef}
                data={locationProducts}
                keyExtractor={(item) => String(item.localId || item.id)}
                renderItem={({ item }) => {
                  const wantName =
                    tutorial?.createdProductName != null ? String(tutorial.createdProductName).trim() : '';
                  const itemName = String(item?.name || item?.title || '').trim();
                  const isTargetCreatedProduct =
                    lockCreatedProductCongrats && !!wantName && !!itemName && itemName === wantName;
                  const card = (
                    <ProductCard
                      product={item}
                      onPress={() => handleProductPress(item)}
                    />
                  );
                  if (!isTargetCreatedProduct) return card;
                  return (
                    <View
                      ref={createdProductRowRef}
                      collapsable={false}
                      onLayout={() => {
                        if (lockCreatedProductCongrats) measureCreatedProductRow();
                      }}
                    >
                      {card}
                    </View>
                  );
                }}
                contentContainerStyle={styles.productsList}
                scrollEventThrottle={16}
                onScroll={(e) => {
                  const y = e?.nativeEvent?.contentOffset?.y ?? 0;
                  if (typeof y === 'number') lastScrollOffsetRef.current = y;
                }}
                onLayout={() => {
                  // 레이아웃이 잡힌 뒤 복원 시도
                  tryRestoreScroll();
                }}
                onContentSizeChange={() => {
                  // 데이터 변경으로 콘텐츠가 준비된 뒤 복원 시도
                  tryRestoreScroll();
                }}
                onEndReachedThreshold={0.5}
                onEndReached={() => {
                  const metaKey = isAllProductsView ? 'all' : locationId;
                  const meta = locationProductsMeta?.[metaKey];
                  const isLoadingMore = productsStatus === 'loading' && locationProducts.length > 0;
                  if (meta?.hasMore && !isLoadingMore) {
                    dispatch(fetchProductsByLocation({
                      locationId: metaKey,
                      nextCursor: meta.nextCursor || null,
                      size: 20,
                      sort: getBackendSortParam(),
                      append: true,
                    }));
                  }
                }}
                ListFooterComponent={() => {
                  const metaKey = isAllProductsView ? 'all' : locationId;
                  const meta = locationProductsMeta?.[metaKey];
                  const isLoadingMore = productsStatus === 'loading' && locationProducts.length > 0;
                  if (meta?.hasMore && isLoadingMore) {
                    return (
                      <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#4CAF50" />
                      </View>
                    );
                  }
                  return null;
                }}
              />
            )}
          </>
        )}
        </View>
        
      </View>
    );
  };

  const renderAddProductButton = () => {
    if (isAllProductsView) return null;
    return (
      <TouchableOpacity
        ref={addProductButtonRef}
        style={[
          styles.addButton,
          !canAddProduct && styles.disabledButton,
        ]}
        onPress={handleAddProduct}
        disabled={!canAddProduct}
        collapsable={false}
        onLayout={() => {
          if (lockAddProductTutorial) measureAddProductButton();
        }}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    );
  };
  
  // 알림 설정 탭 렌더링
  const renderNotificationsTab = () => {
    return (
      <ScrollView style={styles.notificationsContainer}>
        <LocationNotificationSettings locationId={locationId} location={currentLocation} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* 튜토리얼: 제품 등록 유도는 오버레이로만 처리 */}
      <TutorialTouchBlocker
        active={lockAddProductTutorial}
        holeRect={addProductButtonRect}
        message={'제품을 만들기 위해\n우측 하단 + 버튼을 터치해주세요.'}
        actionLabel={'터치'}
      />
      {/* 튜토리얼: 첫 제품 생성 축하 (방금 만든 제품만 강조) */}
      <TutorialTouchBlocker
        active={lockCreatedProductCongrats}
        holeRect={createdProductRowRect}
        // 측정/리스트 반영 타이밍 이슈가 있어도 축하 메시지는 항상 보이게(확인 버튼 포함)
        hideUntilHole={false}
        messagePlacement={'near'}
        messagePlacementPreference={'below'}
        message={"축하합니다~\n첫 제품을 생성했습니다~\n이제 소모미를 열심히 이용해보세요!"}
        showActionLabel={false}
        ctaText={'확인'}
        onCtaPress={async () => {
          try { dispatch(completeTutorial()); } catch (e) {}
        }}
      />
      {/* ✅ 잠금 UI는 오버레이 1개로, 여기서는 터치만 차단 */}
      <View style={{ flex: 1 }} pointerEvents={(lockAddProductTutorial || lockCreatedProductCongrats) ? 'none' : 'auto'}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleGoBack}
          >
            <Ionicons name="arrow-back" size={24} color="#4CAF50" />
          </TouchableOpacity>
          
          {isAllProductsView ? (
            <>
            <View style={styles.locationIconContainer}>
                <Ionicons name="albums-outline" size={24} color="#4CAF50" />
            </View>
          <View style={styles.headerTextContainer}>
                <Text style={styles.locationTitle}>모든 제품</Text>
                <Text style={styles.locationDescription}>등록된 모든 제품을 확인합니다</Text>
              </View>
            </>
          ) : currentLocation && (
            <>
            <View style={styles.locationIconContainer}>
                {(() => {
                  const uri = String(currentLocation?.imageUrl || currentLocation?.image_url || '').trim();
                  if (uri) {
                    return (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setImageViewerVisible(true)}
                        style={{ width: '100%', height: '100%' }}
                      >
                        <Image source={{ uri }} style={styles.locationIconImage} resizeMode="cover" />
                      </TouchableOpacity>
                    );
                  }
                  return <Ionicons name={currentLocation?.icon || 'cube-outline'} size={24} color="#4CAF50" />;
                })()}
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.locationTitle}>{currentLocation.title}</Text>
                {currentLocation.description ? (
                  <Text style={styles.locationDescription} numberOfLines={1}>
                    {currentLocation.description}
                  </Text>
                ) : null}
            </View>
            </>
            )}
          </View>
          
        {/* 카테고리 수정/삭제 버튼 (모든 제품 보기가 아닐 때만 표시) */}
        {!isAllProductsView && (
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.headerActionButton}
                onPress={() => {
                  try {
                    navigation.navigate('AddLocation', { 
                      isEditMode: true,
                      location: currentLocation
                    });
                  } catch (e) {}
                }}
              >
                <Ionicons name="create-outline" size={24} color="#4CAF50" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerActionButton}
              onPress={handleDeletePress}
              >
                <Ionicons name="trash-outline" size={24} color="#F44336" />
              </TouchableOpacity>
            </View>
          )}
        </View>

      {/* 카테고리 이미지 전체보기 모달 (제품 이미지 뷰어와 동일 UX) */}
      {(() => {
        const uri = String(currentLocation?.imageUrl || currentLocation?.image_url || '').trim();
        if (!uri) return null;
        return (
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
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={styles.imageViewerBody}>
                <Image source={{ uri }} style={styles.imageViewerImage} resizeMode="contain" />
              </View>
            </View>
          </Modal>
        );
      })()}
        
      {/* 슬롯 상태 표시 (모든 제품 보기가 아닐 때만 표시) */}
      {!isAllProductsView && (
          <SlotStatusBar 
          used={usedSlots} 
          total={totalSlots} 
            type="product" 
          />
        )}
        
      {/* 탭 메뉴 (모든 제품 보기가 아닐 때만 표시) */}
      {!isAllProductsView && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
            style={[styles.tab, activeTab === 'products' && styles.activeTab]}
            onPress={() => handleTabChange('products')}
            >
            <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
                제품 목록
              </Text>
            </TouchableOpacity>
          
            <TouchableOpacity
              style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
            onPress={() => handleTabChange('notifications')}
            >
              <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
                알림 설정
              </Text>
            </TouchableOpacity>
              </View>
            )}
      
      {/* 탭 내용 */}
      {isAllProductsView || activeTab === 'products' ? renderProductsTab() : renderNotificationsTab()}
      </View>

      {/* + 버튼은 튜토리얼에서도 클릭 가능해야 하므로 dim wrapper 밖에 렌더 */}
      {(!isAllProductsView && activeTab === 'products') ? renderAddProductButton() : null}
      
      {/* 삭제 확인 모달 */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>카테고리 삭제</Text>
            <Text style={styles.modalMessage}>
              이 카테고리를 삭제하시겠습니까? 카테고리 내의 모든 제품 정보도 함께 삭제됩니다.
            </Text>
            <Text style={styles.modalWarning}>안전한 삭제를 위해 아래에 "삭제하기"를 입력하세요.</Text>
            <TextInput
              style={styles.confirmInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="삭제하기"
              placeholderTextColor="#bbb"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton, deleteConfirmText.trim() !== '삭제하기' && styles.confirmButtonDisabled]}
                onPress={handleDeleteConfirm}
                disabled={deleteConfirmText.trim() !== '삭제하기'}
              >
                <Text style={styles.confirmButtonText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  tutorialBanner: {
    backgroundColor: 'rgba(76,175,80,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    margin: 16,
    marginBottom: 0,
  },
  tutorialBannerText: {
    color: '#1B5E20',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  locationIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  locationIconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 48,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
  imageViewerBody: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
  headerTextContainer: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  locationDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeTab: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
  },
  productsContainer: {
    flex: 1,
    position: 'relative',
  },
  loadingContainerInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  loadingInlineText: {
    marginLeft: 8,
    color: '#666',
  },
  errorInlineContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  loadingListContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sortBarContent: {
    alignItems: 'center',
    paddingRight: 8,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#f1f8e9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#c5e1a5',
    flexDirection: 'row', // Added for arrow alignment
    alignItems: 'center', // Added for arrow alignment
  },
  sortChipActive: {
    backgroundColor: '#c8e6c9',
    borderColor: '#81c784',
  },
  sortChipText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  sortChipTextActive: {
    fontWeight: '600',
  },
  sortDirBtn: {
    marginLeft: 'auto',
    padding: 6,
  },
  sortChipArrow: {
    marginLeft: 4,
  },
  notificationsContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  productsList: {
    padding: 16,
    paddingBottom: 80, // 하단 버튼을 위한 여백
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#9E9E9E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalWarning: {
    fontSize: 13,
    color: '#F44336',
    marginBottom: 10,
  },
  confirmInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  confirmButton: {
    backgroundColor: '#F44336',
  },
  confirmButtonDisabled: {
    backgroundColor: '#F8BBD0',
  },
  cancelButtonText: {
    color: '#333',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default LocationDetailScreen; 