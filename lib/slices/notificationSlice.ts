import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface NotificationState {
  items: Notification[];
}

const initialState: NotificationState = {
  items: [],
};

export const addNotificationAsync = createAsyncThunk(
  'notifications/addNotificationAsync',
  async (payload: Omit<Notification, 'id'>, { dispatch }) => {
    const id = Date.now().toString();
    dispatch(addNotification({ id, ...payload }));

    if (payload.duration) {
      setTimeout(() => {
        dispatch(removeNotification(id));
      }, payload.duration);
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.items.push(action.payload);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((n) => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.items = [];
    },
  },
});

export const { addNotification, removeNotification, clearNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;
