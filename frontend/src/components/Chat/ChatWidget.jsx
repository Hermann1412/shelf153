import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MessageCircle, X, Send, Loader2, HeadphonesIcon } from "lucide-react";
import { socket } from "../../lib/socket";
import {
  toggleChat,
  setConversation,
  addMessage,
  setTyping,
  clearTyping,
  markClosed,
  fetchMessages,
} from "../../store/slices/chatSlice";

const TYPING_TIMEOUT = 1500;

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const TypingDots = () => (
  <div className="flex items-center gap-1 px-4 py-2">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </div>
);

const ChatWidget = () => {
  const dispatch = useDispatch();
  const { authUser } = useSelector((s) => s.auth);
  const { isOpen, conversation, messages, isLoadingMessages, typingInfo, unreadCount, isClosed } =
    useSelector((s) => s.chat);

  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingInfo]);

  // Socket setup — connect when widget opens, disconnect on logout
  useEffect(() => {
    if (!authUser || !isOpen) return;

    setConnecting(true);
    socket.connect();

    socket.on("connect", () => {
      setConnected(true);
      setConnecting(false);
      socket.emit("start_conversation");
    });

    socket.on("conversation:started", async (conv) => {
      dispatch(setConversation(conv));
      await dispatch(fetchMessages(conv.id));
    });

    socket.on("message:new", (msg) => {
      dispatch(addMessage(msg));
    });

    socket.on("typing:indicator", (info) => {
      if (info.role === "Admin") {
        dispatch(setTyping(info));
      }
    });

    socket.on("typing:stopped", (info) => {
      if (info.role === "Admin") dispatch(clearTyping());
    });

    socket.on("conversation:assigned", ({ admin_name }) => {
      dispatch(setConversation({ ...conversation, admin_name }));
    });

    socket.on("conversation:closed", () => {
      dispatch(markClosed());
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    return () => {
      socket.off("connect");
      socket.off("conversation:started");
      socket.off("message:new");
      socket.off("typing:indicator");
      socket.off("typing:stopped");
      socket.off("conversation:assigned");
      socket.off("conversation:closed");
      socket.off("disconnect");
      socket.disconnect();
      setConnected(false);
      setConnecting(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, isOpen]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || !conversation?.id || !connected) return;

    socket.emit("send_message", {
      conversationId: conversation.id,
      content: input.trim(),
    });

    // Stop typing indicator
    if (isTypingRef.current) {
      socket.emit("stop_typing", { conversationId: conversation.id });
      isTypingRef.current = false;
    }
    clearTimeout(typingTimerRef.current);
    setInput("");
  }, [input, conversation, connected]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!conversation?.id || !connected) return;

    if (!isTypingRef.current) {
      socket.emit("typing", { conversationId: conversation.id });
      isTypingRef.current = true;
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit("stop_typing", { conversationId: conversation.id });
      isTypingRef.current = false;
    }, TYPING_TIMEOUT);
  };

  const handleOpen = () => {
    if (!authUser) return;
    dispatch(toggleChat());
  };

  // ─── Floating Button ─────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        title={authUser ? "Chat with us" : "Login to chat"}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full gradient-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-110 transition-transform animate-smooth"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    );
  }

  // ─── Chat Window ─────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] flex flex-col rounded-2xl shadow-2xl border border-border bg-background overflow-hidden">
      {/* Header */}
      <div className="gradient-primary px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <HeadphonesIcon className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary-foreground leading-tight">
            Customer Support
          </p>
          <p className="text-xs text-primary-foreground/80 truncate">
            {connecting
              ? "Connecting..."
              : connected
              ? conversation?.admin_name
                ? `Chatting with ${conversation.admin_name}`
                : "Waiting for an agent..."
              : "Offline"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-400" : "bg-gray-400"
            }`}
          />
          <button
            onClick={() => dispatch(toggleChat())}
            className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-background">
        {/* Not logged in */}
        {!authUser && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <MessageCircle className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Please log in to chat with us.
            </p>
          </div>
        )}

        {/* Conversation closed */}
        {isClosed && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-sm text-muted-foreground">
              This conversation has been closed by the support team.
            </p>
          </div>
        )}

        {/* Loading */}
        {isLoadingMessages && !isClosed && (
          <div className="flex justify-center pt-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Welcome message */}
        {!isLoadingMessages && messages.length === 0 && !isClosed && connected && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
              <HeadphonesIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-secondary text-foreground text-sm rounded-2xl rounded-tl-none px-4 py-2 max-w-[75%]">
              <p>Hi there! 👋 How can we help you today?</p>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === authUser?.id;
          return (
            <div
              key={msg.id}
              className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
            >
              {!isOwn && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 text-xs font-bold text-primary">
                  {msg.sender_name?.[0]?.toUpperCase() || "A"}
                </div>
              )}
              <div className={`flex flex-col gap-1 max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                <div
                  className={`text-sm px-4 py-2 rounded-2xl ${
                    isOwn
                      ? "gradient-primary text-primary-foreground rounded-tr-none"
                      : "bg-secondary text-foreground rounded-tl-none"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingInfo && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
              {typingInfo.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="bg-secondary rounded-2xl rounded-tl-none">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {authUser && !isClosed && (
        <div className="px-3 py-3 border-t border-border bg-background flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={connected ? "Type a message..." : "Connecting..."}
            disabled={!connected || !conversation}
            className="flex-1 resize-none bg-secondary text-foreground text-sm rounded-xl px-4 py-2.5 outline-none placeholder:text-muted-foreground max-h-24 disabled:opacity-50 leading-relaxed"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || !connected || !conversation}
            className="w-9 h-9 rounded-full gradient-primary text-primary-foreground flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:scale-105 transition-transform animate-smooth"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
