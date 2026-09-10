import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import * as Haptics from "expo-haptics";

/**
 * MissionList — pure React Native port of the PinItemComponent web blueprint
 * for the 4 heart missions.
 *
 * Blueprint mechanics preserved:
 * - Done missions rise into a top "Done" group; the rest stay under "To Log".
 * - Single flat list so rows glide to their new slot with a layout spring
 *   (this template ships stiffness 400, damping 40).
 * - Pin button swapped for a check button: filled emerald when done,
 *   muted outline when pending. Tapping a row opens its log modal
 *   (exercise navigates to its own screen instead).
 *
 * div -> View, text -> Text (+numberOfLines), onClick -> TouchableOpacity.
 * Icons from @expo/vector-icons (app standard) instead of lucide-react-native.
 */

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

function SectionLabel({ text }: { text: string }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <Animated.View
      layout={LinearTransition.springify().stiffness(400).damping(40)}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
    >
      <Text
        style={{
          marginLeft: 4,
          fontSize: 12,
          fontWeight: "600",
          letterSpacing: 1.2,
          color: isDark ? "#64748b" : "#ADACB8",
        }}
      >
        {text.toUpperCase()}
      </Text>
    </Animated.View>
  );
}

function MissionRow({
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
      entering={FadeInDown.delay(250 + index * 70).duration(300)}
      exiting={FadeOut.duration(160)}
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
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          borderRadius: 16,
          borderWidth: 1,
          padding: 10,
          backgroundColor: item.done
            ? isDark
              ? "rgba(27,110,99,0.14)"
              : "#EFF7F4"
            : isDark
            ? "rgba(30,41,59,0.6)"
            : "#FFFFFF",
          borderColor: item.done
            ? "rgba(27,110,99,0.35)"
            : isDark
            ? "#1e293b"
            : "#E2E8E5",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
          <LinearGradient
            colors={item.done ? ["#1B6E63", "#4FA79A"] : item.tileColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {item.iconType === "material" ? (
              <MaterialCommunityIcons name={item.icon as any} size={19} color="#fff" />
            ) : (
              <Feather name={item.icon as any} size={18} color="#fff" />
            )}
          </LinearGradient>

          <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: isDark ? "#f8fafc" : "#27272B",
              }}
            >
              {item.title}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                marginTop: 2,
                fontSize: 12,
                fontWeight: "500",
                color: isDark ? "#94A3B8" : "#87868D",
              }}
            >
              {item.subtitle}
            </Text>
          </View>
        </View>

        {/* Check button (blueprint pin swapped for check) */}
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: item.done ? "#1B6E63" : "transparent",
            borderWidth: item.done ? 0 : 1.5,
            borderColor: isDark ? "#334155" : "#CDCCD5",
          }}
        >
          <Feather
            name="check"
            size={16}
            color={item.done ? "#fff" : isDark ? "#475569" : "#A9A9AB"}
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
  const done = missions.filter((m) => m.done);
  const pending = missions.filter((m) => !m.done);

  return (
    <View style={{ gap: 10 }}>
      {done.length > 0 && <SectionLabel text={`Done • ${done.length}`} />}
      {done.map((item, i) => (
        <MissionRow key={item.id} item={item} index={i} onPress={onPress} />
      ))}
      {pending.length > 0 && <SectionLabel text="To Log" />}
      {pending.map((item, i) => (
        <MissionRow key={item.id} item={item} index={done.length + i} onPress={onPress} />
      ))}
    </View>
  );
}
