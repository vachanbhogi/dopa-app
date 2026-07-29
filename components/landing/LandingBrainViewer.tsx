/**
 * Static Brain section mock for the landing page — no 3D cortical model.
 */

const REGIONS = [
  {
    label: "V1 Early Visual",
    detail: "Primary visual cortex processing",
    value: "86%",
  },
  {
    label: "FFA Face / Form",
    detail: "Fusiform face & human form area",
    value: "72%",
  },
  {
    label: "MT Motion Track",
    detail: "Motion & pattern-interrupt tracking",
    value: "64%",
  },
  {
    label: "PPA Place Area",
    detail: "Scene & background recognition",
    value: "41%",
  },
] as const;

export function LandingBrainViewer() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/8 bg-[#0b0c0d] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-tertiary">
            Neural desk · scored
          </p>
          <p className="mt-0.5 truncate text-[14px] font-medium text-white">
            Summit Tee — UGC hook.mp4
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[5px] border border-brand/25 bg-brand/10 px-2.5 py-1 font-mono text-[12px] text-brand">
            CTR 2.84%
          </span>
          <span className="rounded-[5px] border border-white/10 px-2.5 py-1 text-[11px] text-secondary">
            4 regions
          </span>
          <span className="rounded-[5px] border border-white/10 px-2.5 py-1 text-[11px] text-secondary">
            12.0s clip
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-white/8 bg-[#0b0c0d] p-5 sm:p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-tertiary">
          Predicted CTR
        </p>
        <p className="mt-2 font-mono text-[44px] font-semibold leading-none tracking-[-0.04em] text-white">
          2.84%
        </p>
        <p className="mt-3 max-w-md text-[13px] leading-5 text-secondary">
          TRIBE v2 cortical evidence aggregated across visual parcels before
          spend.
        </p>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/6">
          <div className="h-full w-[72%] rounded-full bg-brand/80" />
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-tertiary">
          Confidence band · mid-high
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {REGIONS.map((roi) => (
          <div
            key={roi.label}
            className="rounded-lg border border-white/6 bg-white/2 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-white">{roi.label}</span>
              <span className="font-mono text-[12px] font-semibold text-brand">
                {roi.value}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full bg-brand/60"
                style={{ width: roi.value }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-tertiary">{roi.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
