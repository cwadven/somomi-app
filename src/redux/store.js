import { configureStore } from '@reduxjs/toolkit';
import productsReducer from './slices/productsSlice';
import categoriesReducer from './slices/categoriesSlice';
import authReducer from './slices/authSlice';
import locationsReducer from './slices/locationsSlice';

export const store = configureStore({
  reducer: {
    products: productsReducer,
    categories: categoriesReducer,
    auth: authReducer,
    locations: locationsReducer,
  },
});

export default store; 