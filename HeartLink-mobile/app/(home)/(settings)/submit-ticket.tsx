import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Platform, ActivityIndicator, Alert } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import Constants from "expo-constants";

const CATEGORIES = [
  { id: "Bug Report", label: "Report a Bug", icon: "alert-triangle" },
  { id: "UI/UX Suggestion", label: "Suggestion", icon: "message-square" },
  { id: "Account Issue", label: "Account Issue", icon: "user" },
  { id: "Question", label: "Question", icon: "help-circle" },
];

export default function SubmitTicketScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const initialCategory = params.category as string || "Bug Report";

  const [category, setCategory] = useState(initialCategory);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, userId } = useUser();

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert("Error", "Please provide a description so we can help you better.");
      return;
    }

    setIsSubmitting(true);

    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? "http://10.0.2.2:8000" : "http://localhost:8000");
      const apiUrl = `${baseUrl}/api/feedback`;
        
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(userId ? { "Authorization": `Bearer ${userId}` } : {})
        },
        body: JSON.stringify({
          category: category,
          fullMessage: description,
          deviceMeta: {
            os: Platform.OS,
            model: "Mobile Device", // requires 'expo-device' to get actual hardware model
            appVersion: Constants.expoConfig?.version || "1.0.0"
          },
          user: user?.displayName || user?.name || "Anonymous User",
          userEmail: user?.email || "Not Provided",
          userId: userId || "N/A"
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        Alert.alert(
          "Success",
          "Your feedback has been submitted successfully. Our team will look into it!",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        throw new Error("Failed to submit");
      }
    } catch (err) {
      console.error("Submit error:", err);
      Alert.alert("Error", "Could not submit feedback at this time. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
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
        <Text className="text-[17px] font-medium text-slate-900 dark:text-white">Submit Feedback</Text>
      </View>

      <KeyboardAwareScrollView 
        className="flex-1"
        contentContainerClassName="px-5 py-6 pb-12" 
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
        
        <Text className="text-[20px] font-semibold text-slate-900 dark:text-white mb-2">
            How can we help?
          </Text>
          <Text className="text-[14px] text-slate-500 dark:text-slate-400 mb-6">
            Please select a category and provide as much detail as possible.
          </Text>

          {/* Category Selection */}
          <Text className="text-[13px] font-semibold text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-3">
            Category
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                className={`flex-row items-center px-4 py-2.5 rounded-xl border ${
                  category === cat.id 
                    ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800" 
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                }`}
              >
                <Feather 
                  name={cat.icon as any} 
                  size={14} 
                  color={category === cat.id ? "#3b82f6" : isDark ? "#94a3b8" : "#64748b"} 
                />
                <Text 
                  className={`ml-2 text-[14px] font-medium ${
                    category === cat.id ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description Input */}
          <Text className="text-[13px] font-semibold text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-3">
            Description
          </Text>
          <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
            <TextInput
              className="min-h-[160px] p-4 text-[15px] text-slate-900 dark:text-white"
              placeholder="Please describe the issue or your suggestion in detail..."
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              multiline
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>
          <Text className="text-[12px] text-slate-400 dark:text-slate-500 mt-2 mb-8">
            Device info (OS, App Version) will be automatically attached to help us diagnose the issue.
          </Text>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`h-14 rounded-2xl flex-row items-center justify-center shadow-md shadow-blue-500/20 ${
              isSubmitting ? "bg-blue-400 dark:bg-blue-600/50" : "bg-blue-500 dark:bg-blue-600"
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Feather name="send" size={18} color="white" />
                <Text className="text-white text-[16px] font-semibold ml-2">Submit Ticket</Text>
              </>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </SafeAreaView>
  );
}
