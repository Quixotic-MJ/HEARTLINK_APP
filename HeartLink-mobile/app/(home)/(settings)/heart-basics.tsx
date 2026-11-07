import React from "react";
import { Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { useDs } from "../../../components/onboarding/useDs";
import { HEART_TOPICS, REVIEWED_BY } from "../../../constants/heartBasics";

// HL-100: short heart-health topics, each with its sources.
export default function HeartBasicsScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-ds-canvas" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-ds-hairline bg-ds-canvas" style={{ gap: 12 }}>
        <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink flex-1" numberOfLines={1}>
          Heart health basics
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 80, gap: 28 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>
          {REVIEWED_BY ? `${REVIEWED_BY}. ` : "Draft, waiting for expert review. "}
          General information, not medical advice.
        </Text>

        {HEART_TOPICS.map((topic) => (
          <View key={topic.id} style={{ gap: 10 }}>
            <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "600", color: c.ink }}>
              {topic.title}
            </Text>
            {topic.paragraphs.map((text) => (
              <Text key={text} style={{ fontSize: 16, lineHeight: 24, color: c.charcoal }}>
                {text}
              </Text>
            ))}
            <View style={{ gap: 2 }}>
              {topic.sources.map((source) => (
                <TouchableOpacity
                  key={source.url}
                  onPress={() => Linking.openURL(source.url)}
                  accessibilityRole="link"
                  accessibilityLabel={`Source: ${source.label}`}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 }}
                >
                  <Feather name="external-link" size={15} color={c.slate} />
                  <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: c.slate, textDecorationLine: "underline" }}>{source.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
