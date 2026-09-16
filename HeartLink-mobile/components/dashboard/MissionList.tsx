import React from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import * as Haptics from "expo-haptics";

export type MissionId = "vitals" | "meals" | "exercise" | "sleep";

export interface MissionItem {
  id: MissionId;
  title: string;
  subtitle: string;
  icon: string;
  iconType?: "feather" | "material";
  tileColors: [string, string];
  done: boolean;
}

const CARD_WIDTH = "48%";

function MissionCard({
  item,
  index,
  onPress,
}: {
  item: MissionItem;
  index: number;
  onPress: (id: MissionId) => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Animated.View
      layout={LinearTransition.springify().stiffness(400).damping(40)}
      entering={FadeInDown.delay(150 + index * 70).duration(300)}
      exiting={FadeOut.duration(160)}
      style={{ width: CARD_WIDTH }}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${item.subtitle}. ${item.done ? "Completed." : "Tap to log."}`}
        onPress={() => {
          Haptics.selectionAsync();
          onPress(item.id);
        }}
        style={{
          borderRadius: 24,
          padding: 14,
          backgroundColor: item.done 
            ? (isDark ? "rgba(16,185,129,0.05)" : "#f0fdf4")
            : (isDark ? "#0f172a" : "#ffffff"),
          borderWidth: 1.5,
          borderColor: item.done
            ? (isDark ? "rgba(16,185,129,0.3)" : "#86efac")
            : (isDark ? "#1e293b" : "#f1f5f9"),
          shadowColor: isDark ? "#000" : "#64748b",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 3,
          elevation: 1,
          height: 152, // Increased height to accommodate wrapped 2-line text
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          {/* Main Icon */}
          <View 
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: item.done 
                ? (isDark ? "rgba(16,185,129,0.15)" : "#d1fae5") 
                : (isDark ? "#1e293b" : "#f8fafc"),
              borderWidth: item.done ? 0 : 1.5,
              borderColor: isDark ? "#334155" : "#e2e8f0",
            }}
          >
            {item.iconType === "material" ? (
              <MaterialCommunityIcons 
                name={item.icon as any} 
                size={22} 
                color={item.done ? "#10b981" : item.tileColors[0]} 
              />
            ) : (
              <Feather 
                name={item.icon as any} 
                size={20} 
                color={item.done ? "#10b981" : item.tileColors[0]} 
              />
            )}
          </View>

          {/* Status Badge */}
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: item.done 
                ? (isDark ? "rgba(16,185,129,0.2)" : "#10b981") 
                : (isDark ? "#1e293b" : "#f1f5f9"),
            }}
          >
            <Feather
              name={item.done ? "check" : "plus"}
              size={14}
              color={item.done ? (isDark ? "#34d399" : "#fff") : (isDark ? "#94a3b8" : "#64748b")}
              strokeWidth={3}
            />
          </View>
        </View>

        <View style={{ marginTop: "auto" }}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.75}
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: isDark ? "#f8fafc" : "#1e293b",
            }}
          >
            {item.title}
          </Text>
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.75}
            style={{
              marginTop: 4,
              fontSize: 12,
              fontWeight: "500",
              color: isDark ? "#94a3b8" : "#64748b",
              lineHeight: 16,
            }}
          >
            {item.subtitle}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function MissionList({
  missions,
  onPress,
}: {
  missions: MissionItem[];
  onPress: (id: MissionId) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
      {missions.map((item, i) => (
        <MissionCard key={item.id} item={item} index={i} onPress={onPress} />
      ))}
    </View>
  );
}
