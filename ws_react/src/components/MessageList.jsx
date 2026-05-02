import { useEffect, useRef } from "react";

export default function MessageList({ messages }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  // Jump to bottom when history first loads
  const hasScrolledToBottom = useRef(false);

  useEffect(() => {
    if (messages.length === 0) {
      hasScrolledToBottom.current = false;
      return;
    }
    if (!hasScrolledToBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      hasScrolledToBottom.current = true;
    }
  }, [messages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Only auto-scroll if within 100px of the bottom
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;

    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      style={{
        height: "400px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "12px",
        border: "1px solid #ccc",
      }}
    >
      {messages.map((msg, i) => (
        <div
          key={i}
          style={{
            opacity: msg.pending ? 0.6 : 1,
            fontStyle: msg.pending ? "italic" : "normal",
            padding: "4px 8px",
            background: "#1f1f1f",
            borderRadius: "4px",
          }}
        >
          <strong>{msg.sender}</strong>
          <span
            style={{ marginLeft: "8px", fontSize: "0.85em", color: "#888" }}
          >
            {new Date(msg.timestamp).toLocaleTimeString()}
          </span>
          <p style={{ margin: "4px 0 0 " }}>{msg.body}</p>
          {/* {msg.pending && (
            <span style={{ fontSize: "0.75em", color: "#aaa" }}>
              (sending...)
            </span>
          )} */}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
