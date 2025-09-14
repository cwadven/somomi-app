import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { saveUserLocationTemplates, loadUserLocationTemplates, saveUserProductSlotTemplates, loadUserProductSlotTemplates, saveJwtToken, loadJwtToken, removeJwtToken, saveDeviceId, loadDeviceId, saveLocations, saveProducts, saveConsumedProducts } from '../../utils/storageUtils';
import { generateId } from '../../utils/idUtils';
import { resetLocationsState } from './locationsSlice';

// 디바이스 기반 기본 템플릿 ID 생성기
const buildDeterministicTemplateId = (deviceId) => `locationTemplate_${deviceId}`;
// 템플릿 ID 유니크 보장 보조 함수
const ensureUniqueTemplateId = (existingTemplates, preferredId) => {
  if (!existingTemplates || existingTemplates.length === 0) return preferredId;
  const exists = existingTemplates.some(t => t.id === preferredId);
  if (!exists) return preferredId;
  // 충돌 시 짧은 랜덤 접미사 부여
  return `${preferredId}_${Math.random().toString(36).substring(2, 6)}`;
};

// 비회원 기본 템플릿 2개 생성 (baseSlots=3)
const createAnonymousDefaultTemplates = (deviceId, existing = []) => {
  const baseId = buildDeterministicTemplateId(deviceId || 'unknown');
  const id1 = ensureUniqueTemplateId(existing, `${baseId}_1`);
  const t1 = createBasicLocationTemplate(id1, 3);
  const withFirst = [...existing, t1];
  const id2 = ensureUniqueTemplateId(withFirst, `${baseId}_2`);
  const t2 = createBasicLocationTemplate(id2, 3);
  return [t1, t2];
};

// 영역과 템플릿 사용 상태 동기화
export const reconcileLocationTemplates = createAsyncThunk(
  'auth/reconcileLocationTemplates',
  async (_, { getState }) => {
    const state = getState();
    const templates = (state.auth.userLocationTemplateInstances || []).map(t => ({ ...t, localId: t.localId || t.id }));
    const locations = state.locations.locations || [];
    const linkedTemplateIds = new Set();
    // 영역에 연결된 템플릿 적용
    for (const loc of locations) {
      const templateKey = loc?.templateInstanceLocalId || loc?.templateInstanceId;
      if (templateKey) {
        const tt = templates.find(t => t.id === templateKey || t.localId === templateKey);
        if (tt) {
          tt.used = true;
          tt.usedInLocationId = loc.localId || loc.id;
          linkedTemplateIds.add(tt.id);
        }
      }
    }
    // 사용 안하는 템플릿 정리
    for (const t of templates) {
      if (!linkedTemplateIds.has(t.id)) {
        t.used = false;
        t.usedInLocationId = null;
      }
    }
    await saveUserLocationTemplates(templates);
    return templates;
  }
);

// JWT 토큰 발급 API 호출 (실제 구현 시 서버에서 가져옴)
export const getAnonymousToken = createAsyncThunk(
  'auth/getAnonymousToken',
  async (_, { rejectWithValue }) => {
    try {
      // 저장된 토큰/디바이스ID 우선 로드 (AsyncStorage)
      const storedToken = await loadJwtToken();
      if (storedToken && typeof storedToken === 'string' && storedToken.startsWith('anonymous_')) {
        console.log('AsyncStorage의 기존 익명 토큰 재사용:', storedToken);
        const deviceId = await loadDeviceId();
        return { token: storedToken, deviceId };
      }

      let deviceId = await loadDeviceId();
      if (!deviceId) {
        deviceId = `device_${Math.random().toString(36).substring(2, 15)}`;
        await saveDeviceId(deviceId);
      }
      const token = `anonymous_${deviceId}`;
      console.log('새 익명 토큰 생성:', token);

      // 토큰을 AsyncStorage에 저장
      await saveJwtToken(token);

      return { token, deviceId };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 카카오/일반 로그인 시에도 토큰을 AsyncStorage에 저장
export const kakaoLogin = createAsyncThunk(
  'auth/kakaoLogin',
  async (kakaoToken, { rejectWithValue }) => {
    try {
      const response = {
        token: `kakao_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        user: {
          id: kakaoToken.id || '1',
          username: kakaoToken.profile?.nickname || '카카오 사용자',
          email: kakaoToken.email || 'kakao@example.com',
          profileImage: kakaoToken.profile?.profile_image_url,
        }
      };
      await saveJwtToken(response.token);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = {
        token: `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        user: {
          id: '1',
          username: credentials.username,
          email: credentials.email || 'user@example.com',
        }
      };
      await saveJwtToken(response.token);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 회원가입 API 호출
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      // 실제 구현에서는 서버에 회원가입 요청
      // 여기서는 임시로 성공 응답을 반환
      const response = {
        token: `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        user: {
          id: '1',
          username: userData.username,
          email: userData.email,
        }
      };
      
      // 토큰을 localStorage에 저장
      await saveJwtToken(response.token);
      
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 토큰 검증 API 호출
export const verifyToken = createAsyncThunk(
  'auth/verifyToken',
  async (_, { rejectWithValue, getState }) => {
    try {
      // AsyncStorage에서 토큰 로드
      const token = await loadJwtToken();
      const deviceId = await loadDeviceId();
      
      if (!token) {
        console.log('저장된 토큰이 없습니다.');
        return { token: null, deviceId };
      }
      
      const isAnonymous = token.startsWith('anonymous_');
      
      // 저장된 템플릿 인스턴스 로드
      const savedTemplates = await loadUserLocationTemplates();
      console.log('저장된 템플릿 인스턴스:', savedTemplates);
      
      if (isAnonymous) {
        console.log('익명 토큰 검증 성공:', token);
        
        // 현재 템플릿 인스턴스 상태 확인
        const { userLocationTemplateInstances } = getState().auth;
        
        // 이미 사용된 템플릿이 있는지 확인
        if (userLocationTemplateInstances && userLocationTemplateInstances.length > 0) {
          const usedTemplates = userLocationTemplateInstances.filter(t => t.used);
          console.log('사용 중인 템플릿:', usedTemplates);
          
          if (usedTemplates.length >= 1) {
            // 이미 사용 중인 템플릿이 있으면 새 템플릿을 생성하지 않음
            console.log('비회원 사용자가 이미 템플릿을 사용 중입니다. 추가 템플릿 생성 안함.');
            return {
              token,
              isAnonymous: true,
              templates: savedTemplates || userLocationTemplateInstances,
              deviceId,
            };
          }
        }
        
        return {
          token,
          isAnonymous: true,
          templates: savedTemplates,
          deviceId,
        };
      } else {
        // 회원 토큰인 경우 사용자 정보 포함 (임시)
        console.log('회원 토큰 검증 성공:', token);
        return {
          token,
          isAnonymous: false,
          user: {
            id: '1',
            username: '사용자',
            email: 'user@example.com',
          },
          templates: savedTemplates,
          deviceId,
        };
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 사용자 영역 템플릿 인스턴스 로드
export const loadUserLocationTemplateInstances = createAsyncThunk(
  'auth/loadUserLocationTemplateInstances',
  async (_, { rejectWithValue, getState }) => {
    try {
      const templates = await loadUserLocationTemplates();
      console.log('로드된 사용자 영역 템플릿 인스턴스:', templates);
      
      // 저장된 템플릿이 있으면 그대로 반환
      if (templates && templates.length > 0) {
        console.log('저장된 템플릿 인스턴스를 사용합니다.');
        return templates;
      }
      
      // 저장된 템플릿이 없으면 기본 템플릿 생성(디바이스ID 기반)
      console.log('저장된 템플릿이 없어 기본 템플릿을 생성합니다.');
      let deviceId = await loadDeviceId();
      if (!deviceId) {
        deviceId = `device_${Math.random().toString(36).substring(2, 15)}`;
        await saveDeviceId(deviceId);
      }
      const defaults = createAnonymousDefaultTemplates(deviceId, []);
      await saveUserLocationTemplates(defaults);
      return defaults;
    } catch (error) {
      console.error('사용자 영역 템플릿 인스턴스 로드 오류:', error);
      return rejectWithValue(error.message);
    }
  }
);

// 사용자 제품 슬롯 템플릿 인스턴스 로드
export const loadUserProductSlotTemplateInstances = createAsyncThunk(
  'auth/loadUserProductSlotTemplateInstances',
  async (_, { rejectWithValue }) => {
    try {
      const templates = await loadUserProductSlotTemplates();
      return templates || [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 기본 템플릿 생성 함수
const createBasicLocationTemplate = (idOverride, baseSlotsOverride, extraMeta = {}) => {
  const nowIso = new Date().toISOString();
  const obj = {
    id: idOverride || generateId('locationTemplate'),
    productId: 'basic_location',
    name: '기본 영역',
    description: '기본적인 제품 관리 기능을 제공하는 영역',
    icon: 'cube-outline',
    feature: {
      baseSlots: typeof baseSlotsOverride === 'number' ? baseSlotsOverride : 3
    },
    used: false,
    usedInLocationId: null,
    // SyncMeta 기본값
    localId: undefined, // 아래에서 id로 세팅
    remoteId: undefined,
    syncStatus: 'synced',
    createdAt: nowIso,
    updatedAt: nowIso,
    lastSyncedAt: undefined,
    version: undefined,
    deviceId: null,
    ownerUserId: undefined,
    deletedAt: undefined,
    ...extraMeta,
  };
  obj.localId = obj.id;
  return obj;
};

const initialState = {
  token: null,
  user: null,
  isLoggedIn: false,
  isAnonymous: false, // 비회원 여부
  deviceId: null,
  loading: false,
  error: null,
  subscription: {
    isSubscribed: false,
    plan: null, // 'basic', 'premium', 'pro' 등
    expiresAt: null,
  },
  slots: {
    locationSlots: {
      baseSlots: 3, // 기본 영역 슬롯 수
      additionalSlots: 0, // 추가 구매한 영역 슬롯 수
    },
    productSlots: {
      baseSlots: 3, // 각 영역당 기본 제품 슬롯 수
      additionalSlots: 0, // (deprecated) 템플릿 기반으로 대체 예정
    }
  },
  points: {
    balance: 0, // 현재 보유 G
    totalPurchased: 0, // 총 구매한 G
    totalUsed: 0, // 총 사용한 G
  },
  purchaseHistory: [], // 구매 내역
  pointHistory: [], // G 내역 (충전 및 사용)
  // 사용자가 소유한 영역 템플릿 인스턴스 목록 - 비회원은 기본 템플릿 1개 제공
  userLocationTemplateInstances: [createBasicLocationTemplate(undefined, 3)],
  // 사용자가 소유한 제품 슬롯 템플릿 인스턴스 목록 (각 인스턴스는 제품 1개를 추가 허용)
  userProductSlotTemplateInstances: []
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 로그인 성공
    loginSuccess: (state, action) => {
      state.isLoggedIn = true;
      state.isAnonymous = false;
      state.user = action.payload;
      state.error = null;
    },
    // 포인트 충전
    addPoints: (state, action) => {
      const amount = action.payload.amount;
      state.points.balance += amount;
      state.points.totalPurchased += amount;
      
      // 포인트 내역에 추가
      state.pointHistory.push({
        id: `point_add_${Date.now()}`,
        type: 'add',
        amount: amount,
        date: new Date().toISOString(),
        description: action.payload.description || 'G 충전',
        paymentMethod: action.payload.paymentMethod || '신용카드',
      });
    },

    // 포인트 사용
    usePoints: (state, action) => {
      const amount = action.payload.amount;
      if (state.points.balance >= amount) {
        state.points.balance -= amount;
        state.points.totalUsed += amount;
        
        // 포인트 내역에 추가
        state.pointHistory.push({
          id: `point_use_${Date.now()}`,
          type: 'use',
          amount: amount,
          date: new Date().toISOString(),
          description: action.payload.description || 'G 사용',
          itemId: action.payload.itemId,
          itemType: action.payload.itemType,
        });
        
        // 슬롯 별도 스토리지는 사용하지 않음 (템플릿 기반으로 전환)
      }
      // 반환값 제거 - Immer 오류 해결
    },

    // 구독 정보 업데이트
    updateSubscription: (state, action) => {
      state.subscription = { ...state.subscription, ...action.payload };
      
      // 슬롯 별도 스토리지는 사용하지 않음 (템플릿 기반으로 전환)
    },

    // 슬롯 정보 업데이트
    updateSlots: (state, action) => {
      // 기존 슬롯 정보를 깊은 복사로 업데이트
      if (action.payload.locationSlots) {
        state.slots.locationSlots = {
          ...state.slots.locationSlots,
          ...action.payload.locationSlots
        };
      }
      
      if (action.payload.productSlots) {
        state.slots.productSlots = {
          ...state.slots.productSlots,
          ...action.payload.productSlots
        };
      }
      
      // 슬롯 별도 스토리지는 사용하지 않음 (템플릿 기반으로 전환)
    },

    // 구매 내역 추가
    addPurchase: (state, action) => {
      state.purchaseHistory.push({
        ...action.payload,
        purchaseDate: new Date().toISOString(),
      });
    },

    // 로그아웃 시 구독 및 슬롯 정보도 초기화
    logout: (state, action) => {
      state.isLoggedIn = false;
      state.isAnonymous = false;
      state.user = null;
      state.token = null;
      state.deviceId = state.deviceId || null;
      state.subscription = initialState.subscription;
      state.slots = initialState.slots;
      state.points = initialState.points;
      state.purchaseHistory = [];
      state.pointHistory = [];
      // 템플릿 인스턴스를 비회원 상태로 초기화
      console.log('로그아웃: 템플릿 인스턴스 초기화');
      const defaults = createAnonymousDefaultTemplates(state.deviceId || 'unknown', []);
      state.userLocationTemplateInstances = defaults;
      console.log('로그아웃 후 템플릿 인스턴스:', defaults);
      
      // AsyncStorage에 저장
      saveUserLocationTemplates(defaults)
        .then(() => console.log('로그아웃 후 템플릿 인스턴스 저장 성공'))
        .catch(err => console.error('로그아웃 후 템플릿 인스턴스 저장 실패:', err));

      // 사용자 제품 슬롯 템플릿 완전 초기화 (연결/등록 정보 포함 전부 제거)
      state.userProductSlotTemplateInstances = [];
      saveUserProductSlotTemplates([])
        .then(() => console.log('로그아웃: 제품 슬롯 템플릿 초기화 저장 성공'))
        .catch(err => console.error('로그아웃: 제품 슬롯 템플릿 초기화 저장 실패:', err));

      // 위치/제품/소진 제품 로컬 데이터 초기화 (비회원 전환 시 사용자 데이터 제거)
      try {
        saveLocations([]);
        saveProducts([]);
        saveConsumedProducts([]);
        console.log('로그아웃: 로컬 위치/제품/소진제품 데이터 초기화 완료');
      } catch (e) {
        console.error('로그아웃: 로컬 데이터 초기화 실패:', e);
      }
      
      // AsyncStorage에서 토큰 제거
      // (웹 폴리필에서는 localStorage도 함께 제거될 수 있음)
      try { removeJwtToken(); } catch (e) {}
      
      // 주: 동기 리듀서에서는 다른 슬라이스 액션을 직접 디스패치할 수 없음
      // 실제 화면에서 logout 디스패치 후 locations 초기화를 위해 컴포넌트에서 resetLocationsState를 함께 디스패치하거나,
      // 여기에 extra thunk를 도입하는 방식을 고려 가능.
    },
    // 사용자 정보 업데이트
    updateUserInfo: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    // 로딩 상태 설정
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    // 에러 상태 설정
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    
    // 템플릿 인스턴스를 사용됨으로 표시
    markTemplateInstanceAsUsed: (state, action) => {
      const { templateId, locationId } = action.payload;
      console.log('템플릿 인스턴스 사용 표시:', { templateId, locationId });
      const templateInstance = state.userLocationTemplateInstances.find(t => t.id === templateId);
      if (templateInstance) {
        console.log('템플릿 인스턴스 찾음:', templateInstance);
        templateInstance.used = true;
        templateInstance.usedInLocationId = locationId;
        
        // AsyncStorage에 저장
        const plainTemplates = JSON.parse(JSON.stringify(state.userLocationTemplateInstances));
        saveUserLocationTemplates(plainTemplates)
          .then(() => console.log('템플릿 인스턴스 사용 표시 저장 성공'))
          .catch(err => console.error('템플릿 인스턴스 사용 표시 저장 실패:', err));
      } else {
        console.log('템플릿 인스턴스를 찾을 수 없음:', templateId);
      }
    },
    
    // 템플릿 인스턴스를 다시 사용 가능하게 설정
    releaseTemplateInstance: (state, action) => {
      const locationId = action.payload;
      console.log('템플릿 인스턴스 해제:', { locationId });
      const templateInstance = state.userLocationTemplateInstances.find(
        t => t.usedInLocationId === locationId
      );
      if (templateInstance) {
        console.log('해제할 템플릿 인스턴스 찾음:', templateInstance);
        templateInstance.used = false;
        templateInstance.usedInLocationId = null;
        
        // AsyncStorage에 저장
        const plainTemplates = JSON.parse(JSON.stringify(state.userLocationTemplateInstances));
        saveUserLocationTemplates(plainTemplates)
          .then(() => console.log('템플릿 인스턴스 해제 저장 성공'))
          .catch(err => console.error('템플릿 인스턴스 해제 저장 실패:', err));
      } else {
        console.log('해제할 템플릿 인스턴스를 찾을 수 없음:', locationId);
      }
    },
    
    // 새로운 템플릿 인스턴스 추가
    addTemplateInstance: (state, action) => {
      console.log('새 템플릿 인스턴스 추가:', action.payload);
      const newTemplate = {
        ...action.payload,
        id: generateId('locationTemplate')
      };
      console.log('생성된 템플릿 인스턴스:', newTemplate);
      state.userLocationTemplateInstances.push(newTemplate);
      
      // AsyncStorage에 저장
      const plainTemplates = JSON.parse(JSON.stringify(state.userLocationTemplateInstances));
      saveUserLocationTemplates(plainTemplates)
        .then(() => console.log('템플릿 인스턴스 추가 저장 성공'))
        .catch(err => console.error('템플릿 인스턴스 추가 저장 실패:', err));
    },
    
    // 기본 템플릿 인스턴스 추가 (비회원용)
    addBasicTemplateInstance: (state) => {
      console.log('기본 템플릿 인스턴스 추가');
      const newTemplate = createBasicLocationTemplate();
      console.log('생성된 기본 템플릿 인스턴스:', newTemplate);
      state.userLocationTemplateInstances.push(newTemplate);
      
      // AsyncStorage에 저장
      const plainTemplates = JSON.parse(JSON.stringify(state.userLocationTemplateInstances));
            saveUserLocationTemplates(plainTemplates)
         .then(() => console.log('기본 템플릿 인스턴스 추가 저장 성공'))
         .catch(err => console.error('기본 템플릿 인스턴스 추가 저장 실패:', err));
     },
    // 구독 플랜 적용: 새로운 스키마(locationTemplate/productTemplate)와 구 스키마(locationSlots/productSlotsPerLocation) 모두 지원
    applySubscriptionToTemplates: (state, action) => {
      const payload = action.payload || {};
      const planId = payload.planId || state.subscription?.plan || null;
      const fallbackExpiresAt = payload.expiresAt || state.subscription?.expiresAt || null;

      // 1) 신 스키마 처리: locationTemplate[], productTemplate[]
      const hasNewSchema = Array.isArray(payload.locationTemplate) || Array.isArray(payload.productTemplate);
      if (hasNewSchema) {
        const nowMs = Date.now();
        let mutatedLocTemplates = false;

        if (Array.isArray(payload.locationTemplate)) {
          for (const lt of payload.locationTemplate) {
            const baseSlots = (lt && typeof lt.feature?.baseSlots === 'number') ? lt.feature.baseSlots : 3;
            const newTemplate = createBasicLocationTemplate(undefined, baseSlots);
            if (lt && lt.locationTemplateName) newTemplate.name = lt.locationTemplateName;
            if (lt && lt.locationTemplateId) newTemplate.productId = lt.locationTemplateId;
            newTemplate.origin = 'subscription';
            newTemplate.subscriptionPlanId = planId;
            // 유효성 정책 적용: 구독 연동(기본) 또는 fixed
            if (lt && lt.feature && lt.feature.validWhile) {
              newTemplate.feature = { ...newTemplate.feature, validWhile: lt.feature.validWhile };
            } else if (lt && lt.feature && lt.feature.expiresAt != null) {
              newTemplate.feature = { ...newTemplate.feature, expiresAt: lt.feature.expiresAt, validWhile: { type: 'fixed' } };
            } else {
              newTemplate.feature = { ...newTemplate.feature, validWhile: { type: 'subscriptionActive', plans: planId ? [planId] : [], mode: 'any' } };
            }
            state.userLocationTemplateInstances.push(newTemplate);
            mutatedLocTemplates = true;
          }
        }

        if (mutatedLocTemplates) {
          const plainTemplates = JSON.parse(JSON.stringify(state.userLocationTemplateInstances));
          saveUserLocationTemplates(plainTemplates)
            .then(() => console.log('구독 적용(신 스키마): 영역 템플릿 추가 저장 성공'))
            .catch(err => console.error('구독 적용(신 스키마): 영역 템플릿 추가 저장 실패:', err));
        }

        if (Array.isArray(payload.productTemplate)) {
          for (const _pt of payload.productTemplate) {
            state.userProductSlotTemplateInstances.push({
              id: generateId('productSlotTemplate'),
              name: '제품 슬롯',
              description: '제품 1개 추가 등록 가능',
              used: false,
              usedByProductId: null,
              assignedLocationId: null,
            });
          }
          const plain = JSON.parse(JSON.stringify(state.userProductSlotTemplateInstances));
          saveUserProductSlotTemplates(plain)
            .then(() => console.log('구독 적용(신 스키마): 제품 슬롯 템플릿 추가 저장 성공'))
            .catch(err => console.error('구독 적용(신 스키마): 제품 슬롯 템플릿 추가 저장 실패:', err));
        }
        return;
      }

      // 2) 구 스키마 처리: locationSlots, productSlotsPerLocation
      const { locationSlots, productSlotsPerLocation } = payload;
      if (!locationSlots || !productSlotsPerLocation) return;
      for (let i = 0; i < locationSlots; i++) {
        const newTemplate = createBasicLocationTemplate(undefined, productSlotsPerLocation);
        newTemplate.origin = 'subscription';
        newTemplate.subscriptionPlanId = planId;
        // 레거시: 구 스키마는 구독 연동 정책으로 처리
        newTemplate.feature = {
          ...newTemplate.feature,
          validWhile: { type: 'subscriptionActive', plans: planId ? [planId] : [], mode: 'any' }
        };
        state.userLocationTemplateInstances.push(newTemplate);
      }
      const plainTemplates = JSON.parse(JSON.stringify(state.userLocationTemplateInstances));
      saveUserLocationTemplates(plainTemplates)
        .then(() => console.log('구독 적용(구 스키마): 템플릿 추가 저장 성공'))
        .catch(err => console.error('구독 적용(구 스키마): 템플릿 추가 저장 실패:', err));
    },
    // 제품 슬롯 템플릿 인스턴스 추가 (1개)
    addProductSlotTemplateInstance: (state, action) => {
      const newTemplate = {
        id: generateId('productSlotTemplate'),
        name: '제품 슬롯',
        description: '제품 1개 추가 등록 가능',
        used: false,
        usedByProductId: null,
        assignedLocationId: null,
      };
      state.userProductSlotTemplateInstances.push(newTemplate);
      const plain = JSON.parse(JSON.stringify(state.userProductSlotTemplateInstances));
      saveUserProductSlotTemplates(plain).catch(err => console.error('제품 슬롯 템플릿 저장 실패:', err));
    },
    // 제품 슬롯 템플릿 인스턴스 여러개 추가
    addProductSlotTemplateInstances: (state, action) => {
      const count = action.payload?.count || 1;
      for (let i = 0; i < count; i++) {
        state.userProductSlotTemplateInstances.push({
          id: generateId('productSlotTemplate'),
          name: '제품 슬롯',
          description: '제품 1개 추가 등록 가능',
          used: false,
          usedByProductId: null,
          assignedLocationId: null,
        });
      }
      const plain = JSON.parse(JSON.stringify(state.userProductSlotTemplateInstances));
      saveUserProductSlotTemplates(plain).catch(err => console.error('제품 슬롯 템플릿 저장 실패:', err));
    },
    // 제품 슬롯 템플릿을 특정 영역에 등록(할당)
    assignProductSlotTemplatesToLocation: (state, action) => {
      const { locationId, count } = action.payload;
      if (!locationId || !count) return;
      let remaining = count;
      for (const t of state.userProductSlotTemplateInstances) {
        if (remaining <= 0) break;
        if (!t.used && !t.assignedLocationId) {
          t.assignedLocationId = locationId;
          remaining -= 1;
        }
      }
      const plain = JSON.parse(JSON.stringify(state.userProductSlotTemplateInstances));
      saveUserProductSlotTemplates(plain).catch(err => console.error('제품 슬롯 템플릿 할당 저장 실패:', err));
    },
    // 특정 영역에서 제품 슬롯 템플릿 등록 해제 (count개)
    unassignProductSlotTemplatesFromLocation: (state, action) => {
      const { locationId, count } = action.payload;
      if (!locationId || !count) return;
      let remaining = count;
      for (const t of state.userProductSlotTemplateInstances) {
        if (remaining <= 0) break;
        if (!t.used && t.assignedLocationId === locationId) {
          t.assignedLocationId = null;
          remaining -= 1;
        }
      }
      const plain = JSON.parse(JSON.stringify(state.userProductSlotTemplateInstances));
      saveUserProductSlotTemplates(plain).catch(err => console.error('제품 슬롯 템플릿 해제 저장 실패:', err));
    },
    // 제품 슬롯 템플릿 사용 표시
    markProductSlotTemplateAsUsed: (state, action) => {
      const { templateId, productId } = action.payload;
      const t = state.userProductSlotTemplateInstances.find(x => x.id === templateId);
      if (t && !t.used) {
        t.used = true;
        t.usedByProductId = productId;
        const plain = JSON.parse(JSON.stringify(state.userProductSlotTemplateInstances));
        saveUserProductSlotTemplates(plain).catch(err => console.error('제품 슬롯 템플릿 사용 저장 실패:', err));
      }
    },
    // 제품 슬롯 템플릿 해제 (제품 삭제 등)
    releaseProductSlotTemplateByProduct: (state, action) => {
      const productId = action.payload;
      const t = state.userProductSlotTemplateInstances.find(x => x.usedByProductId === productId);
      if (t) {
        t.used = false;
        t.usedByProductId = null;
        const plain = JSON.parse(JSON.stringify(state.userProductSlotTemplateInstances));
        saveUserProductSlotTemplates(plain).catch(err => console.error('제품 슬롯 템플릿 해제 저장 실패:', err));
      }
    },
    // 특정 템플릿을 특정 영역에 등록
    assignProductSlotTemplateToLocation: (state, action) => {
      const { templateId, locationId } = action.payload;
      const t = state.userProductSlotTemplateInstances.find(x => x.id === templateId);
      if (t && !t.used) {
        t.assignedLocationId = locationId;
        const plain = JSON.parse(JSON.stringify(state.userProductSlotTemplateInstances));
        saveUserProductSlotTemplates(plain).catch(err => console.error('제품 슬롯 템플릿 단건 할당 저장 실패:', err));
      }
    },
    // 특정 템플릿 등록 해제
    unassignProductSlotTemplate: (state, action) => {
      const { templateId } = action.payload;
      const t = state.userProductSlotTemplateInstances.find(x => x.id === templateId);
      if (t && !t.used) {
        t.assignedLocationId = null;
        const plain = JSON.parse(JSON.stringify(state.userProductSlotTemplateInstances));
        saveUserProductSlotTemplates(plain).catch(err => console.error('제품 슬롯 템플릿 단건 해제 저장 실패:', err));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // 익명 토큰 발급 처리
      .addCase(getAnonymousToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAnonymousToken.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.isAnonymous = true;
        state.deviceId = action.payload.deviceId || state.deviceId;
        state.error = null;
        
        // 이미 사용 중인 템플릿이 있는지 확인
        const usedTemplates = state.userLocationTemplateInstances.filter(t => t.used);
        
        if (usedTemplates.length > 0) {
          // 이미 사용 중인 템플릿이 있으면 템플릿 상태 유지
          console.log('익명 토큰 발급: 이미 사용 중인 템플릿이 있습니다. 템플릿 상태 유지:', state.userLocationTemplateInstances);
        } else {
          // 비회원은 기본 템플릿 2개 제공 (각 3 슬롯, 디바이스ID 기반 결정적 ID)
          console.log('익명 토큰 발급: 템플릿 인스턴스 초기화');
          const defaults = createAnonymousDefaultTemplates(action.payload.deviceId || state.deviceId || 'unknown', state.userLocationTemplateInstances);
          state.userLocationTemplateInstances = defaults;
          console.log('익명 토큰 발급 후 템플릿 인스턴스:', defaults);
          
          // AsyncStorage에 저장
          saveUserLocationTemplates(defaults)
            .then(() => console.log('익명 토큰 발급 후 템플릿 인스턴스 저장 성공'))
            .catch(err => console.error('익명 토큰 발급 후 템플릿 인스턴스 저장 실패:', err));
        }
      })
      .addCase(getAnonymousToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // 카카오 로그인 처리
      .addCase(kakaoLogin.pending, (state) => {
        state.loading = true;
      })
      .addCase(kakaoLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.isLoggedIn = true;
        state.isAnonymous = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
        
        // 회원은 기본 템플릿 3개 제공
        console.log('카카오 로그인 성공: 템플릿 인스턴스 초기화');
        const templates = [
          createBasicLocationTemplate(undefined, 5),
          createBasicLocationTemplate(undefined, 5),
          createBasicLocationTemplate(undefined, 5)
        ];
        state.userLocationTemplateInstances = templates;
        console.log('카카오 로그인 후 템플릿 인스턴스:', templates);
        
        // AsyncStorage에 저장
        saveUserLocationTemplates(templates)
          .then(() => console.log('카카오 로그인 후 템플릿 인스턴스 저장 성공'))
          .catch(err => console.error('카카오 로그인 후 템플릿 인스턴스 저장 실패:', err));
      })
      .addCase(kakaoLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // 로그인 처리
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isLoggedIn = true;
        state.isAnonymous = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
        
        // 회원은 기본 템플릿 3개 제공
        console.log('일반 로그인 성공: 템플릿 인스턴스 초기화');
        const templates = [
          createBasicLocationTemplate(undefined, 5),
          createBasicLocationTemplate(undefined, 5),
          createBasicLocationTemplate(undefined, 5)
        ];
        state.userLocationTemplateInstances = templates;
        console.log('일반 로그인 후 템플릿 인스턴스:', templates);
        
        // AsyncStorage에 저장
        saveUserLocationTemplates(templates)
          .then(() => console.log('일반 로그인 후 템플릿 인스턴스 저장 성공'))
          .catch(err => console.error('일반 로그인 후 템플릿 인스턴스 저장 실패:', err));
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // 회원가입 처리
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isLoggedIn = true;
        state.isAnonymous = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
        
        // 회원은 기본 템플릿 3개 제공
        console.log('회원가입 성공: 템플릿 인스턴스 초기화');
        const templates = [
          createBasicLocationTemplate(undefined, 5),
          createBasicLocationTemplate(undefined, 5),
          createBasicLocationTemplate(undefined, 5)
        ];
        state.userLocationTemplateInstances = templates;
        console.log('회원가입 후 템플릿 인스턴스:', templates);
        
        // AsyncStorage에 저장
        saveUserLocationTemplates(templates)
          .then(() => console.log('회원가입 후 템플릿 인스턴스 저장 성공'))
          .catch(err => console.error('회원가입 후 템플릿 인스턴스 저장 실패:', err));
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // 토큰 검증 처리
      .addCase(verifyToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.loading = false;
        
        if (!action.payload || !action.payload.token) {
          // 토큰이 없는 경우 초기 상태로 설정
          state.token = null;
          state.user = null;
          state.isLoggedIn = false;
          state.isAnonymous = false;
          state.error = null;
          // 기본 템플릿 1개 제공
          console.log('토큰 없음: 기본 템플릿 1개 제공');
          const defaults = createAnonymousDefaultTemplates(action.payload?.deviceId || state.deviceId || 'unknown', state.userLocationTemplateInstances);
          state.userLocationTemplateInstances = defaults;
          console.log('토큰 없음 후 템플릿 인스턴스:', defaults);
          
          // AsyncStorage에 저장
          saveUserLocationTemplates(defaults)
            .then(() => console.log('토큰 없음 후 템플릿 인스턴스 저장 성공'))
            .catch(err => console.error('토큰 없음 후 템플릿 인스턴스 저장 실패:', err));
          return;
        }
        
        // 공통 플래그/토큰 복원
        state.token = action.payload.token;
        state.isAnonymous = action.payload.isAnonymous;
        state.deviceId = action.payload.deviceId || state.deviceId;
        
        // 로그인 사용자라면 로그인 상태/사용자 정보 복원 (템플릿 존재 여부와 무관하게 선행)
        if (!action.payload.isAnonymous) {
          state.isLoggedIn = true;
          if (action.payload.user) {
            state.user = action.payload.user;
          }
        } else {
          state.isLoggedIn = false;
          state.user = null;
        }
        
        // 템플릿 복원 우선
        if (action.payload.templates) {
          console.log('저장된 템플릿 인스턴스 사용:', action.payload.templates);
          state.userLocationTemplateInstances = action.payload.templates;
        } else if (!action.payload.isAnonymous) {
          // 로그인 사용자이며 저장된 템플릿이 없을 때 기본 3개 제공
          console.log('토큰 검증 (로그인 사용자): 템플릿 인스턴스 초기화');
          const templates = [
            createBasicLocationTemplate(undefined, 5),
            createBasicLocationTemplate(undefined, 5),
            createBasicLocationTemplate(undefined, 5)
          ];
          state.userLocationTemplateInstances = templates;
          console.log('토큰 검증 후 템플릿 인스턴스 (로그인):', templates);
          
          // AsyncStorage에 저장
          saveUserLocationTemplates(templates)
            .then(() => console.log('토큰 검증 후 템플릿 인스턴스 (로그인) 저장 성공'))
            .catch(err => console.error('토큰 검증 후 템플릿 인스턴스 (로그인) 저장 실패:', err));
        } else {
          // 익명 사용자 처리
          console.log('토큰 검증 (익명 사용자): 템플릿 인스턴스 확인');
          const usedTemplates = state.userLocationTemplateInstances.filter(t => t.used);
          if (usedTemplates.length > 0) {
            console.log('익명 사용자가 이미 템플릿을 사용 중입니다. 템플릿 상태 유지:', state.userLocationTemplateInstances);
          } else if (!action.payload.templates) {
            const defaults = createAnonymousDefaultTemplates(action.payload.deviceId || state.deviceId || 'unknown', state.userLocationTemplateInstances);
            state.userLocationTemplateInstances = defaults;
            console.log('토큰 검증 후 템플릿 인스턴스 (익명):', defaults);
            saveUserLocationTemplates(defaults)
              .then(() => console.log('토큰 검증 후 템플릿 인스턴스 (익명) 저장 성공'))
              .catch(err => console.error('토큰 검증 후 템플릿 인스턴스 (익명) 저장 실패:', err));
          }
        }
        
        state.error = null;
      })
      .addCase(verifyToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // 사용자 영역 템플릿 인스턴스 로드 처리
      .addCase(loadUserLocationTemplateInstances.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUserLocationTemplateInstances.fulfilled, (state, action) => {
        state.loading = false;
        state.userLocationTemplateInstances = action.payload;
        console.log('사용자 영역 템플릿 인스턴스 로드 완료:', action.payload);
      })
      .addCase(loadUserLocationTemplateInstances.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('사용자 영역 템플릿 인스턴스 로드 실패:', action.payload);
      })

      // 사용자 제품 슬롯 템플릿 인스턴스 로드 처리
      .addCase(loadUserProductSlotTemplateInstances.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUserProductSlotTemplateInstances.fulfilled, (state, action) => {
        state.loading = false;
        state.userProductSlotTemplateInstances = action.payload || [];
      })
      .addCase(loadUserProductSlotTemplateInstances.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(reconcileLocationTemplates.pending, (state) => {
        state.loading = true;
      })
      .addCase(reconcileLocationTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.userLocationTemplateInstances = action.payload;
      })
      .addCase(reconcileLocationTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { 
  loginSuccess, 
  logout, 
  updateUserInfo,
  setLoading,
  setError,
  clearError,
  updateSubscription,
  updateSlots,
  addPurchase,
  addPoints,
  usePoints,
  markTemplateInstanceAsUsed,
  releaseTemplateInstance,
  addTemplateInstance,
  addBasicTemplateInstance,
  addProductSlotTemplateInstance,
  addProductSlotTemplateInstances,
  assignProductSlotTemplatesToLocation,
  unassignProductSlotTemplatesFromLocation,
  markProductSlotTemplateAsUsed,
  releaseProductSlotTemplateByProduct,
  assignProductSlotTemplateToLocation,
  unassignProductSlotTemplate,
  applySubscriptionToTemplates,
} = authSlice.actions;

export default authSlice.reducer; 