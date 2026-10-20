import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Linking, 
  Modal,
  TextInput,
  Pressable
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import { Skeleton } from "../../../components/ui/Skeleton";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useToast } from "../../../contexts/ToastContext";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { ds } from "../../../constants/theme";
import { apiFetch } from "../../../lib/api";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";


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
  const { c } = useDs();

  return (
    <View className="bg-ds-canvas rounded-xl border border-ds-hairline p-5 mb-3">
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center gap-1.5">
          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: isDoctor ? c.line : c.danger }} />
          <Text className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider">
            {title}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={onEdit}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Edit contact ${contact.name}`}
          className="px-3 justify-center rounded-lg border border-ds-hairline-strong"
          style={{ height: 32 }}
        >
          <Text className="text-[13px] font-medium text-ds-ink">Edit</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center mb-4">
        <View
          className="w-12 h-12 rounded-lg items-center justify-center mr-3.5"
          style={{ backgroundColor: isDoctor ? c.sky : c.rose }}
        >
          <Feather name={icon as any} size={20} color={isDoctor ? c.charcoal : c.danger} />
        </View>
        <View className="flex-1">
          <Text className="text-[16px] font-semibold text-ds-ink mb-0.5">
            {contact.name}
          </Text>
          <Text className="text-[13px] text-ds-slate">
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
          className="flex-1 flex-row items-center justify-center rounded-lg gap-2 bg-ds-primary"
          style={{ height: 44 }}
        >
          <Feather name="phone" size={15} color={c.onPrimary} />
          <Text className="text-[14px] font-medium text-ds-on-primary">Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => Linking.openURL(`sms:${contact.phone}`)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Message ${contact.name} at ${contact.phone}`}
          className="flex-1 flex-row items-center justify-center rounded-lg border border-ds-hairline-strong gap-2"
          style={{ height: 44 }}
        >
          <Feather name="message-circle" size={15} color={c.ink} />
          <Text className="text-[14px] font-medium text-ds-ink">Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CareTeamScreen() {
  const { c, isDark } = useDs();
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
      const response = await apiFetch(`/api/users/${userId}/profile`, {
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
        ? `/api/users/${userId}/care-team/${editingContact.id}`
        : `/api/users/${userId}/care-team`;

      const effectiveToken = token || "";
      const response = await apiFetch(endpoint, {
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
      const response = await apiFetch(`/api/users/${userId}/care-team/${editingContact.id}`, {
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
    <SafeAreaView className="flex-1 bg-ds-canvas" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="px-5 pt-3 pb-3 bg-ds-canvas border-b border-ds-hairline flex-row items-center justify-between">
        <View className="flex-row items-center flex-1" style={{ gap: 12 }}>
          <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
          <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink">
            My Care Team
          </Text>
        </View>

        <SquareIconButton icon="plus" label="Add new contact" onPress={openAddModal} />
      </View>

      <ScrollView contentContainerClassName="p-5 pb-24" showsVerticalScrollIndicator={false}>
        {/* Emergency SOS Button */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => Linking.openURL("tel:911")}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Emergency SOS, Dial 911 immediately"
          className="rounded-xl p-5 mb-6 flex-row items-center justify-center gap-3"
          style={{ backgroundColor: ds.light.danger }}
        >
          <MaterialCommunityIcons name="alert-circle" size={24} color={ds.light.onPrimary} />
          <Text className="text-[18px] font-semibold tracking-wider" style={{ color: ds.light.onPrimary }}>
            EMERGENCY SOS (911)
          </Text>
        </TouchableOpacity>

        {/* Contacts Section */}
        <Text className="text-[11px] font-semibold text-ds-steel mb-3 px-1 uppercase tracking-wider">
          Saved Providers & Contacts
        </Text>

        {isLoading ? (
          <View className="gap-3">
            {[1, 2].map((key) => (
              <View key={key} className="bg-ds-canvas border border-ds-hairline p-5 rounded-xl">
                <View className="flex-row items-center mb-3">
                  <Skeleton className="w-12 h-12 rounded-xl mr-3" />
                  <View className="flex-1">
                    <Skeleton className="w-1/2 h-5 mb-1.5" />
                    <Skeleton className="w-1/3 h-4" />
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <Skeleton className="flex-1 h-11 rounded-xl" />
                  <Skeleton className="flex-1 h-11 rounded-xl" />
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
            icon={<Feather name="users" size={32} color={c.slate} />}
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
          className="bg-ds-canvas rounded-xl border border-dashed border-ds-hairline-strong p-5 items-center justify-center py-6 mt-2"
        >
          <View className="w-10 h-10 rounded-xl bg-ds-surface items-center justify-center mb-2">
            <Feather name="user-plus" size={18} color={c.charcoal} />
          </View>
          <Text className="text-[14px] font-semibold text-ds-ink">
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
        <Pressable className="flex-1 justify-end" style={{ backgroundColor: "rgba(15,15,15,0.55)" }} onPress={() => setModalVisible(false)}>
          <Pressable className="bg-ds-canvas pt-6 px-6" style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>

            <View className="flex-row justify-between items-center mb-5">
              <Text accessibilityRole="header" className="text-[20px] font-semibold text-ds-ink flex-1">
                {editingContact ? "Edit Contact" : "Add Care Team Contact"}
              </Text>
              <SquareIconButton icon="x" label="Close" onPress={() => setModalVisible(false)} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type Toggle */}
              <View className="flex-row bg-ds-surface p-1 rounded-lg mb-4">
                {([
                  { type: "doctor", label: "Doctor / Specialist", role: "Cardiologist" },
                  { type: "emergency", label: "Emergency Contact", role: "Spouse / Partner" },
                ] as const).map((t) => {
                  const on = form.contact_type === t.type;
                  return (
                    <TouchableOpacity
                      key={t.type}
                      onPress={() => setForm(prev => ({ ...prev, contact_type: t.type, role_title: t.role }))}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: on }}
                      className="flex-1 items-center justify-center rounded-md"
                      style={{ height: 40, borderWidth: 1, backgroundColor: on ? c.canvas : "transparent", borderColor: on ? c.hairline : "transparent" }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "500", color: on ? c.ink : c.steel }}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Full Name */}
              <Text className="text-[14px] font-medium text-ds-ink mb-1.5">
                Full Name
              </Text>
              <TextInput
                className="bg-ds-canvas border border-ds-hairline-strong rounded-lg px-4 text-[16px] text-ds-ink mb-4"
                style={{ height: 48 }}
                placeholder={form.contact_type === "doctor" ? "Dr. Jane Smith" : "John Smith"}
                placeholderTextColor={c.steel}
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
              />

              {/* Role / Relationship Presets */}
              <Text className="text-[14px] font-medium text-ds-ink mb-2">
                Role / Relationship
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-2.5">
                {currentPresets.map((preset) => {
                  const isSelected = form.role_title === preset || (preset === "Other" && !currentPresets.slice(0, -1).includes(form.role_title));
                  return (
                    <TouchableOpacity
                      key={preset}
                      onPress={() => selectPreset(preset)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      className="px-4 justify-center rounded-full border"
                      style={{ minHeight: 40, backgroundColor: isSelected ? (isDark ? c.ink : "#000000") : c.canvas, borderColor: isSelected ? (isDark ? c.ink : "#000000") : c.hairline }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "500", color: isSelected ? c.canvas : c.charcoal }}>
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                className="bg-ds-canvas border border-ds-hairline-strong rounded-lg px-4 text-[16px] text-ds-ink mb-4"
                style={{ height: 48 }}
                placeholder="Specific title or relationship"
                placeholderTextColor={c.steel}
                value={form.role_title}
                onChangeText={(t) => setForm({ ...form, role_title: t })}
              />

              {/* Phone Number */}
              <Text className="text-[14px] font-medium text-ds-ink mb-1.5">
                Phone Number
              </Text>
              <TextInput
                className="bg-ds-canvas border border-ds-hairline-strong rounded-lg px-4 text-[16px] text-ds-ink mb-2"
                style={{ height: 48 }}
                placeholder="+1 555-0100"
                placeholderTextColor={c.steel}
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(t) => setForm({ ...form, phone: t })}
              />
              <Text className="text-[13px] text-ds-steel mb-6 px-1">
                Enter phone number for direct one-tap calling and SMS messaging.
              </Text>

              {/* Save Button */}
              <DsButton label="Save Contact" onPress={saveContact} loading={isSaving} style={{ marginBottom: 12 }} />

              {editingContact && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setShowDeleteConfirm(true)}
                  disabled={isSaving}
                  className="rounded-lg items-center justify-center mb-5 border border-ds-hairline-strong"
                  style={{ height: 48 }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "500", color: c.danger }}>Remove Contact</Text>
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
