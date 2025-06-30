import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// 샘플 데이터 - 실제 구현 시 API 연동 필요
let sampleNotifications = [
  {
    id: '1',
    type: 'product', // 'product' 또는 'location'
    targetId: '1', // 제품 ID 또는 영역 ID
    title: '바디워시 유통기한 임박',
    message: '바디워시의 유통기한이 3일 남았습니다.',
    notifyDate: '2023-07-12T09:00:00', // 알림 예정 시간
    notifyType: 'expiry', // 'expiry' (유통기한), 'estimated' (소진 예상), 'ai' (AI 알림)
    daysBeforeTarget: 3, // 목표일 기준 며칠 전 알림
    isActive: true,
    isRepeating: false, // 연속 알림 여부 (D-day까지 매일 알림)
  },
  {
    id: '2',
    type: 'product',
    targetId: '2',
    title: '세탁세제 소진 예상',
    message: '세탁세제가 곧 소진될 예정입니다.',
    notifyDate: '2023-06-25T10:00:00',
    notifyType: 'estimated',
    daysBeforeTarget: 5,
    isActive: true,
    isRepeating: false,
  },
  {
    id: '3',
    type: 'location',
    targetId: '1',
    title: '주방 영역 기본 알림 설정',
    message: '주방 영역의 기본 알림 설정입니다.',
    notifyType: 'expiry',
    daysBeforeTarget: 7,
    isActive: true,
    isRepeating: false,
  }
];

// 알림 조회 API
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (_, { rejectWithValue }) => {
    try {
      // 실제 API 호출로 대체 필요
      return [...sampleNotifications];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 제품별 알림 조회 API
export const fetchProductNotifications = createAsyncThunk(
  'notifications/fetchProductNotifications',
  async (productId, { rejectWithValue }) => {
    try {
      // 실제 API 호출로 대체 필요
      const notifications = sampleNotifications.filter(
        notification => notification.type === 'product' && notification.targetId === productId
      );
      return notifications;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 영역별 알림 조회 API
export const fetchLocationNotifications = createAsyncThunk(
  'notifications/fetchLocationNotifications',
  async (locationId, { rejectWithValue }) => {
    try {
      // 실제 API 호출로 대체 필요
      const notifications = sampleNotifications.filter(
        notification => notification.type === 'location' && notification.targetId === locationId
      );
      return notifications;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 알림 추가 API
export const addNotification = createAsyncThunk(
  'notifications/addNotification',
  async (notification, { rejectWithValue }) => {
    try {
      // 실제 API 호출로 대체 필요
      const newId = (Math.max(...sampleNotifications.map(n => parseInt(n.id))) + 1).toString();
      const newNotification = {
        ...notification,
        id: newId,
        createdAt: new Date().toISOString(),
      };
      
      // 타입별 알림 개수 제한 확인
      const existingNotifications = sampleNotifications.filter(
        n => n.type === notification.type && n.targetId === notification.targetId
      );
      
      if (notification.type === 'product' && existingNotifications.length >= 3) {
        return rejectWithValue('제품당 최대 3개의 알림만 설정할 수 있습니다.');
      }
      
      sampleNotifications.push(newNotification);
      return newNotification;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 알림 수정 API
export const updateNotification = createAsyncThunk(
  'notifications/updateNotification',
  async (notification, { rejectWithValue }) => {
    try {
      // 실제 API 호출로 대체 필요
      const index = sampleNotifications.findIndex(n => n.id === notification.id);
      if (index === -1) {
        return rejectWithValue('알림을 찾을 수 없습니다.');
      }
      
      sampleNotifications[index] = {
        ...sampleNotifications[index],
        ...notification,
        updatedAt: new Date().toISOString(),
      };
      
      return sampleNotifications[index];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 알림 삭제 API
export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (id, { rejectWithValue }) => {
    try {
      // 실제 API 호출로 대체 필요
      const index = sampleNotifications.findIndex(n => n.id === id);
      if (index === -1) {
        return rejectWithValue('알림을 찾을 수 없습니다.');
      }
      
      sampleNotifications = sampleNotifications.filter(n => n.id !== id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 영역의 기본 알림 설정 적용
export const applyLocationNotifications = createAsyncThunk(
  'notifications/applyLocationNotifications',
  async ({ locationId, applyToExisting }, { rejectWithValue, getState }) => {
    try {
      // 영역의 기본 알림 설정 가져오기
      const locationNotifications = sampleNotifications.filter(
        n => n.type === 'location' && n.targetId === locationId
      );
      
      if (locationNotifications.length === 0) {
        return rejectWithValue('영역의 기본 알림 설정이 없습니다.');
      }
      
      // 해당 영역에 속한 제품 목록 가져오기
      const { products } = getState().products;
      const locationProducts = products.filter(p => p.locationId === locationId);
      
      // 각 제품에 영역 알림 설정 적용
      const newNotifications = [];
      
      for (const product of locationProducts) {
        // 기존 제품 알림 필터링 (applyToExisting이 false인 경우 기존 알림 유지)
        if (!applyToExisting) {
          const existingProductNotifications = sampleNotifications.filter(
            n => n.type === 'product' && n.targetId === product.id
          );
          
          if (existingProductNotifications.length > 0) {
            continue;
          }
        }
        
        // 영역 알림 설정을 제품에 적용
        for (const locationNotification of locationNotifications) {
          const newId = (Math.max(...sampleNotifications.map(n => parseInt(n.id))) + 1).toString();
          const newNotification = {
            id: newId,
            type: 'product',
            targetId: product.id,
            title: `${product.name} ${locationNotification.notifyType === 'expiry' ? '유통기한' : '소진 예상'} 알림`,
            message: `${product.name}의 ${locationNotification.notifyType === 'expiry' ? '유통기한' : '소진 예상일'}이 ${locationNotification.daysBeforeTarget}일 남았습니다.`,
            notifyType: locationNotification.notifyType,
            daysBeforeTarget: locationNotification.daysBeforeTarget,
            isActive: locationNotification.isActive,
            isRepeating: locationNotification.isRepeating,
            createdAt: new Date().toISOString(),
          };
          
          sampleNotifications.push(newNotification);
          newNotifications.push(newNotification);
        }
      }
      
      return newNotifications;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  notifications: [],
  currentNotifications: [], // 현재 선택된 제품/영역의 알림 목록
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

export const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearCurrentNotifications: (state) => {
      state.currentNotifications = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchNotifications 처리
      .addCase(fetchNotifications.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.notifications = action.payload;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // fetchProductNotifications 처리
      .addCase(fetchProductNotifications.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProductNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentNotifications = action.payload;
      })
      .addCase(fetchProductNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // fetchLocationNotifications 처리
      .addCase(fetchLocationNotifications.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchLocationNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentNotifications = action.payload;
      })
      .addCase(fetchLocationNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // addNotification 처리
      .addCase(addNotification.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addNotification.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.notifications.push(action.payload);
        state.currentNotifications.push(action.payload);
      })
      .addCase(addNotification.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // updateNotification 처리
      .addCase(updateNotification.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateNotification.fulfilled, (state, action) => {
        state.status = 'succeeded';
        
        // 전체 알림 목록 업데이트
        const index = state.notifications.findIndex(n => n.id === action.payload.id);
        if (index !== -1) {
          state.notifications[index] = action.payload;
        }
        
        // 현재 알림 목록 업데이트
        const currentIndex = state.currentNotifications.findIndex(n => n.id === action.payload.id);
        if (currentIndex !== -1) {
          state.currentNotifications[currentIndex] = action.payload;
        }
      })
      .addCase(updateNotification.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // deleteNotification 처리
      .addCase(deleteNotification.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.notifications = state.notifications.filter(n => n.id !== action.payload);
        state.currentNotifications = state.currentNotifications.filter(n => n.id !== action.payload);
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // applyLocationNotifications 처리
      .addCase(applyLocationNotifications.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(applyLocationNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.notifications = [...state.notifications, ...action.payload];
      })
      .addCase(applyLocationNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearCurrentNotifications, clearError } = notificationsSlice.actions;

export default notificationsSlice.reducer; 