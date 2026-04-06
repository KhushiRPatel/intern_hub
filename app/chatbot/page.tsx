'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme, useAppDispatch, useChatbotState } from '@/lib/hooks';
import { setInputValue, setIsLoading, addMessage, clearMessages, SerializableChatMessage } from '@/lib/slices/chatbotSlice';
import { useAuth } from '@/app/context/AuthContext';
import { chatbotConfig } from '@/lib/chatbot-config';

const SUGGESTED_QUESTIONS = [
  'Show all active interns',
  'How many interns are in each department?',
  'List all completed tasks',
  'Which interns are working remotely?',
];

function MessageBubble({ msg, isDark }: { msg: SerializableChatMessage; isDark: boolean }) {
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-200';
  const textClass = isDark ? 'text-slate-100' : 'text-slate-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-slate-500';

  // Convert ISO string back to Date for display
  const timestamp = new Date(msg.timestamp);

  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      {msg.role === 'bot' && (
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0 mr-3 mt-1 shadow-sm">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      )}

      <div className={`max-w-2xl rounded-2xl text-sm shadow-sm ${msg.role === 'user'
          ? 'bg-green-600 text-white rounded-br-sm px-5 py-3'
          : `${isDark ? 'bg-slate-800' : 'bg-white'} ${textClass} border ${borderClass} rounded-bl-sm px-5 py-4`
        }`}>
        <p className="whitespace-pre-wrap wrap-break-word leading-relaxed">{msg.content}</p>

        {/* Structured Table */}
        {msg.tableData && (
          <div className={`mt-4 rounded-xl border ${borderClass} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`${isDark ? 'bg-slate-900' : 'bg-slate-50'} border-b ${borderClass}`}>
                  <tr>
                    {msg.tableData.columns.map((col) => (
                      <th key={col} className={`px-4 py-2.5 font-semibold uppercase tracking-wide text-[10px] ${mutedClass} whitespace-nowrap`}>
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
                  {msg.tableData.rows.map((row, i) => (
                    <tr key={i} className={`transition-colors ${isDark ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}`}>
                      {msg.tableData!.columns.map((col) => (
                        <td key={col} className={`px-4 py-2.5 max-w-50 truncate ${textClass}`} title={String(row[col] ?? '')}>
                          {row[col] === null || row[col] === undefined ? (
                            <span className={mutedClass}>—</span>
                          ) : (
                            String(row[col])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SQL accordion */}
        {msg.sql && (
          <details className="mt-3 text-xs">
            <summary className={`cursor-pointer select-none ${mutedClass} hover:underline`}>View generated SQL</summary>
            <pre className={`mt-2 p-3 rounded-lg text-[11px] overflow-x-auto leading-relaxed ${isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              {msg.sql}
            </pre>
          </details>
        )}

        <span className={`text-[10px] ${msg.role === 'user' ? 'text-green-100' : mutedClass} block mt-2 text-right`}>
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {msg.role === 'user' && (
        <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center shrink-0 ml-3 mt-1">
          <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default function ChatbotPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const { messages, inputValue, isLoading } = useChatbotState();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const borderClass = isDark ? 'border-slate-800' : 'border-slate-200';
  const bgClass = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const panelClass = isDark ? 'bg-slate-900' : 'bg-white';
  const mutedClass = isDark ? 'text-slate-400' : 'text-slate-500';

  // Send message function with API call
  const sendMessage = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage: SerializableChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };

    dispatch(addMessage(userMessage));
    dispatch(setInputValue(''));
    dispatch(setIsLoading(true));

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-role': user?.role || 'admin',
      };

      if (user?.role === 'department_person' && user?.department_id) {
        headers['x-department-id'] = user.department_id;
      }

      const response = await fetch(`${chatbotConfig.apiBaseUrl}/api/v0/ask`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question: question }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Transform backend response to message format
      const botMessage: SerializableChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: `Query executed successfully. Found ${data.results?.length || 0} result${data.results?.length !== 1 ? 's' : ''}.`,
        timestamp: new Date().toISOString(),
        sql: data.sql,
        tableData: data.results && data.results.length > 0 ? {
          columns: data.columns || [],
          rows: data.results || [],
          rowCount: data.results?.length || 0,
        } : undefined,
      };

      dispatch(addMessage(botMessage));
    } catch (error) {
      const errorMessage: SerializableChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'bot',
        content: error instanceof Error ? error.message : 'An error occurred',
        timestamp: new Date().toISOString(),
      };
      dispatch(addMessage(errorMessage));
    } finally {
      dispatch(setIsLoading(false));
    }
  };

  const handleClearChat = () => {
    dispatch(clearMessages());
  };

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    sendMessage(inputValue);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch(setInputValue(e.target.value));
    // Auto resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={`flex flex-col h-full ${bgClass}`}>

      {/* ── Header ── */}
      <div className={`shrink-0 border-b ${borderClass} ${panelClass} px-6 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className={`p-2 rounded-xl border ${borderClass} ${mutedClass} hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600 transition-colors`}
            title="Go back"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h1 className="font-semibold text-slate-900 dark:text-white">{chatbotConfig.title}</h1>
            <p className={`text-xs ${mutedClass}`}>Ask questions about interns, tasks & departments</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className={`text-xs px-3 py-1.5 rounded-lg border ${borderClass} ${mutedClass} hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 transition-colors`}
          >
            Clear chat
          </button>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center shadow-lg shadow-green-200 dark:shadow-green-900/40">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">How can I help you?</h2>
              <p className={`text-sm mt-1 ${mutedClass}`}>Ask me anything about your interns, departments or tasks.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className={`text-left text-sm px-4 py-3 rounded-xl border ${borderClass} ${panelClass} ${mutedClass} hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 transition-all duration-150 shadow-sm`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} isDark={isDark} />
          ))
        )}

        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0 mr-3 mt-1">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className={`${panelClass} border ${borderClass} px-5 py-3.5 rounded-2xl rounded-bl-sm`}>
              <div className="flex gap-1.5 items-center h-4">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div className={`shrink-0 border-t ${borderClass} ${panelClass} px-6 py-4`}>
        <div className={`flex gap-3 items-end border ${borderClass} rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-green-500 transition-all ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={chatbotConfig.placeholder}
            disabled={isLoading}
            className={`flex-1 bg-transparent resize-none text-sm outline-none ${isDark ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'} disabled:opacity-50 max-h-40`}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            className="w-9 h-9 rounded-xl bg-green-600 text-white flex items-center justify-center hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            title="Send message (Enter)"
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className={`text-[11px] mt-2 text-center ${mutedClass}`}>Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px]">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px]">Shift+Enter</kbd> for new line</p>
      </div>
    </div>
  );
}
