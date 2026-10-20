import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DARK_MODE_ENABLED } from "../../../constants/theme";
import { useDs } from "../../../components/onboarding/useDs";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";

export default function AppearanceScreen() {
  const router = useRouter();
  const { setColorScheme } = useColorScheme();
  const { c, isDark } = useDs();
  
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    AsyncStorage.getItem("theme_preference").then((pref) => {
      if (!DARK_MODE_ENABLED) {
        setSelectedTheme("light");
      } else if (pref === "light" || pref === "dark" || pref === "system") {
        setSelectedTheme(pref);
      }
    });
  }, []);

  const handleThemeChange = async (theme: "light" | "dark" | "system") => {
    if (!DARK_MODE_ENABLED && theme !== "light") return;
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
    <SafeAreaView className="flex-1 bg-ds-canvas" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-ds-hairline bg-ds-canvas" style={{ gap: 12 }}>
        <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink flex-1" numberOfLines={1}>
          Appearance & Theme
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-20" showsVerticalScrollIndicator={false}>
        <Text className="text-[15px] text-ds-slate mb-6 leading-relaxed">
          Choose how HeartLink appears on your device. The interface automatically adapts colors for comfortable reading.
        </Text>

        <View className="mb-6" style={{ gap: 8 }}>
          {themes.map((t) => {
            const isSelected = selectedTheme === t.id;
            // Dark mode is unfinished, so only Light can be picked for now (see DARK_MODE_ENABLED)
            const unavailable = !DARK_MODE_ENABLED && t.id !== "light";
            return (
              <TouchableOpacity
                key={t.id}
                disabled={unavailable}
                style={{ minHeight: 64, borderRadius: 12, borderWidth: 1.5, backgroundColor: isSelected ? c.tint : c.canvas, borderColor: isSelected ? c.line : c.hairline, opacity: unavailable ? 0.45 : 1 }}
                onPress={() => handleThemeChange(t.id as any)}
                accessible={true}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected, disabled: unavailable }}
                accessibilityLabel={`${t.title}, ${unavailable ? "coming soon" : t.description}`}
                activeOpacity={0.7}
                className="flex-row items-center px-4 py-3"
              >
                <View
                  className="w-10 h-10 rounded-lg items-center justify-center mr-3.5"
                  style={{ backgroundColor: isSelected ? c.canvas : c.surface }}
                >
                  <Feather
                    name={t.icon as any}
                    size={18}
                    color={isSelected ? c.onTint : c.charcoal}
                  />
                </View>
                <View className="flex-1 pr-2">
                  <Text style={{ fontSize: 16, fontWeight: "500", color: isSelected ? c.onTint : c.ink }}>
                    {t.title}
                  </Text>
                  <Text style={{ fontSize: 13, lineHeight: 18, marginTop: 2, color: isSelected ? c.onTint : c.slate }}>
                    {unavailable ? "Coming soon" : t.description}
                  </Text>
                </View>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center", borderColor: isSelected ? c.line : c.hairlineStrong }}>
                  {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.line }} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
