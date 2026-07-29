import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { DopaMark } from "@/components/dopa/icons";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function DashboardPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-2 text-white">
            <DopaMark className="h-[18px] w-[18px]" />
            <span className="text-[15px] font-[510]">Dopa</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-[13px] text-secondary sm:inline">
              {user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full border border-white/10 px-3 py-1.5 text-[13px] text-secondary transition-colors hover:text-white"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-5 py-12 md:px-8">
        <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-white">
          Campaign dashboard
        </h1>
        <p className="mt-2 max-w-[520px] text-[15px] leading-7 text-secondary">
          Upload creatives, run them through TRIBE v2, and see predicted ROI, CVR,
          and click timelines — all in one place.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "ROI", value: "—", hint: "Upload a creative to score" },
            { label: "CVR", value: "—", hint: "Pending TRIBE v2 run" },
            { label: "mean iCTR", value: "—", hint: "No timeline yet" },
            { label: "Tier", value: "—", hint: "Awaiting prediction" },
          ].map((metric) => (
            <div key={metric.label} className="dopa-panel p-5">
              <div className="text-[12px] text-tertiary">{metric.label}</div>
              <div className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-white">
                {metric.value}
              </div>
              <div className="mt-2 text-[12px] text-secondary">{metric.hint}</div>
            </div>
          ))}
        </div>

        <div className="dopa-panel mt-8 p-8 text-center">
          <p className="text-[15px] text-secondary">
            You&apos;re signed in. Campaign upload and TRIBE scoring will connect here
            next.
          </p>
        </div>
      </main>
    </div>
  );
}
