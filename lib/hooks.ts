import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Convenience hooks
export const useTheme = () => useAppSelector((state) => state.theme);
export const useUI = () => useAppSelector((state) => state.ui);
export const useNotifications = () => useAppSelector((state) => state.notifications);
export const useChatbotState = () => useAppSelector((state) => state.chatbot);
