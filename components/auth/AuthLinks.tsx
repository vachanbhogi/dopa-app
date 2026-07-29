import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function AuthLinks() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <>
        <Link
          href="/dashboard"
          className="px-2.5 py-1.5 text-[13px] text-[#b4bcd0] transition-colors hover:text-white"
        >
          Dashboard
        </Link>
        <form action={signOut} className="ml-1 inline">
          <button
            type="submit"
            className="inline-flex h-[30px] items-center rounded-full border border-white/15 bg-white/[0.04] px-3.5 text-[13px] text-white transition-colors hover:bg-white/[0.08]"
          >
            Log out
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <Link
        href="/?modal=login&redirectTo=%2Fdashboard"
        className="px-2.5 py-1.5 text-[13px] text-[#b4bcd0] transition-colors hover:text-white"
      >
        Log in
      </Link>
      <Link
        href="/?modal=signup"
        className="ml-1 inline-flex h-[30px] items-center rounded-full bg-white px-3.5 text-[13px] font-medium text-black transition-opacity hover:opacity-90"
      >
        Sign up
      </Link>
    </>
  );
}
