import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Linking, 
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable
} from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import { Skeleton } from "../../../components/ui/Skeleton";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useToast } from "../../../contexts/ToastContext";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";

const base_url = process.env.EXPO_PUBLIC_API_URL;

const DOCTOR_PRESETS = ["Cardiologist", "Primary Care Doctor", "Nurse", "Other"];
const EMERGENCY_PRESETS = ["Spouse / Partner", "Parent", "Child", "Sibling", "Other"];

function ContactCard({ 
  contact,
  onEdit
}: { 
  contact: any;
  onEdit: () => void;
}) {
  const isDoctor = contact.contact_type === "doctor";
  const title = isDoctor ? "Doctor / Specialist" : "Emergency Contact";
  const icon = isDoctor ? "user" : "heart";

  return (
    <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-5 mb-4 shadow-sm shadow-slate-100 dark:shadow-none">
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center gap-1.5">
          <View className={`w-2 h-2 rounded-full ${isDoctor ? "bg-blue-500" : "bg-red-500"}`} />
          <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
            {title}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={onEdit}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Edit contact ${contact.name}`}
          className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800"
        >
          <Text className="text-[12px] font-semibold text-blue-600 dark:text-blue-400">Edit</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center mb-4">
        <View 
          className="w-12 h-12 rounded-2xl items-center justify-center mr-3.5 border border-slate-200/80 dark:border-slate-800"
          style={{ backgroundColor: isDoctor ? "#eff6ff" : "#fef2f2" }}
        >
          <Feather name={icon as any} size={20} color={isDoctor ? "#2563eb" : "#dc2626"} />
        </View>
        <View className="flex-1">
          <Text className="text-[16px] font-bold text-slate-900 dark:text-white mb-0.5">
            {contact.name}
          </Text>
          <Text className="text-[13px] text-slate-500 dark:text-slate-400">
            {contact.role_title || (isDoctor ? "Specialist" : "Emergency Link")}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2.5">
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => Linking.openURL(`tel:${contact.phone}`)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Call ${contact.name} at ${contact.phone}`}
          className="flex-1 flex-row items-center justify-center py-3 rounded-2xl gap-2 bg-slate-900 dark:bg-blue-600"
        >
          <Feather name="phone" size={15} color="#fff" />
          <Text className="text-[14px] font-semibold text-white">Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => Linking.openURL(`sms:${contact.phone}`)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Message ${contact.name} at ${contact.phone}`}
          className="flex-1 flex-row items-center justify-center py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 gap-2"
        >
          <Feather name="message-circle" size={15} color="#64748b" />
          <Text className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CareTeamScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId, token } = useUser();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [careTeam, setCareTeam] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [form, setForm] = useState({ name: "", role_title: "", contact_type: "doctor", phone: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchCareTeam = async () => {
    try {
      const effectiveToken = token || "";
      const response = await fetch(`${base_url}/api/users/${userId}/profile`, {
        headers: {
          "Authorization": `Bearer ${effectiveToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCareTeam(data.care_team || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchCareTeam();
  }, [userId, token]);

  const openAddModal = () => {
    setEditingContact(null);
    setForm({ name: "", role_title: "Cardiologist", contact_type: "doctor", phone: "" });
    setModalVisible(true);
  };

  const openEditModal = (contact: any) => {
    setEditingContact(contact);
    setForm({ 
      name: contact.name, 
      role_title: contact.role_title || "", 
      contact_type: contact.contact_type || "doctor", 
      phone: contact.phone || ""
    });
    setModalVisible(true);
  };

  const selectPreset = (preset: string) => {
    if (preset === "Other") {
      setForm(prev => ({ ...prev, role_title: "" }));
    } else {
      setForm(prev => ({ ...prev, role_title: preset }));
    }
  };

  const saveContact = async () => {
    if (isSaving) return;
    if (!form.name.trim()) {
      showToast({ title: "Name Required", message: "Please enter the contact's name.", type: "error" });
      return;
    }
    if (!form.phone.trim() || form.phone.trim().length < 4) {
      showToast({ title: "Invalid Phone", message: "Please enter a valid phone number.", type: "error" });
      return;
    }

    setIsSaving(true);
    try {
      const method = editingContact ? "PUT" : "POST";
      const endpoint = editingContact 
        ? `${base_url}/api/users/${userId}/care-team/${editingContact.id}`
        : `${base_url}/api/users/${userId}/care-team`;

      const effectiveToken = token || "";
      const response = await fetch(endpoint, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify(form)
      });

      if (response.ok) {
        setModalVisible(false);
        await fetchCareTeam();
        showToast({ title: "Contact Saved", message: "Your care team contact has been updated.", type: "success" });
      } else {
        const errData = await response.json().catch(() => ({}));
        showToast({ title: "Save Failed", message: errData.detail || "Could not save contact.", type: "error" });
      }
    } catch (e) {
      showToast({ title: "Network Error", message: "Failed to connect to server.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteContact = async () => {
    if (!editingContact || isSaving) return;
    try {
      setIsSaving(true);
      const effectiveToken = token || "";
      const response = await fetch(`${base_url}/api/users/${userId}/care-team/${editingContact.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${effectiveToken}`,
        },
      });
      if (response.ok) {
        setModalVisible(false);
        setShowDeleteConfirm(false);
        await fetchCareTeam();
        showToast({ title: "Contact Removed", message: "Contact was removed from your care team.", type: "success" });
      } else {
        const errData = await response.json().catch(() => ({}));
        showToast({ title: "Delete Failed", message: errData.detail || "Could not delete contact.", type: "error" });
      }
    } catch (e) {
      showToast({ title: "Error", message: "Network error while deleting contact.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const currentPresets = form.contact_type === "doctor" ? DOCTOR_PRESETS : EMERGENCY_PRESETS;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/60 flex-row items-center justify-between">
        <View className="flex-row items-center">
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
            My Care Team
          </Text>
        </View>

        <TouchableOpacity
          onPress={openAddModal}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Add new contact"
          className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 items-center justify-center"
        >
          <Feather name="plus" size={18} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-5 pb-24" showsVerticalScrollIndicator={false}>
        {/* Emergency SOS Button */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => Linking.openURL("tel:911")}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Emergency SOS, Dial 911 immediately"
          className="bg-red-600 rounded-3xl p-5 mb-6 flex-row items-center justify-center gap-3 shadow-md shadow-red-600/30"
        >
          <MaterialCommunityIcons name="alert-circle" size={24} color="white" />
          <Text className="text-white text-[18px] font-bold tracking-wider">
            EMERGENCY SOS (911)
          </Text>
        </TouchableOpacity>

        {/* Contacts Section */}
        <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-3 px-1 uppercase tracking-wider">
          Saved Providers & Contacts
        </Text>

        {isLoading ? (
          <View className="gap-3">
            {[1, 2].map((key) => (
              <View key={key} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 p-5 rounded-3xl">
                <View className="flex-row items-center mb-3">
                  <Skeleton className="w-12 h-12 rounded-2xl mr-3" />
                  <View className="flex-1">
                    <Skeleton className="w-1/2 h-5 mb-1.5" />
                    <Skeleton className="w-1/3 h-4" />
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <Skeleton className="flex-1 h-11 rounded-2xl" />
                  <Skeleton className="flex-1 h-11 rounded-2xl" />
                </View>
              </View>
            ))}
          </View>
        ) : careTeam.length > 0 ? (
          careTeam.map((member: any) => (
            <ContactCard
              key={member.id}
              contact={member}
              onEdit={() => openEditModal(member)}
            />
          ))
        ) : (
          <EmptyState
            icon={<Feather name="users" size={32} color="#94a3b8" />}
            title="No care team contacts"
            subtitle="Add your cardiologists, primary care doctors, or family emergency contacts here."
          />
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={openAddModal}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Add care team contact"
          className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-5 items-center justify-center py-6 mt-2"
        >
          <View className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center mb-2">
            <Feather name="user-plus" size={18} color="#64748b" />
          </View>
          <Text className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">
            Add Another Contact
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add/Edit Bottom Sheet Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable className="flex-1 justify-end bg-black/50" onPress={() => setModalVisible(false)}>
          <Pressable className="bg-white dark:bg-slate-900 rounded-t-3xl pt-6 px-6" style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
            
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-[20px] font-bold text-slate-900 dark:text-white">
                {editingContact ? "Edit Contact" : "Add Care Team Contact"}
              </Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)} 
                className="w-8 h-8 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full"
              >
                <Feather name="x" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type Toggle */}
              <View className="flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-4">
                <TouchableOpacity 
                  onPress={() => setForm(prev => ({ ...prev, contact_type: "doctor", role_title: "Cardiologist" }))}
                  className={`flex-1 py-2.5 rounded-xl items-center ${form.contact_type === "doctor" ? "bg-white dark:bg-slate-900 shadow-sm" : ""}`}
                >
                  <Text className={`text-[14px] font-semibold ${form.contact_type === "doctor" ? "text-blue-600 dark:text-blue-400" : "text-slate-500"}`}>
                    Doctor / Specialist
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setForm(prev => ({ ...prev, contact_type: "emergency", role_title: "Spouse / Partner" }))}
                  className={`flex-1 py-2.5 rounded-xl items-center ${form.contact_type === "emergency" ? "bg-white dark:bg-slate-900 shadow-sm" : ""}`}
                >
                  <Text className={`text-[14px] font-semibold ${form.contact_type === "emergency" ? "text-red-600 dark:text-red-400" : "text-slate-500"}`}>
                    Emergency Contact
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Full Name */}
              <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Full Name
              </Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-[15px] text-slate-900 dark:text-white mb-4"
                placeholder={form.contact_type === "doctor" ? "Dr. Jane Smith" : "John Smith"}
                placeholderTextColor="#94a3b8"
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
              />

              {/* Role / Relationship Presets */}
              <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                Role / Relationship
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-2.5">
                {currentPresets.map((preset) => {
                  const isSelected = form.role_title === preset || (preset === "Other" && !currentPresets.slice(0, -1).includes(form.role_title));
                  return (
                    <TouchableOpacity
                      key={preset}
                      onPress={() => selectPreset(preset)}
                      className={`px-3 py-1.5 rounded-xl border ${
                        isSelected 
                          ? "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700" 
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <Text className={`text-[12px] font-semibold ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"}`}>
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-[14px] text-slate-900 dark:text-white mb-4"
                placeholder="Specific title or relationship"
                placeholderTextColor="#94a3b8"
                value={form.role_title}
                onChangeText={(t) => setForm({ ...form, role_title: t })}
              />

              {/* Phone Number */}
              <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Phone Number
              </Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-[15px] text-slate-900 dark:text-white mb-2"
                placeholder="+1 555-0100"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(t) => setForm({ ...form, phone: t })}
              />
              <Text className="text-[11px] text-slate-400 mb-6 px-1">
                Enter phone number for direct one-tap calling and SMS messaging.
              </Text>

              {/* Save Button */}
              <TouchableOpacity 
                activeOpacity={0.85}
                onPress={saveContact}
                disabled={isSaving}
                className="bg-slate-900 dark:bg-blue-600 rounded-2xl py-4 items-center mb-3"
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-[15px]">Save Contact</Text>
                )}
              </TouchableOpacity>

              {editingContact && (
                <TouchableOpacity 
                  activeOpacity={0.85}
                  onPress={() => setShowDeleteConfirm(true)}
                  disabled={isSaving}
                  className="bg-red-50 dark:bg-red-950/30 rounded-2xl py-3.5 items-center mb-5 border border-red-200 dark:border-red-900/50"
                >
                  <Text className="text-red-600 dark:text-red-400 font-semibold text-[15px]">Remove Contact</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={deleteContact}
        title="Remove Contact?"
        message="Are you sure you want to remove this contact from your care team?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="destructive"
        mode="bottom-sheet"
        icon="trash-2"
      />
    </SafeAreaView>
  );
}
