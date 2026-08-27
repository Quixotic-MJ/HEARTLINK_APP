import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AppearanceScreen() {
  const router = useRouter();
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    AsyncStorage.getItem("theme_preference").then((pref) => {
      if (pref === "light" || pref === "dark" || pref === "system") {
        setSelectedTheme(pref);
      }
    });
  }, []);

  const handleThemeChange = async (theme: "light" | "dark" | "system") => {
    setSelectedTheme(theme);
    setColorScheme(theme);
    await AsyncStorage.setItem("theme_preference", theme);
  };

  const themes = [
    { id: "light", title: "Light Mode", description: "Clean and bright medical aesthetic", icon: "sun" },
    { id: "dark", title: "Dark Mode", description: "Reduced eye strain in low-light environments", icon: "moon" },
    { id: "system", title: "System Default", description: "Automatically match device appearance", icon: "smartphone" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={() => router.back()}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[18px] font-semibold text-slate-900 dark:text-white tracking-tight">
          Appearance & Theme
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-20" showsVerticalScrollIndicator={false}>
        <Text className="text-[14px] text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Choose how HeartLink appears on your device. The interface automatically adapts colors for comfortable reading.
        </Text>

        <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-3 mb-6 shadow-sm shadow-slate-100 dark:shadow-none">
          {themes.map((t) => {
            const isSelected = selectedTheme === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => handleThemeChange(t.id as any)}
                accessible={true}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${t.title}, ${t.description}`}
                activeOpacity={0.7}
                className={`flex-row items-center p-3.5 rounded-2xl mb-1 ${
                  isSelected ? "bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40" : ""
                }`}
              >
                <View 
                  className={`w-10 h-10 rounded-2xl items-center justify-center mr-3.5 ${
                    isSelected ? "bg-blue-600" : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  <Feather 
                    name={t.icon as any} 
                    size={18} 
                    color={isSelected ? "#ffffff" : isDark ? "#94a3b8" : "#64748b"} 
                  />
                </View>
                <View className="flex-1 pr-2">
                  <Text 
                    className={`text-[15px] font-semibold ${
                      isSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {t.title}
                  </Text>
                  <Text className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    {t.description}
                  </Text>
                </View>
                {isSelected && (
                  <View className="w-6 h-6 rounded-full bg-blue-600 items-center justify-center">
                    <Feather name="check" size={14} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
