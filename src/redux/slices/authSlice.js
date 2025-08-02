import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { saveUserSlots, loadUserSlots, saveUserLocationTemplates, loadUserLocationTemplates } from '../../utils/storageUtils';
import { generateId } from '../../utils/idUtils';

// JWT 토큰 발급 API 호출 (실제 구현 시 서버에서 가져옴)
export const getAnonymousToken = createAsyncThunk(
  'auth/getAnonymousToken',
  async (_, { rejectWithValue }) => {
    try {
      // 저장된 익명 토큰이 있는지 확인
      const existingToken = localStorage.getItem('jwt_token');
      
      if (existingToken && existingToken.startsWith('anonymous_')) {
        console.log('기존 익명 토큰 재사용:', existingToken);
        return { token: existingToken };
      }
      
      // 실제 구현에서는 서버에 요청하여 익명 사용자용 JWT 토큰을 받아옴
      // 여기서는 임시로 생성된 토큰을 반환
      const deviceId = localStorage.getItem('device_id') || `device_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('device_id', deviceId);
      
      const token = `anonymous_${deviceId}`;
      console.log('새 익명 토큰 생성:', token);
      
      // 토큰을 localStorage에 저장
      localStorage.setItem('jwt_token', token);
      
      return { token };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 카카오 로그인 API 호출
export const kakaoLogin = createAsyncThunk(
  'auth/kakaoLogin',
  async (kakaoToken, { rejectWithValue }) => {
    try {
      // 실제 구현에서는 서버에 카카오 토큰을 전송하여 JWT 토큰을 받아옴
      // 여기서는 임시로 성공 응답을 반환
      const response = {
        token: `kakao_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        user: {
          id: kakaoToken.id || '1',
          username: kakaoToken.profile?.nickname || '카카오 사용자',
          email: kakaoToken.email || 'kakao@example.com',
          profileImage: kakaoToken.profile?.profile_image_url,
        }
      };
      
      // 토큰을 localStorage에 저장
      localStorage.setItem('jwt_token', response.token);
      
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 로그인 API 호출
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      // 실제 구현에서는 서버에 로그인 요청
      // 여기서는 임시로 성공 응답을 반환
      const response = {
        token: `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        user: {
          id: '1',
          username: credentials.username,
          email: credentials.email || 'user@example.com',
        }
      };
      
      // 토큰을 localStorage에 저장
      localStorage.setItem('jwt_token', response.token);
      
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
      localStorage.setItem('jwt_token', response.token);
      
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
      // 로컬 스토리지에서 토큰 가져오기
      const token = localStorage.getItem('jwt_token');
      
      // 토큰이 없으면 null 반환
      if (!token) {
        console.log('저장된 토큰이 없습니다.');
        return null;
      }
      
      // 토큰이 'anonymous'로 시작하면 익명 토큰으로 처리
      const isAnonymous = token.startsWith('anonymous_');
      
      // 저장된 템플릿 인스턴스 로드
      const savedTemplates = await loadUserLocationTemplates();
      console.log('저장된 템플릿 인스턴스:', savedTemplates);
      
      // 실제 구현에서는 서버에 토큰 검증 요청
      // 여기서는 임시로 토큰 형식에 따라 응답 생성
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
              templates: savedTemplates || userLocationTemplateInstances
            };
          }
        }
        
        return {
          token,
          isAnonymous: true,
          templates: savedTemplates
        };
      } else {
        // 회원 토큰인 경우 사용자 정보 포함
        console.log('회원 토큰 검증 성공:', token);
        return {
          token,
          isAnonymous: false,
          user: {
            id: '1',
            username: '사용자',
            email: 'user@example.com',
          },
          templates: savedTemplates
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
      
      // 저장된 템플릿이 없으면 기본 템플릿 생성
      console.log('저장된 템플릿이 없어 기본 템플릿을 생성합니다.');
      const defaultTemplate = createBasicLocationTemplate();
      await saveUserLocationTemplates([defaultTemplate]);
      return [defaultTemplate];
    } catch (error) {
      console.error('사용자 영역 템플릿 인스턴스 로드 오류:', error);
      return rejectWithValue(error.message);
    }
  }
);

// 기본 템플릿 생성 함수
const createBasicLocationTemplate = () => ({
  id: generateId('locationTemplate'),
  productId: 'basic_location',
  name: '기본 영역',
  description: '기본적인 제품 관리 기능을 제공하는 영역',
  icon: 'cube-outline',
  feature: {
    baseSlots: 5
  },
  used: false,
  usedInLocationId: null
});

const initialState = {
  token: null,
  user: null,
  isLoggedIn: false,
  isAnonymous: false, // 비회원 여부
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
      additionalSlots: 0, // 추가 구매한 제품 슬롯 수
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
  userLocationTemplateInstances: [createBasicLocationTemplate()]
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
        
        // 로컬 스토리지에 슬롯 정보 저장
        try {
          saveUserSlots(state.slots);
        } catch (error) {
          console.error('슬롯 정보 저장 중 오류:', error);
        }
      }
      // 반환값 제거 - Immer 오류 해결
    },

    // 구독 정보 업데이트
    updateSubscription: (state, action) => {
      state.subscription = { ...state.subscription, ...action.payload };
      
      // 로컬 스토리지에 슬롯 정보 저장
      try {
        saveUserSlots(state.slots);
      } catch (error) {
        console.error('슬롯 정보 저장 중 오류:', error);
      }
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
      
      // 로컬 스토리지에 슬롯 정보 저장
      try {
        saveUserSlots(state.slots);
      } catch (error) {
        console.error('슬롯 정보 저장 중 오류:', error);
      }
    },

    // 구매 내역 추가
    addPurchase: (state, action) => {
      state.purchaseHistory.push({
        ...action.payload,
        purchaseDate: new Date().toISOString(),
      });
    },

    // 로그아웃 시 구독 및 슬롯 정보도 초기화
    logout: (state) => {
      state.isLoggedIn = false;
      state.isAnonymous = false;
      state.user = null;
      state.token = null;
      state.subscription = initialState.subscription;
      state.slots = initialState.slots;
      state.points = initialState.points;
      state.purchaseHistory = [];
      state.pointHistory = [];
      // 템플릿 인스턴스를 비회원 상태로 초기화 (1개만 제공)
      console.log('로그아웃: 템플릿 인스턴스 초기화');
      const template = createBasicLocationTemplate();
      state.userLocationTemplateInstances = [template];
      console.log('로그아웃 후 템플릿 인스턴스:', [template]);
      
      // AsyncStorage에 저장
      saveUserLocationTemplates([template])
        .then(() => console.log('로그아웃 후 템플릿 인스턴스 저장 성공'))
        .catch(err => console.error('로그아웃 후 템플릿 인스턴스 저장 실패:', err));
      
      // localStorage에서 토큰 제거
      localStorage.removeItem('jwt_token');
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
        saveUserLocationTemplates(state.userLocationTemplateInstances)
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
        saveUserLocationTemplates(state.userLocationTemplateInstances)
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
      saveUserLocationTemplates(state.userLocationTemplateInstances)
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
      saveUserLocationTemplates(state.userLocationTemplateInstances)
        .then(() => console.log('기본 템플릿 인스턴스 추가 저장 성공'))
        .catch(err => console.error('기본 템플릿 인스턴스 추가 저장 실패:', err));
      
      return newTemplate;
    }
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
        state.error = null;
        
        // 이미 사용 중인 템플릿이 있는지 확인
        const usedTemplates = state.userLocationTemplateInstances.filter(t => t.used);
        
        if (usedTemplates.length > 0) {
          // 이미 사용 중인 템플릿이 있으면 템플릿 상태 유지
          console.log('익명 토큰 발급: 이미 사용 중인 템플릿이 있습니다. 템플릿 상태 유지:', state.userLocationTemplateInstances);
        } else {
          // 비회원은 기본 템플릿 1개만 제공
          console.log('익명 토큰 발급: 템플릿 인스턴스 초기화');
          const template = createBasicLocationTemplate();
          state.userLocationTemplateInstances = [template];
          console.log('익명 토큰 발급 후 템플릿 인스턴스:', [template]);
          
          // AsyncStorage에 저장
          saveUserLocationTemplates([template])
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
          createBasicLocationTemplate(),
          createBasicLocationTemplate(),
          createBasicLocationTemplate()
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
          createBasicLocationTemplate(),
          createBasicLocationTemplate(),
          createBasicLocationTemplate()
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
          createBasicLocationTemplate(),
          createBasicLocationTemplate(),
          createBasicLocationTemplate()
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
        
        if (!action.payload) {
          // 토큰이 없는 경우 초기 상태로 설정
          state.token = null;
          state.user = null;
          state.isLoggedIn = false;
          state.isAnonymous = false;
          state.error = null;
          // 기본 템플릿 1개 제공
          console.log('토큰 없음: 기본 템플릿 1개 제공');
          const template = createBasicLocationTemplate();
          state.userLocationTemplateInstances = [template];
          console.log('토큰 없음 후 템플릿 인스턴스:', [template]);
          
          // AsyncStorage에 저장
          saveUserLocationTemplates([template])
            .then(() => console.log('토큰 없음 후 템플릿 인스턴스 저장 성공'))
            .catch(err => console.error('토큰 없음 후 템플릿 인스턴스 저장 실패:', err));
          return;
        }
        
        state.token = action.payload.token;
        state.isAnonymous = action.payload.isAnonymous;
        
        // 저장된 템플릿 인스턴스가 있으면 사용
        if (action.payload.templates) {
          console.log('저장된 템플릿 인스턴스 사용:', action.payload.templates);
          state.userLocationTemplateInstances = action.payload.templates;
          return;
        }
        
        if (!action.payload.isAnonymous) {
          state.isLoggedIn = true;
          state.user = action.payload.user;
          // 로그인 사용자는 기본 템플릿 3개 제공
          console.log('토큰 검증 (로그인 사용자): 템플릿 인스턴스 초기화');
          const templates = [
            createBasicLocationTemplate(),
            createBasicLocationTemplate(),
            createBasicLocationTemplate()
          ];
          state.userLocationTemplateInstances = templates;
          console.log('토큰 검증 후 템플릿 인스턴스 (로그인):', templates);
          
          // AsyncStorage에 저장
          saveUserLocationTemplates(templates)
            .then(() => console.log('토큰 검증 후 템플릿 인스턴스 (로그인) 저장 성공'))
            .catch(err => console.error('토큰 검증 후 템플릿 인스턴스 (로그인) 저장 실패:', err));
        } else {
          // 익명 사용자는 기본 템플릿 1개 제공
          console.log('토큰 검증 (익명 사용자): 템플릿 인스턴스 확인');
          
          // 이미 사용 중인 템플릿이 있는지 확인
          const usedTemplates = state.userLocationTemplateInstances.filter(t => t.used);
          
          if (usedTemplates.length > 0) {
            // 이미 사용 중인 템플릿이 있으면 템플릿 상태 유지
            console.log('익명 사용자가 이미 템플릿을 사용 중입니다. 템플릿 상태 유지:', state.userLocationTemplateInstances);
          } else {
            // 사용 중인 템플릿이 없으면 기본 템플릿 1개 제공
            const template = createBasicLocationTemplate();
            state.userLocationTemplateInstances = [template];
            console.log('토큰 검증 후 템플릿 인스턴스 (익명):', [template]);
            
            // AsyncStorage에 저장
            saveUserLocationTemplates([template])
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
  addBasicTemplateInstance
} = authSlice.actions;

export default authSlice.reducer; 