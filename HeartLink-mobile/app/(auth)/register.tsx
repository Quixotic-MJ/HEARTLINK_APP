import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import "../../global.css";

export default function RegisterScreen() {
  const router = useRouter();

  // Form State
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Local Validation Logic
  const validateForm = () => {
    let newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      newErrors.email = "Email address is required.";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!phone || phone.length < 10) {
      newErrors.phone = "Please enter a valid 10-digit phone number.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendVerification = () => {
    if (validateForm()) {
      console.log("Validation passed! Routing to OTP screen with:", {
        email,
        phone: `+63${phone}`,
        password,
      });
      router.push("/verify-otp");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f4f7fb]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Top Header Bar */}
      <View className="flex-row items-center px-6 pt-2 pb-4 z-10">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="p-2 -ml-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color="#475569" />
        </TouchableOpacity>
        
        {/* Top App Logo & Name */}
        <View className="flex-1 flex-row items-center justify-center pr-8">
          <View className="bg-[#1e4ed8] w-6 h-6 rounded-full items-center justify-center shadow-sm shadow-blue-900/20 mr-2">
            <MaterialCommunityIcons name="heart-pulse" size={14} color="white" />
          </View>
          <Text className="text-[18px] font-bold text-[#1e4ed8] tracking-tight">
            HeartLink
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center pb-10"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Main White Card Container */}
          <View className="bg-white mx-5 rounded-[32px] px-6 py-8 shadow-sm shadow-blue-900/5">
            
            {/* 1. Header Text */}
            <View className="mb-8">
              <Text className="text-[28px] font-black text-slate-900 text-center tracking-tight mb-3">
                Create Your Account
              </Text>
              <Text className="text-[14px] text-slate-500 text-center font-medium leading-relaxed px-2">
                Securely monitor your cardiovascular well-being.
              </Text>
            </View>

            {/* 2. Input Fields */}
            <View className="mb-8">
              
              {/* Email Input */}
              <View className="mb-4">
                <View
                  className="w-full h-[52px] bg-white border rounded-[16px] flex-row items-center px-4"
                  style={{
                    borderColor: errors.email ? "#f87171" : "#e2e8f0",
                  }}
                >
                  <Feather name="mail" size={18} color={errors.email ? "#f87171" : "#64748b"} />
                  <TextInput
                    value={email}
                    onChangeText={(text) => { setEmail(text); setErrors({ ...errors, email: null }); }}
                    placeholder="Email Address"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="flex-1 ml-3 text-[14px] text-slate-900 h-full"
                  />
                </View>
                {errors.email && <Text className="text-red-500 text-[11px] font-medium mt-1.5 ml-2">{errors.email}</Text>}
              </View>

              {/* Phone Number Input */}
              <View className="mb-4">
                <View
                  className="w-full h-[52px] bg-white border rounded-[16px] flex-row items-center px-4"
                  style={{
                    borderColor: errors.phone ? "#f87171" : "#e2e8f0",
                  }}
                >
                  <Feather name="phone" size={18} color={errors.phone ? "#f87171" : "#64748b"} />
                  <View className="flex-row items-center ml-3 border-r border-slate-200 pr-3 mr-3 h-3/5">
                    <Text className="text-[14px] font-bold text-slate-700">+63</Text>
                  </View>
                  <TextInput
                    value={phone}
                    onChangeText={(text) => { 
                      const numericValue = text.replace(/[^0-9]/g, '');
                      setPhone(numericValue); 
                      setErrors({ ...errors, phone: null }); 
                    }}
                    placeholder="912 345 6789"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    className="flex-1 text-[14px] text-slate-900 font-bold h-full tracking-wide"
                  />
                </View>
                {errors.phone && <Text className="text-red-500 text-[11px] font-medium mt-1.5 ml-2">{errors.phone}</Text>}
              </View>

              {/* Password Input */}
              <View className="mb-4">
                <View
                  className="w-full h-[52px] bg-white border rounded-[16px] flex-row items-center px-4"
                  style={{
                    borderColor: errors.password ? "#f87171" : "#e2e8f0",
                  }}
                >
                  <Feather name="lock" size={18} color={errors.password ? "#f87171" : "#64748b"} />
                  <TextInput
                    value={password}
                    onChangeText={(text) => { setPassword(text); setErrors({ ...errors, password: null }); }}
                    placeholder="Password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    className="flex-1 ml-3 text-[14px] text-slate-900 h-full"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="p-2 -mr-2"
                  >
                    <Feather
                      name={showPassword ? "eye" : "eye-off"}
                      size={18}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text className="text-red-500 text-[11px] font-medium mt-1.5 ml-2">{errors.password}</Text>}
              </View>

              {/* Confirm Password Input */}
              <View className="mb-2">
                <View
                  className="w-full h-[52px] bg-white border rounded-[16px] flex-row items-center px-4"
                  style={{
                    borderColor: errors.confirmPassword ? "#f87171" : "#e2e8f0",
                  }}
                >
                  <Feather name="shield" size={18} color={errors.confirmPassword ? "#f87171" : "#64748b"} />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(text) => { setConfirmPassword(text); setErrors({ ...errors, confirmPassword: null }); }}
                    placeholder="Confirm Password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showConfirmPassword}
                    className="flex-1 ml-3 text-[14px] text-slate-900 h-full"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="p-2 -mr-2"
                  >
                    <Feather
                      name={showConfirmPassword ? "eye" : "eye-off"}
                      size={18}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && <Text className="text-red-500 text-[11px] font-medium mt-1.5 ml-2">{errors.confirmPassword}</Text>}
              </View>

            </View>

            {/* 3. Primary Action Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSendVerification}
              className="w-full h-[52px] bg-[#1e4ed8] rounded-full justify-center items-center mb-6 shadow-sm shadow-blue-900/20"
            >
              <Text className="text-white font-bold text-[15px]">
                Send Verification Code
              </Text>
            </TouchableOpacity>

            {/* 4. Secondary Link */}
            <View className="flex-row justify-center items-center">
              <Text className="text-[13px] text-slate-500 font-medium">
                Already have an account?{" "}
              </Text>
              <TouchableOpacity 
                activeOpacity={0.6}
                onPress={() => router.replace("/login")}
              >
                <Text className="text-[13px] font-bold text-[#1e4ed8]">
                  Log In
                </Text>
              </TouchableOpacity>
            </View>

          </View>

          {/* Footer Branding Outside the Card */}
          <View className="mt-8">
            <Text className="text-center text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">
              CTU - MAIN CAMPUS • CAPSTONE 2026
            </Text>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}