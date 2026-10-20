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
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { apiFetch } from "../../../lib/api";
import { ds, DsColors } from "../../../constants/theme";
import { useDs } from "../../../components/onboarding/useDs";
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
  /** Badge background and icon colour, from the design-system tints. */
  bg: keyof DsColors;
  fg: keyof DsColors;
};

const NOTIF_THEME: Record<NotificationType, NotifTheme> = {
  alert: { icon: "alert-triangle", bg: "rose", fg: "danger" },
  insight: { icon: "trending-up", bg: "sky", fg: "charcoal" },
  reminder: { icon: "clock", bg: "yellow", fg: "warmText" },
  achievement: { icon: "award", bg: "mint", fg: "charcoal" },
  system: { icon: "info", bg: "lavender", fg: "charcoal" },
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
}: {
  label: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  const { c } = useDs();
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
        borderWidth: 1,
        gap: 6,
        backgroundColor: active ? c.ink : c.canvas,
        borderColor: active ? c.ink : c.hairline,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "500",
          color: active ? c.canvas : c.charcoal,
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
            backgroundColor: active ? c.canvas : ds.light.danger,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: active ? c.ink : ds.light.onPrimary,
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

function SkeletonCard() {
  const { c } = useDs();
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

  const skeletonBg = c.surfaceAlt;

  return (
    <RNAnimated.View
      style={{
        opacity,
        flexDirection: "row",
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        minHeight: 76,
        backgroundColor: c.canvas,
        borderWidth: 1,
        borderColor: c.hairlineSoft,
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
}: {
  notification: Notification;
  onPress: () => void;
}) {
  const { c } = useDs();
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
        borderRadius: 12,
        marginBottom: 10,
        padding: 14,
        borderWidth: 1,
        minHeight: 74,
        backgroundColor: read ? c.surface : c.canvas,
        borderColor: read ? c.hairlineSoft : c.hairline,
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
            backgroundColor: notification.type === "alert" && !isBroadcast ? c.danger : c.line,
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
          backgroundColor: isBroadcast ? c.lavender : c[theme.bg],
        }}
      >
        {isBroadcast ? (
          <MaterialCommunityIcons
            name="bullhorn-outline"
            size={18}
            color={c.charcoal}
          />
        ) : (
          <Feather
            name={theme.icon as any}
            size={17}
            color={c[theme.fg]}
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
                fontSize: 15,
                lineHeight: 19,
                fontWeight: read ? "500" : "700",
                color: read ? c.slate : c.ink,
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
                  backgroundColor: c.lavender,
                  borderWidth: 0.5,
                  borderColor: c.lavender,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: c.charcoal,
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
                color: c.steel,
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
            fontSize: 13,
            lineHeight: 18,
            color: read ? c.slate : c.charcoal,
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
                fontSize: 13,
                fontWeight: "600",
                color: c.link,
              }}
            >
              View details
            </Text>
            <Feather
              name="arrow-right"
              size={11}
              color={c.link}
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
                color: c.slate,
              }}
            >
              {expanded ? "Show less" : "Show more"}
            </Text>
            <Feather
              name={expanded ? "chevron-up" : "chevron-down"}
              size={11}
              color={c.slate}
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
}: {
  title: string;
}) {
  const { c } = useDs();
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
          fontWeight: "600",
          color: c.steel,
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
          backgroundColor: c.hairline,
          marginLeft: 12,
        }}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { c, isDark } = useDs();
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
        const response = await apiFetch(`/api/notifications/${userId}`, {
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
      const response = await apiFetch(`/api/notifications/${id}/read`, {
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
      const response = await apiFetch(
        `/api/notifications/${userId}/mark-all-read`,
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
      style={{ flex: 1, backgroundColor: c.canvas }}
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
          borderBottomColor: c.hairlineSoft,
          backgroundColor: c.canvas,
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
            width: 44,
            height: 44,
            borderRadius: 8,
            backgroundColor: c.canvas,
            borderWidth: 1,
            borderColor: c.hairline,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Feather
            name="arrow-left"
            size={18}
            color={c.ink}
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
              fontSize: 22,
              fontWeight: "600",
              color: c.ink,
            }}
          >
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View
              accessible={true}
              accessibilityLabel={`${unreadCount} unread`}
              style={{
                backgroundColor: c.ink,
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
                  color: c.canvas,
                  fontSize: 11,
                  fontWeight: "600",
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
              backgroundColor: c.canvas,
              borderWidth: 1,
              borderColor: c.hairline,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 10,
            }}
          >
            {isMarkingAll ? (
              <ActivityIndicator
                size="small"
                color={c.slate}
              />
            ) : (
              <Feather
                name="check-circle"
                size={13}
                color={c.slate}
              />
            )}
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: c.slate,
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
         
        />
        <FilterChip
          label="Unread"
          active={filter === "unread"}
          badge={filter !== "unread" ? unreadCount : undefined}
          onPress={() => setFilter("unread")}
         
        />
        <FilterChip
          label="Announcements"
          active={filter === "broadcasts"}
          badge={filter !== "broadcasts" ? broadcastCount : undefined}
          onPress={() => setFilter("broadcasts")}
         
        />
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} />
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
              backgroundColor: c.rose,
              borderWidth: 1,
              borderColor: c.rose,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Feather
              name="alert-circle"
              size={28}
              color={c.danger}
            />
          </View>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: c.ink,
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
              color: c.steel,
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
              backgroundColor: c.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: c.canvas,
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
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.hairline,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Feather
              name={emptyStateConfig.icon as any}
              size={26}
              color={c.steel}
            />
          </View>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: c.ink,
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
              color: c.steel,
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
              tintColor={c.slate}
              colors={[c.line]}
            />
          }
          renderItem={({ item: section }) => (
            <View>
              <SectionHeader title={section.title} />
              {section.data.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onPress={() => markAsRead(n.id)}
                 
                />
              ))}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}