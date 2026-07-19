import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductData = {
  product_name: string;
  brands: string;
  serving_size: string;
  sodium_mg: number;
  saturated_fat_g: number;
  energy_kcal: number;
  fiber_g: number;
  cholesterol_mg: number;
};

type MealTime = "Breakfast" | "Lunch" | "Dinner" | "Snack";

// ─── Nutrition Tile ───────────────────────────────────────────────────────────

function NutritionTile({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <View
      className="rounded-2xl p-4 border"
      style={{
        width: "48%",
        backgroundColor: highlight ? "#fcebeb" : "#f8fafc",
        borderColor: highlight ? "#f7c1c1" : "#e2e8f0",
      }}
    >
      <Text
        className="text-[10px] uppercase tracking-wide mb-1.5"
        style={{ color: highlight ? "#a32d2d" : "#94a3b8" }}
      >
        {label}
      </Text>
      <View className="flex-row items-end gap-1">
        <Text
          className="text-[22px] font-medium"
          style={{ color: highlight ? "#a32d2d" : "#0f172a" }}
        >
          {value}
        </Text>
        <Text
          className="text-[12px] mb-1"
          style={{ color: highlight ? "#f7c1c1" : "#94a3b8" }}
        >
          {unit}
        </Text>
      </View>
    </View>
  );
}

// ─── Meal Time Chip ───────────────────────────────────────────────────────────
// Dynamic bg/border via style — avoids css-interop crash

function MealTimeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="px-4 py-2 rounded-full border mr-2"
      style={{
        backgroundColor: active ? "#0f172a" : "#fff",
        borderColor: active ? "#0f172a" : "#e2e8f0",
      }}
    >
      <Text
        className="text-[12px] font-medium"
        style={{ color: active ? "#fff" : "#64748b" }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BarcodeScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [torch, setTorch] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [servingsStr, setServingsStr] = useState("1");
  const [mealTime, setMealTime] = useState<MealTime>("Lunch");

  const servings = parseFloat(servingsStr) || 1;

  const calc = {
    sodium:      product ? product.sodium_mg * servings : 0,
    fat:         product ? product.saturated_fat_g * servings : 0,
    calories:    product ? product.energy_kcal * servings : 0,
    fiber:       product ? product.fiber_g * servings : 0,
    cholesterol: product ? product.cholesterol_mg * servings : 0,
  };

  const isHighSodium = calc.sodium > 500;

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission, requestPermission]);

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${data}.json`);
      const result = await response.json();

      if (result.status === 1 && result.product) {
        const prod = result.product;
        const n = prod.nutriments || {};
        setProduct({
          product_name: prod.product_name || "Unknown product",
          brands: prod.brands || "Unknown brand",
          serving_size: prod.serving_size || "1 serving",
          sodium_mg: (n.sodium_serving || 0) * 1000,
          saturated_fat_g: n["saturated-fat_serving"] || 0,
          energy_kcal: n["energy-kcal_serving"] || 0,
          fiber_g: n["fiber_serving"] || 0,
          cholesterol_mg: (n["cholesterol_serving"] || 0) * 1000,
        });
      } else {
        Alert.alert("Product not found", "Could not find nutritional data for this barcode.", [
          { text: "Scan again", onPress: () => setScanned(false) },
        ]);
      }
    } catch {
      Alert.alert("Error", "An error occurred while fetching product data.", [
        { text: "Scan again", onPress: () => setScanned(false) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogMeal = () => {
    Alert.alert("Meal logged", "Successfully added to your daily diary.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  // ── Permission loading ──
  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  // ── Permission denied ──
  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center px-6">
        <View className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800/70 items-center justify-center mb-4">
          <Feather name="camera-off" size={26} color="#94a3b8" />
        </View>
        <Text className="text-[16px] font-medium text-slate-900 dark:text-white dark:text-slate-900 mb-2 text-center">
          Camera permission required
        </Text>
        <Text className="text-[13px] text-slate-400 text-center mb-6 leading-relaxed">
          HeartLink needs camera access to scan food barcodes.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-slate-900 dark:bg-slate-100 px-6 py-3 rounded-xl flex-row items-center gap-2"
        >
          <Feather name="camera" size={15} color="#fff" />
          <Text className="text-white dark:text-slate-900 font-medium text-[14px]">Grant permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} className="mt-3 px-6 py-3">
          <Text className="text-slate-400 text-[13px]">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/50">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 dark:bg-slate-100 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[17px] font-medium text-slate-900 dark:text-white dark:text-slate-900">Scan meal</Text>
          <Text className="text-[12px] text-slate-400">Record via barcode</Text>
        </View>
        {/* Torch toggle (always visible) */}
        {!product && (
          <TouchableOpacity
            onPress={() => setTorch(!torch)}
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800/70 items-center justify-center"
            style={{ backgroundColor: torch ? "#0f172a" : "#fff" }}
          >
            <Feather name={torch ? "zap" : "zap-off"} size={16} color={torch ? "#fff" : "#64748b"} />
          </TouchableOpacity>
        )}
      </View>

      {!product ? (
        /* ══ CAMERA VIEW ══ */
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View 
            className="flex-1 px-5 pt-4" 
            style={{ paddingBottom: Math.max(insets.bottom, 20) }}
          >
            {/* Camera */}
            <View collapsable={false} className="flex-1 rounded-2xl overflow-hidden relative" style={{ backgroundColor: "#000" }}>
              <CameraView
                style={{ width: "100%", height: "100%" }}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr"],
                }}
                enableTorch={torch}
              />
              
              {/* Scan overlay */}
              <View 
                style={[StyleSheet.absoluteFillObject, { zIndex: 10, elevation: 10 }]} 
                pointerEvents="box-none"
                className="items-center justify-center"
              >
                {/* Dark vignette corners */}
                <View 
                  style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.35)" }]} 
                  pointerEvents="none"
                />

                {/* Scan frame */}
                <View style={{ width: 240, height: 240, position: "relative", alignItems: "center", justifyContent: "center" }}>
                  {/* Clear centre */}
                  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "transparent" }]} />

                  {/* Corner marks */}
                  {[
                    { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
                    { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
                    { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
                    { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },
                  ].map((s, i) => (
                    <View key={i} style={{ position: "absolute", width: 28, height: 28, borderColor: "#fff", ...s }} />
                  ))}

                  {loading && (
                    <View style={{ backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 14, padding: 16, alignItems: "center" }}>
                      <ActivityIndicator size="large" color="#fff" />
                      <Text style={{ color: "#fff", marginTop: 8, fontSize: 13 }}>Looking up…</Text>
                    </View>
                  )}
                </View>

                {/* Label */}
                <View style={{ marginTop: 24, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8 }}>
                  <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "500" }}>
                    Centre barcode in frame
                  </Text>
                </View>
              </View>
            </View>

          {/* Manual entry */}
          <View className="mt-4">
            {showManualInput ? (
              <View className="flex-row items-center gap-2">
                <View className="flex-1 bg-white dark:bg-slate-900 dark:bg-slate-100 border border-slate-200 dark:border-slate-800/70 rounded-xl px-3.5 py-2.5">
                  <TextInput
                    value={manualBarcode}
                    onChangeText={setManualBarcode}
                    placeholder="Enter barcode number…"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="numeric"
                    className="text-[14px] text-slate-900 dark:text-white dark:text-slate-900"
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (manualBarcode) {
                      setShowManualInput(false);
                      handleBarcodeScanned({ type: "manual", data: manualBarcode });
                    }
                  }}
                  className="bg-slate-900 dark:bg-slate-100 px-4 py-2.5 rounded-xl"
                >
                  <Text className="text-white dark:text-slate-900 text-[13px] font-medium">Look up</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowManualInput(false)} className="p-2">
                  <Feather name="x" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center justify-center gap-3">
                <TouchableOpacity
                  onPress={() => setShowManualInput(true)}
                  className="flex-row items-center gap-1.5 bg-white dark:bg-slate-900 dark:bg-slate-100 border border-slate-200 dark:border-slate-800/70 px-4 py-2.5 rounded-xl"
                >
                  <Feather name="edit-2" size={13} color="#64748b" />
                  <Text className="text-[12px] text-slate-600">Enter manually</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push("/(home)/search-meal")}
                  className="flex-row items-center gap-1.5 bg-white dark:bg-slate-900 dark:bg-slate-100 border border-slate-200 dark:border-slate-800/70 px-4 py-2.5 rounded-xl"
                >
                  <Feather name="search" size={13} color="#64748b" />
                  <Text className="text-[12px] text-slate-600">Search food</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          </View>
        </KeyboardAvoidingView>
      ) : (
        /* ══ PRODUCT REVIEW ══ */
        <ScrollView contentContainerClassName="p-5 pb-10" showsVerticalScrollIndicator={false}>

          {/* Product header card */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-3 flex-row items-start gap-3">
            <View
              className="w-11 h-11 rounded-xl items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#eaf3de" }}
            >
              <MaterialCommunityIcons name="food-apple" size={20} color="#3b6d11" />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">
                {product.brands}
              </Text>
              <Text className="text-[16px] font-medium text-slate-900 dark:text-white dark:text-slate-900 leading-snug">
                {product.product_name}
              </Text>
              <Text className="text-[12px] text-slate-400 mt-0.5">
                Base serving: {product.serving_size}
              </Text>
            </View>
          </View>

          {/* High sodium warning */}
          {isHighSodium && (
            <View className="rounded-2xl p-4 mb-3 border flex-row items-start gap-3"
              style={{ backgroundColor: "#fcebeb", borderColor: "#f7c1c1" }}>
              <Feather name="alert-triangle" size={15} color="#a32d2d" style={{ marginTop: 1 }} />
              <View className="flex-1">
                <Text className="text-[13px] font-medium mb-0.5" style={{ color: "#a32d2d" }}>
                  High sodium
                </Text>
                <Text className="text-[12px] leading-relaxed" style={{ color: "#791f1f" }}>
                  Consider reducing portion size to keep your cardiovascular score stable.
                </Text>
              </View>
            </View>
          )}

          {/* Servings + meal time */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-3">
            {/* Servings stepper */}
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">
              Servings consumed
            </Text>
            <View className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-3 py-2 mb-4">
              <TouchableOpacity
                onPress={() => setServingsStr(String(Math.max(0.5, servings - 0.5)))}
                className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 dark:bg-slate-100 border border-slate-200 dark:border-slate-800/70 items-center justify-center"
              >
                <Feather name="minus" size={15} color="#475569" />
              </TouchableOpacity>
              <View className="items-center">
                <TextInput
                  value={servingsStr}
                  onChangeText={setServingsStr}
                  keyboardType="numeric"
                  className="text-[20px] font-medium text-slate-900 dark:text-white dark:text-slate-900 text-center w-16"
                />
              </View>
              <TouchableOpacity
                onPress={() => setServingsStr(String(servings + 0.5))}
                className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 dark:bg-slate-100 border border-slate-200 dark:border-slate-800/70 items-center justify-center"
              >
                <Feather name="plus" size={15} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Meal time chips */}
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">
              Time of meal
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(["Breakfast", "Lunch", "Dinner", "Snack"] as MealTime[]).map((t) => (
                <MealTimeChip key={t} label={t} active={mealTime === t} onPress={() => setMealTime(t)} />
              ))}
            </ScrollView>
          </View>

          {/* Nutrition grid */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-4">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-3">
              Total nutrition
            </Text>
            <View className="flex-row flex-wrap justify-between gap-y-3">
              <NutritionTile label="Sodium" value={calc.sodium.toFixed(0)} unit="mg" highlight={isHighSodium} />
              <NutritionTile label="Calories" value={calc.calories.toFixed(0)} unit="kcal" />
              <NutritionTile label="Sat. fat" value={calc.fat.toFixed(1)} unit="g" />
              <NutritionTile label="Fiber" value={calc.fiber.toFixed(1)} unit="g" />
              <NutritionTile label="Cholesterol" value={calc.cholesterol.toFixed(0)} unit="mg" />
            </View>
          </View>

          {/* Actions */}
          <TouchableOpacity
            onPress={handleLogMeal}
            className="bg-slate-900 dark:bg-slate-100 w-full rounded-2xl py-3.5 flex-row items-center justify-center gap-2 mb-2"
            activeOpacity={0.85}
          >
            <Feather name="check" size={15} color="#fff" />
            <Text className="text-white dark:text-slate-900 text-[14px] font-medium">Log to daily diary</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setProduct(null);
              setScanned(false);
              setServingsStr("1");
            }}
            className="w-full rounded-2xl py-3.5 items-center border border-slate-200 dark:border-slate-800/70 bg-white dark:bg-slate-900 dark:bg-slate-100"
            activeOpacity={0.75}
          >
            <Text className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">Discard & scan again</Text>
          </TouchableOpacity>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}