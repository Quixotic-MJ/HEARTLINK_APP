import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, Image, Dimensions, Animated } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import YoutubePlayer from "react-native-youtube-iframe";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";

const base_url = process.env.EXPO_PUBLIC_API_URL;
const { width } = Dimensions.get("window");

const VIDEO_BY_TYPE: Record<string, string> = {
  "Light Cardio": "https://www.youtube.com/watch?v=njeZ29umqVE",
  "Stationary":   "https://www.youtube.com/watch?v=5WEBMhRc_9M",
  "Breathing":    "https://www.youtube.com/watch?v=DbDoBzGY3vo",
};

function StepItem({ number, text, isLast, isCurrent, allActive }: { number: number; text: string; isLast: boolean; isCurrent: boolean; allActive: boolean }) {
  const active = allActive || isCurrent;
  return (
    <View className="flex-row items-start" style={{ opacity: active ? 1 : 0.4 }}>
      <View className="items-center mr-4" style={{ width: 28 }}>
        <View
          className={`w-7 h-7 rounded-full items-center justify-center ${active ? "bg-primary" : "bg-slate-400 dark:bg-slate-600"}`}
        >
          <Text className="text-primary-foreground text-[12px] font-bold">{number}</Text>
        </View>
        {!isLast && (
          <View className="w-px flex-1 mt-1.5" style={{ minHeight: 20, backgroundColor: active ? "#bfdbfe" : "#e2e8f0" }} />
        )}
      </View>
      <Text
        className={`flex-1 text-[15px] leading-relaxed pt-0.5 ${active ? "font-medium text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}`}
        style={{ paddingBottom: isLast ? 0 : 20 }}
      >
        {text}
      </Text>
    </View>
  );
}

export default function ExerciseDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();

  const [routine, setRoutine] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchRoutine() {
      try {
        const response = await fetch(`${base_url}/api/exercises/${id}`);
        if (!response.ok) throw new Error("Failed to fetch routine");
        const data = await response.json();
        
        setRoutine({
          id: data.id,
          title: data.name || "",
          duration: data.duration_minutes || 0,
          goal: data.goal || "",
          type: data.type || "Light Cardio",
          intensity: data.intensity || "Low",
          category: data.css_tier || "Stable",
          steps: data.steps || [],
          videoUrl: data.video_url || VIDEO_BY_TYPE[data.type] || VIDEO_BY_TYPE["Light Cardio"],
          image: data.image_url || "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop",
        });
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRoutine();
  }, [id]);

  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (routine && timeLeft === 0) {
      setTimeLeft(routine.duration * 60);
    }
  }, [routine]);
  
  const [isActive, setIsActive] = useState(false);
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setShowSafetyCheck(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (interval) clearInterval(interval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  // Milestone haptics & state
  const [hasTriggeredHalfway, setHasTriggeredHalfway] = useState(false);
  const [hasTriggeredSeventyFive, setHasTriggeredSeventyFive] = useState(false);
  const [hasTriggeredOneMin, setHasTriggeredOneMin] = useState(false);

  useEffect(() => {
    if (!routine || !isActive) return;
    const totalSeconds = routine.duration * 60;
    
    // Halfway mark (50%)
    const halfway = Math.floor(totalSeconds / 2);
    if (timeLeft === halfway && totalSeconds > 60 && !hasTriggeredHalfway) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHasTriggeredHalfway(true);
    }
    
    // 75% mark (25% time left)
    const seventyFive = Math.floor(totalSeconds * 0.25);
    if (timeLeft === seventyFive && totalSeconds > 120 && !hasTriggeredSeventyFive) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHasTriggeredSeventyFive(true);
    }

    // 1 minute left
    if (timeLeft === 60 && totalSeconds > 120 && !hasTriggeredOneMin) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setHasTriggeredOneMin(true);
    }
  }, [timeLeft, routine, isActive, hasTriggeredHalfway, hasTriggeredSeventyFive, hasTriggeredOneMin]);

  // Breathing Visual Cue & Dynamics
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const [breathingTimes, setBreathingTimes] = useState([4000, 2000, 6000]);

  const parseSeconds = (text: string, defaultTime: number = 4) => {
    const match = text.match(/(\d+)\s*second/i);
    return match ? parseInt(match[1]) : defaultTime;
  };

  useEffect(() => {
    if (routine?.type === "Breathing" && routine.steps) {
      const coreSteps = routine.steps.filter((s: string) => !s.toLowerCase().includes("repeat"));
      if (coreSteps.length >= 3) {
        setBreathingTimes([
          parseSeconds(coreSteps[0], 4) * 1000,
          parseSeconds(coreSteps[1], 2) * 1000,
          parseSeconds(coreSteps[2], 6) * 1000,
        ]);
      }
    }
  }, [routine]);

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (routine?.type === "Breathing" && isActive) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1.5,
            duration: breathingTimes[0],
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 1.5,
            duration: breathingTimes[1],
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 1,
            duration: breathingTimes[2],
            useNativeDriver: true,
          }),
        ])
      );
      animLoop.start();
    } else {
      breatheAnim.stopAnimation();
      breatheAnim.setValue(1);
    }
    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [routine, isActive, breatheAnim, breathingTimes]);

  // Voice Coaching & Step Sync
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [instructionsComplete, setInstructionsComplete] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    if (!routine || !routine.steps || routine.steps.length === 0) return;

    if (isActive && !instructionsComplete) {
      const isBreathing = routine.type === "Breathing";
      
      const runCoachingSequence = async () => {
        // Read intro only if it's the very start of the routine
        if (timeLeft === routine.duration * 60) {
           Speech.speak("Starting routine. Let's go over the form.", { rate: 0.95 });
           await new Promise(res => { timeoutId = setTimeout(res, 3500); });
        }
        if (!isMounted) return;

        if (isBreathing) {
          // Breathing Mode: Continuous Loop
          while (isMounted) {
            for (let i = 0; i < routine.steps.length; i++) {
              if (!isMounted) return;
              if (routine.steps[i].toLowerCase().includes("repeat")) continue; 
              
              setCurrentStepIndex(i);
              Speech.speak(routine.steps[i], { rate: 0.95 });
              
              const waitTime = parseSeconds(routine.steps[i], 4) * 1000;
              await new Promise(res => { timeoutId = setTimeout(res, waitTime); });
            }
          }
        } else {
          // Cardio / Stationary Mode: Read once with smart pacing
          for (let i = 0; i < routine.steps.length; i++) {
            if (!isMounted) return;
            setCurrentStepIndex(i);
            Speech.speak(routine.steps[i], { rate: 0.95 });
            
            const waitTime = parseSeconds(routine.steps[i], 4) * 1000;
            // Add a buffer so it doesn't clip immediately after talking
            await new Promise(res => { timeoutId = setTimeout(res, waitTime + 1500); });
          }

          if (isMounted) {
            setCurrentStepIndex(-1);
            setInstructionsComplete(true);
            Speech.speak("Great. Now keep this up for the rest of the timer.", { rate: 0.95 });
          }
        }
      };

      runCoachingSequence();
    } else if (!isActive) {
      Speech.stop();
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (!isActive) Speech.stop();
    };
  }, [isActive, instructionsComplete, routine]);

  // Percentage-based Encouragement
  const [spokenHalfway, setSpokenHalfway] = useState(false);
  const [spokenSeventyFive, setSpokenSeventyFive] = useState(false);
  const [spokenOneMin, setSpokenOneMin] = useState(false);

  useEffect(() => {
    if (!routine || !isActive || !instructionsComplete) return;
    const totalSeconds = routine.duration * 60;
    
    const halfway = Math.floor(totalSeconds / 2);
    const seventyFive = Math.floor(totalSeconds * 0.25);

    if (timeLeft === halfway && totalSeconds > 60 && !spokenHalfway) {
      Speech.speak("You are halfway there. You're doing great, keep going.", { rate: 0.95 });
      setSpokenHalfway(true);
    }

    if (timeLeft === seventyFive && totalSeconds > 120 && !spokenSeventyFive) {
      Speech.speak("Almost done, keep a steady pace.", { rate: 0.95 });
      setSpokenSeventyFive(true);
    }

    if (timeLeft === 60 && totalSeconds > 120 && !spokenOneMin) {
      Speech.speak("Just one minute left! Finish strong.", { rate: 0.95 });
      setSpokenOneMin(true);
    }
  }, [timeLeft, isActive, instructionsComplete, routine, spokenHalfway, spokenSeventyFive, spokenOneMin]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const generateExerciseId = () => `ex-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  const getElapsedDuration = () => {
    if (!routine) return { seconds: 0, minutes: 0 };
    const totalSeconds = routine.duration * 60;
    const elapsedSeconds = Math.max(0, totalSeconds - timeLeft);
    const elapsedMinutes = parseFloat((elapsedSeconds / 60).toFixed(2));
    return { seconds: elapsedSeconds, minutes: elapsedMinutes };
  };

  const logExerciseAsync = async (status: string, exerciseId: string) => {
    if (!routine) return;
    const { seconds, minutes } = getElapsedDuration();
    const payload = {
      id: exerciseId,
      routine_id: routine.id,
      routine_name: routine.title,
      duration_seconds: seconds,
      duration_minutes: minutes,
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
      console.warn("Failed to log exercise directly, logging offline fallback:", err);
    }
  };

  const handleEndEarly = () => {
    // CLINICAL REQUIREMENT: Ending an exercise must have ZERO friction for cardiovascular patients.
    // Do NOT add a confirmation dialog here so patients feeling fatigued can exit immediately to safety check.
    setIsActive(false);
    setShowSafetyCheck(true);
  };

  const handleSafetySafe = async () => {
    setIsSubmitting(true);
    const exerciseId = generateExerciseId();
    try {
      await logExerciseAsync("completed", exerciseId);
    } finally {
      setIsSubmitting(false);
      setShowSafetyCheck(false);
      router.push({
        pathname: "/(home)/(tabs)/exercises",
        params: { completedId: routine.id },
      });
    }
  };

  const handleSafetySymptoms = () => {
    // CLINICAL REQUIREMENT: Never block navigation to the symptom logger on a network call.
    // Fire exercise log asynchronously (best-effort) and navigate immediately.
    setShowSafetyCheck(false);
    const exerciseId = generateExerciseId();
    logExerciseAsync("incomplete_due_to_symptoms", exerciseId);
    router.push(`/(home)/(health)/log-symptoms?triggered_by_exercise_id=${exerciseId}`);
  };

  if (isLoading || !routine) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  const getYoutubeVideoId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    return match ? match[1] : null;
  };
  const videoId = routine ? getYoutubeVideoId(routine.videoUrl) : null;

  const steps = routine.steps && routine.steps.length > 0 ? routine.steps : [
    "Sit straight on the edge of a sturdy chair with your feet flat on the floor.",
    "Inhale deeply and slowly raise your arms above your head.",
    "Exhale gently while lowering your arms back down to your sides.",
    "Keep your shoulders relaxed and avoid straining your neck.",
    "Repeat this motion smoothly for 10–15 repetitions.",
  ];

  const hasStarted = timeLeft < routine.duration * 60;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Header Area */}
        <View className="w-full bg-black relative" style={{ paddingTop: Math.max(insets.top, 10) }}>
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute z-10 w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            style={{ top: Math.max(insets.top, 10) + 10, left: 15 }}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>

          {routine?.type === "Breathing" ? (
            <View className="w-full items-center justify-center overflow-hidden bg-slate-900" style={{ aspectRatio: 16 / 9 }}>
              <Animated.View
                style={{
                  transform: [{ scale: breatheAnim }],
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderWidth: 2,
                  borderColor: "rgba(255, 255, 255, 0.4)",
                  position: "absolute"
                }}
              />
              <Text className="text-white mt-32 font-medium tracking-widest text-[11px] uppercase z-10 text-center">
                {isActive ? "Breathe smoothly with the circle" : "Press Start to begin"}
              </Text>
            </View>
          ) : videoId ? (
            <YoutubePlayer
              height={width * (9 / 16)}
              width={width}
              play={isActive}
              videoId={videoId}
            />
          ) : (
            <View className="w-full items-center justify-center overflow-hidden" style={{ aspectRatio: 16 / 9 }}>
              <Image source={{ uri: routine.image }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
              <View className="absolute inset-0 bg-black/40" />
            </View>
          )}
        </View>

        <View className="px-5 pt-6">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800">
              <Text className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">{routine.type}</Text>
            </View>
            <View className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <Text className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{routine.duration} min</Text>
            </View>
          </View>
          
          <Text className="text-[30px] font-bold text-slate-900 dark:text-white leading-tight tracking-tight mb-4">
            {routine.title}
          </Text>
          <Text className="text-[16px] text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
            {routine.goal}
          </Text>

          {/* Info Cards */}
          <View className="flex-row items-center gap-3 mb-10">
            <View className="flex-1 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/70 items-center justify-center shadow-sm shadow-slate-100">
              <View className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center mb-3">
                <Feather name="activity" size={22} color="#1e4ed8" />
              </View>
              <Text className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest mb-1">Intensity</Text>
              <Text className="text-[16px] font-black text-slate-900 dark:text-white">{routine.intensity}</Text>
            </View>
            <View className="flex-1 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/70 items-center justify-center shadow-sm shadow-slate-100">
              <View className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 items-center justify-center mb-3">
                <Feather name="shield" size={22} color="#7e22ce" />
              </View>
              <Text className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest mb-1">Risk Tier</Text>
              <Text className="text-[16px] font-black text-slate-900 dark:text-white">{routine.category}</Text>
            </View>
          </View>

          {/* Gamification Badge */}
          <View className="flex-row justify-center mb-4 px-2">
            <View className="flex-1 bg-green-100 dark:bg-green-900/30 px-4 py-2.5 rounded-full flex-row items-center justify-center gap-2 border border-green-200 dark:border-green-800">
              <Feather name="trending-up" size={16} color="#16a34a" />
              <Text 
                className="text-green-700 dark:text-green-400 font-bold text-[13px] text-center"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Finish session to gain +5 Stability Points
              </Text>
            </View>
          </View>

          {/* Timer Section */}
          <View className="bg-white dark:bg-slate-900 p-6 rounded-[32px] items-center justify-center mb-6 border border-slate-200 dark:border-slate-800/70 shadow-sm shadow-slate-200/50">
            <Text className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-2">Time Remaining</Text>
            <Text className="text-[56px] font-bold text-slate-900 dark:text-white tracking-tighter leading-none">
              {formatTime(timeLeft)}
            </Text>
          </View>

          {/* ── Step-by-step guide ── */}
          <Text className="text-[16px] font-medium text-slate-900 dark:text-white mb-4 mt-2">
            Instruction Guide
          </Text>
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-5 mb-8 shadow-sm shadow-slate-100">
            {steps.map((step: string, i: number) => (
              <StepItem 
                key={i} 
                number={i + 1} 
                text={step} 
                isLast={i === steps.length - 1} 
                isCurrent={i === currentStepIndex} 
                allActive={currentStepIndex === -1}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Buttons */}
      <View style={{ paddingBottom: Math.max(insets.bottom, 20) }} className="absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 px-5 pt-4 pb-6 flex-row gap-3">
         {hasStarted && (
           <TouchableOpacity
             activeOpacity={0.8}
             onPress={handleEndEarly}
             className="px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 items-center justify-center flex-row"
           >
             <Feather name="square" size={18} color="#64748b" className="mr-1.5" />
             <Text className="text-slate-700 dark:text-slate-300 font-bold text-[15px]">End Early</Text>
           </TouchableOpacity>
         )}

         <TouchableOpacity 
           activeOpacity={0.8}
           onPress={toggleTimer}
           className={`flex-1 py-4 rounded-2xl items-center justify-center flex-row shadow-sm ${isActive ? 'bg-red-50 border border-red-100' : hasStarted ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700' : 'bg-primary'}`}
         >
           {isActive ? (
             <>
                <Feather name="pause" size={22} color="#b91c1c" className="mr-2" />
                <Text className="text-red-700 text-[18px] font-bold">Pause Routine</Text>
             </>
           ) : (
             <>
                <Feather name="play" size={22} className={`mr-2 ${hasStarted ? 'text-primary' : 'text-primary-foreground'}`} />
                <Text className={`${hasStarted ? 'text-primary' : 'text-primary-foreground'} text-[18px] font-bold`}>
                  {hasStarted ? "Resume Routine" : "Start Routine"}
                </Text>
             </>
           )}
         </TouchableOpacity>
      </View>

      {/* Safety Check Bottom Sheet Modal */}
      <Modal visible={showSafetyCheck} transparent animationType="fade">
        <View className="flex-1 bg-slate-900/40 justify-end">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 pb-12 shadow-xl border-t border-slate-200 dark:border-slate-800">
            <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-6" />
            <Text className="text-[22px] font-bold text-slate-900 dark:text-white mb-2 text-center">Safety Check</Text>
            <Text className="text-[16px] text-slate-500 dark:text-slate-400 text-center mb-8 leading-relaxed px-4">Did you experience any chest discomfort or dizziness during this routine?</Text>

            <TouchableOpacity 
              activeOpacity={0.8}
              disabled={isSubmitting}
              onPress={handleSafetySafe}
              className="bg-blue-50 border border-blue-100 py-4 rounded-2xl items-center mb-3 flex-row justify-center"
            >
              <Text className="text-[20px] mr-2">👍</Text>
              <Text className="text-[#1e4ed8] font-bold text-[17px]">
                {isSubmitting ? "Logging..." : "No, I feel great"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleSafetySymptoms}
              className="bg-red-50 border border-red-100 py-4 rounded-2xl items-center flex-row justify-center"
            >
              <Text className="text-[20px] mr-2">⚠️</Text>
              <Text className="text-red-700 font-bold text-[17px]">Yes, I felt symptoms</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}
