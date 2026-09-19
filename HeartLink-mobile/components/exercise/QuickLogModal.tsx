import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../../contexts/UserContext";
import { useToast } from "../../contexts/ToastContext";
import { useLogExercise } from "../../hooks/useLogExercise";

const base_url = process.env.EXPO_PUBLIC_API_URL;

type QuickLogModalProps = {
  visible: boolean;
  onClose: (success?: boolean) => void;
};

export function QuickLogModal({ visible, onClose }: QuickLogModalProps) {
  const router = useRouter();
  const { userId, token, logout } = useUser();
  const { showToast } = useToast();
  
  const logExerciseMutation = useLogExercise(userId, token);

  const [activityName, setActivityName] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const scrollViewRef = React.useRef<ScrollView>(null);

  const ACTIVITY_PRESETS = [
    { label: "Walking 15m", name: "Walking", min: "15" },
    { label: "Walking 30m", name: "Walking", min: "30" },
    { label: "Brisk Walk 30m", name: "Brisk Walk", min: "30" },
    { label: "Gardening 20m", name: "Gardening / Yard Work", min: "20" },
    { label: "Stretching 15m", name: "Gentle Stretching", min: "15" },
    { label: "Cycling 20m", name: "Stationary Cycling", min: "20" },
  ];

  const handleQuickLogSubmit = async () => {
    setErrorMsg("");
    const trimmedName = activityName.trim();
    if (!trimmedName) {
      setErrorMsg("Please enter an activity name.");
      return;
    }
    const mins = parseInt(durationMinutes, 10);
    if (isNaN(mins) || mins <= 0 || mins > 180) {
      setErrorMsg("Please specify a realistic duration between 1 and 180 minutes.");
      return;
    }

    if (!userId) {
      setErrorMsg("User session not found. Please try restarting the app.");
      return;
    }

    const payload = {
      routine_name: trimmedName,
      duration_minutes: mins,
      duration_seconds: mins * 60,
      status: "completed",
    };

    logExerciseMutation.mutate(payload, {
      onError: async (error: any) => {
        if (error.status === 401) {
          await logout();
        } else {
          setErrorMsg(error.message || "Could not save activity log.");
        }
      }
    });

    // Close immediately to reflect optimistic update
    setActivityName("");
    setDurationMinutes("");
    setErrorMsg("");
    onClose(true);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onClose(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(15,23,42,0.5)" }}
          onPress={() => onClose(false)}
        >
          <Pressable
            className="bg-white dark:bg-slate-900 rounded-t-3xl px-5 pt-4 pb-8 border-t border-slate-200 dark:border-slate-800/60 max-h-[88%]"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full self-center mb-4" />

            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 pr-3">
                <Text className="text-[19px] font-bold text-slate-900 dark:text-white">
                  Quick Log Activity
                </Text>
                <Text className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Log everyday physical activity to boost your Heart Stability Score.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onClose(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
              >
                <Feather name="x" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Quick Presets
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {ACTIVITY_PRESETS.map((preset, idx) => {
                  const isSelected =
                    activityName === preset.name && durationMinutes === preset.min;
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        setActivityName(preset.name);
                        setDurationMinutes(preset.min);
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 50);
                      }}
                      className={`px-3 py-2 rounded-xl border ${
                        isSelected
                          ? "bg-[#1B6E63] border-[#1B6E63]"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <Text
                        className={`text-[12px] font-semibold ${
                          isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Activity Name
              </Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 mb-3.5">
                <TextInput
                  className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium"
                  placeholder="e.g. Walking, Gardening, Cycling"
                  placeholderTextColor="#94a3b8"
                  value={activityName}
                  onChangeText={setActivityName}
                />
              </View>

              <Text className="text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Duration (Minutes)
              </Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 mb-5">
                <TextInput
                  className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium"
                  placeholder="30"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                />
                <Text className="text-[13px] font-semibold text-slate-400 ml-2">min</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleQuickLogSubmit}
                disabled={logExerciseMutation.isPending}
                className="bg-[#1B6E63] py-3.5 rounded-xl items-center justify-center flex-row gap-2 mb-3"
                style={{ opacity: logExerciseMutation.isPending ? 0.7 : 1 }}
              >
                {logExerciseMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#fff" />
                    <Text className="text-white font-bold text-[15px]">Record Activity</Text>
                  </>
                )}
              </TouchableOpacity>

              {errorMsg ? (
                <Text className="text-red-500 text-[12px] text-center mb-3 font-medium px-2">
                  {errorMsg}
                </Text>
              ) : null}

              <View className="flex-row items-center justify-between mt-2">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    onClose(false);
                    router.push({ pathname: "/(home)/(tabs)/explore", params: { initialSegment: "exercises" } });
                  }}
                  className="py-2.5 items-center justify-center flex-1"
                >
                  <Text className="text-[13px] font-semibold text-[#1B6E63] text-center">
                    Browse guided activities
                  </Text>
                </TouchableOpacity>

                <View className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-2" />

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    onClose(false);
                    router.push("/(home)/(health)/exercise-diary");
                  }}
                  className="py-2.5 items-center justify-center flex-1"
                >
                  <Text className="text-[13px] font-semibold text-[#1B6E63] text-center">
                    View activity log
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
