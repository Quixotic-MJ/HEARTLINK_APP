import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";

/**
 * RecommendationCard — collapsed state of the ExpandableProfileCard blueprint:
 * cover visual (photo when available, tonal cover + watermark glyph otherwise),
 * dark gradient rising from the bottom, tag pill + title + subtitle pinned to
 * the lower edge. Whole card is the tap target that opens the detail modal.
 */
export function RecommendationCard({
  tag,
  title,
  subtitle,
  icon,
  bg,
  image,
  tagBg,
  tagText,
  subColor,
  index = 0,
  onPress,
}: {
  tag: string;
  title: string;
  subtitle: string;
  icon: string;
  bg?: string;
  image?: string;
  tagBg?: string;
  tagText?: string;
  subColor?: string;
  index?: number;
  onPress?: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(560 + index * 80).duration(300)}
      className="w-[245px] h-[162px]"
    >
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${tag} recommendation: ${title}. ${subtitle}. Tap to view details.`}
      className="flex-1 rounded-2xl overflow-hidden border border-border shadow-xs"
      style={{ backgroundColor: bg || "#14532d" }}
    >
      {/* Cover: photo when the backend provides one, glyph watermark otherwise */}
      {image ? (
        <Image
          source={{ uri: image }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            position: "absolute",
            bottom: -18,
            right: -18,
            opacity: 0.22,
          }}
        >
          <MaterialCommunityIcons name={icon as any} size={130} color="#ffffff" />
        </View>
      )}

      {/* Bottom scrim (blueprint from-black/80 via-black/20 gradient) */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.25)", "rgba(0,0,0,0.82)"]}
        locations={[0, 0.45, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Pinned title block */}
      <View className="flex-1 justify-end p-3.5">
        <View
          className="self-start px-2 py-0.5 rounded-md mb-1.5"
          style={{ backgroundColor: tagBg || "rgba(255,255,255,0.14)" }}
        >
          <Text
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: tagText || "rgba(255,255,255,0.85)" }}
            numberOfLines={1}
          >
            {tag}
          </Text>
        </View>
        <Text
          className="text-[14px] font-bold text-white leading-snug"
          numberOfLines={2}
        >
          {title}
        </Text>
        <View className="flex-row items-center justify-between mt-1">
          <Text
            className="text-[11px] font-semibold flex-1 mr-2"
            style={{ color: subColor || "rgba(255,255,255,0.75)" }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
          <View className="w-6 h-6 rounded-full bg-white/20 border border-white/30 items-center justify-center">
            <Feather name="arrow-up-right" size={12} color="#fff" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
}
