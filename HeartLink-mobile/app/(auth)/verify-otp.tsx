import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import "../../global.css";

export default function OTPVerificationScreen() {
  const router = useRouter();

  // Array of 6 empty strings for the 6-digit OTP
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);

  // UI States
  const [isVerifying, setIsVerifying] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Countdown Timer Logic
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Handle OTP Input and Auto-Advance
  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance to next input if a number is typed
    if (value !== "" && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle Backspace Auto-Return
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  // Simulated Verification Action
  const handleVerify = () => {
    const otpCode = otp.join("");
    if (otpCode.length === 6) {
      setIsVerifying(true);
      console.log("Verifying OTP:", otpCode);

      // Simulate API Call Delay
      setTimeout(() => {
        setIsVerifying(false);
        router.replace("/verification-success"); 
      }, 2000);
    }
  };

  // Simulated Resend Action
  const handleResend = () => {
    if (canResend) {
      console.log("Resending OTP code...");
      setTimer(30);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0].focus();
    }
  };

  // Helper to format timer as MM:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f4f7fb]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* 1. The Header */}
      <View className="flex-row items-center px-6 pt-2 pb-4 z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color="#475569" />
        </TouchableOpacity>

        {/* Placeholder for centering */}
        <View className="flex-1" />
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
          <View className="bg-white mx-5 rounded-[32px] px-6 py-10 shadow-sm shadow-blue-900/5">
            {/* Header Text */}
            <View className="mb-10 items-center">
              <View className="bg-blue-50 w-16 h-16 rounded-full items-center justify-center mb-5 border border-blue-100">
                <Feather name="smartphone" size={28} color="#1e4ed8" />
              </View>
              <Text className="text-[28px] font-black text-slate-900 text-center tracking-tight mb-3">
                Verify Your Account
              </Text>
              <Text className="text-[14px] text-slate-500 text-center font-medium leading-relaxed px-2">
                We've sent a one-time password (OTP) to your phone number.
              </Text>
              <Text className="text-[13px] font-bold text-slate-700 mt-2">
                +63 912 345 6789
              </Text>
            </View>

            {/* 2. The Input Form (6 Square Boxes) */}
            <View className="flex-row justify-between mb-10">
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  className={`w-[14%] aspect-square bg-white border ${digit !== "" ? "border-[#1e4ed8]" : "border-slate-200"} rounded-[14px] text-center text-[22px] font-black text-slate-900 transition-colors focus:border-[#1e4ed8] focus:bg-blue-50/30 shadow-sm shadow-slate-100 p-0`}
                  style={{
                    padding: 0,
                    textAlignVertical: "center",
                    ...Platform.select({
                      android: {
                        includeFontPadding: false,
                      },
                    }),
                  }}
                />
              ))}
            </View>

            {/* 3. The Action Area */}
            <View>
              {/* Primary Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleVerify}
                disabled={isVerifying || otp.join("").length !== 6}
                className={`w-full h-[52px] rounded-full flex-row justify-center items-center mb-6 shadow-sm shadow-blue-900/20 ${otp.join("").length === 6 ? "bg-[#1e4ed8]" : "bg-[#94a3b8]"}`}
              >
                {isVerifying ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-[15px]">
                    Verify & Proceed
                  </Text>
                )}
              </TouchableOpacity>

              {/* Resend Link / Countdown Timer */}
              <View className="flex-row justify-center items-center">
                <Text className="text-[13px] text-slate-500 font-medium">
                  Didn't receive the code?{" "}
                </Text>
                {canResend ? (
                  <TouchableOpacity activeOpacity={0.6} onPress={handleResend}>
                    <Text className="text-[13px] font-bold text-[#1e4ed8]">
                      Resend Code
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text className="text-[13px] font-bold text-slate-400">
                    Resend in {formatTime(timer)}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Footer Branding */}
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
