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
  onClose: () => void;
  onNavigateToLogging: () => void;
}

export function ScoreExplanationModal({
  visible,
  score,
  tierLabel,
  hasLoggedData,
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
          accent: "#5EEAD4",
          badgeBg: "rgba(94, 234, 212, 0.2)",
          badgeText: "#5EEAD4",
          framing: "Awesome job! Your heart is relaxed and doing great. Keep up your healthy daily habits!",
        };
      case "Moderate":
        return {
          gradient: ["#452B05", "#8C5E13"] as [string, string],
          accent: "#FDE68A",
          badgeBg: "rgba(253, 230, 138, 0.2)",
          badgeText: "#FDE68A",
          framing: "You are doing okay, but your heart could use a little extra love today — like drinking water, taking a walk, or resting.",
        };
      case "Elevated Risk":
        return {
          gradient: ["#4A170A", "#BA3D1D"] as [string, string],
          accent: "#FDBA74",
          badgeBg: "rgba(253, 186, 116, 0.2)",
          badgeText: "#FDBA74",
          framing: "Be careful today. Your heart is working harder than it should. Try to take a break, skip salty snacks, and check your blood pressure.",
        };
      case "Critical":
        return {
          gradient: ["#450C0A", "#8A1F1A"] as [string, string],
          accent: "#FCA5A5",
          badgeBg: "rgba(252, 165, 165, 0.2)",
          badgeText: "#FCA5A5",
          framing: "Warning: your heart is under a lot of stress right now. Please sit down, rest, and contact your doctor or family if you feel sick.",
        };
      default:
        return {
          gradient: ["#1E293B", "#334155"] as [string, string],
          accent: "#94A3B8",
          badgeBg: "rgba(148, 163, 184, 0.2)",
          badgeText: "#94A3B8",
          framing: "Keep checking your daily numbers so we can show you how your heart is doing.",
        };
    }
  };

  const tierInfo = getTierInfo(tierLabel);

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
            backgroundColor: isDark ? "#141F2D" : "#FFFFFF",
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: isDark ? "#2A3B4E" : "#E2E8E5",
            opacity: panelOpacity,
            transform: [{ translateY: Animated.add(panelShift, panY) }],
            paddingBottom: 24,
          }}
        >
          {/* Top Drag Handle & Header (Swipe down trigger) */}
          <View {...panResponder.panHandlers}>
            {/* Grab Pill */}
            <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 6 }}>
              <View
                style={{
                  width: 40,
                  height: 4.5,
                  borderRadius: 3,
                  backgroundColor: isDark ? "#334155" : "#CBD5E1",
                }}
              />
            </View>

            {/* Header Row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 22,
                paddingBottom: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: isDark ? "#1B3B36" : "#E3EFEC",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="activity" size={18} color={isDark ? "#5EEAD4" : "#1B6E63"} />
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "800",
                      color: isDark ? "#fff" : "#152131",
                      letterSpacing: -0.3,
                    }}
                  >
                    Your Heart Score
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: isDark ? "#94A3B8" : "#5C6B66" }}>
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
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? "#1E2A38" : "#F1F5F4",
                  borderWidth: 1,
                  borderColor: isDark ? "#2B3C50" : "#E2E8E5",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="x" size={17} color={isDark ? "#94A3B8" : "#5C6B66"} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 24 }}
          >
            <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentShift }] }}>

              {/* 1. WHAT THIS NUMBER MEANS (Intro Card) */}
              <View
                style={{
                  backgroundColor: isDark ? "#1B2836" : "#F3F8F5",
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isDark ? "#293A4D" : "#DEEAE3",
                  marginBottom: 18,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: isDark ? "#0C2E29" : "#E3EFEC",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name="info" size={12} color={isDark ? "#5EEAD4" : "#1B6E63"} />
                  </View>
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: "800",
                      color: isDark ? "#5EEAD4" : "#1B6E63",
                      letterSpacing: 1.1,
                      textTransform: "uppercase",
                    }}
                  >
                    What this number means
                  </Text>
                </View>
                <Text style={{ fontSize: 14.5, color: isDark ? "#CBD5E1" : "#334155", lineHeight: 22 }}>
                  Think of this like a <Text style={{ fontWeight: "700", color: isDark ? "#fff" : "#152131" }}>report card for your heart</Text>. It started from your health baseline questionnaire, and stays up to date as you log your blood pressure, meals, daily movement, and sleep.
                </Text>
              </View>

              {/* 2. CURRENT STATUS (Dynamic Hero Card) */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: "800",
                    color: isDark ? "#94A3B8" : "#5C6B66",
                    letterSpacing: 1.1,
                    textTransform: "uppercase",
                    marginBottom: 8,
                    marginLeft: 2,
                  }}
                >
                  How you're doing today
                </Text>

                {score > 0 ? (
                  <LinearGradient
                    colors={tierInfo.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 22, padding: 18, overflow: "hidden" }}
                  >
                    {/* Ambient glow accent */}
                    <View
                      style={{
                        position: "absolute",
                        right: -24,
                        top: -24,
                        width: 130,
                        height: 130,
                        borderRadius: 65,
                        backgroundColor: "rgba(255,255,255,0.08)",
                      }}
                    />

                    {/* Top Score Row */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View>
                        <Text
                          style={{
                            fontSize: 11.5,
                            fontWeight: "700",
                            color: "rgba(255,255,255,0.7)",
                            textTransform: "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          Today's Score
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 2 }}>
                          <Text style={{ fontSize: 36, fontWeight: "900", color: "#fff", letterSpacing: -1 }}>
                            {score}
                          </Text>
                          <Text style={{ fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.6)" }}>
                            / 100
                          </Text>
                        </View>
                      </View>

                      <View
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: "rgba(255,255,255,0.2)",
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.3)",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tierInfo.accent }} />
                        <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#fff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                          {tierLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Score Meter */}
                    <View style={{ marginTop: 14, marginBottom: 8 }}>
                      <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
                        <View
                          style={{
                            width: `${Math.min(100, Math.max(6, score))}%`,
                            height: "100%",
                            backgroundColor: tierInfo.accent,
                            borderRadius: 3,
                          }}
                        />
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 5 }}>
                        <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "600" }}>Needs Care</Text>
                        <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "600" }}>50</Text>
                        <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "600" }}>80</Text>
                        <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "600" }}>Great</Text>
                      </View>
                    </View>

                    {/* Framing Message */}
                    <View style={{ backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 14, padding: 12, marginTop: 4 }}>
                      <Text style={{ fontSize: 13.5, color: "#fff", lineHeight: 20, fontWeight: "500" }}>
                        {tierInfo.framing}
                      </Text>
                    </View>
                  </LinearGradient>
                ) : (
                  /* Rare Fallback: Offline / Network Sync Error */
                  <View
                    style={{
                      backgroundColor: isDark ? "#1B2836" : "#F4F7F5",
                      borderRadius: 22,
                      padding: 20,
                      borderWidth: 1,
                      borderColor: isDark ? "#293A4D" : "#DCE3DF",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: isDark ? "rgba(148, 163, 184, 0.15)" : "#E2E8F0",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 12,
                      }}
                    >
                      <Feather name="refresh-cw" size={22} color={isDark ? "#94A3B8" : "#64748B"} />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: isDark ? "#fff" : "#152131", textAlign: "center" }}>
                      Connecting to your Heart Score...
                    </Text>
                    <Text
                      style={{
                        fontSize: 13.5,
                        color: isDark ? "#CBD5E1" : "#5C6B66",
                        textAlign: "center",
                        marginTop: 6,
                        lineHeight: 20,
                        paddingHorizontal: 8,
                      }}
                    >
                      Check your connection or pull down to refresh.
                    </Text>
                  </View>
                )}
              </View>

              {/* 3. HOW TO GET A BETTER SCORE (4 Habit Cards Grid) */}
              <View>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: "800",
                    color: isDark ? "#94A3B8" : "#5C6B66",
                    letterSpacing: 1.1,
                    textTransform: "uppercase",
                    marginBottom: 10,
                    marginLeft: 2,
                  }}
                >
                  What moves your score
                </Text>

                {/* 2x2 Grid of Habits */}
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                  {/* Salt */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: isDark ? "#1B2836" : "#F8FAF9",
                      borderRadius: 16,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: isDark ? "#293A4D" : "#E2EBE5",
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        backgroundColor: isDark ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 8,
                      }}
                    >
                      <MaterialCommunityIcons name="shaker-outline" size={18} color="#D97706" />
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: isDark ? "#fff" : "#152131" }}>
                      Eat Less Salt
                    </Text>
                    <Text style={{ fontSize: 11.5, color: isDark ? "#94A3B8" : "#5C6B66", marginTop: 2, lineHeight: 16 }}>
                      Keep salty chips, fast food & sauces low
                    </Text>
                  </View>

                  {/* BP */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: isDark ? "#1B2836" : "#F8FAF9",
                      borderRadius: 16,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: isDark ? "#293A4D" : "#E2EBE5",
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 8,
                      }}
                    >
                      <Feather name="heart" size={17} color="#DC2626" />
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: isDark ? "#fff" : "#152131" }}>
                      Daily BP
                    </Text>
                    <Text style={{ fontSize: 11.5, color: isDark ? "#94A3B8" : "#5C6B66", marginTop: 2, lineHeight: 16 }}>
                      Keeps your baseline score accurate & up to date
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                  {/* Walk */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: isDark ? "#1B2836" : "#F8FAF9",
                      borderRadius: 16,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: isDark ? "#293A4D" : "#E2EBE5",
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#D1FAE5",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 8,
                      }}
                    >
                      <Feather name="activity" size={17} color="#059669" />
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: isDark ? "#fff" : "#152131" }}>
                      Daily Walk
                    </Text>
                    <Text style={{ fontSize: 11.5, color: isDark ? "#94A3B8" : "#5C6B66", marginTop: 2, lineHeight: 16 }}>
                      A 15–20 min stroll keeps blood flowing
                    </Text>
                  </View>

                  {/* Sleep */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: isDark ? "#1B2836" : "#F8FAF9",
                      borderRadius: 16,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: isDark ? "#293A4D" : "#E2EBE5",
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        backgroundColor: isDark ? "rgba(99, 102, 241, 0.15)" : "#E0E7FF",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 8,
                      }}
                    >
                      <Feather name="moon" size={17} color="#4F46E5" />
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: isDark ? "#fff" : "#152131" }}>
                      Good Sleep
                    </Text>
                    <Text style={{ fontSize: 11.5, color: isDark ? "#94A3B8" : "#5C6B66", marginTop: 2, lineHeight: 16 }}>
                      7–8 hours lets your heart recharge
                    </Text>
                  </View>
                </View>

                {/* Helpful Takeaway Pill */}
                <View
                  style={{
                    backgroundColor: isDark ? "#162230" : "#EDF3F0",
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: isDark ? "#253648" : "#DFEBE4",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 15 }}>💡</Text>
                  <Text style={{ fontSize: 12, color: isDark ? "#94A3B8" : "#5C6B66", flex: 1, lineHeight: 17, fontWeight: "500" }}>
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
