import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  fetchProductsApi, 
  fetchProductByIdApi, 
  addProductApi, 
  updateProductApi, 
  deleteProductApi,
  markProductAsConsumedApi,
  fetchConsumedProductsApi,
  restoreConsumedProductApi
} from '../../api/productsApi';
import { deleteLocation } from './locationsSlice';

// 비동기 액션 생성
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchProductsApi();
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetchProductByIdApi(id);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addProductAsync = createAsyncThunk(
  'products/addProduct',
  async (product, { rejectWithValue }) => {
    try {
      const response = await addProductApi(product);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateProductAsync = createAsyncThunk(
  'products/updateProduct',
  async (product, { rejectWithValue }) => {
    try {
      const response = await updateProductApi(product);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteProductAsync = createAsyncThunk(
  'products/deleteProduct',
  async (id, { rejectWithValue }) => {
    try {
      await deleteProductApi(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 소진 처리 액션
export const markProductAsConsumedAsync = createAsyncThunk(
  'products/markAsConsumed',
  async ({ id, consumedDate = null }, { rejectWithValue }) => {
    try {
      const response = await markProductAsConsumedApi(id, consumedDate);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 소진 처리된 제품 조회 액션
export const fetchConsumedProductsAsync = createAsyncThunk(
  'products/fetchConsumedProducts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchConsumedProductsApi();
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 소진 철회 액션
export const restoreConsumedProductAsync = createAsyncThunk(
  'products/restoreConsumed',
  async ({ id, locationId = null }, { rejectWithValue }) => {
    try {
      const response = await restoreConsumedProductApi(id, locationId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  products: [],
  consumedProducts: [], // 소진 처리된 제품 목록
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  consumedStatus: 'idle', // 소진 처리된 제품 로딩 상태
  error: null,
  currentProduct: null,
};

export const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchProducts 처리
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.products = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // fetchProductById 처리
      .addCase(fetchProductById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // addProductAsync 처리
      .addCase(addProductAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addProductAsync.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.products.push(action.payload);
      })
      .addCase(addProductAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // updateProductAsync 처리
      .addCase(updateProductAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateProductAsync.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.products.findIndex(product => product.id === action.payload.id);
        if (index !== -1) {
          state.products[index] = action.payload;
        }
        state.currentProduct = action.payload;
      })
      .addCase(updateProductAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // deleteProductAsync 처리
      .addCase(deleteProductAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteProductAsync.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.products = state.products.filter(product => product.id !== action.payload);
      })
      .addCase(deleteProductAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // 소진 처리 액션 처리
      .addCase(markProductAsConsumedAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(markProductAsConsumedAsync.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // 일반 제품 목록에서 제거
        state.products = state.products.filter(product => product.id !== action.payload.id);
        // 소진 처리된 제품 목록에 추가 (이미 있는 경우 중복 방지)
        if (!state.consumedProducts.some(p => p.id === action.payload.id)) {
          state.consumedProducts.push(action.payload);
        }
        // 현재 제품 상태 유지 (null로 설정하지 않음)
      })
      .addCase(markProductAsConsumedAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // 소진 처리된 제품 조회 액션 처리
      .addCase(fetchConsumedProductsAsync.pending, (state) => {
        state.consumedStatus = 'loading';
      })
      .addCase(fetchConsumedProductsAsync.fulfilled, (state, action) => {
        state.consumedStatus = 'succeeded';
        state.consumedProducts = action.payload;
      })
      .addCase(fetchConsumedProductsAsync.rejected, (state, action) => {
        state.consumedStatus = 'failed';
        state.error = action.payload;
      })
      
      // 소진 철회 액션 처리
      .addCase(restoreConsumedProductAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(restoreConsumedProductAsync.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // 소진 처리된 제품 목록에서 제거
        state.consumedProducts = state.consumedProducts.filter(product => product.id !== action.payload.id);
        // 일반 제품 목록에 추가 (이미 있는 경우 중복 방지)
        if (!state.products.some(p => p.id === action.payload.id)) {
          state.products.push(action.payload);
        }
        // 현재 제품 상태 유지 (null로 설정하지 않음)
      })
      .addCase(restoreConsumedProductAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // 영역 삭제 시 해당 영역의 제품들도 함께 삭제
      .addCase(deleteLocation.fulfilled, (state, action) => {
        const deletedLocationId = action.payload;
        // 일반 제품 목록에서 해당 영역의 제품 제거
        state.products = state.products.filter(product => product.locationId !== deletedLocationId);
        // 소진 처리된 제품 목록에서도 해당 영역의 제품 제거
        state.consumedProducts = state.consumedProducts.filter(product => product.locationId !== deletedLocationId);
        // 현재 제품이 해당 영역의 제품이면 초기화
        if (state.currentProduct && state.currentProduct.locationId === deletedLocationId) {
          state.currentProduct = null;
        }
      });
  },
});

export const { clearCurrentProduct, clearError } = productsSlice.actions;

export default productsSlice.reducer; 