import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ApolloClientProvider from './providers/ApolloProvider';
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
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <ApolloClientProvider>
            <AuthProvider>
              <TaskProvider>
                {children}
              </TaskProvider>
            </AuthProvider>
          </ApolloClientProvider>
        </ThemeProvider> 
      </body>
    </html>
  );
}