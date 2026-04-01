import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  isDark: boolean;
  mounted: boolean;
}

const initialState: ThemeState = {
  theme: 'light',
  isDark: false,
  mounted: false,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      state.isDark = action.payload === 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', action.payload);
        document.documentElement.classList.toggle('dark', action.payload === 'dark');
      }
    },
    toggleTheme: (state) => {
      const next: Theme = state.theme === 'light' ? 'dark' : 'light';
      state.theme = next;
      state.isDark = !state.isDark;
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', next);
        document.documentElement.classList.toggle('dark', next === 'dark');
      }
    },
    hydrate: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      state.isDark = action.payload === 'dark';
      state.mounted = true;
    },
  },
});

export const { setTheme, toggleTheme, hydrate } = themeSlice.actions;
export default themeSlice.reducer;
