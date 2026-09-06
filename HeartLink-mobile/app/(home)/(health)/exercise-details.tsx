import React, { useState, useEffect, useCallback } from "react";
import { View, ActivityIndicator, BackHandler } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { SafetyCheckSheet } from "../../../components/ui/SafetyCheckSheet";
import { CompletionCheckSheet } from "../../../components/ui/CompletionCheckSheet";
import { StopExerciseSheet } from "../../../components/ui/StopExerciseSheet";
import { ShortSessionSheet } from "../../../components/ui/ShortSessionSheet";
import { queueExerciseForSync } from "../../../services/SyncService";

// Components
import { ExerciseOverview } from "../../../components/exercise/ExerciseOverview";
import { ExerciseActive } from "../../../components/exercise/ExerciseActive";
import { ExerciseResult } from "../../../components/exercise/ExerciseResult";

const base_url = process.env.EXPO_PUBLIC_API_URL;

function resolveMediaUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanBase = base_url?.endsWith("/") ? base_url.slice(0, -1) : base_url;
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase || "http://localhost:8000"}${cleanPath}`;
}

const generateExerciseId = () => `ex-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

export default function ExerciseDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, token, logout } = useUser();
  const { showToast } = useToast();

  const [routine, setRoutine] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [workoutState, setWorkoutState] = useState<"overview" | "active" | "result">("overview");
  
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [sessionDurationSeconds, setSessionDurationSeconds] = useState(0);
  
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);
  const [showCompletionCheck, setShowCompletionCheck] = useState(false);
  const [showStopCheck, setShowStopCheck] = useState(false);
  const [showShortSessionCheck, setShowShortSessionCheck] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [hssScore, setHssScore] = useState<number>(0);
  const [hssTier, setHssTier] = useState<string | null>(null);

  useEffect(() => {
    async function loadHss() {
      try {
        const hssCacheKey = userId ? `@exercises_cache_hss_${userId}` : "@exercises_cache_hss";
        const cachedHss = await AsyncStorage.getItem(hssCacheKey);
        if (cachedHss) {
          const parsed = JSON.parse(cachedHss);
          if (parsed && typeof parsed.score === "number") {
            setHssScore(parsed.score);
            if (parsed.tier) setHssTier(parsed.tier);
            return;
          }
        }
        if (userId) {
          const dashCache = await AsyncStorage.getItem(`@dashboard_cache_${userId}`);
          if (dashCache) {
            const parsedDash = JSON.parse(dashCache);
            if (parsedDash && typeof parsedDash.hss_score === "number") {
              setHssScore(parsedDash.hss_score);
              if (parsedDash.hss_tier) setHssTier(parsedDash.hss_tier);
            }
          }
        }
      } catch {}
    }
    loadHss();
  }, [userId]);

  const isLockedCritical = Boolean(
    (hssTier === "Critical" || (hssScore > 0 && hssScore < 50)) &&
    routine?.type !== "Breathing"
  );

  useEffect(() => {
    async function fetchRoutine() {
      try {
        const storedToken = await AsyncStorage.getItem("access_token");
        const effectiveToken = token || storedToken || "";
        const response = await fetch(`${base_url}/api/exercises/${id}`, {
          headers: effectiveToken ? { "Authorization": `Bearer ${effectiveToken}` } : {}
        });
        if (!response.ok) throw new Error("Failed to fetch routine");
        const data = await response.json();
        
        const r = {
          id: data.id,
          title: data.name || "",
          duration: data.duration_minutes || 0,
          goal: data.goal || data.description || "",
          type: data.type || "Light Cardio",
          intensity: data.intensity || "Low",
          category: data.hss_tier || "Stable",
          steps: data.steps || [],
          videoUrl: data.video_url || "",
          image: resolveMediaUrl(data.media_url || ""),
          guideImages: (data.guide_images || []).map((img: string) => resolveMediaUrl(img)),
        };
        
        setRoutine(r);
      } catch (error) {
        console.error("Failed to load routine:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRoutine();
  }, [id, token]);

  const logExerciseData = async (status: string, overrideSeconds?: number) => {
    if (!routine || !userId) return;
    const finalSeconds = overrideSeconds !== undefined ? overrideSeconds : sessionDurationSeconds;
    const finalMinutes = Math.round(finalSeconds / 60);
    
    const exerciseId = generateExerciseId();
    const payload = {
      id: exerciseId,
      routine_id: routine.id,
      routine_name: routine.title,
      duration_seconds: finalSeconds,
      duration_minutes: finalMinutes,
      planned_duration_seconds: routine.duration * 60,
      planned_duration_minutes: routine.duration,
      status: status,
    };

    const storedToken = await AsyncStorage.getItem("access_token");
    const effectiveToken = token || storedToken || "";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${base_url}/api/exercises/logs/${userId}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${effectiveToken}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 401) {
        // Preserve completed exercise payload offline before prompting re-login
        await queueExerciseForSync(userId, payload);
        showToast({
          title: "Session Expired",
          message: "Your workout is preserved offline. Please log in again to sync.",
          type: "info"
        });
        await logout();
        return payload;
      }

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
    } catch (err) {
      if (userId) {
        await queueExerciseForSync(userId, payload);
      }
    }
    
    return payload; 
  };

  const handleStart = () => {
    if (isLockedCritical) return;
    setSessionStartedAt(Date.now());
    setWorkoutState("active");
  };

  // Called when user hits FINISH EXERCISE button on active screen
  const handleRequestFinish = () => {
    const elapsedSeconds = sessionStartedAt ? Math.floor((Date.now() - sessionStartedAt) / 1000) : 0;
    setSessionDurationSeconds(elapsedSeconds);
    
    // Evaluate 30s threshold
    if (elapsedSeconds < 30) {
      setShowShortSessionCheck(true);
    } else {
      setShowCompletionCheck(true);
    }
  };

  // Called when user opts to save short session (< 30s) anyway
  const handleSaveShortAnyway = () => {
    setShowShortSessionCheck(false);
    setShowCompletionCheck(true);
  };

  // Called when user opts to discard short session (< 30s)
  const handleDiscardShort = () => {
    setShowShortSessionCheck(false);
    setWorkoutState("overview");
    setSessionStartedAt(null);
    setSessionDurationSeconds(0);
    showToast({
      title: "Session Discarded",
      message: "Exercise session was discarded and not recorded.",
      type: "info"
    });
  };

  // Called when user selects "I FEEL OK" from the completion check
  const handleConfirmFinish = async () => {
    setShowCompletionCheck(false);
    setIsSubmitting(true);
    await logExerciseData("completed", sessionDurationSeconds);
    setIsSubmitting(false);
    setWorkoutState("result");
  };

  const handleCloseActive = () => {
    const elapsedSeconds = sessionStartedAt ? Math.floor((Date.now() - sessionStartedAt) / 1000) : 0;
    setSessionDurationSeconds(elapsedSeconds);
    setShowStopCheck(true);
  };

  // Hardware back press safety intercept for Android devices (HL-ENG-23 / SEC-QA-12)
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (workoutState === "active") {
          handleCloseActive();
          return true;
        }
        return false;
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [workoutState, sessionStartedAt])
  );

  const handleSymptomsPress = () => {
    setShowSafetyCheck(true);
  };

  const handleSafetySafe = () => {
    setShowSafetyCheck(false);
  };

  const handleSafetySymptoms = () => {
    setShowSafetyCheck(false);
    setShowCompletionCheck(false);
    setShowShortSessionCheck(false);
    if (!routine) return;
    
    const elapsedSeconds = sessionStartedAt ? Math.floor((Date.now() - sessionStartedAt) / 1000) : 0;
    const elapsedMinutes = Math.round(elapsedSeconds / 60);
    const exerciseId = generateExerciseId();
    
    const payload = {
      id: exerciseId,
      routine_id: routine.id,
      routine_name: routine.title,
      duration_seconds: elapsedSeconds,
      duration_minutes: elapsedMinutes,
      planned_duration_seconds: routine.duration * 60,
      planned_duration_minutes: routine.duration,
      status: "incomplete_due_to_symptoms",
    };
    
    const payloadStr = encodeURIComponent(JSON.stringify(payload));
    router.push(`/(home)/(health)/log-symptoms?triggered_by_exercise_id=${exerciseId}&pending_exercise=${payloadStr}`);
  };

  if (isLoading || !routine) {
    return (
      <View className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#f43f5e" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar style={workoutState === "active" ? "light" : "dark"} />
      
      {workoutState === "overview" && (
        <ExerciseOverview 
          routine={routine} 
          stepCount={routine.steps.length}
          onStart={handleStart}
          onBack={() => router.back()}
          isLockedCritical={isLockedCritical}
        />
      )}
      
      {workoutState === "active" && (
        <ExerciseActive
          routine={routine}
          onFinish={handleRequestFinish}
          onClose={handleCloseActive}
          onSymptoms={handleSymptomsPress}
        />
      )}
      
      {workoutState === "result" && (
        <ExerciseResult
          routine={routine}
          sessionDurationSeconds={sessionDurationSeconds}
          onDone={() => router.push({ pathname: "/(home)/(tabs)/exercises", params: { completedId: routine.id, durationSeconds: sessionDurationSeconds.toString() } })}
        />
      )}

      {/* Short Session Check (< 30s) */}
      <ShortSessionSheet
        visible={showShortSessionCheck}
        seconds={sessionDurationSeconds}
        onSaveAnyway={handleSaveShortAnyway}
        onDiscard={handleDiscardShort}
        onBack={() => setShowShortSessionCheck(false)}
      />

      {/* Standalone Safety Check (Triggered via X menu or "Feeling unwell?" link) */}
      <SafetyCheckSheet
        visible={showSafetyCheck}
        onSafe={handleSafetySafe}
        onSymptoms={handleSafetySymptoms}
        onBack={() => setShowSafetyCheck(false)}
        isSubmitting={isSubmitting}
      />

      {/* Stop Check Sheet */}
      <StopExerciseSheet
        visible={showStopCheck}
        onSymptoms={() => {
          setShowStopCheck(false);
          setShowSafetyCheck(true);
        }}
        onTired={() => {
          setShowStopCheck(false);
          if (sessionDurationSeconds < 30) {
            setShowShortSessionCheck(true);
          } else {
            setShowCompletionCheck(true);
          }
        }}
        onJustChecking={() => {
          setShowStopCheck(false);
          router.back();
        }}
        onBack={() => setShowStopCheck(false)}
      />

      {/* Post-Exercise Assessment (Triggered via FINISH EXERCISE button) */}
      <CompletionCheckSheet
        visible={showCompletionCheck}
        onOk={handleConfirmFinish}
        onSymptoms={handleSafetySymptoms}
        onBack={() => setShowCompletionCheck(false)}
      />
    </View>
  );
}
