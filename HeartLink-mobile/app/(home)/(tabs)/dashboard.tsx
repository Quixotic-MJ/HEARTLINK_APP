import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";

// ─── Animated SVG Circle ────────────────────────────────────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Score Theme Helper ─────────────────────────────────────────────────────
function getScoreTheme(score: number) {
  if (score >= 80) {
    return {
      label: "Stable",
      color: "#059669",
      bgColor: "#ecfdf5",
      borderColor: "#d1fae5",
      ringColor: "#059669",
      ringTrackColor: "#d1fae5",
      dotColor: "#10b981",
      badgeClass: "bg-emerald-50 border-emerald-100",
      dotClass: "bg-emerald-500",
      labelClass: "text-emerald-700",
    };
  }
  if (score >= 60) {
    return {
      label: "Moderate",
      color: "#d97706",
      bgColor: "#fffbeb",
      borderColor: "#fef3c7",
      ringColor: "#d97706",
      ringTrackColor: "#fef3c7",
      dotColor: "#f59e0b",
      badgeClass: "bg-amber-50 border-amber-100",
      dotClass: "bg-amber-500",
      labelClass: "text-amber-700",
    };
  }
  if (score >= 40) {
    return {
      label: "Caution",
      color: "#ea580c",
      bgColor: "#fff7ed",
      borderColor: "#ffedd5",
      ringColor: "#ea580c",
      ringTrackColor: "#ffedd5",
      dotColor: "#f97316",
      badgeClass: "bg-orange-50 border-orange-200",
      dotClass: "bg-orange-500",
      labelClass: "text-orange-700",
    };
  }
  return {
    label: "At Risk",
    color: "#dc2626",
    bgColor: "#fef2f2",
    borderColor: "#fecaca",
    ringColor: "#dc2626",
    ringTrackColor: "#fecaca",
    dotColor: "#ef4444",
    badgeClass: "bg-red-50 border-red-200",
    dotClass: "bg-red-500",
    labelClass: "text-red-700",
  };
}

// ─── Circular Progress (SVG — requires inline style for computed values) ────
function CircularProgress({
  score,
  size = 200,
  strokeWidth = 12,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const theme = getScoreTheme(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: score,
      duration: 1400,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: "clamp",
  });

  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Svg
        width={size}
        height={size}
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.ringTrackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.ringColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>

      {/* Center text */}
      <View className="absolute items-center">
        <Text className="text-[52px] font-black text-slate-900 tracking-tighter leading-[58px]">
          {score}
        </Text>
        <Text className="text-[12px] font-semibold text-slate-400 mt-0.5 uppercase tracking-widest">
          out of 100
        </Text>
      </View>
    </View>
  );
}

// ─── Mini Stat Pill ─────────────────────────────────────────────────────────
function StatPill({
  icon,
  label,
  value,
  iconColor,
}: {
  icon: string;
  label: string;
  value: string;
  iconColor: string;
}) {
  return (
    <View className="flex-1 bg-slate-50 rounded-2xl py-3.5 px-3 items-center border border-slate-100">
      <Feather name={icon as any} size={18} color={iconColor} />
      <Text className="text-[12px] font-extrabold text-slate-900 mt-1.5 tracking-tight">
        {value}
      </Text>
      <Text className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wide">
        {label}
      </Text>
    </View>
  );
}

// ─── Quick Action Button ────────────────────────────────────────────────────
function QuickAction({
  icon,
  iconType,
  label,
  bgClass,
  borderClass,
  color,
  textClass,
}: {
  icon: string;
  iconType: "feather" | "material";
  label: string;
  bgClass: string;
  borderClass: string;
  color: string;
  textClass: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className={`w-[100px] h-[120px] rounded-[22px] items-center justify-center border ${bgClass} ${borderClass}`}
    >
      <View className="w-12 h-12 rounded-2xl bg-white items-center justify-center mb-2.5 shadow-sm">
        {iconType === "material" ? (
          <MaterialCommunityIcons name={icon as any} size={22} color={color} />
        ) : (
          <Feather name={icon as any} size={20} color={color} />
        )}
      </View>
      <Text className={`text-[10px] font-extrabold ${textClass}`}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Dashboard Screen ───────────────────────────────────────────────────────
export default function DashboardScreen() {
  const [isAlertActive, setIsAlertActive] = useState(false);
  const router = useRouter();
  const cssScore = 75;
  const theme = getScoreTheme(cssScore);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Emergency Escalation Banner */}
      {isAlertActive && (
        <TouchableOpacity
          activeOpacity={0.9}
          className="bg-red-500 px-6 py-4 flex-row items-center shadow-md z-20"
        >
          <Feather name="alert-triangle" size={20} color="white" />
          <Text className="text-white font-bold text-[13px] ml-3 flex-1 leading-snug tracking-wide">
            Elevated Risk Detected. Tap to view nearby cardiovascular
            specialists in Cebu City.
          </Text>
          <Feather name="chevron-right" size={20} color="white" />
        </TouchableOpacity>
      )}

      {/* Top App Bar */}
      <View className="flex-row justify-between items-center px-6 pt-4 pb-2 bg-[#F8FAFC] z-10">
        {/* App Logo */}
        <View className="flex-row items-center">
          <View className="w-9 h-9 bg-[#1e4ed8] rounded-xl items-center justify-center shadow-sm shadow-blue-900/20">
            <MaterialCommunityIcons name="heart-pulse" size={20} color="white" />
          </View>
          <Text className="ml-3 font-bold text-[16px] text-slate-900 tracking-tight">
            HeartLink
          </Text>
        </View>

        {/* Action Icons */}
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => router.push("/(home)/notifications")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="w-10 h-10 rounded-[14px] bg-slate-100 items-center justify-center relative"
          >
            <Feather name="bell" size={19} color="#475569" />
            <View className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-[2px] border-slate-100" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(home)/settings")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="w-10 h-10 rounded-[14px] bg-slate-100 items-center justify-center"
          >
            <Feather name="settings" size={19} color="#475569" />
          </TouchableOpacity>

          {/* Profile Avatar */}
          <TouchableOpacity
            onPress={() => router.push("/(home)/profile")}
            activeOpacity={0.8}
            className="relative ml-1"
          >
            <View className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
              <Image
                source={{ uri: "https://i.pravatar.cc/150?u=johnmark" }}
                className="w-full h-full rounded-full"
                resizeMode="cover"
              />
            </View>
            <View className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-[2px] border-[#F8FAFC]" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Greeting */}
        <View className="px-6 pt-5 pb-4">
          <Text className="text-[26px] font-black text-slate-900 tracking-tight leading-[32px]">
            Welcome back,{"\n"}John Mark
          </Text>
          <Text className="text-[14px] font-medium text-slate-400 mt-2">
            Thursday, 4th June
          </Text>
        </View>

        {/* Hero: Stability Score Card */}
        <View className="mx-5 mt-1 bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm shadow-slate-900/5">
          {/* Header Row */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-[18px] font-black text-slate-900 tracking-tight">
              Stability Score
            </Text>
            {/* Dynamic badge — uses inline style for theme-driven colors */}
            <View
              className={`px-3 py-1.5 rounded-full border flex-row items-center ${theme.badgeClass}`}
            >
              <View
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${theme.dotClass}`}
              />
              <Text
                className={`text-[10px] font-extrabold uppercase tracking-widest ${theme.labelClass}`}
              >
                {theme.label}
              </Text>
            </View>
          </View>

          {/* Ring */}
          <View className="items-center py-2">
            <CircularProgress score={cssScore} size={200} strokeWidth={12} />
          </View>

          {/* Mini Stats Row */}
          <View className="flex-row gap-2.5 mt-6">
            <StatPill icon="heart" label="BPM" value="72" iconColor="#ef4444" />
            <StatPill
              icon="droplet"
              label="BP"
              value="120/80"
              iconColor="#3b82f6"
            />
            <StatPill
              icon="trending-up"
              label="Trend"
              value="+5"
              iconColor="#059669"
            />
          </View>

          {/* Updated timestamp */}
          <View className="flex-row items-center justify-center mt-5">
            <Feather name="clock" size={11} color="#cbd5e1" />
            <Text className="text-[11px] font-medium text-slate-300 ml-1.5">
              Updated 7 mins ago
            </Text>
          </View>
        </View>

        {/* Smart Insights */}
        <View className="mx-5 mt-5 bg-white rounded-[22px] border border-slate-100 p-[18px] flex-row items-start shadow-sm shadow-slate-900/5">
          <View className="w-[42px] h-[42px] rounded-[14px] bg-blue-50 items-center justify-center mr-3.5 border border-blue-100/50">
            <Feather name="zap" size={20} color="#1e4ed8" />
          </View>
          <Text className="flex-1 text-[13.5px] font-medium text-slate-500 leading-relaxed">
            <Text className="font-extrabold text-slate-900">
              Your stability score improved by 5 points this week.
            </Text>{" "}
            Consistent medication tracking and low-sodium meals logged.
          </Text>
        </View>

        {/* Quick Record Row */}
        <View className="mt-7">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            <QuickAction
              icon="barcode-scan"
              iconType="material"
              label="Scan Meal"
              bgClass="bg-emerald-50"
              borderClass="border-emerald-100/50"
              color="#059669"
              textClass="text-emerald-800"
            />
            <QuickAction
              icon="heart-pulse"
              iconType="material"
              label="Log Vitals"
              bgClass="bg-rose-50"
              borderClass="border-rose-100/50"
              color="#e11d48"
              textClass="text-rose-800"
            />
            <QuickAction
              icon="clipboard"
              iconType="feather"
              label="Symptoms"
              bgClass="bg-amber-50"
              borderClass="border-amber-100/50"
              color="#d97706"
              textClass="text-amber-800"
            />
          </ScrollView>
        </View>

        {/* Recommendations */}
        <View className="mt-8 mb-3">
          <View className="px-6 flex-row items-center justify-between mb-5">
            <Text className="text-[18px] font-extrabold text-slate-900 tracking-tight">
              Recommendations
            </Text>
            <TouchableOpacity>
              <Text className="text-[13px] font-semibold text-[#1e4ed8]">
                See all
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
          >
            {/* Exercise Card */}
            <TouchableOpacity
              activeOpacity={0.9}
              className="w-[280px] h-[200px] bg-slate-900 rounded-[26px] overflow-hidden relative shadow-lg shadow-slate-900/20"
            >
              <View className="absolute -bottom-5 -right-5 opacity-[0.06]">
                <MaterialCommunityIcons name="yoga" size={180} color="white" />
              </View>

              <View className="p-[22px] flex-1 justify-between">
                <View className="flex-row items-center justify-between">
                  <View className="bg-white/10 px-3 py-1.5 rounded-full">
                    <Text className="text-[10px] font-black text-white uppercase tracking-widest">
                      Exercise
                    </Text>
                  </View>
                  <View className="w-10 h-10 bg-white rounded-[14px] items-center justify-center">
                    <Feather name="play" size={16} color="#0f172a" />
                  </View>
                </View>

                <View>
                  <Text className="text-[20px] font-black text-white tracking-tight mb-1">
                    15-Minute Chair Yoga
                  </Text>
                  <Text className="text-[13px] font-medium text-slate-400">
                    Safe mobility to elevate heart rate.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Meal Card */}
            <TouchableOpacity
              activeOpacity={0.9}
              className="w-[280px] h-[200px] bg-emerald-950 rounded-[26px] overflow-hidden relative shadow-lg shadow-emerald-900/20"
            >
              <View className="absolute -bottom-5 -right-5 opacity-[0.08]">
                <MaterialCommunityIcons
                  name="bowl-mix-outline"
                  size={180}
                  color="white"
                />
              </View>

              <View className="p-[22px] flex-1 justify-between">
                <View className="flex-row items-center justify-between">
                  <View className="bg-white/10 px-3 py-1.5 rounded-full">
                    <Text className="text-[10px] font-black text-white uppercase tracking-widest">
                      Heart-Healthy
                    </Text>
                  </View>
                  <View className="bg-white/10 px-2.5 py-1 rounded-lg">
                    <Text className="text-[11px] font-bold text-emerald-200">
                      Low Sodium
                    </Text>
                  </View>
                </View>

                <View>
                  <Text className="text-[20px] font-black text-white tracking-tight mb-1.5">
                    Oatmeal with Berries
                  </Text>
                  <View className="flex-row items-center gap-3.5">
                    <Text className="text-[12px] font-bold text-emerald-300">
                      Sodium: <Text className="text-white">15mg</Text>
                    </Text>
                    <Text className="text-[12px] font-bold text-emerald-300">
                      Fiber: <Text className="text-white">8g</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
