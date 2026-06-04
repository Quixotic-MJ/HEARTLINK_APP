import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

// ─── Types ──────────────────────────────────────────────────────────────────
type NotificationType = "alert" | "insight" | "reminder" | "achievement" | "system";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

// ─── Theme by type ──────────────────────────────────────────────────────────
function getNotifTheme(type: NotificationType) {
  switch (type) {
    case "alert":
      return {
        icon: "alert-triangle",
        iconType: "feather" as const,
        color: "#dc2626",
        bg: "bg-red-50",
        border: "border-red-100",
      };
    case "insight":
      return {
        icon: "zap",
        iconType: "feather" as const,
        color: "#1e4ed8",
        bg: "bg-blue-50",
        border: "border-blue-100",
      };
    case "reminder":
      return {
        icon: "clock",
        iconType: "feather" as const,
        color: "#d97706",
        bg: "bg-amber-50",
        border: "border-amber-100",
      };
    case "achievement":
      return {
        icon: "award",
        iconType: "feather" as const,
        color: "#059669",
        bg: "bg-emerald-50",
        border: "border-emerald-100",
      };
    case "system":
    default:
      return {
        icon: "info",
        iconType: "feather" as const,
        color: "#64748b",
        bg: "bg-slate-50",
        border: "border-slate-100",
      };
  }
}

// ─── Sample notifications ───────────────────────────────────────────────────
const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "alert",
    title: "Elevated Blood Pressure",
    message:
      "Your systolic BP reading of 145 mmHg exceeds your safe threshold. Consider resting and retaking in 15 minutes.",
    time: "5 min ago",
    read: false,
  },
  {
    id: "2",
    type: "insight",
    title: "Weekly Score Improved",
    message:
      "Your stability score rose by 5 points this week. Keep up the consistent medication and diet tracking!",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "3",
    type: "reminder",
    title: "Medication Reminder",
    message: "Time to take your Amlodipine 5mg. Don't forget to log it after.",
    time: "2 hours ago",
    read: false,
  },
  {
    id: "4",
    type: "achievement",
    title: "7-Day Streak! 🎉",
    message:
      "You've logged your vitals for 7 consecutive days. Consistency is key to better health outcomes.",
    time: "5 hours ago",
    read: true,
  },
  {
    id: "5",
    type: "reminder",
    title: "Daily Symptom Check-In",
    message:
      "How are you feeling today? Tap to log your symptoms before your evening review.",
    time: "8 hours ago",
    read: true,
  },
  {
    id: "6",
    type: "insight",
    title: "Sodium Intake Update",
    message:
      "You've consumed an estimated 1,200mg of sodium today — well within your 2,000mg daily limit.",
    time: "Yesterday",
    read: true,
  },
  {
    id: "7",
    type: "system",
    title: "App Update Available",
    message:
      "HeartLink v1.1 is ready with improved meal scanning and new exercise routines. Update now.",
    time: "2 days ago",
    read: true,
  },
  {
    id: "8",
    type: "achievement",
    title: "First Meal Scanned",
    message:
      "You scanned your first food barcode! HeartLink will now track its nutritional impact on your heart health.",
    time: "3 days ago",
    read: true,
  },
];

// ─── Notification Card ──────────────────────────────────────────────────────
function NotificationCard({
  notification,
  onPress,
}: {
  notification: Notification;
  onPress: () => void;
}) {
  const theme = getNotifTheme(notification.type);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className={`flex-row items-start p-4 rounded-[20px] mb-3 border ${
        notification.read
          ? "bg-white border-slate-100"
          : "bg-white border-blue-100"
      }`}
    >
      {/* Unread dot */}
      {!notification.read && (
        <View className="absolute top-4 left-4 w-2 h-2 bg-[#1e4ed8] rounded-full z-10" />
      )}

      {/* Icon */}
      <View
        className={`w-10 h-10 rounded-[14px] items-center justify-center mr-3.5 border ${theme.bg} ${theme.border} ${
          !notification.read ? "ml-3" : ""
        }`}
      >
        <Feather name={theme.icon as any} size={18} color={theme.color} />
      </View>

      {/* Content */}
      <View className="flex-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text
            className={`text-[14px] tracking-tight flex-1 mr-2 ${
              notification.read
                ? "font-bold text-slate-700"
                : "font-extrabold text-slate-900"
            }`}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text className="text-[11px] font-medium text-slate-400">
            {notification.time}
          </Text>
        </View>
        <Text
          className={`text-[13px] leading-[18px] ${
            notification.read
              ? "font-normal text-slate-400"
              : "font-medium text-slate-500"
          }`}
          numberOfLines={2}
        >
          {notification.message}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Notifications Screen ───────────────────────────────────────────────────
export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-[14px] bg-slate-100 items-center justify-center"
        >
          <Feather name="arrow-left" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-row items-center">
          <Text className="text-[17px] font-extrabold text-slate-900 tracking-tight">
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View className="ml-2 bg-[#1e4ed8] rounded-full w-6 h-6 items-center justify-center">
              <Text className="text-white text-[11px] font-extrabold">
                {unreadCount}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={markAllAsRead}
          className="w-10 h-10 rounded-[14px] bg-blue-50 items-center justify-center border border-blue-100"
        >
          <Feather name="check-circle" size={17} color="#1e4ed8" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row px-6 mt-2 mb-4 gap-2">
        <TouchableOpacity
          onPress={() => setFilter("all")}
          className={`px-5 py-2.5 rounded-full ${
            filter === "all"
              ? "bg-[#1e4ed8]"
              : "bg-white border border-slate-200"
          }`}
        >
          <Text
            className={`text-[13px] font-bold ${
              filter === "all" ? "text-white" : "text-slate-500"
            }`}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter("unread")}
          className={`px-5 py-2.5 rounded-full flex-row items-center ${
            filter === "unread"
              ? "bg-[#1e4ed8]"
              : "bg-white border border-slate-200"
          }`}
        >
          <Text
            className={`text-[13px] font-bold ${
              filter === "unread" ? "text-white" : "text-slate-500"
            }`}
          >
            Unread
          </Text>
          {unreadCount > 0 && filter !== "unread" && (
            <View className="ml-1.5 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
              <Text className="text-white text-[10px] font-bold">
                {unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5">
          {filteredNotifications.length === 0 ? (
            <View className="items-center justify-center pt-20">
              <View className="w-20 h-20 rounded-[24px] bg-slate-50 items-center justify-center mb-5 border border-slate-100">
                <Feather name="bell-off" size={32} color="#cbd5e1" />
              </View>
              <Text className="text-[18px] font-extrabold text-slate-900 tracking-tight mb-2">
                All caught up!
              </Text>
              <Text className="text-[14px] font-medium text-slate-400 text-center">
                No unread notifications.{"\n"}Check back later.
              </Text>
            </View>
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onPress={() => markAsRead(notification.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
