"use client";

import { useRef, useState } from "react";
import { useReveal, usePanel } from "@/components/landing/motion";

interface Card {
  topic: string;
  question: string;
  answer: string;
  tone: string;
}

const CARDS: Card[] = [
  {
    topic: "How it works",
    question: "How does a tunnel actually work?",
    answer:
      "The CLI opens one persistent outbound connection to the gateway. Public requests arriving on your subdomain are forwarded back through that connection to the port your local server listens on, so nothing on your machine needs to be exposed directly.",
    tone: "var(--surface-3)",
  },
  {
    topic: "Pricing",
    question: "Is it free?",
    answer:
      "Yes. The Free plan has no expiry: one concurrent tunnel, 5,000 requests per day and 10 GB of bandwidth per month. Paid tiers for more tunnels and reserved subdomains are coming, with no launch date yet.",
    tone: "var(--surface-2)",
  },
  {
    topic: "Domains",
    question: "Do I need my own domain?",
    answer:
      "No. Every tunnel gets a random HTTPS subdomain under indotunnel.id with a valid certificate. The Developer and Team plans add reserved subdomains and a custom CNAME.",
    tone: "var(--surface-3)",
  },
  {
    topic: "Webhooks",
    question: "Can I replay a webhook?",
    answer:
      "Yes. Captured requests are stored in the dashboard with their headers and payload, and any of them can be replayed against your local server with one click instead of re-triggering the original sender.",
    tone: "var(--surface-3)",
  },
  {
    topic: "Protocols",
    question: "Which protocols are supported?",
    answer:
      "HTTP/1.1, HTTP/2, WebSocket and server-sent events. Streaming connections are multiplexed over the same tunnel, so long-lived sockets work the same way as ordinary requests.",
    tone: "var(--surface-2)",
  },
];

function Card({
  card,
  index,
  open,
  onOpen,
}: {
  card: Card;
  index: number;
  open: boolean;
  onOpen: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  usePanel(panel, open);

  return (
    <div
      data-rise
      className="overflow-hidden rounded-md"
      style={{ backgroundColor: card.tone }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        aria-controls={`faq-${index}`}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-[18px] font-medium text-[color:var(--ink)]">
          {card.question}
        </span>
        <span className="shrink-0 text-[13px] text-[color:var(--ink-muted)]">
          {card.topic}
        </span>
      </button>
      <div
        id={`faq-${index}`}
        ref={panel}
        className="grid"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        aria-hidden={!open}
        inert={!open}
      >
        <div
          className="overflow-hidden"
          style={{ visibility: open ? "visible" : "hidden" }}
        >
          <p
            className="max-w-[50ch] px-6 pb-6 text-[color:var(--ink-muted)]"
            style={{ fontSize: "var(--step-body)" }}
          >
            {card.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Faq() {
  const ref = useRef<HTMLElement>(null);
  const [openId, setOpenId] = useState(0);
  useReveal(ref, "[data-rise]");

  return (
    <section
      id="faq"
      ref={ref}
      className="mx-auto max-w-[1600px] px-5 py-28 sm:px-8"
    >
      <h2
        data-rise
        className="mx-auto mb-16 max-w-[12ch] text-center font-medium leading-[1.0] tracking-[-0.02em] text-[color:var(--ink)]"
        style={{ fontSize: "var(--step-head)" }}
      >
        Questions, answered
      </h2>

      <div className="mx-auto max-w-3xl space-y-3">
        {CARDS.map((card, i) => (
          <Card
            key={card.topic}
            card={card}
            index={i}
            open={i === openId}
            onOpen={() => setOpenId(i)}
          />
        ))}
      </div>
    </section>
  );
}
