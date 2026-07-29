import Link from "next/link";
import { signInWithGoogleFromForm } from "@/app/auth/actions";

type AuthFormProps = {
  mode: "login" | "signup";
  action: (formData: FormData) => Promise<void>;
  redirectTo?: string;
  error?: string;
  message?: string;
};

export function AuthForm({
  mode,
  action,
  redirectTo,
  error,
  message,
}: AuthFormProps) {
  const isLogin = mode === "login";

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-300">
          {message}
        </p>
      ) : null}

      <form action={action} className="space-y-4">
        {redirectTo ? (
          <input type="hidden" name="redirectTo" value={redirectTo} />
        ) : null}
        {!isLogin ? (
          <div>
            <label htmlFor="fullName" className="mb-1.5 block text-[13px] text-secondary">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              className="h-10 w-full rounded-md border border-white/10 bg-white/4 px-3 text-[14px] text-white outline-none transition-colors placeholder:text-tertiary focus:border-brand/50"
              placeholder="Manu Arora"
            />
          </div>
        ) : null}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] text-secondary">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-10 w-full rounded-md border border-white/10 bg-white/4 px-3 text-[14px] text-white outline-none transition-colors placeholder:text-tertiary focus:border-brand/50"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-[13px] text-secondary">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            minLength={6}
            className="h-10 w-full rounded-md border border-white/10 bg-white/4 px-3 text-[14px] text-white outline-none transition-colors placeholder:text-tertiary focus:border-brand/50"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center rounded-full bg-white text-[14px] font-semibold text-black transition-transform duration-150 ease-out hover:opacity-90 active:scale-[0.98]"
        >
          {isLogin ? "Log in" : "Sign up"}
        </button>
      </form>

      <p className="text-center text-[13px] text-secondary">
        {isLogin ? (
          <>
            Don&apos;t have an account?{" "}
            <Link href="/?modal=signup" className="text-white hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/?modal=login" className="text-white hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>

      <div className="flex items-center gap-3 text-[12px] text-tertiary">
        <div className="h-px flex-1 bg-white/10" />
        <span className="whitespace-nowrap">Or continue with</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form action={signInWithGoogleFromForm}>
        {redirectTo ? (
          <input type="hidden" name="redirectTo" value={redirectTo} />
        ) : null}
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[14px] font-semibold text-black transition-transform duration-150 ease-out hover:opacity-90 active:scale-[0.98]"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </form>

      {!isLogin ? (
        <p className="text-center text-[12px] leading-5 text-secondary">
          By clicking on sign up, you agree to our{" "}
          <a href="#terms" className="text-white underline underline-offset-2 decoration-white/40">
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="#privacy"
            className="text-white underline underline-offset-2 decoration-white/40"
          >
            Privacy Policy
          </a>
        </p>
      ) : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
