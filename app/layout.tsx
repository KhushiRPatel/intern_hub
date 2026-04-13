import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ApolloClientProvider from './providers/ApolloProvider';
import ReduxProvider from './providers/ReduxProvider';
import { AuthProvider } from './context/AuthContext';
import { TaskProvider } from './context/TaskContext';   // ← your branch
import { ThemeProvider } from './context/ThemeContext'; // ← Harshil's branch

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'InternMS — Intern Management System',
  description: 'Manage interns across departments efficiently',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const isDark = theme === 'dark' || (!theme && prefersDark);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <ReduxProvider>
          <ThemeProvider>
            <ApolloClientProvider>
              <AuthProvider>
                <TaskProvider>
                  {children}
                </TaskProvider>
              </AuthProvider>
            </ApolloClientProvider>
          </ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}