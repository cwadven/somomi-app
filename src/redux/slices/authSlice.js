import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  isLoggedIn: false,
  loading: false,
  error: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 로그인 성공
    loginSuccess: (state, action) => {
      state.isLoggedIn = true;
      state.user = action.payload;
      state.error = null;
    },
    // 로그아웃
    logout: (state) => {
      state.isLoggedIn = false;
      state.user = null;
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
  },
});

export const { 
  loginSuccess, 
  logout, 
  updateUserInfo,
  setLoading,
  setError
} = authSlice.actions;

export default authSlice.reducer; 