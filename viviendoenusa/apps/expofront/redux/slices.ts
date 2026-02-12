import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  useDispatch,
  useSelector,
  TypedUseSelectorHook,
} from 'react-redux';
import store from '../app/store';

// Definimos el tipo del estado global basándonos en el store
export type RootState = ReturnType<typeof store.getState>;

// --- Slice de Autenticación ---
const mockAuthSlice = createSlice({
  name: 'mock-authorizer',
  initialState: { loggedIn: false },
  reducers: {
    toggleAuth: (state) => {
      state.loggedIn = !state.loggedIn;
    },
  },
});

// --- Slice de Idioma ---
const languageSlice = createSlice({
  name: 'language',
  initialState: { code: 'es' },
  reducers: {
    setLanguage: (state, action: PayloadAction<string>) => {
      state.code = action.payload;
    },
  },
});

// Exportamos acciones
export const { toggleAuth } = mockAuthSlice.actions;
export const { setLanguage } = languageSlice.actions;

// Exportamos reducers para el store
export const mockAuthReducer = mockAuthSlice.reducer;
export const languageReducer = languageSlice.reducer;

// --- HOOKS TIPADOS (Aquí se resuelve el error 'unknown') ---
export const useMockSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useMockDispatch = () => useDispatch<typeof store.dispatch>();