"use client";

import { DopaMark } from "@/components/landing/icons";
import { useCallback, useEffect, useRef, useState } from "react";

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
  {
    label: "Workflow",
    prompt: "How should I use Dopa?",
  },
  {
    label: "Research",
    prompt: "How do I research competitors?",
  },
  {
    label: "Brain",
    prompt: "How does the Brain analysis work?",
  },
] as const;

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Tell me what you’re trying to do. I’ll point you to the right part of Dopa and explain how it works. I can’t view or change your account.",
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

  function nextMessageId() {
    messageIdRef.current += 1;
    return `denver-${messageIdRef.current}`;
  }

  const sendMessage = useCallback(
    async (content: string) => {
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
    },
    [messages, pending],
  );

  useEffect(() => {
    const handleOpenDenver = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt?: string }>;
      setOpen(true);
      if (customEvent.detail?.prompt?.trim()) {
        void sendMessage(customEvent.detail.prompt.trim());
      }
    };
    window.addEventListener("dopa:open-denver", handleOpenDenver);
    return () => window.removeEventListener("dopa:open-denver", handleOpenDenver);
  }, [sendMessage]);

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
    if (open && (messages.length > 1 || pending)) {
      messageEndRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [messages.length, pending, open]);

  return (
    <div
      data-denver-root
      className="fixed bottom-3 right-3 z-150 sm:bottom-6 sm:right-6"
    >
      {open ? (
        <section
          role="dialog"
          aria-label="Denver"
          className={`flex w-[min(360px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-white/8 bg-[#0f1011] shadow-[0_24px_80px_rgba(0,0,0,0.65)] animate-fade-up transition-[height] duration-200 ${
            messages.length === 1 && !pending
              ? "h-[min(560px,calc(100dvh-2rem))]"
              : "h-[min(680px,calc(100dvh-2rem))]"
          }`}
        >
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/6 px-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
              <DopaMark className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-white">
                Denver AI
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Denver"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-tertiary transition-colors hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
            className="flex-1 overflow-y-auto px-4 py-5"
            aria-live="polite"
            aria-busy={pending}
          >
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-8 rounded-xl rounded-br-md border border-white/8 bg-[#0c0d0e] px-3.5 py-2.5 text-[13px] leading-5 text-white"
                      : "mr-3"
                  }
                >
                  {message.role === "assistant" ? (
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 text-brand">
                        <DopaMark className="h-3 w-3" />
                      </span>
                      <div className="min-w-0 border-l border-brand/20 pl-3">
                        <p className="whitespace-pre-wrap text-[13px] leading-[1.6] text-secondary">
                          {message.content}
                        </p>
                        {message.action ? (
                          <a
                            href={message.action.href}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-[12px] font-medium text-white transition-[border-color,background-color] hover:border-brand/35 hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                          >
                            {message.action.label}
                            <ArrowIcon className="h-3 w-3 text-brand" />
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
                <div className="ml-7 overflow-hidden rounded-xl border border-white/8 bg-[#0c0d0e]">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion.prompt}
                      type="button"
                      onClick={() => void sendMessage(suggestion.prompt)}
                      className="group grid w-full grid-cols-[1fr_16px] items-center gap-2 border-b border-white/6 px-3 py-2.5 text-left last:border-b-0 hover:bg-white/4 focus-visible:bg-white/4 focus-visible:outline-none sm:grid-cols-[66px_1fr_16px]"
                    >
                      <span className="hidden font-mono text-[9px] uppercase tracking-[0.1em] text-tertiary transition-colors group-hover:text-brand sm:block">
                        {suggestion.label}
                      </span>
                      <span className="text-[12px] leading-4 text-secondary transition-colors group-hover:text-white">
                        {suggestion.prompt}
                      </span>
                      <ArrowIcon className="h-3 w-3 text-tertiary transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-brand" />
                    </button>
                  ))}
                </div>
              ) : null}

              {pending ? (
                <div className="flex items-center gap-3" aria-label="Denver is thinking">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 text-brand">
                    <DopaMark className="h-3 w-3" />
                  </span>
                  <span className="flex items-center gap-1.5 border-l border-brand/20 py-1 pl-3">
                    {[0, 1, 2].map((index) => (
                      <span
                        key={index}
                        className="h-1 w-1 rounded-full bg-tertiary motion-safe:animate-pulse"
                        style={{ animationDelay: `${index * 160}ms` }}
                      />
                    ))}
                  </span>
                </div>
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className="ml-7 rounded-lg border border-red-400/15 bg-red-400/6 px-3 py-2.5 text-[12px] leading-5 text-red-200"
                >
                  {error}
                </p>
              ) : null}
              <div ref={messageEndRef} />
            </div>
          </div>

          <form
            className="shrink-0 border-t border-white/6 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(draft);
            }}
          >
            <div className="rounded-xl border border-white/10 bg-[#0c0d0e] p-2 transition-[border-color,box-shadow] focus-within:border-brand/50 focus-within:ring-1 focus-within:ring-brand/30">
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
                data-gramm="false"
                data-gramm_editor="false"
                aria-label="Ask Denver"
                placeholder="Ask about a Dopa feature or workflow"
                className="block max-h-24 min-h-10 w-full resize-none bg-transparent px-1.5 py-1 text-[13px] leading-5 text-white outline-none placeholder:text-tertiary disabled:opacity-60"
              />
              <div className="mt-1 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={pending || !draft.trim()}
                  aria-label="Send message"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-[transform,opacity] hover:opacity-90 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <SendIcon />
                </button>
              </div>
            </div>
            <p className="mt-2 px-1 text-[10px] leading-4 text-tertiary">
              Don&apos;t share passwords, keys, or tokens. Check important answers.
            </p>
          </form>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Denver AI"
          title="Ask Denver AI"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#0b0c0e] shadow-[0_10px_35px_rgba(0,0,0,0.5)] transition-all hover:scale-105 hover:bg-white/90 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <DopaMark className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

function ArrowIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.5 6h7M6.5 3l3 3-3 3" />
    </svg>
  );
}

function SendIcon() {
  return (
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
  );
}
