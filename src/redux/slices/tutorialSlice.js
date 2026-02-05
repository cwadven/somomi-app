import { createSlice } from '@reduxjs/toolkit';

// Tutorial steps (strict flow)
export const TUTORIAL_STEPS = {
  PROFILE_INTRO: 'profile_intro', // show "start tutorial" message on Profile
  WAIT_LOCATIONS_TAB: 'wait_locations_tab', // user must tap "내 카테고리" tab
  WAIT_LOCATIONS_PLUS: 'wait_locations_plus', // user must tap + on Locations
  WAIT_TEMPLATE_TOP: 'wait_template_top', // user must select top valid template
  WAIT_CATEGORY_NAME: 'wait_category_name', // user must type category name
  WAIT_CATEGORY_SAVE: 'wait_category_save', // user must tap save
  WAIT_CREATED_LOCATION_CONGRATS: 'wait_created_location_congrats', // show congratulation after creating first category
  WAIT_CREATED_LOCATION_CLICK: 'wait_created_location_click', // user must tap created category in list
  WAIT_LOCATION_ADD_PRODUCT: 'wait_location_add_product', // user must tap "제품 등록"
  WAIT_PRODUCT_NAME: 'wait_product_name', // user must type product name
  WAIT_PRODUCT_SAVE: 'wait_product_save', // user must tap product save
  WAIT_CREATED_PRODUCT_CONGRATS: 'wait_created_product_congrats', // highlight created product and show congrats
  DONE: 'done',
};

const initialState = {
  active: false,
  step: null,
  createdLocationId: null,
  createdLocationTitle: null,
  createdProductId: null,
  createdProductName: null,
  createdProductLocationId: null,
};

const tutorialSlice = createSlice({
  name: 'tutorial',
  initialState,
  reducers: {
    startTutorial: (state) => {
      state.active = true;
      state.step = TUTORIAL_STEPS.PROFILE_INTRO;
      state.createdLocationId = null;
      state.createdLocationTitle = null;
      state.createdProductId = null;
      state.createdProductName = null;
      state.createdProductLocationId = null;
    },
    setTutorialStep: (state, action) => {
      state.active = true;
      state.step = action.payload?.step || state.step || TUTORIAL_STEPS.PROFILE_INTRO;
    },
    categoryCreated: (state, action) => {
      state.active = true;
      // ✅ 생성 직후에는 "축하" 안내를 먼저 보여준 뒤, 확인을 눌러 목록에서 해당 카테고리를 터치하도록 유도
      state.step = TUTORIAL_STEPS.WAIT_CREATED_LOCATION_CONGRATS;
      state.createdLocationId = action.payload?.locationId != null ? String(action.payload.locationId) : null;
      state.createdLocationTitle = action.payload?.title != null ? String(action.payload.title) : state.createdLocationTitle;
    },
    productCreated: (state, action) => {
      state.active = true;
      state.step = TUTORIAL_STEPS.WAIT_CREATED_PRODUCT_CONGRATS;
      state.createdProductId = action.payload?.productId != null ? String(action.payload.productId) : null;
      state.createdProductName = action.payload?.name != null ? String(action.payload.name) : state.createdProductName;
      state.createdProductLocationId =
        action.payload?.locationId != null ? String(action.payload.locationId) : state.createdProductLocationId;
    },
    completeTutorial: (state) => {
      state.active = false;
      state.step = TUTORIAL_STEPS.DONE;
      state.createdLocationId = null;
      state.createdLocationTitle = null;
      state.createdProductId = null;
      state.createdProductName = null;
      state.createdProductLocationId = null;
    },
    resetTutorial: () => initialState,
  },
});

export const { startTutorial, setTutorialStep, categoryCreated, productCreated, completeTutorial, resetTutorial } =
  tutorialSlice.actions;

export default tutorialSlice.reducer;

