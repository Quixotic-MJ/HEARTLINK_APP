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
import { Tabs } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Bottom Sheet Component ─────────────────────────────────────────────────
function RecordBottomSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 22,
        stiffness: 260,
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

  const options = [
    {
      icon: "camera" as const,
      iconType: "feather",
      label: "Scan Food Barcode",
      subtitle: "Use your camera to scan product barcodes",
      color: "#1e4ed8",
      bgColor: "#eff6ff",
      borderColor: "#dbeafe",
    },
    {
      icon: "silverware-fork-knife" as const,
      iconType: "material",
      label: "Log Meal Manually",
      subtitle: "Search and log what you ate today",
      color: "#059669",
      bgColor: "#ecfdf5",
      borderColor: "#d1fae5",
    },
    {
      icon: "clipboard" as const,
      iconType: "feather",
      label: "Log Daily Symptoms",
      subtitle: "Record how you're feeling right now",
      color: "#d97706",
      bgColor: "#fffbeb",
      borderColor: "#fef3c7",
    },
  ];

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
        style={{
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.5)",
          opacity: backdropAnim,
        }}
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
          backgroundColor: "#ffffff",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingTop: 12,
          paddingBottom: Platform.OS === "ios" ? 40 : 28,
          paddingHorizontal: 24,
          transform: [{ translateY: slideAnim }],
          // Shadow
          ...Platform.select({
            ios: {
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: -6 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
            },
            android: {
              elevation: 24,
            },
          }),
        }}
      >
        {/* Drag Handle */}
        <View
          style={{
            alignSelf: "center",
            width: 40,
            height: 4,
            backgroundColor: "#e2e8f0",
            borderRadius: 2,
            marginBottom: 20,
          }}
        />

        {/* Title */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: "900",
            color: "#0f172a",
            letterSpacing: -0.5,
            marginBottom: 6,
          }}
        >
          Quick Record
        </Text>
        <Text
          style={{
            fontSize: 13.5,
            fontWeight: "500",
            color: "#94a3b8",
            marginBottom: 24,
          }}
        >
          What would you like to log?
        </Text>

        {/* Options */}
        {options.map((option, index) => (
          <TouchableOpacity
            key={option.label}
            activeOpacity={0.7}
            onPress={() => {
              // TODO: Navigate to the respective screen
              animateOut();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: option.bgColor,
              borderRadius: 20,
              padding: 18,
              marginBottom: index < options.length - 1 ? 12 : 0,
              borderWidth: 1,
              borderColor: option.borderColor,
            }}
          >
            {/* Icon */}
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: "#ffffff",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
                ...Platform.select({
                  ios: {
                    shadowColor: option.color,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.12,
                    shadowRadius: 6,
                  },
                  android: {
                    elevation: 3,
                  },
                }),
              }}
            >
              {option.iconType === "feather" ? (
                <Feather
                  name={option.icon as any}
                  size={22}
                  color={option.color}
                />
              ) : (
                <MaterialCommunityIcons
                  name={option.icon as any}
                  size={22}
                  color={option.color}
                />
              )}
            </View>

            {/* Label & Subtitle */}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: "#0f172a",
                  letterSpacing: -0.3,
                  marginBottom: 3,
                }}
              >
                {option.label}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "500",
                  color: "#64748b",
                  lineHeight: 16,
                }}
              >
                {option.subtitle}
              </Text>
            </View>

            {/* Arrow */}
            <Feather name="chevron-right" size={20} color="#cbd5e1" />
          </TouchableOpacity>
        ))}

        {/* Cancel */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={animateOut}
          style={{
            marginTop: 16,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 14,
            backgroundColor: "#f8fafc",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#f1f5f9",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#94a3b8",
            }}
          >
            Cancel
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ─── Custom Tab Bar ─────────────────────────────────────────────────────────
function CustomTabBar({
  state,
  descriptors,
  navigation,
  onFabPress,
}: any) {
  const insets = useSafeAreaInsets();

  const tabs = [
    { name: "dashboard", label: "Home", icon: "home", type: "feather" },
    { name: "recipes", label: "Recipes", icon: "silverware-fork-knife", type: "material" },
    {
      name: "record",
      label: "Record",
      icon: "plus",
      type: "feather",
      isFab: true,
    },
    { name: "exercises", label: "Exercises", icon: "activity", type: "feather" },
    { name: "wrap-up", label: "Wrap-Up", icon: "calendar", type: "feather" },
  ];

  return (
    <View
      style={{
        position: "absolute",
        bottom: Math.max(insets.bottom, 0),
        left: 0,
        right: 0,
        height: 76,
        backgroundColor: "white",
        borderRadius: 0,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 2,
        ...Platform.select({
          ios: {
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
          },
          android: {
            elevation: 12,
          },
        }),
      }}
    >
      {tabs.map((tab) => {
        const routeIndex = state.routes.findIndex(
          (r: any) => r.name === tab.name
        );
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

        // Center FAB button
        if (tab.isFab) {
          return (
            <View
              key={tab.name}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.8}
                style={{
                  position: "absolute",
                  top: -34,
                  width: 64,
                  height: 64,
                  backgroundColor: "#1e4ed8",
                  borderRadius: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 6,
                  borderColor: "white",
                  ...Platform.select({
                    ios: {
                      shadowColor: "#1e3a8a",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                    },
                    android: {
                      elevation: 6,
                    },
                  }),
                }}
              >
                <Feather name="plus" size={26} color="white" />
              </TouchableOpacity>
            </View>
          );
        }

        // Regular tab button
        const color = isFocused ? "#1e4ed8" : "#94a3b8";

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            {tab.type === "feather" ? (
              <Feather name={tab.icon as any} size={24} color={color} />
            ) : (
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={24}
                color={color}
              />
            )}
            <Text
              style={{
                fontSize: 9,
                marginTop: 4,
                color: isFocused ? "#1e4ed8" : "#94a3b8",
                fontWeight: isFocused ? "700" : "500",
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

// ─── Tabs Layout ────────────────────────────────────────────────────────────
export default function TabsLayout() {
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar
            {...props}
            onFabPress={() => setSheetVisible(true)}
          />
        )}
        screenOptions={{
          headerShown: false,
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
