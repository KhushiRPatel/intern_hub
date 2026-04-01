'use client';
import { useAppDispatch, useNotifications } from '@/lib/hooks';
import { removeNotification } from '@/lib/slices/notificationSlice';
import { useEffect } from 'react';

export default function NotificationCenter() {
  const dispatch = useAppDispatch();
  const { items } = useNotifications();

  const getBackgroundColor = (type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50';
      case 'error':
        return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50';
    }
  };

  const getTextColor = (type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-amber-800 dark:text-amber-200';
      case 'info':
        return 'text-blue-800 dark:text-blue-200';
    }
  };

  const getIcon = (type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 6v2M3 7v10a3 3 0 003 3h12a3 3 0 003-3V7m-3-3v1a3 3 0 00-3 3H6a3 3 0 00-3 3" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md pointer-events-none">
      {items.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={() => dispatch(removeNotification(notification.id))}
          getBackgroundColor={getBackgroundColor}
          getTextColor={getTextColor}
          getIcon={getIcon}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  };
  onRemove: () => void;
  getBackgroundColor: (type: 'success' | 'error' | 'warning' | 'info') => string;
  getTextColor: (type: 'success' | 'error' | 'warning' | 'info') => string;
  getIcon: (type: 'success' | 'error' | 'warning' | 'info') => React.ReactNode;
}

function NotificationItem({ notification, onRemove, getBackgroundColor, getTextColor, getIcon }: NotificationItemProps) {
  useEffect(() => {
    if (notification.duration) {
      const timer = setTimeout(onRemove, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, onRemove]);

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border ${getBackgroundColor(notification.type)} ${getTextColor(notification.type)} animate-slide-up`}
    >
      <span className="shrink-0">{getIcon(notification.type)}</span>
      <p className="flex-1 text-sm font-medium">{notification.message}</p>
      <button
        onClick={onRemove}
        className="shrink-0 hover:opacity-70 transition-opacity"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
