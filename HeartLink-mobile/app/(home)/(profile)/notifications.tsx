import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationType = "alert" | "insight" | "reminder" | "achievement" | "system";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  route?: string;
}

// ─── Theme config (plain values — no dynamic className) ───────────────────────

type NotifTheme = {
  icon: string;
  color: string;
  iconBg: string;
  iconBorder: string;
  dotColor: string;
};

const NOTIF_THEME: Record<NotificationType, NotifTheme> = {
  alert: {
    icon: "alert-triangle",
    color: "#a32d2d",
    iconBg: "#fcebeb",
    iconBorder: "#f7c1c1",
    dotColor: "#e24b4a",
  },
  insight: {
    icon: "zap",
    color: "#185fa5",
    iconBg: "#e6f1fb",
    iconBorder: "#b8d8f5",
    dotColor: "#185fa5",
  },
  reminder: {
    icon: "clock",
    color: "#854f0b",
    iconBg: "#faeeda",
    iconBorder: "#fac775",
    dotColor: "#ba7517",
  },
  achievement: {
    icon: "award",
    color: "#3b6d11",
    iconBg: "#eaf3de",
    iconBorder: "#c0dd97",
    dotColor: "#639922",
  },
  system: {
    icon: "info",
    color: "#64748b",
    iconBg: "#f8fafc",
    iconBorder: "#e2e8f0",
    dotColor: "#94a3b8",
  },
};

// ─── Sample Data ──────────────────────────────────────────────────────────────

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "alert",
    title: "Elevated blood pressure",
    message:
      "Your systolic BP reading of 145 mmHg exceeds your safe threshold. Consider resting and retaking in 15 minutes.",
    time: "5 min ago",
    read: false,
  },
  {
    id: "2",
    type: "insight",
    title: "Weekly score improved",
    message:
      "Your stability score rose by 5 points this week. Keep up the consistent medication and diet tracking!",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "4",
    type: "achievement",
    title: "7-day streak",
    message:
      "You've logged your vitals for 7 consecutive days. Consistency is key to better health outcomes.",
    time: "5 hours ago",
    read: true,
  },
  {
    id: "5",
    type: "reminder",
    title: "Daily symptom check-in",
    message:
      "How are you feeling today? Tap to log your symptoms before your evening review.",
    time: "8 hours ago",
    read: true,
    route: "/(home)/(health)/log-symptoms",
  },
  {
    id: "6",
    type: "insight",
    title: "Sodium intake update",
    message:
      "You've consumed an estimated 1,200 mg of sodium today — well within your 2,000 mg daily limit.",
    time: "Yesterday",
    read: true,
  },
  {
    id: "7",
    type: "system",
    title: "App update available",
    message:
      "HeartLink v1.1 is ready with improved meal scanning and new exercise routines.",
    time: "2 days ago",
    read: true,
  },
  {
    id: "8",
    type: "achievement",
    title: "First meal scanned",
    message:
      "You scanned your first food barcode! HeartLink will now track its nutritional impact on your heart health.",
    time: "3 days ago",
    read: true,
  },
];

// ─── Filter Chip ──────────────────────────────────────────────────────────────
// Dynamic bg/border/text via inline style — avoids css-interop crash

function FilterChip({
  label,
  active,
  badge,
  onPress,
}: {
  label: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="flex-row items-center px-4 py-2 rounded-full border gap-1.5"
      style={{
        backgroundColor: active ? "#0f172a" : "#fff",
        borderColor: active ? "#0f172a" : "#e2e8f0",
      }}
    >
      <Text
        className="text-[12px] font-medium"
        style={{ color: active ? "#fff" : "#64748b" }}
      >
        {label}
      </Text>
      {badge !== undefined && badge > 0 && (
        <View
          className="w-4 h-4 rounded-full items-center justify-center"
          style={{ backgroundColor: active ? "rgba(255,255,255,0.2)" : "#e24b4a" }}
        >
          <Text
            className="text-[9px] font-medium"
            style={{ color: active ? "#fff" : "#fff" }}
          >
            {badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Notification Card ────────────────────────────────────────────────────────
// All conditional bg/border/text via inline style

function NotificationCard({
  notification,
  onPress,
}: {
  notification: Notification;
  onPress: () => void;
}) {
  const router = useRouter();
  const theme = NOTIF_THEME[notification.type];
  const { read } = notification;
  const [expanded, setExpanded] = React.useState(false);

  const actionRoute = notification.route || 
    (notification.message.toLowerCase().includes("tap to log") ? "/(home)/(health)/log-symptoms" : null);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        if (!read) onPress();
        
        if (actionRoute) {
          router.push(actionRoute as any);
        } else {
          setExpanded(!expanded);
        }
      }}
      className={`flex-row items-start rounded-2xl mb-2.5 p-4 border ${read ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-blue-50 dark:bg-slate-800 border-blue-100 dark:border-slate-700'}`}
    >
      {/* Unread indicator strip */}
      {!read && (
        <View
          className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full"
          style={{ backgroundColor: theme.dotColor }}
        />
      )}

      {/* Icon */}
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3 flex-shrink-0 border"
        style={{ backgroundColor: theme.iconBg, borderColor: theme.iconBorder }}
      >
        <Feather name={theme.icon as any} size={15} color={theme.color} />
      </View>

      {/* Content */}
      <View className="flex-1">
        <View className="flex-row items-start justify-between gap-2 mb-1">
          <Text
            className={`flex-1 text-[13px] leading-snug ${read ? 'text-slate-500 dark:text-slate-400 font-normal' : 'text-slate-900 dark:text-white font-medium'}`}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text className="text-[11px] text-slate-300 flex-shrink-0">
            {notification.time}
          </Text>
        </View>
        <Text
          className="text-[12px] leading-[18px] text-slate-400 mt-1"
          numberOfLines={expanded ? undefined : 2}
        >
          {notification.message}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Notifications Screen ─────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId } = useUser();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const response = await fetch(`${base_url}/api/notifications/${userId}`);
        if (!response.ok) throw new Error("Failed to fetch notifications");
        const data = await response.json();
        
        const mapped = data.map((n: any) => ({
          id: n.id,
          type: n.type || "system",
          title: n.title || "",
          message: n.message || "",
          time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // simplistic formatting
          read: n.read || false,
          route: n.route,
        }));
        setNotifications(mapped);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    if (userId) fetchNotifications();
  }, [userId]);

  const [filter, setFilter] = useState<"all" | "unread">("all");

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${base_url}/api/notifications/${id}/read`, { method: "PUT" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };
  
  const filtered =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  // Group into today vs. earlier
  const todayLabels = ["5 min ago", "1 hour ago", "2 hours ago", "5 hours ago", "8 hours ago"];
  const today = filtered.filter((n) => todayLabels.includes(n.time));
  const earlier = filtered.filter((n) => !todayLabels.includes(n.time));

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/50">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>

        <View className="flex-1 flex-row items-center gap-2">
          <Text className="text-[17px] font-medium text-slate-900 dark:text-white">
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View className="bg-slate-900 rounded-full w-5 h-5 items-center justify-center">
              <Text className="text-white text-[10px] font-medium">
                {unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* Mark all read */}
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllAsRead}
            className="flex-row items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 px-3 py-1.5 rounded-xl"
          >
            <Feather name="check" size={13} color="#64748b" />
            <Text className="text-[9px] text-slate-500 dark:text-slate-400">Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View className="flex-row gap-2 px-5 py-3">
        <FilterChip
          label="All"
          active={filter === "all"}
          onPress={() => setFilter("all")}
        />
        <FilterChip
          label="Unread"
          active={filter === "unread"}
          badge={filter !== "unread" ? unreadCount : undefined}
          onPress={() => setFilter("unread")}
        />
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-16"
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View className="items-center pt-20">
            <View className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800/70 items-center justify-center mb-4">
              <Feather name="bell-off" size={22} color="#cbd5e1" />
            </View>
            <Text className="text-[16px] font-medium text-slate-900 dark:text-white mb-1">
              All caught up
            </Text>
            <Text className="text-[13px] text-slate-400 text-center">
              No unread notifications.
            </Text>
          </View>
        ) : (
          <>
            {/* Today */}
            {today.length > 0 && (
              <>
                <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">
                  Today
                </Text>
                {today.map((n) => (
                  <NotificationCard
                    key={n.id}
                    notification={n}
                    onPress={() => markAsRead(n.id)}
                  />
                ))}
              </>
            )}

            {/* Earlier */}
            {earlier.length > 0 && (
              <>
                <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-2 mt-4">
                  Earlier
                </Text>
                {earlier.map((n) => (
                  <NotificationCard
                    key={n.id}
                    notification={n}
                    onPress={() => markAsRead(n.id)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}