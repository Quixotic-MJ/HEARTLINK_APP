import React, { useState } from "react";
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
import { useRouter } from "expo-router";
import "../../global.css";

const base_url = process.env.EXPO_PUBLIC_API_URL;

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
      className="w-full bg-slate-50 dark:bg-slate-950 rounded-2xl flex-row items-center px-4"
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
        className="flex-1 ml-3 text-[14px] text-slate-900 dark:text-white dark:text-slate-900 h-full"
      />
      {rightElement}
    </View>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    console.log("Logging in:", email, password);
    try {
      const response = await fetch(`${base_url}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        router.replace("/(home)/(tabs)/dashboard");
        console.log(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      edges={["top"]}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 dark:bg-slate-100 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <View className="w-7 h-7 rounded-full items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:bg-slate-100">
            <Feather name="heart" size={13} color="#0f172a" />
          </View>
          <Text
            className="text-[16px] text-slate-900 dark:text-white dark:text-slate-900 tracking-tight"
            style={{ fontWeight: "300" }}
          >
            Heart<Text style={{ fontWeight: "600" }}>Link.</Text>
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
            <Text className="text-[28px] font-medium text-slate-900 dark:text-white dark:text-slate-900 tracking-tight leading-tight mb-2">
              Welcome{"\n"}back.
            </Text>
            <Text className="text-[13px] text-slate-400 leading-relaxed">
              Log in to access your cardiovascular dashboard.
            </Text>
          </View>

          {/* ── Card ── */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 px-5 py-6 gap-3">
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
                  <TouchableOpacity
                    onPress={() => setShowPassword((p) => !p)}
                    className="p-1 ml-1"
                  >
                    <Feather
                      name={showPassword ? "eye" : "eye-off"}
                      size={16}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                }
              />
              <TouchableOpacity
                className="self-end"
                onPress={() => router.push("/(auth)/forgot-password")}
              >
                <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

            {/* Submit */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSubmit}
              className="w-full bg-slate-900 dark:bg-slate-100 rounded-2xl py-3.5 flex-row justify-center items-center gap-2"
            >
              <Text className="text-white dark:text-slate-900 text-[14px] font-medium">
                Log in
              </Text>
              <Feather name="arrow-right" size={15} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* ── Mode toggle ── */}
          <TouchableOpacity
            activeOpacity={0.65}
            onPress={() => router.push("/(auth)/register")}
            className="flex-row justify-center items-center py-5 gap-1 mt-auto"
          >
            <Text className="text-[13px] text-slate-400">
              Don't have an account?
            </Text>
            <Text className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
              Sign up
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
