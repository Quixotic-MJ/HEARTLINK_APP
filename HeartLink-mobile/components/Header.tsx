import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../contexts/UserContext";

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
    <View className="flex-row justify-between items-center px-5 pt-3 pb-2 bg-background">
      <View className="flex-row items-center gap-2.5">
        <View className="w-8 h-8 rounded-full items-center justify-center border border-border bg-card shadow-sm">
          <Feather name="heart" size={14} color={isDark ? "#f8fafc" : "#0f172a"} />
        </View>
        <Text className="text-[15px] text-foreground tracking-tight" style={{ fontWeight: "300" }}>
          Heart<Text style={{ fontWeight: "600" }}>Link.</Text>
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <TouchableOpacity 
          onPress={() => router.push("/(home)/(profile)/notifications")} 
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={hasUnread ? "Notifications, unread items available" : "Notifications"}
          className="w-9 h-9 rounded-xl bg-card border border-border items-center justify-center shadow-sm"
          activeOpacity={0.7}
        >
          <Feather name="bell" size={16} color={iconColor} />
          {hasUnread && (
            <View style={{ position: "absolute", top: 8, right: 8 }} className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => router.push("/(home)/(settings)/settings")} 
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          className="w-9 h-9 rounded-xl bg-card border border-border items-center justify-center shadow-sm"
          activeOpacity={0.7}
        >
          <Feather name="settings" size={16} color={iconColor} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => router.push("/(home)/(profile)/profile")} 
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="My Profile" 
          className="ml-0.5"
        >
          <View className="w-9 h-9 rounded-full bg-card border border-border overflow-hidden shadow-sm">
            <Image 
              source={{ uri: user?.avatar_url || "https://ui-avatars.com/api/?name=" + (user?.first_name || "U") + "&background=e2e8f0&color=475569&bold=true" }} 
              className="w-full h-full" 
              resizeMode="cover" 
            />
          </View>
          <View style={{ position: "absolute", bottom: -1, right: -1 }} className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
