import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { saveLocations, loadLocations } from '../../utils/storageUtils';
import { refreshAfterMutation } from '../../utils/dataRefresh';
import { ENTITY_TYPES } from '../../api/syncApi';
import { commitCreate, commitUpdate, commitDelete } from '../../utils/syncHelpers';

// 영역 목록 가져오기
export const fetchLocations = createAsyncThunk(
  'locations/fetchLocations',
  async (_, { rejectWithValue, getState }) => {
    try {
      console.log('fetchLocations 시작');
      
      // 현재 상태에서 영역 목록 가져오기
      let currentLocations = getState().locations.locations;
      console.log('현재 저장된 영역 목록:', currentLocations);
      
      // 영역 목록이 비어있으면 AsyncStorage에서 로드
      if (currentLocations.length === 0) {
        const storedLocations = await loadLocations();
        const filtered = (storedLocations || []).filter(l => l?.syncStatus !== 'deleted');
        console.log('AsyncStorage에서 로드한 영역 목록:', filtered);
        return filtered;
      }
      
      // 이미 영역 목록이 있으면 그대로 반환
      return currentLocations.filter(l => l?.syncStatus !== 'deleted');
    } catch (error) {
      console.error('영역 목록 가져오기 오류:', error);
      return rejectWithValue(error.message || '영역 목록을 불러오는 중 오류가 발생했습니다.');
    }
  }
);

// 영역 상세 정보 가져오기
export const fetchLocationById = createAsyncThunk(
  'locations/fetchLocationById',
  async (locationId, { rejectWithValue, getState }) => {
    try {
      // 실제 구현에서는 API 호출
      // 여기서는 상태에서 영역 찾기
      const { locations } = getState().locations;
      const location = locations.find(loc => loc.id === locationId);
      
      if (!location) {
        throw new Error('영역을 찾을 수 없습니다.');
      }
      
      return location;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 영역 생성
export const createLocation = createAsyncThunk(
  'locations/createLocation',
  async (locationData, { rejectWithValue, getState, dispatch }) => {
    try {
      // 디버깅 로그
      console.log('createLocation 시작:', locationData);
      
      // 실제 구현에서는 API 호출
      // 여기서는 임시 ID 생성 후 반환
      const base = {
        ...locationData,
        id: `loc_${Date.now()}`,
        // 관계 필드(localId) 호환
        templateInstanceLocalId: locationData.templateInstanceLocalId || locationData.templateInstanceId,
        // templateInstanceId, productId, feature는 locationData에서 전달받음
        disabled: false,
        // SyncMeta 기본값 추가는 syncApi에서 수행
      };
      // sync 게이트웨이 적용
      const newLocation = await commitCreate(ENTITY_TYPES.LOCATION, { ...base, localId: base.id }, {
        deviceId: getState().auth?.deviceId,
        ownerUserId: getState().auth?.user?.id,
      });
      
      console.log('생성된 영역:', newLocation);
      
      // 새 영역이 생성된 후 전체 영역 목록을 AsyncStorage에 저장
      const updatedLocations = [...getState().locations.locations, newLocation];
      await saveLocations(updatedLocations);
      
      // 변경 직후 한 번 최신화(서버 도입 시 활성)
      try { await refreshAfterMutation(dispatch); } catch (e) {}
      return newLocation;
    } catch (error) {
      console.error('영역 생성 오류:', error);
      return rejectWithValue(error.message || '영역 생성 중 오류가 발생했습니다.');
    }
  }
);

// 영역 수정
export const updateLocation = createAsyncThunk(
  'locations/updateLocation',
  async (locationData, { rejectWithValue, getState, dispatch }) => {
    try {
      // 실제 구현에서는 API 호출
      // 여기서는 수정된 데이터 그대로 반환
      const enriched = await commitUpdate(ENTITY_TYPES.LOCATION, {
        ...locationData,
        templateInstanceLocalId: locationData.templateInstanceLocalId || locationData.templateInstanceId,
      }, {
        deviceId: getState().auth?.deviceId || locationData.deviceId || 'unknown',
        ownerUserId: getState().auth?.user?.id || locationData.ownerUserId,
      });
      
      // 영역 수정 후 전체 영역 목록을 AsyncStorage에 저장
      const updatedLocations = getState().locations.locations.map(location => 
        location.id === enriched.id ? enriched : location
      );
      await saveLocations(updatedLocations);
      
      try { await refreshAfterMutation(dispatch); } catch (e) {}
      return enriched;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 영역 삭제
export const deleteLocation = createAsyncThunk(
  'locations/deleteLocation',
  async (locationId, { rejectWithValue, getState, dispatch }) => {
    try {
      // sync 게이트웨이 적용 (tombstone는 상위에서 관리 가능)
      await commitDelete(ENTITY_TYPES.LOCATION, { id: locationId, localId: locationId }, {
        deviceId: getState().auth?.deviceId,
        ownerUserId: getState().auth?.user?.id,
      });
      
      // tombstone: 저장소에는 남기되 상태는 제거
      const nowIso = new Date().toISOString();
      const updatedLocations = getState().locations.locations.map(loc => {
        if (loc.id === locationId) {
          return { ...loc, syncStatus: 'deleted', deletedAt: nowIso };
        }
        return loc;
      });
      await saveLocations(updatedLocations);
      
      try { await refreshAfterMutation(dispatch); } catch (e) {}
      return locationId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 템플릿 미연동(usedInLocationId 없음)인 영역을 disabled=true로 동기화
export const reconcileLocationsDisabled = createAsyncThunk(
  'locations/reconcileLocationsDisabled',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const locations = state.locations.locations || [];
      const templates = state.auth.userLocationTemplateInstances || [];
      const updated = locations.map(loc => {
        const locKey = loc.localId || loc.id;
        const linked = templates.some(t => t.usedInLocationId === locKey);
        return { ...loc, disabled: !linked };
      });
      await saveLocations(updated);
      return updated;
    } catch (error) {
      return rejectWithValue(error.message || 'disabled 동기화 오류');
    }
  }
);

const initialState = {
  locations: [],
  currentLocation: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null
};

const locationsSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    clearCurrentLocation: (state) => {
      state.currentLocation = null;
    },
    resetLocationsState: (state) => {
      state.locations = [];
      state.currentLocation = null;
      state.status = 'idle';
      state.error = null;
      // 저장소도 비웁니다
      try { saveLocations([]); } catch (e) {}
    },
    // 영역 생성 성공 (템플릿 인스턴스 ID 포함)
    createLocationSuccess: (state, action) => {
      state.locations.push(action.payload);
      state.status = 'succeeded';
    },
    // 영역 수정 성공
    updateLocationSuccess: (state, action) => {
      const index = state.locations.findIndex(loc => loc.id === action.payload.id);
      if (index !== -1) {
        state.locations[index] = action.payload;
      }
      state.currentLocation = action.payload;
      state.status = 'succeeded';
    },
    // 영역 삭제 성공
    deleteLocationSuccess: (state, action) => {
      state.locations = state.locations.filter(location => location.id !== action.payload);
      state.currentLocation = null;
      state.status = 'succeeded';
    }
  },
  extraReducers: (builder) => {
    builder
      // 영역 목록 가져오기
      .addCase(fetchLocations.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.locations = action.payload;
        state.error = null;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // 영역 상세 정보 가져오기
      .addCase(fetchLocationById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchLocationById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentLocation = action.payload;
        state.error = null;
      })
      .addCase(fetchLocationById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // 영역 생성
      .addCase(createLocation.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.locations.push(action.payload);
        state.error = null;
      })
      .addCase(createLocation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // 영역 수정
      .addCase(updateLocation.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateLocation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.locations.findIndex(loc => loc.id === action.payload.id);
        if (index !== -1) {
          state.locations[index] = action.payload;
        }
        state.currentLocation = action.payload;
        state.error = null;
      })
      .addCase(updateLocation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // 영역 삭제
      .addCase(deleteLocation.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.locations = state.locations.filter(location => location.id !== action.payload);
        if (state.currentLocation && state.currentLocation.id === action.payload) {
          state.currentLocation = null;
        }
        state.error = null;
      })
      .addCase(deleteLocation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
      
      // disabled 동기화
      builder
        .addCase(reconcileLocationsDisabled.pending, (state) => {
          state.status = 'loading';
        })
        .addCase(reconcileLocationsDisabled.fulfilled, (state, action) => {
          state.status = 'succeeded';
          state.locations = action.payload;
          state.error = null;
        })
        .addCase(reconcileLocationsDisabled.rejected, (state, action) => {
          state.status = 'failed';
          state.error = action.payload;
        });
  }
});

export const { 
  clearCurrentLocation,
  resetLocationsState,
  createLocationSuccess,
  updateLocationSuccess,
  deleteLocationSuccess
} = locationsSlice.actions;

export default locationsSlice.reducer; 