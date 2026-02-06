import { configureStore } from '@reduxjs/toolkit';
import mockAuthReducer from '../redux/slices';

const store = configureStore({
  reducer: {
    mockAuth: mockAuthReducer,
  },
});

export default store;
