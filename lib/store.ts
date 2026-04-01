import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './slices/themeSlice';
import uiReducer from './slices/uiSlice';
import notificationReducer from './slices/notificationSlice';
import chatbotReducer from './slices/chatbotSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    ui: uiReducer,
    notifications: notificationReducer,
    chatbot: chatbotReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
