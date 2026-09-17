import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
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

function getThemeColor(id: MissionId) {
  switch (id) {
    case "vitals": return "#3B82F6"; // Blue
    case "meals": return "#F59E0B"; // Orange
    case "exercise": return "#8B5CF6"; // Purple
    case "sleep": return "#EC4899"; // Pink
    default: return "#10B981";
  }
}

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
  const themeColor = getThemeColor(item.id);

  return (
    <Animated.View
      layout={LinearTransition.springify().stiffness(400).damping(40)}
      entering={FadeInDown.delay(150 + index * 70).duration(300)}
      exiting={FadeOut.duration(160)}
      style={{ width: "100%", marginBottom: 12 }}
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
          borderRadius: 20,
          padding: 16,
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: isDark ? "#1e293b" : "#f1f5f9",
          shadowColor: isDark ? "#000" : "#64748b",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {/* Left Icon */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
            marginRight: 16,
          }}
        >
          {item.iconType === "material" ? (
            <MaterialCommunityIcons
              name={item.icon as any}
              size={22}
              color={isDark ? "#94a3b8" : "#475569"}
            />
          ) : (
            <Feather
              name={item.icon as any}
              size={20}
              color={isDark ? "#94a3b8" : "#475569"}
            />
          )}
        </View>

        {/* Middle Content */}
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: isDark ? "#f8fafc" : "#1e293b",
              marginBottom: 4,
            }}
          >
            {item.title}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 13,
              fontWeight: "400",
              color: isDark ? "#94a3b8" : "#64748b",
            }}
          >
            {item.subtitle}
          </Text>
        </View>

        {/* Right Button */}
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: item.done ? "#10B981" : themeColor,
            marginLeft: 12,
          }}
        >
          <Feather
            name={item.done ? "check" : "plus"}
            size={16}
            color="#ffffff"
            strokeWidth={3}
          />
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
    <View style={{ flexDirection: "column", width: "100%" }}>
      {missions.map((item, i) => (
        <MissionCard key={item.id} item={item} index={i} onPress={onPress} />
      ))}
    </View>
  );
}
