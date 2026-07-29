import React, { useRef, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Linking, Animated, Alert, ActivityIndicator } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useToast } from "../../../contexts/ToastContext";

export default function AboutScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { showToast } = useToast();
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  // Pulse Animation
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim]);

  const handleCheckUpdates = () => {
    setIsCheckingUpdates(true);
    setTimeout(() => {
      setIsCheckingUpdates(false);
      showToast({ title: "Up to Date", message: "You are running the latest version of HeartLink (1.0.0).", type: "success" });
    }, 2000);
  };

  const openURL = (path: string) => {
    Linking.openURL(`https://heartlink.com/${path}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[17px] font-medium text-slate-900 dark:text-white">About HeartLink</Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-8 pb-16" showsVerticalScrollIndicator={false}>
        
        <View className="items-center mb-8 pt-4">
          <Animated.View 
            style={{ transform: [{ scale: scaleAnim }] }}
            className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-900 items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm shadow-slate-200/50 mb-4"
          >
            <Feather name="heart" size={36} color={isDark ? "#f1f5f9" : "#0f172a"} />
          </Animated.View>
          <Text className="text-[28px] font-semibold text-slate-900 dark:text-white tracking-tight mt-2">
            Heart<Text style={{ fontWeight: "300" }}>Link.</Text>
          </Text>
          <Text className="text-[15px] font-medium text-slate-500 dark:text-slate-400 mt-1">Version 1.0.0</Text>
        </View>

        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 px-2 mb-6 shadow-sm shadow-slate-200/50">
          <TouchableOpacity 
            onPress={() => openURL("terms")}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800"
          >
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white">Terms of Service</Text>
            <Feather name="external-link" size={16} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => openURL("privacy")}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800"
          >
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white">Privacy Policy</Text>
            <Feather name="external-link" size={16} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => openURL("licenses")}
            className="flex-row items-center justify-between p-4"
          >
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white">Open Source Licenses</Text>
            <Feather name="external-link" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={handleCheckUpdates}
          disabled={isCheckingUpdates}
          className="bg-slate-900 dark:bg-blue-600 rounded-xl py-4 flex-row justify-center items-center mb-6"
        >
          {isCheckingUpdates ? (
            <>
              <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
              <Text className="text-[16px] font-medium text-white">Checking for updates...</Text>
            </>
          ) : (
            <Text className="text-[16px] font-medium text-white">Check for Updates</Text>
          )}
        </TouchableOpacity>

        <Text className="text-[13px] text-slate-400 text-center px-4 leading-relaxed mt-2">
          HeartLink is dedicated to helping individuals manage cardiovascular health proactively through data tracking and meaningful insights.
        </Text>
        <Text className="text-[12px] text-slate-400 text-center mt-6 mb-10">
          © 2026 HeartLink Inc. All rights reserved.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}
