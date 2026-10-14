import { Stagger, StaggerItem } from "@/components/landing/reveal";

const STEPS = [
  {
    num: "01",
    title: "Run via NPX or CLI",
    body: "No installation required with NPX, or install globally via npm or binary.",
    snippet: (
      <>
        <span className="text-emerald-400">npx</span> indotunnel 3000
      </>
    ),
  },
  {
    num: "02",
    title: "Instant Public URL",
    body: "Get a secure HTTPS public URL forwarded directly to your local server.",
    snippet: (
      <>
        Public ➔ <span className="text-emerald-400">https://*.indotunnel.id</span>
      </>
    ),
  },
  {
    num: "03",
    title: "Inspect & Replay",
    body: "Open the web dashboard to inspect live traffic, headers, and replay webhooks.",
    snippet: (
      <>
        Dashboard ➔ <span className="text-emerald-400">/dashboard</span>
      </>
    ),
  },
];

export function Quickstart() {
  return (
    <section
      id="quickstart"
      className="border-t border-zinc-800/80 bg-slate-950/60 py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-16 max-w-2xl space-y-3 text-center">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Workflow
          </h2>
          <h3 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            3 Steps to Public Localhost
          </h3>
          <p className="text-sm text-zinc-400">
            No complex SSH configs or router port-forwarding required.
          </p>
        </div>

        <Stagger className="relative grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-5 hidden h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent md:block"
          />
          {STEPS.map((step) => (
            <StaggerItem key={step.num} className="relative space-y-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/40 bg-slate-950 font-mono text-sm font-bold text-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.25)]">
                {step.num}
              </div>
              <h4 className="text-lg font-semibold text-white">{step.title}</h4>
              <p className="text-xs leading-relaxed text-zinc-400">
                {step.body}
              </p>
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
                {step.snippet}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
