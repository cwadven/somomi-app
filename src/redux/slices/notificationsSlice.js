import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 

  scheduleProductExpiryNotification, 
  scheduleLocationNotification,
  cancelNotification 
} from '../../utils/notificationUtils';
import { loadData, saveData, STORAGE_KEYS } from '../../utils/storageUtils';
import { ENTITY_TYPES } from '../../api/syncApi';
import { commitCreate, commitUpdate, commitDelete } from '../../utils/syncHelpers';

// 샘플 데이터 - 실제 구현 시 API 연동 필요
const initialSampleNotifications = [];

// 메모리 내 데이터 (AsyncStorage에서 로드될 예정)
let sampleNotifications = [...initialSampleNotifications];

// 알림 초기화 함수
export const initializeNotificationsData = async () => {
  try {
    const storedNotifications = await loadData(STORAGE_KEYS.NOTIFICATIONS);
    if (storedNotifications) {
      sampleNotifications = storedNotifications;
    } else {
      await saveData(STORAGE_KEYS.NOTIFICATIONS, initialSampleNotifications);
    }
    return true;
  } catch (error) {
    console.error('알림 데이터 초기화 중 오류 발생:', error);
    return false;
  }
};

// 알림 조회 API
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (_, { rejectWithValue }) => {
    try {
      // AsyncStorage에서 알림 데이터 로드
      const storedNotifications = await loadData(STORAGE_KEYS.NOTIFICATIONS);
      if (storedNotifications) {
        sampleNotifications = storedNotifications;
      }
      return sampleNotifications.filter(n => n?.syncStatus !== 'deleted');
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
      // AsyncStorage에서 알림 데이터 로드
      const storedNotifications = await loadData(STORAGE_KEYS.NOTIFICATIONS);
      if (storedNotifications) {
        sampleNotifications = storedNotifications;
      }
      
      // 해당 제품의 알림만 필터링
      const productNotifications = sampleNotifications.filter(
        notification => notification.type === 'product' && notification.targetId === productId
      );
      
      return productNotifications;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 카테고리별 알림 조회 API
export const fetchLocationNotifications = createAsyncThunk(
  'notifications/fetchLocationNotifications',
  async (locationId, { rejectWithValue }) => {
    try {
      // AsyncStorage에서 알림 데이터 로드
      const storedNotifications = await loadData(STORAGE_KEYS.NOTIFICATIONS);
      if (storedNotifications) {
        sampleNotifications = storedNotifications;
      }
      
      // 해당 카테고리의 알림만 필터링
      const locationNotifications = sampleNotifications.filter(
        notification => notification.type === 'location' && notification.targetId === locationId
      );
      
      return locationNotifications;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 알림 추가 API
export const addNotification = createAsyncThunk(
  'notifications/addNotification',
  async (notificationData, { rejectWithValue }) => {
    try {
      // AsyncStorage에서 알림 데이터 로드
      const storedNotifications = await loadData(STORAGE_KEYS.NOTIFICATIONS);
      if (storedNotifications) {
        sampleNotifications = storedNotifications;
      }
      
      // 알림 데이터 준비
      const { type, targetId, notifyType, daysBeforeTarget, notifyDate, title, message } = notificationData;
      
      // 알림 ID (임시)
      const notificationId = `notification_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // 제품 알림인 경우
      if (type === 'product' && notifyType === 'expiry') {
        // 제품 정보 가져오기 (실제로는 API 호출)
        const productName = '제품명'; // 임시 데이터
        const expiryDate = new Date(); // 임시 데이터, 실제로는 제품의 유통기한
        expiryDate.setDate(expiryDate.getDate() + 30); // 30일 후로 설정 (임시)
        
        // 제품 알림 스케줄링
        await scheduleProductExpiryNotification(
          targetId,
          productName,
          expiryDate,
          daysBeforeTarget
        );
      }
      
      // 위치 알림인 경우
      if (type === 'location') {
        // 위치 정보 가져오기 (실제로는 API 호출)
        const locationName = '위치명'; // 임시 데이터
        
        // 위치 알림 스케줄링
        await scheduleLocationNotification(
          targetId,
          locationName,
          message || `${locationName}에 대한 알림입니다.`,
          notifyDate
        );
      }
      
      // 새 알림 생성
      const newNotification = {
        id: notificationId,
        ...notificationData,
        createdAt: new Date().toISOString(),
        // SyncMeta 기본값
        localId: notificationId,
        remoteId: undefined,
        syncStatus: 'dirty',
        updatedAt: new Date().toISOString(),
        lastSyncedAt: undefined,
        version: undefined,
        deviceId: null,
        ownerUserId: undefined,
        deletedAt: undefined,
      };

      // 동기화 큐 적재
      try {
        await commitCreate(ENTITY_TYPES.NOTIFICATION, newNotification, {});
      } catch (e) {}
      
      // 메모리 및 AsyncStorage에 저장
      const updatedNotifications = [...sampleNotifications, newNotification];
      sampleNotifications = updatedNotifications;
      await saveData(STORAGE_KEYS.NOTIFICATIONS, updatedNotifications);
      
      return newNotification;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 알림 수정 API
export const updateNotification = createAsyncThunk(
  'notifications/updateNotification',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      // AsyncStorage에서 알림 데이터 로드
      const storedNotifications = await loadData(STORAGE_KEYS.NOTIFICATIONS);
      if (storedNotifications) {
        sampleNotifications = storedNotifications;
      }
      
      // 해당 알림 찾기
      const index = sampleNotifications.findIndex(notification => notification.id === id);
      if (index === -1) {
        return rejectWithValue('알림을 찾을 수 없습니다.');
      }
      
      // 알림 업데이트
      const updatedNotification = {
        ...sampleNotifications[index],
        ...data,
        updatedAt: new Date().toISOString()
      };

      // 동기화 큐 적재
      try {
        await commitUpdate(ENTITY_TYPES.NOTIFICATION, updatedNotification, {});
      } catch (e) {}
      
      // 메모리 및 AsyncStorage에 저장
      const updatedNotifications = [
        ...sampleNotifications.slice(0, index),
        updatedNotification,
        ...sampleNotifications.slice(index + 1)
      ];
      sampleNotifications = updatedNotifications;
      await saveData(STORAGE_KEYS.NOTIFICATIONS, updatedNotifications);
      
      return updatedNotification;
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
      // AsyncStorage에서 알림 데이터 로드
      const storedNotifications = await loadData(STORAGE_KEYS.NOTIFICATIONS);
      if (storedNotifications) {
        sampleNotifications = storedNotifications;
      }
      
      // 알림 취소
      await cancelNotification(id);
      
      // tombstone 적용
      const tomb = { id, localId: id, syncStatus: 'deleted', deletedAt: new Date().toISOString() };
      // 동기화 큐 적재
      try {
        await commitDelete(ENTITY_TYPES.NOTIFICATION, tomb, {});
      } catch (e) {}
      const updatedNotifications = sampleNotifications.map(n => n.id === id ? { ...n, ...tomb } : n);
      sampleNotifications = updatedNotifications;
      await saveData(STORAGE_KEYS.NOTIFICATIONS, updatedNotifications);
      
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 카테고리의 기본 알림 설정 적용
export const applyLocationNotifications = createAsyncThunk(
  'notifications/applyLocationNotifications',
  async ({ locationId, applyToExisting }, { rejectWithValue, getState }) => {
    try {
      // AsyncStorage에서 알림 데이터 로드
      const storedNotifications = await loadData(STORAGE_KEYS.NOTIFICATIONS);
      if (storedNotifications) {
        sampleNotifications = storedNotifications;
      }
      
      // 카테고리의 기본 알림 설정 가져오기
      const locationNotifications = sampleNotifications.filter(
        n => n.type === 'location' && n.targetId === locationId
      );
      
      if (locationNotifications.length === 0) {
        return rejectWithValue('카테고리의 기본 알림 설정이 없습니다.');
      }
      
      // 해당 카테고리에 속한 제품 목록 가져오기
      const { products } = getState().products;
      const locationProducts = products.filter(p => p.locationId === locationId);
      
      if (locationProducts.length === 0) {
        return [];
      }
      
      // 각 제품에 카테고리 알림 설정 적용
      const newNotifications = [];
      
      for (const product of locationProducts) {
        // 기존 제품 알림 취소 (applyToExisting이 true인 경우)
        if (applyToExisting) {
          const existingProductNotifications = sampleNotifications.filter(
            n => n.type === 'product' && n.targetId === product.id
          );
          
          // 기존 알림 취소
          for (const notification of existingProductNotifications) {
            try {
              // 카테고리 알림 무시 설정이 활성화된 제품은 건너뜀
              if (notification.ignoreLocationNotification) {
                continue;
              }
              
              await cancelNotification(notification.id);
              
              // 메모리에서 제거
              const index = sampleNotifications.findIndex(n => n.id === notification.id);
              if (index !== -1) {
                sampleNotifications.splice(index, 1);
              }
            } catch (cancelError) {
              console.error(`알림 취소 오류(ID: ${notification.id}):`, cancelError);
            }
          }
        } else {
          // applyToExisting이 false인 경우, 기존 알림이 있으면 건너뜀
          const existingProductNotifications = sampleNotifications.filter(
            n => n.type === 'product' && n.targetId === product.id
          );
          
          // 카테고리 알림 무시 설정이 활성화된 제품은 건너뜀
          const hasIgnoreLocationSetting = existingProductNotifications.some(
            n => n.ignoreLocationNotification
          );
          
          if (hasIgnoreLocationSetting || existingProductNotifications.length > 0) {
            continue;
          }
        }
        
        // 카테고리 알림 설정을 제품에 적용
        for (const locationNotification of locationNotifications) {
          // AI 알림은 제품별로 적용하지 않음
          if (locationNotification.notifyType === 'ai') {
            continue;
          }
          
          // 알림 ID 생성
          const notificationId = `notification_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
          
          // 알림 타입에 따라 다르게 처리
          if (locationNotification.notifyType === 'expiry') {
            // 유통기한 알림
            if (product.expiryDate) {
              const expiryDate = new Date(product.expiryDate);
              
              // 알림 예약
              try {
                // daysBeforeTarget 값 확인
                if (locationNotification.daysBeforeTarget === null || 
                    locationNotification.daysBeforeTarget === undefined || 
                    isNaN(locationNotification.daysBeforeTarget)) {
                  continue; // 알림 생성하지 않고 건너뜀
                }
                
                const daysBeforeTarget = locationNotification.daysBeforeTarget;
                const title = `${product.name} 유통기한 알림`;
                const message = daysBeforeTarget === 0
                  ? `${product.name}의 유통기한이 오늘까지입니다.`
                  : `${product.name}의 유통기한이 ${daysBeforeTarget}일 남았습니다.`;
                
                // 알림 스케줄링
                if (locationNotification.isActive) {
                  await scheduleProductExpiryNotification(
                    product.id,
                    product.name,
                    expiryDate,
                    daysBeforeTarget
                  );
                }
                
                // 새 알림 생성
                const newNotification = {
                  id: notificationId,
                  type: 'product',
                  targetId: product.id,
                  notifyType: 'expiry',
                  title: title,
                  message: message,
                  daysBeforeTarget: daysBeforeTarget,
                  isActive: locationNotification.isActive,
                  isRepeating: locationNotification.isRepeating || false, // 연속 알림 설정 복사
                  ignoreLocationNotification: false, // 기본값은 false
                  createdAt: new Date().toISOString()
                };
                
                // 메모리에 추가
                sampleNotifications.push(newNotification);
                newNotifications.push(newNotification);
              } catch (error) {
                console.error(`유통기한 알림 생성 오류(제품: ${product.id}):`, error);
              }
            }
          } else if (locationNotification.notifyType === 'estimated') {
            // 소진예상 알림
            if (product.estimatedEndDate) {
              const estimatedEndDate = new Date(product.estimatedEndDate);
              
              // 알림 예약
              try {
                // daysBeforeTarget 값 확인
                if (locationNotification.daysBeforeTarget === null || 
                    locationNotification.daysBeforeTarget === undefined || 
                    isNaN(locationNotification.daysBeforeTarget)) {
                  continue; // 알림 생성하지 않고 건너뜀
                }
                
                const daysBeforeTarget = locationNotification.daysBeforeTarget;
                const title = `${product.name} 소진예상 알림`;
                const message = daysBeforeTarget === 0
                  ? `${product.name}이(가) 오늘 소진될 예정입니다.`
                  : `${product.name}이(가) ${daysBeforeTarget}일 후에 소진될 예정입니다.`;
                
                // 알림 스케줄링
                if (locationNotification.isActive) {
                  await scheduleProductExpiryNotification(
                    product.id,
                    product.name,
                    estimatedEndDate,
                    daysBeforeTarget
                  );
                }
                
                // 새 알림 생성
                const newNotification = {
                  id: notificationId,
                  type: 'product',
                  targetId: product.id,
                  notifyType: 'estimated',
                  title: title,
                  message: message,
                  daysBeforeTarget: daysBeforeTarget,
                  isActive: locationNotification.isActive,
                  isRepeating: locationNotification.isRepeating || false, // 연속 알림 설정 복사
                  ignoreLocationNotification: false, // 기본값은 false
                  createdAt: new Date().toISOString()
                };
                
                // 메모리에 추가
                sampleNotifications.push(newNotification);
                newNotifications.push(newNotification);
              } catch (error) {
                console.error(`소진예상 알림 생성 오류(제품: ${product.id}):`, error);
              }
            }
          }
        }
      }
      
      // AsyncStorage에 저장
      await saveData(STORAGE_KEYS.NOTIFICATIONS, sampleNotifications);
      
      return newNotifications;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  notifications: [],
  currentNotifications: [], // 현재 선택된 제품/카테고리의 알림 목록
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