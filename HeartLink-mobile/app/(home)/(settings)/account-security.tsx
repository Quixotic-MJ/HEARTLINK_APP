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
import { theme } from "../../../constants/theme";

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
  const isMinLength = newPassword.length >= 16;
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9\s]/.test(newPassword);
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;
  const isCurrentFilled = currentPassword.length > 0;
  const isFormValid = isMinLength && hasNumber && hasSpecial && isMatching && isCurrentFilled;

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast({ title: "Missing Fields", message: "Please fill in all password fields.", type: "error" });
      return;
    }
    if (!isMinLength) {
      showToast({ title: "Weak Password", message: "New password must be at least 16 characters.", type: "error" });
      return;
    }
    if (!hasNumber) {
      showToast({ title: "Weak Password", message: "New password must contain at least one number.", type: "error" });
      return;
    }
    if (!hasSpecial) {
      showToast({ title: "Weak Password", message: "New password must contain at least one special character.", type: "error" });
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
        let errorMsg = "Failed to update password.";
        if (Array.isArray(data.detail)) {
            errorMsg = data.detail[0].msg;
        } else if (typeof data.detail === "string") {
            errorMsg = data.detail;
        }
        errorMsg = errorMsg.replace(/^Value error,\s*/i, "");
        showToast({ title: "Update Failed", message: errorMsg, type: "error" });
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
    <SafeAreaView className="flex-1 bg-surface-alt" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-border bg-surface">
        <TouchableOpacity
          onPress={handleBackPress}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-9 h-9 rounded-xl bg-surface-alt border border-border items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[18px] font-semibold text-text tracking-tight">
          Login & Security
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-20" showsVerticalScrollIndicator={false}>
        <Text className="text-[14px] text-text-soft mb-6 leading-relaxed">
          Manage your account password and security credentials to protect your personal health information.
        </Text>

        {/* Change Password Card */}
        <View className="bg-surface rounded-3xl border border-border/80 dark:border-slate-800/80 p-5 mb-6 shadow-sm shadow-slate-100 dark:shadow-none">
          <View className="flex-row items-center gap-2.5 mb-4">
            <View className="w-8 h-8 rounded-xl bg-blue-tint dark:bg-blue-950/40 items-center justify-center">
              <Feather name="key" size={16} color={theme.textSoft} />
            </View>
            <Text className="text-[16px] font-semibold text-text">
              Change Password
            </Text>
          </View>
          
          {/* Current Password Field */}
          <View className="mb-4">
            <Text className="text-[12px] font-bold text-text-soft mb-1.5 uppercase tracking-wider">
              Current Password
            </Text>
            <View className="flex-row items-center bg-surface-alt border border-border rounded-2xl px-4 h-13">
              <Feather name="lock" size={16} color={theme.textSoft} />
              <TextInput 
                className="flex-1 ml-3 text-[15px] text-text"
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
                <Feather name={showCurrentPass ? "eye-off" : "eye"} size={16} color={theme.textSoft} />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password Field */}
          <View className="mb-4">
            <Text className="text-[12px] font-bold text-text-soft mb-1.5 uppercase tracking-wider">
              New Password
            </Text>
            <View className="flex-row items-center bg-surface-alt border border-border rounded-2xl px-4 h-13">
              <Feather name="lock" size={16} color={theme.textSoft} />
              <TextInput 
                className="flex-1 ml-3 text-[15px] text-text"
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
                <Feather name={showNewPass ? "eye-off" : "eye"} size={16} color={theme.textSoft} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm New Password Field */}
          <View className="mb-4">
            <Text className="text-[12px] font-bold text-text-soft mb-1.5 uppercase tracking-wider">
              Confirm New Password
            </Text>
            <View className="flex-row items-center bg-surface-alt border border-border rounded-2xl px-4 h-13">
              <Feather name="check-circle" size={16} color={theme.textSoft} />
              <TextInput 
                className="flex-1 ml-3 text-[15px] text-text"
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
                <Feather name={showConfirmPass ? "eye-off" : "eye"} size={16} color={theme.textSoft} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Real-time Requirement Checklist */}
          <View className="bg-surface-alt/80 rounded-2xl p-3.5 mb-5 border border-border dark:border-slate-800/80 gap-2">
            <Text className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
              Password Requirements
            </Text>
            
            <View className="flex-row items-center gap-2">
              <Feather 
                name={isMinLength ? "check-circle" : "circle"} 
                size={14} 
                color={isMinLength ? "#16a34a" : isDark ? "#64748b" : "#94a3b8"} 
              />
              <Text className={`text-[13px] ${isMinLength ? "text-green-600 dark:text-green-400 font-medium" : "text-text-soft"}`}>
                At least 16 characters
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Feather 
                name={hasNumber ? "check-circle" : "circle"} 
                size={14} 
                color={hasNumber ? "#16a34a" : isDark ? "#64748b" : "#94a3b8"} 
              />
              <Text className={`text-[13px] ${hasNumber ? "text-green-600 dark:text-green-400 font-medium" : "text-text-soft"}`}>
                At least one number
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Feather 
                name={hasSpecial ? "check-circle" : "circle"} 
                size={14} 
                color={hasSpecial ? "#16a34a" : isDark ? "#64748b" : "#94a3b8"} 
              />
              <Text className={`text-[13px] ${hasSpecial ? "text-green-600 dark:text-green-400 font-medium" : "text-text-soft"}`}>
                At least one special character
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Feather 
                name={isMatching ? "check-circle" : "circle"} 
                size={14} 
                color={isMatching ? "#16a34a" : isDark ? "#64748b" : "#94a3b8"} 
              />
              <Text className={`text-[13px] ${isMatching ? "text-green-600 dark:text-green-400 font-medium" : "text-text-soft"}`}>
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
            {isUpdating ? <ActivityIndicator color={theme.onPrimary} size="small" /> : null}
            <Text className={`font-semibold text-[15px] ${isFormValid && !isUpdating ? "text-white" : "text-text-soft"}`}>
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
                <Feather name="alert-triangle" size={16} color={theme.danger} />
              </View>
              <Text className="text-[16px] font-semibold text-red-700 dark:text-red-300">
                Delete Account
              </Text>
            </View>

            <Text className="text-[13px] text-text-soft mb-4 leading-relaxed">
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
              className="bg-surface h-12 rounded-2xl items-center justify-center border border-red-300 dark:border-red-800/80 shadow-sm shadow-red-100 dark:shadow-none"
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
          <View className="w-full max-w-md bg-surface rounded-3xl p-6 border border-border shadow-2xl">
            <View className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 items-center justify-center self-center mb-3">
              <Feather name="alert-octagon" size={24} color={theme.danger} />
            </View>

            <Text className="text-[19px] font-bold text-text text-center mb-1.5">
              Permanent Account Deletion
            </Text>
            
            <Text className="text-[13px] text-text-soft text-center mb-4 leading-relaxed">
              This action is permanent and irreversible. All associated data will be completely deleted:
            </Text>

            {/* Itemized Deletion Disclosures */}
            <View className="bg-surface-alt rounded-2xl p-3.5 mb-4 border border-border dark:border-slate-800 gap-1.5">
              <Text className="text-[12px] text-text-soft">• Personal profile & login credentials</Text>
              <Text className="text-[12px] text-text-soft">• Blood pressure, heart rate, & symptom logs</Text>
              <Text className="text-[12px] text-text-soft">• Meal diary & nutritional history</Text>
              <Text className="text-[12px] text-text-soft">• Exercise & rehab routine history</Text>
              <Text className="text-[12px] text-text-soft">• Care team contacts & scheduled reminders</Text>
            </View>

            <View className="mb-3">
              <Text className="text-[12px] font-bold text-text-soft mb-1.5 uppercase tracking-wider">
                Current Password
              </Text>
              <TextInput
                className="bg-surface-alt border border-border rounded-xl px-4 py-3 text-[14px] text-text"
                placeholder="Enter your current password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={deletePassword}
                onChangeText={setDeletePassword}
                autoCapitalize="none"
              />
            </View>

            <View className="mb-5">
              <Text className="text-[12px] font-bold text-text-soft mb-1.5 uppercase tracking-wider">
                Type <Text className="font-bold text-red-600">DELETE</Text> to confirm
              </Text>
              <TextInput
                className="bg-surface-alt border border-border rounded-xl px-4 py-3 text-[14px] text-text text-center font-bold tracking-widest"
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
                className="w-full py-3.5 rounded-2xl items-center border border-border bg-surface"
              >
                <Text className="text-[15px] font-semibold text-text">
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
                {isDeleting ? <ActivityIndicator size="small" color={theme.onPrimary} /> : null}
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

