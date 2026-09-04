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
 * Deterministic Clinical Template Engine
 * 100% Free, Offline-Ready, and Medically Safe
 */
export function getSmartTemplateGreeting(
  firstName: string,
  activity?: CompanionActivityContext,
  hss?: CompanionHSSContext
): CompanionGreetingResult {
  const name = firstName || "there";
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const sbp = activity?.latest_sbp;
  const dbp = activity?.latest_dbp;
  const sodium = activity?.total_sodium_mg || 0;
  const exerciseMins = activity?.total_exercise_minutes || 0;
  const vitalsLogged = activity?.vitals_logged;
  const score = hss?.score || 0;

  // 1. Critical or Elevated Blood Pressure Flag
  if (sbp && dbp && (sbp >= 140 || dbp >= 90)) {
    return {
      greeting: `Take a gentle breath, ${name}. Your latest blood pressure (${sbp}/${dbp} mmHg) is elevated. Take 10 minutes to sit quietly and stay well-hydrated.`,
      source: "template",
      tone: "caution",
    };
  }

  // 2. High Sodium Intake Alert
  if (sodium > 2000) {
    return {
      greeting: `${timeOfDay}, ${name}! You've reached your 2,000mg sodium budget for today (${sodium}mg). Let's aim for a light, potassium-rich dinner to help balance it out.`,
      source: "template",
      tone: "warning",
    };
  }

  // 3. Positive Exercise Milestone
  if (exerciseMins >= 15) {
    return {
      greeting: `Fantastic job, ${name}! You completed ${exerciseMins} minutes of cardio today. Consistent movement is one of the best ways to protect your heart.`,
      source: "template",
      tone: "optimal",
    };
  }

  // 4. Missing Morning Vitals Prompt (before noon)
  if (!vitalsLogged && hour < 12) {
    return {
      greeting: `${timeOfDay}, ${name}! When you have a calm moment, remember to take and log your morning blood pressure check.`,
      source: "template",
      tone: "neutral",
    };
  }

  // 5. Stable / Optimal Routine
  if (score >= 70) {
    return {
      greeting: `${timeOfDay}, ${name}! Your cardiovascular stability is in a great rhythm today. Keep up the steady, heart-healthy habits!`,
      source: "template",
      tone: "optimal",
    };
  }

  // 6. Default Encouraging Greeting
  return {
    greeting: `${timeOfDay}, ${name}! HeartLink is tracking by your side today. Remember to drink water and take gentle walking breaks.`,
    source: "template",
    tone: "neutral",
  };
}

/**
 * Hybrid Companion Greeting Generator
 * Checks local cache -> Calls Free Gemini API (if key present) with 2.5s timeout -> Falls back to Smart Templates
 */
export async function getCompanionGreeting(
  firstName: string,
  activity?: CompanionActivityContext,
  hss?: CompanionHSSContext
): Promise<CompanionGreetingResult> {
  const name = firstName || "friend";
  const todayStr = new Date().toISOString().split("T")[0];
  const cacheKey = `@heartlink_daily_greeting_${todayStr}`;

  // Step 1: Check if we already generated and cached today's AI message
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.greeting) {
        return parsed;
      }
    }
  } catch {
    // Cache read failure is non-fatal
  }

  // Fallback template ready in 0ms
  const defaultTemplate = getSmartTemplateGreeting(name, activity, hss);

  // Step 2: Check for Free Gemini API Key
  const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!geminiApiKey) {
    return defaultTemplate;
  }

  // Step 3: Attempt Gemini 1.5 Flash Free Tier call with strict 2.5-second timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const bpDesc = activity?.latest_sbp
      ? `${activity.latest_sbp}/${activity.latest_dbp} mmHg`
      : activity?.vitals_logged
      ? "Logged (Normal)"
      : "Not logged yet";
    const sodiumDesc = `${activity?.total_sodium_mg || 0} mg (Daily limit 2,000 mg)`;
    const exerciseDesc = `${activity?.total_exercise_minutes || 0} minutes active`;
    const hssDesc = hss?.score ? `${hss.score} (${hss.tier || "Stable"})` : "Stable";

    const prompt = `You are HeartLink Coach, a caring, encouraging cardiovascular health companion for a patient named ${name}.
Current Health Telemetry:
- Blood Pressure: ${bpDesc}
- Today's Sodium Intake: ${sodiumDesc}
- Today's Cardio: ${exerciseDesc}
- Health Stability Score: ${hssDesc}

Instructions:
Write a warm, supportive 1-to-2 sentence daily greeting for ${name}'s mobile dashboard.
Acknowledge their effort or gently remind them of today's heart goal.
Keep it positive, empathetic, and under 25 words. Do not use hashtags or bullet points.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 60,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (aiText && aiText.length > 10) {
        const result: CompanionGreetingResult = {
          greeting: aiText.replace(/^["']|["']$/g, ""),
          source: "ai",
          tone: defaultTemplate.tone,
        };

        // Cache so we don't repeat API calls today
        await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
        return result;
      }
    }
  } catch {
    // Network timeout, rate limit, or offline -> fallback immediately to smart template
  }

  return defaultTemplate;
}
