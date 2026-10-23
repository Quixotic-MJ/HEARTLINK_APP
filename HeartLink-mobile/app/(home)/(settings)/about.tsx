import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Linking, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useDs } from "../../../components/onboarding/useDs";
import HeartLogo from "../../../components/ui/HeartLogo";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";

export default function AboutScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();

  // Gentle Pulse Animation
  const [scaleAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.06,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim]);

  const openURL = (path: string) => {
    Linking.openURL(`https://heartlink.com/${path}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-ds-canvas" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-ds-hairline bg-ds-canvas" style={{ gap: 12 }}>
        <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink flex-1" numberOfLines={1}>
          About HeartLink
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-20" showsVerticalScrollIndicator={false}>
        
        {/* App Hero */}
        <View className="items-center mb-7 pt-2">
          <Animated.View 
            style={{ transform: [{ scale: scaleAnim }] }}
            className="w-22 h-22 rounded-xl bg-ds-canvas items-center justify-center border border-ds-hairline mb-3.5"
          >
            <HeartLogo size={44} />
          </Animated.View>
          <Text className="text-[26px] font-semibold text-ds-ink tracking-tight">
            Heart<Text className="text-ds-primary font-light">Link</Text>
          </Text>
          <Text className="text-[14px] text-ds-slate mt-0.5">
            Cardiovascular Health Companion
          </Text>
        </View>

        {/* Build & Release Info Card */}
        <View className="bg-ds-canvas rounded-xl border border-ds-hairline p-5 mb-4">
          <Text className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider mb-3">
            Application Information
          </Text>

          <View className="flex-row justify-between py-2 border-b border-ds-hairline-soft">
            <Text className="text-[14px] text-ds-slate">Version</Text>
            <Text className="text-[14px] font-semibold text-ds-ink">1.0.0</Text>
          </View>

          <View className="flex-row justify-between py-2 border-b border-ds-hairline-soft">
            <Text className="text-[14px] text-ds-slate">Release Build</Text>
            <Text className="text-[14px] font-semibold text-ds-ink">2026.1</Text>
          </View>

          <View className="flex-row justify-between py-2">
            <Text className="text-[14px] text-ds-slate">Environment</Text>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full bg-ds-success" />
              <Text className="text-[14px] font-semibold text-ds-ink">Production API</Text>
            </View>
          </View>
        </View>

        {/* Privacy & Data Transparency Card */}
        <View className="bg-ds-canvas rounded-xl border border-ds-hairline p-5 mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="w-8 h-8 rounded-lg bg-ds-sky items-center justify-center">
              <MaterialCommunityIcons name="shield-check" size={16} color={c.charcoal} />
            </View>
            <Text className="text-[14px] font-semibold text-ds-ink">
              Privacy & Data Transparency
            </Text>
          </View>

          <View className="gap-2">
            <Text className="text-[13px] text-ds-slate leading-relaxed">
              • <Text className="font-semibold text-ds-ink">Patient Ownership:</Text> Your health logs, blood pressure records, and dietary entries belong solely to your account.
            </Text>
            <Text className="text-[13px] text-ds-slate leading-relaxed">
              • <Text className="font-semibold text-ds-ink">On-Device Export:</Text> Exported clinical summary reports are generated on your device and shared only with your explicit action.
            </Text>
            <Text className="text-[13px] text-ds-slate leading-relaxed">
              • <Text className="font-semibold text-ds-ink">Private Contacts:</Text> Care team and emergency contacts are stored securely and never shared with third parties.
            </Text>
          </View>
        </View>

        {/* Legal Links */}
        <View className="bg-ds-canvas rounded-xl border border-ds-hairline px-4 mb-6">
          <TouchableOpacity 
            onPress={() => openURL("terms")}
            accessible={true}
            accessibilityRole="link"
            accessibilityLabel="Terms of Service, opens in browser"
            className="flex-row items-center justify-between py-4 border-b border-ds-hairline-soft"
          >
            <Text className="text-[15px] font-medium text-ds-ink">Terms of Service</Text>
            <Feather name="external-link" size={16} color={c.slate} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => openURL("privacy")}
            accessible={true}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy, opens in browser"
            className="flex-row items-center justify-between py-4 border-b border-ds-hairline-soft"
          >
            <Text className="text-[15px] font-medium text-ds-ink">Privacy Policy</Text>
            <Feather name="external-link" size={16} color={c.slate} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => openURL("licenses")}
            accessible={true}
            accessibilityRole="link"
            accessibilityLabel="Open Source Licenses, opens in browser"
            className="flex-row items-center justify-between py-4"
          >
            <Text className="text-[15px] font-medium text-ds-ink">Open Source Licenses</Text>
            <Feather name="external-link" size={16} color={c.slate} />
          </TouchableOpacity>
        </View>

        <Text className="text-[13px] text-ds-steel text-center px-4 leading-relaxed">
          HeartLink empowers patients to actively track vitals, monitor symptoms, and collaborate with their clinical care team.
        </Text>
        <Text className="text-[12px] text-ds-steel text-center mt-4 mb-8">
          © 2026 HeartLink Inc. All rights reserved.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}
