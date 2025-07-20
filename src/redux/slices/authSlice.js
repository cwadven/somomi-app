import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

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

// 토큰 검증 및 사용자 정보 가져오기
export const verifyToken = createAsyncThunk(
  'auth/verifyToken',
  async (_, { rejectWithValue }) => {
    try {
      // localStorage에서 토큰 가져오기
      const token = localStorage.getItem('jwt_token');
      
      if (!token) {
        return null;
      }
      
      // 실제 구현에서는 서버에 토큰 검증 요청
      // 여기서는 토큰 형식으로 사용자 타입 판별
      const isAnonymous = token.startsWith('anonymous_');
      
      if (isAnonymous) {
        return { 
          token,
          isAnonymous: true
        };
      } else {
        // 실제 구현에서는 서버에서 사용자 정보를 받아옴
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
      return rejectWithValue(error.message);
    }
  }
);

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
  purchaseHistory: [], // 구매 내역
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
    // 구독 정보 업데이트
    updateSubscription: (state, action) => {
      state.subscription = { ...state.subscription, ...action.payload };
    },

    // 슬롯 정보 업데이트
    updateSlots: (state, action) => {
      state.slots = { ...state.slots, ...action.payload };
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
      state.purchaseHistory = [];
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
          // 토큰이 없는 경우
          state.isLoggedIn = false;
          state.isAnonymous = false;
          state.token = null;
          state.user = null;
        } else if (action.payload.isAnonymous) {
          // 익명 토큰인 경우
          state.isLoggedIn = false;
          state.isAnonymous = true;
          state.token = action.payload.token;
          state.user = null;
        } else {
          // 로그인 토큰인 경우
          state.isLoggedIn = true;
          state.isAnonymous = false;
          state.token = action.payload.token;
          state.user = action.payload.user;
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
  addPurchase
} = authSlice.actions;

export default authSlice.reducer; 