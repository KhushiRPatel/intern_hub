import type { Metadata } from 'next';
import './globals.css';
import ApolloClientProvider from './providers/ApolloProvider';
import { AuthProvider } from './context/AuthContext';
import { TaskProvider } from './context/TaskContext';

export const metadata: Metadata = {
  title: 'Intern Management System',
  description: 'Manage interns across departments efficiently',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ApolloClientProvider>
          <AuthProvider>
            <TaskProvider>
              {children}
            </TaskProvider>
          </AuthProvider>
        </ApolloClientProvider>
      </body>
    </html>
  );
}
