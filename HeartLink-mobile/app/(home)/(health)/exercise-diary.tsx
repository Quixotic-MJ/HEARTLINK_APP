import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useUser } from "../../../contexts/UserContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export type ExerciseLog = {
  id: string;
  user_id: string;
  routine_id: string;
  routine_name: string;
  duration_seconds?: number;
  duration_minutes?: number;
  status: "completed" | "incomplete_due_to_symptoms" | string;
  logged_at: string;
  deleted_at?: string | null;
};

export default function ExerciseDiaryScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`${base_url}/api/exercises/logs/${userId}?limit=50&offset=0`);
      if (response.ok) {
        const data: ExerciseLog[] = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Error fetching exercise logs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [fetchLogs])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const handleDeleteLog = (logId: string, routineName: string) => {
    Alert.alert(
      "Delete Exercise Log?",
      `Are you sure you want to remove "${routineName}" from your exercise history?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${base_url}/api/exercises/logs/${userId}/${logId}`, {
                method: "DELETE",
              });
              const json = await res.json();
              if (res.ok && json.success) {
                setLogs((prev) => prev.filter((item) => item.id !== logId));
              } else {
                Alert.alert("Cannot Delete Log", json.detail || "Could not delete this exercise log.");
              }
            } catch (err) {
              console.error("Failed to delete exercise log:", err);
              Alert.alert("Error", "Network error occurred when trying to delete exercise log.");
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (item: ExerciseLog) => {
    return (
      <TouchableOpacity
        onPress={() => handleDeleteLog(item.id, item.routine_name || "Exercise Routine")}
        activeOpacity={0.8}
        className="bg-red-500 justify-center items-center px-6 rounded-2xl mb-3 ml-2"
      >
        <Feather name="trash-2" size={20} color="#fff" />
        <Text className="text-white text-[11px] font-medium mt-1">Delete</Text>
      </TouchableOpacity>
    );
  };

  const formatDuration = (log: ExerciseLog) => {
    let totalSeconds = log.duration_seconds;
    if (totalSeconds === undefined || totalSeconds === 0) {
      if (log.duration_minutes) {
        totalSeconds = Math.round(log.duration_minutes * 60);
      } else {
        return "0s";
      }
    }
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0 && secs > 0) return `${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m`;
    return `${secs}s`;
  };

  const totalDurationSeconds = logs.reduce((sum, item) => {
    const sec = item.duration_seconds ?? (item.duration_minutes ? Math.round(item.duration_minutes * 60) : 0);
    return sum + sec;
  }, 0);

  const formattedTotalTime = () => {
    const mins = Math.floor(totalDurationSeconds / 60);
    return `${mins} min`;
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* ── Header Bar ── */}
      <View className="flex-row items-center justify-between px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
        >
          <Feather name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>

        <Text className="text-[17px] font-semibold text-slate-900 dark:text-white">
          Exercise Log History
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/(home)/(tabs)/exercises")}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
        >
          <Feather name="plus" size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* ── Summary Banner ── */}
      <View className="mx-5 mt-4 mb-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex-row items-center justify-around">
        <View className="items-center">
          <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
            Total Sessions
          </Text>
          <Text className="text-[20px] font-bold text-slate-900 dark:text-white">
            {logs.length}
          </Text>
        </View>
        <View className="w-[1px] h-8 bg-slate-200 dark:bg-slate-800" />
        <View className="items-center">
          <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
            Total Active Time
          </Text>
          <Text className="text-[20px] font-bold text-slate-900 dark:text-white">
            {formattedTotalTime()}
          </Text>
        </View>
      </View>

      {/* ── Instructions Tip ── */}
      <View className="px-5 mb-2 flex-row items-center">
        <Feather name="info" size={12} color="#94a3b8" />
        <Text className="text-[12px] text-slate-400 ml-1.5">
          Swipe left on any session to remove it from your history.
        </Text>
      </View>

      {/* ── Content / List ── */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : logs.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <View className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center mb-4">
            <MaterialCommunityIcons name="run" size={32} color="#94a3b8" />
          </View>
          <Text className="text-[17px] font-medium text-slate-900 dark:text-white text-center mb-1">
            No Exercise Logs
          </Text>
          <Text className="text-[13px] text-slate-400 text-center mb-6 leading-relaxed">
            Complete a rehab routine to track your activity duration and symptoms.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(home)/(tabs)/exercises")}
            className="bg-slate-900 dark:bg-slate-100 px-5 py-3 rounded-xl flex-row items-center gap-2"
          >
            <Feather name="play" size={15} color="#fff" />
            <Text className="text-white dark:text-slate-900 font-medium text-[13px]">
              Start Routine Now
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />
          }
          renderItem={({ item }) => {
            const hasSymptoms = item.status === "incomplete_due_to_symptoms";
            return (
              <Swipeable renderRightActions={() => renderRightActions(item)}>
                <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 gap-3">
                      <View className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center">
                        <MaterialCommunityIcons
                          name={hasSymptoms ? "heart-broken" : "run-fast"}
                          size={22}
                          color={hasSymptoms ? "#e11d48" : "#3b6d11"}
                        />
                      </View>
                      <View className="flex-1 pr-2">
                        <Text className="text-[15px] font-semibold text-slate-900 dark:text-white leading-snug">
                          {item.routine_name || "Rehab Routine"}
                        </Text>
                        <Text className="text-[12px] text-slate-400 mt-0.5">
                          {new Date(item.logged_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          •{" "}
                          {new Date(item.logged_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      <Text className="text-[15px] font-bold text-slate-900 dark:text-white">
                        {formatDuration(item)}
                      </Text>
                      <Text
                        className="text-[11px] font-medium uppercase tracking-wide mt-0.5"
                        style={{ color: hasSymptoms ? "#e11d48" : "#3b6d11" }}
                      >
                        {hasSymptoms ? "Aborted" : "Completed"}
                      </Text>
                    </View>
                  </View>

                  {/* Symptom Badge */}
                  {hasSymptoms && (
                    <View className="flex-row items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1.5 rounded-lg self-start mt-3">
                      <Feather name="alert-triangle" size={12} color="#e11d48" />
                      <Text className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                        Symptoms Reported
                      </Text>
                    </View>
                  )}
                </View>
              </Swipeable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
