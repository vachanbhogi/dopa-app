"use client";

export function SettingsTab({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[14px] leading-6 text-secondary">
          Manage your account and workspace preferences.
        </p>
      </div>

      <div className="dopa-panel space-y-5 p-6">
        <div>
          <h2 className="text-[15px] font-medium text-white">Account</h2>
          <p className="mt-1 text-[13px] text-secondary">
            Your Dopa login and profile details.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-[12px] font-medium text-secondary">Name</p>
            <p className="rounded-lg border border-white/10 bg-[#0c0d0e] px-3 py-2.5 text-[14px] text-white">
              {displayName}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[12px] font-medium text-secondary">Email</p>
            <p className="rounded-lg border border-white/10 bg-[#0c0d0e] px-3 py-2.5 text-[14px] text-white">
              {email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
