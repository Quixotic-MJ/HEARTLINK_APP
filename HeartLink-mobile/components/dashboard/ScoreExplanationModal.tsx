import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  PanResponder,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import * as Haptics from "expo-haptics";

interface ScoreExplanationModalProps {
  visible: boolean;
  score: number;
  tierLabel: string;
  hasLoggedData: boolean;
  factors?: any; // Dynamic HSS factors from backend
  onClose: () => void;
  onNavigateToLogging: () => void;
}

export function ScoreExplanationModal({
  visible,
  score,
  tierLabel,
  hasLoggedData,
  factors,
  onClose,
  onNavigateToLogging,
}: ScoreExplanationModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const panelShift = useRef(new Animated.Value(500)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const contentShift = useRef(new Animated.Value(20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    panelShift.setValue(500);
    panY.setValue(0);
    panelOpacity.setValue(0);
    backdropAnim.setValue(0);
    contentShift.setValue(20);
    contentOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(panelShift, {
        toValue: 0,
        stiffness: 400,
        damping: 32,
        mass: 1,
        useNativeDriver: true,
      }),
      Animated.timing(panelOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(contentShift, {
        toValue: 0,
        stiffness: 300,
        damping: 24,
        mass: 1,
        delay: 60,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 200,
        delay: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [panelShift, panY, panelOpacity, backdropAnim, contentShift, contentOpacity]);

  const animateOut = useCallback(
    (done?: () => void) => {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(panelShift, {
          toValue: 500,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(panelOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        panY.setValue(0);
        done?.();
      });
    },
    [panelShift, panY, panelOpacity, backdropAnim]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 8 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 110 || gestureState.vy > 0.8) {
          Haptics.selectionAsync();
          animateOut(onClose);
        } else {
          Animated.spring(panY, {
            toValue: 0,
            stiffness: 400,
            damping: 30,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case "Stable":
        return {
          gradient: ["#0C2E29", "#1B6E63"] as [string, string],
          accent: "#34d399",
          badgeBg: "rgba(52, 211, 153, 0.2)",
          badgeText: "#34d399",
          framing: "Awesome job! Your heart is relaxed and doing great. Keep up your healthy daily habits!",
        };
      case "Moderate":
        return {
          gradient: ["#452B05", "#8C5E13"] as [string, string],
          accent: "#fbbf24",
          badgeBg: "rgba(251, 191, 36, 0.2)",
          badgeText: "#fbbf24",
          framing: "You are doing okay, but your heart could use a little extra love today — like drinking water, taking a walk, or resting.",
        };
      case "Elevated Risk":
        return {
          gradient: ["#4A170A", "#BA3D1D"] as [string, string],
          accent: "#fb923c",
          badgeBg: "rgba(251, 146, 60, 0.2)",
          badgeText: "#fb923c",
          framing: "Be careful today. Your heart is working harder than it should. Try to take a break, skip salty snacks, and check your blood pressure.",
        };
      case "Critical":
        return {
          gradient: ["#450C0A", "#8A1F1A"] as [string, string],
          accent: "#f87171",
          badgeBg: "rgba(248, 113, 113, 0.2)",
          badgeText: "#f87171",
          framing: "Warning: your heart is under a lot of stress right now. Please sit down, rest, and contact your doctor or family if you feel sick.",
        };
      default:
        return {
          gradient: ["#1E293B", "#334155"] as [string, string],
          accent: "#94a3b8",
          badgeBg: "rgba(148, 163, 184, 0.2)",
          badgeText: "#94a3b8",
          framing: "Keep checking your daily numbers so we can show you how your heart is doing.",
        };
    }
  };

  const tierInfo = getTierInfo(tierLabel);

  // Helper to format points with + or -
  const formatPoints = (pts: number) => {
    if (!pts || pts === 0) return "+0";
    return pts > 0 ? `+${pts}` : `${pts}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={animateIn}
      onRequestClose={() => animateOut(onClose)}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "rgba(15,23,42,0.6)",
          opacity: backdropAnim,
          justifyContent: "flex-end",
        }}
      >
        {/* Backdrop touchable to dismiss */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => animateOut(onClose)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Sliding Panel */}
        <Animated.View
          style={{
            width: "100%",
            maxHeight: "88%",
            borderTopLeftRadius: 36,
            borderTopRightRadius: 36,
            overflow: "hidden",
            backgroundColor: isDark ? "#0f172a" : "#ffffff",
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: isDark ? "#334155" : "#f1f5f9",
            opacity: panelOpacity,
            transform: [{ translateY: Animated.add(panelShift, panY) }],
            paddingBottom: 24,
          }}
        >
          {/* Top Drag Handle & Header (Swipe down trigger) */}
          <View {...panResponder.panHandlers}>
            {/* Grab Pill */}
            <View className="items-center pt-3 pb-2">
              <View className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </View>

            {/* Header Row */}
            <View className="flex-row items-center justify-between px-6 pb-4">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 items-center justify-center">
                  <Feather name="activity" size={20} color={isDark ? "#34d399" : "#10b981"} />
                </View>
                <View>
                  <Text className="text-[18px] font-bold text-slate-900 dark:text-white tracking-tight">
                    Your Heart Score
                  </Text>
                  <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                    Daily stability guide
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  animateOut(onClose);
                }}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={10}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 items-center justify-center"
              >
                <Feather name="x" size={17} color={isDark ? "#94a3b8" : "#64748b"} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          >
            <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentShift }] }}>

              {/* 1. CURRENT STATUS (Dynamic Hero Card) */}
              <View className="mb-6">
                {score > 0 ? (
                  <LinearGradient
                    colors={tierInfo.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 24, padding: 20, overflow: "hidden" }}
                  >
                    {/* Ambient glow accent */}
                    <View
                      style={{
                        position: "absolute",
                        right: -30,
                        top: -30,
                        width: 150,
                        height: 150,
                        borderRadius: 75,
                        backgroundColor: "rgba(255,255,255,0.08)",
                      }}
                    />

                    {/* Top Score Row */}
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-[11px] font-bold text-white/70 uppercase tracking-widest mb-1">
                          Today's Score
                        </Text>
                        <View className="flex-row items-baseline gap-1">
                          <Text className="text-[38px] font-black text-white tracking-tight">
                            {score}
                          </Text>
                          <Text className="text-[15px] font-bold text-white/60">
                            / 100
                          </Text>
                        </View>
                      </View>

                      <View
                        style={{ backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.2)" }}
                        className="px-3.5 py-2 rounded-full border flex-row items-center gap-2"
                      >
                        <View style={{ backgroundColor: tierInfo.accent }} className="w-2.5 h-2.5 rounded-full" />
                        <Text className="text-[12px] font-bold text-white uppercase tracking-widest">
                          {tierLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Score Meter */}
                    <View className="mt-5 mb-2.5">
                      <View className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                        <View
                          style={{
                            width: `${Math.min(100, Math.max(6, score))}%`,
                            backgroundColor: tierInfo.accent,
                          }}
                          className="h-full rounded-full"
                        />
                      </View>
                      <View className="flex-row justify-between mt-2 px-0.5">
                        <Text className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Needs Care</Text>
                        <Text className="text-[10px] font-bold text-white/60 uppercase tracking-wider">50</Text>
                        <Text className="text-[10px] font-bold text-white/60 uppercase tracking-wider">80</Text>
                        <Text className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Great</Text>
                      </View>
                    </View>

                    {/* Framing Message */}
                    <View className="bg-black/20 rounded-2xl p-3.5 mt-3">
                      <Text className="text-[13px] text-white/90 leading-relaxed font-medium">
                        {tierInfo.framing}
                      </Text>
                    </View>
                  </LinearGradient>
                ) : (
                  /* Rare Fallback: Offline / Network Sync Error */
                  <View className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-700/50 items-center">
                    <View className="w-14 h-14 rounded-full bg-slate-200/50 dark:bg-slate-700/50 items-center justify-center mb-4">
                      <Feather name="refresh-cw" size={24} color={isDark ? "#94a3b8" : "#64748b"} />
                    </View>
                    <Text className="text-[16px] font-bold text-slate-900 dark:text-white text-center mb-2">
                      Connecting to your Heart Score...
                    </Text>
                    <Text className="text-[13px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                      Check your connection or pull down to refresh.
                    </Text>
                  </View>
                )}
              </View>

              {/* 2. DYNAMIC SCORE BREAKDOWN */}
              <View className="mb-2">
                <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 ml-1">
                  What moved your score today
                </Text>

                <View className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50 overflow-hidden mb-4">
                  {factors ? (
                    <>
                      {/* Base & Total Header */}
                      <View className="flex-row items-center justify-between p-4 bg-slate-100/50 dark:bg-slate-800 border-b border-slate-200/60 dark:border-slate-700">
                        <Text className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Base Score</Text>
                        <Text className="text-[14px] font-bold text-slate-900 dark:text-white">{factors.base_score || 0}</Text>
                      </View>

                      <View className="px-4 py-2">
                        {/* Breakdown rows */}
                        {[
                          { label: "Meals (Sodium, Fat, Fiber)", val: factors.meal_points, icon: "silverware-fork-knife", type: "material", color: "#f59e0b" },
                          { label: "Exercise & Movement", val: factors.exercise_points, icon: "activity", type: "feather", color: "#10b981" },
                          { label: "Sleep (7-9 hrs)", val: factors.sleep_points, icon: "moon", type: "feather", color: "#6366f1" },
                          { label: "Medication Taken", val: factors.medication_points, icon: "pill", type: "material", color: "#8b5cf6" },
                          { label: "Blood Sugar Range", val: factors.blood_sugar_points, icon: "water", type: "material", color: "#ef4444" },
                          { label: "Weight Stability", val: factors.weight_gain_points, icon: "scale", type: "material", color: "#f43f5e" },
                          { label: "Symptoms", val: factors.symptom_points, icon: "alert-circle", type: "feather", color: "#e11d48" },
                          { label: "Consistency Streak", val: factors.streak_points, icon: "zap", type: "feather", color: "#f59e0b" },
                          { label: "Data Staleness", val: factors.staleness_penalty, icon: "clock", type: "feather", color: "#64748b" },
                        ].map((item, idx) => {
                          if (item.val === undefined || item.val === 0) return null;
                          const isPositive = item.val > 0;
                          return (
                            <View key={idx} className="flex-row items-center justify-between py-2.5">
                              <View className="flex-row items-center gap-2">
                                <View className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: `${item.color}20` }}>
                                  {item.type === "feather" ? (
                                    <Feather name={item.icon as any} size={14} color={item.color} />
                                  ) : (
                                    <MaterialCommunityIcons name={item.icon as any} size={14} color={item.color} />
                                  )}
                                </View>
                                <Text className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                                  {item.label}
                                </Text>
                              </View>
                              <Text className={`text-[14px] font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {formatPoints(item.val)}
                              </Text>
                            </View>
                          );
                        })}
                      </View>

                      {/* Total adjustments footer */}
                      <View className="flex-row items-center justify-between p-4 bg-slate-100/50 dark:bg-slate-800 border-t border-slate-200/60 dark:border-slate-700">
                        <Text className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Net Adjustments (Capped)</Text>
                        <Text className="text-[15px] font-black text-slate-900 dark:text-white">
                          {formatPoints(factors.total_lifestyle_adjustment || 0)}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View className="p-6 items-center">
                      <Text className="text-[14px] text-slate-500 dark:text-slate-400 font-medium text-center">
                        Log your meals, exercise, and vitals today to see your score adjustments here.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Helpful Takeaway Pill */}
                <View className="bg-emerald-500/10 dark:bg-emerald-500/10 rounded-3xl p-4 border border-emerald-500/20 flex-row items-center gap-3">
                  <Text className="text-[20px]">💡</Text>
                  <Text className="text-[12.5px] text-slate-700 dark:text-slate-300 flex-1 leading-relaxed font-medium">
                    Your baseline gave your heart its starting score. Checking your blood pressure and daily habits keeps your score fine-tuned and protected!
                  </Text>
                </View>
              </View>

            </Animated.View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

