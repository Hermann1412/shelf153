import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Send,
  Loader2,
  MessageSquare,
  Search,
  X,
  CheckCheck,
  UserCircle2,
} from "lucide-react";
import { socket } from "../lib/socket";
import {
  fetchConversations,
  fetchMessages,
  selectConversation,
  addMessage,
  upsertConversation,
  removeConversation,
  setTyping,
  clearTyping,
  setFilter,
} from "../store/slices/chatSlice";

const TYPING_TIMEOUT = 1500;

const formatTime = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const Avatar = ({ name, size = "md" }) => {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm" };
  return (
    <div
      className={`${sizes[size]} rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center flex-shrink-0`}
    >
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
};

const TypingDots = () => (
  <div className="flex items-center gap-1 px-4 py-2.5">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </div>
);

// ─── Conversation List Item ───────────────────────────────────────────────────
const ConversationItem = ({ conv, isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 ${
      isSelected ? "bg-blue-50" : "hover:bg-gray-50"
    }`}
  >
    <Avatar name={conv.customer_name} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800 truncate">
          {conv.customer_name}
        </span>
        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
          {formatTime(conv.last_message_at || conv.created_at)}
        </span>
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <p className="text-xs text-gray-500 truncate max-w-[160px]">
          {conv.last_message || "No messages yet"}
        </p>
        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          {conv.status === "closed" && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              Closed
            </span>
          )}
          {Number(conv.unread_count) > 0 && conv.status !== "closed" && (
            <span className="w-5 h-5 bg-blue-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              {Number(conv.unread_count) > 9 ? "9+" : conv.unread_count}
            </span>
          )}
        </div>
      </div>
      {conv.admin_name && (
        <p className="text-[10px] text-blue-500 mt-0.5 flex items-center gap-1">
          <CheckCheck className="w-3 h-3" /> {conv.admin_name}
        </p>
      )}
    </div>
  </button>
);

// ─── Main Chat Component ──────────────────────────────────────────────────────
const Chat = () => {
  const dispatch = useDispatch();
  const {
    conversations,
    selectedConversation,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    typingInfo,
    filter,
  } = useSelector((s) => s.chat);

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingInfo]);

  // Connect socket and load conversations
  useEffect(() => {
    dispatch(fetchConversations());

    socket.connect();

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("conversation:new", (conv) => {
      dispatch(upsertConversation(conv));
    });

    socket.on("conversation:updated", (conv) => {
      dispatch(upsertConversation(conv));
    });

    socket.on("conversation:closed", (convId) => {
      dispatch(removeConversation(convId));
    });

    socket.on("message:new", (msg) => {
      dispatch(addMessage(msg));
      dispatch(fetchConversations());
    });

    socket.on("typing:indicator", (info) => {
      if (info.role === "User") dispatch(setTyping(info));
    });

    socket.on("typing:stopped", (info) => {
      if (info.role === "User") dispatch(clearTyping());
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("conversation:new");
      socket.off("conversation:updated");
      socket.off("conversation:closed");
      socket.off("message:new");
      socket.off("typing:indicator");
      socket.off("typing:stopped");
      socket.disconnect();
    };
  }, [dispatch]);

  // When admin selects a conversation — join room + load messages
  const handleSelectConversation = useCallback(
    async (conv) => {
      if (selectedConversation?.id === conv.id) return;
      dispatch(selectConversation(conv));
      socket.emit("join_conversation", conv.id);
      await dispatch(fetchMessages(conv.id));
    },
    [dispatch, selectedConversation]
  );

  const sendMessage = useCallback(() => {
    if (!input.trim() || !selectedConversation?.id || !connected) return;

    socket.emit("send_message", {
      conversationId: selectedConversation.id,
      content: input.trim(),
    });

    if (isTypingRef.current) {
      socket.emit("stop_typing", { conversationId: selectedConversation.id });
      isTypingRef.current = false;
    }
    clearTimeout(typingTimerRef.current);
    setInput("");
  }, [input, selectedConversation, connected]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!selectedConversation?.id || !connected) return;

    if (!isTypingRef.current) {
      socket.emit("typing", { conversationId: selectedConversation.id });
      isTypingRef.current = true;
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit("stop_typing", { conversationId: selectedConversation.id });
      isTypingRef.current = false;
    }, TYPING_TIMEOUT);
  };

  const handleCloseConversation = () => {
    if (!selectedConversation?.id) return;
    socket.emit("close_conversation", selectedConversation.id);
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesFilter = filter === "all" ? true : c.status === filter;
    const matchesSearch = c.customer_name
      ?.toLowerCase()
      .includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalUnread = conversations.reduce(
    (acc, c) => acc + (c.status === "open" ? Number(c.unread_count || 0) : 0),
    0
  );

  return (
    <div className="flex h-full rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
      {/* ── Left Panel: Conversations ── */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-gray-200">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              Support Chat
              {totalUnread > 0 && (
                <span className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
            </h2>
            <span
              className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-gray-300"}`}
              title={connected ? "Connected" : "Disconnected"}
            />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mt-3">
            {["open", "closed", "all"].map((f) => (
              <button
                key={f}
                onClick={() => dispatch(setFilter(f))}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                  filter === f
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
              <MessageSquare className="w-8 h-8" />
              <p className="text-sm">No conversations</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isSelected={selectedConversation?.id === conv.id}
                onClick={() => handleSelectConversation(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right Panel: Messages ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
            <MessageSquare className="w-12 h-12" />
            <p className="text-sm font-medium">Select a conversation to start</p>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <Avatar name={selectedConversation.customer_name} />
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    {selectedConversation.customer_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedConversation.status === "closed"
                      ? "Conversation closed"
                      : selectedConversation.admin_name
                      ? `Handled by ${selectedConversation.admin_name}`
                      : "Waiting for agent"}
                  </p>
                </div>
              </div>

              {selectedConversation.status === "open" && (
                <button
                  onClick={handleCloseConversation}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  <X className="w-3.5 h-3.5" />
                  Close
                </button>
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50">
              {isLoadingMessages ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                  <UserCircle2 className="w-8 h-8" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.sender_role === "Admin";
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {!isAdmin && (
                        <Avatar name={msg.sender_name} size="sm" />
                      )}
                      <div
                        className={`flex flex-col gap-1 max-w-[70%] ${
                          isAdmin ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`text-sm px-4 py-2.5 rounded-2xl leading-relaxed ${
                            isAdmin
                              ? "bg-blue-500 text-white rounded-tr-none"
                              : "bg-white text-gray-800 rounded-tl-none shadow-sm border border-gray-100"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {typingInfo && (
                <div className="flex gap-2.5">
                  <Avatar name={typingInfo.name} size="sm" />
                  <div className="bg-white rounded-2xl rounded-tl-none shadow-sm border border-gray-100">
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            {selectedConversation.status === "open" && (
              <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-end gap-3">
                <textarea
                  rows={1}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a reply..."
                  disabled={!connected}
                  className="flex-1 resize-none bg-gray-50 text-gray-800 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-200 focus:border-blue-400 placeholder:text-gray-400 max-h-28 disabled:opacity-50 leading-relaxed transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || !connected}
                  className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}

            {selectedConversation.status === "closed" && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-center">
                <p className="text-xs text-gray-500">
                  This conversation is closed.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
