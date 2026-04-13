'use client';
import { useEffect } from 'react';
import { useAppDispatch } from '@/lib/hooks';
import { hydrate, type Theme } from '@/lib/slices/themeSlice';

export default function ThemeInitializer() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial: Theme = saved ?? (prefersDark ? 'dark' : 'light');
    dispatch(hydrate(initial));
  }, [dispatch]);

  return null;
}
