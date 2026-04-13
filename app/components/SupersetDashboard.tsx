'use client';
import { useEffect, useRef, useState } from 'react';
import { embedDashboard } from '@superset-ui/embedded-sdk';
import { Spinner } from './ui/Spinner';

interface Props {
  dashboardId: string;
}

const SUPERSET_DOMAIN = process.env.NEXT_PUBLIC_SUPERSET_URL ?? 'http://localhost:8088';

export default function SupersetDashboard({ dashboardId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const unmountRef = useRef<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !dashboardId) return;

    setLoading(true);
    setError(null);

    // Unmount previous embed if dashboard ID changed
    unmountRef.current?.();
    unmountRef.current = null;

    const fetchGuestToken = async (): Promise<string> => {
      const res = await fetch('/api/superset/guest-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboardId }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { token } = await res.json() as { token: string };
      return token;
    };

    let cancelled = false;

    embedDashboard({
      id: dashboardId,
      supersetDomain: SUPERSET_DOMAIN,
      mountPoint: containerRef.current!,
      fetchGuestToken,
      dashboardUiConfig: {
        hideTitle: false,
        hideChartControls: false,
        filters: { visible: true, expanded: false },
      },
    })
      .then((embedded) => {
        if (!cancelled) {
          unmountRef.current = embedded.unmount;
          // SDK does not set iframe height — force it explicitly
          const iframe = containerRef.current?.querySelector('iframe');
          if (iframe) {
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.style.display = 'block';
          }
          setLoading(false);
        } else {
          embedded.unmount();
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      unmountRef.current?.();
      unmountRef.current = null;
    };
  }, [dashboardId]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-center px-6">
        <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed to load dashboard</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full"
      style={{ height: 'calc(100vh - 180px)', minHeight: 600 }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-slate-900 z-10 rounded-2xl">
          <Spinner size="xl" label="Loading dashboard…" />
        </div>
      )}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
