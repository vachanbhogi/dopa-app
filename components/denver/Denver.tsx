"use client";

import { useEffect, useRef, useState } from "react";

type AssistantAction = {
  label: string;
  href: string;
};

type DenverReply = {
  answer: string;
  action?: AssistantAction;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: DenverReply["action"];
};

const SUGGESTIONS = [
  "How should I use Dopa?",
  "How do I research competitors?",
  "How does the Brain analysis work?",
] as const;

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "I’m Denver. Ask me anything about this app—what a feature does, where to find it, or how to use it. I can’t see or change your account.",
};

const DENVER_CLIENT_STORAGE_KEY = "dopa.denver.client";

function denverClientId() {
  try {
    const existing = window.localStorage.getItem(DENVER_CLIENT_STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9-]{16,80}$/.test(existing)) {
      return existing;
    }
    const created = window.crypto.randomUUID();
    window.localStorage.setItem(DENVER_CLIENT_STORAGE_KEY, created);
    return created;
  } catch {
    return window.crypto.randomUUID();
  }
}

function responseError(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }
  return "Denver could not answer right now. Try again.";
}

function responseReply(value: unknown): DenverReply | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("reply" in value) ||
    typeof value.reply !== "object" ||
    value.reply === null ||
    !("answer" in value.reply) ||
    typeof value.reply.answer !== "string"
  ) {
    return null;
  }

  const action: AssistantAction | undefined =
    "action" in value.reply &&
    typeof value.reply.action === "object" &&
    value.reply.action !== null &&
    "label" in value.reply.action &&
    typeof value.reply.action.label === "string" &&
    "href" in value.reply.action &&
    typeof value.reply.action.href === "string" &&
    value.reply.action.href.startsWith("/") &&
    !value.reply.action.href.startsWith("//")
      ? {
          label: value.reply.action.label,
          href: value.reply.action.href,
        }
      : undefined;

  return {
    answer: value.reply.answer,
    action,
  };
}

export function Denver() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(0);

  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  useEffect(() => {
    if (open) {
      messageEndRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [messages, pending, open]);

  function nextMessageId() {
    messageIdRef.current += 1;
    return `denver-${messageIdRef.current}`;
  }

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || pending) return;

    const userMessage: ChatMessage = {
      id: nextMessageId(),
      role: "user",
      content: trimmed,
    };
    const conversation = [...messages, userMessage];

    setMessages(conversation);
    setDraft("");
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/denver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Denver-Client": denverClientId(),
        },
        cache: "no-store",
        body: JSON.stringify({
          messages: conversation.slice(-11).map(({ role, content: text }) => ({
            role,
            content: text,
          })),
          currentPath: `${window.location.pathname}${window.location.search}`,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(responseError(payload));
      }

      const reply = responseReply(payload);
      if (!reply) {
        throw new Error("Denver returned an invalid answer. Try again.");
      }

      setMessages((current) => [
        ...current,
        {
          id: nextMessageId(),
          role: "assistant",
          content: reply.answer,
          action: reply.action,
        },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Denver could not answer right now. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  function resetConversation() {
    setMessages([WELCOME_MESSAGE]);
    setDraft("");
    setError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {open ? (
        <section
          role="dialog"
          aria-label="Denver"
          className="flex h-[min(620px,calc(100dvh-2rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c0e]/98 shadow-[0_28px_90px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          <header className="flex h-15 shrink-0 items-center gap-3 border-b border-white/8 px-4">
            <GuideMark />
            <div className="min-w-0 flex-1">
              <h2 className="text-[13px] font-medium text-white">Denver</h2>
              <p className="text-[11px] text-[#777c86]">Dopa product agent · powered by Groq</p>
            </div>
            <button
              type="button"
              onClick={resetConversation}
              disabled={pending || messages.length === 1}
              className="rounded-md px-2 py-1 text-[11px] text-[#777c86] transition-colors hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-35"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Denver"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#777c86] transition-colors hover:bg-white/5 hover:text-white"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="m4 4 8 8M12 4l-8 8" />
              </svg>
            </button>
          </header>

          <div
            className="flex-1 overflow-y-auto px-4 py-4"
            aria-live="polite"
            aria-busy={pending}
          >
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-9 rounded-2xl rounded-br-md bg-[#25283a] px-3.5 py-2.5 text-[13px] leading-5 text-[#f3f4f7]"
                      : "mr-5"
                  }
                >
                  {message.role === "assistant" ? (
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#7170ff]/25 bg-[#7170ff]/10 text-[9px] font-semibold text-[#9c9bff]">
                        D
                      </span>
                      <div className="min-w-0">
                        <p className="whitespace-pre-wrap text-[13px] leading-5 text-[#c7cad1]">
                          {message.content}
                        </p>
                        {message.action ? (
                          <a
                            href={message.action.href}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-white/9 bg-white/4 px-2.5 py-1.5 text-[12px] font-medium text-white transition-[border-color,background-color] hover:border-white/15 hover:bg-white/7"
                          >
                            {message.action.label}
                            <span aria-hidden>→</span>
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
              ))}

              {messages.length === 1 && !pending ? (
                <div className="grid gap-1.5 pl-7 pt-1">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void sendMessage(suggestion)}
                      className="rounded-lg border border-white/7 px-3 py-2 text-left text-[12px] text-[#989da7] transition-[border-color,color,background-color] hover:border-white/12 hover:bg-white/3 hover:text-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}

              {pending ? (
                <div className="flex items-center gap-2.5" aria-label="Denver is thinking">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md border border-[#7170ff]/25 bg-[#7170ff]/10 text-[9px] font-semibold text-[#9c9bff]">
                    D
                  </span>
                  <span className="flex gap-1">
                    {[0, 1, 2].map((index) => (
                      <span
                        key={index}
                        className="h-1 w-1 rounded-full bg-[#777c86] motion-safe:animate-pulse"
                        style={{ animationDelay: `${index * 160}ms` }}
                      />
                    ))}
                  </span>
                </div>
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className="ml-7 rounded-lg border border-red-400/15 bg-red-400/6 px-3 py-2 text-[12px] leading-5 text-red-200"
                >
                  {error}
                </p>
              ) : null}
              <div ref={messageEndRef} />
            </div>
          </div>

          <form
            className="shrink-0 border-t border-white/8 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(draft);
            }}
          >
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/3 p-1.5 focus-within:border-[#7170ff]/45">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(draft);
                  }
                }}
                rows={1}
                maxLength={1_800}
                disabled={pending}
                aria-label="Ask Denver"
                placeholder="Ask Denver about Dopa…"
                className="max-h-24 min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] leading-5 text-white outline-none placeholder:text-[#62666d] disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={pending || !draft.trim()}
                aria-label="Send message"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#0b0c0e] transition-[transform,opacity] hover:opacity-90 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-25"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M8 12V3M4.5 6.5 8 3l3.5 3.5" />
                </svg>
              </button>
            </div>
            <p className="mt-2 px-1 text-[10px] leading-4 text-[#62666d]">
              Messages are processed by Groq. Don&apos;t share passwords, keys, or tokens.
            </p>
          </form>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Denver"
          className="group flex h-12 items-center gap-2.5 rounded-full border border-white/12 bg-[#111216]/96 pl-2 pr-4 text-[13px] font-medium text-white shadow-[0_14px_45px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#15161b] active:translate-y-0"
        >
          <GuideMark />
          Ask Denver
        </button>
      )}
    </div>
  );
}

function GuideMark() {
  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#7170ff]/25 bg-[#7170ff]/10 text-[#a7a6ff]">
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 12h3l2-5 3 10 2-5h6" />
      </svg>
      <span className="absolute inset-x-1 bottom-0 h-px bg-linear-to-r from-transparent via-[#8b8aff]/70 to-transparent" />
    </span>
  );
}
