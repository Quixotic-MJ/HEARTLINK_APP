import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useUser } from "../../../contexts/UserContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Score theme ──────────────────────────────────────────────────────────────
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
    return { label: "Stable", ringColor: "#639922", trackColor: "#c0dd97", barColor: "#639922", badgeBg: "#eaf3de", badgeText: "#3b6d11", dotColor: "#639922" };
  if (score >= 60)
    return { label: "Moderate", ringColor: "#ba7517", trackColor: "#fac775", barColor: "#ba7517", badgeBg: "#faeeda", badgeText: "#854f0b", dotColor: "#ba7517" };
  if (score >= 40)
    return { label: "Caution", ringColor: "#ba7517", trackColor: "#fac775", barColor: "#ba7517", badgeBg: "#faeeda", badgeText: "#854f0b", dotColor: "#ba7517" };
  return { label: "At risk", ringColor: "#e24b4a", trackColor: "#f7c1c1", barColor: "#e24b4a", badgeBg: "#fcebeb", badgeText: "#a32d2d", dotColor: "#e24b4a" };
}

// ─── Circular Progress ────────────────────────────────────────────────────────
function CircularProgress({ score, size = 200, strokeWidth = 13 }: { score: number; size?: number; strokeWidth?: number }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const theme = getScoreTheme(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, { toValue: score, duration: 1400, useNativeDriver: false }).start();
  }, [score]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.trackColor} strokeWidth={strokeWidth} fill="transparent" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={radius} stroke={theme.ringColor} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
      </Svg>
      {/* Score number inside ring */}
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={{ fontSize: 58, fontWeight: "300", color: "#0f172a", lineHeight: 62 }}>{score}</Text>
        <Text style={{ fontSize: 12, color: "#94a3b8", letterSpacing: 1 }}>/100</Text>
      </View>
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, iconColor, iconBg }: { icon: string; label: string; value: string; iconColor: string; iconBg: string }) {
  return (
    <View className="flex-1 bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 py-3.5 px-3 items-center">
      <View className="w-8 h-8 rounded-xl items-center justify-center mb-2" style={{ backgroundColor: iconBg }}>
        <Feather name={icon as any} size={15} color={iconColor} />
      </View>
      <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900">{value}</Text>
      <Text className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">{label}</Text>
    </View>
  );
}


// ─── Reco Card ────────────────────────────────────────────────────────────────
function RecoCard({ tag, title, subtitle, icon, bg, tagBg, tagText, subColor }: { tag: string; title: string; subtitle: string; icon: string; bg: string; tagBg: string; tagText: string; subColor: string }) {
  return (
    <TouchableOpacity activeOpacity={0.85} className="w-[240px] h-[164px] rounded-2xl overflow-hidden" style={{ backgroundColor: bg }}>
      <View style={{ position: "absolute", bottom: -10, right: -10, opacity: 0.07 }}>
        <MaterialCommunityIcons name={icon as any} size={120} color="#fff" />
      </View>
      <View className="p-4 flex-1 justify-between">
        <View className="self-start px-2.5 py-1 rounded-lg" style={{ backgroundColor: tagBg }}>
          <Text className="text-[10px] font-medium uppercase tracking-wide" style={{ color: tagText }}>{tag}</Text>
        </View>
        <View>
          <Text className="text-[16px] font-medium text-white dark:text-slate-900 leading-snug mb-1">{title}</Text>
          <Text className="text-[12px]" style={{ color: subColor }}>{subtitle}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Timestamp Helper ─────────────────────────────────────────────────────────
function formatTimestamp(date: Date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} days ago`;
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { userId } = useUser();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`${base_url}/api/dashboard/${userId}`);
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [userId]);

  const cssScore = data?.css_score || 0;
  const theme = getScoreTheme(cssScore);
  const isCritical = cssScore < 40;
  const lastSyncTime = data?.last_sync ? new Date(data.last_sync) : new Date();

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [1, 1.05],
    outputRange: [0.2, 0.8]
  });

  useEffect(() => {
    if (cssScore < 50 && !isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [cssScore, pulseAnim, isLoading]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#0f172a" />
      </SafeAreaView>
    );
  }

  const isAlertActive = !!data?.latest_alert;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {isAlertActive && (
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/locator")} className="bg-red-500 px-5 py-3.5 flex-row items-center gap-3">
          <Feather name="alert-triangle" size={18} color="white" />
          <Text className="text-white dark:text-slate-900 text-[13px] font-medium flex-1 leading-snug">{data.latest_alert.message || "Elevated risk detected. Tap to view nearby specialists."}</Text>
          <Feather name="chevron-right" size={18} color="white" />
        </TouchableOpacity>
      )}

      {/* ── Top bar ── */}
      <View className="flex-row justify-between items-center px-5 pt-4 pb-2">
        <View className="flex-row items-center gap-2.5">
          <View className="w-7 h-7 rounded-full items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:bg-slate-100">
            <Feather name="heart" size={13} color="#0f172a" />
          </View>
          <Text className="text-[16px] text-slate-900 dark:text-white dark:text-slate-900 tracking-tight" style={{ fontWeight: "300" }}>Heart<Text style={{ fontWeight: "600" }}>Link.</Text></Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => router.push("/(home)/notifications")} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800/70 items-center justify-center">
            <Feather name="bell" size={17} color="#64748b" />
            <View style={{ position: "absolute", top: 8, right: 8 }} className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(home)/settings")} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800/70 items-center justify-center">
            <Feather name="settings" size={17} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(home)/profile")} activeOpacity={0.8} className="ml-1">
            <View className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden">
              <Image source={{ uri: data?.user?.avatar_url || "https://scontent.fcgy2-2.fna.fbcdn.net/v/t39.30808-6/470238702_122163229004273349_6885730481985014209_n.jpg?_nc_cat=104&ccb=1-7&_nc_sid=a5f93a&_nc_eui2=AeFspkU-pAnduqXzsg0nCMQSc3h1gs4ySEZzeHWCzjJIRiS7qjQy166_bn5hNqi44fxFQkp5tRFulwgVSN60yG1o&_nc_ohc=JjKG5iySuBYQ7kNvwF3zmCi&_nc_oc=AdqJL2LZkjt9IqiM_KPQtb2ZUT6mEm5UdI2cgi-6Mu6INC3QVBLGz8-OKHIG4Fuyfuk&_nc_zt=23&_nc_ht=scontent.fcgy2-2.fna&_nc_gid=zjeomdkvajMCPjEc3tC8YQ&_nc_ss=7b2a8&oh=00_Af_FFO3skv0KzZZjqU44lc3j6qTtYj5r07rF5GLagi9HDg&oe=6A275350" }} className="w-full h-full" resizeMode="cover" />
            </View>
            <View style={{ position: "absolute", bottom: -1, right: -1 }} className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-50" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerClassName="pb-28" showsVerticalScrollIndicator={false}>

        {/* ── Greeting ── */}
        <View className="px-5 pt-5 pb-2">
          <Text className="text-[30px] font-medium text-slate-900 dark:text-white dark:text-slate-900 tracking-tight leading-tight">
            Welcome back,{"\n"}{data?.user?.first_name || "Guest"}
          </Text>
          <Text className="text-[14px] text-slate-400 mt-2">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        </View>

        {/* ── CSS Score hero card ── */}
        <View className="mx-5 mt-3 bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 pt-6 pb-5 px-5 items-center">

          {/* Ring */}
          <Animated.View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ scale: pulseAnim }] }}>
            {cssScore < 50 && (
              <Animated.View style={{
                position: 'absolute',
                width: 220,
                height: 220,
                borderRadius: 110,
                backgroundColor: 'rgba(226, 75, 74, 0.15)',
                opacity: glowOpacity,
              }} />
            )}
            <CircularProgress score={cssScore} size={200} strokeWidth={13} />
          </Animated.View>

          {/* Timestamp Integration */}
          <Text className="text-[11px] text-slate-400 mt-4">
            Last synced: {formatTimestamp(lastSyncTime)}
          </Text>

          {/* Label below ring */}
          <Text className="text-[17px] font-medium text-slate-900 dark:text-white dark:text-slate-900 mt-4 mb-2">
            Cardiovascular stability
          </Text>

          {/* Status badge */}
          <View
            className="flex-row items-center px-3.5 py-1.5 rounded-full gap-2"
            style={{ backgroundColor: theme.badgeBg }}
          >
            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.dotColor }} />
            <Text className="text-[13px] font-medium" style={{ color: theme.badgeText }}>
              {theme.label}
            </Text>
          </View>

          {/* Progress bar */}
          <View className="w-full mt-5">
            <View className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <View className="h-full rounded-full" style={{ width: `${cssScore}%`, backgroundColor: theme.barColor }} />
            </View>
            <View className="flex-row justify-between mt-1">
              <Text className="text-[10px] text-slate-300">0  Critical</Text>
              <Text className="text-[10px] text-slate-300">Stable  100</Text>
            </View>
          </View>

        </View>

        {/* ── Quick Actions ── */}
        <View className="flex-row gap-3 mx-5 mt-4">
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => router.push("/locator")}
            className="flex-1 bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-xl border border-slate-200 dark:border-slate-800/70 py-3 items-center"
          >
            <View className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center mb-1.5">
              <Feather name="map-pin" size={16} color="#1e4ed8" />
            </View>
            <Text className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Find Clinics</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => router.push("/(home)/log-symptoms")}
            className="flex-1 bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-xl border border-slate-200 dark:border-slate-800/70 py-3 items-center"
          >
            <View className="w-9 h-9 rounded-full bg-rose-50 items-center justify-center mb-1.5">
              <Feather name="activity" size={16} color="#e11d48" />
            </View>
            <Text className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Log Vitals</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stat cards row ── */}
        <View className="flex-row gap-3 mx-5 mt-4">
          <StatCard icon="heart" label="BPM" value={String(data?.latest_vitals?.bpm || "--")} iconColor="#a32d2d" iconBg="#fcebeb" />
          <StatCard icon="droplet" label="BP" value={String(data?.latest_vitals?.bp || "--/--")} iconColor="#185fa5" iconBg="#e6f1fb" />
          <StatCard icon="trending-up" label="Trend" value={String(data?.latest_vitals?.trend || "+0")} iconColor="#3b6d11" iconBg="#eaf3de" />
        </View>

        {/* ── Smart insight ── */}
        <View className="mx-5 mt-3 bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 flex-row items-start gap-3">
          <View className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 items-center justify-center flex-shrink-0">
            <Feather name="zap" size={16} color="#185fa5" />
          </View>
          <Text className="flex-1 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
            <Text className="font-medium text-slate-900 dark:text-white dark:text-slate-900">Your stability score improved by 5 points this week. </Text>
            Consistent medication tracking and low-sodium meals logged.
          </Text>
        </View>


        {isCritical ? (
          <View className="mt-6 mb-10">
            <View className="px-5 mb-3">
              <Text className="text-[15px] font-bold text-red-600 uppercase tracking-wide">Prioritize Safety</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/locator")}
              className="mx-5 bg-red-50 rounded-2xl p-4 border border-red-200 flex-row items-center justify-between"
            >
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900 mb-0.5">Need professional guidance?</Text>
                <Text className="text-[13px] text-slate-600">Find a cardiologist near you to discuss your risk level.</Text>
              </View>
              <View className="w-10 h-10 bg-red-100 rounded-xl items-center justify-center">
                <Feather name="map-pin" size={18} color="#e24b4a" />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Recommendations ── */}
            <View className="mt-6">
              <View className="px-5 flex-row items-center justify-between mb-3">
                <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900">Recommended today</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-5 gap-3">
                {data?.recommendations?.map((r: any, idx: number) => (
                  <RecoCard 
                    key={idx} 
                    tag={r.tag} 
                    title={r.title} 
                    subtitle={r.subtitle} 
                    icon={r.icon} 
                    bg={r.bg} 
                    tagBg={r.tagBg} 
                    tagText={r.tagText} 
                    subColor={r.subColor} 
                  />
                ))}
              </ScrollView>
            </View>

            {/* ── Locator CTA ── */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/locator")}
              className="mx-5 mt-4 bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl p-4 border border-slate-200 dark:border-slate-800/70 flex-row items-center justify-between"
            >
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900 mb-0.5">Need professional guidance?</Text>
                <Text className="text-[13px] text-slate-400">Find a cardiologist near you.</Text>
              </View>
              <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center">
                <Feather name="map-pin" size={18} color="#1e4ed8" />
              </View>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}