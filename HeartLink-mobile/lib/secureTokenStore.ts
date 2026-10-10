import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "access_token";
const USER_ID_KEY = "user_id";

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
 * Clear all credentials from encrypted storage (used during logout).
 */
export async function clearCredentials(): Promise<void> {
  await Promise.all([removeToken(), removeUserId()]);
}
