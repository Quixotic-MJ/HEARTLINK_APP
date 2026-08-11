import React, { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import { SafetyCheckSheet } from "../../../components/ui/SafetyCheckSheet";
import { CompletionCheckSheet } from "../../../components/ui/CompletionCheckSheet";
import { StopExerciseSheet } from "../../../components/ui/StopExerciseSheet";
import { queueExerciseForSync } from "../../../services/SyncService";

// Components
import { ExerciseOverview } from "../../../components/exercise/ExerciseOverview";
import { ExerciseActive } from "../../../components/exercise/ExerciseActive";
import { ExerciseResult } from "../../../components/exercise/ExerciseResult";

const base_url = process.env.EXPO_PUBLIC_API_URL;

const generateExerciseId = () => `ex-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

export default function ExerciseDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useUser();

  const [routine, setRoutine] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [workoutState, setWorkoutState] = useState<"overview" | "active" | "result">("overview");
  
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [sessionDurationSeconds, setSessionDurationSeconds] = useState(0);
  
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);
  const [showCompletionCheck, setShowCompletionCheck] = useState(false);
  const [showStopCheck, setShowStopCheck] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchRoutine() {
      try {
        const response = await fetch(`${base_url}/api/exercises/${id}`);
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
          image: data.media_url || "",
          guideImages: data.guide_images || [],
        };
        
        setRoutine(r);
      } catch (error) {
        console.error("Failed to load routine:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRoutine();
  }, [id]);

  const logExerciseData = async (status: string, overrideSeconds?: number) => {
    if (!routine) return;
    const finalSeconds = overrideSeconds !== undefined ? overrideSeconds : sessionDurationSeconds;
    const finalMinutes = parseFloat((finalSeconds / 60).toFixed(2));
    
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

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      await fetch(`${base_url}/api/exercises/logs/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (err) {
      if (userId) {
        await queueExerciseForSync(userId, payload);
      }
    }
    
    return payload; 
  };

  const handleStart = () => {
    setSessionStartedAt(Date.now());
    setWorkoutState("active");
  };

  // Called when user hits the big FINISH EXERCISE button on the active screen
  const handleRequestFinish = () => {
    const elapsedSeconds = sessionStartedAt ? Math.floor((Date.now() - sessionStartedAt) / 1000) : 0;
    setSessionDurationSeconds(elapsedSeconds);
    // Show the "How was the exercise?" modal
    setShowCompletionCheck(true);
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
    setShowStopCheck(true);
  };

  const handleSymptomsPress = () => {
    setShowSafetyCheck(true);
  };

  const handleSafetySafe = () => {
    setShowSafetyCheck(false);
  };

  const handleSafetySymptoms = () => {
    setShowSafetyCheck(false);
    setShowCompletionCheck(false); // Make sure to close this if it was open
    if (!routine) return;
    
    const elapsedSeconds = sessionStartedAt ? Math.floor((Date.now() - sessionStartedAt) / 1000) : 0;
    const elapsedMinutes = parseFloat((elapsedSeconds / 60).toFixed(2));
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
          onDone={() => router.push({ pathname: "/(home)/(tabs)/exercises", params: { completedId: routine.id } })}
        />
      )}

      {/* Standalone Safety Check (Triggered via X menu or "Feeling unwell?" link) */}
      <SafetyCheckSheet
        visible={showSafetyCheck}
        onSafe={handleSafetySafe}
        onSymptoms={handleSafetySymptoms}
        onBack={() => setShowSafetyCheck(false)}
        isSubmitting={isSubmitting}
      />

      {/* New Stop Check Sheet */}
      <StopExerciseSheet
        visible={showStopCheck}
        onSymptoms={() => {
          setShowStopCheck(false);
          setShowSafetyCheck(true);
        }}
        onTired={() => {
          setShowStopCheck(false);
          router.back();
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
