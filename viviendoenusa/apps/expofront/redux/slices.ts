import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  useDispatch,
  useSelector,
  TypedUseSelectorHook,
} from 'react-redux';
import store from '../app/store';

// 1. Definimos la interfaz del usuario para que TypeScript sepa qué campos existen
interface UserMetadata {
  name: string;
  email?: string;
  avatar?: string;
}

interface AuthState {
  loggedIn: boolean;
  userMetadata: UserMetadata | null;
}

// 2. Aplicamos la interfaz al estado inicial
const initialState: AuthState = {
  loggedIn: false,
  userMetadata: {
    name: 'Usuario Invitado', // Nombre por defecto
  },
};

// Definimos el tipo del estado global basándonos en el store
export type RootState = ReturnType<typeof store.getState>;

// --- Slice de Autenticación ---
const mockAuthSlice = createSlice({
  name: 'mock-authorizer',
  initialState, // Usamos el nuevo estado inicial con metadata
  reducers: {
    toggleAuth: (state) => {
      state.loggedIn = !state.loggedIn;
    },
    // Opcional: Podrías añadir una acción para actualizar los datos del usuario
    setUserMetadata: (state, action: PayloadAction<UserMetadata>) => {
      state.userMetadata = action.payload;
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
export const { toggleAuth, setUserMetadata } = mockAuthSlice.actions;
export const { setLanguage } = languageSlice.actions;

// Exportamos reducers para el store
export const mockAuthReducer = mockAuthSlice.reducer;
export const languageReducer = languageSlice.reducer;

// --- HOOKS TIPADOS ---
export const useMockSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useMockDispatch = () => useDispatch<typeof store.dispatch>();