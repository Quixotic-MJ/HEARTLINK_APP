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

const DEFAULT_PROFILE_CACHE_KEY = "@user_profile_cache";

function getProfileCacheKey(id?: string | null): string {
  return id ? `@user_profile_cache_${id}` : DEFAULT_PROFILE_CACHE_KEY;
}

function sanitizeProfileForCache(profile: any): any {
  if (!profile || typeof profile !== "object") return profile;
  const sanitized = { ...profile };
  delete sanitized.password;
  delete sanitized.password_hash;
  delete sanitized.token;
  delete sanitized.secret;
  delete sanitized.service_role_key;
  return sanitized;
}

function buildEnrichedUserProfile(data: any): any {
  if (!data || !data.profile) return data?.profile || null;
  return {
    ...data.profile,
    baselines: data.baselines || null,
    conditions: data.baselines?.clinical?.diagnosed_conditions || [],
    care_team: data.care_team || [],
  };
}

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
          const userCacheKey = getProfileCacheKey(storedId);
          const cachedProfileStr = (await AsyncStorage.getItem(userCacheKey)) || (await AsyncStorage.getItem(DEFAULT_PROFILE_CACHE_KEY));
          
          let cachedProfile = null;
          if (cachedProfileStr) {
            try {
              cachedProfile = JSON.parse(cachedProfileStr);
              setUser(cachedProfile);
            } catch (e) {
              console.warn("Failed to parse cached user profile", e);
            }
          }

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
              const freshProfile = buildEnrichedUserProfile(data);
              setUser(freshProfile);
              await AsyncStorage.setItem(userCacheKey, JSON.stringify(sanitizeProfileForCache(freshProfile)));
              
              // Trigger foreground auto-sync for any pending offline logs
              syncOfflineMeals(baseUrl).catch(e => console.log("Background sync error:", e));
              syncOfflineExercises(baseUrl).catch(e => console.log("Background sync error:", e));
              syncOfflineSleeps(baseUrl).catch(e => console.log("Background sync error:", e));
            } else if (response.status === 401 || response.status === 403) {
              console.warn(`[UserContext] Profile fetch returned ${response.status}. Invalidating session.`);
              await AsyncStorage.removeItem("user_id");
              await AsyncStorage.removeItem("access_token");
              await AsyncStorage.removeItem(userCacheKey);
              await AsyncStorage.removeItem(DEFAULT_PROFILE_CACHE_KEY);
              setUserIdState(null);
              setTokenState(null);
              setUser(null);
            } else {
              // Server error (500 etc) - keep cached user profile if available
              if (!cachedProfile) {
                setProfileError(true);
              }
            }
          } catch (fetchErr) {
            console.error("Network error fetching user profile during init", fetchErr);
            if (!cachedProfile) {
              setProfileError(true);
            }
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
            const freshProfile = buildEnrichedUserProfile(data);
            setUser(freshProfile);
            await AsyncStorage.setItem(getProfileCacheKey(id), JSON.stringify(sanitizeProfileForCache(freshProfile)));
          } else {
            setProfileError(true);
          }
        } catch (fetchErr) {
          console.error("Failed to fetch profile after setUserId", fetchErr);
          setProfileError(true);
        }
      } else {
        if (userId) {
          try {
            const allKeys = await AsyncStorage.getAllKeys();
            const keysToRemove = allKeys.filter(k => k.includes(userId));
            if (keysToRemove.length > 0) {
              await AsyncStorage.multiRemove(keysToRemove);
            }
          } catch (cleanErr) {
            console.warn("Failed to clear user telemetry caches on logout", cleanErr);
          }
        }
        await AsyncStorage.removeItem("user_id");
        await AsyncStorage.removeItem("access_token");
        await AsyncStorage.removeItem(DEFAULT_PROFILE_CACHE_KEY);
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
        const freshProfile = buildEnrichedUserProfile(data);
        setUser(freshProfile);
        await AsyncStorage.setItem(getProfileCacheKey(userId), JSON.stringify(sanitizeProfileForCache(freshProfile)));
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


