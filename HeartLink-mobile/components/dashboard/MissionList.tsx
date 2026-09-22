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
    case "vitals": return "#38BDF8"; // Blue
    case "meals": return "#FB923C"; // Orange
    case "exercise": return "#FB7185"; // Pink
    case "sleep": return "#818CF8"; // Purple
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
        className="flex-row items-center bg-surface-card rounded-3xl p-5 shadow-sm shadow-slate-200/50 dark:shadow-none"
      >
        {/* Left Icon */}
        <View className="w-10 h-10 rounded-full items-center justify-center bg-slate-200/50 dark:bg-slate-700/50 mr-4">
          {item.iconType === "material" ? (
            <MaterialCommunityIcons
              name={item.icon as any}
              size={22}
              color={isDark ? "#94a3b8" : "#64748b"}
            />
          ) : (
            <Feather
              name={item.icon as any}
              size={20}
              color={isDark ? "#94a3b8" : "#64748b"}
            />
          )}
        </View>

        {/* Middle Content */}
        <View className="flex-1 justify-center">
          <Text
            className="text-[16px] font-bold text-slate-900 dark:text-slate-50 mb-1"
          >
            {item.title}
          </Text>
          <Text
            className="text-[13px] font-medium text-slate-500 dark:text-slate-400"
          >
            {item.subtitle}
          </Text>
        </View>

        {/* Right Button */}
        <View
          style={{ backgroundColor: item.done ? "#10B981" : themeColor }}
          className="w-8 h-8 rounded-full items-center justify-center ml-3"
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
