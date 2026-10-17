import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "access_token";
const USER_ID_KEY = "user_id";
// HL-047: the refresh token and when the access token should be renewed (epoch ms)
const REFRESH_TOKEN_KEY = "refresh_token";
const REFRESH_AT_KEY = "access_refresh_at";

/**
 * Retrieve the stored access token from encrypted storage.
 * Returns null if no token is stored.
 */
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

/**
 * Store an access token in encrypted storage.
 */
export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

/**
 * Remove the access token from encrypted storage.
 */
export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

/**
 * Retrieve the stored user ID from encrypted storage.
 * Returns null if no user ID is stored.
 */
export async function getUserId(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_ID_KEY);
}

/**
 * Store a user ID in encrypted storage.
 */
export async function setUserId(id: string): Promise<void> {
  await SecureStore.setItemAsync(USER_ID_KEY, id);
}

/**
 * Remove the user ID from encrypted storage.
 */
export async function removeUserId(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_ID_KEY);
}

/**
 * Retrieve the stored refresh token (HL-047). Null for logins from before HL-047.
 */
export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * When the access token should be renewed, in epoch milliseconds, or null if unknown.
 */
export async function getRefreshAt(): Promise<number | null> {
  const value = await SecureStore.getItemAsync(REFRESH_AT_KEY);
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Store a new access token + refresh token pair. The access token is renewed a little before it
 * expires: an hour early for the normal 24-hour token, a quarter of its life for short test tokens.
 */
export async function setSession(token: string, refreshToken: string, expiresInSeconds: number): Promise<void> {
  const lifeMs = expiresInSeconds * 1000;
  const refreshAt = Date.now() + lifeMs - Math.min(60 * 60 * 1000, lifeMs / 4);
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    SecureStore.setItemAsync(REFRESH_AT_KEY, String(Math.round(refreshAt))),
  ]);
}

/**
 * Clear all credentials from encrypted storage (used during logout).
 */
export async function clearCredentials(): Promise<void> {
  await Promise.all([
    removeToken(),
    removeUserId(),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_AT_KEY),
  ]);
}
