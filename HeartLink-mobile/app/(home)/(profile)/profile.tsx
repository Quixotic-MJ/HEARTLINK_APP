import { apiFetch } from "../../../lib/api";
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
} from "react-native";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
let isCurrentlySharing = false;
import { useUser } from "../../../contexts/UserContext";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useToast } from "../../../contexts/ToastContext";
import { ds } from "../../../constants/theme";

// Report colours (the PDF is always light).
const P = ds.light;
// ─── Helper Components ────────────────────────────────────────────────────────

function StatCard({ icon, value, label }: { icon: any, value: string, label: string }) {
  const { c } = useDs();
  return (
    <View className="flex-1 rounded-xl p-3 border bg-ds-canvas border-ds-hairline">
      <Feather name={icon} size={14} color={c.slate} style={{ marginBottom: 6 }} />
      <Text className="text-[16px] font-semibold mb-0.5 text-ds-ink">{value}</Text>
      <Text className="text-[12px] text-ds-slate">{label}</Text>
    </View>
  );
}

function PersonalRow({ icon, value, isLast = false }: { icon: any, value: string, isLast?: boolean }) {
  const { c } = useDs();
  return (
    <View className={`flex-row items-center py-3.5 ${!isLast ? 'border-b border-ds-hairline' : ''}`}>
      <View className="w-6 items-center mr-2">
        <Feather name={icon} size={14} color={c.slate} />
      </View>
      <Text className="text-[15px] font-medium flex-1 text-ds-ink">{value}</Text>
    </View>
  );
}

function BiometricCard({ label, value, unit }: { label: string, value: string, unit: string }) {
  return (
    <View className="rounded-xl p-3.5 border mb-3 w-[48%] bg-ds-canvas border-ds-hairline">
      <Text className="text-[12px] font-semibold mb-1 text-ds-slate">{label}</Text>
      <Text className="text-[16px] font-semibold text-ds-ink">
        {value} <Text className="text-[12px] font-normal text-ds-slate">{unit}</Text>
      </Text>
    </View>
  );
}

function MoreRow({ icon, label, onPress, isLast = false }: { icon: any, label: string, onPress: () => void, isLast?: boolean }) {
  const { c } = useDs();
  return (
    <View className={`${!isLast ? 'border-b border-ds-hairline' : ''}`}>
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} className="flex-row items-center py-4">
        <View className="w-6 items-center mr-2">
          <Feather name={icon} size={15} color={c.ink} />
        </View>
        <Text className="flex-1 text-[15px] font-medium text-ds-ink">{label}</Text>
        <Feather name="chevron-right" size={16} color={c.steel} />
      </TouchableOpacity>
    </View>
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
  const { c } = useDs();
  return (
    <View className={`px-4 py-3 ${hasBorder ? 'border-b border-ds-hairline' : ''} flex-row items-center justify-between`}>
      <View className="flex-1">
        <Text className="text-[11px] font-semibold mb-1 text-ds-slate">{label}</Text>
        <TextInput
           value={value}
           onChangeText={onChangeText}
           editable={editable}
           keyboardType={keyboardType}
           className="text-[15px] font-semibold p-0 m-0 text-ds-ink"
        />
      </View>
      {rightText ? (
        <Text className="text-[12px] text-ds-slate ml-2 font-normal">{rightText}</Text>
      ) : null}
      {rightIcon && <Feather name={rightIcon} size={14} color={c.steel} />}
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-ds-surface">
        {/* Header */}
        <View className="flex-row justify-between items-center px-5 pt-14 pb-4">
          <TouchableOpacity onPress={onClose} className="p-2 -ml-2">
            <Text className="text-ds-slate text-[15px]">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-ds-ink font-semibold text-[17px]">Edit profile</Text>
          <TouchableOpacity onPress={handleSave} className="p-2 -mr-2">
            <Text className="text-ds-link text-[15px] font-semibold">Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          {/* PERSONAL */}
          <Text className="text-[11px] font-semibold mx-5 mb-2 mt-4 uppercase tracking-widest text-ds-steel">Personal</Text>
          <View className="rounded-xl border border-ds-hairline bg-ds-canvas mx-5 overflow-hidden mb-6">
            <EditField label="Full name" value={name} onChangeText={setName} />
            <EditField label="Email" value={email} onChangeText={setEmail} editable={false} rightIcon="lock" />
            <EditField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <EditField label="Date of birth" value={birthdate} onChangeText={setBirthdate} rightIcon="calendar" />
            <EditField label="Gender" value={gender} onChangeText={setGender} rightIcon="chevron-down" hasBorder={false} />
          </View>

          {/* BIOMETRICS */}
          <Text className="text-[11px] font-semibold mx-5 mb-2 uppercase tracking-widest text-ds-steel">Biometrics</Text>
          <View className="rounded-xl border border-ds-hairline bg-ds-canvas mx-5 overflow-hidden mb-2">
            <View className="flex-row border-b border-ds-hairline">
              <View className="flex-1 border-r border-ds-hairline">
                <EditField label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="numeric" hasBorder={false} />
              </View>
              <View className="flex-1">
                <EditField label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" hasBorder={false} />
              </View>
            </View>
            <EditField label="Blood pressure" value={`${currentData.systolicBP} / ${currentData.diastolicBP}`} editable={false} rightText="mmHg" />
            <EditField label="Resting heart rate" value={currentData.restingHR} editable={false} rightText="bpm" hasBorder={false} />
          </View>
          <Text className="text-[11px] text-ds-slate mx-5 mb-8">BMI updates automatically from height and weight.</Text>

          <View className="px-5 pb-12">
            <DsButton label="Save changes" onPress={handleSave} loading={isSaving} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────

export default function ProfileScreen({ isTab = false }: { isTab?: boolean } = {}) {
  const { c, isDark } = useDs();
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
          apiFetch(`/api/users/${userId}/profile`, {
            headers: {
              "Authorization": `Bearer ${effectiveToken}`,
            },
          }),
          apiFetch(`/api/health-logs/${userId}?page=1&page_size=1`, {
            headers: {
              "Authorization": `Bearer ${effectiveToken}`,
            },
          }).catch(() => null)
        ]);
        
        if (!profileRes.ok) throw new Error("Failed to fetch profile");
        const data = await profileRes.json();
        
        let latestVitals = { restingHR: "--", systolicBP: "--", diastolicBP: "--" };
        if (logsRes && logsRes.ok) {
          const logsResData = await logsRes.json();
          const logsData = logsResData.data ?? logsResData;
          if (logsData && logsData.length > 0) {
            const latest = logsData[0]; 
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
      const response = await apiFetch(`/api/users/${userId}/profile`, {
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
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: ${P.ink}; line-height: 1.5; }
              h1 { font-size: 28px; font-weight: bold; margin-bottom: 8px; color: ${P.ink}; }
              p { margin: 0 0 30px 0; color: ${P.slate}; font-size: 16px; }
              .details { margin-bottom: 30px; font-size: 16px; background-color: ${P.surface}; padding: 20px; border-radius: 12px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 40px; }
              th, td { text-align: left; padding: 14px 16px; border-bottom: 1px solid ${P.hairline}; }
              th { background-color: ${P.surfaceAlt}; font-weight: bold; color: ${P.slate}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
              td { font-size: 15px; color: ${P.charcoal}; }
              .highlight { font-weight: bold; color: ${P.ink}; }
              h2 { font-size: 20px; color: ${P.ink}; margin-bottom: 8px; border-bottom: 2px solid ${P.hairline}; padding-bottom: 8px; }
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
      if (isCurrentlySharing) return; isCurrentlySharing = true; try { await Sharing.shareAsync(uri); } finally { setTimeout(() => { isCurrentlySharing = false; }, 1000); }
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
    <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-ds-canvas">
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-4">
        <View className="flex-row items-center">
          {!isTab && (
            <View className="mr-3">
              <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
            </View>
          )}
          <Text className="text-[22px] font-semibold text-ds-ink">
            My profile
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowUpdateModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          className="items-center justify-center"
          style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}
        >
          <Feather name="edit-2" size={16} color={c.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        keyboardShouldPersistTaps="handled" 
        keyboardDismissMode="on-drag"
        contentContainerClassName="pb-40 px-5 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View className="rounded-xl p-4 flex-row items-center border bg-ds-canvas border-ds-hairline">
          <View className="relative mr-4">
            <View className="w-[52px] h-[52px] rounded-full items-center justify-center bg-ds-tint">
              <Text className="text-ds-on-tint font-semibold text-[16px] tracking-widest">{getInitials(userData.name)}</Text>
            </View>
            <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-ds-success rounded-full border-2 border-ds-canvas" />
          </View>
          <View className="flex-1">
            <Text className="text-[16px] font-semibold mb-0.5 text-ds-ink">
              {userData.name || "Loading..."}
            </Text>
            <Text className="text-[12px] font-medium text-ds-slate">
              {userData.email}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row justify-between mt-3 gap-3">
          <StatCard icon="activity" value={`${userData.systolicBP}/${userData.diastolicBP}`} label="Blood pressure" />
          <StatCard icon="activity" value={userData.bmi} label="BMI" />
          <StatCard icon="heart" value={userData.restingHR} label="Resting HR" />
        </View>

        {/* PERSONAL */}
        <Text className="text-[11px] font-semibold mt-6 mb-2 uppercase tracking-widest text-ds-steel">Personal</Text>
        <View className="rounded-xl px-4 border bg-ds-canvas border-ds-hairline">
          <PersonalRow icon="mail" value={userData.email || "Not provided"} />
          <PersonalRow icon="phone" value={userData.phone || "Not provided"} />
          <PersonalRow icon="calendar" value={userData.birthdate || "Not provided"} />
          <PersonalRow icon="user" value={userData.gender ? userData.gender.charAt(0).toUpperCase() + userData.gender.slice(1).toLowerCase() : "Not provided"} isLast />
        </View>

        {/* BIOMETRICS */}
        <Text className="text-[11px] font-semibold mt-6 mb-2 uppercase tracking-widest text-ds-steel">Biometrics</Text>
        <View className="flex-row flex-wrap justify-between">
          <BiometricCard label="Height" value={userData.height || "--"} unit="cm" />
          <BiometricCard label="Weight" value={userData.weight || "--"} unit="kg" />
          <BiometricCard label="Blood pressure" value={`${userData.systolicBP}/${userData.diastolicBP}`} unit="" />
          <BiometricCard label="Resting HR" value={userData.restingHR} unit="bpm" />
        </View>

        {/* MORE */}
        <Text className="text-[11px] font-semibold mt-3 mb-2 uppercase tracking-widest text-ds-steel">More</Text>
        <View className="rounded-xl px-4 border mb-8 bg-ds-canvas border-ds-hairline">
          <MoreRow icon="bar-chart-2" label="Long-term analytics" onPress={() => router.push("/(home)/(profile)/analytics")} />
          <MoreRow icon="users" label="My care team" onPress={() => router.push("/(home)/(profile)/care-team")} />
          <MoreRow icon="file-text" label="Doctor consultation summary" onPress={() => router.push("/(home)/(tabs)/consultation-summary" as any)} />
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

