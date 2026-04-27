import { useWebSocket } from "../hooks/useWebSocket";

export default function DebugRoom({ roomId }) {
  const { messages, send } = useWebSocket(roomId);

  return (
    <div>
      <p>Room: {roomId} - Messages: {messages.length}</p>
      <button onClick={() => send("test message from React")}>Send test</button>
      <pre>{JSON.stringify(messages.slice(-3), null, 2)}</pre>
    </div>
  );
}
