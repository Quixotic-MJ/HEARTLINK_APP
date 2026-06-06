import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";

// ─── Animated SVG Circle ─────────────────────────────────────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Score theme (all colors as plain values — no dynamic className) ──────────
type ScoreTheme = {
  label: string;
  ringColor: string;
  trackColor: string;
  barColor: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
};

function getScoreTheme(score: number): ScoreTheme {
  if (score >= 80)
    return {
      label: "Stable",
      ringColor: "#639922",
      trackColor: "#c0dd97",
      barColor: "#639922",
      badgeBg: "#eaf3de",
      badgeText: "#3b6d11",
      dotColor: "#639922",
    };
  if (score >= 60)
    return {
      label: "Moderate",
      ringColor: "#ba7517",
      trackColor: "#fac775",
      barColor: "#ba7517",
      badgeBg: "#faeeda",
      badgeText: "#854f0b",
      dotColor: "#ba7517",
    };
  if (score >= 40)
    return {
      label: "Caution",
      ringColor: "#ba7517",
      trackColor: "#fac775",
      barColor: "#ba7517",
      badgeBg: "#faeeda",
      badgeText: "#854f0b",
      dotColor: "#ba7517",
    };
  return {
    label: "At risk",
    ringColor: "#e24b4a",
    trackColor: "#f7c1c1",
    barColor: "#e24b4a",
    badgeBg: "#fcebeb",
    badgeText: "#a32d2d",
    dotColor: "#e24b4a",
  };
}

// ─── Circular Progress ────────────────────────────────────────────────────────
function CircularProgress({
  score,
  size = 180,
  strokeWidth = 10,
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
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
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
      {/* Center label — absolute, so kept as style */}
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text className="text-[48px] font-medium text-slate-900 leading-tight tracking-tight">
          {score}
        </Text>
        <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
          out of 100
        </Text>
      </View>
    </View>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({
  icon,
  label,
  value,
  iconColor,
  iconBg,
}: {
  icon: string;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <View className="flex-1 bg-slate-50 rounded-2xl py-3 px-2 items-center border border-slate-200/70">
      {/* Icon bg is dynamic — inline style */}
      <View
        className="w-7 h-7 rounded-lg items-center justify-center mb-2"
        style={{ backgroundColor: iconBg }}
      >
        <Feather name={icon as any} size={14} color={iconColor} />
      </View>
      <Text className="text-[13px] font-medium text-slate-900">{value}</Text>
      <Text className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">
        {label}
      </Text>
    </View>
  );
}

// ─── Quick Action ─────────────────────────────────────────────────────────────
// All color/bg via inline style — no dynamic className
function QuickAction({
  icon,
  iconType,
  label,
  bg,
  border,
  iconColor,
  iconBg,
  textColor,
}: {
  icon: string;
  iconType: "feather" | "material";
  label: string;
  bg: string;
  border: string;
  iconColor: string;
  iconBg: string;
  textColor: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      className="w-[96px] h-[112px] rounded-2xl items-center justify-center border"
      style={{ backgroundColor: bg, borderColor: border }}
    >
      <View
        className="w-11 h-11 rounded-xl items-center justify-center mb-2"
        style={{ backgroundColor: iconBg }}
      >
        {iconType === "material" ? (
          <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
        ) : (
          <Feather name={icon as any} size={18} color={iconColor} />
        )}
      </View>
      <Text className="text-[11px] font-medium text-center" style={{ color: textColor }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Recommendation Card ──────────────────────────────────────────────────────
function RecoCard({
  tag,
  title,
  subtitle,
  icon,
  bg,
  tagBg,
  tagText,
  subColor,
}: {
  tag: string;
  title: string;
  subtitle: string;
  icon: string;
  bg: string;
  tagBg: string;
  tagText: string;
  subColor: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      className="w-[260px] h-[176px] rounded-2xl overflow-hidden"
      style={{ backgroundColor: bg }}
    >
      {/* Ghost icon */}
      <View style={{ position: "absolute", bottom: -12, right: -12, opacity: 0.07 }}>
        <MaterialCommunityIcons name={icon as any} size={140} color="#fff" />
      </View>

      <View className="p-5 flex-1 justify-between">
        {/* Tag */}
        <View
          className="self-start px-2.5 py-1 rounded-lg"
          style={{ backgroundColor: tagBg }}
        >
          <Text className="text-[10px] font-medium uppercase tracking-wide" style={{ color: tagText }}>
            {tag}
          </Text>
        </View>

        {/* Text */}
        <View>
          <Text className="text-[17px] font-medium text-white leading-snug mb-1">
            {title}
          </Text>
          <Text className="text-[12px]" style={{ color: subColor }}>
            {subtitle}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const [isAlertActive] = useState(false);
  const router = useRouter();
  const cssScore = 75;
  const theme = getScoreTheme(cssScore);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Emergency banner — static className, no ternary */}
      {isAlertActive && (
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => router.push("/locator")}
          className="bg-red-500 px-5 py-3.5 flex-row items-center gap-3"
        >
          <Feather name="alert-triangle" size={18} color="white" />
          <Text className="text-white text-[13px] font-medium flex-1 leading-snug">
            Elevated risk detected. Tap to view nearby cardiovascular specialists.
          </Text>
          <Feather name="chevron-right" size={18} color="white" />
        </TouchableOpacity>
      )}

      {/* Top bar */}
      <View className="flex-row justify-between items-center px-5 pt-4 pb-2">
        {/* Logo */}
        <View className="flex-row items-center gap-2.5">
          <View className="w-9 h-9 bg-[#1e4ed8] rounded-xl items-center justify-center shadow-sm shadow-blue-900/20">
            <MaterialCommunityIcons name="heart-pulse" size={18} color="white" />
          </View>
          <Text className="text-[16px] font-medium text-slate-900 tracking-tight">
            HeartLink
          </Text>
        </View>

        {/* Actions */}
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => router.push("/(home)/notifications")}
            className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/70 items-center justify-center"
          >
            <Feather name="bell" size={17} color="#64748b" />
            {/* Notification dot — inline style for position */}
            <View
              style={{ position: "absolute", top: 8, right: 8 }}
              className="w-1.5 h-1.5 bg-red-500 rounded-full"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(home)/settings")}
            className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/70 items-center justify-center"
          >
            <Feather name="settings" size={17} color="#64748b" />
          </TouchableOpacity>

          {/* Avatar */}
          <TouchableOpacity
            onPress={() => router.push("/(home)/profile")}
            activeOpacity={0.8}
            className="ml-1"
          >
            <View className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden">
              <Image
                source={{ uri: "https://scontent.fcgy2-2.fna.fbcdn.net/v/t39.30808-6/470238702_122163229004273349_6885730481985014209_n.jpg?_nc_cat=104&ccb=1-7&_nc_sid=a5f93a&_nc_eui2=AeFspkU-pAnduqXzsg0nCMQSc3h1gs4ySEZzeHWCzjJIRiS7qjQy166_bn5hNqi44fxFQkp5tRFulwgVSN60yG1o&_nc_ohc=JjKG5iySuBYQ7kNvwF3zmCi&_nc_oc=AdqJL2LZkjt9IqiM_KPQtb2ZUT6mEm5UdI2cgi-6Mu6INC3QVBLGz8-OKHIG4Fuyfuk&_nc_zt=23&_nc_ht=scontent.fcgy2-2.fna&_nc_gid=zjeomdkvajMCPjEc3tC8YQ&_nc_ss=7b2a8&oh=00_Af_FFO3skv0KzZZjqU44lc3j6qTtYj5r07rF5GLagi9HDg&oe=6A275350" }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            {/* Online dot */}
            <View
              style={{ position: "absolute", bottom: -1, right: -1 }}
              className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-50"
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="pb-28"
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-[22px] font-medium text-slate-900 tracking-tight leading-tight">
            Welcome back,{"\n"}John Mark
          </Text>
          <Text className="text-[13px] text-slate-400 mt-1.5">
            Thursday, 4 June
          </Text>
        </View>

        {/* Hero: CSS Score Card */}
        <View className="mx-5 mt-3 bg-white rounded-2xl border border-slate-200/70 p-5">
          {/* Header row */}
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-[14px] font-medium text-slate-900">
              Stability score
            </Text>
            {/* Badge — all dynamic colors via inline style */}
            <View
              className="flex-row items-center px-2.5 py-1 rounded-lg gap-1.5"
              style={{ backgroundColor: theme.badgeBg }}
            >
              <View
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: theme.dotColor }}
              />
              <Text
                className="text-[11px] font-medium"
                style={{ color: theme.badgeText }}
              >
                {theme.label}
              </Text>
            </View>
          </View>

          {/* Ring */}
          <View className="items-center py-2">
            <CircularProgress score={cssScore} size={180} strokeWidth={10} />
          </View>

          {/* Score bar */}
          <View className="h-1.5 bg-slate-100 rounded-full mt-5 overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{ width: `${cssScore}%`, backgroundColor: theme.barColor }}
            />
          </View>

          {/* Stat pills */}
          <View className="flex-row gap-2.5 mt-4">
            <StatPill icon="heart" label="BPM" value="72" iconColor="#a32d2d" iconBg="#fcebeb" />
            <StatPill icon="droplet" label="BP" value="120/80" iconColor="#185fa5" iconBg="#e6f1fb" />
            <StatPill icon="trending-up" label="Trend" value="+5" iconColor="#3b6d11" iconBg="#eaf3de" />
          </View>

          {/* Timestamp */}
          <View className="flex-row items-center justify-center mt-4 gap-1.5">
            <Feather name="clock" size={11} color="#cbd5e1" />
            <Text className="text-[11px] text-slate-300">Updated 7 mins ago</Text>
          </View>
        </View>

        {/* Smart insight */}
        <View className="mx-5 mt-3 bg-white rounded-2xl border border-slate-200/70 p-4 flex-row items-start gap-3">
          <View className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/70 items-center justify-center flex-shrink-0">
            <Feather name="zap" size={16} color="#185fa5" />
          </View>
          <Text className="flex-1 text-[13px] text-slate-500 leading-relaxed">
            <Text className="font-medium text-slate-900">
              Your stability score improved by 5 points this week.
            </Text>
            {" "}Consistent medication tracking and low-sodium meals logged.
          </Text>
        </View>

        {/* Quick actions */}
        <View className="mt-6">
          <View className="px-5 flex-row items-center justify-between mb-3">
            <Text className="text-[14px] font-medium text-slate-900">Quick record</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="px-5 gap-3"
          >
            <QuickAction
              icon="barcode-scan"
              iconType="material"
              label="Scan meal"
              bg="#eaf3de"
              border="#c0dd97"
              iconColor="#3b6d11"
              iconBg="#fff"
              textColor="#27500a"
            />
            <QuickAction
              icon="heart-pulse"
              iconType="material"
              label="Log vitals"
              bg="#fcebeb"
              border="#f7c1c1"
              iconColor="#a32d2d"
              iconBg="#fff"
              textColor="#791f1f"
            />
            <QuickAction
              icon="clipboard"
              iconType="feather"
              label="Symptoms"
              bg="#faeeda"
              border="#fac775"
              iconColor="#854f0b"
              iconBg="#fff"
              textColor="#633806"
            />
          </ScrollView>
        </View>

        {/* Recommendations */}
        <View className="mt-6 mb-10">
          <View className="px-5 flex-row items-center justify-between mb-3">
            <Text className="text-[14px] font-medium text-slate-900">
              Recommended today
            </Text>
            <TouchableOpacity>
              <Text className="text-[13px] text-slate-400">See all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="px-5 gap-3"
          >
            <RecoCard
              tag="Exercise"
              title="15-min chair yoga"
              subtitle="Safe mobility, stable heart rate."
              icon="yoga"
              bg="#1e293b"
              tagBg="rgba(255,255,255,0.12)"
              tagText="rgba(255,255,255,0.8)"
              subColor="#94a3b8"
            />
            <RecoCard
              tag="Heart-healthy"
              title="Oatmeal with berries"
              subtitle="Sodium: 15mg · Fiber: 8g"
              icon="bowl-mix-outline"
              bg="#14532d"
              tagBg="rgba(255,255,255,0.12)"
              tagText="rgba(255,255,255,0.8)"
              subColor="#86efac"
            />
            <RecoCard
              tag="Breathing"
              title="4-7-8 technique"
              subtitle="Calms nervous system in 5 mins."
              icon="meditation"
              bg="#1e3a5f"
              tagBg="rgba(255,255,255,0.12)"
              tagText="rgba(255,255,255,0.8)"
              subColor="#93c5fd"
            />
          </ScrollView>
        </View>

        {/* Home Safety Net */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/locator")}
          className="mx-5 mb-8 bg-white rounded-[20px] p-5 border border-slate-200/70 shadow-sm shadow-slate-900/5 flex-row items-center justify-between"
        >
          <View className="flex-1 pr-4">
            <Text className="text-[15px] font-bold text-slate-900 mb-1">
              Need professional guidance?
            </Text>
            <Text className="text-[13px] text-slate-500 font-medium">
              Find a specialist near you.
            </Text>
          </View>
          <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center">
            <Feather name="map-pin" size={18} color="#1e4ed8" />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}