import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import { isSessionTokens } from "../../../services/SessionService";
import { useToast } from "../../../contexts/ToastContext";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { apiFetch } from "../../../lib/api";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { ds } from "../../../constants/theme";

export default function AccountSecurityScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const { userId, token, logout, setUserId } = useUser();
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
      const response = await apiFetch(`/api/users/${userId}/password`, {
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
        // HL-047: changing the password logs out other devices; this phone gets a fresh session
        if (userId && isSessionTokens(data)) {
          await setUserId(userId, data.token, data);
        }
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
      const res = await apiFetch(`/api/users/${userId}`, {
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
    <SafeAreaView className="flex-1 bg-ds-canvas" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-ds-hairline bg-ds-canvas" style={{ gap: 12 }}>
        <SquareIconButton icon="arrow-left" label="Go back" onPress={handleBackPress} />
        <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink flex-1" numberOfLines={1}>
          Login & Security
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-20" showsVerticalScrollIndicator={false}>
        <Text className="text-[15px] text-ds-slate mb-6 leading-relaxed">
          Manage your account password and security credentials to protect your personal health information.
        </Text>

        {/* Change Password Card */}
        <View className="bg-ds-canvas rounded-xl border border-ds-hairline p-5 mb-6">
          <View className="flex-row items-center gap-2.5 mb-4">
            <View className="w-8 h-8 rounded-lg bg-ds-sky items-center justify-center">
              <Feather name="key" size={16} color={c.charcoal} />
            </View>
            <Text className="text-[16px] font-semibold text-ds-ink">
              Change Password
            </Text>
          </View>

          {/* Current Password Field */}
          <View className="mb-4">
            <Text className="text-[14px] font-medium text-ds-ink mb-1.5">
              Current Password
            </Text>
            <View className="flex-row items-center bg-ds-canvas border border-ds-hairline-strong rounded-lg px-4" style={{ height: 52 }}>
              <Feather name="lock" size={16} color={c.slate} />
              <TextInput
                className="flex-1 ml-3 text-[16px] text-ds-ink"
                placeholder="Enter current password"
                secureTextEntry={!showCurrentPass}
                placeholderTextColor={c.steel}
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
                <Feather name={showCurrentPass ? "eye-off" : "eye"} size={16} color={c.slate} />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password Field */}
          <View className="mb-4">
            <Text className="text-[14px] font-medium text-ds-ink mb-1.5">
              New Password
            </Text>
            <View className="flex-row items-center bg-ds-canvas border border-ds-hairline-strong rounded-lg px-4" style={{ height: 52 }}>
              <Feather name="lock" size={16} color={c.slate} />
              <TextInput
                className="flex-1 ml-3 text-[16px] text-ds-ink"
                placeholder="Enter new password"
                secureTextEntry={!showNewPass}
                placeholderTextColor={c.steel}
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
                <Feather name={showNewPass ? "eye-off" : "eye"} size={16} color={c.slate} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm New Password Field */}
          <View className="mb-4">
            <Text className="text-[14px] font-medium text-ds-ink mb-1.5">
              Confirm New Password
            </Text>
            <View className="flex-row items-center bg-ds-canvas border border-ds-hairline-strong rounded-lg px-4" style={{ height: 52 }}>
              <Feather name="check-circle" size={16} color={c.slate} />
              <TextInput
                className="flex-1 ml-3 text-[16px] text-ds-ink"
                placeholder="Confirm new password"
                secureTextEntry={!showConfirmPass}
                placeholderTextColor={c.steel}
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
                <Feather name={showConfirmPass ? "eye-off" : "eye"} size={16} color={c.slate} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Real-time Requirement Checklist */}
          <View className="bg-ds-surface rounded-xl p-3.5 mb-5 border border-ds-hairline gap-2">
            <Text className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider mb-0.5">
              Password Requirements
            </Text>

            <View className="flex-row items-center gap-2">
              <Feather
                name={isMinLength ? "check-circle" : "circle"}
                size={14}
                color={isMinLength ? c.success : c.steel}
              />
              <Text className={`text-[13px] ${isMinLength ? "text-ds-ink font-medium" : "text-ds-slate"}`}>
                At least 16 characters
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Feather
                name={hasNumber ? "check-circle" : "circle"}
                size={14}
                color={hasNumber ? c.success : c.steel}
              />
              <Text className={`text-[13px] ${hasNumber ? "text-ds-ink font-medium" : "text-ds-slate"}`}>
                At least one number
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Feather
                name={hasSpecial ? "check-circle" : "circle"}
                size={14}
                color={hasSpecial ? c.success : c.steel}
              />
              <Text className={`text-[13px] ${hasSpecial ? "text-ds-ink font-medium" : "text-ds-slate"}`}>
                At least one special character
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Feather
                name={isMatching ? "check-circle" : "circle"}
                size={14}
                color={isMatching ? c.success : c.steel}
              />
              <Text className={`text-[13px] ${isMatching ? "text-ds-ink font-medium" : "text-ds-slate"}`}>
                New passwords match
              </Text>
            </View>
          </View>

          <DsButton label="Update Password" onPress={handleUpdatePassword} disabled={!isFormValid} loading={isUpdating} />
        </View>

        {/* Danger Zone */}
        <View className="mt-4">
          <Text className="text-[11px] font-semibold text-ds-steel mb-2.5 px-1 uppercase tracking-wider">
            Danger Zone
          </Text>
          <View className="bg-ds-rose rounded-xl p-5">
            <View className="flex-row items-center gap-2.5 mb-2">
              <View className="w-8 h-8 rounded-lg bg-ds-canvas items-center justify-center">
                <Feather name="alert-triangle" size={16} color={c.danger} />
              </View>
              <Text className="text-[16px] font-semibold text-ds-ink">
                Delete Account
              </Text>
            </View>

            <Text className="text-[14px] text-ds-charcoal mb-4 leading-relaxed">
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
              className="bg-ds-canvas rounded-lg items-center justify-center border border-ds-hairline-strong"
              style={{ height: 48 }}
            >
              <Text style={{ fontSize: 15, fontWeight: "500", color: c.danger }}>
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
        <View className="flex-1 items-center justify-center px-5" style={{ backgroundColor: "rgba(15,15,15,0.6)" }}>
          <View className="w-full max-w-md bg-ds-canvas p-6" style={{ borderRadius: 16 }}>
            <View className="w-12 h-12 rounded-xl bg-ds-rose items-center justify-center self-center mb-3">
              <Feather name="alert-octagon" size={24} color={c.danger} />
            </View>

            <Text accessibilityRole="header" className="text-[20px] font-semibold text-ds-ink text-center mb-1.5">
              Permanent Account Deletion
            </Text>

            <Text className="text-[14px] text-ds-slate text-center mb-4 leading-relaxed">
              This action is permanent and irreversible. All associated data will be completely deleted:
            </Text>

            {/* Itemized Deletion Disclosures */}
            <View className="bg-ds-surface rounded-xl p-3.5 mb-4 border border-ds-hairline gap-1.5">
              <Text className="text-[13px] text-ds-slate">• Personal profile & login credentials</Text>
              <Text className="text-[13px] text-ds-slate">• Blood pressure, heart rate, & symptom logs</Text>
              <Text className="text-[13px] text-ds-slate">• Meal diary & nutritional history</Text>
              <Text className="text-[13px] text-ds-slate">• Exercise & rehab routine history</Text>
              <Text className="text-[13px] text-ds-slate">• Care team contacts & scheduled reminders</Text>
            </View>

            <View className="mb-3">
              <Text className="text-[14px] font-medium text-ds-ink mb-1.5">
                Current Password
              </Text>
              <TextInput
                className="bg-ds-canvas border border-ds-hairline-strong rounded-lg px-4 text-[16px] text-ds-ink"
                placeholder="Enter your current password"
                style={{ height: 48 }}
                placeholderTextColor={c.steel}
                secureTextEntry
                value={deletePassword}
                onChangeText={setDeletePassword}
                autoCapitalize="none"
              />
            </View>

            <View className="mb-5">
              <Text className="text-[14px] font-medium text-ds-ink mb-1.5">
                Type <Text className="font-semibold text-ds-danger">DELETE</Text> to confirm
              </Text>
              <TextInput
                className="bg-ds-canvas border border-ds-hairline-strong rounded-lg px-4 text-[16px] text-ds-ink text-center font-semibold tracking-widest"
                placeholder="DELETE"
                style={{ height: 48 }}
                placeholderTextColor={c.steel}
                autoCapitalize="characters"
                value={deleteTypedText}
                onChangeText={setDeleteTypedText}
              />
            </View>

            <View className="gap-2.5">
              <TouchableOpacity
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="w-full rounded-lg items-center justify-center border border-ds-hairline-strong bg-ds-canvas"
                style={{ height: 48 }}
              >
                <Text className="text-[15px] font-medium text-ds-ink">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteAccount}
                disabled={isDeleting || !deletePassword || deleteTypedText !== "DELETE"}
                style={{
                  height: 48,
                  // Red keeps its light-mode shade so the white text stays readable.
                  backgroundColor: ds.light.danger,
                  opacity: (!isDeleting && deletePassword && deleteTypedText === "DELETE") ? 1 : 0.5,
                }}
                className="w-full rounded-lg items-center flex-row justify-center gap-2"
              >
                {isDeleting ? <ActivityIndicator size="small" color={ds.light.onPrimary} /> : null}
                <Text className="text-[15px] font-medium" style={{ color: ds.light.onPrimary }}>
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

