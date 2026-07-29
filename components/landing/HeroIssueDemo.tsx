import { PriorityHigh, StatusInProgress } from "./icons";

function Avatar({
  initials,
  color,
  size = 18,
}: {
  initials: string;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full text-[9px] font-medium text-white"
      style={{ background: color, width: size, height: size }}
    >
      {initials}
    </span>
  );
}

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="mr-2 inline-flex h-4 w-4 items-center justify-center text-[#62666d]">
      {children}
    </span>
  );
}

function SidebarItem({
  label,
  active,
  count,
  icon,
  starred,
}: {
  label: string;
  active?: boolean;
  count?: string;
  icon?: React.ReactNode;
  starred?: boolean;
}) {
  return (
    <div
      className={`flex items-center rounded-md px-2 py-1.25 text-[12.5px] leading-none ${
        active
          ? "bg-white/[0.07] text-white"
          : "text-[#8a8f98] hover:bg-white/[0.035] hover:text-[#d0d6e0]"
      }`}
    >
      {icon ? <NavIcon>{icon}</NavIcon> : null}
      {starred ? (
        <span className="mr-2 text-[11px] text-[#f2c94c]">★</span>
      ) : null}
      <span className="truncate">{label}</span>
      {count ? (
        <span className="ml-auto pl-2 font-mono text-[11px] text-[#62666d]">
          {count}
        </span>
      ) : null}
    </div>
  );
}

export function HeroIssueDemo() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/8 bg-[#0f1011] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_30px_80px_rgba(0,0,0,0.55)]">
      <div className="relative grid min-h-140 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
        <aside className="hidden border-r border-white/6 bg-[#0c0d0e] p-2.5 lg:block">
          <div className="mb-3 flex items-center gap-2 px-2 py-1.5">
            <span className="flex h-4.5 w-4.5 items-center justify-center rounded-sm bg-[#5e6ad2] text-[10px] font-semibold text-white">
              A
            </span>
            <span className="text-[12.5px] font-medium text-[#d0d6e0]">Workspace</span>
            <span className="ml-auto text-[10px] text-[#62666d]">▾</span>
          </div>

          <div className="space-y-0.5">
            <SidebarItem
              label="Inbox"
              icon={
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M2 3.5h12v2.2L8.7 9.2a1.2 1.2 0 0 1-1.4 0L2 5.7V3.5Zm0 3.4 4.8 3.3a2.4 2.4 0 0 0 2.4 0L14 6.9V12a.75.75 0 0 1-.75.75H2.75A.75.75 0 0 1 2 12V6.9Z" />
                </svg>
              }
            />
            <SidebarItem
              label="Creatives"
              icon={
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                  <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              }
            />
            <SidebarItem
              label="Scores"
              icon={
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M3 4.5h10v1.2H3V4.5Zm0 3h7v1.2H3V7.5Zm0 3h9v1.2H3V10.5Z" />
                </svg>
              }
            />
            <SidebarItem
              label="Brain"
              icon={
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M2 8h2.2l1.4-3 2.2 6 1.6-3H14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
          </div>

          <div className="mt-5 px-2 text-[11px] font-medium text-[#62666d]">
            Workspace
          </div>
          <div className="mt-1 space-y-0.5">
            <SidebarItem label="Campaigns" />
            <SidebarItem label="Variants" />
            <SidebarItem label="More" />
          </div>

          <div className="mt-5 px-2 text-[11px] font-medium text-[#62666d]">
            Favorites
          </div>
          <div className="mt-1 space-y-0.5">
            <SidebarItem label="Summer drop · unbox" active starred count="05/12" />
            <SidebarItem label="TRIBE queue" />
            <SidebarItem label="A/B sims" />
            <SidebarItem label="Competitors" />
          </div>
        </aside>

        <section className="border-r border-white/6 p-6 md:p-8">
          <h3 className="max-w-130 text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] text-white md:text-[34px]">
            Summer drop · unbox hook
          </h3>
          <p className="mt-4 max-w-130 text-[13.5px] leading-6 text-[#8a8f98]">
            Run creative through{" "}
            <code className="rounded-sm bg-white/6 px-1.5 py-px font-mono text-[12px] text-[#d0d6e0]">
              TRIBE v2
            </code>{" "}
            cortical encoding, then dopa-model predicts average click-through
            rate before spend.
          </p>

          <div className="mt-10">
            <div className="mb-4 text-[13px] font-medium text-[#d0d6e0]">Activity</div>
            <div className="space-y-5">
              <Activity
                avatar={<Avatar initials="D" color="#5e6ad2" />}
                name="Dopa"
                time="2min ago"
                body={
                  <>
                    scored the creative via TRIBE v2 for{" "}
                    <span className="text-[#d0d6e0]">maya</span>
                  </>
                }
              />
              <Activity
                avatar={<Avatar initials="TI" color="#3d4450" />}
                name="Dopa model"
                time="2min ago"
                body={
                  <>
                    returned <Chip>Predicted CTR 2.84%</Chip> with{" "}
                    <Chip>cortical playback</Chip>
                  </>
                }
              />
              <Activity
                avatar={<Avatar initials="M" color="#7a5af8" />}
                name="maya"
                time="4 min ago"
                body={
                  <span>
                    Live A/B is too slow — can we kill the weak cut before it burns
                    budget?
                  </span>
                }
              />
              <Activity
                avatar={<Avatar initials="A" color="#27a644" />}
                name="alex"
                time="just now"
                body={
                  <span>
                    <span className="text-[#828fff]">@Dopa</span> score this cut and
                    propose an A/B replacement
                  </span>
                }
              />
              <div className="rounded-lg border border-white/8 bg-white/2.5 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px]">
                  <Avatar initials="D" color="#5e6ad2" />
                  <span className="font-medium text-white">Dopa</span>
                  <span className="text-[#8a8f98]">
                    connected by alex · 2 min ago
                  </span>
                </div>
                <div className="text-[13px] text-[#8a8f98]">
                  Ran cortical encode → CTR ·{" "}
                  <span className="text-[#d0d6e0]">
                    Average-subject prediction ready for review
                  </span>
                </div>
                <div className="mt-2 text-[12px] text-[#62666d]">
                  Dopa moved creative from Queue to Boost · just now
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="hidden p-5 lg:block">
          <div className="mb-5">
            <div className="text-[12px] text-[#62666d]">AD-1942</div>
          </div>
          <div className="space-y-4 text-[12.5px]">
            <Prop label="Status">
              <span className="inline-flex items-center gap-1.5 text-[#d0d6e0]">
                <StatusInProgress /> In Progress
              </span>
            </Prop>
            <Prop label="Priority">
              <span className="inline-flex items-center gap-1.5 text-[#d0d6e0]">
                <PriorityHigh /> High
              </span>
            </Prop>
            <Prop label="Assignee">
              <span className="inline-flex items-center gap-1.5 text-[#d0d6e0]">
                <Avatar initials="A" color="#27a644" size={16} /> alex
              </span>
            </Prop>
            <Prop label="">
              <span className="inline-flex items-center gap-1.5 text-[#d0d6e0]">
                <Avatar initials="D" color="#5e6ad2" size={16} /> Dopa
              </span>
            </Prop>
            <Prop label="Labels">
              <span className="flex flex-wrap gap-1">
                <Chip>Video</Chip>
                <Chip>TRIBE</Chip>
              </span>
            </Prop>
            <Prop label="Cycle">
              <span className="text-[#d0d6e0]">Flight 12</span>
            </Prop>
            <Prop label="Project">
              <span className="text-[#d0d6e0]">Summer Drop</span>
            </Prop>
          </div>
        </aside>
      </div>

      {/* Floating agent panel — matches Linear hero */}
      <div className="absolute bottom-6 right-6 z-10 hidden w-[320px] overflow-hidden rounded-[10px] border border-white/10 bg-[#141516]/95 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-md md:block">
        <div className="flex items-center gap-2 border-b border-white/6 px-3 py-2.5">
          <Avatar initials="D" color="#5e6ad2" size={16} />
          <span className="text-[12px] font-medium text-white">Dopa</span>
          <span className="rounded bg-[#5e6ad2]/25 px-1.5 py-px text-[10px] text-[#828fff]">
            TRIBE v2
          </span>
          <span className="ml-auto text-[11px] text-[#62666d]">AD-1942</span>
        </div>
        <div className="space-y-2 px-3 py-3 font-mono text-[11px] leading-5 text-[#8a8f98]">
          <p>
            alex connected Dopa to{" "}
            <span className="text-[#d0d6e0]">AD-1942</span>
          </p>
          <p className="text-[#d0d6e0]">Running TRIBE v2 cortical encode...</p>
          <p className="flex items-center gap-2 text-[#62666d]">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#828fff]" />
            Thinking...
          </p>
          <div className="rounded-md border border-white/6 bg-black/30 px-2 py-1.5 text-[10px]">
            <div className="text-[#62666d]">brain_video → mean CTR head</div>
            <div className="text-emerald-400/90">
              Predicted average CTR 2.84%
            </div>
          </div>
          <p className="text-[#62666d]">Worked for 7s</p>
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-sm bg-white/6 px-1.5 py-0.5 text-[11px] text-[#8a8f98]">
      {children}
    </span>
  );
}

function Prop({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-2">
      <div className="text-[#62666d]">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function Activity({
  avatar,
  name,
  time,
  body,
}: {
  avatar: React.ReactNode;
  name: string;
  time: string;
  body: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5 text-[13px] leading-5">
      <div className="mt-0.5">{avatar}</div>
      <div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium text-white">{name}</span>
          <span className="text-[#62666d]">{time}</span>
        </div>
        <div className="mt-0.5 text-[#8a8f98]">{body}</div>
      </div>
    </div>
  );
}
