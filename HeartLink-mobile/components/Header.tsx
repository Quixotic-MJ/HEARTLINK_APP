import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../contexts/UserContext";
import HeartLogo from "./ui/HeartLogo";

export function Header({
  unreadCount,
  showProfile = false,
}: {
  unreadCount?: number;
  showProfile?: boolean;
} = {}) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, userId, token } = useUser();
  const [hasUnreadState, setHasUnreadState] = useState(false);

  const hasUnread = unreadCount !== undefined ? unreadCount > 0 : hasUnreadState;
  const iconColor = isDark ? "#cbd5e1" : "#64748b";

  useFocusEffect(
    useCallback(() => {
      // If unreadCount is explicitly provided by caller (e.g. Dashboard), skip duplicate fetch
      if (unreadCount !== undefined) return;

      let isActive = true;
      async function checkUnread() {
        if (!userId || !token) return;
        try {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/notifications/${userId}`, {
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
        <Text className="text-[18px] text-[#152131] dark:text-white tracking-tight font-bold">
          HeartLink<Text className="text-[11px] text-[#5C6B66] dark:text-slate-400 font-medium">™</Text>
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => router.push("/(home)/(profile)/notifications")}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={hasUnread ? "Notifications, unread items available" : "Notifications"}
          className="w-10 h-10 rounded-full bg-surface-card border-0 items-center justify-center shadow-sm shadow-slate-200/50 dark:shadow-none"
          activeOpacity={0.7}
        >
          <Feather name="bell" size={18} color={isDark ? "#94a3b8" : "#64748b"} />
          {hasUnread && (
            <View style={{ position: "absolute", top: 8, right: 10 }} className="w-2.5 h-2.5 bg-[#E8532E] rounded-full border-2 border-white dark:border-[#1A2634]" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(home)/(settings)/settings")}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          className="w-10 h-10 rounded-full bg-surface-card border-0 items-center justify-center shadow-sm shadow-slate-200/50 dark:shadow-none"
          activeOpacity={0.7}
        >
          <Feather name="settings" size={18} color={isDark ? "#94a3b8" : "#64748b"} />
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
            <View className="w-10 h-10 rounded-full bg-surface-card border-0 overflow-hidden shadow-sm shadow-slate-200/50 dark:shadow-none">
              <Image
                source={{ uri: user?.avatar_url || "https://ui-avatars.com/api/?name=" + (user?.first_name || "U") + "&background=E2E8F0&color=152131&bold=true" }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <View style={{ position: "absolute", bottom: 0, right: 0 }} className="w-3 h-3 bg-[#10B981] rounded-full border-2 border-white dark:border-[#1E293B]" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
