import { useState } from "react";

export default function RoomSidebar({ rooms, activeRoom, onSelect, onJoin }) {
  const [newRoom, setNewRoom] = useState("");

  function handleJoin() {
    const name = newRoom.trim().toLowerCase().replace(/\s+/g, "-");
    if (name) {
      onJoin(name);
      setNewRoom("");
    }
  }

  return (
    <div
      style={{ width: "180px", borderRight: "1px solid #ccc", padding: "12px" }}
    >
      <h4 style={{ marginTop: 0 }}>Rooms</h4>

      {rooms.map((room) => (
        <div
          key={room}
          onClick={() => onSelect(room)}
          style={{
            padding: "8px",
            borderRadius: "4px",
            cursor: "pointer",
            background: room === activeRoom ? "#e0e7ff" : "transparent",
            fontWeight: room === activeRoom ? "bold" : "normal",
          }}
        >
          # {room}
        </div>
      ))}

      <div
        style={{
          marginTop: "16px",
          borderTop: "1px solid #eee",
          paddingTop: "12px",
        }}
      >
        <input
          value={newRoom}
          onChange={(e) => setNewRoom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder="Room name..."
          style={{
            width: "100%",
            marginBottom: "6px",
            boxSizing: "border-box",
          }}
        />
        <button onClick={handleJoin} style={{ width: "100%" }}>
          + Create / Join
        </button>
      </div>
    </div>
  );
}
