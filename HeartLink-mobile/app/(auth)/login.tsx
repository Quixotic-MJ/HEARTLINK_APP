import React, { useState, useEffect } from "react";
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
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import '../../global.css';

export default function AuthScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams();

  // Mode Toggle - default based on URL query parameter
  const [isLoginMode, setIsLoginMode] = useState(mode !== "register");

  // Sync state if navigation target mode changes
  useEffect(() => {
    if (mode === "login") {
      setIsLoginMode(true);
    } else if (mode === "register") {
      setIsLoginMode(false);
    }
  }, [mode]);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Handle Mode Switch
  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = () => {
    if (isLoginMode) {
      console.log("Logging in with:", email, password);
      // router.replace("/(app)/dashboard");
    } else {
      console.log("Registering with:", email, password, confirmPassword);
      // router.replace("/(app)/dashboard");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Top Navigation Bar */}
      <View className="flex-row items-center px-6 pt-2 pb-4 z-10">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="p-2 -ml-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={24} color="#475569" />
        </TouchableOpacity>
        
        {/* Centered App Name */}
        <View className="flex-1 items-center pr-8">
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
          contentContainerClassName="flex-grow px-8 pt-6 pb-12"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          
          {/* 1. Header Text */}
          <View className="mb-10 mt-4">
            <Text className="text-[32px] font-black text-slate-900 tracking-tight mb-3 leading-[38px]">
              {isLoginMode ? "Welcome\nBack." : "Create\nAccount."}
            </Text>
            <Text className="text-[15px] text-slate-500 font-medium leading-relaxed pr-4">
              {isLoginMode
                ? "Log in to access your cardiovascular dashboard."
                : "Sign up to track and monitor your heart health journey."}
            </Text>
          </View>

          {/* 2. Input Fields */}
          <View className="flex-col">
            
            {/* Email Input */}
            <View className="w-full h-16 bg-[#f8fafc] border border-slate-100 rounded-[20px] flex-row items-center px-5 transition-colors focus-within:border-[#1e4ed8] focus-within:bg-white mb-4">
              <Feather name="mail" size={20} color="#94a3b8" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email Address"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                className="flex-1 ml-3 text-[15px] text-slate-900 font-medium h-full"
              />
            </View>

            {/* Password Input */}
            <View className="mb-4">
              <View className="w-full h-16 bg-[#f8fafc] border border-slate-100 rounded-[20px] flex-row items-center px-5 transition-colors focus-within:border-[#1e4ed8] focus-within:bg-white">
                <Feather name="lock" size={20} color="#94a3b8" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  className="flex-1 ml-3 text-[15px] text-slate-900 font-medium h-full"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="p-2 -mr-2"
                >
                  <Feather
                    name={showPassword ? "eye" : "eye-off"}
                    size={18}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link (Login Mode Only) */}
              {isLoginMode && (
                <TouchableOpacity className="self-end mt-3 mb-2">
                  <Text className="text-[13px] font-bold text-[#1e4ed8]">
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Confirm Password Input (Register Mode Only) */}
            {!isLoginMode && (
              <View className="w-full h-16 bg-[#f8fafc] border border-slate-100 rounded-[20px] flex-row items-center px-5 transition-colors focus-within:border-[#1e4ed8] focus-within:bg-white mb-4">
                <Feather name="shield" size={20} color="#94a3b8" />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm Password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showConfirmPassword}
                  className="flex-1 ml-3 text-[15px] text-slate-900 font-medium h-full"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="p-2 -mr-2"
                >
                  <Feather
                    name={showConfirmPassword ? "eye" : "eye-off"}
                    size={18}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 3. Primary Action Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSubmit}
            className={`w-full h-16 bg-[#1e4ed8] rounded-[20px] justify-center items-center shadow-lg shadow-blue-900/20 ${isLoginMode ? 'mt-8' : 'mt-10'}`}
          >
            <Text className="text-white font-bold text-[16px] tracking-wide">
              {isLoginMode ? "Log In" : "Create Account"}
            </Text>
          </TouchableOpacity>

          {/* Spacer to push the footer to the bottom */}
          <View className="flex-1 min-h-[60px]" />

          {/* 4. Footer Link */}
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={toggleMode}
            className="flex-row justify-center items-center py-4 mt-auto"
          >
            <Text className="text-[14px] font-medium text-slate-500">
              {isLoginMode ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <Text className="text-[14px] font-bold text-[#1e4ed8]">
              {isLoginMode ? "Sign up" : "Log in"}
            </Text>
          </TouchableOpacity>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}