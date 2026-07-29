import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { login, signup } from "@/app/auth/actions";
import { DopaMark } from "@/components/landing/icons";

type AuthModalProps = {
  mode: "login" | "signup";
  redirectTo?: string;
  error?: string;
  message?: string;
};

const copy = {
  login: {
    title: "Welcome back",
  },
  signup: {
    title: "Create your account",
  },
};

export function AuthModal({
  mode,
  redirectTo = "/dashboard",
  error,
  message,
}: AuthModalProps) {
  const { title } = copy[mode];

  return (
    <div
      className="fixed inset-0 z-120 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-105 animate-fade-up">
        <div
          className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-[radial-gradient(ellipse_at_50%_0%,rgba(88,92,140,0.08),transparent_75%)]"
          aria-hidden
        />

        <div className="relative overflow-hidden rounded-xl border border-white/8 bg-[#0f1011] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between border-b border-white/6 px-5 py-3.5 sm:px-6">
            <div className="flex items-center gap-2 text-white">
              <DopaMark className="h-4.5 w-4.5" />
              <span className="text-[15px] font-[510] tracking-[-0.01em]">Dopa</span>
            </div>
            <Link
              href="/"
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[13px] text-tertiary transition-colors hover:bg-white/6 hover:text-white"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </Link>
          </div>

          <div className="px-5 pt-6 pb-5 sm:px-6 sm:pt-7 sm:pb-6">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-white sm:text-[24px]">
              {title}
            </h1>

            <div className="mt-6">
              <AuthForm
                mode={mode}
                action={mode === "login" ? login : signup}
                redirectTo={redirectTo}
                error={error}
                message={message}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
