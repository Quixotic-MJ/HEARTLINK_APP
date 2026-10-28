import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, SectionList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { apiFetch } from "../../../lib/api";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Skeleton } from "../../../components/ui/Skeleton";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import DsButton from "../../../components/onboarding/DsButton";
import { useDs } from "../../../components/onboarding/useDs";
import { QuickLogModal } from "../../../components/exercise/QuickLogModal";
import { IconBadge, SquareIconButton, Tag } from "../../../components/exercise/ExerciseBits";
import { formatDuration } from "../../../services/exerciseSession";

// Screen 8: every exercise saved, guided or logged by hand, newest first and grouped by day,
// with this week's totals. Each row can be deleted.

export type ExerciseLog = {
  id: string;
  user_id: string;
  routine_id?: string | null;
  routine_name: string;
  duration_minutes: number;
  duration_seconds?: number | null;
  status: "completed" | "incomplete_due_to_symptoms" | string;
  logged_at: string;
  deleted_at?: string | null;
};

const logSeconds = (log: ExerciseLog) => (log.duration_seconds && log.duration_seconds > 0 ? log.duration_seconds : Math.max(0, log.duration_minutes || 0) * 60);

/** 3960 → "1 h 6 min" */
function formatTotal(seconds: number) {
  if (seconds < 3600) return formatDuration(seconds).replace(/ \d+ s$/, "");
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** A row's date, time and length, e.g. "Oct 28, 8:39 AM, 30 min". */
export function logDetail(log: ExerciseLog): string {
  const at = new Date(log.logged_at);
  const date = at.toLocaleDateString([], { month: "short", day: "numeric" });
  const time = at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${date}, ${time}, ${formatDuration(logSeconds(log))}`;
}

function dayLabel(date: Date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default function ExerciseDiaryScreen() {
  const router = useRouter();
  const { c, isDark } = useDs();
  const { userId } = useUser();
  const { showToast } = useToast();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toDelete, setToDelete] = useState<ExerciseLog | null>(null);
  const [showLog, setShowLog] = useState(false);
  // When the list was last loaded; "last 7 days" counts back from here.
  const [loadedAt, setLoadedAt] = useState(0);

  const fetchLogs = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await apiFetch(`/api/exercises/logs/${userId}?limit=50&offset=0`);
      if (!res.ok) throw new Error(String(res.status));
      const data: ExerciseLog[] = await res.json();
      setLogs(data);
      setLoadedAt(Date.now());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [fetchLogs]),
  );

  const deleteLog = async () => {
    const log = toDelete;
    setToDelete(null);
    if (!log || !userId) return;
    try {
      const res = await apiFetch(`/api/exercises/logs/${userId}/${log.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.detail || "");
      setLogs((prev) => prev.filter((l) => l.id !== log.id));
      showToast({ title: "Deleted", message: `${log.routine_name} was removed from your history.`, type: "success" });
    } catch (err) {
      const detail = err instanceof Error && err.message ? err.message : "Check your connection and try again.";
      showToast({ title: "Couldn't delete", message: detail, type: "error" });
    }
  };

  const weekAgo = loadedAt - 7 * 24 * 3600 * 1000;
  const lastWeek = logs.filter((l) => new Date(l.logged_at).getTime() >= weekAgo);
  const weekSeconds = lastWeek.reduce((sum, l) => sum + logSeconds(l), 0);

  const sections = useMemo(() => {
    const groups = new Map<string, ExerciseLog[]>();
    for (const log of logs) {
      const key = dayLabel(new Date(log.logged_at));
      groups.set(key, [...(groups.get(key) ?? []), log]);
    }
    return Array.from(groups, ([title, data]) => ({ title, data }));
  }, [logs]);

  const renderRow = ({ item }: { item: ExerciseLog }) => {
    const unwell = item.status === "incomplete_due_to_symptoms";
    const breathing = item.routine_name?.toLowerCase().includes("breath");
    return (
      <View
        style={{ minHeight: 72, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, paddingLeft: 14, paddingRight: 4, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <IconBadge icon={unwell ? "alert-triangle" : breathing ? "wind" : "activity"} tone={unwell ? "rose" : breathing ? "sky" : "mint"} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 16, fontWeight: "500", color: c.ink }} numberOfLines={2}>
            {item.routine_name || "Exercise"}
          </Text>
          <Text style={{ fontSize: 13, color: c.slate }}>{logDetail(item)}</Text>
          {unwell ? <Tag label="Stopped, felt unwell" tone="rose" /> : item.routine_id ? <Tag label="Guided" tone="sky" /> : null}
        </View>
        <AnimatedButton
          onPress={() => setToDelete(item)}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.routine_name || "exercise"}`}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="trash-2" size={18} color={c.steel} />
        </AnimatedButton>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View className="flex-row items-center px-5 pt-3 pb-2" style={{ gap: 10 }}>
        <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 22, fontWeight: "600", color: c.ink }} numberOfLines={1}>
          Activity history
        </Text>
        <AnimatedButton
          onPress={() => setShowLog(true)}
          accessibilityRole="button"
          accessibilityLabel="Log an activity"
          style={{ height: 40, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: c.hairlineStrong, flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Feather name="plus" size={16} color={c.ink} />
          <Text style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>Log</Text>
        </AnimatedButton>
      </View>

      {loading ? (
        <View className="px-5" style={{ paddingTop: 12, gap: 10 }}>
          <Skeleton style={{ height: 76, borderRadius: 12 }} />
          {[0, 1, 2].map((k) => (
            <Skeleton key={k} style={{ height: 72, borderRadius: 12 }} />
          ))}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchLogs();
              }}
              tintColor={c.line}
            />
          }
          renderSectionHeader={({ section }) => (
            <Text accessibilityRole="header" style={{ fontSize: 15, fontWeight: "600", color: c.ink, paddingTop: 20, paddingBottom: 8 }}>
              {section.title}
            </Text>
          )}
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              {failed ? (
                <View style={{ padding: 16, borderRadius: 12, backgroundColor: c.surface, gap: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{"Your history couldn't load"}</Text>
                  <Text style={{ fontSize: 14, color: c.slate }}>Check your connection, then pull down to try again.</Text>
                </View>
              ) : null}
              {logs.length > 0 ? (
                <View className="flex-row" style={{ gap: 12 }}>
                  <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, gap: 4 }}>
                    <Text style={{ fontSize: 13, color: c.slate }}>Last 7 days</Text>
                    <Text style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>
                      {lastWeek.length} {lastWeek.length === 1 ? "session" : "sessions"}
                    </Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, gap: 4 }}>
                    <Text style={{ fontSize: 13, color: c.slate }}>Time moving</Text>
                    <Text style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>{formatTotal(weekSeconds)}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            failed ? null : (
              <View style={{ marginTop: 12, padding: 20, borderRadius: 12, backgroundColor: c.surface, gap: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>Nothing logged yet</Text>
                <Text style={{ fontSize: 14, lineHeight: 21, color: c.slate }}>Follow a guided exercise, or log a walk or anything else you did.</Text>
                <View style={{ marginTop: 6, gap: 4 }}>
                  <DsButton label="Log an activity" onPress={() => setShowLog(true)} />
                  <DsButton label="Find an exercise" variant="link" style={{ alignSelf: "center" }} onPress={() => router.push("/(home)/(tabs)/exercises")} />
                </View>
              </View>
            )
          }
        />
      )}

      <ConfirmDialog
        visible={!!toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={deleteLog}
        title="Delete this activity?"
        message={`"${toDelete?.routine_name ?? ""}" will be removed from your history.`}
        confirmLabel="Delete"
        variant="destructive"
        mode="bottom-sheet"
        icon="trash-2"
      />

      <QuickLogModal
        visible={showLog}
        onClose={(saved) => {
          setShowLog(false);
          if (saved) fetchLogs();
        }}
      />
    </SafeAreaView>
  );
}
