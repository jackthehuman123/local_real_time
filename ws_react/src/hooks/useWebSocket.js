import { useEffect, useRef, useState, useCallback } from "react";

export function useWebSocket(roomId) {
  const [messages, setMessages] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    const ws = new WebSocket(`ws://localhost:5173/ws/chat/${roomId}/`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[ws] connected to room: ${roomId}`);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("[ws] received: ", data);

      if (data.type === "history") {
        // Replace message list with history from server
        setMessages(data.messages);
      } else if (data.type === "chat.message") {
        // Append live message
        setMessages(prev => [...prev, {
          body: data.message,
          sender: data.sender,
          timestamp: new Date().toISOString(),
        }]);
      }
    };

    ws.onclose = (event) => {
      console.log(`[ws] closed: code=${event.code}`);
    };

    ws.onerror = (error) => {
      console.log("[ws] error:", error);
    };

    // Cleanup: close connection when roomId changes or components unmounts
    return () => {
      ws.close();
    };
  }, [roomId]);

  const send = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ message }));
    }
  }, []);

  return { messages, send };
}
