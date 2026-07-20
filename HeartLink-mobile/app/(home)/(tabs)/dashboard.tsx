import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
  BackHandler,
  Alert,
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
function CircularProgress({ score, size = 180, strokeWidth = 12 }: { score: number; size?: number; strokeWidth?: number }) {
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
        <Text style={{ fontSize: 52, fontWeight: "300", color: "#0f172a", lineHeight: 56 }}>{score}</Text>
        <Text style={{ fontSize: 11, color: "#94a3b8", letterSpacing: 1 }}>/100</Text>
      </View>
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, iconColor, iconBg }: { icon: string; label: string; value: string; iconColor: string; iconBg: string }) {
  return (
    <View className="flex-1 bg-white rounded-2xl border border-slate-200 py-3 px-3 items-center">
      <View className="w-8 h-8 rounded-xl items-center justify-center mb-1.5" style={{ backgroundColor: iconBg }}>
        <Feather name={icon as any} size={14} color={iconColor} />
      </View>
      <Text className="text-[15px] font-medium text-slate-900">{value}</Text>
      <Text className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">{label}</Text>
    </View>
  );
}

// ─── Reco Card ────────────────────────────────────────────────────────────────
function RecoCard({ tag, title, subtitle, icon, bg, tagBg, tagText, subColor, onPress }: { tag: string; title: string; subtitle: string; icon: string; bg: string; tagBg: string; tagText: string; subColor: string; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} className="w-[220px] h-[150px] rounded-2xl overflow-hidden" style={{ backgroundColor: bg }}>
      <View style={{ position: "absolute", bottom: -10, right: -10, opacity: 0.07 }}>
        <MaterialCommunityIcons name={icon as any} size={110} color="#fff" />
      </View>
      <View className="p-4 flex-1 justify-between">
        <View className="self-start px-2.5 py-1 rounded-lg" style={{ backgroundColor: tagBg }}>
          <Text className="text-[10px] font-medium uppercase tracking-wide" style={{ color: tagText }}>{tag}</Text>
        </View>
        <View>
          <Text className="text-[15px] font-medium text-white leading-snug mb-1" numberOfLines={2}>{title}</Text>
          <Text className="text-[11px]" style={{ color: subColor }}>{subtitle}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Custom Alert Modal ───────────────────────────────────────────────────────
function CustomAlertModal({
  visible,
  onClose,
  title,
  message,
  icon,
  iconBg,
  iconColor,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  actions: { label: string; onPress: () => void; primary?: boolean }[];
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 }}>
        <View className="bg-white rounded-3xl w-full overflow-hidden" style={{ maxWidth: 360 }}>
          <View className="items-center pt-7 pb-4 px-6">
            <View className="w-14 h-14 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: iconBg }}>
              <Feather name={icon as any} size={26} color={iconColor} />
            </View>
            <Text className="text-[18px] font-semibold text-slate-900 text-center mb-2">{title}</Text>
            <Text className="text-[13px] text-slate-500 text-center leading-relaxed">{message}</Text>
          </View>
          <View className="px-5 pb-5 gap-2">
            {actions.map((action, i) => (
              <TouchableOpacity
                key={i}
                onPress={action.onPress}
                activeOpacity={0.8}
                className="w-full py-3.5 rounded-xl items-center"
                style={{
                  backgroundColor: action.primary ? "#0f172a" : "transparent",
                  borderWidth: action.primary ? 0 : 1,
                  borderColor: "#e2e8f0",
                }}
              >
                <Text
                  className="text-[14px] font-medium"
                  style={{ color: action.primary ? "#fff" : "#64748b" }}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
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
  const router = useRouter();
  const { userId, user, setUserId } = useUser();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Intercept hardware back button
  useEffect(() => {
    const backAction = () => {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        {
          text: "Cancel",
          onPress: () => null,
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: () => {
            setUserId("");
            router.replace("/(auth)/login");
          },
        },
      ]);
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [router, setUserId]);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(false);
    try {
      const response = await fetch(`${base_url}/api/dashboard/${userId}`);
      const json = await response.json();
      setData(json);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(true);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

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

  // Auto-show alert modal when critical alert loads
  useEffect(() => {
    if (data?.latest_alert && !isLoading) {
      setAlertModalVisible(true);
    }
  }, [data?.latest_alert, isLoading]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#0f172a" />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-8">
        <View className="w-16 h-16 rounded-2xl bg-red-50 items-center justify-center mb-4">
          <Feather name="wifi-off" size={28} color="#e24b4a" />
        </View>
        <Text className="text-[17px] font-medium text-slate-900 mb-1 text-center">Unable to load dashboard</Text>
        <Text className="text-[13px] text-slate-400 text-center mb-6 leading-relaxed">
          Please check your internet connection and try again.
        </Text>
        <TouchableOpacity
          onPress={() => fetchData()}
          className="bg-slate-900 px-6 py-3 rounded-xl flex-row items-center gap-2"
          activeOpacity={0.8}
        >
          <Feather name="refresh-cw" size={14} color="#fff" />
          <Text className="text-white font-medium text-[14px]">Try again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isAlertActive = !!data?.latest_alert;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Custom Alert Modal */}
      {isAlertActive && (
        <CustomAlertModal
          visible={alertModalVisible}
          onClose={() => setAlertModalVisible(false)}
          title="Health Alert"
          message={data.latest_alert.message || "Elevated risk detected. We recommend consulting a nearby specialist."}
          icon="alert-triangle"
          iconBg="#fcebeb"
          iconColor="#e24b4a"
          actions={[
            {
              label: "Find Nearby Clinics",
              onPress: () => {
                setAlertModalVisible(false);
                router.push("/locator");
              },
              primary: true,
            },
            {
              label: "Dismiss",
              onPress: () => setAlertModalVisible(false),
            },
          ]}
        />
      )}



      {/* ── Top bar ── */}
      <View className="flex-row justify-between items-center px-5 pt-3 pb-2">
        <View className="flex-row items-center gap-2.5">
          <View className="w-7 h-7 rounded-full items-center justify-center border border-slate-200 bg-white">
            <Feather name="heart" size={13} color="#0f172a" />
          </View>
          <Text className="text-[16px] text-slate-900 tracking-tight" style={{ fontWeight: "300" }}>Heart<Text style={{ fontWeight: "600" }}>Link.</Text></Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => router.push("/(home)/notifications")} className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 items-center justify-center">
            <Feather name="bell" size={17} color="#64748b" />
            <View style={{ position: "absolute", top: 8, right: 8 }} className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(home)/settings")} className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 items-center justify-center">
            <Feather name="settings" size={17} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(home)/profile")} activeOpacity={0.8} className="ml-1">
            <View className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden">
              <Image source={{ uri: user?.avatar_url || "https://ui-avatars.com/api/?name=" + (user?.first_name || "U") + "&background=e2e8f0&color=475569&bold=true" }} className="w-full h-full" resizeMode="cover" />
            </View>
            <View style={{ position: "absolute", bottom: -1, right: -1 }} className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-50" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="pb-28"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />
        }
      >

        {/* ── Greeting ── */}
        <View className="px-5 pt-4 pb-1">
          <Text className="text-[28px] font-medium text-slate-900 tracking-tight leading-tight">
            Welcome back,{"\n"}{data?.user?.first_name || "Guest"}
          </Text>
          <Text className="text-[13px] text-slate-400 mt-1.5">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        </View>

        {/* ── CSS Score hero card ── */}
        <View className="mx-5 mt-4 bg-white rounded-2xl border border-slate-200 pt-6 pb-5 px-5 items-center">

          {/* Ring */}
          <Animated.View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ scale: pulseAnim }] }}>
            {cssScore < 50 && (
              <Animated.View style={{
                position: 'absolute',
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: 'rgba(226, 75, 74, 0.15)',
                opacity: glowOpacity,
              }} />
            )}
            <CircularProgress score={cssScore} size={180} strokeWidth={12} />
          </Animated.View>

          {/* Timestamp */}
          <Text className="text-[11px] text-slate-400 mt-3">
            Last synced: {formatTimestamp(lastSyncTime)}
          </Text>

          {/* Label */}
          <Text className="text-[16px] font-medium text-slate-900 mt-3 mb-2">
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
          <View className="w-full mt-4">
            <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <View className="h-full rounded-full" style={{ width: `${cssScore}%`, backgroundColor: theme.barColor }} />
            </View>
            <View className="flex-row justify-between mt-1">
              <Text className="text-[10px] text-slate-300">0  Critical</Text>
              <Text className="text-[10px] text-slate-300">Stable  100</Text>
            </View>
          </View>

        </View>

        {/* ── Stat cards row ── */}
        <View className="flex-row gap-2.5 mx-5 mt-4">
          <StatCard icon="heart" label="BPM" value={String(data?.latest_vitals?.bpm || "--")} iconColor="#a32d2d" iconBg="#fcebeb" />
          <StatCard icon="droplet" label="BP" value={String(data?.latest_vitals?.bp || "--/--")} iconColor="#185fa5" iconBg="#e6f1fb" />
          <StatCard icon="trending-up" label="Trend" value={String(data?.latest_vitals?.trend || "+0")} iconColor="#3b6d11" iconBg="#eaf3de" />
        </View>

        {/* ── Quick Actions ── */}
        <View className="flex-row gap-2.5 mx-5 mt-4">
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => router.push("/locator")}
            className="flex-1 bg-white rounded-xl border border-slate-200 py-3 items-center"
          >
            <View className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center mb-1.5">
              <Feather name="map-pin" size={16} color="#1e4ed8" />
            </View>
            <Text className="text-[12px] font-medium text-slate-700">Find Clinics</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => router.push("/(home)/log-symptoms")}
            className="flex-1 bg-white rounded-xl border border-slate-200 py-3 items-center"
          >
            <View className="w-9 h-9 rounded-full bg-rose-50 items-center justify-center mb-1.5">
              <Feather name="activity" size={16} color="#e11d48" />
            </View>
            <Text className="text-[12px] font-medium text-slate-700">Log Vitals</Text>
          </TouchableOpacity>
        </View>

        {/* ── Smart insight (dynamic) ── */}
        {data?.insight && (
          <View className="mx-5 mt-4 bg-white rounded-2xl border border-slate-200 p-4 flex-row items-start gap-3">
            <View className="w-9 h-9 rounded-xl items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: data.insight.icon === "trending-down" ? "#fcebeb" : data.insight.icon === "trending-up" ? "#eaf3de" : "#f1f5f9",
              }}
            >
              <Feather
                name={(data.insight.icon || "zap") as any}
                size={16}
                color={data.insight.icon === "trending-down" ? "#e24b4a" : data.insight.icon === "trending-up" ? "#3b6d11" : "#185fa5"}
              />
            </View>
            <Text className="flex-1 text-[13px] text-slate-500 leading-relaxed">
              <Text className="font-medium text-slate-900">{data.insight.title} </Text>
              {data.insight.body}
            </Text>
          </View>
        )}

        {/* ── Today's Activity ── */}
        {data?.today_activity && (
          <View className="mx-5 mt-4 bg-white rounded-2xl border border-slate-200 p-4">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-3">Today's activity</Text>
            <View className="gap-2.5">
              {/* Vitals */}
              <View className="flex-row items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: data.today_activity.vitals_logged ? "#eaf3de" : "#fcebeb" }}>
                  <Feather name={data.today_activity.vitals_logged ? "check-circle" : "circle"} size={18} color={data.today_activity.vitals_logged ? "#3b6d11" : "#a32d2d"} />
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-medium text-slate-800">Vitals check-in</Text>
                  <Text className="text-[11px] text-slate-400">{data.today_activity.vitals_logged ? "Completed today" : "Not logged yet"}</Text>
                </View>
                {!data.today_activity.vitals_logged && (
                  <TouchableOpacity
                    onPress={() => router.push("/(home)/log-symptoms")}
                    className="px-3 py-1.5 rounded-lg bg-slate-900"
                    activeOpacity={0.8}
                  >
                    <Text className="text-white text-[11px] font-medium">Log now</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Meals & Exercise row */}
              <View className="flex-row gap-2.5">
                <View className="flex-1 bg-slate-50 rounded-xl px-4 py-3">
                  <View className="flex-row items-center gap-2 mb-1">
                    <View className="w-7 h-7 rounded-lg items-center justify-center" style={{ backgroundColor: "#faeeda" }}>
                      <MaterialCommunityIcons name="silverware-fork-knife" size={13} color="#854f0b" />
                    </View>
                    <Text className="text-[13px] font-medium text-slate-800">{data.today_activity.meals_count} Meals</Text>
                  </View>
                  <Text className="text-[11px] text-slate-400 ml-9">{data.today_activity.total_calories} kcal today</Text>
                </View>
                <View className="flex-1 bg-slate-50 rounded-xl px-4 py-3">
                  <View className="flex-row items-center gap-2 mb-1">
                    <View className="w-7 h-7 rounded-lg items-center justify-center" style={{ backgroundColor: "#e6f1fb" }}>
                      <Feather name="activity" size={13} color="#185fa5" />
                    </View>
                    <Text className="text-[13px] font-medium text-slate-800">{data.today_activity.exercises_count} Exercise</Text>
                  </View>
                  <Text className="text-[11px] text-slate-400 ml-9">{data.today_activity.total_exercise_minutes} min active</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Sodium Budget ── */}
        {data?.sodium_budget && (
          <View className="mx-5 mt-4 bg-white rounded-2xl border border-slate-200 p-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-7 h-7 rounded-lg items-center justify-center" style={{ backgroundColor: data.sodium_budget.consumed_mg > data.sodium_budget.limit_mg ? "#fcebeb" : "#eaf3de" }}>
                  <MaterialCommunityIcons name="shaker-outline" size={14} color={data.sodium_budget.consumed_mg > data.sodium_budget.limit_mg ? "#a32d2d" : "#3b6d11"} />
                </View>
                <Text className="text-[12px] text-slate-400 uppercase tracking-wide">Daily sodium</Text>
              </View>
              <Text className="text-[13px] font-semibold" style={{ color: data.sodium_budget.consumed_mg > data.sodium_budget.limit_mg ? "#a32d2d" : "#3b6d11" }}>
                {data.sodium_budget.consumed_mg} / {data.sodium_budget.limit_mg}mg
              </Text>
            </View>
            <View className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${Math.min((data.sodium_budget.consumed_mg / data.sodium_budget.limit_mg) * 100, 100)}%`,
                  backgroundColor: data.sodium_budget.consumed_mg > data.sodium_budget.limit_mg ? "#e24b4a" : data.sodium_budget.consumed_mg > data.sodium_budget.limit_mg * 0.75 ? "#ba7517" : "#639922",
                }}
              />
            </View>
            {data.sodium_budget.consumed_mg > data.sodium_budget.limit_mg && (
              <View className="flex-row items-center gap-2 mt-2.5 bg-red-50 rounded-lg px-3 py-2">
                <Feather name="alert-circle" size={13} color="#a32d2d" />
                <Text className="text-[12px] flex-1" style={{ color: "#a32d2d" }}>You've exceeded your daily sodium limit</Text>
              </View>
            )}
          </View>
        )}

        {isCritical ? (
          <View className="mt-6 mb-4">
            <View className="px-5 mb-3">
              <Text className="text-[14px] font-bold text-red-600 uppercase tracking-wide">Prioritize Safety</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/locator")}
              className="mx-5 bg-red-50 rounded-2xl p-4 border border-red-200 flex-row items-center justify-between"
            >
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-medium text-slate-900 mb-0.5">Need professional guidance?</Text>
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
                <Text className="text-[15px] font-medium text-slate-900">Recommended today</Text>
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
                    onPress={() => {
                      if (r.type === "recipe") {
                        router.push({ pathname: "/(home)/recipe-details", params: { id: r.id } });
                      } else if (r.type === "exercise") {
                        router.push({ pathname: "/(home)/exercise-details", params: { id: r.id } });
                      }
                    }}
                  />
                ))}
              </ScrollView>
            </View>

            {/* ── Locator CTA ── */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/locator")}
              className="mx-5 mt-4 bg-white rounded-2xl p-4 border border-slate-200 flex-row items-center justify-between"
            >
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-medium text-slate-900 mb-0.5">Need professional guidance?</Text>
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
