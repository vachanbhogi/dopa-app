import { DopaLanding } from "@/components/dopa/DopaLanding";
import { AuthModal } from "@/components/auth/AuthModal";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    modal?: string;
    redirectTo?: string;
    error?: string;
    message?: string;
  }>;
}) {
  const params = await searchParams;
  const modal = params.modal === "login" || params.modal === "signup" ? params.modal : null;

  return (
    <>
      <DopaLanding />
      {modal ? (
        <AuthModal
          mode={modal}
          redirectTo={params.redirectTo ?? "/dashboard"}
          error={params.error}
          message={params.message}
        />
      ) : null}
    </>
  );
}
