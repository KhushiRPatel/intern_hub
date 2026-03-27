'use client';
import { createContext, useContext, useState } from 'react';

export type PageView = 'dashboard' | 'interns' | 'add-intern' | 'add-dept-person' | 'tasks';

interface NavigationContextType {
    currentView: PageView;
    setCurrentView: (view: PageView) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
    const [currentView, setCurrentView] = useState<PageView>('dashboard');

    return (
        <NavigationContext.Provider value={{ currentView, setCurrentView }}>
            {children}
        </NavigationContext.Provider>
    );
}

export function useNavigation() {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation must be used within NavigationProvider');
    }
    return context;
}
