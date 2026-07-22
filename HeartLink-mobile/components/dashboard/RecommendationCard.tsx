import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export function RecommendationCard({
  tag,
  title,
  subtitle,
  icon,
  bg,
  tagBg,
  tagText,
  subColor,
  onPress,
}: {
  tag: string;
  title: string;
  subtitle: string;
  icon: string;
  bg: string;
  tagBg: string;
  tagText: string;
  subColor: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${tag} recommendation: ${title}. ${subtitle}`}
      className="w-[220px] h-[150px] rounded-2xl overflow-hidden"
      style={{ backgroundColor: bg }}
    >
      <View
        style={{
          position: "absolute",
          bottom: -10,
          right: -10,
          opacity: 0.07,
        }}
      >
        <MaterialCommunityIcons name={icon as any} size={110} color="#fff" />
      </View>
      <View className="p-4 flex-1 justify-between">
        <View
          className="self-start px-2.5 py-1 rounded-lg"
          style={{ backgroundColor: tagBg }}
        >
          <Text
            className="text-[10px] font-medium uppercase tracking-wide"
            style={{ color: tagText }}
          >
            {tag}
          </Text>
        </View>
        <View>
          <Text
            className="text-[15px] font-medium text-white leading-snug mb-1"
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text className="text-[11px]" style={{ color: subColor }}>
            {subtitle}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
