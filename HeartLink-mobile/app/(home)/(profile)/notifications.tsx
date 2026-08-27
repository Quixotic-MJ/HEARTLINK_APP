import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { useToast } from "../../../contexts/ToastContext";

const base_url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

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

// ─── Theme Config ─────────────────────────────────────────────────────────────

type NotifTheme = {
  icon: string;
  color: string;
  iconBg: string;
  iconBorder: string;
  dotColor: string;
  darkColor: string;
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
    darkColor: "#ef4444",
    darkIconBg: "#2a1215",
    darkIconBorder: "#451a1a",
  },
  insight: {
    icon: "trending-up",
    color: "#2563eb",
    iconBg: "#eff6ff",
    iconBorder: "#bfdbfe",
    dotColor: "#2563eb",
    darkColor: "#3b82f6",
    darkIconBg: "#13203b",
    darkIconBorder: "#1e3a5f",
  },
  reminder: {
    icon: "clock",
    color: "#d97706",
    iconBg: "#fffbeb",
    iconBorder: "#fde68a",
    dotColor: "#d97706",
    darkColor: "#f59e0b",
    darkIconBg: "#2d1f0d",
    darkIconBorder: "#57300c",
  },
  achievement: {
    icon: "award",
    color: "#16a34a",
    iconBg: "#f0fdf4",
    iconBorder: "#bbf7d0",
    dotColor: "#16a34a",
    darkColor: "#22c55e",
    darkIconBg: "#112a1a",
    darkIconBorder: "#16532d",
  },
  system: {
    icon: "info",
    color: "#6366f1",
    iconBg: "#eef2ff",
    iconBorder: "#c7d2fe",
    dotColor: "#6366f1",
    darkColor: "#818cf8",
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
    if (isNaN(diffMs)) return "";

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

// ─── Filter Chip Component ────────────────────────────────────────────────────

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
      accessible={true}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filter by ${label}${badge !== undefined && badge > 0 ? `, ${badge} items` : ""}`}
      accessibilityHint={`Shows ${label.toLowerCase()} notifications`}
      onPress={onPress}
      activeOpacity={0.75}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 38,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 100,
        borderWidth: 1.5,
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
          fontSize: 12.5,
          fontWeight: active ? "700" : "500",
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
            minWidth: 19,
            height: 19,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 5,
            backgroundColor: active
              ? isDark
                ? "#0f172a"
                : "rgba(255,255,255,0.25)"
              : "#dc2626",
          }}
        >
          <Text
            style={{
              fontSize: 10.5,
              fontWeight: "700",
              color: active && isDark ? "#f8fafc" : "#ffffff",
            }}
          >
            {badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Skeleton Loader Component ────────────────────────────────────────────────

function SkeletonCard({ isDark }: { isDark: boolean }) {
  const opacity = useRef(new RNAnimated.Value(0.35)).current;

  useEffect(() => {
    const anim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(opacity, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        RNAnimated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  const skeletonBg = isDark ? "#1e293b" : "#e2e8f0";

  return (
    <RNAnimated.View
      style={{
        opacity,
        flexDirection: "row",
        padding: 14,
        borderRadius: 16,
        marginBottom: 10,
        minHeight: 76,
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
          backgroundColor: skeletonBg,
          marginRight: 12,
        }}
      />
      <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View
            style={{
              height: 12,
              borderRadius: 6,
              backgroundColor: skeletonBg,
              width: "60%",
            }}
          />
          <View
            style={{
              height: 10,
              borderRadius: 5,
              backgroundColor: skeletonBg,
              width: "20%",
            }}
          />
        </View>
        <View
          style={{
            height: 10,
            borderRadius: 5,
            backgroundColor: skeletonBg,
            width: "90%",
          }}
        />
        <View
          style={{
            height: 10,
            borderRadius: 5,
            backgroundColor: skeletonBg,
            width: "45%",
          }}
        />
      </View>
    </RNAnimated.View>
  );
}

// ─── Notification Card Component ──────────────────────────────────────────────

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
  const theme = NOTIF_THEME[notification.type] || NOTIF_THEME.system;
  const { read, scope } = notification;
  const isBroadcast = scope === "broadcast";
  const [expanded, setExpanded] = useState(false);

  const actionRoute =
    notification.route ||
    (notification.message &&
    notification.message.toLowerCase().includes("tap to log")
      ? "/(home)/(health)/log-symptoms"
      : null);

  const relativeTime = getRelativeTime(notification.created_at);

  const handleCardPress = () => {
    if (!read) {
      onPress();
    }
    if (actionRoute) {
      router.push(actionRoute as any);
    } else {
      setExpanded((prev) => !prev);
    }
  };

  const isLongMessage = notification.message && notification.message.length > 90;

  return (
    <TouchableOpacity
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${read ? "Read" : "Unread"} ${
        isBroadcast ? "Announcement" : notification.type
      } notification: ${notification.title}. ${notification.message}. ${
        actionRoute
          ? "Tap to open details."
          : expanded
          ? "Tap to collapse message."
          : "Tap to expand and mark as read."
      }`}
      activeOpacity={0.7}
      onPress={handleCardPress}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        borderRadius: 16,
        marginBottom: 10,
        padding: 14,
        borderWidth: 1,
        minHeight: 74,
        backgroundColor: read
          ? isDark
            ? "#090d16"
            : "#f8fafc"
          : isDark
          ? "#0f172a"
          : "#ffffff",
        borderColor: read
          ? isDark
            ? "#1e293b60"
            : "#f1f5f9"
          : isDark
          ? isBroadcast
            ? "#312e81"
            : "#1e293b"
          : isBroadcast
          ? "#c7d2fe"
          : "#dbeafe",
      }}
    >
      {/* Unread Accent Indicator Bar */}
      {!read && (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 14,
            bottom: 14,
            width: 3.5,
            borderTopRightRadius: 3,
            borderBottomRightRadius: 3,
            backgroundColor: isBroadcast
              ? isDark
                ? "#818cf8"
                : "#6366f1"
              : isDark
              ? theme.darkColor
              : theme.dotColor,
          }}
        />
      )}

      {/* Icon Container */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          borderWidth: 1,
          backgroundColor: isDark
            ? isBroadcast
              ? "#1e1b4b"
              : theme.darkIconBg
            : isBroadcast
            ? "#eef2ff"
            : theme.iconBg,
          borderColor: isDark
            ? isBroadcast
              ? "#312e81"
              : theme.darkIconBorder
            : isBroadcast
            ? "#c7d2fe"
            : theme.iconBorder,
        }}
      >
        {isBroadcast ? (
          <MaterialCommunityIcons
            name="bullhorn-outline"
            size={18}
            color={isDark ? "#a5b4fc" : "#6366f1"}
          />
        ) : (
          <Feather
            name={theme.icon as any}
            size={17}
            color={isDark ? theme.darkColor : theme.color}
          />
        )}
      </View>

      {/* Content Container */}
      <View style={{ flex: 1, justifyContent: "center" }}>
        {/* Title and Timestamp Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 3,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <Text
              style={{
                fontSize: 13.5,
                lineHeight: 19,
                fontWeight: read ? "500" : "700",
                color: read
                  ? isDark
                    ? "#94a3b8"
                    : "#475569"
                  : isDark
                  ? "#f8fafc"
                  : "#0f172a",
              }}
              numberOfLines={expanded ? undefined : 2}
            >
              {notification.title}
            </Text>

            {isBroadcast && (
              <View
                style={{
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: isDark ? "#312e81" : "#e0e7ff",
                  borderWidth: 0.5,
                  borderColor: isDark ? "#4338ca" : "#c7d2fe",
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "700",
                    color: isDark ? "#c7d2fe" : "#4338ca",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Announcement
                </Text>
              </View>
            )}
          </View>

          {relativeTime ? (
            <Text
              style={{
                fontSize: 11,
                fontWeight: "500",
                color: isDark ? "#64748b" : "#94a3b8",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {relativeTime}
            </Text>
          ) : null}
        </View>

        {/* Message Body */}
        <Text
          style={{
            fontSize: 12.5,
            lineHeight: 18,
            color: read
              ? isDark
                ? "#64748b"
                : "#64748b"
              : isDark
              ? "#cbd5e1"
              : "#334155",
            marginTop: 2,
          }}
          numberOfLines={expanded ? undefined : 2}
        >
          {notification.message}
        </Text>

        {/* Action Hint / Expand Hint */}
        {actionRoute ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginTop: 6,
            }}
          >
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: "600",
                color: isDark ? "#38bdf8" : "#0284c7",
              }}
            >
              View details
            </Text>
            <Feather
              name="arrow-right"
              size={11}
              color={isDark ? "#38bdf8" : "#0284c7"}
            />
          </View>
        ) : isLongMessage ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
              marginTop: 5,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: isDark ? "#94a3b8" : "#64748b",
              }}
            >
              {expanded ? "Show less" : "Show more"}
            </Text>
            <Feather
              name={expanded ? "chevron-up" : "chevron-down"}
              size={11}
              color={isDark ? "#94a3b8" : "#64748b"}
            />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─── Section Header Component ─────────────────────────────────────────────────

function SectionHeader({
  title,
  isDark,
}: {
  title: string;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        marginTop: 18,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: isDark ? "#64748b" : "#94a3b8",
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
          backgroundColor: isDark ? "#1e293b" : "#e2e8f0",
          marginLeft: 12,
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
  const { userId, token } = useUser();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [hasFetchError, setHasFetchError] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const isFetchingRef = useRef(false);

  const fetchNotifications = useCallback(
    async (isBackground = false) => {
      if (!userId || isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const effectiveToken = token || "";
        const response = await fetch(`${base_url}/api/notifications/${userId}`, {
          headers: {
            Authorization: `Bearer ${effectiveToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }

        const data = await response.json();
        const mapped: Notification[] = Array.isArray(data)
          ? data.map((n: any) => ({
              id: n.id || String(Math.random()),
              type: n.type || "system",
              scope: n.scope || "personal",
              broadcast_type: n.broadcast_type,
              broadcast_id: n.broadcast_id,
              title: n.title || "",
              message: n.message || "",
              created_at: n.created_at || new Date().toISOString(),
              read: Boolean(n.read),
              route: n.route,
            }))
          : [];

        setNotifications(mapped);
        setHasFetchError(false);
      } catch (error) {
        console.error("Notifications fetch error:", error);
        if (isBackground) {
          showToast({
            title: "Network Issue",
            message: "Couldn't refresh notifications. Pull down to try again.",
            type: "error",
          });
        } else {
          setHasFetchError(true);
        }
      } finally {
        isFetchingRef.current = false;
      }
    },
    [userId, token, showToast]
  );

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!userId) return;
      setIsLoading(true);
      setHasFetchError(false);
      await fetchNotifications(false);
      if (isMounted) {
        setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [userId, fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchNotifications(true);
    setIsRefreshing(false);
  }, [fetchNotifications]);

  const handleRetry = useCallback(async () => {
    setIsLoading(true);
    setHasFetchError(false);
    await fetchNotifications(false);
    setIsLoading(false);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    const prevNotifications = [...notifications];
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    try {
      const effectiveToken = token || "";
      const response = await fetch(`${base_url}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
        },
      });

      if (!response.ok) {
        // Rollback
        setNotifications(prevNotifications);
      }
    } catch (e) {
      console.error("Failed to mark notification read:", e);
      // Rollback on network failure
      setNotifications(prevNotifications);
    }
  };

  const markAllAsRead = async () => {
    if (!userId || isMarkingAll) return;
    const prevNotifications = [...notifications];

    // Optimistic update
    setIsMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      const effectiveToken = token || "";
      const response = await fetch(
        `${base_url}/api/notifications/${userId}/mark-all-read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${effectiveToken}`,
          },
        }
      );

      if (!response.ok) {
        // Rollback
        setNotifications(prevNotifications);
        showToast({
          title: "Update Failed",
          message: "Couldn't mark all as read. Please try again.",
          type: "error",
        });
      }
    } catch (e) {
      console.error("Failed to mark all notifications read:", e);
      // Rollback on network failure
      setNotifications(prevNotifications);
      showToast({
        title: "Network Error",
        message: "Please check your connection.",
        type: "error",
      });
    } finally {
      setIsMarkingAll(false);
    }
  };

  // ─── Filter & Group Calculations ──────────────────────────────────────────

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "unread") return !n.read;
      if (filter === "broadcasts") return n.scope === "broadcast";
      return true;
    });
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const broadcastCount = useMemo(() => {
    return notifications.filter((n) => n.scope === "broadcast").length;
  }, [notifications]);

  const grouped = useMemo(() => {
    const groupOrder = ["Today", "Yesterday", "This Week", "Earlier"];
    const groupMap = new Map<string, Notification[]>();

    for (const n of filtered) {
      const group = getDateGroup(n.created_at);
      if (!groupMap.has(group)) groupMap.set(group, []);
      groupMap.get(group)!.push(n);
    }

    const result: { title: string; data: Notification[] }[] = [];
    for (const key of groupOrder) {
      if (groupMap.has(key)) {
        result.push({ title: key, data: groupMap.get(key)! });
      }
    }
    return result;
  }, [filtered]);

  // ─── Empty State Config ───────────────────────────────────────────────────

  const emptyStateConfig = useMemo(() => {
    switch (filter) {
      case "unread":
        return {
          icon: "check-circle",
          title: "You're all caught up.",
          description: "You have no unread notifications right now.",
        };
      case "broadcasts":
        return {
          icon: "bell-off",
          title: "No announcements yet.",
          description: "System announcements will appear here when available.",
        };
      case "all":
      default:
        return {
          icon: "bell-off",
          title: "You're all caught up.",
          description:
            "New health updates, reminders, insights, and announcements will appear here.",
        };
    }
  }, [filter]);

  // ─── Render ───────────────────────────────────────────────────────────────

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
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "#1e293b60" : "#f1f5f9",
          backgroundColor: isDark ? "#020617" : "#f8fafc",
        }}
      >
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Returns to the previous screen"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
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

        {/* Title and Unread Counter */}
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
              fontWeight: "700",
              color: isDark ? "#f8fafc" : "#0f172a",
              letterSpacing: -0.3,
            }}
          >
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View
              accessible={true}
              accessibilityLabel={`${unreadCount} unread`}
              style={{
                backgroundColor: isDark ? "#e2e8f0" : "#0f172a",
                borderRadius: 10,
                minWidth: 22,
                height: 20,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 6,
              }}
            >
              <Text
                style={{
                  color: isDark ? "#0f172a" : "#ffffff",
                  fontSize: 10.5,
                  fontWeight: "700",
                }}
              >
                {unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* Mark All Read Action */}
        {unreadCount > 0 && (
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
            accessibilityState={{ disabled: isMarkingAll, busy: isMarkingAll }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={markAllAsRead}
            disabled={isMarkingAll}
            style={{
              flexDirection: "row",
              alignItems: "center",
              minHeight: 36,
              gap: 6,
              backgroundColor: isDark ? "#0f172a" : "#ffffff",
              borderWidth: 1,
              borderColor: isDark ? "#1e293b" : "#e2e8f0",
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 10,
            }}
          >
            {isMarkingAll ? (
              <ActivityIndicator
                size="small"
                color={isDark ? "#94a3b8" : "#64748b"}
              />
            ) : (
              <Feather
                name="check-circle"
                size={13}
                color={isDark ? "#94a3b8" : "#64748b"}
              />
            )}
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: "600",
                color: isDark ? "#94a3b8" : "#64748b",
              }}
            >
              Read all
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips Bar */}
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
          label="Announcements"
          active={filter === "broadcasts"}
          badge={filter !== "broadcasts" ? broadcastCount : undefined}
          onPress={() => setFilter("broadcasts")}
          isDark={isDark}
        />
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} isDark={isDark} />
          ))}
        </View>
      ) : hasFetchError && notifications.length === 0 ? (
        /* Error State (initial load fail) */
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 70,
            paddingHorizontal: 30,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: isDark ? "#2a1215" : "#fef2f2",
              borderWidth: 1,
              borderColor: isDark ? "#451a1a" : "#fecaca",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Feather
              name="alert-circle"
              size={28}
              color={isDark ? "#ef4444" : "#dc2626"}
            />
          </View>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: isDark ? "#f8fafc" : "#0f172a",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Couldn't load notifications
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: isDark ? "#64748b" : "#94a3b8",
              textAlign: "center",
              maxWidth: 260,
              lineHeight: 18,
              marginBottom: 20,
            }}
          >
            Please check your connection and try again.
          </Text>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Retry loading notifications"
            onPress={handleRetry}
            style={{
              minHeight: 44,
              minWidth: 130,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: isDark ? "#e2e8f0" : "#0f172a",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: isDark ? "#0f172a" : "#ffffff",
              }}
            >
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        /* Empty State */
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 80,
            paddingHorizontal: 30,
          }}
        >
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
              name={emptyStateConfig.icon as any}
              size={26}
              color={isDark ? "#475569" : "#94a3b8"}
            />
          </View>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: isDark ? "#f8fafc" : "#0f172a",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            {emptyStateConfig.title}
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: isDark ? "#64748b" : "#94a3b8",
              textAlign: "center",
              maxWidth: 280,
              lineHeight: 19,
            }}
          >
            {emptyStateConfig.description}
          </Text>
        </View>
      ) : (
        /* Notifications List */
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
              colors={[isDark ? "#818cf8" : "#0f172a"]}
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