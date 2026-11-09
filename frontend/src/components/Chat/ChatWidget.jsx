import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { MessageCircle, X, Send, Loader2, HeadphonesIcon } from "lucide-react";
import { socket } from "../../lib/socket";
import { toggleAuthPopup } from "../../store/slices/popupSlice";
import {
  toggleChat,
  setConversation,
  setConversationAdmin,
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
  const { t } = useTranslation();
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

  // The server opens no customer conversation for admins (they answer from the dashboard).
  const isAdmin = authUser?.role === "Admin";
  const [chatError, setChatError] = useState(null);

  // Socket setup — connect when widget opens, disconnect on logout
  useEffect(() => {
    if (!authUser || !isOpen || isAdmin) return;
    setChatError(null);

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

    // Replacing the conversation here (from a stale closure) used to drop its id, so the
    // customer could no longer send anything once an admin had answered.
    socket.on("conversation:assigned", ({ admin_name }) => {
      dispatch(setConversationAdmin(admin_name));
    });

    socket.on("conversation:closed", () => {
      dispatch(markClosed());
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    // Without these the input just stayed greyed out with no explanation.
    socket.on("connect_error", () => {
      setConnecting(false);
      setChatError(t("chat.connectError", "Impossible de joindre le support pour le moment. Réessayez dans un instant."));
    });
    socket.on("error", (payload) => {
      setChatError(payload?.message || t("chat.connectError", "Impossible de joindre le support pour le moment. Réessayez dans un instant."));
    });

    return () => {
      socket.off("connect_error");
      socket.off("error");
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

  // Chat needs an account: a signed-out visitor gets the sign-in screen instead of nothing.
  const handleOpen = () => {
    if (!authUser) {
      dispatch(toggleAuthPopup());
      return;
    }
    dispatch(toggleChat());
  };

  // ─── Floating Button ─────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        title={authUser ? t('chat.chatWithUs') : t('chat.loginToChat')}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
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
            {t('chat.customerSupport')}
          </p>
          <p className="text-xs text-primary-foreground/80 truncate">
            {isAdmin
              ? t("chat.customersOnly", "Réservé aux clients")
              : connecting
              ? t('chat.connecting')
              : connected
              ? conversation?.admin_name
                ? t('chat.chattingWith', { name: conversation.admin_name })
                : t('chat.waitingForAgent')
              : t('chat.offline')}
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
              {t('chat.loginRequired')}
            </p>
          </div>
        )}

        {/* Admins answer customers from the dashboard, not from the storefront widget */}
        {isAdmin && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <HeadphonesIcon className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("chat.adminNotice", "Vous êtes connecté en tant qu'administrateur : les conversations avec les clients se gèrent depuis le dashboard.")}
            </p>
            <a
              href={import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5174"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary btn-sm"
            >
              {t("chat.openDashboardChat", "Ouvrir le chat du dashboard")}
            </a>
          </div>
        )}

        {/* Could not reach the chat server */}
        {chatError && !isAdmin && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {chatError}
          </div>
        )}

        {/* Conversation closed */}
        {isClosed && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-sm text-muted-foreground">
              {t('chat.closedByTeam')}
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
        {!isLoadingMessages && messages.length === 0 && !isClosed && connected && !isAdmin && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
              <HeadphonesIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-secondary text-foreground text-sm rounded-2xl rounded-tl-none px-4 py-2 max-w-[75%]">
              <p>{t('chat.welcomeMessage')}</p>
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
      {authUser && !isClosed && !isAdmin && (
        <div className="px-3 py-3 border-t border-border bg-background flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={connected ? t('chat.typeMessage') : t('chat.connecting')}
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
