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
    subtitle: "Log in to your Dopa campaign dashboard.",
  },
  signup: {
    title: "Sign up for an account",
    subtitle: undefined,
  },
};

export function AuthModal({
  mode,
  redirectTo = "/dashboard",
  error,
  message,
}: AuthModalProps) {
  const { title, subtitle } = copy[mode];

  return (
    <div
      className="fixed inset-0 z-120 flex items-center justify-center bg-black/80 p-5 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-105 animate-fade-up">
        <Link
          href="/"
          aria-label="Close"
          className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[14px] text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        >
          ✕
        </Link>

        <div className="rounded-2xl border border-white/8 bg-[#0f1011] p-8 shadow-2xl shadow-black/60">
          <div className="flex items-center gap-2 text-white">
            <DopaMark className="h-4.5 w-4.5" />
            <span className="text-[15px] font-[510] tracking-[-0.01em]">Dopa</span>
          </div>

          <h1 className="mt-6 text-[24px] font-semibold tracking-[-0.02em] text-white">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-[14px] leading-6 text-secondary">{subtitle}</p>
          ) : null}

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
  );
}
