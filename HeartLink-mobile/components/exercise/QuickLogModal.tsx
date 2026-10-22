import React, { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../../contexts/UserContext";
import { useLogExercise } from "../../hooks/useLogExercise";
import AnimatedButton from "../ui/AnimatedButton";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";
import { ExerciseHistoryLink } from "./ExerciseBits";

// Screen 7: log something done without the app (a walk, gardening). Pick a common activity
// or type one, set the minutes, save. It shows up in Activity history like a guided exercise.

type QuickLogModalProps = {
  visible: boolean;
  onClose: (success?: boolean) => void;
};

const PRESETS = [
  { name: "Walking", minutes: 30 },
  { name: "Brisk walk", minutes: 30 },
  { name: "Gardening", minutes: 20 },
  { name: "Stretching", minutes: 15 },
  { name: "Cycling", minutes: 20 },
  { name: "Housework", minutes: 20 },
];
const STEP = 5;
const MIN = 5;
const MAX = 180;

export function QuickLogModal({ visible, onClose }: QuickLogModalProps) {
  const { c } = useDs();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, token } = useUser();
  const logExercise = useLogExercise(userId, token);
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  const close = (saved = false) => {
    setName("");
    setMinutes(30);
    setError("");
    onClose(saved);
  };

  const save = () => {
    const activity = name.trim();
    if (!activity) {
      setError("Pick or type an activity.");
      return;
    }
    if (!userId) {
      setError("You're signed out. Sign in again to save activities.");
      return;
    }
    // The screen updates straight away; the hook saves it offline if there's no connection.
    logExercise.mutate({ routine_name: activity, duration_minutes: minutes, duration_seconds: minutes * 60, status: "completed" });
    close(true);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => close()} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,15,15,0.55)" }}>
          <Pressable style={{ flex: 1 }} onPress={() => close()} accessibilityRole="button" accessibilityLabel="Close" />
          <View
            accessibilityViewIsModal
            style={{ maxHeight: "90%", backgroundColor: c.canvas, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 12 }}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.hairlineStrong, alignSelf: "center" }} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 12, gap: 16 }}
            >
              <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "600", color: c.ink }}>
                    Log an activity
                  </Text>
                  <Text style={{ fontSize: 14, color: c.slate }}>Something you did without the app</Text>
                </View>
                <AnimatedButton
                  onPress={() => close()}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: c.hairline, alignItems: "center", justifyContent: "center" }}
                >
                  <Feather name="x" size={18} color={c.ink} />
                </AnimatedButton>
              </View>

              <View className="flex-row flex-wrap" style={{ gap: 8 }} accessibilityLabel="Common activities">
                {PRESETS.map((p) => {
                  const on = name === p.name;
                  return (
                    <AnimatedButton
                      key={p.name}
                      onPress={() => {
                        setName(p.name);
                        setMinutes(p.minutes);
                        setError("");
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${p.name}, ${p.minutes} minutes`}
                      hitSlop={{ top: 2, bottom: 2 }}
                      style={{ height: 40, paddingHorizontal: 14, borderRadius: 9999, borderWidth: 1, justifyContent: "center", backgroundColor: on ? c.ink : c.canvas, borderColor: on ? c.ink : c.hairline }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "500", color: on ? c.canvas : c.charcoal }}>{p.name}</Text>
                    </AnimatedButton>
                  );
                })}
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>Activity</Text>
                <TextInput
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    setError("");
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="For example, dancing"
                  placeholderTextColor={c.steel}
                  accessibilityLabel="Activity"
                  maxLength={60}
                  style={{
                    height: 48,
                    borderRadius: 8,
                    borderWidth: focused || error ? 2 : 1,
                    borderColor: error ? c.danger : focused ? c.line : c.hairlineStrong,
                    paddingHorizontal: 14,
                    fontSize: 16,
                    color: c.ink,
                    backgroundColor: c.canvas,
                  }}
                />
                {error ? <Text style={{ fontSize: 14, color: c.ink }}>{error}</Text> : null}
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>How long</Text>
                <View className="flex-row items-center justify-between" style={{ height: 56, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, paddingHorizontal: 6 }}>
                  <AnimatedButton
                    onPress={() => setMinutes((m) => Math.max(MIN, m - STEP))}
                    disabled={minutes <= MIN}
                    accessibilityRole="button"
                    accessibilityLabel="5 minutes less"
                    style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: c.hairline, alignItems: "center", justifyContent: "center", opacity: minutes <= MIN ? 0.4 : 1 }}
                  >
                    <Feather name="minus" size={18} color={c.ink} />
                  </AnimatedButton>
                  <Text accessibilityLiveRegion="polite" style={{ fontSize: 18, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>
                    {minutes} min
                  </Text>
                  <AnimatedButton
                    onPress={() => setMinutes((m) => Math.min(MAX, m + STEP))}
                    disabled={minutes >= MAX}
                    accessibilityRole="button"
                    accessibilityLabel="5 minutes more"
                    style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: c.hairline, alignItems: "center", justifyContent: "center", opacity: minutes >= MAX ? 0.4 : 1 }}
                  >
                    <Feather name="plus" size={18} color={c.ink} />
                  </AnimatedButton>
                </View>
              </View>

              <DsButton label="Save activity" onPress={save} />
              <DsButton
                label="Follow a guided exercise instead"
                variant="link"
                style={{ alignSelf: "center" }}
                onPress={() => {
                  close();
                  router.push("/(home)/(tabs)/exercises");
                }}
              />
              <ExerciseHistoryLink
                onPress={() => {
                  close();
                  router.push("/(home)/(health)/exercise-diary");
                }}
              />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
