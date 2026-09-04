import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import "../../global.css";
import { Button } from "../../components/ui/Button";
import HeartLogo from "../../components/ui/HeartLogo";

export default function VerificationSuccessScreen() {
  const router = useRouter();
  const { user_id } = useLocalSearchParams();

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
      className="flex-1 bg-[#EDF1EF]"
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-6 pt-4 pb-2">
        <View className="flex-row items-center gap-2">
          <HeartLogo size={22} />
          <Text className="text-base text-[#152131] font-semibold tracking-tight">
            HeartLink
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Card ── */}
        <View className="bg-white rounded-2xl border border-[#DCE3DF] px-5 py-9 items-center shadow-sm">
          {/* Animated success icon */}
          <Animated.View
            style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}
            className="mb-7"
          >
            {/* Outer ring */}
            <View className="w-24 h-24 rounded-full items-center justify-center bg-[#1B6E63]/10 border border-[#1B6E63]/25">
              {/* Inner circle */}
              <View className="w-16 h-16 rounded-full items-center justify-center bg-[#1B6E63] shadow-sm">
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
            <Text className="text-2xl font-semibold text-[#152131] text-center tracking-tight mb-2" accessibilityRole="header">
              Account verified
            </Text>
            <Text className="text-sm text-[#5C6B66] text-center leading-relaxed px-2">
              Your credentials have been authenticated. You're now ready to establish your cardiovascular baseline.
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
            <View className="flex-row items-center bg-[#F8FAF9] border border-[#DCE3DF] px-4 py-3.5 rounded-xl gap-3">
              <View className="w-8 h-8 rounded-lg items-center justify-center bg-[#1B6E63]/15">
                <MaterialCommunityIcons name="shield-check" size={18} color="#1B6E63" />
              </View>
              <Text className="text-sm text-[#152131] font-medium flex-1">
                End-to-end encrypted session
              </Text>
              <Feather name="check" size={16} color="#1B6E63" />
            </View>

            <View className="flex-row items-center bg-[#F8FAF9] border border-[#DCE3DF] px-4 py-3.5 rounded-xl gap-3">
              <View className="w-8 h-8 rounded-lg items-center justify-center bg-[#E8532E]/15">
                <MaterialCommunityIcons name="database-lock" size={18} color="#E8532E" />
              </View>
              <Text className="text-sm text-[#152131] font-medium flex-1">
                Health data stored securely
              </Text>
              <Feather name="check" size={16} color="#E8532E" />
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
