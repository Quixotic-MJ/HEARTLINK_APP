import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export default function AccountSecurityScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId, token, logout } = useUser();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Password visibility
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteTypedText, setDeleteTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const hasUnsavedChanges = Boolean(currentPassword || newPassword || confirmPassword);

  const handleBackPress = () => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirm(true);
    } else {
      router.back();
    }
  };

  // Requirement checks
  const isMinLength = newPassword.length >= 6;
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;
  const isCurrentFilled = currentPassword.length > 0;
  const isFormValid = isMinLength && isMatching && isCurrentFilled;

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast({ title: "Missing Fields", message: "Please fill in all password fields.", type: "error" });
      return;
    }
    if (!isMinLength) {
      showToast({ title: "Weak Password", message: "New password must be at least 6 characters.", type: "error" });
      return;
    }
    if (!isMatching) {
      showToast({ title: "Mismatch", message: "New passwords do not match.", type: "error" });
      return;
    }
    setIsUpdating(true);
    try {
      const effectiveToken = token || "";
      const response = await fetch(`${base_url}/api/users/${userId}/password`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        showToast({ title: "Update Failed", message: data.detail || "Failed to update password.", type: "error" });
      } else {
        showToast({ title: "Password Changed", message: "Your password has been updated successfully.", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      showToast({ title: "Network Error", message: "An unexpected error occurred. Please try again.", type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      showToast({ title: "Password Required", message: "Please enter your password to confirm deletion.", type: "error" });
      return;
    }
    if (deleteTypedText !== "DELETE") {
      showToast({ title: "Confirmation Required", message: "Please type DELETE in capital letters to confirm.", type: "error" });
      return;
    }

    setIsDeleting(true);
    try {
      const effectiveToken = token || "";
      const res = await fetch(`${base_url}/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowDeleteModal(false);
        showToast({ title: "Account Deleted", message: "Your account and health records have been permanently removed.", type: "success" });
        await logout();
        router.replace("/(auth)/login");
      } else {
        showToast({ title: "Deletion Failed", message: data.detail || "Failed to delete account.", type: "error" });
      }
    } catch (err) {
      showToast({ title: "Error", message: "An unexpected error occurred during account deletion.", type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={handleBackPress}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[18px] font-semibold text-slate-900 dark:text-white tracking-tight">
          Login & Security
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-20" showsVerticalScrollIndicator={false}>
        <Text className="text-[14px] text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Manage your account password and security credentials to protect your personal health information.
        </Text>

        {/* Change Password Card */}
        <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-5 mb-6 shadow-sm shadow-slate-100 dark:shadow-none">
          <View className="flex-row items-center gap-2.5 mb-4">
            <View className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 items-center justify-center">
              <Feather name="key" size={16} color="#2563eb" />
            </View>
            <Text className="text-[16px] font-semibold text-slate-900 dark:text-white">
              Change Password
            </Text>
          </View>
          
          {/* Current Password Field */}
          <View className="mb-4">
            <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Current Password
            </Text>
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 h-13">
              <Feather name="lock" size={16} color="#64748b" />
              <TextInput 
                className="flex-1 ml-3 text-[15px] text-slate-900 dark:text-white"
                placeholder="Enter current password"
                secureTextEntry={!showCurrentPass}
                placeholderTextColor="#94a3b8"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPass(!showCurrentPass)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={showCurrentPass ? "Hide current password" : "Show current password"}
                className="p-2"
              >
                <Feather name={showCurrentPass ? "eye-off" : "eye"} size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password Field */}
          <View className="mb-4">
            <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              New Password
            </Text>
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 h-13">
              <Feather name="lock" size={16} color="#64748b" />
              <TextInput 
                className="flex-1 ml-3 text-[15px] text-slate-900 dark:text-white"
                placeholder="Enter new password"
                secureTextEntry={!showNewPass}
                placeholderTextColor="#94a3b8"
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowNewPass(!showNewPass)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={showNewPass ? "Hide new password" : "Show new password"}
                className="p-2"
              >
                <Feather name={showNewPass ? "eye-off" : "eye"} size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm New Password Field */}
          <View className="mb-4">
            <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Confirm New Password
            </Text>
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 h-13">
              <Feather name="check-circle" size={16} color="#64748b" />
              <TextInput 
                className="flex-1 ml-3 text-[15px] text-slate-900 dark:text-white"
                placeholder="Confirm new password"
                secureTextEntry={!showConfirmPass}
                placeholderTextColor="#94a3b8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPass(!showConfirmPass)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPass ? "Hide confirm password" : "Show confirm password"}
                className="p-2"
              >
                <Feather name={showConfirmPass ? "eye-off" : "eye"} size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Real-time Requirement Checklist */}
          <View className="bg-slate-50 dark:bg-slate-950/80 rounded-2xl p-3.5 mb-5 border border-slate-100 dark:border-slate-800/80 gap-2">
            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Password Requirements
            </Text>
            
            <View className="flex-row items-center gap-2">
              <Feather 
                name={isMinLength ? "check-circle" : "circle"} 
                size={14} 
                color={isMinLength ? "#16a34a" : isDark ? "#64748b" : "#94a3b8"} 
              />
              <Text className={`text-[13px] ${isMinLength ? "text-green-600 dark:text-green-400 font-medium" : "text-slate-500 dark:text-slate-400"}`}>
                At least 6 characters
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Feather 
                name={isMatching ? "check-circle" : "circle"} 
                size={14} 
                color={isMatching ? "#16a34a" : isDark ? "#64748b" : "#94a3b8"} 
              />
              <Text className={`text-[13px] ${isMatching ? "text-green-600 dark:text-green-400 font-medium" : "text-slate-500 dark:text-slate-400"}`}>
                New passwords match
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            className={`h-13 rounded-2xl items-center justify-center flex-row gap-2 ${
              isFormValid && !isUpdating ? "bg-slate-900 dark:bg-blue-600" : "bg-slate-300 dark:bg-slate-800"
            }`}
            onPress={handleUpdatePassword}
            disabled={!isFormValid || isUpdating}
            activeOpacity={0.85}
          >
            {isUpdating ? <ActivityIndicator color="#fff" size="small" /> : null}
            <Text className={`font-semibold text-[15px] ${isFormValid && !isUpdating ? "text-white" : "text-slate-500 dark:text-slate-400"}`}>
              Update Password
            </Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View className="mt-4">
          <Text className="text-[12px] font-bold text-red-600 dark:text-red-400 mb-2.5 px-1 uppercase tracking-wider">
            Danger Zone
          </Text>
          <View className="bg-red-50/60 dark:bg-red-950/20 rounded-3xl border border-red-200/80 dark:border-red-900/40 p-5">
            <View className="flex-row items-center gap-2.5 mb-2">
              <View className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/40 items-center justify-center">
                <Feather name="alert-triangle" size={16} color="#dc2626" />
              </View>
              <Text className="text-[16px] font-semibold text-red-700 dark:text-red-300">
                Delete Account
              </Text>
            </View>

            <Text className="text-[13px] text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Permanently remove your patient account, biometrics, health logs, care team contacts, and scheduled reminders. This cannot be undone.
            </Text>
            
            <TouchableOpacity 
              onPress={() => {
                setDeletePassword("");
                setDeleteTypedText("");
                setShowDeleteModal(true);
              }}
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Delete my account"
              className="bg-white dark:bg-slate-900 h-12 rounded-2xl items-center justify-center border border-red-300 dark:border-red-800/80 shadow-sm shadow-red-100 dark:shadow-none"
            >
              <Text className="text-red-600 dark:text-red-400 font-semibold text-[15px]">
                Delete My Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Discard Unsaved Changes Modal */}
      <ConfirmDialog
        visible={showDiscardConfirm}
        onCancel={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          router.back();
        }}
        title="Discard changes?"
        message="You have entered password information that has not been saved. Are you sure you want to leave?"
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        variant="destructive"
        mode="bottom-sheet"
        icon="alert-circle"
      />

      {/* Secure Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-5">
          <View className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <View className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 items-center justify-center self-center mb-3">
              <Feather name="alert-octagon" size={24} color="#dc2626" />
            </View>

            <Text className="text-[19px] font-bold text-slate-900 dark:text-white text-center mb-1.5">
              Permanent Account Deletion
            </Text>
            
            <Text className="text-[13px] text-slate-500 dark:text-slate-400 text-center mb-4 leading-relaxed">
              This action is permanent and irreversible. All associated data will be completely deleted:
            </Text>

            {/* Itemized Deletion Disclosures */}
            <View className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-3.5 mb-4 border border-slate-100 dark:border-slate-800 gap-1.5">
              <Text className="text-[12px] text-slate-600 dark:text-slate-400">• Personal profile & login credentials</Text>
              <Text className="text-[12px] text-slate-600 dark:text-slate-400">• Blood pressure, heart rate, & symptom logs</Text>
              <Text className="text-[12px] text-slate-600 dark:text-slate-400">• Meal diary & nutritional history</Text>
              <Text className="text-[12px] text-slate-600 dark:text-slate-400">• Exercise & rehab routine history</Text>
              <Text className="text-[12px] text-slate-600 dark:text-slate-400">• Care team contacts & scheduled reminders</Text>
            </View>

            <View className="mb-3">
              <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Current Password
              </Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[14px] text-slate-900 dark:text-white"
                placeholder="Enter your current password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={deletePassword}
                onChangeText={setDeletePassword}
                autoCapitalize="none"
              />
            </View>

            <View className="mb-5">
              <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Type <Text className="font-bold text-red-600">DELETE</Text> to confirm
              </Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[14px] text-slate-900 dark:text-white text-center font-bold tracking-widest"
                placeholder="DELETE"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                value={deleteTypedText}
                onChangeText={setDeleteTypedText}
              />
            </View>

            <View className="gap-2.5">
              <TouchableOpacity
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="w-full py-3.5 rounded-2xl items-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <Text className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteAccount}
                disabled={isDeleting || !deletePassword || deleteTypedText !== "DELETE"}
                style={{
                  opacity: (!isDeleting && deletePassword && deleteTypedText === "DELETE") ? 1 : 0.5,
                }}
                className="w-full py-3.5 rounded-2xl items-center bg-red-600 flex-row justify-center gap-2"
              >
                {isDeleting ? <ActivityIndicator size="small" color="#fff" /> : null}
                <Text className="text-[15px] font-semibold text-white">
                  Permanently Delete Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

