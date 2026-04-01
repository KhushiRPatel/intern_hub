import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Serializable version of ChatMessage (timestamps stored as ISO strings)
export interface SerializableChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: string; // ISO string instead of Date object
  sql?: string;
  tableData?: {
    columns: string[];
    rows: Record<string, any>[];
    rowCount: number;
  };
}

interface ChatbotState {
  messages: SerializableChatMessage[];
  inputValue: string;
  isLoading: boolean;
  isOpen: boolean;
}

const initialState: ChatbotState = {
  messages: [],
  inputValue: '',
  isLoading: false,
  isOpen: false,
};

const chatbotSlice = createSlice({
  name: 'chatbot',
  initialState,
  reducers: {
    // Add a message to conversation
    addMessage: (state, action: PayloadAction<SerializableChatMessage>) => {
      state.messages.push(action.payload);
    },

    // Add multiple messages
    setMessages: (state, action: PayloadAction<SerializableChatMessage[]>) => {
      state.messages = action.payload;
    },

    // Update input value
    setInputValue: (state, action: PayloadAction<string>) => {
      state.inputValue = action.payload;
    },

    // Set loading state
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Toggle chat visibility
    toggleChat: (state) => {
      state.isOpen = !state.isOpen;
    },

    // Set chat visibility
    setIsOpen: (state, action: PayloadAction<boolean>) => {
      state.isOpen = action.payload;
    },

    // Clear all messages
    clearMessages: (state) => {
      state.messages = [];
      state.inputValue = '';
      state.isLoading = false;
    },

    // Reset chatbot state on logout
    resetChatbotState: () => initialState,
  },
});

export const {
  addMessage,
  setMessages,
  setInputValue,
  setIsLoading,
  toggleChat,
  setIsOpen,
  clearMessages,
  resetChatbotState,
} = chatbotSlice.actions;

export default chatbotSlice.reducer;
