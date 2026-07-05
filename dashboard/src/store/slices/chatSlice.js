import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";

export const fetchConversations = createAsyncThunk(
  "chat/fetchConversations",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/chat/conversations");
      return data.conversations;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

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
    conversations: [],
    selectedConversation: null,
    messages: [],
    isLoadingConversations: false,
    isLoadingMessages: false,
    typingInfo: null,
    filter: "open",
  },
  reducers: {
    selectConversation: (state, action) => {
      state.selectedConversation = action.payload;
      state.messages = [];
      state.typingInfo = null;
    },
    addMessage: (state, action) => {
      if (
        state.selectedConversation?.id === action.payload.conversation_id
      ) {
        state.messages.push(action.payload);
      }
    },
    upsertConversation: (state, action) => {
      const idx = state.conversations.findIndex(
        (c) => c.id === action.payload.id
      );
      if (idx >= 0) {
        state.conversations[idx] = action.payload;
        if (state.selectedConversation?.id === action.payload.id) {
          state.selectedConversation = action.payload;
        }
      } else {
        state.conversations.unshift(action.payload);
      }
    },
    removeConversation: (state, action) => {
      state.conversations = state.conversations.map((c) =>
        c.id === action.payload ? { ...c, status: "closed" } : c
      );
      if (state.selectedConversation?.id === action.payload) {
        state.selectedConversation = {
          ...state.selectedConversation,
          status: "closed",
        };
      }
    },
    setTyping: (state, action) => {
      state.typingInfo = action.payload;
    },
    clearTyping: (state) => {
      state.typingInfo = null;
    },
    setFilter: (state, action) => {
      state.filter = action.payload;
      state.selectedConversation = null;
      state.messages = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.isLoadingConversations = true;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoadingConversations = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state) => {
        state.isLoadingConversations = false;
      })
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
  selectConversation,
  addMessage,
  upsertConversation,
  removeConversation,
  setTyping,
  clearTyping,
  setFilter,
} = chatSlice.actions;

export default chatSlice.reducer;
