import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncOfflineMeals, syncOfflineExercises, syncOfflineSleeps } from "../services/SyncService";

type UserContextType = {
  userId: string | null;
  token: string | null;
  setUserId: (id: string | null, token?: string | null) => Promise<void>;
  user: any;
  isLoading: boolean;
  profileError: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  userId: null,
  token: null,
  setUserId: async () => {},
  user: null,
  isLoading: true,
  profileError: false,
  logout: async () => {},
  refreshUser: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserIdState] = useState<string | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<boolean>(false);

  // Sync user profile, token, and state loading on startup
  useEffect(() => {
    async function initUser() {
      try {
        setIsLoading(true);
        setProfileError(false);
        const storedId = await AsyncStorage.getItem("user_id");
        const storedToken = await AsyncStorage.getItem("access_token");
        
        if (storedId) {
          setUserIdState(storedId);
          setTokenState(storedToken);
          
          try {
            const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
            const effectiveToken = storedToken || "";
            const response = await fetch(`${baseUrl}/api/users/${storedId}/profile`, {
              headers: {
                "Authorization": `Bearer ${effectiveToken}`,
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              setUser(data.profile);
              // Trigger foreground auto-sync for any pending offline logs
              syncOfflineMeals(baseUrl).catch(e => console.log("Background sync error:", e));
              syncOfflineExercises(baseUrl).catch(e => console.log("Background sync error:", e));
              syncOfflineSleeps(baseUrl).catch(e => console.log("Background sync error:", e));
            } else {
              setProfileError(true);
            }
          } catch (fetchErr) {
            console.error("Failed to fetch user profile (offline?)", fetchErr);
            setProfileError(true);
          }
        } else {
          setUserIdState(null);
          setTokenState(null);
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

  const setUserId = async (id: string | null, newToken?: string | null) => {
    try {
      setProfileError(false);
      if (id) {
        await AsyncStorage.setItem("user_id", id);
        setUserIdState(id);
        
        if (newToken) {
          await AsyncStorage.setItem("access_token", newToken);
          setTokenState(newToken);
        } else {
          const currentToken = await AsyncStorage.getItem("access_token");
          setTokenState(currentToken);
        }
        
        try {
          const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
          const effectiveToken = newToken || (await AsyncStorage.getItem("access_token")) || "";
          const response = await fetch(`${baseUrl}/api/users/${id}/profile`, {
            headers: {
              "Authorization": `Bearer ${effectiveToken}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setUser(data.profile);
          } else {
            setProfileError(true);
          }
        } catch (fetchErr) {
          console.error("Failed to fetch profile after setUserId", fetchErr);
          setProfileError(true);
        }
      } else {
        await AsyncStorage.removeItem("user_id");
        await AsyncStorage.removeItem("access_token");
        setUserIdState(null);
        setTokenState(null);
        setUser(null);
      }
    } catch (err) {
      console.error("Error persisting user credentials", err);
    }
  };

  const refreshUser = async () => {
    if (!userId) return;
    try {
      setProfileError(false);
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
      const effectiveToken = token || (await AsyncStorage.getItem("access_token")) || "";
      const response = await fetch(`${baseUrl}/api/users/${userId}/profile`, {
        headers: {
          "Authorization": `Bearer ${effectiveToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.profile);
      } else {
        setProfileError(true);
      }
    } catch (err) {
      console.error("Error refreshing user", err);
      setProfileError(true);
    }
  };

  const logout = async () => {
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
      const effectiveToken = token || (await AsyncStorage.getItem("access_token"));
      if (effectiveToken) {
        await fetch(`${baseUrl}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${effectiveToken}`,
          },
        }).catch(() => {});
      }
    } catch (e) {
      // Ignore network errors during logout
    } finally {
      await setUserId(null, null);
    }
  };

  return (
    <UserContext.Provider value={{ userId, token, setUserId, user, isLoading, profileError, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}


