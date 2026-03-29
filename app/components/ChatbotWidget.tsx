'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { chatbotConfig } from '@/lib/chatbot-config';

const ALLOWED_ROLES = ['admin', 'department_person'];

export const ChatbotWidget = () => {
    const router = useRouter();
    const { user } = useAuth();

    // Only show for admin and department_person
    if (!user || !ALLOWED_ROLES.includes(user.role)) return null;

    const positionClasses = {
        'bottom-right': 'bottom-6 right-6',
        'bottom-left': 'bottom-6 left-6',
    };
    const positionClass = positionClasses[chatbotConfig.position] || positionClasses['bottom-right'];

    return (
        <button
            onClick={() => router.push('/chatbot')}
            className={`
                fixed ${positionClass} z-50
                w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white
                bg-green-600 hover:bg-green-700
                transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-green-200/50 dark:hover:shadow-green-900/40
                animate-fade-in-scale
            `}
            title={chatbotConfig.title}
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        </button>
    );
};

export default ChatbotWidget;
