import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type UserContextType = {
  userId: string | null;
  setUserId: (id: string | null) => Promise<void>;
  user: any;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  userId: null,
  setUserId: async () => {},
  user: null,
  isLoading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserIdState] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync user profile and state loading on startup
  useEffect(() => {
    async function initUser() {
      try {
        setIsLoading(true);
        const storedId = await AsyncStorage.getItem("user_id");
        if (storedId) {
          setUserIdState(storedId);
          const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
          const response = await fetch(`${baseUrl}/api/users/${storedId}/profile`);
          if (response.ok) {
            const data = await response.json();
            setUser(data.profile);
          }
        } else {
          setUserIdState(null);
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to initialize user in context", err);
      } finally {
        setIsLoading(false);
      }
    }
    initUser();
  }, []);

  const setUserId = async (id: string | null) => {
    try {
      if (id) {
        await AsyncStorage.setItem("user_id", id);
        setUserIdState(id);
        const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${baseUrl}/api/users/${id}/profile`);
        if (response.ok) {
          const data = await response.json();
          setUser(data.profile);
        }
      } else {
        await AsyncStorage.removeItem("user_id");
        setUserIdState(null);
        setUser(null);
      }
    } catch (err) {
      console.error("Error persisting user id", err);
    }
  };

  const refreshUser = async () => {
    if (!userId) return;
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/api/users/${userId}/profile`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.profile);
      }
    } catch (err) {
      console.error("Error refreshing user", err);
    }
  };

  const logout = async () => {
    await setUserId(null);
  };

  return (
    <UserContext.Provider value={{ userId, setUserId, user, isLoading, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
