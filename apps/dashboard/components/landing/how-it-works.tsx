"use client";

import { useRef, useState } from "react";
import { useReveal } from "@/components/landing/motion";

interface Step {
  id: string;
  name: string;
  body: string;
  command: string;
  tone: string;
}

const STEPS: Step[] = [
  {
    id: "step-1",
    name: "Run the CLI",
    body: "No install needed with npx, or install globally via npm. Point it at the port your server listens on.",
    command: "npx indotunnel 3000",
    tone: "var(--surface-3)",
  },
  {
    id: "step-2",
    name: "Get a public URL",
    body: "The gateway hands you a secure HTTPS subdomain forwarded straight to your local server.",
    command: "https://*.indotunnel.id",
    tone: "var(--surface-2)",
  },
  {
    id: "step-3",
    name: "Inspect and replay",
    body: "Open the dashboard to read live traffic, headers and payloads, then replay any request.",
    command: "/dashboard",
    tone: "var(--surface)",
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const [openId, setOpenId] = useState(STEPS[0].id);
  useReveal(ref, "[data-rise]");

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="mx-auto max-w-[1600px] px-5 py-28 sm:px-8"
    >
      <div className="grid gap-10 lg:grid-cols-12">
        <h2
          data-rise
          className="font-medium leading-[1.0] tracking-[-0.02em] text-[color:var(--ink)] lg:col-span-5"
          style={{ fontSize: "var(--step-head)" }}
        >
          Three steps to a public URL
        </h2>
        <p
          data-rise
          className="text-[color:var(--ink-muted)] lg:col-span-5 lg:col-start-8"
          style={{ fontSize: "var(--step-body)" }}
        >
          No SSH configuration, no router port-forwarding. The agent holds one
          outbound connection to the gateway and public requests travel back
          through it.
        </p>
      </div>

      <div className="mt-16 flex flex-col gap-2 lg:flex-row lg:gap-0">
        {STEPS.map((step) => {
          const open = step.id === openId;
          return (
            <div
              key={step.id}
              data-rise
              className="overflow-hidden rounded-md lg:transition-[flex-grow]"
              style={{
                backgroundColor: step.tone,
                flexGrow: open ? 3 : 1,
                flexBasis: 0,
                transitionDuration: "var(--t-ui)",
                transitionTimingFunction: "var(--ease-out)",
              }}
            >
              <button
                type="button"
                onClick={() => setOpenId(step.id)}
                aria-expanded={open}
                aria-controls={`${step.id}-panel`}
                className="flex w-full items-center justify-between px-6 py-5 text-left lg:h-full lg:flex-col lg:items-start lg:justify-end lg:gap-6"
              >
                <span
                  className="text-[20px] font-medium text-[color:var(--ink)]"
                >
                  {step.name}
                </span>
                <span
                  className="text-[13px] text-[color:var(--ink-muted)] lg:hidden"
                  aria-hidden
                >
                  {open ? "Close" : "Open"}
                </span>
              </button>

              <div
                id={`${step.id}-panel`}
                hidden={!open}
                className="px-6 pb-6"
              >
                <p
                  className="max-w-[42ch] text-[color:var(--ink-muted)]"
                  style={{ fontSize: "var(--step-body)" }}
                >
                  {step.body}
                </p>
                <pre
                  className="mt-5 inline-block rounded-md px-4 py-3 text-[14px] text-[color:var(--ink)]"
                  style={{ backgroundColor: "var(--bg)" }}
                >
                  {step.command}
                </pre>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
