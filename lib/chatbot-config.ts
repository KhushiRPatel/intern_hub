// Configuration for the InternHub Chatbot Widget

export const chatbotConfig = {
    // Backend API URL (adjust based on your environment)
    apiBaseUrl: process.env.NEXT_PUBLIC_CHATBOT_API_URL || 'http://localhost:8000',

    // Widget display settings
    title: 'InternHub Data Assistant',
    placeholder: 'Ask about interns, departments, or tasks...',
    position: 'bottom-right' as const,

    // Animation settings
    animations: {
        fadeInScale: true,
        slideUp: true,
    },

    // Light/Dark mode sync
    syncWithTheme: true,
};

export default chatbotConfig;
