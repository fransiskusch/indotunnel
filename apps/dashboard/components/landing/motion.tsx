"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const REDUCED = "(prefers-reduced-motion: reduce)";

/**
 * Section entrance, choreographed in reading order.
 *
 * Every element carrying `data-rise` inside `ref` arrives in DOM order,
 * staggered, rising a short distance with opacity. Runs once, the first time
 * the section enters, so scrolling back up never replays it.
 *
 * The hidden state lives in CSS under `html.js` (see globals.css), so a browser
 * with no JavaScript, or a visitor asking for reduced motion, sees the finished
 * page rather than a blank one.
 */
export function useReveal<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  selector = "[data-rise]",
  options: { stagger?: number; rise?: number; start?: string } = {},
) {
  const { stagger = 0.08, rise = 24, start = "top 80%" } = options;
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`(prefers-reduced-motion: no-preference)`, () => {
        const targets = gsap.utils.toArray<HTMLElement>(selector, ref.current ?? undefined);
        if (!targets.length) return;
        gsap.fromTo(
          targets,
          { opacity: 0, y: rise },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            stagger,
            scrollTrigger: { trigger: ref.current, start, once: true },
          },
        );
        document.documentElement.classList.add("js-ready");
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
}

/**
 * The signature move named on the direction sheet: the stage opens from its
 * bottom edge like a shutter while the fragment inside settles from a slight
 * scale. Used once, on the hero stage.
 */
export function shutter(el: Element | null) {
  if (!el) return;
  gsap.fromTo(
    el,
    { clipPath: "inset(0 0 100% 0)", scale: 1.12 },
    { clipPath: "inset(0 0 0% 0)", scale: 1, duration: 1.1, ease: "power2.inOut" },
  );
}

export function useShutter<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`(prefers-reduced-motion: no-preference)`, () => {
        shutter(ref.current);
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
}

/**
 * Crossfade the contents of a stage when the selection changes, so a swapped
 * panel reads as one thing changing rather than the page blinking. The new
 * content fades in from just under its resting place; the height never jumps
 * because the stage keeps its own size.
 */
export function useSwap<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  key: string | number,
) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`(prefers-reduced-motion: no-preference)`, () => {
        if (!ref.current) return;
        gsap.fromTo(
          ref.current,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.28, ease: "power2.out" },
        );
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [key], revertOnUpdate: false },
  );
}

/**
 * A panel that opens to its content's real height. Uses `grid-template-rows`
 * from 0fr to 1fr so nothing is measured in JavaScript, and the content stays
 * in the DOM for the whole tween. Visibility is toggled at the end of the
 * tween so a closed panel leaves the box tree entirely, while the closing
 * animation still plays.
 */
export function usePanel<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  open: boolean,
) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`(prefers-reduced-motion: no-preference)`, () => {
        if (!ref.current) return;
        const inner = ref.current.firstElementChild as HTMLElement | null;
        gsap.to(ref.current, {
          gridTemplateRows: open ? "1fr" : "0fr",
          duration: 0.32,
          ease: "power2.out",
          onComplete: () => {
            if (inner) inner.style.visibility = open ? "visible" : "hidden";
          },
        });
        if (inner && open) inner.style.visibility = "visible";
        gsap.to(inner, {
          opacity: open ? 1 : 0,
          duration: open ? 0.32 : 0.18,
          ease: "power2.out",
          delay: open ? 0.08 : 0,
        });
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [open], revertOnUpdate: false },
  );
}

/**
 * A short vertical drift tied to scroll position, under 8% of the element, for
 * the one large stage on the page. Skipped entirely for reduced motion, and in
 * browsers that do not support scroll timelines the element simply sits still.
 */
export function useDrift<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  distance = 40,
) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`(prefers-reduced-motion: no-preference)`, () => {
        if (!ref.current) return;
        gsap.fromTo(
          ref.current,
          { yPercent: -distance / 20 },
          {
            yPercent: distance / 20,
            ease: "none",
            scrollTrigger: {
              trigger: ref.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
}

/**
 * Count a figure up once, when it first enters. The element keeps its final
 * value in the HTML, so this is an enhancement over already-real content.
 */
export function useCountUp<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`(prefers-reduced-motion: no-preference)`, () => {
        const target = ref.current;
        if (!target) return;
        const finalText = target.dataset.value ?? target.textContent ?? "";
        const final = Number(finalText.replace(/[^0-9.]/g, ""));
        if (!Number.isFinite(final)) return;
        const suffix = finalText.replace(/[0-9.,\s]/g, "");
        const counted = { n: 0 };
        gsap.to(counted, {
          n: final,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: { trigger: target, start: "top 85%", once: true },
          onUpdate: () => {
            target.textContent = `${Math.round(counted.n).toLocaleString()}${suffix}`;
          },
          onComplete: () => {
            target.textContent = finalText;
          },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
}

export { gsap, ScrollTrigger, useGSAP };
