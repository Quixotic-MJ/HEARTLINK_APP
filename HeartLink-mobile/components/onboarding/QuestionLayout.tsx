import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useDs } from "./useDs";
import { DsColors } from "../../constants/theme";

/**
 * Content eases up into place, one block after another (60 ms apart). Reanimated skips
 * this automatically when the phone's "reduce motion" setting is on.
 */
export const enter = (step: number) =>
  FadeInDown.duration(320).delay(60 + step * 60).withInitialValues({ transform: [{ translateY: 10 }] });

export type BadgeTint = "sky" | "mint" | "lavender" | "peach" | "rose" | "yellow";
export type McIcon = keyof typeof MaterialCommunityIcons.glyphMap;

export function tintColor(c: DsColors, tint: BadgeTint): string {
  return c[tint];
}

/** Square pastel badge with a dark icon, as used at the top of each question. */
export function IconBadge({ icon, tint, size = 44 }: { icon: McIcon; tint: BadgeTint; size?: number }) {
  const { c } = useDs();
  return (
    <View
      style={{ width: size, height: size, borderRadius: 8, backgroundColor: tintColor(c, tint), alignItems: "center", justifyContent: "center" }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <MaterialCommunityIcons name={icon} size={Math.round(size / 2)} color={c.charcoal} />
    </View>
  );
}

/** Small rectangular tag (6px corners). */
export function Tag({
  label,
  tone = "tint",
  align = "start",
}: {
  label: string;
  tone?: "tint" | "neutral" | "warm";
  /** "center" when the tag sits in a row next to other content. */
  align?: "start" | "center";
}) {
  const { c } = useDs();
  const bg = tone === "tint" ? c.tint : tone === "warm" ? c.yellow : c.surfaceAlt;
  const fg = tone === "tint" ? c.onTint : tone === "warm" ? c.warmText : c.slate;
  return (
    <View style={{ alignSelf: align === "center" ? "center" : "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: bg }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: fg }}>{label}</Text>
    </View>
  );
}

/** Grey info box. With a title it reads as "Why we ask". */
export function InfoNote({ title, text, icon = "info" }: { title?: string; text: string; icon?: keyof typeof Feather.glyphMap }) {
  const { c } = useDs();
  return (
    <View className="flex-row" style={{ gap: 10, padding: 14, borderRadius: 12, backgroundColor: c.surface }}>
      <Feather name={icon} size={16} color={c.charcoal} style={{ marginTop: 2 }} />
      <View className="flex-1">
        {title ? <Text style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>{title}</Text> : null}
        <Text style={{ fontSize: title ? 14 : 13, lineHeight: 20, color: c.slate, marginTop: title ? 3 : 0 }}>{text}</Text>
      </View>
    </View>
  );
}

interface ScreenProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Centre the body vertically (for short screens like Verified or Day one). */
  centered?: boolean;
}

/** Full design-system screen: white canvas, scrolling body, fixed footer. */
export function DsScreen({ header, footer, children, centered = false }: ScreenProps) {
  const { c, isDark } = useDs();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top", "bottom"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 16, justifyContent: centered ? "center" : "flex-start" }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer ? <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, gap: 6 }}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface QuestionLayoutProps {
  header: React.ReactNode;
  footer: React.ReactNode;
  icon?: McIcon;
  tint?: BadgeTint;
  tag?: string;
  title: string;
  subtitle?: string;
  why?: string;
  note?: string;
  children: React.ReactNode;
}

/** One set-up question: badge or tag, title, subtitle, answer controls, then a note. */
export default function QuestionLayout({ header, footer, icon, tint = "sky", tag, title, subtitle, why, note, children }: QuestionLayoutProps) {
  const { c } = useDs();
  return (
    <DsScreen header={header} footer={footer}>
      <Animated.View entering={enter(0)} style={{ marginBottom: 18 }}>
        {tag ? <Tag label={tag} tone="neutral" /> : icon ? <IconBadge icon={icon} tint={tint} /> : null}
      </Animated.View>
      <Animated.View entering={enter(1)}>
        <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: "600", letterSpacing: -0.5, color: c.ink }}>
          {title}
        </Text>
        {subtitle ? <Text style={{ fontSize: 15, lineHeight: 23, color: c.slate, marginTop: 8 }}>{subtitle}</Text> : null}
      </Animated.View>
      <Animated.View entering={enter(2)} style={{ marginTop: 22 }}>
        {children}
      </Animated.View>
      <Animated.View entering={enter(3)}>
        {note ? <Text style={{ fontSize: 13, lineHeight: 18, color: c.steel, marginTop: 14 }}>{note}</Text> : null}
        {why ? (
          <View style={{ marginTop: 16 }}>
            <InfoNote title="Why we ask" text={why} icon="help-circle" />
          </View>
        ) : null}
      </Animated.View>
    </DsScreen>
  );
}
