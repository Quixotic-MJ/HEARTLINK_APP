import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useDs } from "./onboarding/useDs";
import { useUser } from "../contexts/UserContext";
import HeartLogo from "./ui/HeartLogo";
import { apiFetch } from "../lib/api";

export function Header({
  unreadCount,
  showProfile = false,
}: {
  unreadCount?: number;
  showProfile?: boolean;
} = {}) {
  const router = useRouter();
  const { c } = useDs();
  const { user, userId, token } = useUser();
  const [hasUnreadState, setHasUnreadState] = useState(false);

  const hasUnread = unreadCount !== undefined ? unreadCount > 0 : hasUnreadState;
  // 44px outlined squares, as on the other design-system screens.
  const iconButton = { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas };

  useFocusEffect(
    useCallback(() => {
      // If unreadCount is explicitly provided by caller (e.g. Dashboard), skip duplicate fetch
      if (unreadCount !== undefined) return;

      let isActive = true;
      async function checkUnread() {
        if (!userId || !token) return;
        try {
          const response = await apiFetch(`/api/notifications/${userId}`, {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            if (isActive) {
              setHasUnreadState(data.some((n: any) => !n.read));
            }
          }
        } catch (err) {
          console.error("Failed to check notifications", err);
        }
      }
      checkUnread();
      return () => { isActive = false; };
    }, [userId, token, unreadCount])
  );

  return (
    <View className="flex-row justify-between items-center px-5 pt-3 pb-2 bg-transparent">
      <View className="flex-row items-center gap-2">
        <HeartLogo size={22} />
        <Text style={{ fontSize: 18, fontWeight: "600", letterSpacing: -0.3, color: c.ink }}>
          HeartLink<Text style={{ fontSize: 11, fontWeight: "500", color: c.steel }}>™</Text>
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => router.push("/(home)/(profile)/notifications")}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={hasUnread ? "Notifications, unread items available" : "Notifications"}
          className="items-center justify-center"
          style={iconButton}
          activeOpacity={0.7}
        >
          <Feather name="bell" size={19} color={c.ink} />
          {hasUnread && (
            <View style={{ position: "absolute", top: 9, right: 10, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: c.canvas, backgroundColor: c.line }} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(home)/(settings)/settings")}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          className="items-center justify-center"
          style={iconButton}
          activeOpacity={0.7}
        >
          <Feather name="settings" size={19} color={c.ink} />
        </TouchableOpacity>

        {showProfile && (
          <TouchableOpacity
            onPress={() => router.push("/(home)/(profile)/profile")}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="My Profile"
            className="ml-0.5"
          >
            <View className="overflow-hidden" style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.surface }}>
              <Image
                source={{ uri: user?.avatar_url || "https://ui-avatars.com/api/?name=" + (user?.first_name || "U") + "&background=E2E8F0&color=152131&bold=true" }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <View style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: c.canvas, backgroundColor: c.success }} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
