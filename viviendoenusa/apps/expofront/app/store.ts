import { configureStore } from '@reduxjs/toolkit';
import { mockAuthReducer, languageReducer } from '../redux/slices';

const store = configureStore({
  reducer: {
    mockAuth: mockAuthReducer, // Debe coincidir con 'state.mockAuth'
    language: languageReducer, // Debe coincidir con 'state.language'
  },
});

export default store;
