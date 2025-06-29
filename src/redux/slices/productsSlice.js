import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  products: [],
  loading: false,
  error: null,
};

export const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    // 제품 추가
    addProduct: (state, action) => {
      state.products.push(action.payload);
    },
    // 제품 수정
    updateProduct: (state, action) => {
      const { id, updatedProduct } = action.payload;
      const index = state.products.findIndex(product => product.id === id);
      if (index !== -1) {
        state.products[index] = { ...state.products[index], ...updatedProduct };
      }
    },
    // 제품 삭제
    deleteProduct: (state, action) => {
      state.products = state.products.filter(product => product.id !== action.payload);
    },
    // 제품 목록 설정
    setProducts: (state, action) => {
      state.products = action.payload;
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
  addProduct, 
  updateProduct, 
  deleteProduct, 
  setProducts,
  setLoading,
  setError
} = productsSlice.actions;

export default productsSlice.reducer; 