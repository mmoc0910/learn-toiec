import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageCircle, X } from "lucide-react";
import { http } from "utils/libs/https";
import { cn } from "utils/helpers/class-name";
import { useAuth } from "hooks/useAuth";

type ChatbotReq = {
  cau_hoi: string;
  context?: string;
};

type ChatbotRes = {
  cau_hoi: string;
  cau_tra_loi: string; // markdown
  context?: string;
};

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clampUnread(n: number) {
  if (n <= 0) return "0";
  if (n > 99) return "99+";
  return String(n);
}

export function Chatbox() {
  const { user, accessToken } = useAuth();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [context, setContext] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: uid(),
      role: "assistant",
      content:
        "Chào bạn 👋\n\nMình có thể giúp bạn học TOEIC, giải thích bài, gợi ý lộ trình, từ vựng theo chủ đề…\n\nBạn muốn hỏi gì nào?",
      createdAt: Date.now(),
    },
  ]);

  const listRef = useRef<HTMLDivElement | null>(null);

  // auto context mẫu theo user
  useEffect(() => {
    const fallback =
      user?.HoTen || user?.Email
        ? `Tôi đang ở trình độ TOEIC 400 điểm và muốn đạt 600 điểm. Hãy gợi ý cho tôi một lộ trình học tập hiệu quả.`
        : "";
    setContext((prev) => prev || fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.HoTen, user?.Email]);

  // mở chat => reset unread
  useEffect(() => {
    if (open) setUnreadCount(0);
  }, [open]);

  // scroll bottom khi có tin mới / open
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages, loading]);

  const canSend = useMemo(() => {
    return !!accessToken && !loading && input.trim().length > 0;
  }, [accessToken, loading, input]);

  const resetChat = () => {
    setErr(null);
    setUnreadCount(0);
    setMessages([
      {
        id: uid(),
        role: "assistant",
        content: "Đã xoá hội thoại ✅\n\nBạn muốn hỏi gì tiếp theo?",
        createdAt: Date.now(),
      },
    ]);
  };

  const send = async () => {
    if (!canSend) return;

    setErr(null);
    const question = input.trim();
    setInput("");

    const userMsg: Msg = {
      id: uid(),
      role: "user",
      content: question,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setLoading(true);
    try {
      const payload: ChatbotReq = {
        cau_hoi: question,
        context: context?.trim() ? context.trim() : undefined,
      };

      const res = await http.post<ChatbotRes>("/api/chatbot/hoi/", payload);
      const data = res.data;

      const assistantMsg: Msg = {
        id: uid(),
        role: "assistant",
        content: data?.cau_tra_loi || "(Không có câu trả lời)",
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // ✅ tăng unread nếu đang đóng
      setUnreadCount((prev) => (open ? 0 : prev + 1));
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "Gửi câu hỏi thất bại.";
      setErr(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating Button + Badge */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Đóng chat" : "Mở chat"}
        className={cn(
          "fixed bottom-5 right-5 z-50 size-12 rounded-full shadow-lg border flex items-center justify-center transition active:scale-95",
          open
            ? "bg-white border-slate-300 hover:border-black"
            : "bg-black text-white border-black hover:opacity-90"
        )}
      >
        {/* icon */}
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}

        {/* ✅ Badge unread */}
        {!open && unreadCount > 0 && (
          <span
            className={cn(
              "absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full",
              "bg-red-600 text-white text-[10px] font-extrabold",
              "flex items-center justify-center leading-none",
              "border-2 border-white"
            )}
            aria-label={`Có ${unreadCount} tin nhắn chưa đọc`}
            title={`${unreadCount} tin nhắn chưa đọc`}
          >
            {clampUnread(unreadCount)}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-90 max-w-[calc(100vw-40px)]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900">Turtle Chat</div>
                <div className="text-xs text-slate-600 truncate">
                  Hỏi đáp TOEIC • hiển thị Markdown
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetChat}
                  className="text-xs font-semibold rounded-lg border border-slate-300 px-2 py-1 hover:border-black"
                >
                  Xoá
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs font-semibold rounded-lg border border-slate-300 px-2 py-1 hover:border-black"
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* Context input (optional) */}
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <label className="text-xs font-bold text-slate-700">
                Context (tuỳ chọn)
              </label>
              <input
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="VD: Tôi TOEIC 400 muốn lên 600..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-violet-100"
              />
            </div>

            {/* Messages */}
            <div
              ref={listRef}
              className="max-h-90 overflow-auto px-3 py-3 space-y-3"
            >
              {messages.map((m) => (
                <MessageBubble key={m.id} msg={m} />
              ))}

              {loading && (
                <div className="text-xs text-slate-600 px-2">
                  Đang trả lời...
                </div>
              )}

              {err && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 whitespace-pre-wrap">
                  {err}
                </div>
              )}

              {!accessToken && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Bạn cần đăng nhập để dùng chatbox.
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 p-3">
              <div className="flex gap-2 items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Nhập câu hỏi..."
                  className="min-h-11 max-h-30 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-violet-100"
                  disabled={!accessToken || loading}
                />

                <button
                  type="button"
                  onClick={send}
                  disabled={!canSend}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold border transition",
                    canSend
                      ? "bg-black text-white border-black hover:opacity-90"
                      : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  )}
                >
                  Gửi
                </button>
              </div>

              <div className="mt-2 text-[11px] text-slate-500">
                Mẹo: Enter để gửi • Shift+Enter xuống dòng
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm border",
          isUser
            ? "bg-black text-white border-black"
            : "bg-white text-slate-800 border-slate-200"
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{msg.content}</div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
