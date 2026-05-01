import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginForm from "./components/LoginForm";
import { useEffect, useState } from "react";
import InputBar from "./components/InputBar";
import RoomSidebar from "./components/RoomSidebar";
import { useWebSocket } from "./hooks/useWebSocket";
import MessageList from "./components/MessageList";

function AppInner() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const { messages, send, status } = useWebSocket(activeRoom); //? Pass in activeRoom ids
  const apiBase = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    if (!user) return;
    //! Any requests made to the backend requires credentials for authentication
    fetch(`/api/rooms/`, { credentials: "include" })
      .then((r) => r.json())
      // .then(console.log);
      .then((data) => {
        setRooms(data.rooms);
        if (data.rooms.length > 0) setActiveRoom(data.rooms[0]);
      });
  }, [user]);

  if (!user) return <LoginForm />;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <RoomSidebar
        rooms={rooms}
        activeRoom={activeRoom}
        onSelect={setActiveRoom}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            padding: "8px",
            borderBottom: "1px solid #eee",
            fontSize: "0.9em",
            color: "#888",
          }}
        >
          # {activeRoom} - {status}
        </div>
        <MessageList messages={messages} />
        <InputBar
          onSend={(text) => send(text, user)}
          disabled={status !== "open"}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
