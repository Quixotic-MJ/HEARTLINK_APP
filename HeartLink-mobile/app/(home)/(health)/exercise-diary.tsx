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
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Swipeable } from "react-native-gesture-handler";
import { useUser } from "../../../contexts/UserContext";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useToast } from "../../../contexts/ToastContext";

import AsyncStorage from "@react-native-async-storage/async-storage";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export type ExerciseLog = {
  id: string;
  user_id: string;
  routine_id: string;
  routine_name: string;
  duration_minutes: number;
  duration_seconds?: number;
  status: "completed" | "incomplete_due_to_symptoms" | string;
  logged_at: string;
  deleted_at?: string | null;
};

export default function ExerciseDiaryScreen() {
  const router = useRouter();
  const { userId, token, logout } = useUser();
  const { showToast } = useToast();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logToDelete, setLogToDelete] = useState<{ id: string; name: string } | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!userId) return;
    try {
      const storedToken = await AsyncStorage.getItem("access_token");
      const effectiveToken = token || storedToken || "";
      const response = await fetch(`${base_url}/api/exercises/logs/${userId}?limit=50&offset=0`, {
        headers: {
          "Authorization": `Bearer ${effectiveToken}`,
        },
      });

      if (response.status === 401) {
        showToast({ title: "Session Expired", message: "Please log in again.", type: "info" });
        await logout();
        return;
      }

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
  }, [userId, token, logout]);

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [fetchLogs])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const confirmDeleteLog = async () => {
    if (!logToDelete || !userId) return;
    try {
      const storedToken = await AsyncStorage.getItem("access_token");
      const effectiveToken = token || storedToken || "";
      const res = await fetch(`${base_url}/api/exercises/logs/${userId}/${logToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${effectiveToken}`,
        },
      });

      if (res.status === 401) {
        showToast({ title: "Session Expired", message: "Please log in again.", type: "info" });
        await logout();
        return;
      }

      const json = await res.json();
      if (res.ok && json.success) {
        setLogs((prev) => prev.filter((item) => item.id !== logToDelete.id));
        showToast({ title: "Deleted", message: "Exercise log removed.", type: "success" });
      } else {
        showToast({ title: "Cannot Delete Log", message: json.detail || "Could not delete this exercise log.", type: "error" });
      }
    } catch (err) {
      console.error("Failed to delete exercise log:", err);
      showToast({ title: "Error", message: "Network error occurred when trying to delete exercise log.", type: "error" });
    } finally {
      setLogToDelete(null);
    }
  };

  const handleDeleteLog = (logId: string, routineName: string) => {
    setLogToDelete({ id: logId, name: routineName });
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

  const formatDuration = (log: ExerciseLog): string => {
    const sec = log.duration_seconds;
    const min = log.duration_minutes;

    // Case 1: duration_seconds is explicitly provided and > 0
    if (sec !== undefined && sec !== null && sec > 0) {
      if (sec < 60) return `${sec}s`;
      const mins = Math.floor(sec / 60);
      const remainderSecs = sec % 60;
      if (remainderSecs > 0) return `${mins}m ${remainderSecs}s`;
      return `${mins}m`;
    }

    // Case 2: Legacy rows where duration_seconds is 0 or null, but duration_minutes > 0
    if (min !== undefined && min !== null && min > 0) {
      return `${min}m`;
    }

    // Case 3: Exactly 0s
    return "0s";
  };

  const totalDurationSeconds = logs.reduce((sum, item) => {
    if (item.duration_seconds !== undefined && item.duration_seconds !== null && item.duration_seconds > 0) {
      return sum + item.duration_seconds;
    }
    if (item.duration_minutes !== undefined && item.duration_minutes !== null && item.duration_minutes > 0) {
      return sum + item.duration_minutes * 60;
    }
    return sum;
  }, 0);

  const formattedTotalTime = (): string => {
    if (totalDurationSeconds === 0) return "0s";
    if (totalDurationSeconds < 60) return `${totalDurationSeconds}s`;

    const hours = Math.floor(totalDurationSeconds / 3600);
    const remainingSeconds = totalDurationSeconds % 3600;
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;

    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    if (secs > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${mins}m`;
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
      <View className="px-5 mb-2 flex-row items-start">
        <Feather name="info" size={12} color="#94a3b8" className="mt-[3px]" />
        <Text className="text-[12px] text-slate-400 ml-1.5 flex-1 leading-relaxed">
          Swipe left on any session to remove it from your history.
        </Text>
      </View>

      {/* ── Content / List ── */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<Feather name="activity" size={32} color="#94a3b8" />}
          title="No Exercise Logs"
          subtitle="Complete a rehab routine to track your activity duration and symptoms."
          actionLabel="Start Routine Now"
          onAction={() => router.push("/(home)/(tabs)/exercises")}
          actionIcon={<Feather name="play" size={15} color="#fff" />}
        />
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
                    <View className="flex-row items-center flex-1 gap-3 pr-2">
                      <View className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center">
                        <Feather
                          name={hasSymptoms ? "alert-circle" : item.routine_name?.toLowerCase().includes("breath") ? "wind" : "activity"}
                          size={20}
                          color={hasSymptoms ? "#e11d48" : "#3b6d11"}
                        />
                      </View>
                      <View className="flex-1">
                        <Text 
                          className="text-[15px] font-semibold text-slate-900 dark:text-white leading-snug"
                          numberOfLines={2}
                          adjustsFontSizeToFit
                        >
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

      <ConfirmDialog
        visible={!!logToDelete}
        onCancel={() => setLogToDelete(null)}
        onConfirm={confirmDeleteLog}
        title="Delete Exercise Log?"
        message={`Are you sure you want to remove "${logToDelete?.name}" from your exercise history?`}
        confirmLabel="Delete"
        variant="destructive"
        mode="bottom-sheet"
        icon="trash-2"
      />
    </SafeAreaView>
  );
}
