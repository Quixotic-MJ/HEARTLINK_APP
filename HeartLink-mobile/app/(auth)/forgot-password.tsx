import { useColorScheme } from "nativewind";
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
    <View className="w-full bg-background border border-border rounded-2xl flex-row items-center px-4 min-h-[52px]">
      <Feather name={icon as any} size={18} className="text-muted-foreground" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "none"}
        className="flex-1 ml-3 text-base text-foreground py-3.5"
      />
    </View>
  );
}

// ─── Forgot Password Screen ───────────────────────────────────────────────────

export default function ForgotPasswordScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
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
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row items-center px-6 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 mr-4"
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={24} className="text-foreground" />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full items-center justify-center border border-border bg-card">
            <Feather name="heart" size={14} className="text-foreground" />
          </View>
          <Text className="text-base text-foreground tracking-tight" style={{ fontWeight: "300" }}>
            Heart<Text style={{ fontWeight: "600" }}>Link.</Text>
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
          contentContainerClassName="flex-grow px-6 pt-4 pb-12"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Heading ── */}
          <View className="mb-8 mt-2">
            <Text className="text-3xl font-semibold text-foreground tracking-tight leading-tight mb-2" accessibilityRole="header">
              Forgot password?
            </Text>
            <Text className="text-sm text-muted-foreground leading-relaxed">
              Enter your email or phone number to receive a temporary password.
            </Text>
          </View>

          {/* ── Card ── */}
          <View className="bg-card rounded-3xl border border-border px-5 py-7 gap-5">
            {error && (
              <View className="bg-destructive/10 border border-destructive/30 rounded-2xl p-3.5 flex-row items-center gap-2 mt-1" accessible={true} accessibilityRole="alert">
                <Feather name="alert-triangle" size={16} className="text-destructive" />
                <Text className="text-destructive text-sm flex-1 font-medium">
                  {error}
                </Text>
              </View>
            )}

            {/* Identifier Section */}
            <View>
              <Text className="text-sm font-semibold text-foreground mb-2 ml-1">Email or Phone number</Text>
              <InputField
                icon="user"
                placeholder="john@example.com or +63..."
                value={identifier}
                onChangeText={(t) => {
                  setIdentifier(t);
                  setError(null);
                }}
                keyboardType="default"
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleReset}
              disabled={isSubmitting}
              className={`w-full bg-primary rounded-2xl py-4 flex-row justify-center items-center gap-2 ${isSubmitting ? 'opacity-80' : ''}`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="unlock" size={16} className="text-primary-foreground" />
                  <Text className="text-primary-foreground text-sm font-semibold">
                    Reset Password
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
