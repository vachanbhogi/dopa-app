import { signup } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Sign up for an account"
      subtitle=""
    >
      <AuthForm
        mode="signup"
        action={signup}
        redirectTo={params.redirectTo ?? "/dashboard"}
        error={params.error}
      />
    </AuthShell>
  );
}
