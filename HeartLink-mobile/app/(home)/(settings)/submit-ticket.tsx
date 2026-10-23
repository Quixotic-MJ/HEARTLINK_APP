import { useDs } from "../../../components/onboarding/useDs";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import DsButton from "../../../components/onboarding/DsButton";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Platform } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import Constants from "expo-constants";
import { apiFetch } from "../../../lib/api";

const CATEGORIES = [
  { id: "Bug Report", label: "Report a Bug", icon: "alert-triangle" },
  { id: "UI/UX Suggestion", label: "Suggestion", icon: "message-square" },
  { id: "Account Issue", label: "Account Issue", icon: "user" },
  { id: "Question", label: "General Question", icon: "help-circle" },
];

export default function SubmitTicketScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  
  const initialCategory = params.category as string || "Bug Report";

  const [category, setCategory] = useState(initialCategory);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, userId, token } = useUser();

  const handleSubmit = async () => {
    if (!description.trim()) {
      showToast({ title: "Description Required", message: "Please provide details so our team can assist you.", type: "error" });
      return;
    }

    setIsSubmitting(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const effectiveToken = token || "";

      const res = await apiFetch("/api/feedback", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(effectiveToken ? { "Authorization": `Bearer ${effectiveToken}` } : {})
        },
        body: JSON.stringify({
          category: category,
          fullMessage: description,
          deviceMeta: {
            os: Platform.OS,
            model: "Mobile Device",
            appVersion: Constants.expoConfig?.version || "1.0.0"
          },
          user: user?.displayName || user?.name || "Patient User",
          userEmail: user?.email || "Not Provided",
          userId: userId || "N/A"
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        showToast({ title: "Feedback Sent", message: "Thank you! Your feedback has been received.", type: "success" });
        router.back();
      } else {
        throw new Error("Failed to submit feedback");
      }
    } catch (err) {
      showToast({ title: "Submission Error", message: "Could not send feedback at this time. Please try again later.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-ds-canvas" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-ds-hairline bg-ds-canvas" style={{ gap: 12 }}>
        <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink flex-1" numberOfLines={1}>
          Send Feedback
        </Text>
      </View>

      <KeyboardAwareScrollView 
        className="flex-1"
        contentContainerClassName="px-5 py-6 pb-20" 
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
        <Text className="text-[20px] font-semibold text-ds-ink mb-1.5 tracking-tight">
          Share your experience
        </Text>
        <Text className="text-[15px] text-ds-slate mb-6 leading-relaxed">
          Select a feedback category and describe your suggestion or the issue you encountered.
        </Text>

        {/* Category Selection */}
        <Text className="text-[14px] font-medium text-ds-ink mb-2.5">
          Topic / Category
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setCategory(cat.id)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Category ${cat.label}`}
              accessibilityState={{ selected: category === cat.id }}
              className="flex-row items-center px-4 rounded-full border"
              style={{ minHeight: 44, backgroundColor: category === cat.id ? (isDark ? c.ink : "#000000") : c.canvas, borderColor: category === cat.id ? (isDark ? c.ink : "#000000") : c.hairline }}
            >
              <Feather 
                name={cat.icon as any} 
                size={14} 
                color={category === cat.id ? c.canvas : c.charcoal} 
              />
              <Text 
                style={{ marginLeft: 8, fontSize: 14, fontWeight: "500", color: category === cat.id ? c.canvas : c.charcoal }}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description Input */}
        <Text className="text-[14px] font-medium text-ds-ink mb-2">
          Details
        </Text>
        <View className="bg-ds-canvas border border-ds-hairline-strong rounded-lg overflow-hidden p-4 mb-2">
          <TextInput
            className="min-h-[160px] text-[16px] text-ds-ink"
            placeholder="Please describe the issue or your suggestion in detail..."
            placeholderTextColor={c.steel}
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>
        <Text className="text-[13px] text-ds-steel px-1 mb-8">
          Basic device metadata (OS platform, version) is automatically attached to assist troubleshooting.
        </Text>

        {/* Submit Button */}
        <DsButton
          label="Send Feedback"
          onPress={handleSubmit}
          disabled={!description.trim()}
          loading={isSubmitting}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
