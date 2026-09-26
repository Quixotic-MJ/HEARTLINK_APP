import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { withLayoutContext, usePathname } from "expo-router";
import { createMaterialTopTabNavigator } from "expo-router/js-top-tabs";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { LinearGradient } from "expo-linear-gradient";
import {
  SplitRecordActions,
} from "../../../components/tabs/SplitRecordActions";
import { QuickLogModal } from "../../../components/exercise/QuickLogModal";
import { MissionLogModal } from "../../../components/dashboard/MissionLogModal";
import { useUser } from "../../../contexts/UserContext";

// ─── Tab Config ───────────────────────────────────────────────────────────────

const TABS = [
  { name: "dashboard", label: "Today",   icon: "sun",         type: "feather" },
  { name: "trends",    label: "Trends",  icon: "trending-up", type: "feather" },
  { name: "record",    label: "Record",  icon: "plus",        type: "feather", isFab: true },
  { name: "explore",   label: "Explore", icon: "compass",     type: "feather" },
  { name: "profile",   label: "Profile", icon: "user",        type: "feather" },
] as const;

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────

// ─── Pill trigger: icon-only circle, filled + elevated when active ────────────

function TabBarItem({
  focused,
  label,
  isDark,
  onPress,
  children,
}: {
  focused: boolean;
  label: string;
  isDark: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const spring = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(spring, {
      toValue: focused ? 1 : 0,
      stiffness: 420,
      damping: 26,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [focused, spring]);

  const scale = spring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.05],
  });
  
  const activeColor = "#38bdf8"; // Primary light blue (sky-400)
  const inactiveColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      style={{ alignItems: "center", justifyContent: "center", flex: 1, paddingVertical: 8 }}
    >
      <Animated.View
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale }],
        }}
      >
        {children}
        <Text
          style={{
            fontSize: 11,
            fontWeight: focused ? "600" : "500",
            color: focused ? activeColor : inactiveColor,
            marginTop: 4,
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, navigation, splitOpen, onFabPress, onCloseSplit }: any) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const INACTIVE_COLOR = isDark ? "#94a3b8" : "#64748b";
  const ACTIVE_COLOR = "#38bdf8"; // Primary light blue

  const fabSpin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fabSpin, {
      toValue: splitOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [splitOpen, fabSpin]);
  const fabRotate = fabSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  const bottomPad = Platform.OS === "ios" ? (insets.bottom > 0 ? insets.bottom : 20) : insets.bottom + 20;

  return (
    <View
      style={{
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
        flexDirection: "row",
        alignItems: "center",
        height: 60 + bottomPad,
        paddingBottom: bottomPad,
        paddingTop: 4,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        borderTopColor: isDark ? "#1e293b" : "#f1f5f9",
        ...Platform.select({
          ios: {
            shadowColor: isDark ? "#000000" : "#94a3b8",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 8,
          },
          android: { elevation: 16 },
        }),
      }}
    >
      {TABS.map((tab: any) => {
        const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
        const isFocused = state.index === routeIndex;

        const onPress = () => {
          if (tab.isFab) {
            onFabPress();
            return;
          }
          // Tapping any tab while the split options are open dismisses them.
          if (splitOpen) onCloseSplit?.();
          const route = state.routes[routeIndex];
          if (!route) return;
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // FAB (plus → × morph target for the split options)
        if (tab.isFab) {
          return (
            <View key={tab.name} style={{ flex: 1, alignItems: "center", justifyContent: "flex-start" }}>
              <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={splitOpen ? "Close quick record" : "Open quick record"}
                style={{
                  position: "absolute",
                  top: -24, // Positioned slightly overlapping the bar
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "#38bdf8", // Primary light blue
                  alignItems: "center",
                  justifyContent: "center",
                  ...Platform.select({
                    ios: {
                      shadowColor: "#38bdf8",
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.4,
                      shadowRadius: 12,
                    },
                    android: { elevation: 8, shadowColor: "#38bdf8" },
                  }),
                }}
              >
                <Animated.View style={{ transform: [{ rotate: fabRotate }] }}>
                  <Feather name="plus" size={26} color="#ffffff" />
                </Animated.View>
              </TouchableOpacity>
            </View>
          );
        }

        // Tab item with label
        const color = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;

        return (
          <View key={tab.name} style={{ flex: 1, alignItems: "center" }}>
            <TabBarItem
              focused={isFocused}
              label={tab.label}
              isDark={isDark}
              onPress={onPress}
            >
              {tab.type === "feather" ? (
                <Feather name={tab.icon as any} size={22} color={color} />
              ) : (
                <MaterialCommunityIcons name={tab.icon as any} size={22} color={color} />
              )}
            </TabBarItem>
          </View>
        );
      })}
    </View>
  );
}

// ─── Custom Swipeable Tabs ───────────────────────────────────────────────────

const { Navigator } = createMaterialTopTabNavigator();
const SwipeableTabs = withLayoutContext(Navigator);

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const [splitOpen, setSplitOpen] = useState(false);
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState<null | "sleep" | "meals">(null);
  const pathname = usePathname();
  const { userId, token } = useUser();

  // Bridge: the navigator owns tab state, but the bar renders OUTSIDE the
  // pop-animated container so only screen content zooms. We keep the tab
  // navigator's navigation object and read fresh state on each render.
  const tabNavRef = useRef<any>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    const nav = tabNavRef.current;
    if (!nav) return;
    setTick((t) => t + 1); // first paint with the bar mounted
    const unsub = nav.addListener("state", () => setTick((t) => t + 1));
    return () => unsub();
  }, []);
  const tabState = tabNavRef.current?.getState?.();
  const tabNavigation = tabNavRef.current ?? null;

  // Content zoom-pop on every navigation (mirrors the zoom-in-95 tab content).
  // Style-only wrapper: never remounts the navigator, just plays scale+fade.
  const popAnim = useRef(new Animated.Value(1)).current;
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    popAnim.setValue(0);
    Animated.timing(popAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [pathname, popAnim]);
  const popScale = popAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });
  const popOpacity = popAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <View style={{ flex: 1 }}>
      {/* Only screen content pops — the tab bar lives outside this wrapper. */}
      <Animated.View
        style={{ flex: 1, transform: [{ scale: popScale }], opacity: popOpacity }}
      >
      <SwipeableTabs
        tabBarPosition="bottom"
        tabBar={(props: any) => {
          tabNavRef.current = props.navigation;
          return null;
        }}
        screenOptions={{ 
          headerShown: false,
          swipeEnabled: false,
          // Kill the pager's horizontal slide (it fought the pop and janked);
          // tab switches are instant and the zoom-pop wrapper owns the motion.
          animationEnabled: false,
        }}
      >
        <SwipeableTabs.Screen name="dashboard" />
        <SwipeableTabs.Screen name="trends" />
        <SwipeableTabs.Screen name="explore" />
        <SwipeableTabs.Screen name="profile" />
        <SwipeableTabs.Screen name="wrap-up" />
        <SwipeableTabs.Screen name="recipes" />
        <SwipeableTabs.Screen name="exercises" />
      </SwipeableTabs>
      </Animated.View>

      {/* Floating pill bar: static during screen pops, overlays the bottom. */}
      {tabNavigation && tabState && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <CustomTabBar
            state={tabState}
            navigation={tabNavigation}
            splitOpen={splitOpen}
            onFabPress={() => setSplitOpen((prev) => !prev)}
            onCloseSplit={() => setSplitOpen(false)}
          />
        </View>
      )}

      <SplitRecordActions
        open={splitOpen}
        onClose={() => setSplitOpen(false)}
        onOpenQuickLog={() => setShowQuickLogModal(true)}
        onOpenSleepLog={() => setShowMissionModal("sleep")}
        onOpenMealLog={() => setShowMissionModal("meals")}
      />

      <QuickLogModal
        visible={showQuickLogModal}
        onClose={() => setShowQuickLogModal(false)}
      />

      <MissionLogModal
        mission={showMissionModal}
        userId={userId}
        token={token}
        onClose={() => setShowMissionModal(null)}
        onSaved={() => setShowMissionModal(null)}
        onOpenDiary={() => {}}
      />
    </View>
  );
}