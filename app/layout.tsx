import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ReduxProvider from './providers/ReduxProvider';
import ThemeInitializer from './providers/ThemeInitializer';
import ApolloClientProvider from './providers/ApolloProvider';
import { AuthProvider } from './context/AuthContext';
import { TaskProvider } from './context/TaskContext';
import NotificationCenter from './components/NotificationCenter';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'InternMS — Intern Management System',
  description: 'Manage interns across departments efficiently',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ReduxProvider>
          <ThemeInitializer />
          <ApolloClientProvider>
            <AuthProvider>
              <TaskProvider>
                {children}
                <NotificationCenter />
              </TaskProvider>
            </AuthProvider>
          </ApolloClientProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}