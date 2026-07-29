import { login } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; redirectTo?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your Dopa campaign dashboard."
    >
      <AuthForm
        mode="login"
        action={login}
        redirectTo={params.redirectTo ?? "/dashboard"}
        error={params.error}
        message={params.message}
      />
    </AuthShell>
  );
}
