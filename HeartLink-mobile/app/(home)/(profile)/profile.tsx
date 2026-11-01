import { apiFetch } from "../../../lib/api";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import AnimatedButton from "../../../components/ui/AnimatedButton";
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

function StatCard({
  icon,
  value,
  label,
  tone,
  iconColor,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  label: string;
  tone?: string;
  iconColor?: string;
}) {
  const { c, isDark } = useDs();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: isDark ? c.hairline : "#E2E8F0",
        backgroundColor: isDark ? c.surface : c.canvas,
        gap: 8,
        ...Platform.select({
          ios: {
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.04,
            shadowRadius: 6,
          },
          android: { elevation: 1 },
        }),
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          backgroundColor: tone ?? (isDark ? c.surfaceAlt : "#F1F5F9"),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name={icon} size={15} color={iconColor ?? c.slate} />
      </View>
      <View style={{ gap: 2 }}>
        <Text
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: c.ink,
            fontVariant: ["tabular-nums"],
            letterSpacing: -0.3,
          }}
        >
          {value}
        </Text>
        <Text
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
          style={{ fontSize: 11.5, fontWeight: "500", color: c.slate }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

function PersonalRow({
  icon,
  value,
  isLast = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  isLast?: boolean;
}) {
  const { c, isDark } = useDs();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 13,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: isDark ? c.hairline : "#F1F5F9",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name={icon} size={14} color={isDark ? c.steel : c.slate} />
      </View>
      <Text
        maxFontSizeMultiplier={1.3}
        style={{ fontSize: 14.5, fontWeight: "500", color: c.ink, flex: 1 }}
      >
        {value}
      </Text>
    </View>
  );
}

function BiometricCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  const { c, isDark } = useDs();
  return (
    <View
      style={{
        width: "48%",
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: isDark ? c.hairline : "#E2E8F0",
        backgroundColor: isDark ? c.surface : c.canvas,
        gap: 4,
        ...Platform.select({
          ios: {
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.04,
            shadowRadius: 6,
          },
          android: { elevation: 1 },
        }),
      }}
    >
      <Text style={{ fontSize: 11.5, fontWeight: "600", color: c.slate }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
        <Text
          maxFontSizeMultiplier={1.3}
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: c.ink,
            fontVariant: ["tabular-nums"],
            letterSpacing: -0.3,
          }}
        >
          {value}
        </Text>
        {unit ? (
          <Text style={{ fontSize: 12, fontWeight: "500", color: c.slate }}>{unit}</Text>
        ) : null}
      </View>
    </View>
  );
}

function MoreRow({
  icon,
  label,
  onPress,
  isLast = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  const { c, isDark } = useDs();
  return (
    <View
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: isDark ? c.hairline : "#F1F5F9",
      }}
    >
      <AnimatedButton
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 14,
          gap: 12,
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            backgroundColor: isDark ? c.surfaceAlt : "#F1F5F9",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name={icon} size={15} color={c.ink} />
        </View>
        <Text style={{ flex: 1, fontSize: 14.5, fontWeight: "600", color: c.ink }}>
          {label}
        </Text>
        <Feather name="chevron-right" size={16} color={c.steel} />
      </AnimatedButton>
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
  rightText = "",
}: any) {
  const { c, isDark } = useDs();
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: hasBorder ? 1 : 0,
        borderBottomColor: isDark ? c.hairline : "#F1F5F9",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, fontWeight: "600", marginBottom: 3, color: c.slate }}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          keyboardType={keyboardType}
          placeholderTextColor={c.steel}
          style={{
            fontSize: 15,
            fontWeight: "600",
            padding: 0,
            margin: 0,
            color: editable ? c.ink : c.slate,
          }}
        />
      </View>
      {rightText ? (
        <Text style={{ fontSize: 12, color: c.slate, marginLeft: 8 }}>{rightText}</Text>
      ) : null}
      {rightIcon && <Feather name={rightIcon} size={15} color={c.steel} />}
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
  const { c, isDark } = useDs();
  const [name, setName] = useState(currentData.name);
  const [email, setEmail] = useState(currentData.email);
  const [phone, setPhone] = useState(currentData.phone);
  const [birthdate, setBirthdate] = useState(currentData.birthdate);
  const [gender, setGender] = useState(currentData.gender);
  const [height, setHeight] = useState(currentData.height);
  const [weight, setWeight] = useState(currentData.weight);
  const [isSaving, setIsSaving] = useState(false);

  const openWith = visible ? currentData : null;
  const [filledFrom, setFilledFrom] = useState<typeof openWith>(null);
  if (openWith !== filledFrom) {
    setFilledFrom(openWith);
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
  }

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
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: isDark ? c.canvas : "#F8FAFC" }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: Platform.OS === "ios" ? 56 : 20,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? c.hairline : "#E2E8F0",
            backgroundColor: isDark ? c.surface : c.canvas,
          }}
        >
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: c.slate, fontSize: 15, fontWeight: "500" }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ color: c.ink, fontWeight: "700", fontSize: 17, letterSpacing: -0.2 }}>
            Edit profile
          </Text>
          <TouchableOpacity onPress={handleSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: c.primary, fontSize: 15, fontWeight: "600" }}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          {/* PERSONAL */}
          <Text
            style={{
              fontSize: 11.5,
              fontWeight: "700",
              marginHorizontal: 20,
              marginBottom: 8,
              marginTop: 18,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: c.slate,
            }}
          >
            Personal
          </Text>
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: isDark ? c.hairline : "#E2E8F0",
              backgroundColor: isDark ? c.surface : c.canvas,
              marginHorizontal: 20,
              overflow: "hidden",
              marginBottom: 20,
            }}
          >
            <EditField label="Full name" value={name} onChangeText={setName} />
            <EditField label="Email" value={email} onChangeText={setEmail} editable={false} rightIcon="lock" />
            <EditField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <EditField label="Date of birth" value={birthdate} onChangeText={setBirthdate} rightIcon="calendar" />
            <EditField label="Gender" value={gender} onChangeText={setGender} rightIcon="chevron-down" hasBorder={false} />
          </View>

          {/* BIOMETRICS */}
          <Text
            style={{
              fontSize: 11.5,
              fontWeight: "700",
              marginHorizontal: 20,
              marginBottom: 8,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: c.slate,
            }}
          >
            Biometrics
          </Text>
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: isDark ? c.hairline : "#E2E8F0",
              backgroundColor: isDark ? c.surface : c.canvas,
              marginHorizontal: 20,
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: isDark ? c.hairline : "#F1F5F9" }}>
              <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: isDark ? c.hairline : "#F1F5F9" }}>
                <EditField label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="numeric" hasBorder={false} />
              </View>
              <View style={{ flex: 1 }}>
                <EditField label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" hasBorder={false} />
              </View>
            </View>
            <EditField label="Blood pressure" value={`${currentData.systolicBP} / ${currentData.diastolicBP}`} editable={false} rightText="mmHg" />
            <EditField label="Resting heart rate" value={currentData.restingHR} editable={false} rightText="bpm" hasBorder={false} />
          </View>
          <Text style={{ fontSize: 11.5, color: c.slate, marginHorizontal: 20, marginBottom: 28 }}>
            BMI updates automatically from height and weight.
          </Text>

          <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {!isTab && (
            <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
          )}
          <View style={{ gap: 1 }}>
            <Text
              accessibilityRole="header"
              style={{ fontSize: 22, fontWeight: "700", color: c.ink, letterSpacing: -0.4 }}
            >
              My profile
            </Text>
            <Text style={{ fontSize: 12.5, color: c.slate }}>
              Personal details and health baselines
            </Text>
          </View>
        </View>
        <SquareIconButton
          icon="edit-2"
          label="Edit profile"
          onPress={() => setShowUpdateModal(true)}
        />
      </View>

      <ScrollView 
        keyboardShouldPersistTaps="handled" 
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20, paddingTop: 6 }}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View
          style={{
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: isDark ? c.hairline : "#E2E8F0",
            backgroundColor: isDark ? c.surface : c.canvas,
            gap: 14,
            ...Platform.select({
              ios: {
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.25 : 0.04,
                shadowRadius: 6,
              },
              android: { elevation: 1 },
            }),
          }}
        >
          <View style={{ position: "relative" }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark ? "rgba(46, 154, 232, 0.18)" : "#E0F2FE",
                borderWidth: 1,
                borderColor: isDark ? "rgba(46, 154, 232, 0.3)" : "#BAE6FD",
              }}
            >
              <Text
                style={{
                  color: isDark ? "#38BDF8" : "#0284C7",
                  fontWeight: "700",
                  fontSize: 18,
                  letterSpacing: 0.5,
                }}
              >
                {getInitials(userData.name)}
              </Text>
            </View>
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: isDark ? "#34D399" : "#10B981",
                borderWidth: 2,
                borderColor: isDark ? c.surface : "#FFFFFF",
              }}
            />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text
                numberOfLines={1}
                style={{ fontSize: 17, fontWeight: "700", color: c.ink, letterSpacing: -0.3 }}
              >
                {userData.name || "Loading..."}
              </Text>
              <View
                style={{
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: isDark ? "rgba(46, 154, 232, 0.14)" : "#EFF6FF",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(46, 154, 232, 0.28)" : "#BFDBFE",
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: isDark ? "#60A5FA" : "#2563EB" }}>
                  Patient
                </Text>
              </View>
            </View>
            <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: "500", color: c.slate }}>
              {userData.email}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <StatCard
            icon="activity"
            value={`${userData.systolicBP}/${userData.diastolicBP}`}
            label="Blood pressure"
            tone={isDark ? "rgba(244, 63, 94, 0.16)" : "#FFE4E6"}
            iconColor={isDark ? "#FB7185" : "#E11D48"}
          />
          <StatCard
            icon="bar-chart-2"
            value={userData.bmi}
            label="BMI"
            tone={isDark ? "rgba(245, 158, 11, 0.16)" : "#FEF3C7"}
            iconColor={isDark ? "#FBBF24" : "#D97706"}
          />
          <StatCard
            icon="heart"
            value={userData.restingHR}
            label="Resting HR"
            tone={isDark ? "rgba(239, 68, 68, 0.16)" : "#FEE2E2"}
            iconColor={isDark ? "#F87171" : "#EF4444"}
          />
        </View>

        {/* PERSONAL */}
        <Text
          style={{
            fontSize: 11.5,
            fontWeight: "700",
            marginTop: 22,
            marginBottom: 8,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: c.slate,
          }}
        >
          Personal
        </Text>
        <View
          style={{
            borderRadius: 16,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: isDark ? c.hairline : "#E2E8F0",
            backgroundColor: isDark ? c.surface : c.canvas,
            ...Platform.select({
              ios: {
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.25 : 0.04,
                shadowRadius: 6,
              },
              android: { elevation: 1 },
            }),
          }}
        >
          <PersonalRow icon="mail" value={userData.email || "Not provided"} />
          <PersonalRow icon="phone" value={userData.phone || "Not provided"} />
          <PersonalRow icon="calendar" value={userData.birthdate || "Not provided"} />
          <PersonalRow
            icon="user"
            value={userData.gender ? userData.gender.charAt(0).toUpperCase() + userData.gender.slice(1).toLowerCase() : "Not provided"}
            isLast
          />
        </View>

        {/* BIOMETRICS */}
        <Text
          style={{
            fontSize: 11.5,
            fontWeight: "700",
            marginTop: 22,
            marginBottom: 8,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: c.slate,
          }}
        >
          Biometrics
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          <BiometricCard label="Height" value={userData.height || "--"} unit="cm" />
          <BiometricCard label="Weight" value={userData.weight || "--"} unit="kg" />
          <BiometricCard label="Blood pressure" value={`${userData.systolicBP}/${userData.diastolicBP}`} unit="mmHg" />
          <BiometricCard label="Resting HR" value={userData.restingHR} unit="bpm" />
        </View>

        {/* MORE */}
        <Text
          style={{
            fontSize: 11.5,
            fontWeight: "700",
            marginTop: 14,
            marginBottom: 8,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: c.slate,
          }}
        >
          More
        </Text>
        <View
          style={{
            borderRadius: 16,
            paddingHorizontal: 16,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: isDark ? c.hairline : "#E2E8F0",
            backgroundColor: isDark ? c.surface : c.canvas,
            ...Platform.select({
              ios: {
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.25 : 0.04,
                shadowRadius: 6,
              },
              android: { elevation: 1 },
            }),
          }}
        >
          <MoreRow icon="bar-chart-2" label="Long-term analytics" onPress={() => router.push("/(home)/(profile)/analytics")} />
          <MoreRow icon="users" label="My care team" onPress={() => router.push("/(home)/(profile)/care-team")} />
          <MoreRow icon="file-text" label="Doctor consultation summary" onPress={() => router.push("/(home)/(tabs)/consultation-summary" as any)} />
          <MoreRow icon="clipboard" label="Health report (1 or 3 months)" onPress={() => router.push("/(home)/(profile)/health-report")} />
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
