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
import { ENTITY_TYPES } from '../../api/syncApi';
import { commitCreate, commitUpdate, commitDelete } from '../../utils/syncHelpers';
import { deleteLocation } from './locationsSlice';
import { fetchInventoryItemsBySection, fetchAllInventoryItems, deleteInventoryItem } from '../../api/inventoryApi';
import { refreshAfterMutation } from '../../utils/dataRefresh';
import { saveProducts, loadProducts, saveConsumedProducts, loadConsumedProducts } from '../../utils/storageUtils';
import { fetchConsumedInventoryItems } from '../../api/inventoryApi';
import { unassignProductSlotTemplate, releaseProductSlotTemplateByProduct, loadUserProductSlotTemplateInstances } from './authSlice';

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
        console.log('AsyncStorage에서 로드한 제품 목록:', storedProducts);
        return storedProducts || [];
      }
      
      // 이미 제품 목록이 있으면 그대로 반환
      return currentProducts;
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
  async (arg, { rejectWithValue, getState }) => {
    try {
      const isObj = typeof arg === 'object' && arg !== null;
      const locId = isObj ? arg.locationId : arg;
      const nextCursorParam = isObj ? (arg.nextCursor || null) : null;
      const sizeParam = isObj && arg.size != null ? arg.size : null;
      const append = isObj ? !!arg.append : false;
      const sortParam = isObj ? (arg.sort || null) : null;

      // 서버 호출: 전체/특정 영역 분기
      if (locId === 'all') {
        try {
          const res = await fetchAllInventoryItems({ nextCursor: nextCursorParam, size: sizeParam, sort: sortParam });
          const items = Array.isArray(res?.guest_inventory_items) ? res.guest_inventory_items : [];
          const mapped = items.map((it) => ({
            id: String(it.id),
            locationId: it.guest_section_id ? String(it.guest_section_id) : null,
            name: it.name,
            memo: it.memo || '',
            brand: it.brand || '',
            purchasePlace: it.point_of_purchase || '',
            price: typeof it.purchase_price === 'number' ? it.purchase_price : null,
            purchaseDate: it.purchase_at || null,
            iconUrl: it.icon_url || null,
            estimatedEndDate: it.expected_expire_at || null,
            expiryDate: it.expire_at || null,
            createdAt: it.created_at,
            updatedAt: it.updated_at,
            isConsumed: false,
          }));
          return { 
            items: mapped, 
            nextCursor: res?.next_cursor ?? null, 
            hasMore: !!res?.has_more, 
            locationId: locId, 
            append,
          };
        } catch (apiErr) {
          console.warn('전체 인벤토리 API 실패, 로컬 폴백 사용:', apiErr?.message || String(apiErr));
        }
      } else {
        try {
          const res = await fetchInventoryItemsBySection(locId, { nextCursor: nextCursorParam, size: sizeParam, sort: sortParam });
          const items = Array.isArray(res?.guest_inventory_items) ? res.guest_inventory_items : [];
          const mapped = items.map((it) => ({
            id: String(it.id),
            locationId: it.guest_section_id ? String(it.guest_section_id) : null,
            name: it.name,
            memo: it.memo || '',
            brand: it.brand || '',
            purchasePlace: it.point_of_purchase || '',
            price: typeof it.purchase_price === 'number' ? it.purchase_price : null,
            purchaseDate: it.purchase_at || null,
            iconUrl: it.icon_url || null,
            estimatedEndDate: it.expected_expire_at || null,
            expiryDate: it.expire_at || null,
            createdAt: it.created_at,
            updatedAt: it.updated_at,
            isConsumed: false,
          }));
          return { 
            items: mapped, 
            nextCursor: res?.next_cursor ?? null, 
            hasMore: !!res?.has_more,
            locationId: locId,
            append 
          };
        } catch (apiErr) {
          console.warn('영역별 인벤토리 API 실패, 로컬 폴백 사용:', apiErr?.message || String(apiErr));
        }
      }

      // 폴백: 로컬 저장/상태 기반
      const { products } = getState().products;
      if (products.length > 0) {
        if (locId === 'all') {
          return { items: products, nextCursor: null, hasMore: false, locationId: locId, append: false };
        } else {
          return { 
            items: products.filter(product => 
              product.locationLocalId === locId || product.locationId === locId
            ),
            nextCursor: null,
            hasMore: false,
            locationId: locId,
            append: false
          };
        }
      }

      const storedProducts = await loadProducts();
      if (locId === 'all') {
        return { items: storedProducts, nextCursor: null, hasMore: false, locationId: locId, append: false };
      } else {
        return { 
          items: storedProducts.filter(product => 
            product.locationLocalId === locId || product.locationId === locId
          ),
          nextCursor: null,
          hasMore: false,
          locationId: locId,
          append: false
        };
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addProductAsync = createAsyncThunk(
  'products/addProduct',
  async (product, { rejectWithValue, getState, dispatch }) => {
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
      const enriched = await commitCreate(ENTITY_TYPES.PRODUCT, base, {
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
      
      try { await refreshAfterMutation(dispatch); } catch (e) {}
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateProductAsync = createAsyncThunk(
  'products/updateProduct',
  async (product, { rejectWithValue, getState, dispatch }) => {
    try {
      const enriched = await commitUpdate(ENTITY_TYPES.PRODUCT, {
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
      
      try { await refreshAfterMutation(dispatch); } catch (e) {}
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteProductAsync = createAsyncThunk(
  'products/deleteProduct',
  async (id, { rejectWithValue, getState, dispatch }) => {
    try {
      const state = getState();
      const isLoggedIn = !!state?.auth?.isLoggedIn;

      if (isLoggedIn) {
        // 서버에 삭제 요청
        await deleteInventoryItem(id);
      } else {
        // 오프라인/비로그인: 로컬 동기화 큐 기록
        await commitDelete(ENTITY_TYPES.PRODUCT, { id, localId: id }, {
          deviceId: state.auth?.deviceId,
          ownerUserId: state.auth?.user?.id,
        });
      }

      // 로컬 상태/스토리지 정리
      const updatedProducts = state.products.products.filter(p => p.id !== id);
      await saveProducts(updatedProducts);
      // 추가 제품 슬롯이 해당 제품에 사용 중이었다면 해제
      try { dispatch(releaseProductSlotTemplateByProduct(id)); } catch (e) {}

      // 서버 템플릿 최신화
      try { await dispatch(loadUserProductSlotTemplateInstances()).unwrap(); } catch (e) {}
      try { await refreshAfterMutation(dispatch); } catch (e) {}
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 소진 처리 액션
export const markProductAsConsumedAsync = createAsyncThunk(
  'products/markProductAsConsumed',
  async ({ id, consumptionDate }, { rejectWithValue, getState, dispatch }) => {
    try {
      const response = await markProductAsConsumedApi(id, consumptionDate);
      // 동기화 큐에 업데이트 기록(소진 처리)
      try {
        await commitUpdate(ENTITY_TYPES.PRODUCT, {
          ...response,
          isConsumed: true,
        }, {
          deviceId: getState().auth?.deviceId || 'unknown',
          ownerUserId: getState().auth?.user?.id,
        });
      } catch (e) {}
      
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
      // 추가 제품 슬롯이 해당 제품에 사용 중이었다면 해제
      try { dispatch(releaseProductSlotTemplateByProduct(id)); } catch (e) {}
      // 서버 템플릿 최신화
      try { await dispatch(loadUserProductSlotTemplateInstances()).unwrap(); } catch (e) {}
      try { await refreshAfterMutation(dispatch); } catch (e) {}
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 소진 처리된 제품 조회 액션 (커서 페이지네이션 + 서버 정렬)
export const fetchConsumedProducts = createAsyncThunk(
  'products/fetchConsumedProducts',
  async (arg, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const isLoggedIn = !!state?.auth?.isLoggedIn;
      const isObj = typeof arg === 'object' && arg !== null;
      const nextCursorParam = isObj ? (arg.nextCursor || null) : null;
      const sizeParam = isObj && arg.size != null ? arg.size : null;
      const sortParam = isObj ? (arg.sort || null) : (state.products?.consumedMeta?.sort || '-consumed');
      const append = isObj ? !!arg.append : false;
      if (isLoggedIn) {
        try {
          const res = await fetchConsumedInventoryItems({ nextCursor: nextCursorParam, size: sizeParam, sort: sortParam });
          const items = Array.isArray(res?.guest_inventory_consumed_items) ? res.guest_inventory_consumed_items : [];
          const mapped = items.map((it) => ({
            id: String(it.id),
            locationId: it.guest_section_id ? String(it.guest_section_id) : null,
            name: it.name,
            memo: it.memo || '',
            brand: it.brand || '',
            purchasePlace: it.point_of_purchase || '',
            price: typeof it.purchase_price === 'number' ? it.purchase_price : null,
            purchaseDate: it.purchase_at || null,
            iconUrl: it.icon_url || null,
            estimatedEndDate: it.expected_expire_at || null,
            expiryDate: it.expire_at || null,
            consumedAt: it.consumed_at || null,
            processedAt: it.moved_to_consumed_section_at || null,
            createdAt: it.created_at,
            updatedAt: it.updated_at,
            isConsumed: true,
          }));
          // 서버 정렬 순서를 그대로 사용
          try { if (!append) await saveConsumedProducts(mapped); } catch (e) {}
          return { items: mapped, nextCursor: res?.next_cursor ?? null, hasMore: !!res?.has_more, append, sort: sortParam };
        } catch (apiErr) {
          console.warn('소진 목록 API 실패, 로컬 폴백 사용:', apiErr?.message || String(apiErr));
        }
      }

      // 폴백: 현재 상태 또는 AsyncStorage
      const currentConsumedProducts = state.products.consumedProducts;
      if (currentConsumedProducts.length > 0) return { items: currentConsumedProducts, nextCursor: null, hasMore: false, append: false, sort: sortParam };
      const storedConsumedProducts = await loadConsumedProducts();
      return { items: storedConsumedProducts || [], nextCursor: null, hasMore: false, append: false, sort: sortParam };
    } catch (error) {
      console.error('소진된 제품 목록 가져오기 오류:', error);
      return rejectWithValue(error.message);
    }
  }
);

// 소진 철회 액션
export const restoreConsumedProductAsync = createAsyncThunk(
  'products/restoreConsumedProduct',
  async ({ id, locationId = null }, { rejectWithValue, getState, dispatch }) => {
    try {
      console.log('소진 철회 액션 시작:', { id, locationId });
      const response = await restoreConsumedProductApi(id, locationId);
      // 동기화 큐에 업데이트 기록(소진 철회)
      try {
        await commitUpdate(ENTITY_TYPES.PRODUCT, {
          ...response,
          isConsumed: false,
        }, {
          deviceId: getState().auth?.deviceId || 'unknown',
          ownerUserId: getState().auth?.user?.id,
        });
      } catch (e) {}
      
      // 소진 철회 후 전체 제품 목록과 소진된 제품 목록을 AsyncStorage에 저장
      const { products, consumedProducts } = getState().products;
      const updatedProducts = [...products, response];
      const updatedConsumedProducts = consumedProducts.filter(p => p.id !== id);
      
      await saveProducts(updatedProducts);
      await saveConsumedProducts(updatedConsumedProducts);
      
      console.log('소진 철회 성공:', response);
      try { await refreshAfterMutation(dispatch); } catch (e) {}
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
  consumedLoadingMore: false, // 소진 목록 추가 로딩 상태
  error: null,
  currentProduct: null,
  locationProducts: {}, // 영역별 제품 목록 캐시 (array)
  locationProductsMeta: {}, // { [locationId]: { nextCursor, hasMore } }
  consumedMeta: { nextCursor: null, hasMore: false, sort: '-consumed' }, // 소진 목록 메타
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
    // 서버/화면에서 이미 알고 있는 변경사항을 즉시 캐시에 반영 (목록/상세 즉시 갱신용)
    patchProductById: (state, action) => {
      const id = String(action.payload?.id ?? '');
      const patch = action.payload?.patch || {};
      if (!id) return;

      // products(내 제품 목록) 업데이트
      const idx = state.products.findIndex(p => String(p.id) === id);
      if (idx !== -1) {
        state.products[idx] = { ...state.products[idx], ...patch };
      }

      // currentProduct 업데이트
      if (state.currentProduct && String(state.currentProduct.id) === id) {
        state.currentProduct = { ...state.currentProduct, ...patch };
      }

      // consumedProducts 업데이트(혹시 동일 id가 들어있는 경우)
      const cIdx = state.consumedProducts.findIndex(p => String(p.id) === id);
      if (cIdx !== -1) {
        state.consumedProducts[cIdx] = { ...state.consumedProducts[cIdx], ...patch };
      }

      // locationProducts 캐시 업데이트
      Object.keys(state.locationProducts || {}).forEach((locId) => {
        const list = state.locationProducts[locId];
        if (!Array.isArray(list)) return;
        const pIdx = list.findIndex(p => String(p.id) === id);
        if (pIdx !== -1) {
          state.locationProducts[locId][pIdx] = { ...state.locationProducts[locId][pIdx], ...patch };
        }
      });
    },
    // 소진 철회 등으로 "활성 제품 목록"에 다시 들어오는 경우를 즉시 반영
    upsertActiveProduct: (state, action) => {
      const product = action.payload?.product;
      if (!product || product.id == null) return;
      const id = String(product.id);
      const locId = product.locationId != null ? String(product.locationId) : null;

      // 소진 목록에서 제거
      state.consumedProducts = (state.consumedProducts || []).filter(p => String(p?.id) !== id);

      // products(전체/내 제품) upsert
      const pIdx = state.products.findIndex(p => String(p?.id) === id);
      if (pIdx !== -1) state.products[pIdx] = { ...state.products[pIdx], ...product, isConsumed: false };
      else state.products.unshift({ ...product, isConsumed: false });

      // locationProducts 캐시 upsert (해당 locId, 그리고 'all' 캐시가 있다면 거기도)
      if (locId) {
        const list = state.locationProducts[locId];
        if (Array.isArray(list)) {
          const i = list.findIndex(p => String(p?.id) === id);
          if (i !== -1) state.locationProducts[locId][i] = { ...state.locationProducts[locId][i], ...product, isConsumed: false };
          else state.locationProducts[locId].unshift({ ...product, isConsumed: false });
        }
      }
      if (Array.isArray(state.locationProducts['all'])) {
        const all = state.locationProducts['all'];
        const i = all.findIndex(p => String(p?.id) === id);
        if (i !== -1) all[i] = { ...all[i], ...product, isConsumed: false };
        else all.unshift({ ...product, isConsumed: false });
      }

      // currentProduct도 해당 id면 갱신
      if (state.currentProduct && String(state.currentProduct.id) === id) {
        state.currentProduct = { ...state.currentProduct, ...product, isConsumed: false };
      }
    },
    removeConsumedProductById: (state, action) => {
      const id = String(action.payload);
      state.consumedProducts = state.consumedProducts.filter(p => String(p.id) !== id);
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
      .addCase(fetchProductsByLocation.pending, (state, action) => {
        // 초기 로드 때만 전역 로딩 처리(리스트 상단 스피너 용)
        const isObj = typeof action.meta.arg === 'object' && action.meta.arg !== null;
        const locId = isObj ? action.meta.arg.locationId : action.meta.arg;
        const append = isObj ? !!action.meta.arg.append : false;
        if (!append) {
          state.status = 'loading';
        }
      })
      .addCase(fetchProductsByLocation.fulfilled, (state, action) => {
        const payload = action.payload || {};
        const { items = [], nextCursor = null, hasMore = false, locationId, append = false } = payload;

        // 초기 로드(append=false)에서만 전역 상태 업데이트
        if (!append) state.status = 'succeeded';

        // 전체 제품 캐시(all) 초기 로드 시만 보강
        if (!append && state.products.length === 0 && locationId === 'all') {
          state.products = items;
        }

        // 영역별 캐시 업데이트 (append 시에는 이어 붙임)
        const existing = state.locationProducts[locationId] || [];
        state.locationProducts[locationId] = append ? [...existing, ...items] : items;
        state.locationProductsMeta[locationId] = { nextCursor, hasMore };
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
        // 추가 제품 슬롯에 연결되어 있었다면 해제 (saga 없이 reducer 동기 업데이트는 불가하므로, UI/호출 측에서 별도 디스패치 권장)
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
        // 추가 제품 슬롯에 연결되어 있었다면 해제 (동기 reducer에서는 다른 슬라이스 액션 디스패치 불가)
      })
      .addCase(markProductAsConsumedAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // 소진 처리된 제품 조회 액션 처리 (커서 페이지네이션)
      .addCase(fetchConsumedProducts.pending, (state, action) => {
        const isObj = typeof action.meta.arg === 'object' && action.meta.arg !== null;
        const append = isObj ? !!action.meta.arg.append : false;
        if (append) {
          state.consumedLoadingMore = true;
        } else {
          state.consumedStatus = 'loading';
        }
      })
      .addCase(fetchConsumedProducts.fulfilled, (state, action) => {
        const payload = action.payload || {};
        const { items = [], nextCursor = null, hasMore = false, append = false, sort = '-consumed' } = payload;
        if (append) {
          state.consumedLoadingMore = false;
          state.consumedProducts = [...state.consumedProducts, ...items];
        } else {
          state.consumedStatus = 'succeeded';
          state.consumedProducts = items;
        }
        state.consumedMeta = { nextCursor, hasMore, sort };
      })
      .addCase(fetchConsumedProducts.rejected, (state, action) => {
        const isObj = typeof action.meta.arg === 'object' && action.meta.arg !== null;
        const append = isObj ? !!action.meta.arg.append : false;
        if (append) {
          state.consumedLoadingMore = false;
        } else {
          state.consumedStatus = 'failed';
          state.error = action.payload;
        }
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

export const { clearCurrentProduct, clearError, patchProductById, upsertActiveProduct, removeConsumedProductById } = productsSlice.actions;

export default productsSlice.reducer; 