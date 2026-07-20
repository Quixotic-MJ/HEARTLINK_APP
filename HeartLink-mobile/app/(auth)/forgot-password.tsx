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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const base_url = process.env.EXPO_PUBLIC_API_URL;

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
        className="flex-1 ml-3 text-[14px] text-slate-900 dark:text-white dark:text-slate-900 h-full"
      />
    </View>
  );
}

// ─── Forgot Password Screen ───────────────────────────────────────────────────

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReset = async () => {
    setError(null);
    if (!identifier) {
      setError("Please enter your email or phone number.");
      return;
    }

    setIsSubmitting(true);

    let finalIdentifier = identifier.trim();
    if (/^\d+$/.test(finalIdentifier)) {
      if (finalIdentifier.startsWith("0")) {
        finalIdentifier = finalIdentifier.substring(1);
      }
      if (!finalIdentifier.startsWith("+63")) {
        finalIdentifier = `+63${finalIdentifier}`;
      }
    }

    try {
      const response = await fetch(`${base_url}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: finalIdentifier }),
      });
      const data = await response.json();

      if (response.ok) {
        console.log("=====================================");
        console.log("TEMP PASS RECEIVED:", data.temp_password);
        console.log("=====================================");
        
        Alert.alert(
          "Link Sent",
          "If this account is registered, you will receive reset instructions shortly.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        setError(data.detail || "Account not found.");
      }
    } catch (err) {
      console.log(err);
      setError("An error occurred. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
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
          <Text className="text-[16px] text-slate-900 dark:text-white dark:text-slate-900 tracking-tight" style={{ fontWeight: "300" }}>
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
              Forgot{"\n"}password?
            </Text>
            <Text className="text-[13px] text-slate-400 leading-relaxed">
              Enter your email or phone number to receive a temporary password.
            </Text>
          </View>

          {/* ── Card ── */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 px-5 py-6 gap-3">
            {error && (
              <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex-row items-center gap-2 mb-1">
                <Feather name="alert-triangle" size={16} color="#ef4444" />
                <Text className="text-red-600 dark:text-red-400 text-[13px] flex-1">
                  {error}
                </Text>
              </View>
            )}

            {/* Identifier Section */}
            <View>
              <Text className="text-[14px] font-semibold text-slate-900 dark:text-white mb-2 ml-1">Email or Phone number</Text>
              <InputField
                icon="user"
                placeholder="Email or Phone"
                value={identifier}
                onChangeText={(t) => {
                  setIdentifier(t);
                  setError(null);
                }}
                keyboardType="default"
              />
            </View>

            {/* Divider */}
            <View className="h-px bg-slate-100 dark:bg-slate-800 my-1 mt-2" />

            {/* Submit */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleReset}
              disabled={isSubmitting}
              className={`w-full bg-slate-900 dark:bg-slate-100 rounded-2xl py-3.5 flex-row justify-center items-center gap-2 ${isSubmitting ? 'opacity-80' : ''}`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text className="text-white dark:text-slate-900 text-[14px] font-medium">
                    Reset Password
                  </Text>
                  <Feather name="arrow-right" size={15} color="#fff" />
                </>
              )}
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
