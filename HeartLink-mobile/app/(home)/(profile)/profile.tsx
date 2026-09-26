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
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useToast } from "../../../contexts/ToastContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Helper Components ────────────────────────────────────────────────────────

function StatCard({ icon, iconColor, value, label }: { icon: any, iconColor: string, value: string, label: string }) {
  return (
    <View className="flex-1 rounded-2xl p-3 border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/70">
      <Feather name={icon} size={14} color={iconColor} style={{ marginBottom: 6 }} />
      <Text className="text-[16px] font-bold mb-0.5 text-slate-900 dark:text-white">{value}</Text>
      <Text className="text-[10px] text-slate-500 dark:text-slate-400">{label}</Text>
    </View>
  );
}

function PersonalRow({ icon, value, isLast = false }: { icon: any, value: string, isLast?: boolean }) {
  return (
    <View className={`flex-row items-center py-3.5 ${!isLast ? 'border-b border-slate-200 dark:border-slate-800/70' : ''}`}>
      <View className="w-6 items-center mr-2">
        <Feather name={icon} size={14} className="text-slate-500 dark:text-slate-400" />
      </View>
      <Text className="text-[14px] font-bold flex-1 text-slate-900 dark:text-white">{value}</Text>
    </View>
  );
}

function BiometricCard({ label, value, unit }: { label: string, value: string, unit: string }) {
  return (
    <View className="rounded-2xl p-3.5 border mb-3 w-[48%] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/70">
      <Text className="text-[10px] font-bold mb-1 text-slate-500 dark:text-slate-400">{label}</Text>
      <Text className="text-[16px] font-bold text-slate-900 dark:text-white">
        {value} <Text className="text-[12px] font-normal text-slate-500 dark:text-slate-400">{unit}</Text>
      </Text>
    </View>
  );
}

function MoreRow({ icon, label, onPress, isLast = false }: { icon: any, label: string, onPress: () => void, isLast?: boolean }) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} className={`flex-row items-center py-4 ${!isLast ? 'border-b border-slate-200 dark:border-slate-800/70' : ''}`}>
      <View className="w-6 items-center mr-2">
        <Feather name={icon} size={15} className="text-slate-900 dark:text-white" />
      </View>
      <Text className="flex-1 text-[14px] font-bold text-slate-900 dark:text-white">{label}</Text>
      <Feather name="chevron-right" size={16} className="text-slate-400 dark:text-slate-500" />
    </TouchableOpacity>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditField({ 
  label, 
  value, 
  onChangeText, 
  rightIcon, 
  editable = true, 
  keyboardType = "default", 
  hasBorder = true,
  rightText = ""
}: any) {
  return (
    <View className={`px-4 py-3 ${hasBorder ? 'border-b border-slate-200 dark:border-slate-800/70' : ''} flex-row items-center justify-between`}>
      <View className="flex-1">
        <Text className="text-[11px] font-bold mb-1 text-slate-500 dark:text-slate-400">{label}</Text>
        <TextInput
           value={value}
           onChangeText={onChangeText}
           editable={editable}
           keyboardType={keyboardType}
           className="text-[15px] font-bold p-0 m-0 text-slate-900 dark:text-white"
           style={{ opacity: editable ? 1 : 0.5 }}
        />
      </View>
      {rightText ? (
        <Text className="text-[12px] text-slate-500 dark:text-slate-400 ml-2 font-normal">{rightText}</Text>
      ) : null}
      {rightIcon && <Feather name={rightIcon} size={14} className="text-slate-400 dark:text-slate-500" />}
    </View>
  );
}

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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

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

  const getInitials = (nameStr: string) => {
    if (!nameStr) return "JM";
    const parts = nameStr.trim().split(" ");
    if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return nameStr.substring(0, 2).toUpperCase();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-slate-50 dark:bg-slate-950">
        {/* Header */}
        <View className="flex-row justify-between items-center px-5 pt-14 pb-4">
          <TouchableOpacity onPress={onClose} className="p-2 -ml-2">
            <Text className="text-slate-500 dark:text-slate-400 text-[15px]">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-slate-900 dark:text-white font-bold text-[17px]">Edit profile</Text>
          <TouchableOpacity onPress={handleSave} className="p-2 -mr-2">
            <Text className="text-blue-500 text-[15px] font-semibold">Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          {/* PERSONAL */}
          <Text className="text-[11px] font-bold mx-5 mb-2 mt-4 uppercase tracking-widest text-slate-500 dark:text-slate-400">Personal</Text>
          <View className="rounded-2xl border border-slate-200 dark:border-slate-800/70 bg-white dark:bg-slate-900 mx-5 overflow-hidden mb-6">
            <EditField label="Full name" value={name} onChangeText={setName} />
            <EditField label="Email" value={email} onChangeText={setEmail} editable={false} rightIcon="lock" />
            <EditField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <EditField label="Date of birth" value={birthdate} onChangeText={setBirthdate} rightIcon="calendar" />
            <EditField label="Gender" value={gender} onChangeText={setGender} rightIcon="chevron-down" hasBorder={false} />
          </View>

          {/* BIOMETRICS */}
          <Text className="text-[11px] font-bold mx-5 mb-2 uppercase tracking-widest text-slate-500 dark:text-slate-400">Biometrics</Text>
          <View className="rounded-2xl border border-slate-200 dark:border-slate-800/70 bg-white dark:bg-slate-900 mx-5 overflow-hidden mb-2">
            <View className="flex-row border-b border-slate-200 dark:border-slate-800/70">
              <View className="flex-1 border-r border-slate-200 dark:border-slate-800/70">
                <EditField label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="numeric" hasBorder={false} />
              </View>
              <View className="flex-1">
                <EditField label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" hasBorder={false} />
              </View>
            </View>
            <EditField label="Blood pressure" value={`${currentData.systolicBP} / ${currentData.diastolicBP}`} editable={false} rightText="mmHg" />
            <EditField label="Resting heart rate" value={currentData.restingHR} editable={false} rightText="bpm" hasBorder={false} />
          </View>
          <Text className="text-[11px] text-slate-500 mx-5 mb-8">BMI updates automatically from height and weight.</Text>

          <View className="px-5 pb-12">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSave}
              disabled={isSaving}
              className="bg-slate-900 dark:bg-slate-100 py-4 rounded-xl items-center justify-center flex-row gap-2"
              style={{ opacity: isSaving ? 0.8 : 1 }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={isDark ? "#0F172A" : "#FFFFFF"} />
              ) : (
                <Text className="text-white dark:text-slate-900 font-bold text-[16px]">Save changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────

export default function ProfileScreen({ isTab = false }: { isTab?: boolean } = {}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId, token, user, refreshUser } = useUser();
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
        const effectiveToken = token || "";
        const [profileRes, logsRes] = await Promise.all([
          fetch(`${base_url}/api/users/${userId}/profile`, {
            headers: {
              "Authorization": `Bearer ${effectiveToken}`,
            },
          }),
          fetch(`${base_url}/api/health-logs/${userId}`, {
            headers: {
              "Authorization": `Bearer ${effectiveToken}`,
            },
          }).catch(() => null)
        ]);
        
        if (!profileRes.ok) throw new Error("Failed to fetch profile");
        const data = await profileRes.json();
        
        let latestVitals = { restingHR: "--", systolicBP: "--", diastolicBP: "--" };
        if (logsRes && logsRes.ok) {
          const logsData = await logsRes.json();
          if (logsData && logsData.length > 0) {
            const latest = logsData[logsData.length - 1]; 
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
          if (baselines.clinical?.on_medication) meds = "Yes";
          
          let allergies = "None reported";
          if (baselines.dietary?.allergies && baselines.dietary.allergies.length > 0) {
            allergies = baselines.dietary.allergies.join(", ");
          } else if (baselines.onboarding?.allergies && baselines.onboarding.allergies.length > 0) {
            allergies = baselines.onboarding.allergies.join(", ");
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
  }, [userId, token]);

  const handleUpdateData = async (newData: any) => {
    try {
      const names = (newData.name || "").trim().split(" ");
      const firstName = names[0] || "";
      const lastName = names.slice(1).join(" ");
      
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email: newData.email || userData.email || null,
        phone: newData.phone || userData.phone || null,
        date_of_birth: newData.birthdate || userData.birthdate,
        sex: newData.gender || userData.gender,
        height_cm: parseFloat(newData.height),
        weight_kg: parseFloat(newData.weight),
        health_goals: [] 
      };
      
      const effectiveToken = token || "";
      const response = await fetch(`${base_url}/api/users/${userId}/profile`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify(payload)
      });
      
      const resData = await response.json();
      if (!response.ok) {
        showToast({ title: "Update Failed", message: resData.detail || "Failed to update profile.", type: "error" });
        return;
      }
      
      setUserData((prev) => ({ ...prev, ...newData }));
      showToast({ title: "Profile Updated", message: "Your profile details have been saved.", type: "success" });
      setShowUpdateModal(false);
      await refreshUser();
    } catch (err) {
      console.error(err);
      showToast({ title: "Error", message: "An unexpected error occurred while saving.", type: "error" });
    }
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

  const getInitials = (name: string) => {
    if (!name) return "JM";
    const parts = name.trim().split(" ");
    if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <ScreenWrapper edges={["top"]} withScrollView={false}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-4">
        <View className="flex-row items-center">
          {!isTab && (
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Feather name="arrow-left" size={20} className="text-slate-900 dark:text-white" />
            </TouchableOpacity>
          )}
          <Text className="text-[20px] font-bold text-slate-900 dark:text-white">
            My profile
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => setShowUpdateModal(true)} 
          className="w-8 h-8 rounded-full items-center justify-center bg-slate-100 dark:bg-slate-800"
        >
          <Feather name="edit-2" size={14} className="text-slate-900 dark:text-white" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        keyboardShouldPersistTaps="handled" 
        keyboardDismissMode="on-drag"
        contentContainerClassName="pb-40 px-5 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View className="rounded-2xl p-4 flex-row items-center border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/70">
          <View className="relative mr-4">
            <View className="w-[52px] h-[52px] rounded-full items-center justify-center bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800">
              <Text className="text-blue-700 dark:text-blue-300 font-bold text-[16px] tracking-widest">{getInitials(userData.name)}</Text>
            </View>
            <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900" />
          </View>
          <View className="flex-1">
            <Text className="text-[16px] font-bold mb-0.5 text-slate-900 dark:text-white">
              {userData.name || "Loading..."}
            </Text>
            <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
              {userData.email}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row justify-between mt-3 gap-3">
          <StatCard icon="activity" iconColor="#4ADE80" value={`${userData.systolicBP}/${userData.diastolicBP}`} label="Blood pressure" />
          <StatCard icon="activity" iconColor="#60A5FA" value={userData.bmi} label="BMI" />
          <StatCard icon="heart" iconColor="#F87171" value={userData.restingHR} label="Resting HR" />
        </View>

        {/* PERSONAL */}
        <Text className="text-[11px] font-bold mt-6 mb-2 uppercase tracking-widest text-slate-500 dark:text-slate-400">Personal</Text>
        <View className="rounded-3xl px-4 border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/70">
          <PersonalRow icon="mail" value={userData.email || "Not provided"} />
          <PersonalRow icon="phone" value={userData.phone || "Not provided"} />
          <PersonalRow icon="calendar" value={userData.birthdate || "Not provided"} />
          <PersonalRow icon="user" value={userData.gender ? userData.gender.charAt(0).toUpperCase() + userData.gender.slice(1).toLowerCase() : "Not provided"} isLast />
        </View>

        {/* BIOMETRICS */}
        <Text className="text-[11px] font-bold mt-6 mb-2 uppercase tracking-widest text-slate-500 dark:text-slate-400">Biometrics</Text>
        <View className="flex-row flex-wrap justify-between">
          <BiometricCard label="Height" value={userData.height || "--"} unit="cm" />
          <BiometricCard label="Weight" value={userData.weight || "--"} unit="kg" />
          <BiometricCard label="Blood pressure" value={`${userData.systolicBP}/${userData.diastolicBP}`} unit="" />
          <BiometricCard label="Resting HR" value={userData.restingHR} unit="bpm" />
        </View>

        {/* MORE */}
        <Text className="text-[11px] font-bold mt-3 mb-2 uppercase tracking-widest text-slate-500 dark:text-slate-400">More</Text>
        <View className="rounded-3xl px-4 border mb-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/70">
          <MoreRow icon="bar-chart-2" label="Long-term analytics" onPress={() => router.push("/(home)/(profile)/analytics")} />
          <MoreRow icon="users" label="My care team" onPress={() => router.push("/(home)/(profile)/care-team")} />
          <MoreRow icon="file-text" label="Doctor consultation summary" onPress={() => router.push("/(home)/(tabs)/wrap-up" as any)} />
          <MoreRow icon="download" label="Download biometrics PDF" onPress={exportPDF} isLast />
        </View>

      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        currentData={userData}
        onSave={handleUpdateData}
      />
    </ScreenWrapper>
  );
}
