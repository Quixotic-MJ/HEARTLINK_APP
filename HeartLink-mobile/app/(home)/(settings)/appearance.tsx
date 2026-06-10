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
  
  // We maintain a local state for the UI selection, defaulting to system or the saved preference
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    // Load preference on mount
    AsyncStorage.getItem("theme_preference").then((pref) => {
      if (pref === "light" || pref === "dark" || pref === "system") {
        setSelectedTheme(pref);
      }
    });
  }, []);

  const handleThemeChange = async (theme: "light" | "dark" | "system") => {
    setSelectedTheme(theme);
    setColorScheme(theme);
    // Force RN Appearance to match if supported
    // Appearance.setColorScheme(theme === "system" ? null : theme);
    await AsyncStorage.setItem("theme_preference", theme);
  };

  const themes = [
    { id: "light", title: "Light Mode", description: "Clean and bright", icon: "sun" },
    { id: "dark", title: "Dark Mode", description: "Easy on the eyes", icon: "moon" },
    { id: "system", title: "System Default", description: "Matches your device", icon: "smartphone" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={colorScheme === "dark" ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[17px] font-medium text-slate-900 dark:text-white">Appearance</Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-16" showsVerticalScrollIndicator={false}>
        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 mb-6">
          {themes.map((t, index) => {
            const isSelected = selectedTheme === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => handleThemeChange(t.id as any)}
                className={`flex-row items-center p-3 rounded-xl ${isSelected ? 'bg-slate-50 dark:bg-slate-950' : ''}`}
              >
                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isSelected ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  <Feather 
                    name={t.icon as any} 
                    size={18} 
                    color={
                      isSelected 
                        ? (colorScheme === "dark" ? "#0f172a" : "#ffffff") 
                        : (colorScheme === "dark" ? "#94a3b8" : "#64748b")
                    } 
                  />
                </View>
                <View className="flex-1">
                  <Text className={`text-[15px] font-medium ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{t.title}</Text>
                  <Text className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{t.description}</Text>
                </View>
                {isSelected && (
                  <View className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-100 items-center justify-center">
                    <Feather name="check" size={14} color={colorScheme === "dark" ? "#0f172a" : "#ffffff"} />
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
