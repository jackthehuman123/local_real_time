import {
  useEffect,
  useRef,
  useState,
  useCallback,
  startTransition,
} from "react";
import { useOptimistic } from "react";

export function useWebSocket(roomId) {
  const [messages, setMessages] = useState([]);
  // "connecting" | "open" | "disconnected"
  const [status, setStatus] = useState("disconnected");
  const wsRef = useRef(null);
  const retryDelay = useRef(1000); // ms
  const retryTimer = useRef(null);
  const shouldReconnect = useRef(true);

  //? Uncomment for exercise 8
  // const [optimisticMessages, addOptimisticMessage] = useOptimistic(
  //   messages,
  //   (state, newMessage) => [...state, newMessage],
  // );

  //? Uncomment for exercise 8
  // const send = useCallback(
  //   (messageText, senderUsername) => {
  //     // Optimistically add to UI immediately
  //     startTransition(() => {
  //       addOptimisticMessage({
  //         body: messageText,
  //         sender: senderUsername,
  //         timestamp: new Date().toISOString(), //! Browser vs Server clock (clock skew)
  //         pending: true, // flag for styling
  //       });
  //     });

  //     // Send over WebSocket - server will echo back, which updates "messages"
  //     if (wsRef.current?.readyState === WebSocket.OPEN) {
  //       wsRef.current.send(JSON.stringify({ message: messageText }));
  //     }
  //   },
  //   [addOptimisticMessage],
  // );

  useEffect(() => {
    if (!roomId) return;

    shouldReconnect.current = true;
    retryDelay.current = 1000;

    function connect() {
      setStatus("connecting");
      const ws = new WebSocket(`/ws/chat/${roomId}/`);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("open");
        retryDelay.current = 1000;
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
          setMessages((prev) => {
            const updated = [
              ...prev,
              {
                body: data.message,
                sender: data.sender,
                timestamp: data.timestamp,
                seq: data.seq,
              },
            ];
            return updated.sort(
              (a, b) => (a.seq ?? Infinity) - (b.seq ?? Infinity),
            );
          });
        }
      };

      ws.onclose = (event) => {
        setStatus("disconnected");
        if (!shouldReconnect.current) return;

        console.log(`[ws] closed. Retrying in ${retryDelay.current} ms...`);
        retryTimer.current = setTimeout(() => {
          retryDelay.current = Math.min(retryDelay.current * 2, 30000);
          connect();
        }, retryDelay.current);
      };

      ws.onerror = (error) => {
        console.log("[ws] error:", error);
        ws.close();
      };
    }

    connect();

    // Cleanup: close connection when roomId changes or components unmounts
    return () => {
      //? Since we are calling ws.close(), we need to clear retry states
      shouldReconnect.current = false;
      clearTimeout(retryTimer.current);
      wsRef.current?.close();
    };
  }, [roomId]);

  const send = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ message }));
    }
  }, []);

  return { messages, send, status };
}
