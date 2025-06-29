import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  fetchLocationsApi, 
  fetchLocationByIdApi, 
  addLocationApi, 
  updateLocationApi, 
  deleteLocationApi,
  fetchProductsByLocationApi
} from '../../api/productsApi';

// 비동기 액션 생성
export const fetchLocations = createAsyncThunk(
  'locations/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchLocationsApi();
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchLocationById = createAsyncThunk(
  'locations/fetchLocationById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetchLocationByIdApi(id);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addLocation = createAsyncThunk(
  'locations/addLocation',
  async (location, { rejectWithValue }) => {
    try {
      const response = await addLocationApi(location);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateLocation = createAsyncThunk(
  'locations/updateLocation',
  async (location, { rejectWithValue }) => {
    try {
      const response = await updateLocationApi(location);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteLocation = createAsyncThunk(
  'locations/deleteLocation',
  async (id, { rejectWithValue }) => {
    try {
      await deleteLocationApi(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchProductsByLocation = createAsyncThunk(
  'locations/fetchProductsByLocation',
  async (locationId, { rejectWithValue }) => {
    try {
      const response = await fetchProductsByLocationApi(locationId);
      return { locationId, products: response };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  locations: [],
  currentLocation: null,
  locationProducts: {},
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

export const locationsSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    clearCurrentLocation: (state) => {
      state.currentLocation = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchLocations 처리
      .addCase(fetchLocations.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.locations = action.payload;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // fetchLocationById 처리
      .addCase(fetchLocationById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchLocationById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentLocation = action.payload;
      })
      .addCase(fetchLocationById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // addLocation 처리
      .addCase(addLocation.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addLocation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.locations.push(action.payload);
      })
      .addCase(addLocation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // updateLocation 처리
      .addCase(updateLocation.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateLocation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.locations.findIndex(location => location.id === action.payload.id);
        if (index !== -1) {
          state.locations[index] = action.payload;
        }
        state.currentLocation = action.payload;
      })
      .addCase(updateLocation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // deleteLocation 처리
      .addCase(deleteLocation.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.locations = state.locations.filter(location => location.id !== action.payload);
        if (state.currentLocation && state.currentLocation.id === action.payload) {
          state.currentLocation = null;
        }
      })
      .addCase(deleteLocation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // fetchProductsByLocation 처리
      .addCase(fetchProductsByLocation.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProductsByLocation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.locationProducts[action.payload.locationId] = action.payload.products;
      })
      .addCase(fetchProductsByLocation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearCurrentLocation, clearError } = locationsSlice.actions;

export default locationsSlice.reducer; 