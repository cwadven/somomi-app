import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { saveLocations, loadLocations } from '../../utils/storageUtils';
import { refreshAfterMutation } from '../../utils/dataRefresh';
import { ENTITY_TYPES } from '../../api/syncApi';
import { commitCreate, commitUpdate, commitDelete } from '../../utils/syncHelpers';
import { createGuestSection, updateGuestSection, deleteGuestSection, fetchGuestSections } from '../../api/sectionApi';

// 영역 목록 가져오기
export const fetchLocations = createAsyncThunk(
  'locations/fetchLocations',
  async (_, { rejectWithValue, getState }) => {
    try {
      console.log('fetchLocations 시작');

      const state = getState();
      const isLoggedIn = !!state?.auth?.isLoggedIn;

      // 로그인 상태에서만 서버 동기화 수행
      if (isLoggedIn) {
        try {
          const res = await fetchGuestSections();
          const items = Array.isArray(res?.guest_sections) ? res.guest_sections : [];
          if (items.length >= 0) {
            const mapped = items.map((it) => ({
              id: String(it.id),
              title: it.title,
              description: it.description || '',
              icon: it.icon || 'cube-outline',
              templateInstanceId: it.guest_section_template_id ? String(it.guest_section_template_id) : null,
              feature: {
                baseSlots: typeof it?.feature?.base_slots === 'number' ? it.feature.base_slots : 0,
                connectedProductSlotTemplates: Array.isArray(it?.feature?.connected_guest_inventory_item_templates)
                  ? it.feature.connected_guest_inventory_item_templates.map(ct => ({
                      id: String(ct.id),
                      usedByProductId: ct.used_in_guest_inventory_item_id != null ? String(ct.used_in_guest_inventory_item_id) : null,
                      expiresAt: ct.expires_at || null,
                    }))
                  : []
              },
              disabled: !!it.disabled,
              createdAt: it.created_at || new Date().toISOString(),
              updatedAt: it.updated_at || new Date().toISOString(),
            }));
            // 서버 목록과 로컬 저장 목록을 병합하여 만료 상태 등으로 서버에서 누락된 항목도 표시되도록 유지
            let merged = mapped;
            try {
              const stored = await loadLocations();
              if (Array.isArray(stored) && stored.length > 0) {
                const seen = new Set(mapped.map(x => String(x.id)));
                const onlyLocal = stored.filter(x => !seen.has(String(x.id)));
                merged = [...mapped, ...onlyLocal];
              }
            } catch (_) {}
            await saveLocations(merged);
            return merged;
          }
        } catch (apiErr) {
          console.warn('게스트 섹션 API 실패, 로컬 폴백 사용:', apiErr?.message || String(apiErr));
        }
      }

      // 로컬 폴백
      const storedLocations = await loadLocations();
      return storedLocations || [];
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
      console.log('createLocation 시작:', locationData);

      // 서버 API: Create guest section
      const payload = {
        title: locationData.title,
        description: locationData.description || null,
        icon: locationData.icon || null,
        guest_section_template_id: Number(locationData.templateInstanceId || locationData.templateInstanceLocalId),
      };
      const res = await createGuestSection(payload);
      const createdId = res?.guest_section_id;
      if (!createdId) throw new Error('영역 생성에 실패했습니다.');

      // 생성 후 목록 재동기화(GET)
      try {
        const listRes = await fetchGuestSections();
        const items = Array.isArray(listRes?.guest_sections) ? listRes.guest_sections : [];
        const mapped = items.map((it) => ({
          id: String(it.id),
          title: it.title,
          description: it.description || '',
          icon: it.icon || 'cube-outline',
          templateInstanceId: it.guest_section_template_id ? String(it.guest_section_template_id) : null,
          feature: {
            baseSlots: typeof it?.feature?.base_slots === 'number' ? it.feature.base_slots : 0,
            connectedProductSlotTemplates: Array.isArray(it?.feature?.connected_guest_inventory_item_templates)
              ? it.feature.connected_guest_inventory_item_templates.map(ct => ({
                  id: String(ct.id),
                  usedByProductId: ct.used_in_guest_inventory_item_id != null ? String(ct.used_in_guest_inventory_item_id) : null,
                  expiresAt: ct.expires_at || null,
                }))
              : []
          },
          disabled: !!it.disabled,
          createdAt: it.created_at || new Date().toISOString(),
          updatedAt: it.updated_at || new Date().toISOString(),
        }));
        await saveLocations(mapped);
        return mapped.find(x => x.id === String(createdId)) || mapped[0] || null;
      } catch (e) {
        console.warn('생성 후 목록 동기화 실패:', e?.message || String(e));
        // 폴백: 로컬 목록 반환
        const stored = await loadLocations();
        return (stored || []).find(x => x.id === String(createdId)) || null;
      }
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
      // 서버 API: Update guest section
      const sectionId = locationData.id || locationData.localId;
      const payload = {
        title: locationData.title,
        description: locationData.description || null,
        icon: locationData.icon || null,
        guest_section_template_id: Number(locationData.templateInstanceId || locationData.templateInstanceLocalId),
      };
      await updateGuestSection(sectionId, payload);

      // 수정 후 목록 재동기화
      try {
        const listRes = await fetchGuestSections();
        const items = Array.isArray(listRes?.guest_sections) ? listRes.guest_sections : [];
        const mapped = items.map((it) => ({
          id: String(it.id),
          title: it.title,
          description: it.description || '',
          icon: it.icon || 'cube-outline',
          templateInstanceId: it.guest_section_template_id ? String(it.guest_section_template_id) : null,
          feature: {
            baseSlots: typeof it?.feature?.base_slots === 'number' ? it.feature.base_slots : 0,
            connectedProductSlotTemplates: Array.isArray(it?.feature?.connected_guest_inventory_item_templates)
              ? it.feature.connected_guest_inventory_item_templates.map(ct => ({
                  id: String(ct.id),
                  usedByProductId: ct.used_in_guest_inventory_item_id != null ? String(ct.used_in_guest_inventory_item_id) : null,
                  expiresAt: ct.expires_at || null,
                }))
              : []
          },
          disabled: !!it.disabled,
          createdAt: it.created_at || new Date().toISOString(),
          updatedAt: it.updated_at || new Date().toISOString(),
        }));
        await saveLocations(mapped);
        return mapped.find(x => x.id === String(sectionId)) || null;
      } catch (e) {
        console.warn('수정 후 목록 동기화 실패:', e?.message || String(e));
        const stored = await loadLocations();
        return (stored || []).find(x => x.id === String(sectionId)) || null;
      }
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
      // 서버 API: Delete guest section
      await deleteGuestSection(locationId);

      // 삭제 후 목록 재동기화
      try {
        const listRes = await fetchGuestSections();
        const items = Array.isArray(listRes?.guest_sections) ? listRes.guest_sections : [];
        const mapped = items.map((it) => ({
          id: String(it.id),
          title: it.title,
          description: it.description || '',
          icon: it.icon || 'cube-outline',
          templateInstanceId: it.guest_section_template_id ? String(it.guest_section_template_id) : null,
          feature: {
            baseSlots: typeof it?.feature?.base_slots === 'number' ? it.feature.base_slots : 0,
            connectedProductSlotTemplates: Array.isArray(it?.feature?.connected_guest_inventory_item_templates)
              ? it.feature.connected_guest_inventory_item_templates.map(ct => ({
                  id: String(ct.id),
                  usedByProductId: ct.used_in_guest_inventory_item_id != null ? String(ct.used_in_guest_inventory_item_id) : null,
                }))
              : []
          },
          disabled: !!it.disabled,
          createdAt: it.created_at || new Date().toISOString(),
          updatedAt: it.updated_at || new Date().toISOString(),
        }));
        await saveLocations(mapped);
        return locationId;
      } catch (e) {
        console.warn('삭제 후 목록 동기화 실패:', e?.message || String(e));
        // 폴백: 로컬 목록에서 제거
        const updated = (await loadLocations() || []).filter(x => x.id !== locationId);
        await saveLocations(updated);
        return locationId;
      }
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