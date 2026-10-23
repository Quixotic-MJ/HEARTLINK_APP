import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getToken, setToken, getRefreshToken, getUserId as getStoredUserId, setUserId as storeUserId, clearCredentials } from "../lib/secureTokenStore";
import { syncOfflineAll } from "../services/SyncService";
import { SessionTokens, storeSession, refreshSession, msUntilRefresh } from "../services/SessionService";
import { API_BASE_URL, apiFetch, setSessionEndedHandler } from "../lib/api";

type UserContextType = {
  userId: string | null;
  token: string | null;
  setUserId: (id: string | null, token?: string | null, session?: SessionTokens | null) => Promise<void>;
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
// setTimeout can't wait longer than ~24.8 days; one day is plenty, the timer is set again after each refresh
const MAX_REFRESH_TIMER_MS = 24 * 60 * 60 * 1000;

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
  const appState = useRef(AppState.currentState);

  // HL-047: renews the 24-hour access token when it is due. Returns the token to use,
  // or null when the session has ended (the refresh token was revoked or expired).
  const ensureFreshToken = async (): Promise<string | null> => {
    const wait = await msUntilRefresh();
    if (wait === null || wait > 0) return getToken();
    const result = await refreshSession();
    if (result.status === "refreshed") {
      setTokenState(result.token);
      return result.token;
    }
    return result.status === "expired" ? null : getToken();
  };

  // Same clean-up as the startup check below when the session is no longer valid
  const endSession = async () => {
    console.warn("[UserContext] Session ended. Logging out.");
    await clearCredentials();
    await AsyncStorage.removeItem(getProfileCacheKey(userId));
    await AsyncStorage.removeItem(DEFAULT_PROFILE_CACHE_KEY);
    setUserIdState(null);
    setTokenState(null);
    setUser(null);
  };

  const renewIfDue = async () => {
    const fresh = await ensureFreshToken();
    if (fresh === null) await endSession();
  };

  // HL-023: when any request finds the session can't be renewed, sign out the same way.
  // The ref always points at the latest endSession, so the handler is set once.
  const endSessionRef = useRef(endSession);
  useEffect(() => {
    endSessionRef.current = endSession;
  });
  useEffect(() => {
    setSessionEndedHandler(() => {
      endSessionRef.current();
    });
    return () => setSessionEndedHandler(null);
  }, []);

  // Background auto-sync trigger
  const attemptBackgroundSync = async () => {
    if (!userId) return;
    const baseUrl = API_BASE_URL;
    await syncOfflineAll(baseUrl).catch(e => console.log("Auto-sync error:", e));
  };

  // Setup listeners for AppState and NetInfo to handle offline queues
  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        console.log("App has come to the foreground, attempting sync...");
        if (userId) {
          renewIfDue().finally(() => attemptBackgroundSync());
        }
      }
      appState.current = nextAppState;
    });

    const unsubscribeNet = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        console.log("Network restored, attempting sync in 3 seconds...");
        setTimeout(() => attemptBackgroundSync(), 3000);
      }
    });

    return () => {
      subscription.remove();
      unsubscribeNet();
    };
  }, [userId]);

  // HL-047: while the app is open, renew the access token shortly before it expires
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    msUntilRefresh().then((wait) => {
      if (cancelled || wait === null) return;
      timer = setTimeout(() => {
        renewIfDue();
      }, Math.min(wait, MAX_REFRESH_TIMER_MS));
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [userId, token]);

  // Sync user profile, token, and state loading on startup
  useEffect(() => {
    async function initUser() {
      try {
        setIsLoading(true);
        setProfileError(false);
        const storedId = await getStoredUserId();
        const storedToken = await getToken();

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
            const baseUrl = API_BASE_URL;
            // HL-047: renew the access token first if it is due (null = the session has ended).
            // apiFetch adds the token and renews it once more on a 401 (HL-023).
            const freshToken = await ensureFreshToken();
            const response = freshToken === null ? null : await apiFetch(`/api/users/${storedId}/profile`);
            setTokenState(await getToken());

            if (response && response.ok) {
              const data = await response.json();
              const freshProfile = buildEnrichedUserProfile(data);
              setUser(freshProfile);
              await AsyncStorage.setItem(userCacheKey, JSON.stringify(sanitizeProfileForCache(freshProfile)));
              
              // Trigger foreground auto-sync for any pending offline logs
              syncOfflineAll(baseUrl).catch(e => console.log("Startup sync error:", e));
            } else if (!response || response.status === 401 || response.status === 403) {
              console.warn(`[UserContext] Profile fetch returned ${response ? response.status : "no session"}. Invalidating session.`);
              await clearCredentials();
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

  const setUserId = async (id: string | null, newToken?: string | null, session?: SessionTokens | null) => {
    try {
      setProfileError(false);
      if (id) {
        await storeUserId(id);
        setUserIdState(id);

        if (session) {
          // HL-047: access token + refresh token from login, sign-up or a password change
          await storeSession(session);
          setTokenState(session.token);
        } else if (newToken) {
          await setToken(newToken);
          setTokenState(newToken);
        } else {
          const currentToken = await getToken();
          setTokenState(currentToken);
        }
        
        try {
          const effectiveToken = newToken || (await getToken()) || "";
          const response = await apiFetch(`/api/users/${id}/profile`, {
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
        await clearCredentials();
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
      const effectiveToken = token || (await getToken()) || "";
      const response = await apiFetch(`/api/users/${userId}/profile`, {
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
      const effectiveToken = token || (await getToken());
      const refreshToken = await getRefreshToken();
      if (effectiveToken || refreshToken) {
        // HL-047: the server also revokes the refresh token, so it can't be used again
        await apiFetch(`/api/auth/logout`, {
          auth: false, // sends its own token below; never renew a session that is ending
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(effectiveToken ? { "Authorization": `Bearer ${effectiveToken}` } : {}),
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
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


