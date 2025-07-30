import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// 영역 목록 가져오기
export const fetchLocations = createAsyncThunk(
  'locations/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      // 실제 구현에서는 API 호출
      // 여기서는 임시 데이터 반환
      const mockLocations = [
        {
          id: 'loc_1',
          title: '내 집',
          description: '우리 집 냉장고',
          icon: 'home-outline',
          templateInstanceId: 'template_instance_1', // 사용된 템플릿 인스턴스 ID
          productId: 'basic_location', // 템플릿 제품 ID
          feature: { baseSlots: 5 } // 템플릿 기능
        },
        {
          id: 'loc_2',
          title: '회사',
          description: '사무실 냉장고',
          icon: 'business-outline',
          templateInstanceId: 'template_instance_2', // 사용된 템플릿 인스턴스 ID
          productId: 'basic_location', // 템플릿 제품 ID
          feature: { baseSlots: 5 } // 템플릿 기능
        }
      ];
      
      return mockLocations;
    } catch (error) {
      return rejectWithValue(error.message);
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
  async (locationData, { rejectWithValue }) => {
    try {
      // 실제 구현에서는 API 호출
      // 여기서는 임시 ID 생성 후 반환
      const newLocation = {
        ...locationData,
        id: `loc_${Date.now()}`,
        // templateInstanceId, productId, feature는 locationData에서 전달받음
      };
      
      return newLocation;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 영역 수정
export const updateLocation = createAsyncThunk(
  'locations/updateLocation',
  async (locationData, { rejectWithValue }) => {
    try {
      // 실제 구현에서는 API 호출
      // 여기서는 수정된 데이터 그대로 반환
      return locationData;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 영역 삭제
export const deleteLocation = createAsyncThunk(
  'locations/deleteLocation',
  async (locationId, { rejectWithValue }) => {
    try {
      // 실제 구현에서는 API 호출
      // 여기서는 삭제할 ID 반환
      return locationId;
    } catch (error) {
      return rejectWithValue(error.message);
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
  }
});

export const { 
  clearCurrentLocation,
  createLocationSuccess,
  updateLocationSuccess,
  deleteLocationSuccess
} = locationsSlice.actions;

export default locationsSlice.reducer; 