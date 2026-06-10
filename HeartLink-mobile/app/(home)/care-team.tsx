import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

function ContactCard({ 
  title, 
  name, 
  role, 
  phone, 
  icon 
}: { 
  title: string; 
  name: string; 
  role: string; 
  phone: string; 
  icon: string 
}) {
  return (
    <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-[13px] font-medium text-slate-400 uppercase tracking-wide">
          {title}
        </Text>
        <TouchableOpacity>
          <Text className="text-[13px] font-medium text-blue-600">Edit</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center mb-4">
        <View className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mr-4">
          <Feather name={icon as any} size={20} color="#64748b" />
        </View>
        <View className="flex-1">
          <Text className="text-[16px] font-semibold text-slate-900 dark:text-white dark:text-slate-900 mb-0.5">{name}</Text>
          <Text className="text-[14px] text-slate-500 dark:text-slate-400">{role}</Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => Linking.openURL(`tel:${phone}`)}
          className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-1.5"
          style={{ backgroundColor: "#0f172a" }}
        >
          <Feather name="phone-call" size={14} color="#fff" />
          <Text className="text-[13px] font-medium text-white dark:text-slate-900">Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          activeOpacity={0.8}
          className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl border border-slate-200 dark:border-slate-800/70 bg-slate-50 dark:bg-slate-950 gap-1.5"
        >
          <Feather name="message-circle" size={14} color="#475569" />
          <Text className="text-[13px] font-medium text-slate-600">Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CareTeamScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View className="px-5 pt-4 pb-3 bg-white dark:bg-slate-900 dark:bg-slate-100 border-b border-slate-200 dark:border-slate-800/50">
        <View className="flex-row items-center mb-1">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
          >
            <Feather name="arrow-left" size={18} color="#0f172a" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[17px] font-medium text-slate-900 dark:text-white dark:text-slate-900" numberOfLines={1}>
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
          <Text className="text-white dark:text-slate-900 text-[18px] font-bold tracking-wide">
            EMERGENCY SOS
          </Text>
        </TouchableOpacity>

        {/* Contacts */}
        <ContactCard
          title="Primary Cardiologist"
          name="Dr. Maria Santos, MD"
          role="Chong Hua Hospital"
          phone="1234567890"
          icon="user"
        />

        <ContactCard
          title="Emergency Contact"
          name="Jane Doe"
          role="Spouse"
          phone="0987654321"
          icon="heart"
        />

        <TouchableOpacity
          activeOpacity={0.8}
          className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-dashed border-slate-300 p-4 items-center justify-center py-6 mt-2"
        >
          <View className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mb-2">
            <Feather name="plus" size={18} color="#64748b" />
          </View>
          <Text className="text-[14px] font-medium text-slate-600">Add another contact</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
