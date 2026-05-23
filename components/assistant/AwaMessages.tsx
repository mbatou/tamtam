"use client";

import { useEffect, useRef } from "react";
import type { AwaMessage } from "@/types/awa";

export default function AwaMessages({
  messages,
  sending,
}: {
  messages: AwaMessage[];
  sending: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`rounded-[10px] px-[11px] py-[9px] text-[12px] leading-[1.55] font-dm max-w-[88%] whitespace-pre-wrap ${
            msg.role === "user" ? "self-end ml-auto" : ""
          }`}
          style={
            msg.role === "user"
              ? {
                  background: "rgba(211,84,0,0.12)",
                  border: "0.5px solid rgba(211,84,0,0.2)",
                  color: "rgba(255,255,255,0.75)",
                }
              : {
                  background: "rgba(255,255,255,0.05)",
                  border: "0.5px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.8)",
                }
          }
        >
          {msg.role === "assistant" && msg.content === "" && sending ? (
            <div className="flex gap-1 py-0.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-[5px] h-[5px] rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.3)",
                    animation: `awaTypingDot 1.2s infinite ${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          ) : (
            msg.content
          )}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
