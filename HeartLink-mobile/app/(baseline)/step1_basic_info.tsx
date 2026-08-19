import React, { useState, useEffect } from "react";
import { View, Text, TextInput, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useToast } from "../../contexts/ToastContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useColorScheme } from "nativewind";
import { useBaseline } from "../../contexts/BaselineContext";
import AnimatedButton from "../../components/ui/AnimatedButton";

// Reusable components
function MeasureInput({ value, onChangeText, onBlur, placeholder = "0", unit, maxLength, hasError, isDark }: any) {
  return (
    <View className={`flex-1 bg-card rounded-xl flex-row items-center px-3.5 border min-h-[52px] ${hasError ? "border-destructive bg-destructive/5" : "border-border"}`}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        keyboardType="decimal-pad"
        maxLength={maxLength}
        className="flex-1 text-[16px] font-medium text-foreground h-full"
      />
      <Text className="text-[13px] text-muted-foreground ml-1">{unit}</Text>
    </View>
  );
}

function FieldLabel({ title }: { title: string }) {
  return <Text className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2 ml-0.5">{title}</Text>;
}

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} className={`flex-1 h-1 rounded-full ${i < current ? "bg-primary" : "bg-border"}`} />
      ))}
    </View>
  );
}

export default function Step1BasicInfo() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const { data, updateData } = useBaseline();
  
  const insets = useSafeAreaInsets();
  
  // Local state to prevent global context thrashing on rapid keystrokes
  const [localFirstName, setLocalFirstName] = useState(data.first_name || "");
  const [localLastName, setLocalLastName] = useState(data.last_name || "");
  const [localHeight, setLocalHeight] = useState(data.height_cm || "");
  const [localWeight, setLocalWeight] = useState(data.weight_kg || "");
  const [errorFields, setErrorFields] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load existing user profile on mount (guarded against overwriting existing in-memory baseline state)
  useEffect(() => {
    async function loadExisting() {
      const base_url = process.env.EXPO_PUBLIC_API_URL;
      if (!params.user_id) return;
      // If context already has data (e.g. user navigated back from Step 2), do not overwrite
      if (data.first_name || data.height_cm || data.weight_kg) return;
      try {
        const res = await fetch(`${base_url}/api/users/${params.user_id}/profile`);
        if (!res.ok) return;
        const json = await res.json();
        const p = json?.profile;
        if (p) {
          const fetchedFirstName = p.first_name || '';
          const fetchedLastName = p.last_name || '';
          const fetchedHeight = p.height_cm ? String(p.height_cm) : '';
          const fetchedWeight = p.weight_kg ? String(p.weight_kg) : '';

          setLocalFirstName(fetchedFirstName);
          setLocalLastName(fetchedLastName);
          setLocalHeight(fetchedHeight);
          setLocalWeight(fetchedWeight);

          updateData({
            first_name: fetchedFirstName,
            last_name: fetchedLastName,
            date_of_birth: p.date_of_birth || '',
            sex: p.sex || '',
            height_cm: fetchedHeight,
            weight_kg: fetchedWeight,
          });
        }
      } catch (e) {}
    }
    loadExisting();
  }, [params.user_id]);

  const isReady = !!localFirstName.trim() && !!data.date_of_birth && !!data.sex && !!localHeight.trim() && !!localWeight.trim();

  const handleNext = () => {
    const errors: string[] = [];
    const h = parseFloat(localHeight);
    const w = parseFloat(localWeight);
    if (isNaN(h) || h < 50 || h > 300) {
      errors.push("height");
      showToast({ title: "Invalid Height", message: "Please enter a valid height (50-300 cm).", type: "error" });
    }
    if (isNaN(w) || w < 20 || w > 400) {
      errors.push("weight");
      showToast({ title: "Invalid Weight", message: "Please enter a valid weight (20-400 kg).", type: "error" });
    }

    if (errors.length > 0) {
      setErrorFields(errors);
      return;
    }

    setErrorFields([]);
    updateData({
      first_name: localFirstName.trim(),
      last_name: localLastName.trim(),
      height_cm: localHeight.trim(),
      weight_kg: localWeight.trim(),
    });

    router.push({ pathname: "/(baseline)/step2_activity", params });
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center mb-4">
          <AnimatedButton onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-card border border-border items-center justify-center mr-3">
            <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
          </AnimatedButton>
          <View className="flex-1">
            <Text className="text-[11px] text-muted-foreground uppercase tracking-wide">Step 1 of 6</Text>
            <Text className="text-xl font-bold text-foreground mt-0.5">Basic Information</Text>
          </View>
        </View>
        <StepProgress current={1} total={6} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          <View className="mb-6 flex-row gap-3">
            <View className="flex-1">
              <FieldLabel title="First Name" />
              <View className="bg-card rounded-xl px-3.5 border border-border min-h-[52px] justify-center">
                <TextInput
                  value={localFirstName}
                  onChangeText={(t) => setLocalFirstName(t)}
                  onBlur={() => updateData({ first_name: localFirstName.trim() })}
                  placeholder="John"
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                  className="text-[16px] font-medium text-foreground h-full"
                />
              </View>
            </View>
            <View className="flex-1">
              <FieldLabel title="Last Name" />
              <View className="bg-card rounded-xl px-3.5 border border-border min-h-[52px] justify-center">
                <TextInput
                  value={localLastName}
                  onChangeText={(t) => setLocalLastName(t)}
                  onBlur={() => updateData({ last_name: localLastName.trim() })}
                  placeholder="Doe"
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                  className="text-[16px] font-medium text-foreground h-full"
                />
              </View>
            </View>
          </View>

          <View className="mb-6">
            <FieldLabel title="Date of Birth" />
            <AnimatedButton 
              onPress={() => setShowDatePicker(true)}
              className="bg-card rounded-xl px-3.5 border border-border min-h-[52px] flex-row items-center"
            >
              <Feather name="calendar" size={18} color={isDark ? "#94a3b8" : "#64748b"} />
              <Text 
                className={`text-[16px] font-medium ml-3 ${data.date_of_birth ? "text-foreground" : "text-muted-foreground"}`}
              >
                {data.date_of_birth ? new Date(data.date_of_birth).toLocaleDateString() : "Select Date"}
              </Text>
            </AnimatedButton>
            {showDatePicker && (
              <DateTimePicker
                value={data.date_of_birth ? new Date(data.date_of_birth) : new Date(1990, 0, 1)}
                mode="date" display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) updateData({ date_of_birth: date.toISOString().split("T")[0] });
                }}
              />
            )}
          </View>

          <View className="mb-6">
            <FieldLabel title="Biological Sex" />
            <View className="flex-row bg-border/40 p-1 rounded-xl">
              {["male", "female"].map((s) => {
                const isActive = data.sex === s;
                return (
                <AnimatedButton
                  key={s} onPress={() => updateData({ sex: s as any })}
                  className={`flex-1 items-center justify-center py-3 rounded-lg ${isActive ? "bg-primary shadow-sm" : "bg-transparent"}`}
                >
                  <Text 
                    className={`text-[14px] font-semibold capitalize ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {s}
                  </Text>
                </AnimatedButton>
              )})}
            </View>
          </View>

          <View className="mb-8 flex-row gap-4">
            <View className="flex-1">
              <FieldLabel title="Height" />
              <MeasureInput
                value={localHeight}
                onChangeText={(t: string) => {
                  setLocalHeight(t);
                  setErrorFields((prev) => prev.filter((f) => f !== "height"));
                }}
                onBlur={() => updateData({ height_cm: localHeight.trim() })}
                unit="cm"
                maxLength={5}
                hasError={errorFields.includes("height")}
                isDark={isDark}
              />
            </View>
            <View className="flex-1">
              <FieldLabel title="Weight" />
              <MeasureInput
                value={localWeight}
                onChangeText={(t: string) => {
                  setLocalWeight(t);
                  setErrorFields((prev) => prev.filter((f) => f !== "weight"));
                }}
                onBlur={() => updateData({ weight_kg: localWeight.trim() })}
                unit="kg"
                maxLength={5}
                hasError={errorFields.includes("weight")}
                isDark={isDark}
              />
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View 
        className="px-5 pt-4 bg-card border-t border-border"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <AnimatedButton
          onPress={handleNext} disabled={!isReady}
          className={`h-[54px] rounded-2xl items-center justify-center flex-row shadow-sm ${isReady ? "bg-primary" : "bg-muted/30"}`}
        >
          <Text className={`text-[16px] font-bold ${isReady ? "text-primary-foreground" : "text-muted"}`}>Next Step</Text>
          <Feather name="arrow-right" size={18} color={isReady ? "#ffffff" : (isDark ? "#475569" : "#94a3b8")} className="ml-2" />
        </AnimatedButton>
      </View>
    </SafeAreaView>
  );
}
