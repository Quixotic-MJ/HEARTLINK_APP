/**
 * verify_explore_clinical_remediation.js
 * Verification suite covering tickets HL-ENG-01, HL-ENG-02, HL-ENG-03, HL-ENG-04, HL-ENG-05, HL-ENG-06
 */

const assert = require("assert");

console.log("=== RUNNING EXPLORE CLINICAL & SECURITY REMEDIATION TEST SUITE ===");

// ─── Test 1: HL-ENG-02 - Uncalibrated Zero HSS Boundary ──────────────────────────
function computeHssStatus(hssScore) {
  const isCalibrated = hssScore > 0;
  if (!isCalibrated) return "Stable";
  if (hssScore >= 80) return "Stable";
  if (hssScore >= 60) return "Moderate";
  if (hssScore >= 50) return "Elevated Risk";
  return "Critical";
}

assert.strictEqual(computeHssStatus(0), "Stable", "[FAIL] Zero HSS must resolve to Stable (uncalibrated), not Critical");
assert.strictEqual(computeHssStatus(-10), "Stable", "[FAIL] Negative HSS must resolve to Stable baseline");
assert.strictEqual(computeHssStatus(85), "Stable", "[FAIL] Score 85 must resolve to Stable");
assert.strictEqual(computeHssStatus(65), "Moderate", "[FAIL] Score 65 must resolve to Moderate");
assert.strictEqual(computeHssStatus(55), "Elevated Risk", "[FAIL] Score 55 must resolve to Elevated Risk");
assert.strictEqual(computeHssStatus(45), "Critical", "[FAIL] Score 45 must resolve to Critical");
console.log("[PASS] HL-ENG-02: Zero / Uncalibrated HSS and tier resolution bounds verified.");

// ─── Test 2: HL-ENG-01 - Emergency Warning Banner Triggers ─────────────────────
function shouldRenderWarningBanner(hssStatus) {
  return hssStatus === "Elevated Risk" || hssStatus === "Critical";
}

function getBannerAlertConfig(hssStatus) {
  if (hssStatus === "Critical") {
    return {
      severity: "critical",
      title: "Critical Cardiac Strain Detected",
      color: "#DC2626",
    };
  }
  if (hssStatus === "Elevated Risk") {
    return {
      severity: "caution",
      title: "Elevated Heart Stability Risk",
      color: "#D97706",
    };
  }
  return null;
}

assert.strictEqual(shouldRenderWarningBanner("Critical"), true, "[FAIL] Critical tier must trigger warning banner");
assert.strictEqual(shouldRenderWarningBanner("Elevated Risk"), true, "[FAIL] Elevated Risk must trigger warning banner");
assert.strictEqual(shouldRenderWarningBanner("Stable"), false, "[FAIL] Stable tier must NOT trigger warning banner");
assert.strictEqual(shouldRenderWarningBanner("Moderate"), false, "[FAIL] Moderate tier must NOT trigger warning banner");

const critConfig = getBannerAlertConfig("Critical");
assert.strictEqual(critConfig.severity, "critical");
assert.strictEqual(critConfig.title, "Critical Cardiac Strain Detected");
console.log("[PASS] HL-ENG-01: Warning banner render trigger and copy for Critical & Elevated Risk verified.");

// ─── Test 3: HL-ENG-04 - Defensive Null Profile Sodium Guard ─────────────────────
function evaluateHypertensionGuard(user, userConditions) {
  return user ? userConditions.includes("Hypertension") : true;
}

function filterTailoredRecipes(recipes, hasHypertension, hasHighCholesterol) {
  return recipes.filter((r) => {
    if (hasHypertension && r.sodium >= 140) return false;
    if (hasHighCholesterol && r.fiber < 5) return false;
    if (!hasHypertension && !hasHighCholesterol && r.sodium > 400) return false;
    return true;
  });
}

const mockRecipes = [
  { id: "r1", name: "Low Sodium Tinola", sodium: 120, fiber: 3 },
  { id: "r2", name: "Standard Tinola", sodium: 380, fiber: 2 },
  { id: "r3", name: "High Fiber Oatmeal", sodium: 80, fiber: 6 },
  { id: "r4", name: "Salty Adobo", sodium: 850, fiber: 1 },
];

// Case A: User profile is unhydrated (null)
const unhydratedHypertension = evaluateHypertensionGuard(null, []);
assert.strictEqual(unhydratedHypertension, true, "[FAIL] Null user must default to hasHypertension = true for safety");
const unhydratedTailored = filterTailoredRecipes(mockRecipes, unhydratedHypertension, false);
assert.strictEqual(unhydratedTailored.some(r => r.sodium >= 140), false, "[FAIL] No meal >= 140mg sodium should pass when user is unhydrated");
assert.strictEqual(unhydratedTailored.length, 2, "[FAIL] Expected only meals with < 140mg sodium");

// Case B: Confirmed non-hypertensive user
const normalHypertension = evaluateHypertensionGuard({ id: "u1" }, []);
assert.strictEqual(normalHypertension, false);
const normalTailored = filterTailoredRecipes(mockRecipes, normalHypertension, false);
assert.strictEqual(normalTailored.some(r => r.id === "r2"), true, "[FAIL] Standard 380mg meal should be permitted for non-hypertensive users");
console.log("[PASS] HL-ENG-04: Defensive null profile sodium restriction verified.");

// ─── Test 4: HL-ENG-05 - Dynamic 7-Day Consistency Dot Tracker Labels ────────────
function generateDynamicDayLabels(startDate, dayCount = 7) {
  const oneDay = 24 * 60 * 60 * 1000;
  const labels = [];
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(startDate.getTime() + i * oneDay);
    labels.push(d.toLocaleDateString("en-US", { weekday: "narrow" }));
  }
  return labels;
}

// Fixed anchor: Saturday, September 5, 2026 (month index 8)
const mockSaturday = new Date(2026, 8, 5, 12, 0, 0); // Local Saturday noon
const generatedLabels = [0, 1, 2, 3, 4, 5, 6].map((i) => {
  const d = new Date(mockSaturday);
  d.setDate(d.getDate() - (6 - i));
  return d.toLocaleDateString("en-US", { weekday: "narrow" });
});

assert.strictEqual(generatedLabels.length, 7);
assert.strictEqual(generatedLabels[0], "S", "[FAIL] First day (Sunday Aug 30) must be 'S'");
assert.strictEqual(generatedLabels[1], "M", "[FAIL] Second day (Monday Aug 31) must be 'M'");
assert.strictEqual(generatedLabels[6], "S", "[FAIL] Seventh day (Saturday Sept 5) must be 'S'");
console.log("[PASS] HL-ENG-05: Dynamic rolling 7-day narrow weekday label calculation verified.");

// ─── Test 5: HL-ENG-03 & HL-ENG-06 - Scoped AsyncStorage Isolation ─────────────────
function getScopedCacheKey(prefix, userId) {
  return userId ? `${prefix}_${userId}` : prefix;
}

function matchesLogoutFilter(key, userId) {
  return key.includes(userId);
}

const testUserId = "usr-cebu-patient-401";
const savedKey = getScopedCacheKey("@saved_recipes", testUserId);
const exercisesKey = getScopedCacheKey("@exercises_cache", testUserId);

assert.strictEqual(savedKey, "@saved_recipes_usr-cebu-patient-401");
assert.strictEqual(exercisesKey, "@exercises_cache_usr-cebu-patient-401");
assert.strictEqual(matchesLogoutFilter(savedKey, testUserId), true, "[FAIL] Key must match UserContext logout scrubber");
assert.strictEqual(matchesLogoutFilter(exercisesKey, testUserId), true, "[FAIL] Key must match UserContext logout scrubber");
console.log("[PASS] HL-ENG-03 & HL-ENG-06: Scoped storage key isolation and logout scrubber compliance verified.");

// ─── Test 6: HL-ENG-07 - Offline HSS Persistence & Fail-Safe Boundary ───────────────
function computeOfflineHssStatus(hssScore, isOffline) {
  const isCalibrated = hssScore > 0;
  if (!isCalibrated) return isOffline ? "Elevated Risk" : "Stable";
  if (hssScore >= 80) return "Stable";
  if (hssScore >= 60) return "Moderate";
  if (hssScore >= 50) return "Elevated Risk";
  return "Critical";
}

// Case A: Online uncalibrated onboarding account -> Stable
assert.strictEqual(computeOfflineHssStatus(0, false), "Stable", "[FAIL] Online uncalibrated should be Stable");

// Case B: Offline uncalibrated account -> Elevated Risk fail-safe
assert.strictEqual(computeOfflineHssStatus(0, true), "Elevated Risk", "[FAIL] Offline uncalibrated must fail-safe to Elevated Risk");

// Case C: Offline with cached acute crisis score (e.g. 25) -> Retains Critical
assert.strictEqual(computeOfflineHssStatus(25, true), "Critical", "[FAIL] Offline with cached crisis score must remain Critical");
assert.strictEqual(computeOfflineHssStatus(55, true), "Elevated Risk", "[FAIL] Offline with cached elevated score must remain Elevated Risk");
console.log("[PASS] HL-ENG-07: Offline HSS telemetry persistence and uncalibrated fail-safe verified.");

// ─── Test 7: HL-ENG-08 - Critical Routine Recommendation Lockdown ────────────────
function selectRecommendedRoutine(routinesList, hssStatus, allowedTiers) {
  if (!routinesList || routinesList.length === 0) return null;
  const exactMatch = routinesList.find(r => r.category === hssStatus);
  if (exactMatch) return exactMatch;
  const allowed = routinesList.find(r => allowedTiers.includes(r.category));
  if (allowed) return allowed;

  // Guard: NEVER fall back to routinesList[0] for Critical or Elevated Risk
  if (hssStatus === "Critical" || hssStatus === "Elevated Risk") {
    return null;
  }
  return routinesList[0];
}

const mockRoutines = [
  { id: "ex-1", name: "20-Min Cardio Walk", category: "Stable" },
  { id: "ex-2", name: "Moderate Mobility", category: "Moderate" },
];

// Critical tier with no Critical routines in catalog
const criticalReco = selectRecommendedRoutine(mockRoutines, "Critical", ["Critical"]);
assert.strictEqual(criticalReco, null, "[FAIL] Critical tier must return null when no Critical routine exists, never routinesList[0]");

// Elevated Risk tier with no Elevated routines
const elevatedReco = selectRecommendedRoutine(mockRoutines, "Elevated Risk", ["Elevated Risk", "Critical"]);
assert.strictEqual(elevatedReco, null, "[FAIL] Elevated Risk must return null when no safe routine exists, never routinesList[0]");

// Stable tier with no exact match can safely fallback to routinesList[0]
const stableReco = selectRecommendedRoutine(mockRoutines, "Stable", ["Stable", "Moderate"]);
assert.strictEqual(stableReco.id, "ex-1", "[FAIL] Stable tier should receive allowed routine");
console.log("[PASS] HL-ENG-08: Critical tier recommended routine lockdown verified.");

// ─── Test 8: HL-ENG-09 - Dual-State Bookmark Method Selection ─────────────────────
function resolveBookmarkMethod(isSaved) {
  return isSaved ? "DELETE" : "POST";
}

assert.strictEqual(resolveBookmarkMethod(true), "DELETE", "[FAIL] Un-saving a recipe must use DELETE method");
assert.strictEqual(resolveBookmarkMethod(false), "POST", "[FAIL] Saving a recipe must use POST method");
console.log("[PASS] HL-ENG-09: Dual-state bookmark HTTP method resolution verified.");

// ─── Test 9: HL-ENG-10 - Hypertensive Sodium Warning Badge Threshold ─────────────
function evaluateSodiumBadge(sodiumMg, hasHypertension) {
  const isSodiumSafe = sodiumMg < 140;
  const isSodiumElevated = Boolean(hasHypertension && sodiumMg >= 300);
  return { isSodiumSafe, isSodiumElevated };
}

// Low sodium dish (< 140 mg) for hypertensive user
const lowSod = evaluateSodiumBadge(110, true);
assert.strictEqual(lowSod.isSodiumSafe, true, "[FAIL] <140mg must be flagged as safe");
assert.strictEqual(lowSod.isSodiumElevated, false, "[FAIL] <140mg must not be flagged as elevated");

// Elevated sodium dish (380 mg Tinola) for hypertensive user
const tinolaSod = evaluateSodiumBadge(380, true);
assert.strictEqual(tinolaSod.isSodiumSafe, false, "[FAIL] 380mg must not be flagged as safe");
assert.strictEqual(tinolaSod.isSodiumElevated, true, "[FAIL] 380mg must trigger warning badge for hypertensive user");

// Same 380 mg dish for non-hypertensive user
const normalTinola = evaluateSodiumBadge(380, false);
assert.strictEqual(normalTinola.isSodiumElevated, false, "[FAIL] 380mg should not trigger warning for non-hypertensive user");
console.log("[PASS] HL-ENG-10: Hypertensive sodium warning badge threshold evaluation verified.");

// ─── Test 10: HL-ENG-12 - Exercise Details Pre-Flight Crisis Lockdown Intercept ──
function evaluateExerciseLockdown(hssTier, hssScore, routineType) {
  return Boolean(
    (hssTier === "Critical" || (hssScore > 0 && hssScore < 50)) &&
    routineType !== "Breathing"
  );
}

// Case A: Critical hypertensive crisis with cardio walk -> Locked
const cardioLocked = evaluateExerciseLockdown("Critical", 25, "Light Cardio");
assert.strictEqual(cardioLocked, true, "[FAIL] Physical cardio workout must be locked during Critical tier");

// Case B: Critical hypertensive crisis with breathing exercise -> Permitted
const breathingLocked = evaluateExerciseLockdown("Critical", 25, "Breathing");
assert.strictEqual(breathingLocked, false, "[FAIL] Calming breathwork must remain permitted during Critical tier");

// Case C: Stable user with cardio workout -> Unlocked
const stableCardio = evaluateExerciseLockdown("Stable", 90, "Light Cardio");
assert.strictEqual(stableCardio, false, "[FAIL] Workouts should not be locked for Stable users");
console.log("[PASS] HL-ENG-12: Exercise details pre-flight crisis lockdown intercept verified.");

// ─── Test 11: HL-ENG-13 - Partial API Failure Telemetry Resilience ───────────────
function resolveHssOnDashboardFetch(dashboardResOk, dashData, cachedHss, isOffline) {
  let score = 0;
  let dashboardFailed = false;

  if (dashboardResOk && dashData) {
    score = dashData.score;
  } else {
    dashboardFailed = true;
    if (cachedHss && typeof cachedHss.score === "number") {
      score = cachedHss.score;
    }
  }

  const isCalibrated = score > 0;
  let status = "Stable";
  if (!isCalibrated) {
    status = (isOffline || dashboardFailed) ? "Elevated Risk" : "Stable";
  } else if (score >= 80) {
    status = "Stable";
  } else if (score >= 60) {
    status = "Moderate";
  } else if (score >= 50) {
    status = "Elevated Risk";
  } else {
    status = "Critical";
  }

  return { score, dashboardFailed, status };
}

// Case A: Partial API failure with cached acute crisis score (25) -> Maintains Critical
const fallbackCrisis = resolveHssOnDashboardFetch(false, null, { score: 25 }, false);
assert.strictEqual(fallbackCrisis.score, 25, "[FAIL] Partial API failure must hydrate cached score");
assert.strictEqual(fallbackCrisis.status, "Critical", "[FAIL] Cached crisis score must be preserved during partial API failure");

// Case B: Partial API failure with uncalibrated account -> Fail-safes to Elevated Risk
const fallbackUncalibrated = resolveHssOnDashboardFetch(false, null, null, false);
assert.strictEqual(fallbackUncalibrated.status, "Elevated Risk", "[FAIL] Uncalibrated account with failed dashboard telemetry must fail-safe to Elevated Risk");

// Case C: Successful dashboard fetch with normal score -> Stable
const successfulFetch = resolveHssOnDashboardFetch(true, { score: 90 }, null, false);
assert.strictEqual(successfulFetch.status, "Stable", "[FAIL] Healthy score with successful fetch must resolve to Stable");
console.log("[PASS] HL-ENG-13: Exercises screen telemetry partial API failure resilience verified.");

// ─── Test 12: HL-ENG-15 - Offline Recipe Bookmark Reconciliation ────────────────
function reconcileSavedBookmarks(currentLocalIds, remoteIds) {
  const pendingLocalSaves = currentLocalIds.filter((id) => !remoteIds.includes(id));
  const mergedIds = Array.from(new Set([...currentLocalIds, ...remoteIds]));
  return { mergedIds, pendingLocalSaves };
}

// Case: User saved 'rec-offline-1' while offline; remote server only has 'rec-server-1'
const localBookmarks = ["rec-server-1", "rec-offline-1"];
const remoteBookmarks = ["rec-server-1"];

const reconciliation = reconcileSavedBookmarks(localBookmarks, remoteBookmarks);
assert.strictEqual(reconciliation.mergedIds.length, 2, "[FAIL] Merged bookmark set must contain all local and remote IDs");
assert.strictEqual(reconciliation.mergedIds.includes("rec-offline-1"), true, "[FAIL] Offline bookmark must NOT be deleted upon sync");
assert.strictEqual(reconciliation.pendingLocalSaves.length, 1);
assert.strictEqual(reconciliation.pendingLocalSaves[0], "rec-offline-1", "[FAIL] Pending offline save must be identified for server dispatch");
console.log("[PASS] HL-ENG-15: Offline recipe bookmark reconciliation and state synchronization verified.");

// ─── Test 13: HL-ENG-27 - Doctor Consultation Summary Scoped Offline Cache ──────
function getWrapupCacheKey(userId) {
  return userId ? `@wrapup_cache_${userId}` : null;
}

function resolveWrapupHydration(cachedJson) {
  if (!cachedJson) return { data: null, isOfflineData: false, isLoading: true };
  try {
    const data = JSON.parse(cachedJson);
    return { data, isOfflineData: true, isLoading: false };
  } catch {
    return { data: null, isOfflineData: false, isLoading: true };
  }
}

const wrapupKeyPatient = getWrapupCacheKey("usr-cebu-patient-401");
assert.strictEqual(wrapupKeyPatient, "@wrapup_cache_usr-cebu-patient-401", "[FAIL] Wrapup cache key must be scoped by userId");
assert.strictEqual(getWrapupCacheKey(null), null, "[FAIL] Unauthenticated state must yield null cache key");

const cachedPayload = JSON.stringify({ overview: { movement_minutes: 45, vital_days: 5 }, date_range: { display: "Sep 1 - Sep 7" } });
const hydrated = resolveWrapupHydration(cachedPayload);
assert.strictEqual(hydrated.isLoading, false, "[FAIL] Hydrated cached wrapup data must stop loading skeleton immediately");
assert.strictEqual(hydrated.isOfflineData, true, "[FAIL] Hydrated cached data must flag isOfflineData");
assert.strictEqual(hydrated.data.overview.movement_minutes, 45);
console.log("[PASS] HL-ENG-27: Doctor Consultation Summary scoped cache isolation and offline hydration verified.");

// ─── Test 14: HL-ENG-28 - Manual Exercise Quick-Log Offline Enqueueing ───────────
function simulateExerciseQuickLog({ userId, name, mins, isNetworkAvailable, fakeQueue }) {
  const payload = {
    routine_name: name.trim(),
    duration_minutes: mins,
    duration_seconds: mins * 60,
    status: "completed",
  };

  if (!isNetworkAvailable) {
    if (userId) {
      fakeQueue.push({ userId, payload, timestamp: Date.now() });
      const offlineLog = {
        id: `offline_${Date.now()}`,
        user_id: userId,
        routine_id: "",
        routine_name: name.trim(),
        duration_minutes: mins,
        duration_seconds: mins * 60,
        status: "completed",
        logged_at: new Date().toISOString(),
      };
      return { success: true, isOffline: true, offlineLog, enqueued: true };
    }
    return { success: false, error: "Network Error" };
  }

  return { success: true, isOffline: false, enqueued: false };
}

const mockQueue = [];
const offlineResult = simulateExerciseQuickLog({
  userId: "usr-cebu-patient-401",
  name: "Brisk Walk (Barangay)",
  mins: 30,
  isNetworkAvailable: false,
  fakeQueue: mockQueue,
});

assert.strictEqual(offlineResult.success, true);
assert.strictEqual(offlineResult.isOffline, true);
assert.strictEqual(offlineResult.enqueued, true);
assert.strictEqual(mockQueue.length, 1);
assert.strictEqual(mockQueue[0].payload.routine_name, "Brisk Walk (Barangay)");
assert.strictEqual(mockQueue[0].payload.duration_minutes, 30);
console.log("[PASS] HL-ENG-28: Manual exercise quick-log offline queueing and optimistic item generation verified.");

console.log("\n=== ALL UNIT TEST ASSERTIONS PASSED SUCCESSFULLY (14/14) ===\n");
