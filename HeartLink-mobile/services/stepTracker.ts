import { Linking, NativeModules, Platform, TurboModuleRegistry } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type * as HealthConnect from "react-native-health-connect";

/**
 * HL-163: automatic step tracking from Health Connect (Android). The phone (and a watch, if there is one) already counts
 * steps into Health Connect all day; HeartLink reads the last 7 days when the app opens and sends them to the server.
 *
 * - The day's step total is shown only; it never changes the Habit score.
 * - Brisk walking counts as movement minutes: a stretch of at least a minute walked at 100 or more steps a minute
 *   (about moderate intensity for adults, CADENCE-Adults). Those stretches are sent as [start, end] periods, and the
 *   server turns them into minutes (backend app/services/step_minutes.py). A long record that averages under 100 a
 *   minute doesn't count, so the rule can undercount but never overcounts.
 *
 * Health Connect needs a native library, so this works only in the installed Android app (an EAS build): Expo Go and
 * iPhones don't have it, and isStepTrackingAvailable() is false there.
 */

export const BRISK_STEPS_PER_MINUTE = 100;
export const MAX_PERIODS_PER_DAY = 300;
export const WEEK_DAYS = 7;
const MIN_RECORD_MS = 60 * 1000;
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000; // the server counts days in Asia/Manila (UTC+8, no daylight saving)
const DAY_MS = 24 * 60 * 60 * 1000;
const HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata";

export type StepRecord = { startTime: string; endTime: string; count: number };
export type BriskPeriod = [string, string];
export type StepDayUpload = { day: string; steps: number; brisk_periods: BriskPeriod[] };

// ── Days ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The Manila calendar day of a moment, as YYYY-MM-DD. */
export function manilaDay(at: Date): string {
  return new Date(at.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

/** When a Manila day starts and ends. */
export function manilaDayBounds(day: string): { start: Date; end: Date } {
  const start = new Date(Date.parse(`${day}T00:00:00.000Z`) - MANILA_OFFSET_MS);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** The last `count` Manila days, oldest first, ending today. */
export function lastDays(now: Date, count = WEEK_DAYS): string[] {
  const today = Date.parse(`${manilaDay(now)}T00:00:00.000Z`);
  return Array.from({ length: count }, (_, i) => new Date(today - (count - 1 - i) * DAY_MS).toISOString().slice(0, 10));
}

// ── Brisk walking ───────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The stretches of one day walked briskly: records of at least a minute at 100+ steps a minute, cut to the day and
 * joined where they touch, so a phone and a watch counting the same walk give one stretch.
 */
export function briskPeriods(records: StepRecord[], dayStart: Date, dayEnd: Date): BriskPeriod[] {
  const spans: [number, number][] = [];
  for (const r of records) {
    const start = Date.parse(r.startTime);
    const end = Date.parse(r.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end - start < MIN_RECORD_MS) continue;
    const perMinute = r.count / ((end - start) / 60000);
    if (perMinute < BRISK_STEPS_PER_MINUTE) continue;
    const s = Math.max(start, dayStart.getTime());
    const e = Math.min(end, dayEnd.getTime());
    if (e > s) spans.push([s, e]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([span[0], span[1]]);
  }
  // The server takes up to 300 a day; if there are more, keep the longest ones
  const kept =
    merged.length > MAX_PERIODS_PER_DAY
      ? [...merged].sort((a, b) => b[1] - b[0] - (a[1] - a[0])).slice(0, MAX_PERIODS_PER_DAY).sort((a, b) => a[0] - b[0])
      : merged;
  return kept.map(([s, e]) => [new Date(s).toISOString(), new Date(e).toISOString()]);
}

// ── Health Connect ──────────────────────────────────────────────────────────────────────────────────────────────

function nativeModulePresent(): boolean {
  if (Platform.OS !== "android") return false;
  try {
    return TurboModuleRegistry.get("HealthConnect") != null || NativeModules.HealthConnect != null;
  } catch {
    return false;
  }
}

let healthConnect: typeof HealthConnect | null = null;
function hc(): typeof HealthConnect | null {
  if (!nativeModulePresent()) return null;
  if (!healthConnect) {
    // Loaded only when the native part is in the app: importing it at the top would crash Expo Go, which lacks it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    healthConnect = require("react-native-health-connect") as typeof HealthConnect;
  }
  return healthConnect;
}

/** False in Expo Go and on iPhones. */
export function isStepTrackingAvailable(): boolean {
  return nativeModulePresent();
}

/**
 * Expo Go can't read steps, so the dashboard shows the Steps page with sample numbers there (owner's choice
 * 2026-11-23), clearly marked as sample, to show what the page looks like. Never in the installed app.
 */
export function showsSampleSteps(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient && !isStepTrackingAvailable();
}

export type HealthConnectState = "unavailable" | "needs_install" | "needs_update" | "ready";

export async function healthConnectState(): Promise<HealthConnectState> {
  const h = hc();
  if (!h) return "unavailable";
  try {
    const status = await h.getSdkStatus();
    if (status === h.SdkAvailabilityStatus.SDK_AVAILABLE) return "ready";
    if (status === h.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return "needs_update";
    return "needs_install";
  } catch {
    return "needs_install";
  }
}

async function started(h: typeof HealthConnect): Promise<boolean> {
  try {
    return await h.initialize();
  } catch {
    return false;
  }
}

function canReadSteps(permissions: readonly object[]): boolean {
  return permissions.some((p) => {
    const perm = p as { recordType?: string; accessType?: string };
    return perm.recordType === "Steps" && perm.accessType === "read";
  });
}

export async function hasStepAccess(): Promise<boolean> {
  const h = hc();
  if (!h || !(await started(h))) return false;
  try {
    return canReadSteps(await h.getGrantedPermissions());
  } catch {
    return false;
  }
}

/** Shows Health Connect's own permission screen. True when the patient allowed reading steps. */
export async function requestStepAccess(): Promise<boolean> {
  const h = hc();
  if (!h || !(await started(h))) return false;
  try {
    return canReadSteps(await h.requestPermission([{ accessType: "read", recordType: "Steps" }]));
  } catch {
    return false;
  }
}

/** Turning tracking off also gives the permission back. */
export async function giveBackStepAccess(): Promise<void> {
  const h = hc();
  if (!h || !(await started(h))) return;
  try {
    await h.revokeAllPermissions();
  } catch {
    // Not every Health Connect version allows this; the patient can still remove it in Health Connect
  }
}

export function openHealthConnectInStore(): void {
  Linking.openURL(`market://details?id=${HEALTH_CONNECT_PACKAGE}`).catch(() =>
    Linking.openURL(`https://play.google.com/store/apps/details?id=${HEALTH_CONNECT_PACKAGE}`).catch(() => {})
  );
}

/** The last 7 days from Health Connect: each day's total (Health Connect's own, so phone + watch aren't doubled)
 * and its brisk periods. */
export async function readStepWeek(now: Date = new Date()): Promise<StepDayUpload[]> {
  const h = hc();
  if (!h || !(await started(h))) return [];
  const days: StepDayUpload[] = [];
  for (const day of lastDays(now)) {
    const { start, end } = manilaDayBounds(day);
    const timeRangeFilter = {
      operator: "between" as const,
      startTime: start.toISOString(),
      endTime: new Date(Math.min(end.getTime(), now.getTime())).toISOString(),
    };
    const total = await h.aggregateRecord({ recordType: "Steps", timeRangeFilter });
    const records: StepRecord[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < 10; page++) {
      const result = await h.readRecords("Steps", { timeRangeFilter, pageSize: 1000, pageToken });
      for (const r of result.records) records.push({ startTime: r.startTime, endTime: r.endTime, count: r.count });
      pageToken = result.pageToken || undefined;
      if (!pageToken) break;
    }
    days.push({
      day,
      steps: Math.min(100000, Math.max(0, Math.round(Number(total.COUNT_TOTAL) || 0))),
      brisk_periods: briskPeriods(records, start, end),
    });
  }
  return days;
}

// ── On or off, remembered on the phone for each account ─────────────────────────────────────────────────────────

const onKey = (userId: string) => `@steps_tracking_on_${userId}`;
const inviteKey = (userId: string) => `@steps_invite_hidden_${userId}`;
const listeners = new Set<() => void>();
const cache = new Map<string, boolean>();

export async function isStepTrackingOn(userId: string): Promise<boolean> {
  if (cache.has(onKey(userId))) return cache.get(onKey(userId)) === true;
  const on = (await AsyncStorage.getItem(onKey(userId)).catch(() => null)) === "1";
  cache.set(onKey(userId), on);
  return on;
}

export async function setStepTrackingOn(userId: string, on: boolean): Promise<void> {
  cache.set(onKey(userId), on);
  await AsyncStorage.setItem(onKey(userId), on ? "1" : "0").catch(() => {});
  listeners.forEach((l) => l());
}

export async function isStepInviteHidden(userId: string): Promise<boolean> {
  if (cache.has(inviteKey(userId))) return cache.get(inviteKey(userId)) === true;
  const hidden = (await AsyncStorage.getItem(inviteKey(userId)).catch(() => null)) === "1";
  cache.set(inviteKey(userId), hidden);
  return hidden;
}

export async function hideStepInvite(userId: string): Promise<void> {
  cache.set(inviteKey(userId), true);
  await AsyncStorage.setItem(inviteKey(userId), "1").catch(() => {});
  listeners.forEach((l) => l());
}

/** Whether tracking is on and the invite hidden, for this account; null until read from the phone. */
export function useStepTrackingSetting(userId: string | null): { on: boolean | null; inviteHidden: boolean | null } {
  const [state, setState] = useState<{ on: boolean | null; inviteHidden: boolean | null }>({ on: null, inviteHidden: null });
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const read = () => {
      Promise.all([isStepTrackingOn(userId), isStepInviteHidden(userId)]).then(([on, inviteHidden]) => {
        if (alive) setState({ on, inviteHidden });
      });
    };
    read();
    listeners.add(read);
    return () => {
      alive = false;
      listeners.delete(read);
    };
  }, [userId]);
  return state;
}
