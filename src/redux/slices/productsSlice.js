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
import { createEntity, updateEntity, deleteEntity, ENTITY_TYPES } from '../../api/syncApi';
import { deleteLocation } from './locationsSlice';
import { saveProducts, loadProducts, saveConsumedProducts, loadConsumedProducts } from '../../utils/storageUtils';

// 비동기 액션 생성
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (_, { rejectWithValue, getState }) => {
    try {
      console.log('fetchProducts 시작');
      
      // 현재 상태에서 제품 목록 가져오기
      const currentProducts = getState().products.products;
      console.log('현재 저장된 제품 목록:', currentProducts);
      
      // 제품 목록이 비어있으면 AsyncStorage에서 로드
      if (currentProducts.length === 0) {
        const storedProducts = await loadProducts();
        const filtered = (storedProducts || []).filter(p => p?.syncStatus !== 'deleted');
        console.log('AsyncStorage에서 로드한 제품 목록:', filtered);
        return filtered;
      }
      
      // 이미 제품 목록이 있으면 그대로 반환
      return currentProducts.filter(p => p?.syncStatus !== 'deleted');
    } catch (error) {
      console.error('제품 목록 가져오기 오류:', error);
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

// 특정 영역의 제품 목록 가져오기
export const fetchProductsByLocation = createAsyncThunk(
  'products/fetchProductsByLocation',
  async (locationId, { rejectWithValue, getState }) => {
    try {
      // 모든 제품 가져오기
      const { products } = getState().products;
      
      // 이미 제품 데이터가 있으면 필터링만 수행
      if (products.length > 0) {
        if (locationId === 'all') {
          return products;
        } else {
          return products.filter(product => 
            product.locationLocalId === locationId || product.locationId === locationId
          );
        }
      }
      
      // 제품 데이터가 없으면 AsyncStorage에서 로드
      const storedProducts = await loadProducts();
      
      if (locationId === 'all') {
        return storedProducts;
      } else {
        return storedProducts.filter(product => 
          product.locationLocalId === locationId || product.locationId === locationId
        );
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addProductAsync = createAsyncThunk(
  'products/addProduct',
  async (product, { rejectWithValue, getState }) => {
    try {
      const nowIso = new Date().toISOString();
      const locationLocalId = product.locationLocalId || product.locationId;
      const base = {
        ...product,
        locationLocalId,
        // 호환을 위해 locationId도 유지
        locationId: product.locationId || locationLocalId,
        // 메타는 syncApi에서 보강
        localId: product.localId || product.id || undefined,
      };
      const enriched = await createEntity(ENTITY_TYPES.PRODUCT, base, {
        deviceId: getState().auth?.deviceId || 'unknown',
        ownerUserId: getState().auth?.user?.id,
      });
      const response = await addProductApi(enriched);
      // id가 생성되면 localId 초기화(마이그레이션 정책)
      response.localId = response.localId || response.id;
      response.locationLocalId = response.locationLocalId || response.locationId;
      
      // 새 제품이 추가된 후 전체 제품 목록을 AsyncStorage에 저장
      const updatedProducts = [...getState().products.products, response];
      await saveProducts(updatedProducts);
      
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateProductAsync = createAsyncThunk(
  'products/updateProduct',
  async (product, { rejectWithValue, getState }) => {
    try {
      const enriched = await updateEntity(ENTITY_TYPES.PRODUCT, {
        ...product,
        locationLocalId: product.locationLocalId || product.locationId,
        locationId: product.locationId || product.locationLocalId,
      }, {
        deviceId: getState().auth?.deviceId || product.deviceId || 'unknown',
        ownerUserId: getState().auth?.user?.id || product.ownerUserId,
      });
      const response = await updateProductApi(enriched);
      
      // 제품 수정 후 전체 제품 목록을 AsyncStorage에 저장
      const updatedProducts = getState().products.products.map(p => 
        p.id === product.id ? response : p
      );
      await saveProducts(updatedProducts);
      
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteProductAsync = createAsyncThunk(
  'products/deleteProduct',
  async (id, { rejectWithValue, getState }) => {
    try {
      await deleteEntity(ENTITY_TYPES.PRODUCT, { id, localId: id }, {
        deviceId: getState().auth?.deviceId,
        ownerUserId: getState().auth?.user?.id,
      });
      // tombstone 적용: 저장에는 남기고 상태에서만 제거
      const nowIso = new Date().toISOString();
      const updatedProducts = getState().products.products.map(p => p.id === id ? { ...p, syncStatus: 'deleted', deletedAt: nowIso } : p);
      await saveProducts(updatedProducts);
      
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 소진 처리 액션
export const markProductAsConsumedAsync = createAsyncThunk(
  'products/markProductAsConsumed',
  async ({ id, consumptionDate }, { rejectWithValue, getState }) => {
    try {
      const response = await markProductAsConsumedApi(id, consumptionDate);
      
      // 제품이 소진된 후 전체 제품 목록과 소진된 제품 목록을 AsyncStorage에 저장
      const { products, consumedProducts } = getState().products;
      const updatedProducts = products.filter(p => p.id !== id);
      const updatedConsumedProducts = [...consumedProducts, response].sort((a, b) => {
        const ta = a.processedAt ? new Date(a.processedAt).getTime() : (a.consumedAt ? new Date(a.consumedAt).getTime() : 0);
        const tb = b.processedAt ? new Date(b.processedAt).getTime() : (b.consumedAt ? new Date(b.consumedAt).getTime() : 0);
        return tb - ta;
      });
      
      await saveProducts(updatedProducts);
      await saveConsumedProducts(updatedConsumedProducts);
      
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 소진 처리된 제품 조회 액션
export const fetchConsumedProducts = createAsyncThunk(
  'products/fetchConsumedProducts',
  async (_, { rejectWithValue, getState }) => {
    try {
      console.log('fetchConsumedProducts 시작');
      
      // 현재 상태에서 소진된 제품 목록 가져오기
      const currentConsumedProducts = getState().products.consumedProducts;
      console.log('현재 저장된 소진된 제품 목록:', currentConsumedProducts);
      
      // 소진된 제품 목록이 비어있으면 AsyncStorage에서 로드
      if (currentConsumedProducts.length === 0) {
        const storedConsumedProducts = await loadConsumedProducts();
        console.log('AsyncStorage에서 로드한 소진된 제품 목록:', storedConsumedProducts);
        return (storedConsumedProducts || []).slice().sort((a, b) => {
          const ta = a.consumedAt ? new Date(a.consumedAt).getTime() : 0;
          const tb = b.consumedAt ? new Date(b.consumedAt).getTime() : 0;
          return tb - ta;
        });
      }
      
      // 이미 소진된 제품 목록이 있으면 그대로 반환
      return currentConsumedProducts;
    } catch (error) {
      console.error('소진된 제품 목록 가져오기 오류:', error);
      return rejectWithValue(error.message);
    }
  }
);

// 소진 철회 액션
export const restoreConsumedProductAsync = createAsyncThunk(
  'products/restoreConsumedProduct',
  async ({ id, locationId = null }, { rejectWithValue, getState }) => {
    try {
      console.log('소진 철회 액션 시작:', { id, locationId });
      const response = await restoreConsumedProductApi(id, locationId);
      
      // 소진 철회 후 전체 제품 목록과 소진된 제품 목록을 AsyncStorage에 저장
      const { products, consumedProducts } = getState().products;
      const updatedProducts = [...products, response];
      const updatedConsumedProducts = consumedProducts.filter(p => p.id !== id);
      
      await saveProducts(updatedProducts);
      await saveConsumedProducts(updatedConsumedProducts);
      
      console.log('소진 철회 성공:', response);
      return response;
    } catch (error) {
      console.error('소진 철회 실패:', error);
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
  locationProducts: {}, // 영역별 제품 목록 캐시
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
      
      // fetchProductsByLocation 처리
      .addCase(fetchProductsByLocation.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProductsByLocation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // 전체 제품 목록이 비어있으면 업데이트
        if (state.products.length === 0 && action.meta.arg === 'all') {
          state.products = action.payload;
        }
        // 영역별 제품 목록 캐시 업데이트
        state.locationProducts[action.meta.arg] = action.payload;
      })
      .addCase(fetchProductsByLocation.rejected, (state, action) => {
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
        
        // 영역별 제품 목록 캐시 업데이트
        const locationId = action.payload.locationLocalId || action.payload.locationId;
        if (state.locationProducts[locationId]) {
          state.locationProducts[locationId].push(action.payload);
        }
        if (state.locationProducts['all']) {
          state.locationProducts['all'].push(action.payload);
        }
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
        
        // 영역별 제품 목록 캐시 업데이트
        Object.keys(state.locationProducts).forEach(locationId => {
          const productIndex = state.locationProducts[locationId].findIndex(
            product => product.id === action.payload.id
          );
          if (productIndex !== -1) {
            state.locationProducts[locationId][productIndex] = action.payload;
          }
        });
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
        
        // 영역별 제품 목록 캐시 업데이트
        Object.keys(state.locationProducts).forEach(locationId => {
          state.locationProducts[locationId] = state.locationProducts[locationId].filter(
            product => product.id !== action.payload
          );
        });
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
          state.consumedProducts.sort((a, b) => {
            const ta = a.processedAt ? new Date(a.processedAt).getTime() : (a.consumedAt ? new Date(a.consumedAt).getTime() : 0);
            const tb = b.processedAt ? new Date(b.processedAt).getTime() : (b.consumedAt ? new Date(b.consumedAt).getTime() : 0);
            return tb - ta;
          });
        }
        // 현재 제품 상태 유지 (null로 설정하지 않음)
        
        // 영역별 제품 목록 캐시 업데이트
        Object.keys(state.locationProducts).forEach(locationId => {
          state.locationProducts[locationId] = state.locationProducts[locationId].filter(
            product => product.id !== action.payload.id
          );
        });
      })
      .addCase(markProductAsConsumedAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // 소진 처리된 제품 조회 액션 처리
      .addCase(fetchConsumedProducts.pending, (state) => {
        state.consumedStatus = 'loading';
      })
      .addCase(fetchConsumedProducts.fulfilled, (state, action) => {
        state.consumedStatus = 'succeeded';
        state.consumedProducts = (action.payload || []).slice().sort((a, b) => {
          const ta = a.processedAt ? new Date(a.processedAt).getTime() : (a.consumedAt ? new Date(a.consumedAt).getTime() : 0);
          const tb = b.processedAt ? new Date(b.processedAt).getTime() : (b.consumedAt ? new Date(b.consumedAt).getTime() : 0);
          return tb - ta;
        });
      })
      .addCase(fetchConsumedProducts.rejected, (state, action) => {
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
        
        // 영역별 제품 목록 캐시 업데이트
        const locationId = action.payload.locationId;
        if (locationId && state.locationProducts[locationId]) {
          state.locationProducts[locationId].push(action.payload);
        }
        if (state.locationProducts['all']) {
          state.locationProducts['all'].push(action.payload);
        }
      })
      .addCase(restoreConsumedProductAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // 영역 삭제 시 해당 영역의 제품들도 함께 삭제
      .addCase(deleteLocation.fulfilled, (state, action) => {
        const deletedLocationId = action.payload;
        // 일반 제품 목록에서 해당 영역의 제품 제거
        state.products = state.products.filter(product => 
          product.locationId !== deletedLocationId && product.locationLocalId !== deletedLocationId
        );
        // 소진 처리된 제품 목록에서도 해당 영역의 제품 제거
        state.consumedProducts = state.consumedProducts.filter(product => 
          product.locationId !== deletedLocationId && product.locationLocalId !== deletedLocationId
        );
        // 현재 제품이 해당 영역의 제품이면 초기화
        if (state.currentProduct && (state.currentProduct.locationId === deletedLocationId || state.currentProduct.locationLocalId === deletedLocationId)) {
          state.currentProduct = null;
        }
        
        // 영역별 제품 목록 캐시에서 해당 영역 제거
        if (state.locationProducts[deletedLocationId]) {
          delete state.locationProducts[deletedLocationId];
        }
        
        // 'all' 캐시 업데이트
        if (state.locationProducts['all']) {
          state.locationProducts['all'] = state.locationProducts['all'].filter(
            product => product.locationId !== deletedLocationId && product.locationLocalId !== deletedLocationId
          );
        }
      });
  },
});

export const { clearCurrentProduct, clearError } = productsSlice.actions;

export default productsSlice.reducer; 