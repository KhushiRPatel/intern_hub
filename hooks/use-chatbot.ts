import { useState, useRef, useCallback } from 'react';
import { UserData } from '@/lib/constants';

export interface ChatMessage {
    id: string;
    role: 'user' | 'bot';
    content: string;
    timestamp: Date;
    sql?: string;
    tableData?: {
        columns: string[];
        rows: Record<string, any>[];
        rowCount: number;
    };
}

export interface UseChatbotReturn {
    messages: ChatMessage[];
    inputValue: string;
    isLoading: boolean;
    isOpen: boolean;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;

    setInputValue: (value: string) => void;
    setIsOpen: (value: boolean) => void;
    sendMessage: (message: string) => Promise<void>;
    clearChat: () => void;
    toggleChat: () => void;
}

export const useChatbot = (
    apiBaseUrl: string = 'http://localhost:8000',
    user?: UserData | null
): UseChatbotReturn => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const sendMessage = useCallback(
        async (question: string) => {
            if (!question.trim()) return;

            const userMessage: ChatMessage = {
                id: Date.now().toString(),
                role: 'user',
                content: question,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, userMessage]);
            setInputValue('');
            setIsLoading(true);

            try {
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    'x-user-role': user?.role || 'admin',
                };

                if (user?.role === 'department_person' && user?.department_id) {
                    headers['x-department-id'] = user.department_id;
                }

                const response = await fetch(`${apiBaseUrl}/api/v0/ask`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ question }),
                });

                if (!response.ok) {
                    throw new Error('Failed to get response from chatbot');
                }

                const data = await response.json();
                
                let contentText = 'Here are the results:';
                let extractTable = undefined;

                if (!data.results || data.results.length === 0) {
                    contentText = 'No records found in the database.';
                } else {
                    extractTable = {
                        columns: data.columns as string[],
                        rows: data.results as Record<string, any>[],
                        rowCount: data.results.length,
                    };
                }

                const botMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'bot',
                    content: contentText,
                    timestamp: new Date(),
                    sql: data.sql,
                    tableData: extractTable,
                };

                setMessages((prev) => [...prev, botMessage]);
            } catch (error) {
                const errorMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'bot',
                    content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, errorMessage]);
            } finally {
                setIsLoading(false);
            }
        },
        [apiBaseUrl]
    );

    const clearChat = useCallback(() => {
        setMessages([]);
        setInputValue('');
    }, []);

    const toggleChat = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    return {
        messages,
        inputValue,
        isLoading,
        isOpen,
        messagesEndRef,
        setInputValue,
        setIsOpen,
        sendMessage,
        clearChat,
        toggleChat,
    };
};

export default useChatbot;
