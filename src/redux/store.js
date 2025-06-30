import { configureStore } from '@reduxjs/toolkit';
import productsReducer from './slices/productsSlice';
import categoriesReducer from './slices/categoriesSlice';
import authReducer from './slices/authSlice';
import locationsReducer from './slices/locationsSlice';
import notificationsReducer from './slices/notificationsSlice';

export const store = configureStore({
  reducer: {
    products: productsReducer,
    categories: categoriesReducer,
    auth: authReducer,
    locations: locationsReducer,
    notifications: notificationsReducer,
  },
});

export default store; 