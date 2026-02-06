import { createSlice } from '@reduxjs/toolkit';
import {
  useDispatch,
  useSelector,
  TypedUseSelectorHook,
  UseDispatch,
} from 'react-redux';
import store from '../app/store';

const mockAuthSlice = createSlice({
  name: 'mock-authorizer',
  initialState: { loggedIn: false },
  reducers: {
    toggleAuth: (state) => {
      state.loggedIn = !state.loggedIn;
    },
  },
});

export const useMockSelector: TypedUseSelectorHook<
  ReturnType<typeof store.getState>
> = useSelector;
export const useMockDispatch: UseDispatch<typeof store.dispatch> = useDispatch;

export const { toggleAuth } = mockAuthSlice.actions;
export default mockAuthSlice.reducer;
