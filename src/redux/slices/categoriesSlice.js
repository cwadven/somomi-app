import { createSlice } from '@reduxjs/toolkit';

// 기본 카테고리 정의
const defaultCategories = [
  { id: '1', name: '식품', description: '먹을 수 있는 음식 및 식재료' },
  { id: '2', name: '화장품', description: '피부, 헤어 등 미용 관련 제품' },
  { id: '3', name: '세제', description: '세탁, 청소 등에 사용되는 세정제' },
  { id: '4', name: '샴푸', description: '머리를 감는 헤어 케어 제품' },
  { id: '5', name: '휴지', description: '화장지, 키친타올 등 종이 제품' },
];

const initialState = {
  categories: defaultCategories,
  loading: false,
  error: null,
};

export const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    // 카테고리 추가
    addCategory: (state, action) => {
      state.categories.push(action.payload);
    },
    // 카테고리 수정
    updateCategory: (state, action) => {
      const { id, updatedCategory } = action.payload;
      const index = state.categories.findIndex(category => category.id === id);
      if (index !== -1) {
        state.categories[index] = { ...state.categories[index], ...updatedCategory };
      }
    },
    // 카테고리 삭제
    deleteCategory: (state, action) => {
      state.categories = state.categories.filter(category => category.id !== action.payload);
    },
    // 카테고리 목록 설정
    setCategories: (state, action) => {
      state.categories = action.payload;
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
  addCategory, 
  updateCategory, 
  deleteCategory, 
  setCategories,
  setLoading,
  setError
} = categoriesSlice.actions;

export default categoriesSlice.reducer; 