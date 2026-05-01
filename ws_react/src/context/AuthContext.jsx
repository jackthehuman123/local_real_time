import { createContext, useContext, useState } from "react";
import { getCookie } from "../utils/cookies";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  async function loginUser(username, password) {
    // const apiBase = import.meta.env.VITE_API_BASE_URL;

    // Step 1: GET /api/csrf/ so Django sets the csrftoken cookie
    await fetch(`/api/csrf/`);

    // Step 2: POST credentials - include csrftoken cookie value as header
    const response = await fetch(`/api/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    });

    if (!response.ok) throw new Error("Login failed");
    const data = await response.json();
    setUser(data.username);
  }

  function logoutUser() {
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, login: loginUser, logout: logoutUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
