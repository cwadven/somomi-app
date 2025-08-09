import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { saveLocations, loadLocations } from '../../utils/storageUtils';

// 영역 목록 가져오기
export const fetchLocations = createAsyncThunk(
  'locations/fetchLocations',
  async (_, { rejectWithValue, getState }) => {
    try {
      console.log('fetchLocations 시작');
      
      // 현재 상태에서 영역 목록 가져오기
      const currentLocations = getState().locations.locations;
      console.log('현재 저장된 영역 목록:', currentLocations);
      
      // 영역 목록이 비어있으면 AsyncStorage에서 로드
      if (currentLocations.length === 0) {
        const storedLocations = await loadLocations();
        console.log('AsyncStorage에서 로드한 영역 목록:', storedLocations);
        return storedLocations;
      }
      
      // 이미 영역 목록이 있으면 그대로 반환
      return currentLocations;
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
      const newLocation = {
        ...locationData,
        id: `loc_${Date.now()}`,
        // templateInstanceId, productId, feature는 locationData에서 전달받음
        disabled: false,
      };
      
      console.log('생성된 영역:', newLocation);
      
      // 새 영역이 생성된 후 전체 영역 목록을 AsyncStorage에 저장
      const updatedLocations = [...getState().locations.locations, newLocation];
      await saveLocations(updatedLocations);
      
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
  async (locationData, { rejectWithValue, getState }) => {
    try {
      // 실제 구현에서는 API 호출
      // 여기서는 수정된 데이터 그대로 반환
      
      // 영역 수정 후 전체 영역 목록을 AsyncStorage에 저장
      const updatedLocations = getState().locations.locations.map(location => 
        location.id === locationData.id ? locationData : location
      );
      await saveLocations(updatedLocations);
      
      return locationData;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 영역 삭제
export const deleteLocation = createAsyncThunk(
  'locations/deleteLocation',
  async (locationId, { rejectWithValue, getState }) => {
    try {
      // 실제 구현에서는 API 호출
      
      // 영역 삭제 후 전체 영역 목록을 AsyncStorage에 저장
      const updatedLocations = getState().locations.locations.filter(
        location => location.id !== locationId
      );
      await saveLocations(updatedLocations);
      
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