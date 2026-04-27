import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginForm from "./components/LoginForm";
import DebugRoom from "./components/DebugRoom";

function AppInner() {
  const { user } = useAuth();
  if (!user) return <LoginForm />;
  // return <div>Welcome, {user}. (Chat UI goes here)</div>;
  return <DebugRoom roomId="room1" />; // Testing
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
