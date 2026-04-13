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
import { useAppDispatch } from '@/lib/hooks';
import { resetUIState } from '@/lib/slices/uiSlice';
import { clearNotifications } from '@/lib/slices/notificationSlice';
import { resetChatbotState } from '@/lib/slices/chatbotSlice';

interface AuthContextType {
    user: UserData | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    updateUser: (data: Partial<UserData>) => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function setAuthCookie(token: string) {
    document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 8}; samesite=lax`;
}

function clearAuthCookie() {
    document.cookie = 'auth_token=; path=/; max-age=0; samesite=lax';
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserData | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const dispatch = useAppDispatch();

    // Rehydrate from localStorage on mount
    useEffect(() => {
        try {
            const storedToken = localStorage.getItem('auth_token');
            const storedUser = localStorage.getItem('auth_user');
            if (storedToken && storedUser) {
                setAuthCookie(storedToken);
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
        setAuthCookie(newToken);
        setToken(newToken);
        setUser(newUser);
        router.push('/dashboard');
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        clearAuthCookie();
        setToken(null);
        setUser(null);
        dispatch(resetUIState());
        dispatch(clearNotifications());
        dispatch(resetChatbotState());
        router.push('/login');
    };

    const updateUser = (data: Partial<UserData>) => {
        setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, ...data };
            localStorage.setItem('auth_user', JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoading }}>
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
