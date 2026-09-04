import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";

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
  bg?: string;
  tagBg?: string;
  tagText?: string;
  subColor?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${tag} recommendation: ${title}. ${subtitle}. Tap to view details.`}
      className="w-[230px] h-[154px] rounded-2xl overflow-hidden bg-white dark:bg-[#1A2634] border border-[#DCE3DF] dark:border-slate-800 shadow-xs"
    >
      <View
        style={{
          position: "absolute",
          bottom: -15,
          right: -15,
          opacity: 0.04,
        }}
      >
        <MaterialCommunityIcons name={icon as any} size={115} color="#152131" />
      </View>
      <View className="p-4 flex-1 justify-between">
        <View
          className="self-start px-2.5 py-1 rounded-lg"
          style={{ backgroundColor: tagBg || "rgba(232, 83, 46, 0.1)" }}
        >
          <Text 
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: tagText || "#E8532E" }}
          >
            {tag}
          </Text>
        </View>
        <View>
          <Text
            className="text-[14px] font-bold text-[#152131] dark:text-white leading-snug mb-1"
            numberOfLines={2}
          >
            {title}
          </Text>
          <View className="flex-row items-center justify-between mt-1">
            <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400 flex-1 pr-1 font-medium" numberOfLines={1}>
              {subtitle}
            </Text>
            <View className="flex-row items-center gap-0.5">
              <Text className="text-[11px] font-bold text-[#E8532E]">Explore</Text>
              <Feather name="chevron-right" size={12} color="#E8532E" />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
