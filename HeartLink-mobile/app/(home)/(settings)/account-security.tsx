import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export default function AccountSecurityScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId, logout } = useUser();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast({ title: "Error", message: "Please fill in all fields.", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast({ title: "Error", message: "New passwords do not match.", type: "error" });
      return;
    }
    setIsUpdating(true);
    try {
      const response = await fetch(`${base_url}/api/users/${userId}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        showToast({ title: "Error", message: data.detail || "Failed to update password.", type: "error" });
      } else {
        showToast({ title: "Success", message: "Password updated successfully.", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      showToast({ title: "Error", message: "An unexpected error occurred.", type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you absolutely sure? This action cannot be undone and will permanently delete your health data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${base_url}/api/users/${userId}`, { method: "DELETE" });
              if (res.ok) {
                logout();
                router.replace("/(auth)/welcome");
              } else {
                showToast({ title: "Error", message: "Failed to delete account.", type: "error" });
              }
            } catch (err) {
              showToast({ title: "Error", message: "An unexpected error occurred.", type: "error" });
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[17px] font-medium text-slate-900 dark:text-white">Account security</Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-16" showsVerticalScrollIndicator={false}>
        <Text className="text-[14px] text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Manage your password and security preferences to keep your health data safe.
        </Text>

        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-6">
          <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-4">Change Password</Text>
          
          <View className="mb-4">
            <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Current Password</Text>
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 h-12">
              <Feather name="lock" size={16} color="#64748b" />
              <TextInput 
                className="flex-1 ml-3 text-[15px] text-slate-900 dark:text-white"
                style={{ paddingVertical: 0 }}
                placeholder="Enter current password"
                secureTextEntry
                placeholderTextColor="#94a3b8"
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">New Password</Text>
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 h-12">
              <Feather name="key" size={16} color="#64748b" />
              <TextInput 
                className="flex-1 ml-3 text-[15px] text-slate-900 dark:text-white"
                style={{ paddingVertical: 0 }}
                placeholder="Enter new password"
                secureTextEntry
                placeholderTextColor="#94a3b8"
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Confirm New Password</Text>
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 h-12">
              <Feather name="check-circle" size={16} color="#64748b" />
              <TextInput 
                className="flex-1 ml-3 text-[15px] text-slate-900 dark:text-white"
                style={{ paddingVertical: 0 }}
                placeholder="Confirm new password"
                secureTextEntry
                placeholderTextColor="#94a3b8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
          </View>

          <TouchableOpacity 
            className="bg-slate-900 h-12 rounded-xl items-center justify-center mt-2 flex-row gap-2"
            onPress={handleUpdatePassword}
            disabled={isUpdating}
            style={{ opacity: isUpdating ? 0.7 : 1 }}
          >
            {isUpdating ? <ActivityIndicator color="#fff" size="small" /> : null}
            <Text className="text-white font-medium text-[15px]">Update Password</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View className="mt-8">
          <Text className="text-[14px] font-medium text-red-500 mb-4 ml-1 uppercase tracking-wider">Danger Zone</Text>
          <View className="bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-900/50 p-4">
            <Text className="text-[15px] font-medium text-red-700 dark:text-red-400 mb-2">Delete Account</Text>
            <Text className="text-[13px] text-red-600/80 dark:text-red-400/80 mb-4 leading-relaxed">
              Once you delete your account, there is no going back. Please be certain.
            </Text>
            
            <TouchableOpacity 
              onPress={handleDeleteAccount}
              activeOpacity={0.8}
              className="bg-red-100 dark:bg-red-900/50 h-12 rounded-xl items-center justify-center border border-red-200 dark:border-red-800"
            >
              <Text className="text-red-700 dark:text-red-400 font-medium text-[15px]">Delete my account</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
