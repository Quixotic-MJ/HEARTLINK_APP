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
      className="w-[245px] h-[162px] rounded-2xl overflow-hidden bg-card border border-border shadow-xs"
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
      <View className="p-3.5 flex-1 justify-between">
        <View
          className="self-start px-2 py-0.5 rounded-md"
          style={{ backgroundColor: tagBg || "rgba(232, 83, 46, 0.1)" }}
        >
          <Text
            className="text-[9.5px] font-bold uppercase tracking-wider"
            style={{ color: tagText || "#E8532E" }}
          >
            {tag}
          </Text>
        </View>
        <View className="my-0.5">
          <Text
            className="text-[13.5px] font-bold text-foreground leading-snug"
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>
        <View className="flex-row items-center justify-between pt-1 border-t border-border/40">
          <View className="px-2 py-0.5 rounded-md bg-muted/15 max-w-[135px]">
            <Text className="text-[10.5px] text-muted-foreground font-semibold" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          <View className="flex-row items-center gap-0.5">
            <Text className="text-[11px] font-bold text-[#E8532E]">Explore</Text>
            <Feather name="chevron-right" size={12} color="#E8532E" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}