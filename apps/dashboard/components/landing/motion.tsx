"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Reveals the elements matching `selector` inside `ref` once, in reading
 * order. Runs only under prefers-reduced-motion: no-preference, so the
 * reduced-motion state is simply the finished state.
 */
export function useReveal<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  selector: string,
) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const targets = gsap.utils.toArray<HTMLElement>(
          `${selector}`,
          ref.current ?? undefined,
        );
        if (!targets.length) return;
        gsap.fromTo(
          targets,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.08,
            scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
}

/**
 * The signature move: the stage opens from its bottom edge while the fragment
 * inside settles from a slight scale. Call only inside a
 * prefers-reduced-motion: no-preference block.
 */
export function shutter(el: Element | null) {
  if (!el) return;
  gsap.fromTo(
    el,
    { clipPath: "inset(0 0 100% 0)", scale: 1.12 },
    {
      clipPath: "inset(0 0 0% 0)",
      scale: 1,
      duration: 1.1,
      ease: "power2.inOut",
    },
  );
}

export function useShutter<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      shutter(ref.current);
    });
    return () => mm.revert();
  }, { scope: ref });
}

export { gsap, ScrollTrigger, useGSAP };
