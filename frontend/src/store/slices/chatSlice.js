import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";

export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async (conversationId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(
        `/chat/conversation/${conversationId}/messages`
      );
      return data.messages;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    isOpen: false,
    conversation: null,
    messages: [],
    isLoadingMessages: false,
    typingInfo: null,
    unreadCount: 0,
    isClosed: false,
  },
  reducers: {
    toggleChat: (state) => {
      state.isOpen = !state.isOpen;
      if (state.isOpen) state.unreadCount = 0;
    },
    setConversation: (state, action) => {
      state.conversation = action.payload;
      state.isClosed = false;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
      if (!state.isOpen) state.unreadCount += 1;
    },
    setTyping: (state, action) => {
      state.typingInfo = action.payload;
    },
    clearTyping: (state) => {
      state.typingInfo = null;
    },
    markClosed: (state) => {
      state.isClosed = true;
      state.conversation = null;
      state.messages = [];
    },
    resetChat: (state) => {
      state.conversation = null;
      state.messages = [];
      state.isOpen = false;
      state.typingInfo = null;
      state.unreadCount = 0;
      state.isClosed = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.isLoadingMessages = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoadingMessages = false;
        state.messages = action.payload;
      })
      .addCase(fetchMessages.rejected, (state) => {
        state.isLoadingMessages = false;
      });
  },
});

export const {
  toggleChat,
  setConversation,
  addMessage,
  setTyping,
  clearTyping,
  markClosed,
  resetChat,
} = chatSlice.actions;

export default chatSlice.reducer;
