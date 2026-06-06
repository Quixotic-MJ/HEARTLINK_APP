import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

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
  return (
    <TouchableOpacity
      activeOpacity={0.65}
      onPress={onPress}
      className="flex-row items-center py-3.5"
      style={!isLast ? { borderBottomWidth: 0.5, borderBottomColor: "#f1f5f9" } : undefined}
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3.5 border border-slate-200/70 flex-shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        {iconType === "material" ? (
          <MaterialCommunityIcons name={icon as any} size={17} color={iconColor} />
        ) : (
          <Feather name={icon as any} size={15} color={iconColor} />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">
          {label}
        </Text>
        <Text className="text-[14px] font-medium text-slate-900">
          {value}
          {unit && (
            <Text className="text-[13px] font-normal text-slate-400"> {unit}</Text>
          )}
        </Text>
      </View>
      <Feather name="chevron-right" size={15} color="#e2e8f0" />
    </TouchableOpacity>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return (
    <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-2 mt-1">
      {title}
    </Text>
  );
}

// ─── Field Group card ─────────────────────────────────────────────────────────

function FieldGroup({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-2xl border border-slate-200/70 px-4 mb-3">
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
}: {
  value: string;
  label: string;
  iconBg: string;
  iconColor: string;
  icon: string;
}) {
  return (
    <View
      className="bg-white rounded-2xl p-3.5 border border-slate-200/70 flex-row items-center gap-3"
      style={{ width: "48.5%" }}
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        <Feather name={icon as any} size={15} color={iconColor} />
      </View>
      <View>
        <Text className="text-[18px] font-medium text-slate-900 leading-tight">
          {value}
        </Text>
        <Text className="text-[8px] text-slate-400 uppercase tracking-wide mt-0.5">
          {label}
        </Text>
      </View>
    </View>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();

  const [userData] = useState({
    name: "John Mark Magdasal",
    email: "johnmark@heartlink.ph",
    phone: "+63 912 345 6789",
    birthdate: "March 15, 1998",
    gender: "Male",
    height: "175",
    weight: "72",
    bmi: "23.5",
    bloodType: "O+",
    restingHR: "72",
    systolicBP: "120",
    diastolicBP: "80",
    conditions: "Hypertension Stage 1",
    medications: "Amlodipine 5mg",
    allergies: "None reported",
    emergencyContact: "Maria Magdasal",
    emergencyPhone: "+63 917 654 3210",
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200/50">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <Text className="flex-1 text-[17px] font-medium text-slate-900">
          My profile
        </Text>
        <TouchableOpacity className="w-9 h-9 rounded-xl bg-white border border-slate-200/70 items-center justify-center">
          <Feather name="edit-2" size={15} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView
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
                source={{ uri: "https://scontent.fcgy2-2.fna.fbcdn.net/v/t39.30808-6/470238702_122163229004273349_6885730481985014209_n.jpg?_nc_cat=104&ccb=1-7&_nc_sid=a5f93a&_nc_eui2=AeFspkU-pAnduqXzsg0nCMQSc3h1gs4ySEZzeHWCzjJIRiS7qjQy166_bn5hNqi44fxFQkp5tRFulwgVSN60yG1o&_nc_ohc=JjKG5iySuBYQ7kNvwF3zmCi&_nc_oc=AdqJL2LZkjt9IqiM_KPQtb2ZUT6mEm5UdI2cgi-6Mu6INC3QVBLGz8-OKHIG4Fuyfuk&_nc_zt=23&_nc_ht=scontent.fcgy2-2.fna&_nc_gid=zjeomdkvajMCPjEc3tC8YQ&_nc_ss=7b2a8&oh=00_Af_FFO3skv0KzZZjqU44lc3j6qTtYj5r07rF5GLagi9HDg&oe=6A275350" }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            {/* Camera button */}
            <TouchableOpacity
              activeOpacity={0.8}
              className="absolute bottom-0 right-0 w-8 h-8 bg-slate-900 rounded-full items-center justify-center border-2 border-slate-50"
            >
              <Feather name="camera" size={13} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text className="text-[20px] font-medium text-slate-900 tracking-tight">
            {userData.name}
          </Text>
          <Text className="text-[13px] text-slate-400 mt-0.5">{userData.email}</Text>

          {/* Condition badge */}
          <View className="flex-row items-center gap-1.5 bg-white border border-slate-200/70 px-3 py-1.5 rounded-full mt-3">
            <View className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <Text className="text-[12px] text-slate-600">{userData.conditions}</Text>
          </View>

          {/* Quick stats — 2×2 grid */}
          <View className="flex-row flex-wrap gap-2.5 mt-5 w-full justify-between">
            <QuickStat value={userData.bmi} label="BMI" icon="activity" iconBg="#e6f1fb" iconColor="#185fa5" />
            <QuickStat value={userData.bloodType} label="Blood type" icon="droplet" iconBg="#fcebeb" iconColor="#a32d2d" />
            <QuickStat value={userData.restingHR} label="Resting HR" icon="heart" iconBg="#faeeda" iconColor="#854f0b" />
            <QuickStat value={`${userData.systolicBP}/${userData.diastolicBP}`} label="Blood pressure" icon="trending-up" iconBg="#eaf3de" iconColor="#3b6d11" />
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
            <ProfileField label="Gender" value={userData.gender} icon="users" isLast />
          </FieldGroup>

          {/* ── Biometrics ── */}
          <SectionLabel title="Biometrics" />
          <FieldGroup>
            <ProfileField label="Height" value={userData.height} unit="cm" icon="maximize-2" iconBg="#e6f1fb" iconColor="#185fa5" />
            <ProfileField label="Weight" value={userData.weight} unit="kg" icon="target" iconBg="#e6f1fb" iconColor="#185fa5" />
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
            />
            <ProfileField label="Blood type" value={userData.bloodType} icon="droplet" iconBg="#fcebeb" iconColor="#a32d2d" isLast />
          </FieldGroup>

          {/* ── Medical ── */}
          <SectionLabel title="Medical history" />
          <FieldGroup>
            <ProfileField label="Conditions" value={userData.conditions} icon="clipboard" iconBg="#faeeda" iconColor="#854f0b" />
            <ProfileField label="Medications" value={userData.medications} icon="pill" iconType="material" iconBg="#faeeda" iconColor="#854f0b" />
            <ProfileField label="Allergies" value={userData.allergies} icon="alert-circle" iconBg="#faeeda" iconColor="#854f0b" isLast />
          </FieldGroup>

          {/* ── Emergency ── */}
          <SectionLabel title="Emergency contact" />
          <FieldGroup>
            <ProfileField label="Contact name" value={userData.emergencyContact} icon="shield" iconBg="#fcebeb" iconColor="#a32d2d" />
            <ProfileField label="Contact phone" value={userData.emergencyPhone} icon="phone-call" iconBg="#fcebeb" iconColor="#a32d2d" isLast />
          </FieldGroup>

          {/* ── Actions ── */}
          <View className="gap-2.5 mt-2">
            <TouchableOpacity
              activeOpacity={0.85}
              className="bg-slate-900 rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
            >
              <Feather name="edit-3" size={15} color="#fff" />
              <Text className="text-white text-[14px] font-medium">
                Update biometrics
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              className="bg-white rounded-2xl py-3.5 flex-row items-center justify-center gap-2 border border-slate-200/70"
            >
              <Feather name="download" size={15} color="#64748b" />
              <Text className="text-[14px] font-medium text-slate-600">
                Download health report
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}