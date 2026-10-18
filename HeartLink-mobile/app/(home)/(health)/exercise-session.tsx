import React, { useCallback, useEffect, useState } from "react";
import { BackHandler, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { useLogExercise } from "../../../hooks/useLogExercise";
import { useSessionClock } from "../../../hooks/useSessionClock";
import { useVoiceGuide } from "../../../hooks/useVoiceGuide";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useExerciseReadiness } from "../../../hooks/useExerciseReadiness";
import { apiFetch } from "../../../lib/api";
import { Skeleton } from "../../../components/ui/Skeleton";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import DsButton from "../../../components/onboarding/DsButton";
import { useDs } from "../../../components/onboarding/useDs";
import { ExerciseOverview } from "../../../components/exercise/ExerciseOverview";
import { ExerciseReady } from "../../../components/exercise/ExerciseReady";
import { BeforeYouStart } from "../../../components/exercise/BeforeYouStart";
import { ExerciseActive } from "../../../components/exercise/ExerciseActive";
import { BreathingExerciseActive } from "../../../components/exercise/BreathingExerciseActive";
import { CardioExerciseActive } from "../../../components/exercise/CardioExerciseActive";
import { StretchingExerciseActive } from "../../../components/exercise/StretchingExerciseActive";
import { ExerciseResult } from "../../../components/exercise/ExerciseResult";
import { CheckInSheet, ShortSessionSheet, StopSheet } from "../../../components/exercise/SessionSheets";
import { SessionScreenProps, WORKOUT } from "../../../components/exercise/ExerciseBits";
import { RoutineApi, exerciseKind, isWorkoutPaused, toRoutine } from "../../../services/exerciseSession";

// A guided exercise, start to finish: details → get ready → the "during" screen for its type →
// how do you feel → saved. "I feel unwell" (always on screen) saves what was done as stopped
// and opens the symptom log. Workouts pause for safety when the score is critical or a severe
// symptom was logged recently; breathing exercises stay open.

type Phase = "overview" | "check" | "ready" | "active" | "done";
type Sheet = null | "stop" | "short" | "checkin";

const ACTIVE_SCREEN = {
  breathing: BreathingExerciseActive,
  cardio: CardioExerciseActive,
  steps: StretchingExerciseActive,
  guide: ExerciseActive,
} as const;

const newLogId = () => `ex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function ExerciseSessionScreen() {
  const router = useRouter();
  const { c, isDark } = useDs();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, token } = useUser();
  const { showToast } = useToast();
  const logExercise = useLogExercise(userId, token, { quiet: true });
  const clock = useSessionClock();
  const voice = useVoiceGuide();
  const { readiness, isLoading: checking, movementMinutes, movementGoal, refetch: refetchReadiness } = useExerciseReadiness();

  // The phone keeps the server's own data and turns it into a Routine each time it's read, so a
  // change to the app's exercise format never meets an old saved copy.
  const routineQuery = useQuery({
    queryKey: ["exercise-raw", id],
    enabled: !!id,
    queryFn: async (): Promise<RoutineApi> => {
      const res = await apiFetch(`/api/exercises/${id}`);
      if (!res.ok) throw new Error("Failed to fetch exercise");
      return res.json();
    },
    select: toRoutine,
  });
  const routine = routineQuery.data;

  const [phase, setPhase] = useState<Phase>("overview");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [savedSeconds, setSavedSeconds] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);

  const kind = routine ? exerciseKind(routine) : "guide";
  // Breathing and relaxation (type Breathing) are calm: they stay open when workouts are paused and
  // skip the standing-up safety check, even when a relaxation plays step by step.
  const calm = kind === "breathing" || (routine?.type ?? "").toLowerCase().includes("breath");
  const paused = isWorkoutPaused(readiness, calm ? "breathing" : kind);

  const save = (status: "completed" | "incomplete_due_to_symptoms", seconds: number) => {
    if (!routine || !userId) return;
    logExercise.mutate({
      id: newLogId(),
      routine_id: routine.id,
      routine_name: routine.title,
      duration_seconds: seconds,
      duration_minutes: Math.round(seconds / 60),
      planned_duration_seconds: routine.minutes * 60,
      planned_duration_minutes: routine.minutes,
      status,
    });
  };

  const { say } = voice;
  const finish = useCallback(() => {
    clock.pause();
    const secs = clock.readSeconds();
    setSavedSeconds(secs);
    setSheet(secs < 30 ? "short" : "checkin");
    say(secs < 30 ? "Save this short session?" : "Well done. How do you feel now?");
  }, [clock, say]);

  const askWhyStopping = () => {
    clock.pause();
    setSavedSeconds(clock.readSeconds());
    setSheet("stop");
    say("Paused. Do you want to stop?");
  };

  const keepGoing = () => {
    setSheet(null);
    clock.resume();
    say("Let's continue.");
  };

  const togglePause = () => {
    if (clock.paused) {
      clock.resume();
      say("Let's continue.");
    } else {
      clock.pause();
      say("Paused. Take your time.");
    }
  };

  const reportUnwell = () => {
    voice.stop();
    clock.pause();
    setSheet(null);
    save("incomplete_due_to_symptoms", clock.readSeconds());
    router.replace("/(home)/(health)/log-symptoms?triggered_by_exercise_id=post-workout");
  };

  const saveCompleted = () => {
    setSheet(null);
    save("completed", savedSeconds);
    setPhase("done");
    say("Exercise saved. Well done.");
  };

  const discardShort = () => {
    setSheet(null);
    clock.reset();
    setPhase("overview");
    showToast({ title: "Not saved", message: "That short session wasn't recorded.", type: "info" });
  };

  const clearPause = async () => {
    setConfirmClear(false);
    if (!userId) return;
    try {
      const res = await apiFetch(`/api/health-logs/${userId}/clear-symptom-lock`, { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      await refetchReadiness();
      queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
      showToast({ title: "Workouts open again", message: "Take it easy and stop if you feel unwell.", type: "success" });
    } catch {
      showToast({ title: "Couldn't update", message: "Check your connection and try again.", type: "error" });
    }
  };

  // The phone's back button during an exercise asks why you're stopping instead of leaving.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (phase === "check") {
          setPhase("overview");
          return true;
        }
        if (phase !== "active") return false;
        if (sheet === null) {
          clock.pause();
          setSavedSeconds(clock.readSeconds());
          setSheet("stop");
          say("Paused. Do you want to stop?");
        }
        return true;
      });
      return () => sub.remove();
    }, [phase, sheet, clock, say]),
  );

  // The screen stays on from the countdown to the end of the exercise, so it never locks mid-way.
  const exercising = phase === "ready" || phase === "active";
  useEffect(() => {
    if (!exercising) return;
    activateKeepAwakeAsync("exercise").catch(() => {});
    return () => {
      deactivateKeepAwake("exercise").catch(() => {});
    };
  }, [exercising]);

  if (!routine) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top", "bottom"]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        {routineQuery.isError || !id ? (
          <View className="px-5" style={{ flex: 1, justifyContent: "center", gap: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>{"This exercise couldn't load"}</Text>
            <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate }}>Check your connection and try again.</Text>
            <DsButton label="Try again" onPress={() => routineQuery.refetch()} />
            <DsButton label="Go back" variant="secondary" onPress={() => router.back()} />
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <Skeleton style={{ height: 200 }} />
            <View className="px-5" style={{ gap: 12 }}>
              <Skeleton style={{ height: 32, width: "70%", borderRadius: 8 }} />
              <Skeleton style={{ height: 24, width: "50%", borderRadius: 6 }} />
              <Skeleton style={{ height: 120, borderRadius: 12 }} />
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  const Active = ACTIVE_SCREEN[kind];
  // Get ready and the exercise itself use the navy workout view.
  const workoutView = exercising;
  const activeProps: SessionScreenProps = {
    routine,
    elapsed: clock.elapsed,
    elapsedMs: clock.elapsedMs,
    paused: clock.paused,
    onTogglePause: togglePause,
    onFinish: finish,
    onClose: askWhyStopping,
    onUnwell: reportUnwell,
    voice,
  };

  return (
    <View style={{ flex: 1, backgroundColor: workoutView ? WORKOUT.bg : c.canvas }}>
      <StatusBar style={workoutView || isDark ? "light" : "dark"} />

      {phase === "overview" ? (
        <ExerciseOverview
          routine={routine}
          kind={kind}
          paused={paused}
          canClearPause={!!readiness?.has_recent_severe_symptom}
          checking={checking}
          onStart={() => {
            // Breathing is done sitting down, so it skips the safety check.
            if (!paused && !checking) setPhase(calm ? "ready" : "check");
          }}
          onBack={() => router.back()}
          onClearPause={() => setConfirmClear(true)}
          onFindBreathing={() => router.push({ pathname: "/(home)/(tabs)/exercises", params: { type: "Breathing" } })}
        />
      ) : null}

      {phase === "check" ? (
        <BeforeYouStart routine={routine} say={say} onBack={() => setPhase("overview")} onReady={() => setPhase("ready")} />
      ) : null}

      {phase === "ready" ? (
        <ExerciseReady
          setup={routine.setup}
          firstStep={routine.steps[0]?.text ?? ""}
          say={say}
          onComplete={() => {
            clock.start();
            setPhase("active");
          }}
        />
      ) : null}

      {phase === "active" ? <Active {...activeProps} /> : null}

      {phase === "done" ? (
        <ExerciseResult
          title={routine.title}
          seconds={savedSeconds}
          movementMinutes={movementMinutes}
          movementGoal={movementGoal}
          onDone={() => router.navigate("/(home)/(tabs)/dashboard")}
          onHistory={() => router.replace("/(home)/(health)/exercise-diary")}
        />
      ) : null}

      <StopSheet
        visible={sheet === "stop"}
        seconds={savedSeconds}
        onUnwell={reportUnwell}
        onTired={() => setSheet(savedSeconds < 30 ? "short" : "checkin")}
        onKeepGoing={keepGoing}
      />
      <ShortSessionSheet visible={sheet === "short"} seconds={savedSeconds} onSave={() => setSheet("checkin")} onDiscard={discardShort} onKeepGoing={keepGoing} />
      <CheckInSheet visible={sheet === "checkin"} onFine={saveCompleted} onUnwell={reportUnwell} onBack={keepGoing} />

      <ConfirmDialog
        visible={confirmClear}
        onCancel={() => setConfirmClear(false)}
        onConfirm={clearPause}
        title="Has a doctor cleared you?"
        message="Only continue if a doctor has checked you, or your symptoms have fully gone."
        confirmLabel="Yes, I've been cleared"
        variant="warning"
        mode="bottom-sheet"
        icon="alert-triangle"
      />
    </View>
  );
}
