import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../contexts/UserContext";
import HeartLogo from "./ui/HeartLogo";

export function Header({ unreadCount }: { unreadCount?: number } = {}) {
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
          className="w-9 h-9 rounded-xl bg-white dark:bg-[#1A2634] border border-[#DCE3DF] dark:border-slate-800 items-center justify-center shadow-xs"
          activeOpacity={0.7}
        >
          <Feather name="bell" size={16} color={isDark ? "#cbd5e1" : "#5C6B66"} />
          {hasUnread && (
            <View style={{ position: "absolute", top: 8, right: 8 }} className="w-2 h-2 bg-[#E8532E] rounded-full" />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => router.push("/(home)/(settings)/settings")} 
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          className="w-9 h-9 rounded-xl bg-white dark:bg-[#1A2634] border border-[#DCE3DF] dark:border-slate-800 items-center justify-center shadow-xs"
          activeOpacity={0.7}
        >
          <Feather name="settings" size={16} color={isDark ? "#cbd5e1" : "#5C6B66"} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => router.push("/(home)/(profile)/profile")} 
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="My Profile" 
          className="ml-0.5"
        >
          <View className="w-9 h-9 rounded-full bg-white dark:bg-[#1A2634] border border-[#DCE3DF] dark:border-slate-800 overflow-hidden shadow-xs">
            <Image 
              source={{ uri: user?.avatar_url || "https://ui-avatars.com/api/?name=" + (user?.first_name || "U") + "&background=EDF1EF&color=152131&bold=true" }} 
              className="w-full h-full" 
              resizeMode="cover" 
            />
          </View>
          <View style={{ position: "absolute", bottom: -1, right: -1 }} className="w-2.5 h-2.5 bg-[#1B6E63] rounded-full border-2 border-white dark:border-[#101923]" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
