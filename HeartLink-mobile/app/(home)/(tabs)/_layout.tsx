import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Modal,
  Animated,
  Pressable,
  Dimensions,
} from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Record Options ───────────────────────────────────────────────────────────

const RECORD_OPTIONS = [
  {
    icon: "camera" as const,
    iconType: "feather" as const,
    label: "Scan food barcode",
    subtitle: "Use your camera to scan product barcodes",
    iconColor: "#185fa5",
    iconBg: "#e6f1fb",
    route: "/(home)/barcode-scan",
  },
  {
    icon: "silverware-fork-knife" as const,
    iconType: "material" as const,
    label: "Log meal manually",
    subtitle: "Search and log what you ate today",
    iconColor: "#3b6d11",
    iconBg: "#eaf3de",
    route: "/(home)/search-meal",
  },
  {
    icon: "clipboard" as const,
    iconType: "feather" as const,
    label: "Log daily vitals & symptoms",
    subtitle: "Record how you're feeling right now",
    iconColor: "#854f0b",
    iconBg: "#faeeda",
    route: "/(home)/log-symptoms",
  },
];

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────

function RecordBottomSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 24,
        stiffness: 280,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, backdropAnim]);

  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [slideAnim, backdropAnim, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={animateIn}
      onRequestClose={animateOut}
    >
      {/* Backdrop */}
      <Animated.View
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", opacity: backdropAnim }}
      >
        <Pressable style={{ flex: 1 }} onPress={animateOut} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#fff",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 12,
          paddingBottom: Platform.OS === "ios" ? 40 : 28 + insets.bottom,
          paddingHorizontal: 20,
          transform: [{ translateY: slideAnim }],
          ...Platform.select({
            ios: {
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 16,
            },
            android: { elevation: 20 },
          }),
        }}
      >
        {/* Drag handle */}
        <View
          style={{
            alignSelf: "center",
            width: 36,
            height: 4,
            backgroundColor: "#e2e8f0",
            borderRadius: 2,
            marginBottom: 20,
          }}
        />

        {/* Title */}
        <Text style={{ fontSize: 17, fontWeight: "500", color: "#0f172a", marginBottom: 4 }}>
          Quick record
        </Text>
        <Text style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
          What would you like to log?
        </Text>

        {/* Options */}
        {RECORD_OPTIONS.map((option, index) => (
          <TouchableOpacity
            key={option.label}
            activeOpacity={0.7}
            onPress={() => {
              if (option.route) {
                router.push(option.route as any);
              }
              animateOut();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 14,
              marginBottom: index < RECORD_OPTIONS.length - 1 ? 10 : 0,
              borderWidth: 0.5,
              borderColor: "#e2e8f0",
            }}
          >
            {/* Icon */}
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: option.iconBg,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              {option.iconType === "feather" ? (
                <Feather name={option.icon as any} size={18} color={option.iconColor} />
              ) : (
                <MaterialCommunityIcons name={option.icon as any} size={18} color={option.iconColor} />
              )}
            </View>

            {/* Text */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: "#0f172a", marginBottom: 2 }}>
                {option.label}
              </Text>
              <Text style={{ fontSize: 12, color: "#94a3b8", lineHeight: 16 }}>
                {option.subtitle}
              </Text>
            </View>

            <Feather name="chevron-right" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        ))}

        {/* Cancel */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={animateOut}
          style={{
            marginTop: 14,
            alignItems: "center",
            paddingVertical: 13,
            backgroundColor: "#f8fafc",
            borderRadius: 14,
            borderWidth: 0.5,
            borderColor: "#e2e8f0",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "500", color: "#94a3b8" }}>
            Cancel
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ─── Tab Config ───────────────────────────────────────────────────────────────

const TABS = [
  { name: "dashboard", label: "Home",      icon: "home",                  type: "feather"   },
  { name: "recipes",   label: "Recipes",   icon: "silverware-fork-knife", type: "material"  },
  { name: "record",    label: "Record",    icon: "plus",                  type: "feather", isFab: true },
  { name: "exercises", label: "Exercises", icon: "activity",              type: "feather"   },
  { name: "wrap-up",   label: "Wrap-Up",   icon: "calendar",              type: "feather"   },
] as const;

const ACTIVE_COLOR   = "#0f172a";
const INACTIVE_COLOR = "#cbd5e1";

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────

function CustomTabBar({ state, navigation, onFabPress }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: "#fff",
        flexDirection: "row",
        alignItems: "center",
        height: Platform.OS === "ios" ? 85 : 65 + insets.bottom,
        paddingBottom: Platform.OS === "ios" ? 20 : insets.bottom,
        borderTopWidth: 0.5,
        borderTopColor: "#e2e8f0",
        ...Platform.select({
          ios: {
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
          },
          android: { elevation: 8 },
        }),
      }}
    >
      {TABS.map((tab) => {
        const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
        const isFocused = state.index === routeIndex;

        const onPress = () => {
          if (tab.isFab) {
            onFabPress();
            return;
          }
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

        // FAB
        if (tab.isFab) {
          return (
            <View key={tab.name} style={{ flex: 1, alignItems: "center" }}>
              <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.8}
                style={{
                  position: "absolute",
                  top: -24,
                  width: 56,
                  height: 56,
                  backgroundColor: "#0f172a",
                  borderRadius: 28,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 4,
                  borderColor: "#fff",
                  ...Platform.select({
                    ios: {
                      shadowColor: "#0f172a",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                    },
                    android: { elevation: 0 },
                  }),
                }}
              >
                <Feather name="plus" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          );
        }

        // Regular tab
        const color = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 4,
            }}
          >
            {tab.type === "feather" ? (
              <Feather name={tab.icon as any} size={21} color={color} />
            ) : (
              <MaterialCommunityIcons name={tab.icon as any} size={21} color={color} />
            )}
            <Text
              style={{
                fontSize: 9,
                color,
                // Dynamic fontWeight via style — no dynamic className
                fontWeight: isFocused ? "600" : "400",
                letterSpacing: 0.2,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar {...props} onFabPress={() => setSheetVisible(true)} />
        )}
        screenOptions={{ 
          headerShown: false,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="recipes" />
        <Tabs.Screen name="record" />
        <Tabs.Screen name="exercises" />
        <Tabs.Screen name="wrap-up" />
      </Tabs>

      <RecordBottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </>
  );
}