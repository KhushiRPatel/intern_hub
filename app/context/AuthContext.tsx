'use client';
import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { UserData } from '@/lib/constants';

interface AuthContextType {
    user: UserData | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserData | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Rehydrate from localStorage on mount
    useEffect(() => {
        try {
            const storedToken = localStorage.getItem('auth_token');
            const storedUser = localStorage.getItem('auth_user');
            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            }
        } catch {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = async (email: string, password: string) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Login failed');
        }

        const { token: newToken, user: newUser } = await res.json();
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
        router.push('/dashboard');
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setToken(null);
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

export function useAuthContext() {
    return useAuth();
}
