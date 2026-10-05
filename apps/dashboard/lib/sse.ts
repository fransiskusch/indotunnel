"use client";

import { useEffect, useRef } from "react";

export type SSEEvent = { type: string; data: any };

// useEvents subscribes to /api/events (SSE) and calls onEvent for each message.
export function useEvents(onEvent: (e: SSEEvent) => void) {
  const cb = useRef(onEvent);
  cb.current = onEvent;

  useEffect(() => {
    const es = new EventSource("/api/events");
    const handler = (type: string) => (ev: MessageEvent) => {
      let data: any = null;
      try {
        data = JSON.parse(ev.data);
      } catch {
        data = ev.data;
      }
      cb.current({ type, data });
    };
    const onRequest = handler("request");
    const onTunnel = handler("tunnel.status");
    es.addEventListener("request", onRequest);
    es.addEventListener("tunnel.status", onTunnel);
    return () => {
      es.removeEventListener("request", onRequest);
      es.removeEventListener("tunnel.status", onTunnel);
      es.close();
    };
  }, []);
}
