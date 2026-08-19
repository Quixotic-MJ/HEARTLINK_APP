import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import "../../global.css";
import { Button } from "../../components/ui/Button";

export default function VerificationSuccessScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const base_url = process.env.EXPO_PUBLIC_API_URL;
  const { phone, user_id } = useLocalSearchParams();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleStartBaseline = () => {
    router.replace({
      pathname: "/(baseline)/step1_basic_info",
      params: { user_id: user_id as string },
    });
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top"]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="flex-row items-center px-6 pt-4 pb-2">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-full items-center justify-center border border-border bg-card shadow-sm">
            <Feather name="heart" size={14} color={isDark ? "#f8fafc" : "#0f172a"} />
          </View>
          <Text
            className="text-[15px] text-foreground tracking-tight"
            style={{ fontWeight: "300" }}
          >
            Heart<Text style={{ fontWeight: "600" }}>Link.</Text>
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Card ── */}
        <View className="bg-card rounded-2xl border border-border px-5 py-9 items-center shadow-md">
          {/* Animated success icon */}
          <Animated.View
            style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}
            className="mb-7"
          >
            {/* Outer ring */}
            <View className="w-24 h-24 rounded-full items-center justify-center bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
              {/* Inner circle */}
              <View className="w-16 h-16 rounded-full items-center justify-center bg-emerald-600 shadow-sm">
                <Feather
                  name="check"
                  size={32}
                  color="#ffffff"
                  strokeWidth={3}
                />
              </View>
            </View>
          </Animated.View>

          {/* Text — slides up after icon */}
          <Animated.View
            style={{
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim }],
            }}
            className="items-center mb-7"
          >
            <Text className="text-2xl font-bold text-foreground text-center tracking-tight mb-2" accessibilityRole="header">
              Account verified
            </Text>
            <Text className="text-sm text-muted-foreground text-center leading-relaxed px-2">
              Your credentials have been authenticated. You're now ready to
              establish your cardiovascular baseline.
            </Text>
          </Animated.View>

          {/* Trust badges */}
          <Animated.View
            style={{
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim }],
            }}
            className="w-full gap-3 mb-8"
          >
            <View className="flex-row items-center bg-background border border-border px-4 py-3.5 rounded-xl gap-3">
              <View className="w-8 h-8 rounded-lg items-center justify-center bg-emerald-500/10">
                <MaterialCommunityIcons name="shield-check" size={18} color="#10b981" />
              </View>
              <Text className="text-sm text-foreground font-medium flex-1">
                End-to-end encrypted session
              </Text>
              <Feather name="check" size={16} color="#10b981" />
            </View>

            <View className="flex-row items-center bg-background border border-border px-4 py-3.5 rounded-xl gap-3">
              <View className="w-8 h-8 rounded-lg items-center justify-center bg-primary/10">
                <MaterialCommunityIcons name="database-lock" size={18} color={isDark ? "#3b82f6" : "#2563eb"} />
              </View>
              <Text className="text-sm text-foreground font-medium flex-1">
                Health data stored securely
              </Text>
              <Feather name="check" size={16} color={isDark ? "#3b82f6" : "#2563eb"} />
            </View>
          </Animated.View>

          {/* CTA */}
          <Button
            onPress={handleStartBaseline}
            label="Set up profile"
            icon="user-plus"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
