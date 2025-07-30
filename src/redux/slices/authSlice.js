import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { saveUserSlots, loadUserSlots } from '../../utils/storageUtils';
import { generateId } from '../../utils/idUtils';

// JWT 토큰 발급 API 호출 (실제 구현 시 서버에서 가져옴)
export const getAnonymousToken = createAsyncThunk(
  'auth/getAnonymousToken',
  async (_, { rejectWithValue }) => {
    try {
      // 실제 구현에서는 서버에 요청하여 익명 사용자용 JWT 토큰을 받아옴
      // 여기서는 임시로 생성된 토큰을 반환
      const token = `anonymous_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
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
  async (_, { rejectWithValue }) => {
    try {
      // localStorage에서 토큰 가져오기
      const token = localStorage.getItem('jwt_token');
      
      if (!token) {
        console.log('토큰이 없습니다. 초기 상태로 설정합니다.');
        return null;
      }
      
      // 실제 구현에서는 서버에 토큰 검증 요청
      // 여기서는 토큰 형식에 따라 사용자 타입 결정
      if (token.startsWith('anonymous_')) {
        console.log('익명 사용자 토큰 검증 성공');
        return { 
          token,
          isAnonymous: true
        };
      } else {
        // 실제 구현에서는 서버에서 사용자 정보를 받아옴
        console.log('로그인 사용자 토큰 검증 성공');
        return {
          token,
          isAnonymous: false,
          user: {
            id: '1',
            username: '사용자',
            email: 'user@example.com',
          }
        };
      }
    } catch (error) {
      console.error('토큰 검증 오류:', error);
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
        
        // 비회원은 기본 템플릿 1개만 제공
        console.log('익명 토큰 발급: 템플릿 인스턴스 초기화');
        const template = createBasicLocationTemplate();
        state.userLocationTemplateInstances = [template];
        console.log('익명 토큰 발급 후 템플릿 인스턴스:', [template]);
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
          return;
        }
        
        state.token = action.payload.token;
        state.isAnonymous = action.payload.isAnonymous;
        
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
        } else {
          // 익명 사용자는 기본 템플릿 1개 제공
          console.log('토큰 검증 (익명 사용자): 템플릿 인스턴스 초기화');
          const template = createBasicLocationTemplate();
          state.userLocationTemplateInstances = [template];
          console.log('토큰 검증 후 템플릿 인스턴스 (익명):', [template]);
        }
        
        state.error = null;
      })
      .addCase(verifyToken.rejected, (state, action) => {
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
  addTemplateInstance
} = authSlice.actions;

export default authSlice.reducer; 