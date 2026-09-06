import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CompanionActivityContext {
  vitals_logged?: boolean;
  total_sodium_mg?: number;
  total_exercise_minutes?: number;
  total_sleep_hours?: number;
  latest_sbp?: number;
  latest_dbp?: number;
}

export interface CompanionHSSContext {
  score?: number;
  tier?: string;
}

export interface CompanionGreetingResult {
  greeting: string;
  source: "template" | "ai";
  tone: "optimal" | "warning" | "caution" | "neutral";
}

/**
 * Helper to safely display blood pressure readings without undefined values.
 */
function formatBpDisplay(sbp?: number, dbp?: number): string {
  if (sbp && dbp) return `${sbp}/${dbp} mmHg`;
  if (sbp) return `Systolic ${sbp} mmHg`;
  if (dbp) return `Diastolic ${dbp} mmHg`;
  return "reading";
}

/**
 * Deterministic Clinical Template Engine
 * 100% Free, Offline-Ready, Medically Bounded, and Private
 * Aligned with AHA/ACC guidelines & DOST-FNRI nutrition thresholds.
 */
export function getSmartTemplateGreeting(
  firstName: string,
  activity?: CompanionActivityContext,
  hss?: CompanionHSSContext
): CompanionGreetingResult {
  const hour = new Date().getHours();

  // Sanitize physiological telemetry inputs to avoid negative/NaN errors
  const rawSbp = activity?.latest_sbp;
  const rawDbp = activity?.latest_dbp;
  const sbp = typeof rawSbp === "number" && !isNaN(rawSbp) && rawSbp > 0 ? rawSbp : undefined;
  const dbp = typeof rawDbp === "number" && !isNaN(rawDbp) && rawDbp > 0 ? rawDbp : undefined;
  const sodium = Math.max(0, activity?.total_sodium_mg || 0);
  const exerciseMins = Math.max(0, activity?.total_exercise_minutes || 0);
  const vitalsLogged = !!activity?.vitals_logged;
  const score = Math.max(0, hss?.score || 0);

  // 1. Critical Hypertensive Crisis (>= 180 SBP or >= 120 DBP)
  if ((sbp !== undefined && sbp >= 180) || (dbp !== undefined && dbp >= 120)) {
    return {
      greeting: `Your blood pressure (${formatBpDisplay(sbp, dbp)}) is critically high. Rest quietly and seek urgent clinical evaluation.`,
      source: "template",
      tone: "warning",
    };
  }

  // 2. Acute Hypotension / Shock (< 90 SBP or < 60 DBP)
  if ((sbp !== undefined && sbp < 90) || (dbp !== undefined && dbp < 60)) {
    return {
      greeting: `Your blood pressure (${formatBpDisplay(sbp, dbp)}) is lower than normal. Rest seated, hydrate, and seek care if dizzy.`,
      source: "template",
      tone: "caution",
    };
  }

  // 3. Stage 2 / Elevated Blood Pressure Flag (>= 140 SBP or >= 90 DBP)
  if ((sbp !== undefined && sbp >= 140) || (dbp !== undefined && dbp >= 90)) {
    return {
      greeting: `Your latest BP (${formatBpDisplay(sbp, dbp)}) is elevated. Take 10 minutes to sit quietly, breathe deeply, and stay hydrated.`,
      source: "template",
      tone: "caution",
    };
  }

  // 4. High Sodium Intake Alert (> 2,000mg DOST-FNRI limit)
  if (sodium > 2000) {
    return {
      greeting: `You've reached your 2,000mg sodium limit (${sodium}mg). Aim for a light, potassium-rich dinner to help balance it out.`,
      source: "template",
      tone: "warning",
    };
  }

  // 5. Positive Cardio Exercise Milestone (>= 15 mins)
  if (exerciseMins >= 15) {
    return {
      greeting: `Great job completing ${exerciseMins} minutes of cardio today! Regular movement keeps your vascular rhythm resilient.`,
      source: "template",
      tone: "optimal",
    };
  }

  // 6. Missing Morning Vitals Prompt (before noon)
  if (!vitalsLogged && hour < 12) {
    return {
      greeting: `Take a calm seated moment to record your morning blood pressure and pulse check.`,
      source: "template",
      tone: "neutral",
    };
  }

  // 7. Stable / Optimal Routine (Score >= 70)
  if (score >= 70) {
    return {
      greeting: `Your cardiovascular stability is in a great rhythm today. Keep up your steady habits!`,
      source: "template",
      tone: "optimal",
    };
  }

  // 8. Default Encouraging Routine
  return {
    greeting: `HeartLink is monitoring by your side today. Remember to drink water and take gentle movement breaks.`,
    source: "template",
    tone: "neutral",
  };
}

interface StoredGreetingCache {
  sig: string;
  result: CompanionGreetingResult;
  timestamp: number;
}

/**
 * Secure, Telemetry-Aware Companion Greeting Service
 * - Completely offline-ready and private (Zero client-side API key exposure)
 * - User-scoped caching to prevent cross-account data leakage on shared devices
 * - Single daily key with signature verification prevents AsyncStorage key bloat
 * - Telemetry signature cache invalidation: updates immediately upon new vitals or high sodium
 */
export async function getCompanionGreeting(
  firstName: string,
  activity?: CompanionActivityContext,
  hss?: CompanionHSSContext,
  userId?: string
): Promise<CompanionGreetingResult> {
  const name = firstName || "there";
  const todayStr = new Date().toISOString().split("T")[0];

  // Telemetry signature ensures that logging new vitals or sodium invalidates older greetings immediately
  const telemetrySig = [
    activity?.latest_sbp || 0,
    activity?.latest_dbp || 0,
    activity?.total_sodium_mg || 0,
    activity?.total_exercise_minutes || 0,
    activity?.vitals_logged ? 1 : 0,
    hss?.score || 0,
  ].join("_");

  const userScope = userId || "default_user";
  // Single key per user per day prevents unbounded key growth in AsyncStorage
  const cacheKey = `@heartlink_greeting_${userScope}_${todayStr}`;

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed: StoredGreetingCache = JSON.parse(cached);
      // Valid if the telemetry signature matches current data
      if (parsed?.sig === telemetrySig && parsed?.result?.greeting) {
        return parsed.result;
      }
    }
  } catch {
    // Non-blocking cache read failure
  }

  const result = getSmartTemplateGreeting(name, activity, hss);

  try {
    const cachePayload: StoredGreetingCache = {
      sig: telemetrySig,
      result,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cachePayload));
  } catch {
    // Non-blocking cache write failure
  }

  return result;
}
