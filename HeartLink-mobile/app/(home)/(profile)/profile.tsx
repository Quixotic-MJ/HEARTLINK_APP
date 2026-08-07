import { useColorScheme } from "nativewind";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useToast } from "../../../contexts/ToastContext";

// ─── Profile Field Row ────────────────────────────────────────────────────────

function ProfileField({
  label,
  value,
  icon,
  iconType = "feather",
  iconBg = "#f8fafc",
  iconColor = "#94a3b8",
  unit,
  isLast = false,
  onPress,
}: {
  label: string;
  value: string;
  icon: string;
  iconType?: "feather" | "material";
  iconBg?: string;
  iconColor?: string;
  unit?: string;
  isLast?: boolean;
  onPress?: () => void;
}) {
  const Container = onPress ? TouchableOpacity : View;
  
  return (
    <Container
      activeOpacity={0.65}
      onPress={onPress}
      className="flex-row items-center py-3.5"
      style={!isLast ? { borderBottomWidth: 0.5, borderBottomColor: "#f1f5f9" } : undefined}
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3.5 border border-slate-200 dark:border-slate-800/70 flex-shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        {iconType === "material" ? (
          <MaterialCommunityIcons name={icon as any} size={17} color={iconColor} />
        ) : (
          <Feather name={icon as any} size={15} color={iconColor} />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
          {label}
        </Text>
        <Text className="text-[14px] font-medium text-slate-900 dark:text-white">
          {value}
          {unit && (
            <Text className="text-[13px] font-medium text-slate-500"> {unit}</Text>
          )}
        </Text>
      </View>
      {onPress && <Feather name="chevron-right" size={15} color="#94a3b8" />}
    </Container>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return (
    <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 mt-1">
      {title}
    </Text>
  );
}

// ─── Field Group card ─────────────────────────────────────────────────────────

function FieldGroup({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 px-4 mb-3">
      {children}
    </View>
  );
}

// ─── Quick Stat ───────────────────────────────────────────────────────────────

function QuickStat({
  value,
  label,
  iconBg,
  iconColor,
  icon,
  style,
}: {
  value: string;
  label: string;
  iconBg: string;
  iconColor: string;
  icon: string;
  style?: any;
}) {
  return (
    <View
      className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800/70 flex-row items-center gap-3"
      style={style}
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        <Feather name={icon as any} size={15} color={iconColor} />
      </View>
      <View>
        <Text className="text-[18px] font-medium text-slate-900 dark:text-white leading-tight">
          {value}
        </Text>
        <Text className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
          {label}
        </Text>
      </View>
    </View>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditProfileModal({
  visible,
  onClose,
  currentData,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  currentData: any;
  onSave: (data: any) => Promise<void> | void;
}) {
  const [name, setName] = useState(currentData.name);
  const [email, setEmail] = useState(currentData.email);
  const [phone, setPhone] = useState(currentData.phone);
  const [birthdate, setBirthdate] = useState(currentData.birthdate);
  const [gender, setGender] = useState(currentData.gender);
  const [height, setHeight] = useState(currentData.height);
  const [weight, setWeight] = useState(currentData.weight);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setName(currentData.name);
      setEmail(currentData.email);
      setPhone(currentData.phone);
      setBirthdate(currentData.birthdate);
      setGender(currentData.gender);
      setHeight(currentData.height);
      setWeight(currentData.weight);
      setIsSaving(false);
    }
  }, [visible, currentData]);

  const handleSave = async () => {
    setIsSaving(true);
    const hMeters = parseFloat(height) / 100;
    const wKg = parseFloat(weight);
    const bmi = (wKg / (hMeters * hMeters)).toFixed(1);

    await onSave({
      name,
      email,
      phone,
      birthdate,
      gender,
      height,
      weight,
      bmi: isNaN(Number(bmi)) ? currentData.bmi : bmi,
    });
    setIsSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(15,23,42,0.5)" }}
          onPress={onClose}
        >
          <Pressable className="bg-white dark:bg-slate-900 rounded-t-3xl px-5 pt-3 pb-8 border-t border-slate-200 dark:border-slate-800/50 max-h-[85%]">
            <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-5" />

            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-[20px] font-medium text-slate-900 dark:text-white">
                Edit profile
              </Text>
              <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                <Feather name="x" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
              <Text className="text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-2">Name</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-4 py-3 mb-4">
                <TextInput
                  className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <Text className="text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-2">Email</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-4 py-3 mb-4">
                <TextInput
                  className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <Text className="text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-2">Phone</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-4 py-3 mb-4">
                <TextInput
                  className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              <Text className="text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-2">Date of Birth</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-4 py-3 mb-4">
                <TextInput
                  className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium"
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                  value={birthdate}
                  onChangeText={setBirthdate}
                />
              </View>

              <Text className="text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-2">Gender</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-4 py-3 mb-4">
                <TextInput
                  className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium"
                  value={gender}
                  onChangeText={setGender}
                />
              </View>

              <Text className="text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-2">Height (cm)</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-4 py-3 mb-4">
                <TextInput
                  className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium"
                  keyboardType="numeric"
                  value={height}
                  onChangeText={setHeight}
                />
              </View>

              <Text className="text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-2">Weight (kg)</Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-4 py-3 mb-6">
                <TextInput
                  className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSave}
                disabled={isSaving}
                className="bg-[#0f172a] py-3.5 rounded-xl items-center justify-center flex-row gap-2 border border-[#0f172a]"
                style={{ opacity: isSaving ? 0.8 : 1 }}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#fff" />
                    <Text className="text-white font-medium text-[14px]">Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId, user, logout } = useUser();
  const { showToast } = useToast();

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    birthdate: "",
    gender: "",
    height: "",
    weight: "",
    bmi: "",
    bloodType: "O+",
    restingHR: "--",
    systolicBP: "--",
    diastolicBP: "--",
    conditions: [] as string[],
    medications: "None reported",
    allergies: "None reported",
    careTeam: [] as any[],
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const [profileRes, logsRes] = await Promise.all([
          fetch(`${base_url}/api/users/${userId}/profile`),
          fetch(`${base_url}/api/health-logs/${userId}`).catch(() => null)
        ]);
        
        if (!profileRes.ok) throw new Error("Failed to fetch profile");
        const data = await profileRes.json();
        
        let latestVitals = { restingHR: "--", systolicBP: "--", diastolicBP: "--" };
        if (logsRes && logsRes.ok) {
          const logsData = await logsRes.json();
          if (logsData && logsData.length > 0) {
            const latest = logsData[logsData.length - 1]; // Assuming the last is the latest, or sort by date
            latestVitals.restingHR = latest.heart_rate_bpm ? latest.heart_rate_bpm.toString() : "--";
            latestVitals.systolicBP = latest.systolic_bp ? latest.systolic_bp.toString() : "--";
            latestVitals.diastolicBP = latest.diastolic_bp ? latest.diastolic_bp.toString() : "--";
          }
        }
        
        const profile = data.profile;
        const baselines = data.baselines || {};
        const careTeam = data.care_team || [];
        
        if (profile) {
          let meds = "None reported";
          if (baselines.clinical?.on_medication) {
            meds = "Yes";
          }
          
          let allergies = "None reported";
          if (baselines.dietary?.allergies && baselines.dietary.allergies.length > 0) {
            allergies = baselines.dietary.allergies.join(", ");
          }

          setUserData(prev => ({
            ...prev,
            name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
            email: profile.email || "",
            phone: profile.phone || "",
            birthdate: profile.date_of_birth || "",
            gender: profile.sex || "",
            height: profile.height_cm ? profile.height_cm.toString() : "",
            weight: profile.weight_kg ? profile.weight_kg.toString() : "",
            bmi: (profile.weight_kg && profile.height_cm) 
              ? (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1) 
              : "0",
            conditions: baselines.clinical?.diagnosed_conditions || [],
            medications: meds,
            allergies: allergies,
            careTeam: careTeam,
            restingHR: latestVitals.restingHR,
            systolicBP: latestVitals.systolicBP,
            diastolicBP: latestVitals.diastolicBP,
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    if (userId) fetchProfile();
  }, [userId]);

  const handleUpdateData = async (newData: any) => {
    try {
      const names = (newData.name || "").split(" ");
      const firstName = names[0] || "";
      const lastName = names.slice(1).join(" ");
      
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email: newData.email || userData.email,
        phone: newData.phone || userData.phone,
        date_of_birth: newData.birthdate || userData.birthdate,
        sex: newData.gender || userData.gender,
        height_cm: parseFloat(newData.height),
        weight_kg: parseFloat(newData.weight),
        health_goals: [] // default
      };
      
      await fetch(`${base_url}/api/users/${userId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setUserData((prev) => ({ ...prev, ...newData }));
    } catch (err) {
      console.error(err);
    }
    setShowUpdateModal(false);
  };

  const exportPDF = async () => {
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
              h1 { font-size: 28px; font-weight: bold; margin-bottom: 8px; color: #0f172a; }
              p { margin: 0 0 30px 0; color: #64748b; font-size: 16px; }
              .details { margin-bottom: 30px; font-size: 16px; background-color: #f8fafc; padding: 20px; border-radius: 12px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 40px; }
              th, td { text-align: left; padding: 14px 16px; border-bottom: 1px solid #e2e8f0; }
              th { background-color: #f1f5f9; font-weight: bold; color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
              td { font-size: 15px; color: #334155; }
              .highlight { font-weight: bold; color: #0f172a; }
              h2 { font-size: 20px; color: #0f172a; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
            </style>
          </head>
          <body>
            <h1>Patient Health Profile</h1>
            <p>Generated by HeartLink</p>
            
            <div class="details">
              <strong>Patient:</strong> ${userData.name}<br><br>
              <strong>Date of Birth:</strong> ${userData.birthdate}
            </div>
            
            <h2>Personal Information</h2>
            <table>
              <tr><th>Attribute</th><th>Value</th></tr>
              <tr><td>Email</td><td class="highlight">${userData.email}</td></tr>
              <tr><td>Phone</td><td class="highlight">${userData.phone}</td></tr>
              <tr><td>Gender</td><td class="highlight">${userData.gender}</td></tr>
            </table>

            <h2>Biometrics</h2>
            <table>
              <tr><th>Attribute</th><th>Value</th></tr>
              <tr><td>Height</td><td class="highlight">${userData.height} cm</td></tr>
              <tr><td>Weight</td><td class="highlight">${userData.weight} kg</td></tr>
              <tr><td>Resting Heart Rate</td><td class="highlight">${userData.restingHR} bpm</td></tr>
              <tr><td>Blood Pressure</td><td class="highlight">${userData.systolicBP}/${userData.diastolicBP} mmHg</td></tr>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (!(await Sharing.isAvailableAsync())) {
        showToast({ title: "Error", message: "Sharing is not available on this device.", type: "error" });
        return;
      }
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error(error);
      showToast({ title: "Error", message: "Failed to generate report.", type: "error" });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/50">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="flex-1 text-[17px] font-medium text-slate-900 dark:text-white">
          My profile
        </Text>
        <TouchableOpacity onPress={() => setShowUpdateModal(true)} className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center">
          <Feather name="edit-2" size={15} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        contentContainerClassName="pb-16"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar hero ── */}
        <View className="items-center pt-6 pb-5 px-5">
          <View className="relative mb-4">
            <View className="w-24 h-24 rounded-full bg-slate-200 overflow-hidden border-4 border-white"
              style={{ shadowColor: "#0f172a", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 }}
            >
              <Image
                source={{ uri: user?.avatar_url || "https://ui-avatars.com/api/?name=" + (user?.first_name || "U") + "&background=e2e8f0&color=475569&bold=true" }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
          </View>

          <Text className="text-[20px] font-medium text-slate-900 dark:text-white tracking-tight">
            {userData.name}
          </Text>
          <Text className="text-[14px] font-medium text-slate-500 dark:text-slate-400 mt-1">{userData.email}</Text>

          {/* Clinical History Tags */}
          {userData.conditions && userData.conditions.length > 0 && (
            <View className="flex-row flex-wrap justify-center gap-2 mt-3 w-full">
              {userData.conditions.map((condition, index) => (
                <View key={index} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800/70 px-3 py-1.5 rounded-full">
                  <Text className="text-[12px] text-slate-600 font-medium">{condition}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Quick stats */}
          <View className="gap-2.5 mt-5 w-full">
            <QuickStat value={`${userData.systolicBP}/${userData.diastolicBP}`} label="Blood pressure" icon="trending-up" iconBg="#eaf3de" iconColor="#3b6d11" style={{ width: "100%" }} />
            <View className="flex-row justify-between w-full">
              <QuickStat value={userData.bmi} label="BMI" icon="activity" iconBg="#e6f1fb" iconColor="#185fa5" style={{ width: "48.5%" }} />
              <QuickStat value={userData.restingHR} label="Resting HR" icon="heart" iconBg="#faeeda" iconColor="#854f0b" style={{ width: "48.5%" }} />
            </View>
          </View>
        </View>

        <View className="px-5">

          {/* ── Personal ── */}
          <SectionLabel title="Personal" />
          <FieldGroup>
            <ProfileField label="Full name" value={userData.name} icon="user" />
            <ProfileField label="Email" value={userData.email} icon="mail" />
            <ProfileField label="Phone" value={userData.phone} icon="phone" />
            <ProfileField label="Date of birth" value={userData.birthdate} icon="calendar" />
            <ProfileField label="Gender" value={userData.gender ? userData.gender.charAt(0).toUpperCase() + userData.gender.slice(1).toLowerCase() : ""} icon="users" isLast />
          </FieldGroup>

          {/* ── Biometrics ── */}
          <SectionLabel title="Biometrics" />
          <FieldGroup>
            <ProfileField label="Height" value={userData.height} unit="cm" icon="maximize-2" iconBg="#e6f1fb" iconColor="#185fa5" />
            <ProfileField label="Weight" value={userData.weight} unit="kg" icon="target" iconBg="#e6f1fb" iconColor="#185fa5" />
            {/* These vitals should be fetched from the user's latest daily vitals log, not edited here */}
            <ProfileField
              label="Blood pressure"
              value={`${userData.systolicBP}/${userData.diastolicBP}`}
              unit="mmHg"
              icon="heart-pulse"
              iconType="material"
              iconBg="#fcebeb"
              iconColor="#a32d2d"
            />
            <ProfileField
              label="Resting heart rate"
              value={userData.restingHR}
              unit="bpm"
              icon="heart"
              iconBg="#fcebeb"
              iconColor="#a32d2d"
              isLast
            />
          </FieldGroup>

          {/* ── Actions ── */}
          <View className="gap-2.5 mt-2">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/(home)/(profile)/analytics" as any)}
              className="bg-primary/5 dark:bg-primary/10 rounded-2xl py-3.5 flex-row items-center justify-center gap-2 border border-primary/20 dark:border-primary/30"
            >
              <Feather name="bar-chart-2" size={15} className="text-primary" />
              <Text className="text-[15px] font-semibold text-primary">
                Long-Term Analytics
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/(home)/(profile)/care-team")}
              className="bg-primary/5 dark:bg-primary/10 rounded-2xl py-3.5 flex-row items-center justify-center gap-2 border border-primary/20 dark:border-primary/30"
            >
              <Feather name="users" size={15} className="text-primary" />
              <Text className="text-[15px] font-semibold text-primary">
                My Care Team
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={exportPDF}
              className="bg-primary/5 dark:bg-primary/10 rounded-2xl py-3.5 flex-row items-center justify-center gap-2 border border-primary/20 dark:border-primary/30"
            >
              <Feather name="download" size={15} className="text-primary" />
              <Text className="text-[15px] font-semibold text-primary">
                Download health report
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        currentData={userData}
        onSave={handleUpdateData}
      />
    </SafeAreaView>
  );
}