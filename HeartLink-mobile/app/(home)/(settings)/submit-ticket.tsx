import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Platform, ActivityIndicator, Alert } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import Constants from "expo-constants";

const CATEGORIES = [
  { id: "Bug Report", label: "Report a Bug", icon: "alert-triangle" },
  { id: "UI/UX Suggestion", label: "Suggestion", icon: "message-square" },
  { id: "Account Issue", label: "Account Issue", icon: "user" },
  { id: "Question", label: "General Question", icon: "help-circle" },
];

export default function SubmitTicketScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
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
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000");
      const apiUrl = `${baseUrl}/api/feedback`;
        
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const effectiveToken = token || "";

      const res = await fetch(apiUrl, {
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
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={() => router.back()}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[18px] font-semibold text-slate-900 dark:text-white tracking-tight">
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
        <Text className="text-[20px] font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight">
          Share your experience
        </Text>
        <Text className="text-[14px] text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Select a feedback category and describe your suggestion or the issue you encountered.
        </Text>

        {/* Category Selection */}
        <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 px-1">
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
              className={`flex-row items-center px-4 py-2.5 rounded-2xl border ${
                category === cat.id 
                  ? "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700" 
                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
              }`}
            >
              <Feather 
                name={cat.icon as any} 
                size={14} 
                color={category === cat.id ? "#2563eb" : isDark ? "#94a3b8" : "#64748b"} 
              />
              <Text 
                className={`ml-2 text-[13px] font-semibold ${
                  category === cat.id ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description Input */}
        <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
          Details
        </Text>
        <View className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm shadow-slate-100 dark:shadow-none p-4 mb-2">
          <TextInput
            className="min-h-[160px] text-[15px] text-slate-900 dark:text-white"
            placeholder="Please describe the issue or your suggestion in detail..."
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>
        <Text className="text-[11px] text-slate-400 px-1 mb-8">
          Basic device metadata (OS platform, version) is automatically attached to assist troubleshooting.
        </Text>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting || !description.trim()}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Send Feedback button"
          className={`h-13 rounded-2xl flex-row items-center justify-center shadow-sm ${
            isSubmitting || !description.trim()
              ? "bg-slate-300 dark:bg-slate-800"
              : "bg-slate-900 dark:bg-blue-600"
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Feather name="send" size={16} color="white" />
              <Text className="text-white text-[15px] font-semibold ml-2">Send Feedback</Text>
            </>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
