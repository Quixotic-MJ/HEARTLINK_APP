import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDs } from "../components/onboarding/useDs";
import { SquareIconButton } from "../components/exercise/ExerciseBits";
import { LEGAL_STATUS, legalDoc } from "../constants/legal";

// The Terms of Service (?doc=terms) and Privacy Policy (?doc=privacy), inside the app so they open without a website
// (2026-11-18). Reachable signed in or out: sign-up links here, and so does Settings › About HeartLink.
export default function LegalScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const page = legalDoc(doc);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(auth)/login"));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-ds-hairline" style={{ gap: 12 }}>
        <SquareIconButton icon="arrow-left" label="Go back" onPress={goBack} />
        <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink flex-1" numberOfLines={1}>
          {page.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48, gap: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, color: c.slate }}>
            {`Last updated ${page.updated} · ${LEGAL_STATUS}`}
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 24, color: c.charcoal }}>{page.intro}</Text>
        </View>

        {page.sections.map((section) => (
          <View key={section.heading} style={{ gap: 8 }}>
            <Text accessibilityRole="header" style={{ fontSize: 17, lineHeight: 24, fontWeight: "600", color: c.ink }}>
              {section.heading}
            </Text>
            {(section.paragraphs ?? []).map((p) => (
              <Text key={p} style={{ fontSize: 15, lineHeight: 23, color: c.charcoal }}>
                {p}
              </Text>
            ))}
            {(section.bullets ?? []).map((b) => (
              <View key={b} className="flex-row" style={{ gap: 8 }}>
                <Text style={{ fontSize: 15, lineHeight: 23, color: c.slate }}>•</Text>
                <Text style={{ flex: 1, fontSize: 15, lineHeight: 23, color: c.charcoal }}>{b}</Text>
              </View>
            ))}
            {(section.after ?? []).map((p) => (
              <Text key={p} style={{ fontSize: 15, lineHeight: 23, color: c.charcoal }}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
