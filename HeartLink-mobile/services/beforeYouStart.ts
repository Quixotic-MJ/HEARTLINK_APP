import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * "Before you start" (2026-11-18): the full tick list shows the first time a patient does an exercise. After that it's
 * a short reminder (the reasons to skip it and the signs to stop), with the full list one tap away. Which exercises
 * were checked is remembered on this phone only, per account. It isn't health data, so a lost list only means the
 * full list shows once more.
 */
const keyFor = (userId: string) => `@before_you_start_done_${userId}`;

async function readIds(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** True when this patient has ticked the full list for this exercise before, on this phone. */
export async function checkedBefore(userId: string, routineId: string): Promise<boolean> {
  return (await readIds(userId)).includes(routineId);
}

/** Remembers that the full list was ticked for this exercise. Never throws: the workout goes on either way. */
export async function rememberChecked(userId: string, routineId: string): Promise<void> {
  try {
    const ids = await readIds(userId);
    if (!ids.includes(routineId)) await AsyncStorage.setItem(keyFor(userId), JSON.stringify([...ids, routineId]));
  } catch {
    // Not saved: the full list simply shows again next time.
  }
}
