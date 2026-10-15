"use client";

import { useRef, useState } from "react";
import { useReveal } from "@/components/landing/motion";

export function Cta() {
  const ref = useRef<HTMLElement>(null);
  const [name, setName] = useState("my-workspace");
  const [scope, setScope] = useState<"personal" | "team">("personal");
  useReveal(ref, "[data-rise]");

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: "var(--brand)", minHeight: "90svh" }}
    >
      <div className="mx-auto grid max-w-[1600px] gap-16 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:items-center lg:py-0 lg:min-h-[90svh]">
        <div className="lg:col-span-5 lg:self-end lg:pb-20">
          <h2
            data-rise
            className="font-medium leading-[0.92] tracking-[-0.03em]"
            style={{ fontSize: "clamp(44px, 7vw, 112px)", color: "var(--brand-ink)" }}
          >
            Start in
            <br />
            seconds
          </h2>
          <p
            data-rise
            className="mt-6 max-w-[36ch] text-[17px]"
            style={{ color: "var(--brand-ink)" }}
          >
            Name your workspace and you are on the dashboard with your first
            tunnel ready to open.
          </p>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <div
            data-rise
            data-ui
            className="mx-auto w-full max-w-[440px] rounded-lg bg-white p-6 text-[#111]"
            style={{ boxShadow: "0 24px 60px -20px rgba(0,0,0,0.45)" }}
          >
            <h3 className="text-[18px] font-semibold">Name your workspace</h3>
            <p className="mt-1 text-[14px] text-[#6b6b6b]">
              You can rename this later in settings.
            </p>

            <label className="mt-6 block text-[13px] font-medium text-[#111]">
              Workspace name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-md border border-[#d4d4d4] px-3 py-2 text-[15px] outline-none focus:border-[#111111]"
              />
            </label>

            <div className="mt-5">
              <span className="text-[13px] font-medium text-[#111]">Type</span>
              <div
                className="mt-2 flex rounded-md p-1"
                style={{ backgroundColor: "#f4f4f4" }}
                role="group"
                aria-label="Workspace type"
              >
                {(["personal", "team"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setScope(option)}
                    aria-pressed={scope === option}
                    className="flex-1 rounded px-3 py-2 text-[14px] font-medium capitalize transition-colors"
                    style={{
                      backgroundColor: scope === option ? "#111111" : "transparent",
                      color: scope === option ? "#ffffff" : "#6b6b6b",
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="mt-6 w-full rounded-md py-3 text-[15px] font-medium text-white transition-transform active:scale-[0.98]"
              style={{ backgroundColor: "#111111" }}
            >
              Create {scope} workspace
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
