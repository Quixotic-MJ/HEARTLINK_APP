import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

// ─── Editable Field Row ─────────────────────────────────────────────────────
function ProfileField({
  label,
  value,
  icon,
  iconType = "feather",
  unit,
  onPress,
}: {
  label: string;
  value: string;
  icon: string;
  iconType?: "feather" | "material";
  unit?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      className="flex-row items-center py-4 border-b border-slate-100"
    >
      <View className="w-10 h-10 rounded-[14px] bg-slate-50 items-center justify-center mr-4 border border-slate-100">
        {iconType === "material" ? (
          <MaterialCommunityIcons
            name={icon as any}
            size={20}
            color="#64748b"
          />
        ) : (
          <Feather name={icon as any} size={18} color="#64748b" />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
          {label}
        </Text>
        <Text className="text-[15px] font-bold text-slate-900">
          {value}
          {unit && (
            <Text className="text-[13px] font-medium text-slate-400">
              {" "}
              {unit}
            </Text>
          )}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────
function SectionHeader({
  title,
  icon,
}: {
  title: string;
  icon: string;
}) {
  return (
    <View className="flex-row items-center mt-8 mb-3">
      <Feather name={icon as any} size={16} color="#1e4ed8" />
      <Text className="text-[13px] font-extrabold text-[#1e4ed8] uppercase tracking-widest ml-2">
        {title}
      </Text>
    </View>
  );
}

// ─── Profile Screen ─────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();

  // Sample user data (will be connected to backend later)
  const [userData] = useState({
    name: "John Mark Magdasal",
    email: "johnmark@heartlink.ph",
    phone: "+63 912 345 6789",
    birthdate: "March 15, 1998",
    gender: "Male",
    // Biometrics
    height: "175",
    weight: "72",
    bmi: "23.5",
    bloodType: "O+",
    restingHR: "72",
    systolicBP: "120",
    diastolicBP: "80",
    // Medical
    conditions: "Hypertension Stage 1",
    medications: "Amlodipine 5mg",
    allergies: "None reported",
    emergencyContact: "Maria Magdasal",
    emergencyPhone: "+63 917 654 3210",
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-[14px] bg-slate-100 items-center justify-center"
        >
          <Feather name="arrow-left" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-[17px] font-extrabold text-slate-900 tracking-tight">
          My Profile
        </Text>
        <TouchableOpacity className="w-10 h-10 rounded-[14px] bg-blue-50 items-center justify-center border border-blue-100">
          <Feather name="edit-2" size={17} color="#1e4ed8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Name Card */}
        <View className="items-center pt-6 pb-8">
          <View className="relative mb-5">
            <View className="w-[100px] h-[100px] rounded-full bg-slate-200 overflow-hidden border-4 border-white shadow-lg shadow-slate-900/10">
              <Image
                source={{ uri: "https://i.pravatar.cc/300?u=johnmark" }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            {/* Camera overlay */}
            <TouchableOpacity
              activeOpacity={0.8}
              className="absolute bottom-0 right-0 w-9 h-9 bg-[#1e4ed8] rounded-full items-center justify-center border-[3px] border-white"
            >
              <Feather name="camera" size={14} color="white" />
            </TouchableOpacity>
          </View>

          <Text className="text-[22px] font-black text-slate-900 tracking-tight">
            {userData.name}
          </Text>
          <Text className="text-[14px] font-medium text-slate-400 mt-1">
            {userData.email}
          </Text>

          {/* Quick Stats Row */}
          <View className="flex-row gap-3 mt-6 px-8">
            <View className="flex-1 bg-white rounded-2xl py-3.5 items-center border border-slate-100 shadow-sm shadow-slate-900/5">
              <Text className="text-[18px] font-black text-slate-900">
                {userData.bmi}
              </Text>
              <Text className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                BMI
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-2xl py-3.5 items-center border border-slate-100 shadow-sm shadow-slate-900/5">
              <Text className="text-[18px] font-black text-slate-900">
                {userData.bloodType}
              </Text>
              <Text className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                Blood
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-2xl py-3.5 items-center border border-slate-100 shadow-sm shadow-slate-900/5">
              <Text className="text-[18px] font-black text-slate-900">
                {userData.restingHR}
              </Text>
              <Text className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                Resting HR
              </Text>
            </View>
          </View>
        </View>

        {/* Details Card */}
        <View className="mx-5 bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm shadow-slate-900/5">
          {/* Personal Info */}
          <SectionHeader title="Personal" icon="user" />
          <ProfileField
            label="Full Name"
            value={userData.name}
            icon="user"
          />
          <ProfileField
            label="Email"
            value={userData.email}
            icon="mail"
          />
          <ProfileField
            label="Phone"
            value={userData.phone}
            icon="phone"
          />
          <ProfileField
            label="Date of Birth"
            value={userData.birthdate}
            icon="calendar"
          />
          <ProfileField
            label="Gender"
            value={userData.gender}
            icon="users"
          />

          {/* Biometrics */}
          <SectionHeader title="Biometrics" icon="activity" />
          <ProfileField
            label="Height"
            value={userData.height}
            unit="cm"
            icon="maximize-2"
          />
          <ProfileField
            label="Weight"
            value={userData.weight}
            unit="kg"
            icon="target"
            iconType="feather"
          />
          <ProfileField
            label="Blood Pressure"
            value={`${userData.systolicBP}/${userData.diastolicBP}`}
            unit="mmHg"
            icon="heart"
          />
          <ProfileField
            label="Resting Heart Rate"
            value={userData.restingHR}
            unit="bpm"
            icon="heart-pulse"
            iconType="material"
          />
          <ProfileField
            label="Blood Type"
            value={userData.bloodType}
            icon="droplet"
          />

          {/* Medical History */}
          <SectionHeader title="Medical" icon="file-text" />
          <ProfileField
            label="Conditions"
            value={userData.conditions}
            icon="clipboard"
          />
          <ProfileField
            label="Medications"
            value={userData.medications}
            icon="pill"
            iconType="material"
          />
          <ProfileField
            label="Allergies"
            value={userData.allergies}
            icon="alert-circle"
          />

          {/* Emergency Contact */}
          <SectionHeader title="Emergency" icon="phone-call" />
          <ProfileField
            label="Emergency Contact"
            value={userData.emergencyContact}
            icon="shield"
          />
          <ProfileField
            label="Emergency Phone"
            value={userData.emergencyPhone}
            icon="phone"
          />
        </View>

        {/* Actions */}
        <View className="mx-5 mt-5 gap-3">
          <TouchableOpacity
            activeOpacity={0.8}
            className="bg-[#1e4ed8] rounded-2xl py-4 items-center shadow-sm shadow-blue-900/20"
          >
            <Text className="text-white text-[15px] font-extrabold tracking-tight">
              Update Biometrics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            className="bg-white rounded-2xl py-4 items-center border border-slate-200"
          >
            <Text className="text-slate-600 text-[15px] font-bold tracking-tight">
              Download Health Report
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
