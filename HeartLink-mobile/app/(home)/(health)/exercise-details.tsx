import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Dimensions, Animated, Easing, ActivityIndicator, Switch } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafetyCheckSheet } from "../../../components/ui/SafetyCheckSheet";
import { queueExerciseForSync } from "../../../services/SyncService";
import { useUser } from "../../../contexts/UserContext";
import YoutubePlayer from "react-native-youtube-iframe";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";

const base_url = process.env.EXPO_PUBLIC_API_URL;
const { width } = Dimensions.get("window");

// ─── Data Normalization ────────────────────────────────────────────────────────

export type RoutineStep = {
  id: string;
  instruction: string;
  duration_seconds: number;
  type: "instruction" | "breathing";
  phase?: "inhale" | "hold" | "exhale" | "rest";
  voice_cue?: string;
};

const parseSeconds = (text: string, defaultTime: number = 10) => {
  const match = text.match(/(\d+)\s*second/i);
  return match ? parseInt(match[1]) : defaultTime;
};

const normalizeRoutineSteps = (steps: any[], totalSeconds: number): RoutineStep[] => {
  if (!steps || steps.length === 0) return [];
  
  let normalized: RoutineStep[] = [];
  
  if (typeof steps[0] === 'string') {
    steps.forEach((s, idx) => {
      normalized.push({
        id: `legacy-${idx}`,
        instruction: s,
        duration_seconds: parseSeconds(s, 10),
        type: "instruction",
        voice_cue: "Next movement."
      });
    });
  } else {
    normalized = steps as RoutineStep[];
  }

  let timeline: RoutineStep[] = [];
  let accumulatedTime = 0;
  let idx = 0;
  
  // Extend timeline to exactly match totalSeconds
  while (accumulatedTime < totalSeconds) {
    const originalStep = normalized[idx % normalized.length];
    let timeNeeded = totalSeconds - accumulatedTime;
    let stepDuration = Math.min(originalStep.duration_seconds || 10, timeNeeded);
    
    if (stepDuration > 0) {
      timeline.push({
        ...originalStep,
        id: `${originalStep.id || idx}-${accumulatedTime}`,
        duration_seconds: stepDuration
      });
      accumulatedTime += stepDuration;
    }
    idx++;
  }
  
  return timeline;
};

const getStepIndexFromTimeLeft = (timeLeft: number, totalSeconds: number, timelineSteps: RoutineStep[]) => {
  const elapsedSeconds = totalSeconds - timeLeft;
  let timeAccum = 0;
  for (let i = 0; i < timelineSteps.length; i++) {
    timeAccum += timelineSteps[i].duration_seconds;
    if (elapsedSeconds < timeAccum || i === timelineSteps.length - 1) {
      return i;
    }
  }
  return timelineSteps.length - 1;
};

// ─── MediaRenderer ─────────────────────────────────────────────────────────────

function getYoutubeVideoId(url: string) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
}

function MediaRenderer({
  routine,
  isActive
}: {
  routine: any;
  isActive: boolean;
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const videoId = routine ? getYoutubeVideoId(routine.videoUrl || "") : null;

  if (videoId && !videoFailed) {
    return (
      <View style={{ width: width, aspectRatio: 16 / 9, backgroundColor: "#0f172a" }}>
        <YoutubePlayer
          height={width * (9 / 16)}
          width={width}
          play={isActive}
          videoId={videoId}
          onError={() => setTimeout(() => setVideoFailed(true), 0)}
          initialPlayerParams={{ controls: false, modestbranding: true }}
        />
      </View>
    );
  }

  if (routine?.image && !imageFailed) {
    return (
      <View className="w-full items-center justify-center overflow-hidden bg-slate-100" style={{ aspectRatio: 16 / 9 }}>
        <Image 
          source={{ uri: routine.image }} 
          className="absolute inset-0 w-full h-full" 
          resizeMode="cover"
          onError={() => setTimeout(() => setImageFailed(true), 0)}
        />
        <View className="absolute inset-0 bg-slate-900/10" />
      </View>
    );
  }

  return (
    <View className="w-full items-center justify-center bg-slate-100 border-b border-slate-200" style={{ aspectRatio: 16 / 9 }}>
      <Feather name="video-off" size={32} color="#cbd5e1" className="mb-2" />
      <Text className="text-slate-400 font-medium text-[13px] tracking-wide uppercase">Visuals Unavailable</Text>
    </View>
  );
}

// ─── BreathingRenderer ─────────────────────────────────────────────────────────

function BreathingRenderer({
  animValue,
  currentStep,
  stepRemaining
}: {
  animValue: Animated.Value;
  currentStep: RoutineStep;
  stepRemaining: number;
}) {
  
  let scale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.4]
  });

  let opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.4]
  });

  return (
    <View className="w-full items-center justify-center bg-slate-900 flex-1 min-h-[250px] relative">
      <Animated.View
        style={{
          position: "absolute",
          width: 150,
          height: 150,
          borderRadius: 75,
          backgroundColor: "rgba(244, 63, 94, 0.2)",
          transform: [{ scale }],
          opacity
        }}
      />
      <View className="w-24 h-24 rounded-full bg-slate-800/80 border-2 border-rose-500/50 items-center justify-center z-10 shadow-lg shadow-rose-500/20">
         <Text className="text-white text-3xl font-bold tracking-tighter">
            {stepRemaining > 0 ? stepRemaining : 1}
         </Text>
      </View>
    </View>
  );
}

// ─── Screen Component ─────────────────────────────────────────────────────────

export default function ExerciseDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();

  const [routine, setRoutine] = useState<any>(null);
  const [timelineSteps, setTimelineSteps] = useState<RoutineStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [workoutState, setWorkoutState] = useState<"overview" | "get_ready" | "active" | "transition" | "result">("overview");
  const [sessionStatus, setSessionStatus] = useState<"completed" | "partial" | "abandoned" | "incomplete_due_to_symptoms">("completed");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

  // Authoritative clocks
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [getReadyTime, setGetReadyTime] = useState(3);
  const [transitionTime, setTransitionTime] = useState(2);
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);

  // Derived state
  const totalSeconds = routine ? routine.duration * 60 : 0;
  const currentStepIndex = timelineSteps.length > 0 && timeLeft <= totalSeconds
    ? getStepIndexFromTimeLeft(timeLeft, totalSeconds, timelineSteps) 
    : 0;
  const currentStep = timelineSteps[currentStepIndex];

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
        };
        
        setRoutine(r);
        setTimeLeft(r.duration * 60);
        setTimelineSteps(normalizeRoutineSteps(r.steps, r.duration * 60));

      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRoutine();
  }, [id]);

  // Handle the single authoritative interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (workoutState === "get_ready") {
      interval = setInterval(() => {
        setGetReadyTime(t => {
          if (t <= 1) {
            setWorkoutState("active");
            setIsActive(true);
            if (isVoiceEnabled) Speech.speak("Begin", { rate: 0.95 });
            return 3;
          }
          if (isVoiceEnabled && t <= 3) Speech.speak(t.toString(), { rate: 0.95 });
          return t - 1;
        });
      }, 1000);
    } 
    
    else if (workoutState === "transition") {
      interval = setInterval(() => {
        setTransitionTime(t => {
          if (t <= 1) {
            setWorkoutState("active");
            setIsActive(true);
            return 2;
          }
          return t - 1;
        });
      }, 1000);
    }
    
    else if (workoutState === "active" && isActive) {
      interval = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setIsActive(false);
            setWorkoutState("result");
            setSessionStatus("completed");
            if (isVoiceEnabled) Speech.speak("Exercise complete.", { rate: 0.95 });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            logExerciseComplete("completed");
            return 0;
          }
          
          const currentIdx = getStepIndexFromTimeLeft(t, totalSeconds, timelineSteps);
          const nextIdx = getStepIndexFromTimeLeft(t - 1, totalSeconds, timelineSteps);
          
          // Trigger transition if moving to a new instruction step
          if (nextIdx > currentIdx && timelineSteps[nextIdx].type !== "breathing") {
            setWorkoutState("transition");
            setTransitionTime(2);
            setIsActive(false); // Pause timer during transition
            return t; // Freeze time
          }
          
          return t - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [workoutState, isActive, timelineSteps, totalSeconds, isVoiceEnabled]);

  // Voice Cue Trigger
  useEffect(() => {
    if (workoutState === 'active' && isVoiceEnabled && currentStep) {
      Speech.stop(); // Stop previous cue to prevent overlap
      if (currentStep.voice_cue) {
        Speech.speak(currentStep.voice_cue, { rate: 0.95 });
      }
    }
  }, [currentStepIndex, workoutState, isVoiceEnabled]);

  // Breathing Animation derivation
  const breatheAnim = useRef(new Animated.Value(0)).current;

  // Calculate precise step timings
  let stepStartTime = 0;
  for (let i = 0; i < currentStepIndex; i++) {
    stepStartTime += timelineSteps[i].duration_seconds;
  }
  const stepElapsed = (totalSeconds - timeLeft) - stepStartTime;
  const stepRemaining = currentStep ? currentStep.duration_seconds - stepElapsed : 0;

  useEffect(() => {
    if (workoutState !== 'active' || !isActive || !currentStep) {
      breatheAnim.stopAnimation();
      return;
    }

    if (currentStep.type === "breathing") {
      const remainingMs = stepRemaining * 1000;
      let toValue = 0;
      
      if (currentStep.phase === "inhale") toValue = 1;
      else if (currentStep.phase === "hold") {
        breatheAnim.setValue(1);
        toValue = 1;
      }
      else if (currentStep.phase === "exhale") toValue = 0;
      else if (currentStep.phase === "rest") {
        breatheAnim.setValue(0);
        toValue = 0;
      }
      
      Animated.timing(breatheAnim, {
        toValue,
        duration: remainingMs,
        useNativeDriver: true,
        easing: Easing.linear
      }).start();
    } else {
      breatheAnim.setValue(0);
    }
  }, [currentStepIndex, isActive, workoutState]);

  // ─── Logging & Completion ───────────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const generateExerciseId = () => `ex-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  const getElapsedDuration = () => {
    if (!routine) return { seconds: 0, minutes: 0 };
    const elapsedSeconds = Math.max(0, totalSeconds - timeLeft);
    const elapsedMinutes = parseFloat((elapsedSeconds / 60).toFixed(2));
    return { seconds: elapsedSeconds, minutes: elapsedMinutes };
  };

  const logExerciseData = async (status: string, exerciseId: string) => {
    if (!routine) return;
    const { seconds, minutes } = getElapsedDuration();
    const payload = {
      id: exerciseId,
      routine_id: routine.id,
      routine_name: routine.title,
      duration_seconds: seconds,
      duration_minutes: minutes,
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
  };

  const logExerciseComplete = async (overrideStatus?: string) => {
    setIsSubmitting(true);
    const exerciseId = generateExerciseId();
    const finalStatus = overrideStatus || determineCompletionStatus();
    await logExerciseData(finalStatus, exerciseId);
    setIsSubmitting(false);
  };

  const determineCompletionStatus = () => {
    if (!routine) return "abandoned";
    const { seconds } = getElapsedDuration();
    const pct = seconds / totalSeconds;
    if (seconds < 60 || pct < 0.1) return "abandoned";
    if (pct < 0.8) return "partial";
    return "completed";
  };

  const handleEndEarly = () => {
    setIsActive(false);
    setShowSafetyCheck(true);
  };

  const handleSafetySafe = async () => {
    setShowSafetyCheck(false);
    const finalStatus = determineCompletionStatus();
    setSessionStatus(finalStatus);
    setWorkoutState("result");
    await logExerciseComplete(finalStatus);
  };

  const handleSafetySymptoms = () => {
    setShowSafetyCheck(false);
    if (!routine) return;
    const exerciseId = generateExerciseId();
    const { seconds, minutes } = getElapsedDuration();
    const payload = {
      id: exerciseId,
      routine_id: routine.id,
      routine_name: routine.title,
      duration_seconds: seconds,
      duration_minutes: minutes,
      planned_duration_seconds: routine.duration * 60,
      planned_duration_minutes: routine.duration,
      status: "incomplete_due_to_symptoms",
    };
    const payloadStr = encodeURIComponent(JSON.stringify(payload));
    router.push(`/(home)/(health)/log-symptoms?triggered_by_exercise_id=${exerciseId}&pending_exercise=${payloadStr}`);
  };

  const startMovement = () => {
    setWorkoutState("get_ready");
    if (isVoiceEnabled) Speech.speak("Get ready.", { rate: 0.95 });
  };

  // ─── Renderers ──────────────────────────────────────────────────────────────

  const renderOverviewState = () => (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="w-full bg-slate-100 relative" style={{ height: width * 0.7 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute z-10 w-10 h-10 rounded-full bg-white/50 backdrop-blur-md items-center justify-center"
            style={{ top: Math.max(insets.top, 10) + 10, left: 15 }}
          >
            <Feather name="arrow-left" size={20} color="#1e293b" />
          </TouchableOpacity>
          
          {routine.image ? (
            <Image source={{ uri: routine.image }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
          ) : (
            <View className="flex-1 items-center justify-center bg-rose-50">
              <Feather name="activity" size={40} color="#f43f5e" />
            </View>
          )}
        </View>

        <View className="px-6 pt-6 bg-white flex-1 -mt-6 rounded-t-3xl">
          <Text className="text-[28px] font-bold text-slate-900 leading-tight mb-4">
            {routine.title}
          </Text>
          
          <View className="flex-row flex-wrap gap-2 mb-8">
            <View className="bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
              <Text className="text-[13px] font-bold text-rose-700">{routine.duration} min</Text>
            </View>
            <View className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <Text className="text-[13px] font-bold text-slate-700">{routine.intensity} Intensity</Text>
            </View>
            <View className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <Text className="text-[13px] font-bold text-slate-700">{timelineSteps.filter(s => s.type !== 'breathing').length || timelineSteps.length} movements</Text>
            </View>
          </View>
          
          <Text className="text-[18px] font-semibold text-slate-900 mb-2">Why this movement?</Text>
          <Text className="text-[16px] text-slate-600 leading-relaxed mb-8">{routine.goal}</Text>

          <View className="flex-row items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
            <View className="flex-row items-center">
              <Feather name="volume-2" size={20} color="#475569" className="mr-3" />
              <Text className="text-slate-700 font-medium">Voice Guidance</Text>
            </View>
            <Switch
              value={isVoiceEnabled}
              onValueChange={setIsVoiceEnabled}
              trackColor={{ false: "#cbd5e1", true: "#f43f5e" }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingBottom: Math.max(insets.bottom, 20) }} className="absolute bottom-0 w-full px-6 pt-4 pb-6 bg-white border-t border-slate-100">
         <TouchableOpacity 
           activeOpacity={0.8}
           onPress={startMovement}
           className="w-full py-4 rounded-full items-center justify-center bg-slate-900 shadow-sm"
         >
           <Text className="text-white text-[18px] font-bold tracking-wide">START MOVEMENT</Text>
         </TouchableOpacity>
      </View>
    </View>
  );

  const renderGetReady = () => (
    <View className="flex-1 bg-slate-900 items-center justify-center px-6">
      <Text className="text-rose-500 font-bold text-xl uppercase tracking-widest mb-4">Get Ready</Text>
      <Text className="text-white text-3xl font-bold text-center mb-12">{routine.title}</Text>
      <View className="w-24 h-24 rounded-full bg-white/10 items-center justify-center">
        <Text className="text-white text-5xl font-bold">{getReadyTime}</Text>
      </View>
    </View>
  );

  const renderTransition = () => (
    <View className="flex-1 bg-slate-900 items-center justify-center px-6">
      <Text className="text-slate-400 font-bold text-lg uppercase tracking-widest mb-4">Next Movement</Text>
      <Text className="text-white text-3xl font-bold text-center leading-tight mb-8">
        {timelineSteps[currentStepIndex + 1]?.instruction || "Continue"}
      </Text>
      <Text className="text-rose-400 text-lg font-medium">Get ready...</Text>
    </View>
  );

  const renderActiveState = () => {
    const progressPercent = ((totalSeconds - timeLeft) / totalSeconds) * 100;
    const isBreathing = currentStep?.type === "breathing";
    
    return (
      <View className="flex-1 bg-white">
        <View className="w-full relative" style={{ paddingTop: Math.max(insets.top, 10), backgroundColor: "#0f172a" }}>
          <View className="flex-row items-center justify-between px-5 pb-4">
             <TouchableOpacity onPress={handleEndEarly} className="w-10 h-10 rounded-full bg-white/10 items-center justify-center">
               <Feather name="x" size={20} color="#fff" />
             </TouchableOpacity>
             <Text className="text-white font-medium text-[16px]">{routine.title}</Text>
             <TouchableOpacity onPress={() => setIsVoiceEnabled(!isVoiceEnabled)} className="w-10 h-10 rounded-full bg-white/10 items-center justify-center">
               <Feather name={isVoiceEnabled ? "volume-2" : "volume-x"} size={18} color="#fff" />
             </TouchableOpacity>
          </View>

          {isBreathing ? (
            <BreathingRenderer animValue={breatheAnim} currentStep={currentStep} stepRemaining={stepRemaining} />
          ) : (
            <MediaRenderer routine={routine} isActive={isActive} />
          )}
        </View>

        <View className="flex-1 px-6 pt-8 pb-10 items-center justify-between bg-white">
          <View className="w-full items-center">
            <View className="bg-slate-100 px-3 py-1 rounded-full mb-6">
              <Text className="text-[13px] font-bold text-slate-500 tracking-widest uppercase">
                {isBreathing ? (currentStep?.phase?.toUpperCase() || "BREATHE") : `STEP ${currentStepIndex + 1} OF ${timelineSteps.length}`}
              </Text>
            </View>
            <Text className="text-[32px] font-bold text-slate-900 text-center leading-tight">
              {currentStep?.instruction || "Keep going."}
            </Text>
          </View>

          <View className="w-full items-center">
            <Text className="text-[40px] font-semibold text-slate-400 tracking-tighter leading-none mb-6">
              {formatTime(timeLeft)}
            </Text>
            
            <View className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-8">
              <View className="h-full bg-slate-900 rounded-full" style={{ width: `${progressPercent}%` }} />
            </View>

            <View className="flex-row items-center justify-center w-full gap-4">
               <TouchableOpacity onPress={handleEndEarly} className="flex-1 py-4 rounded-2xl bg-slate-100 items-center justify-center border border-slate-200">
                 <Text className="text-slate-700 font-bold text-[16px]">End Early</Text>
               </TouchableOpacity>

               <TouchableOpacity onPress={() => setIsActive(!isActive)} className={`flex-1 py-4 rounded-2xl items-center justify-center ${isActive ? 'bg-rose-50 border border-rose-200' : 'bg-slate-900 border border-slate-900'}`}>
                 <Text className={isActive ? "text-rose-700 text-[16px] font-bold" : "text-white text-[16px] font-bold"}>
                   {isActive ? "Pause" : "Resume"}
                 </Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderResultState = () => {
    const { minutes, seconds } = getElapsedDuration();
    const formattedElapsed = formatTime(seconds);
    const formattedPlanned = formatTime(totalSeconds);
    
    let title = "";
    let description = "";
    
    if (sessionStatus === "completed") {
      title = "Movement Complete";
      description = "Session recorded.";
    } else if (sessionStatus === "partial") {
      title = "Movement Ended";
      description = "Partial activity recorded.";
    } else if (sessionStatus === "abandoned") {
      title = "Session Ended";
      description = "Not counted as active exercise.";
    } else if (sessionStatus === "incomplete_due_to_symptoms") {
      title = "Session Stopped";
      description = "Your activity was saved for your health history.";
    }

    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <View className={`w-20 h-20 rounded-full items-center justify-center mb-6 ${sessionStatus === 'completed' ? 'bg-green-100' : 'bg-slate-100'}`}>
          <Feather name={sessionStatus === 'completed' ? "check" : "clock"} size={40} color={sessionStatus === 'completed' ? "#16a34a" : "#64748b"} />
        </View>
        <Text className="text-[28px] font-bold text-slate-900 mb-2">{title}</Text>
        <Text className="text-[22px] font-semibold text-slate-700 mb-2">{formattedElapsed} / {formattedPlanned}</Text>
        <Text className="text-[16px] text-slate-500 text-center mb-10 px-4">{description}</Text>
        
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: "/(home)/(tabs)/exercises", params: sessionStatus !== "abandoned" ? { completedId: routine.id } : {} })}
          className="w-full py-4 rounded-full items-center justify-center bg-slate-900 shadow-sm"
        >
          <Text className="text-white text-[16px] font-bold">BACK TO MOVEMENT</Text>
        </TouchableOpacity>
      </View>
    );
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
      <StatusBar style={workoutState === "active" || workoutState === "get_ready" || workoutState === "transition" ? "light" : "dark"} />
      
      {workoutState === "overview" && renderOverviewState()}
      {workoutState === "get_ready" && renderGetReady()}
      {workoutState === "active" && renderActiveState()}
      {workoutState === "transition" && renderTransition()}
      {workoutState === "result" && renderResultState()}

      <SafetyCheckSheet
        visible={showSafetyCheck}
        onSafe={handleSafetySafe}
        onSymptoms={handleSafetySymptoms}
        isSubmitting={isSubmitting}
      />
    </View>
  );
}
