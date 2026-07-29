import { AuthForm } from "@/components/auth/AuthForm";
import { login, signup } from "@/app/auth/actions";
import { DopaModal } from "@/components/ui/DopaModal";

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
    <DopaModal title={title} closeHref="/">
      <AuthForm
        mode={mode}
        action={mode === "login" ? login : signup}
        redirectTo={redirectTo}
        error={error}
        message={message}
      />
    </DopaModal>
  );
}
