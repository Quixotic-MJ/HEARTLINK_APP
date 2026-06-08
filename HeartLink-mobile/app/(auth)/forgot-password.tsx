import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// ─── Input Field ──────────────────────────────────────────────────────────────

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
}: {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <View
      className="w-full bg-slate-50 rounded-2xl flex-row items-center px-4"
      style={{ borderWidth: 1, borderColor: "#e2e8f0", height: 52 }}
    >
      <Feather name={icon as any} size={17} color="#94a3b8" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#cbd5e1"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "none"}
        className="flex-1 ml-3 text-[14px] text-slate-900 h-full"
      />
    </View>
  );
}

// ─── Forgot Password Screen ───────────────────────────────────────────────────

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");

  const handleReset = () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }
    // Simulate sending OTP or reset link
    Alert.alert(
      "Link Sent",
      "If this email is registered, you will receive reset instructions shortly.",
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <View className="w-7 h-7 bg-[#1e4ed8] rounded-lg items-center justify-center">
            <MaterialCommunityIcons name="heart-pulse" size={15} color="white" />
          </View>
          <Text className="text-[16px] font-medium text-slate-900 tracking-tight">
            HeartLink
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerClassName="flex-grow px-5 pt-4 pb-12"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Heading ── */}
          <View className="mb-7 mt-2">
            <Text className="text-[28px] font-medium text-slate-900 tracking-tight leading-tight mb-2">
              Forgot{"\n"}password?
            </Text>
            <Text className="text-[13px] text-slate-400 leading-relaxed">
              Enter your email address to receive password reset instructions.
            </Text>
          </View>

          {/* ── Card ── */}
          <View className="bg-white rounded-2xl border border-slate-200/70 px-5 py-6 gap-3">
            {/* Email */}
            <InputField
              icon="mail"
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            {/* Divider */}
            <View className="h-px bg-slate-100 my-1 mt-2" />

            {/* Submit */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleReset}
              className="w-full bg-slate-900 rounded-2xl py-3.5 flex-row justify-center items-center gap-2"
            >
              <Text className="text-white text-[14px] font-medium">
                Reset Password
              </Text>
              <Feather name="arrow-right" size={15} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text className="text-center text-[9px] tracking-widest text-slate-300 uppercase mt-auto">
            CTU — Main Campus · Capstone 2026
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
