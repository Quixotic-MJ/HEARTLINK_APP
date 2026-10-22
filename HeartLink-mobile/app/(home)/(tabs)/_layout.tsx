import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { withLayoutContext, usePathname, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { createMaterialTopTabNavigator } from "expo-router/js-top-tabs";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDs } from "../../../components/onboarding/useDs";
import {
  SplitRecordActions,
} from "../../../components/tabs/SplitRecordActions";
import { QuickLogModal } from "../../../components/exercise/QuickLogModal";
import { MissionLogModal } from "../../../components/dashboard/MissionLogModal";
import { LogMealSheet } from "../../../components/dashboard/LogMealSheet";
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
  onPress,
  children,
}: {
  focused: boolean;
  label: string;
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
  
  const { c } = useDs();
  const activeColor = c.ink;
  const inactiveColor = c.steel;

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
        <Text maxFontSizeMultiplier={1.3}
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
  const { c } = useDs();

  const INACTIVE_COLOR = c.steel;
  const ACTIVE_COLOR = c.ink;

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
        backgroundColor: c.canvas,
        flexDirection: "row",
        alignItems: "center",
        height: 60 + bottomPad,
        paddingBottom: bottomPad,
        paddingTop: 4,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        borderTopColor: c.hairline,
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
                  backgroundColor: c.primary,
                  borderWidth: 3,
                  borderColor: c.canvas,
                  alignItems: "center",
                  justifyContent: "center",
                  // Design-system "card" shadow (level 2), just enough to lift it off the bar.
                  ...Platform.select({
                    ios: {
                      shadowColor: "#0f0f0f",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.08,
                      shadowRadius: 12,
                    },
                    android: { elevation: 4 },
                  }),
                }}
              >
                <Animated.View style={{ transform: [{ rotate: fabRotate }] }}>
                  <Feather name="plus" size={26} color={c.onPrimary} />
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
  const router = useRouter();
  const { userId, token } = useUser();
  // The meal sheet's sodium line and meal count come from the dashboard's cached data.
  const queryClient = useQueryClient();
  const dashboard = queryClient.getQueryData<{
    nutrition_budget?: { sodium?: { consumed_mg?: number; limit_mg?: number | null } };
    today_activity?: { total_sodium_mg?: number; meals_count?: number };
  }>(["dashboard", userId]);
  const sodiumTodayMg = dashboard?.nutrition_budget?.sodium?.consumed_mg ?? dashboard?.today_activity?.total_sodium_mg ?? 0;
  const sodiumLimitMg = dashboard?.nutrition_budget?.sodium?.limit_mg || 2000;

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
        <SwipeableTabs.Screen name="consultation-summary" />
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
        mission={showMissionModal === "meals" ? null : showMissionModal}
        userId={userId}
        token={token}
        onClose={() => setShowMissionModal(null)}
        onSaved={() => setShowMissionModal(null)}
      />

      <LogMealSheet
        visible={showMissionModal === "meals"}
        userId={userId}
        token={token}
        sodiumLeftMg={sodiumLimitMg - sodiumTodayMg}
        mealsToday={dashboard?.today_activity?.meals_count || 0}
        onClose={() => setShowMissionModal(null)}
        onOpenDiary={() => {
          setShowMissionModal(null);
          router.push("/(home)/(meals)/food-diary");
        }}
      />
    </View>
  );
}
