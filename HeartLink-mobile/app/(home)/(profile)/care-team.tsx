import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Linking, 
  Alert, 
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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

function ContactCard({ 
  contact,
  onEdit
}: { 
  contact: any;
  onEdit: () => void;
}) {
  const isDoctor = contact.contact_type === "doctor";
  const title = isDoctor ? "Doctor" : "Emergency Contact";
  const icon = isDoctor ? "user" : "heart";

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-[13px] font-medium text-slate-400 uppercase tracking-wide">
          {title}
        </Text>
        <TouchableOpacity onPress={onEdit}>
          <Text className="text-[13px] font-medium text-blue-600">Edit</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center mb-4">
        <View className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mr-4">
          <Feather name={icon as any} size={20} color="#64748b" />
        </View>
        <View className="flex-1">
          <Text className="text-[16px] font-semibold text-slate-900 dark:text-white mb-0.5">{contact.name}</Text>
          <Text className="text-[14px] text-slate-500 dark:text-slate-400">{contact.role_title || "Care Team Member"}</Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => Linking.openURL(`tel:${contact.phone}`)}
          className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-1.5"
          style={{ backgroundColor: "#0f172a" }}
        >
          <Feather name="phone-call" size={14} color="#fff" />
          <Text className="text-[13px] font-medium text-white">Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => Linking.openURL(`sms:${contact.phone}`)}
          className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl border border-slate-200 dark:border-slate-800/70 bg-slate-50 dark:bg-slate-950 gap-1.5"
        >
          <Feather name="message-circle" size={14} color="#475569" />
          <Text className="text-[13px] font-medium text-slate-600 dark:text-slate-300">Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CareTeamScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId } = useUser();
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
      const response = await fetch(`${base_url}/api/users/${userId}/profile`);
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
  }, [userId]);

  const openAddModal = () => {
    setEditingContact(null);
    setForm({ name: "", role_title: "", contact_type: "doctor", phone: "" });
    setModalVisible(true);
  };

  const openEditModal = (contact: any) => {
    setEditingContact(contact);
    setForm({ 
      name: contact.name, 
      role_title: contact.role_title, 
      contact_type: contact.contact_type, 
      phone: contact.phone 
    });
    setModalVisible(true);
  };

  const saveContact = async () => {
    if (!form.name || !form.phone) {
      showToast({ title: "Missing Info", message: "Please enter a name and phone number.", type: "error" });
      return;
    }

    setIsSaving(true);
    try {
      const method = editingContact ? "PUT" : "POST";
      const endpoint = editingContact 
        ? `${base_url}/api/users/${userId}/care-team/${editingContact.id}`
        : `${base_url}/api/users/${userId}/care-team`;

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (response.ok) {
        setModalVisible(false);
        fetchCareTeam();
        showToast({ title: "Success", message: "Contact saved.", type: "success" });
      } else {
        showToast({ title: "Error", message: "Could not save contact.", type: "error" });
      }
    } catch (e) {
      showToast({ title: "Error", message: "Network error.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteContact = async () => {
    if (!editingContact) return;
    try {
      setIsSaving(true);
      const response = await fetch(`${base_url}/api/users/${userId}/care-team/${editingContact.id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        setModalVisible(false);
        setShowDeleteConfirm(false);
        fetchCareTeam();
        showToast({ title: "Success", message: "Contact removed.", type: "success" });
      }
    } catch (e) {
      showToast({ title: "Error", message: "Network error.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View className="px-5 pt-4 pb-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/50">
        <View className="flex-row items-center mb-1">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
          >
            <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[17px] font-medium text-slate-900 dark:text-white" numberOfLines={1}>
              My Care Team
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerClassName="p-5 pb-20" showsVerticalScrollIndicator={false}>
        
        {/* Emergency SOS Button */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => Linking.openURL("tel:911")}
          className="bg-red-500 rounded-2xl p-5 mb-6 flex-row items-center justify-center gap-3 shadow-sm shadow-red-500/30"
        >
          <MaterialCommunityIcons name="alert-circle" size={24} color="white" />
          <Text className="text-white text-[18px] font-bold tracking-wide">
            EMERGENCY SOS
          </Text>
        </TouchableOpacity>

        {/* Contacts */}
        {isLoading ? (
          <View className="gap-3">
            {[1, 2].map((key) => (
              <View key={key} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 p-4 rounded-2xl">
                <View className="flex-row items-center mb-3">
                  <Skeleton className="w-12 h-12 rounded-full mr-3" />
                  <View className="flex-1">
                    <Skeleton className="w-1/2 h-5 mb-1.5" />
                    <Skeleton className="w-1/3 h-4" />
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <Skeleton className="flex-1 h-10 rounded-xl" />
                  <Skeleton className="flex-1 h-10 rounded-xl" />
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
            title="No care team members"
            subtitle="Add your doctors, specialists, or emergency contacts here."
          />
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={openAddModal}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-4 items-center justify-center py-6 mt-2"
        >
          <View className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mb-2">
            <Feather name="plus" size={18} color="#64748b" />
          </View>
          <Text className="text-[14px] font-medium text-slate-600 dark:text-slate-400">Add another contact</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Add/Edit Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable className="flex-1 justify-end bg-black/50" onPress={() => setModalVisible(false)}>
          <Pressable className="bg-white dark:bg-slate-900 rounded-t-3xl pt-6 px-6" style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
            
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-[20px] font-semibold text-slate-900 dark:text-white">
                {editingContact ? "Edit Contact" : "Add Contact"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="w-8 h-8 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
                <Feather name="x" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type Toggle */}
              <View className="flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-5">
                <TouchableOpacity 
                  onPress={() => setForm({...form, contact_type: "doctor"})}
                  className={`flex-1 py-2.5 rounded-lg items-center ${form.contact_type === "doctor" ? "bg-white shadow-sm" : ""}`}
                >
                  <Text className={`text-[14px] font-medium ${form.contact_type === "doctor" ? "text-slate-900" : "text-slate-500"}`}>Doctor</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setForm({...form, contact_type: "emergency"})}
                  className={`flex-1 py-2.5 rounded-lg items-center ${form.contact_type === "emergency" ? "bg-white shadow-sm" : ""}`}
                >
                  <Text className={`text-[14px] font-medium ${form.contact_type === "emergency" ? "text-slate-900" : "text-slate-500"}`}>Emergency</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-[13px] font-medium text-slate-500 mb-1.5 ml-1">Full Name</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-[15px] text-slate-900 dark:text-white mb-4"
                placeholder="Dr. John Doe"
                placeholderTextColor="#94a3b8"
                value={form.name}
                onChangeText={(t) => setForm({...form, name: t})}
              />

              <Text className="text-[13px] font-medium text-slate-500 mb-1.5 ml-1">Role / Relationship</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-[15px] text-slate-900 dark:text-white mb-4"
                placeholder={form.contact_type === "doctor" ? "Primary Cardiologist" : "Spouse"}
                placeholderTextColor="#94a3b8"
                value={form.role_title}
                onChangeText={(t) => setForm({...form, role_title: t})}
              />

              <Text className="text-[13px] font-medium text-slate-500 mb-1.5 ml-1">Phone Number</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-[15px] text-slate-900 dark:text-white mb-6"
                placeholder="+1 555-0100"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(t) => setForm({...form, phone: t})}
              />

              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={saveContact}
                disabled={isSaving}
                className="bg-blue-600 rounded-xl py-4 items-center mb-3"
              >
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-medium text-[16px]">Save Contact</Text>}
              </TouchableOpacity>

              {editingContact && (
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => setShowDeleteConfirm(true)}
                  disabled={isSaving}
                  className="bg-red-50 dark:bg-red-950/30 rounded-xl py-4 items-center mb-5 border border-red-100 dark:border-red-900/50"
                >
                  <Text className="text-red-600 font-medium text-[16px]">Remove Contact</Text>
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
        title="Remove Contact"
        message="Are you sure you want to remove this contact from your care team?"
        confirmLabel="Remove"
        variant="destructive"
        mode="bottom-sheet"
        icon="trash-2"
      />

    </SafeAreaView>
  );
}
