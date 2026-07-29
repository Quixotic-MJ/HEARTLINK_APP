import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../contexts/UserContext";
import { useState, useCallback } from "react";

export function Header() {
  const router = useRouter();
  const { user, userId } = useUser();
  const [hasUnread, setHasUnread] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      async function checkUnread() {
        if (!userId) return;
        try {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/notifications/${userId}`);
          if (response.ok) {
            const data = await response.json();
            if (isActive) {
              setHasUnread(data.some((n: any) => !n.read));
            }
          }
        } catch (err) {
          console.error("Failed to check notifications", err);
        }
      }
      checkUnread();
      return () => { isActive = false; };
    }, [userId])
  );

  return (
    <View className="flex-row justify-between items-center px-5 pt-4 pb-2">
      <View className="flex-row items-center gap-2.5">
        <View className="w-7 h-7 rounded-full items-center justify-center border border-primary/20 bg-primary/10">
          <Feather name="heart" size={13} className="text-primary" />
        </View>
        <Text className="text-[16px] text-slate-900 dark:text-white tracking-tight" style={{ fontWeight: "300" }}>
          Heart<Text style={{ fontWeight: "600" }}>Link.</Text>
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <TouchableOpacity 
          onPress={() => router.push("/(home)/(profile)/notifications")} 
          className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800/70 items-center justify-center"
        >
          <Feather name="bell" size={17} color="#64748b" />
          {hasUnread && (
            <View style={{ position: "absolute", top: 8, right: 8 }} className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => router.push("/(home)/(settings)/settings")} 
          className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800/70 items-center justify-center"
        >
          <Feather name="settings" size={17} color="#64748b" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => router.push("/(home)/(profile)/profile")} 
          activeOpacity={0.8} 
          className="ml-1"
        >
          <View className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden">
            <Image 
              source={{ uri: user?.avatar_url || "https://ui-avatars.com/api/?name=" + (user?.first_name || "U") + "&background=e2e8f0&color=475569&bold=true" }} 
              className="w-full h-full" 
              resizeMode="cover" 
            />
          </View>
          <View style={{ position: "absolute", bottom: -1, right: -1 }} className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-50 dark:border-slate-950" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
