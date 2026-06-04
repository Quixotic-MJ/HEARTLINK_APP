import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

export default function DashboardScreen() {
  const [isAlertActive, setIsAlertActive] = useState(false);
  
  // Track the active tab for styling
  const [activeTab, setActiveTab] = useState("Home");

  const cssScore = 90;

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Emergency Escalation Banner */}
      {isAlertActive && (
        <TouchableOpacity
          activeOpacity={0.9}
          className="bg-red-500 px-6 py-4 flex-row items-center shadow-md z-20 relative"
        >
          <Feather name="alert-triangle" size={20} color="white" />
          <Text className="text-white font-bold text-[13px] ml-3 flex-1 leading-snug tracking-wide">
            Elevated Risk Detected. Tap to view nearby cardiovascular
            specialists in Cebu City.
          </Text>
          <Feather name="chevron-right" size={20} color="white" />
        </TouchableOpacity>
      )}

      {/* 1. The Top App Bar */}
      <View className="flex-row justify-between items-center px-6 pt-4 pb-2 bg-[#F8FAFC] z-10">
        {/* App Logo / Name */}
        <View className="flex-row items-center ">
          <View className="w-8 h-8 bg-[#1e4ed8] rounded-full items-center justify-center shadow-sm shadow-blue-900/20">
            <MaterialCommunityIcons
              name="heart-pulse"
              size={18}
              color="white"
            />
          </View>
          <Text className="ml-3 font-bold text-[15px] text-slate-900 tracking-tight">
            HeartLink
          </Text>
        </View>

        {/* Icon Trio */}
        <View className="flex-row items-center gap-5">
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="search" size={22} color="#0f172a" />
          </TouchableOpacity>

          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="relative"
          >
            <Feather name="bell" size={22} color="#0f172a" />
            <View className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 border-[2px] border-[#F8FAFC] rounded-full" />
          </TouchableOpacity>

          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="list" size={22} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* 2. The Greeting Section */}
        <View className="px-6 pt-6 pb-6">
          <Text className="text-[24px] font-black text-slate-900 tracking-tight leading-[30px]">
            Welcome back,{"\n"}John Mark
          </Text>
          <Text className="text-[14px] text-slate-600 font-medium mt-3">
            Thursday, 4th June
          </Text>
        </View>

        {/* 3. The Hero Component: CSS Status Card */}
        <View className="mx-5 mt-2 bg-white rounded-[32px] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-[18px] font-black text-slate-900 tracking-tight">
              Stability Score
            </Text>
            <View className="bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
              <Text className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
                Stable
              </Text>
            </View>
          </View>

          <View className="items-center justify-center relative py-2 w-full">
            <View className="w-[220px] h-[220px] rounded-full bg-white items-center justify-center relative border-[6px] border-slate-50">
              <View
                className="absolute top-[-6px] left-[-6px] w-[220px] h-[220px] rounded-full border-[6px] border-[#1e4ed8] border-b-transparent border-l-transparent"
                style={{ transform: [{ rotate: "45deg" }] }}
              />

              <Text className="text-[60px] font-black text-slate-900 tracking-tighter leading-[90px] mt-4">
                {cssScore}
              </Text>
              <Text className="text-[14px] text-slate-400 font-bold">
                out of 100
              </Text>
            </View>

            <View className="absolute bottom-[-10px]">
              <TouchableOpacity
                activeOpacity={0.8}
                className="w-[44px] h-[44px] bg-[#1e4ed8] rounded-full items-center justify-center border-[3px] border-white shadow-sm"
              >
                <Feather name="plus" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row items-center justify-center mt-8">
            <Feather name="clock" size={12} color="#94a3b8" />
            <Text className="text-[12px] font-medium text-slate-400 ml-1.5">
              Updated 7 mins ago
            </Text>
          </View>
        </View>

        {/* 4. Smart Insights */}
        <View className="bg-white mx-5 mt-6 rounded-[24px] border border-slate-100 p-5 shadow-sm shadow-slate-900/5 flex-row items-start">
          <View className="bg-blue-50 w-10 h-10 rounded-[12px] items-center justify-center mr-4 border border-blue-100/50">
            <Feather name="zap" size={20} color="#1e4ed8" />
          </View>
          <Text className="text-[13.5px] text-slate-600 font-medium leading-relaxed flex-1">
            <Text className="font-bold text-slate-800">
              Your stability score improved by 5 points this week.
            </Text>{" "}
            Consistent medication tracking and low-sodium meals logged.
          </Text>
        </View>

        {/* 5. Quick Record Row */}
        <View className="mt-8">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              className="w-[100px] h-32 bg-emerald-50 rounded-[24px] p-5 items-center shadow-sm shadow-emerald-900/5 border border-emerald-100/50"
            >
              <View className="w-12 h-12 bg-white rounded-full items-center justify-center mb-3 shadow-sm shadow-emerald-900/5">
                <MaterialCommunityIcons
                  name="barcode-scan"
                  size={22}
                  color="#059669"
                />
              </View>
              <Text className="text-[8px] font-black text-emerald-800">
                Scan Meal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              className="w-[100px] h-32 bg-rose-50 rounded-[24px] p-5 items-center shadow-sm shadow-rose-900/5 border border-rose-100/50"
            >
              <View className="w-12 h-12 bg-white rounded-full items-center justify-center mb-3 shadow-sm shadow-rose-900/5">
                <MaterialCommunityIcons
                  name="heart-pulse"
                  size={24}
                  color="#e11d48"
                />
              </View>
              <Text className="text-[8px] font-black text-rose-800">
                Log Vitals
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              className="w-[100px] h-32 bg-amber-50 rounded-[24px] p-5 items-center shadow-sm shadow-amber-900/5 border border-amber-100/50"
            >
              <View className="w-12 h-12 bg-white rounded-full items-center justify-center mb-3 shadow-sm shadow-amber-900/5">
                <Feather name="clipboard" size={22} color="#d97706" />
              </View>
              <Text className="text-[8px] font-black text-amber-800">
                Symptoms
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 6. Today's Clinical Atelier (Action Plan) */}
        <View className="mt-10 mb-6">
          <View className="px-6 flex-row items-center justify-between mb-5">
            <Text className="text-lg font-bold text-slate-900 tracking-tight">
              Recommendations
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
          >
            {/* Exercise Card */}
            <TouchableOpacity
              activeOpacity={0.9}
              className="w-[280px] h-60 bg-slate-900 rounded-[28px] shadow-md shadow-slate-900/10 overflow-hidden relative"
            >
              <View className="absolute w-full h-full bg-[#1e293b] opacity-80" />
              <MaterialCommunityIcons
                name="yoga"
                size={140}
                color="#334155"
                className="absolute -bottom-6 -right-6 opacity-30"
              />

              <View className="p-6 h-[180px] justify-between">
                <View className="flex-row items-center justify-between">
                  <View className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full">
                    <Text className="text-[10px] font-black text-white uppercase tracking-widest">
                      Exercise
                    </Text>
                  </View>
                  <View className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-lg">
                    <Feather
                      name="play"
                      size={18}
                      color="#0f172a"
                      className="ml-1"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-[20px] font-black text-white mb-1.5 tracking-tight">
                    15-Minute Chair Yoga
                  </Text>
                  <Text className="text-[13px] text-slate-300 font-medium">
                    Safe mobility to elevate heart rate.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Meal Card */}
            <TouchableOpacity
              activeOpacity={0.9}
              className="w-[280px] bg-emerald-900 rounded-[28px] shadow-md shadow-emerald-900/10 overflow-hidden relative"
            >
              <View className="absolute w-full h-full bg-[#065f46] opacity-80" />
              <MaterialCommunityIcons
                name="bowl-mix-outline"
                size={140}
                color="#047857"
                className="absolute -bottom-6 -right-6 opacity-30"
              />

              <View className="p-6 h-[180px] justify-between">
                <View className="flex-row items-center justify-between">
                  <View className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full">
                    <Text className="text-[10px] font-black text-white uppercase tracking-widest">
                      Heart-Healthy
                    </Text>
                  </View>
                  <View className="bg-emerald-800/80 px-2.5 py-1 rounded-md border border-emerald-700">
                    <Text className="text-[11px] font-bold text-emerald-100">
                      Low Sodium
                    </Text>
                  </View>
                </View>

                <View>
                  <Text className="text-[20px] font-black text-white mb-2 tracking-tight">
                    Oatmeal with Berries
                  </Text>
                  <View className="flex-row items-center gap-3">
                    <Text className="text-[12px] font-bold text-emerald-200">
                      Sodium: <Text className="text-white">15mg</Text>
                    </Text>
                    <Text className="text-[12px] font-bold text-emerald-200">
                      Fiber: <Text className="text-white">8g</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScrollView>

      {/* 📱 Floating Bottom Tab Navigation (Matched to image_693107.png) */}
      <View className="absolute bottom-2 left-5 right-5 bg-white rounded-[32px] shadow-lg shadow-slate-900/10 h-[76px] flex-row justify-between items-center px-2 z-50">
        
        {/* 1. Home */}
        <TouchableOpacity 
          onPress={() => setActiveTab("Home")} 
          className="items-center justify-center flex-1 h-full"
        >
          <Feather 
            name="home" 
            size={24} 
            color={activeTab === "Home" ? "#1e4ed8" : "#94a3b8"} 
          />
          <Text 
            className={`text-[9px] mt-1 ${activeTab === "Home" ? "font-bold text-[#1e4ed8]" : "font-medium text-slate-400"}`}
          >
            Home
          </Text>
        </TouchableOpacity>

        {/* 2. Recipes */}
        <TouchableOpacity 
          onPress={() => setActiveTab("Recipes")} 
          className="items-center justify-center flex-1 h-full"
        >
          <MaterialCommunityIcons 
            name="silverware-fork-knife" 
            size={24} 
            color={activeTab === "Recipes" ? "#1e4ed8" : "#94a3b8"} 
          />
          <Text 
            className={`text-[9px] mt-1 ${activeTab === "Recipes" ? "font-bold text-[#1e4ed8]" : "font-medium text-slate-400"}`}
          >
            Recipes
          </Text>
        </TouchableOpacity>

        {/* 3. Record (Center FAB - Overlapping with White Border cut-out effect) */}
        <View className="flex-1 items-center justify-center relative h-full">
          <TouchableOpacity
            activeOpacity={0.8}
            className="absolute -top-7 w-[64px] h-[64px] bg-[#1e4ed8] rounded-full items-center justify-center border-[6px] border-white shadow-sm shadow-blue-900/20 z-10"
          >
            <MaterialCommunityIcons name="barcode-scan" size={26} color="white" />
          </TouchableOpacity>
        </View>

        {/* 4. Exercises */}
        <TouchableOpacity 
          onPress={() => setActiveTab("Exercises")} 
          className="items-center justify-center flex-1 h-full"
        >
          <Feather 
            name="activity" 
            size={24} 
            color={activeTab === "Exercises" ? "#1e4ed8" : "#94a3b8"} 
          />
          <Text 
            className={`text-[9px] mt-1 ${activeTab === "Exercises" ? "font-bold text-[#1e4ed8]" : "font-medium text-slate-400"}`}
          >
            Exercises
          </Text>
        </TouchableOpacity>

        {/* 5. Wrap-Up */}
        <TouchableOpacity 
          onPress={() => setActiveTab("Wrap-Up")} 
          className="items-center justify-center flex-1 h-full"
        >
          <Feather 
            name="calendar" 
            size={24} 
            color={activeTab === "Wrap-Up" ? "#1e4ed8" : "#94a3b8"} 
          />
          <Text 
            className={`text-[9px] mt-1 ${activeTab === "Wrap-Up" ? "font-bold text-[#1e4ed8]" : "font-medium text-slate-400"}`}
          >
            Wrap-Up
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}