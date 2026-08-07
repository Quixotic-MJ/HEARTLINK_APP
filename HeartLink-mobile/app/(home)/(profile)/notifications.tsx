import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Animated as RNAnimated,
} from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationType =
  | "alert"
  | "insight"
  | "reminder"
  | "achievement"
  | "system";

interface Notification {
  id: string;
  type: NotificationType;
  scope?: string;
  broadcast_type?: string;
  broadcast_id?: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  route?: string;
}

// ─── Theme config ─────────────────────────────────────────────────────────────

type NotifTheme = {
  icon: string;
  color: string;
  iconBg: string;
  iconBorder: string;
  dotColor: string;
  darkIconBg: string;
  darkIconBorder: string;
};

const NOTIF_THEME: Record<NotificationType, NotifTheme> = {
  alert: {
    icon: "alert-triangle",
    color: "#dc2626",
    iconBg: "#fef2f2",
    iconBorder: "#fecaca",
    dotColor: "#dc2626",
    darkIconBg: "#451a1a",
    darkIconBorder: "#7f1d1d",
  },
  insight: {
    icon: "zap",
    color: "#2563eb",
    iconBg: "#eff6ff",
    iconBorder: "#bfdbfe",
    dotColor: "#2563eb",
    darkIconBg: "#1e2a4a",
    darkIconBorder: "#1e3a5f",
  },
  reminder: {
    icon: "clock",
    color: "#d97706",
    iconBg: "#fffbeb",
    iconBorder: "#fde68a",
    dotColor: "#d97706",
    darkIconBg: "#3b2a0a",
    darkIconBorder: "#78350f",
  },
  achievement: {
    icon: "award",
    color: "#16a34a",
    iconBg: "#f0fdf4",
    iconBorder: "#bbf7d0",
    dotColor: "#16a34a",
    darkIconBg: "#14331f",
    darkIconBorder: "#166534",
  },
  system: {
    icon: "info",
    color: "#6366f1",
    iconBg: "#eef2ff",
    iconBorder: "#c7d2fe",
    dotColor: "#6366f1",
    darkIconBg: "#1e1b4b",
    darkIconBorder: "#312e81",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function getDateGroup(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    if (date >= today) return "Today";
    if (date >= yesterday) return "Yesterday";
    if (date >= weekAgo) return "This Week";
    return "Earlier";
  } catch {
    return "Earlier";
  }
}

type FilterType = "all" | "unread" | "broadcasts";

// ─── Filter Chip ──────────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  badge,
  onPress,
  isDark,
}: {
  label: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 100,
        borderWidth: 1,
        gap: 6,
        backgroundColor: active
          ? isDark
            ? "#e2e8f0"
            : "#0f172a"
          : isDark
          ? "#0f172a"
          : "#ffffff",
        borderColor: active
          ? isDark
            ? "#e2e8f0"
            : "#0f172a"
          : isDark
          ? "#334155"
          : "#e2e8f0",
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: active
            ? isDark
              ? "#0f172a"
              : "#ffffff"
            : isDark
            ? "#94a3b8"
            : "#64748b",
        }}
      >
        {label}
      </Text>
      {badge !== undefined && badge > 0 && (
        <View
          style={{
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
            backgroundColor: active ? "rgba(255,255,255,0.25)" : "#dc2626",
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>
            {badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function SkeletonCard({ isDark }: { isDark: boolean }) {
  const opacity = React.useRef(new RNAnimated.Value(0.3)).current;

  React.useEffect(() => {
    const anim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        RNAnimated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const bg = isDark ? "#1e293b" : "#f1f5f9";

  return (
    <RNAnimated.View
      style={{
        opacity,
        flexDirection: "row",
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
        borderWidth: 1,
        borderColor: isDark ? "#1e293b" : "#f1f5f9",
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: bg,
          marginRight: 12,
        }}
      />
      <View style={{ flex: 1, gap: 8 }}>
        <View
          style={{
            height: 12,
            borderRadius: 6,
            backgroundColor: bg,
            width: "70%",
          }}
        />
        <View
          style={{
            height: 10,
            borderRadius: 5,
            backgroundColor: bg,
            width: "100%",
          }}
        />
        <View
          style={{
            height: 10,
            borderRadius: 5,
            backgroundColor: bg,
            width: "40%",
          }}
        />
      </View>
    </RNAnimated.View>
  );
}

// ─── Notification Card ────────────────────────────────────────────────────────

function NotificationCard({
  notification,
  onPress,
  isDark,
}: {
  notification: Notification;
  onPress: () => void;
  isDark: boolean;
}) {
  const router = useRouter();
  const theme = NOTIF_THEME[notification.type];
  const { read, scope } = notification;
  const isBroadcast = scope === "broadcast";
  const [expanded, setExpanded] = React.useState(false);

  const actionRoute =
    notification.route ||
    (notification.message.toLowerCase().includes("tap to log")
      ? "/(home)/(health)/log-symptoms"
      : null);

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
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        borderRadius: 16,
        marginBottom: 10,
        padding: 14,
        borderWidth: 1,
        backgroundColor: read
          ? isDark
            ? "#0f172a"
            : "#ffffff"
          : isDark
          ? "#111827"
          : isBroadcast
          ? "#eef2ff"
          : "#eff6ff",
        borderColor: read
          ? isDark
            ? "#1e293b"
            : "#f1f5f9"
          : isDark
          ? "#1e293b"
          : isBroadcast
          ? "#c7d2fe"
          : "#dbeafe",
      }}
    >
      {/* Unread accent strip */}
      {!read && (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 14,
            bottom: 14,
            width: 3,
            borderRadius: 2,
            backgroundColor: isBroadcast ? "#6366f1" : theme.dotColor,
          }}
        />
      )}

      {/* Icon */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          borderWidth: 1,
          backgroundColor: isDark ? theme.darkIconBg : isBroadcast ? "#eef2ff" : theme.iconBg,
          borderColor: isDark ? theme.darkIconBorder : isBroadcast ? "#c7d2fe" : theme.iconBorder,
        }}
      >
        {isBroadcast ? (
          <MaterialCommunityIcons
            name="bullhorn-outline"
            size={18}
            color="#6366f1"
          />
        ) : (
          <Feather
            name={theme.icon as any}
            size={16}
            color={theme.color}
          />
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{
                flex: 1,
                fontSize: 13,
                lineHeight: 18,
                fontWeight: read ? "400" : "600",
                color: read
                  ? isDark
                    ? "#94a3b8"
                    : "#64748b"
                  : isDark
                  ? "#f8fafc"
                  : "#0f172a",
              }}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            {isBroadcast && (
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: isDark ? "#312e81" : "#e0e7ff",
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "700",
                    color: "#6366f1",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Broadcast
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "500",
              color: isDark ? "#475569" : "#94a3b8",
              flexShrink: 0,
            }}
          >
            {getRelativeTime(notification.created_at)}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            lineHeight: 18,
            color: isDark ? "#64748b" : "#94a3b8",
            marginTop: 2,
          }}
          numberOfLines={expanded ? undefined : 2}
        >
          {notification.message}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  isDark,
}: {
  title: string;
  isDark: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, marginTop: 16 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: isDark ? "#475569" : "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: 1.2,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          flex: 1,
          height: 1,
          backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
          marginLeft: 10,
        }}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId } = useUser();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(
        `${base_url}/api/notifications/${userId}`
      );
      if (!response.ok) throw new Error("Failed to fetch notifications");
      const data = await response.json();
      const mapped: Notification[] = data.map((n: any) => ({
        id: n.id,
        type: n.type || "system",
        scope: n.scope || "personal",
        broadcast_type: n.broadcast_type,
        broadcast_id: n.broadcast_id,
        title: n.title || "",
        message: n.message || "",
        created_at: n.created_at,
        read: n.read || false,
        route: n.route,
      }));
      setNotifications(mapped);
    } catch (error) {
      console.error(error);
    }
  }, [userId]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      await fetchNotifications();
      setIsLoading(false);
    }
    if (userId) load();
  }, [userId, fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${base_url}/api/notifications/${id}/read`, {
        method: "PUT",
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!userId) return;
      await fetch(`${base_url}/api/notifications/${userId}/mark-all-read`, {
        method: "PUT",
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Filtering ──────────────────────────────────────────────────────────

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "broadcasts") return n.scope === "broadcast";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const broadcastCount = notifications.filter(
    (n) => n.scope === "broadcast"
  ).length;

  // ─── Group by date ──────────────────────────────────────────────────────

  const grouped: { title: string; data: Notification[] }[] = [];
  const groupOrder = ["Today", "Yesterday", "This Week", "Earlier"];
  const groupMap = new Map<string, Notification[]>();

  for (const n of filtered) {
    const group = getDateGroup(n.created_at);
    if (!groupMap.has(group)) groupMap.set(group, []);
    groupMap.get(group)!.push(n);
  }

  for (const key of groupOrder) {
    if (groupMap.has(key)) {
      grouped.push({ title: key, data: groupMap.get(key)! });
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#020617" : "#f8fafc" }}
      edges={["top"]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "#1e293b50" : "#f1f5f9",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: isDark ? "#0f172a" : "#ffffff",
            borderWidth: 1,
            borderColor: isDark ? "#1e293b" : "#e2e8f0",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Feather
            name="arrow-left"
            size={18}
            color={isDark ? "#f8fafc" : "#0f172a"}
          />
        </TouchableOpacity>

        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: isDark ? "#f8fafc" : "#0f172a",
              letterSpacing: -0.3,
            }}
          >
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View
              style={{
                backgroundColor: isDark ? "#e2e8f0" : "#0f172a",
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 6,
              }}
            >
              <Text
                style={{
                  color: isDark ? "#0f172a" : "#ffffff",
                  fontSize: 10,
                  fontWeight: "700",
                }}
              >
                {unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* Mark all read */}
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllAsRead}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: isDark ? "#0f172a" : "#ffffff",
              borderWidth: 1,
              borderColor: isDark ? "#1e293b" : "#e2e8f0",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
            }}
          >
            <Feather name="check-circle" size={13} color={isDark ? "#94a3b8" : "#64748b"} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: isDark ? "#94a3b8" : "#64748b",
              }}
            >
              Read all
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <FilterChip
          label="All"
          active={filter === "all"}
          onPress={() => setFilter("all")}
          isDark={isDark}
        />
        <FilterChip
          label="Unread"
          active={filter === "unread"}
          badge={filter !== "unread" ? unreadCount : undefined}
          onPress={() => setFilter("unread")}
          isDark={isDark}
        />
        <FilterChip
          label="Broadcasts"
          active={filter === "broadcasts"}
          badge={filter !== "broadcasts" ? broadcastCount : undefined}
          onPress={() => setFilter("broadcasts")}
          isDark={isDark}
        />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} isDark={isDark} />
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ alignItems: "center", paddingTop: 80 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
              borderWidth: 1,
              borderColor: isDark ? "#1e293b" : "#e2e8f0",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Feather
              name="bell-off"
              size={26}
              color={isDark ? "#334155" : "#cbd5e1"}
            />
          </View>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: isDark ? "#f8fafc" : "#0f172a",
              marginBottom: 6,
            }}
          >
            {filter === "unread"
              ? "All caught up!"
              : filter === "broadcasts"
              ? "No broadcasts yet"
              : "No notifications"}
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: isDark ? "#64748b" : "#94a3b8",
              textAlign: "center",
              maxWidth: 240,
            }}
          >
            {filter === "unread"
              ? "You've read all your notifications."
              : filter === "broadcasts"
              ? "System broadcasts will appear here."
              : "When something happens, we'll let you know."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.title}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={isDark ? "#94a3b8" : "#64748b"}
            />
          }
          renderItem={({ item: section }) => (
            <View>
              <SectionHeader title={section.title} isDark={isDark} />
              {section.data.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onPress={() => markAsRead(n.id)}
                  isDark={isDark}
                />
              ))}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}