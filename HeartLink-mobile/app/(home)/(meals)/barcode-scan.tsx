import { useColorScheme } from "nativewind";
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
  Animated,
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
  image_url?: string;
};

type MealTime = "Breakfast" | "Lunch" | "Dinner" | "Snack";

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BarcodeScanScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [torch, setTorch] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");

  const scanLineAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 236, // Height of the scan frame minus line thickness
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scanLineAnim]);



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
        
        const extractNutrient = (baseKey: string) => {
          return n[`${baseKey}_serving`] ?? 
                 n[`${baseKey}_100g`] ?? 
                 n[`${baseKey}_value`] ?? 
                 n[`${baseKey}_prepared_serving`] ?? 
                 n[`${baseKey}_prepared_100g`] ?? 
                 n[baseKey] ?? 0;
        };
        
        const parsedProduct: ProductData = {
          product_name: prod.product_name || "Unknown product",
          brands: prod.brands || "Unknown brand",
          serving_size: prod.serving_size || "1 serving",
          sodium_mg: extractNutrient("sodium") * 1000,
          saturated_fat_g: extractNutrient("saturated-fat"),
          energy_kcal: extractNutrient("energy-kcal") || extractNutrient("energy"), // sometimes it's just 'energy'
          fiber_g: extractNutrient("fiber"),
          cholesterol_mg: extractNutrient("cholesterol") * 1000,
          image_url: prod.image_front_url || prod.image_url || undefined,
        };
        
        router.push({
          pathname: "/(home)/(meals)/scan-result",
          params: { product: JSON.stringify(parsedProduct) }
        });
        
        // Reset scanner after a short delay so they can scan again if they go back
        setTimeout(() => setScanned(false), 1000);
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
        <Text className="text-[16px] font-medium text-slate-900 dark:text-white mb-2 text-center">
          Camera permission required
        </Text>
        <Text className="text-[13px] text-slate-400 text-center mb-6 leading-relaxed">
          HeartLink needs camera access to scan food barcodes.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-slate-900 px-6 py-3 rounded-xl flex-row items-center gap-2"
        >
          <Feather name="camera" size={15} color="#fff" />
          <Text className="text-white font-medium text-[14px]">Grant permission</Text>
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
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[17px] font-medium text-slate-900 dark:text-white">Scan meal</Text>
          <Text className="text-[12px] text-slate-400">Record via barcode</Text>
        </View>
        {/* Torch toggle (always visible) */}
        <TouchableOpacity
          onPress={() => setTorch(!torch)}
          className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800/70 items-center justify-center"
          style={{ backgroundColor: torch ? "#0f172a" : "#fff" }}
        >
          <Feather name={torch ? "zap" : "zap-off"} size={16} color={torch ? "#fff" : "#64748b"} />
        </TouchableOpacity>
      </View>

      {/* ══ CAMERA VIEW ══ */}
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
              style={StyleSheet.absoluteFillObject}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr"],
              }}
              enableTorch={torch}
            />
              {/* Scan overlay */}
              <View 
                style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]} 
                pointerEvents="box-none"
              >
                {/* Dark vignette corners */}
                <View 
                  style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.35)" }]} 
                  pointerEvents="none"
                />

                {/* Scan frame */}
                <View style={{ width: 240, height: 240, position: "relative", alignItems: "center", justifyContent: "center" }}>
                  {/* Clear centre */}
                  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "transparent", overflow: "hidden" }]}>
                    {/* Animated Laser Line */}
                    {!scanned && !loading && (
                      <Animated.View
                        style={{
                          width: "100%",
                          height: 3,
                          backgroundColor: "#ef4444",
                          opacity: 0.8,
                          transform: [{ translateY: scanLineAnim }],
                        }}
                      />
                    )}
                  </View>

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
              <View className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 rounded-xl px-3.5 py-2.5">
                <TextInput
                  value={manualBarcode}
                  onChangeText={setManualBarcode}
                  placeholder="Enter barcode number…"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="numeric"
                  className="text-[14px] text-slate-900 dark:text-white"
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
                className="bg-slate-900 px-4 py-2.5 rounded-xl"
              >
                <Text className="text-white text-[13px] font-medium">Look up</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowManualInput(false)} className="p-2">
                <Feather name="x" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row items-center justify-center gap-3">
              <TouchableOpacity
                onPress={() => setShowManualInput(true)}
                className="flex-row items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 px-4 py-2.5 rounded-xl"
              >
                <Feather name="edit-2" size={13} color="#64748b" />
                <Text className="text-[12px] text-slate-600">Enter manually</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(home)/(meals)/search-meal")}
                className="flex-row items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 px-4 py-2.5 rounded-xl"
              >
                <Feather name="search" size={13} color="#64748b" />
                <Text className="text-[12px] text-slate-600">Search food</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}