import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import "../../global.css";

// ─── Input Field ──────────────────────────────────────────────────────────────

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  rightElement,
}: {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
  rightElement?: React.ReactNode;
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
        secureTextEntry={secureTextEntry}
        className="flex-1 ml-3 text-[14px] text-slate-900 h-full"
      />
      {rightElement}
    </View>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams();

  const [isLoginMode, setIsLoginMode] = useState(mode !== "register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (mode === "login") setIsLoginMode(true);
    else if (mode === "register") setIsLoginMode(false);
  }, [mode]);

  const toggleMode = () => {
    setIsLoginMode((p) => !p);
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = () => {
    if (isLoginMode) {
      console.log("Logging in:", email, password);
    } else {
      console.log("Registering:", email, password, confirmPassword);
    }
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
              {isLoginMode ? "Welcome\nback." : "Create your\naccount."}
            </Text>
            <Text className="text-[13px] text-slate-400 leading-relaxed">
              {isLoginMode
                ? "Log in to access your cardiovascular dashboard."
                : "Sign up to track and monitor your heart health journey."}
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

            {/* Password */}
            <View className="gap-1.5">
              <InputField
                icon="lock"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                rightElement={
                  <TouchableOpacity onPress={() => setShowPassword((p) => !p)} className="p-1 ml-1">
                    <Feather name={showPassword ? "eye" : "eye-off"} size={16} color="#94a3b8" />
                  </TouchableOpacity>
                }
              />
              {isLoginMode && (
                <TouchableOpacity className="self-end">
                  <Text className="text-[12px] font-medium text-slate-500">
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Confirm password (register only) */}
            {!isLoginMode && (
              <InputField
                icon="shield"
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                rightElement={
                  <TouchableOpacity onPress={() => setShowConfirmPassword((p) => !p)} className="p-1 ml-1">
                    <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={16} color="#94a3b8" />
                  </TouchableOpacity>
                }
              />
            )}

            {/* Divider */}
            <View className="h-px bg-slate-100 my-1" />

            {/* Submit */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSubmit}
              className="w-full bg-slate-900 rounded-2xl py-3.5 flex-row justify-center items-center gap-2"
            >
              <Text className="text-white text-[14px] font-medium">
                {isLoginMode ? "Log in" : "Create account"}
              </Text>
              <Feather name="arrow-right" size={15} color="#fff" />
            </TouchableOpacity>

          </View>

          {/* ── Mode toggle ── */}
          <TouchableOpacity
            activeOpacity={0.65}
            onPress={toggleMode}
            className="flex-row justify-center items-center py-5 gap-1 mt-auto"
          >
            <Text className="text-[13px] text-slate-400">
              {isLoginMode ? "Don't have an account?" : "Already have an account?"}
            </Text>
            <Text className="text-[13px] font-medium text-slate-700">
              {isLoginMode ? "Sign up" : "Log in"}
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <Text className="text-center text-[9px] tracking-widest text-slate-300 uppercase">
            CTU — Main Campus · Capstone 2026
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}