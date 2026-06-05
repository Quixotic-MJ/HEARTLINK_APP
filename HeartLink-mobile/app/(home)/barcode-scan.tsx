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
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// Types
type ProductData = {
  product_name: string;
  brands: string;
  serving_size: string;
  sodium_mg: number; // calculated from API
  saturated_fat_g: number;
  energy_kcal: number;
};

export default function BarcodeScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);
  
  // User input
  const [servingsStr, setServingsStr] = useState("1");
  const servings = parseFloat(servingsStr) || 1;

  // Derived values based on servings
  const calculatedSodium = product ? product.sodium_mg * servings : 0;
  const calculatedFat = product ? product.saturated_fat_g * servings : 0;
  const calculatedCalories = product ? product.energy_kcal * servings : 0;

  const isHighSodium = calculatedSodium > 500;

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
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
        const nutriments = prod.nutriments || {};

        // Sodium parsing (API often returns in grams for serving/100g, let's use the raw values carefully)
        // sodium_serving is usually in grams
        const sodium_serving = nutriments.sodium_serving || 0;
        const sodium_mg = sodium_serving * 1000;

        const saturated_fat_g = nutriments["saturated-fat_serving"] || 0;
        const energy_kcal = nutriments["energy-kcal_serving"] || 0;

        setProduct({
          product_name: prod.product_name || "Unknown Product",
          brands: prod.brands || "Unknown Brand",
          serving_size: prod.serving_size || "1 serving",
          sodium_mg,
          saturated_fat_g,
          energy_kcal,
        });
      } else {
        Alert.alert(
          "Product Not Found",
          "Could not find nutritional data for this barcode.",
          [{ text: "Scan Again", onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        "An error occurred while fetching product data.",
        [{ text: "Scan Again", onPress: () => setScanned(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogMeal = () => {
    // Simulated log action
    Alert.alert("Success", "Meal successfully logged to your Daily Diary!", [
      { text: "OK", onPress: () => router.back() }
    ]);
  };

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#1e4ed8" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-6">
        <Feather name="camera-off" size={48} color="#94a3b8" />
        <Text className="text-[16px] font-medium text-slate-900 mt-4 mb-6 text-center">
          We need your permission to show the camera
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-[#1e4ed8] px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-medium">Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 px-6 py-3"
        >
          <Text className="text-slate-500 font-medium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white border border-slate-200/70 items-center justify-center mr-3 shadow-sm shadow-slate-200/50"
        >
          <Feather name="arrow-left" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View>
          <Text className="text-[18px] font-bold text-slate-900 tracking-tight">
            Scan Meal
          </Text>
          <Text className="text-[12px] text-slate-500 font-medium">
            Record via barcode
          </Text>
        </View>
      </View>

      {!product ? (
        // Camera View Screen
        <View className="flex-1 px-5 pb-5 pt-2">
          <View className="flex-1 rounded-3xl overflow-hidden bg-slate-900 border border-slate-200/70">
            <CameraView
              style={StyleSheet.absoluteFillObject}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr"],
              }}
            >
              {/* Scan Overlay UI */}
              <View className="flex-1 justify-center items-center">
                <View className="w-64 h-64 border-2 border-white/50 rounded-2xl items-center justify-center relative">
                  {/* Scan frame corners */}
                  <View className="absolute top-[-2px] left-[-2px] w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl" />
                  <View className="absolute top-[-2px] right-[-2px] w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl" />
                  <View className="absolute bottom-[-2px] left-[-2px] w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl" />
                  <View className="absolute bottom-[-2px] right-[-2px] w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl" />
                  
                  {loading && (
                    <View className="bg-black/50 p-4 rounded-xl items-center">
                      <ActivityIndicator size="large" color="#ffffff" />
                      <Text className="text-white mt-2 font-medium">Looking up...</Text>
                    </View>
                  )}
                </View>
                <Text className="text-white/80 mt-8 font-medium text-[15px] bg-black/40 px-4 py-2 rounded-full">
                  Center barcode in frame
                </Text>
              </View>
            </CameraView>
          </View>
        </View>
      ) : (
        // Product Review Screen
        <ScrollView contentContainerClassName="p-5" showsVerticalScrollIndicator={false}>
          <View className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-sm shadow-slate-200/40">
            
            {/* Product Header */}
            <View className="flex-row items-start justify-between mb-6 border-b border-slate-100 pb-5">
              <View className="flex-1 pr-4">
                <View className="bg-blue-50 self-start px-2.5 py-1 rounded-md mb-2">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-[#1e4ed8]">
                    {product.brands}
                  </Text>
                </View>
                <Text className="text-[22px] font-bold text-slate-900 leading-tight">
                  {product.product_name}
                </Text>
                <Text className="text-[13px] text-slate-500 mt-1 font-medium">
                  Base Serving: {product.serving_size}
                </Text>
              </View>
              <View className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-100 items-center justify-center">
                <MaterialCommunityIcons name="food-apple" size={24} color="#64748b" />
              </View>
            </View>

            {/* Warning Banner */}
            {isHighSodium && (
              <View className="bg-red-50 rounded-2xl p-4 mb-6 flex-row items-center border border-red-100">
                <View className="w-8 h-8 bg-red-100 rounded-full items-center justify-center mr-3">
                  <Feather name="alert-circle" size={16} color="#dc2626" />
                </View>
                <View className="flex-1">
                  <Text className="text-red-900 font-bold text-[14px]">High Sodium Alert</Text>
                  <Text className="text-red-700 text-[12px] mt-0.5 leading-snug">
                    Consider reducing portion size to keep your cardiovascular score stable.
                  </Text>
                </View>
              </View>
            )}

            {/* Servings Adjustment */}
            <View className="mb-6 flex-row items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <View>
                <Text className="text-[14px] font-bold text-slate-900">Servings Consumed</Text>
                <Text className="text-[12px] text-slate-500 mt-0.5">Adjust multiplier</Text>
              </View>
              <View className="flex-row items-center bg-white rounded-xl border border-slate-200 shadow-sm shadow-slate-100/50">
                <TouchableOpacity 
                  onPress={() => setServingsStr(String(Math.max(0.5, servings - 0.5)))}
                  className="w-10 h-10 items-center justify-center"
                >
                  <Feather name="minus" size={16} color="#64748b" />
                </TouchableOpacity>
                <TextInput
                  value={servingsStr}
                  onChangeText={setServingsStr}
                  keyboardType="numeric"
                  className="w-12 text-center text-[16px] font-bold text-slate-900"
                />
                <TouchableOpacity 
                  onPress={() => setServingsStr(String(servings + 0.5))}
                  className="w-10 h-10 items-center justify-center"
                >
                  <Feather name="plus" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Nutritional Grid */}
            <Text className="text-[15px] font-bold text-slate-900 mb-3">Total Nutrition</Text>
            <View className="flex-row flex-wrap justify-between gap-y-3 mb-8">
              
              <View className={`w-[48%] rounded-2xl p-4 border ${isHighSodium ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                <Text className={`text-[12px] font-medium uppercase tracking-wider mb-1 ${isHighSodium ? 'text-red-600' : 'text-blue-600'}`}>
                  Sodium
                </Text>
                <View className="flex-row items-end">
                  <Text className={`text-[24px] font-bold ${isHighSodium ? 'text-red-900' : 'text-blue-900'}`}>
                    {calculatedSodium.toFixed(0)}
                  </Text>
                  <Text className={`text-[13px] font-medium mb-1 ml-1 ${isHighSodium ? 'text-red-700' : 'text-blue-700'}`}>
                    mg
                  </Text>
                </View>
              </View>

              <View className="w-[48%] bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <Text className="text-[12px] text-slate-500 font-medium uppercase tracking-wider mb-1">
                  Calories
                </Text>
                <View className="flex-row items-end">
                  <Text className="text-[24px] font-bold text-slate-900">
                    {calculatedCalories.toFixed(0)}
                  </Text>
                  <Text className="text-[13px] font-medium text-slate-500 mb-1 ml-1">
                    kcal
                  </Text>
                </View>
              </View>

              <View className="w-[48%] bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <Text className="text-[12px] text-slate-500 font-medium uppercase tracking-wider mb-1">
                  Sat. Fat
                </Text>
                <View className="flex-row items-end">
                  <Text className="text-[24px] font-bold text-slate-900">
                    {calculatedFat.toFixed(1)}
                  </Text>
                  <Text className="text-[13px] font-medium text-slate-500 mb-1 ml-1">
                    g
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <TouchableOpacity
              onPress={handleLogMeal}
              className="bg-[#1e4ed8] w-full rounded-2xl py-4 items-center shadow-md shadow-blue-600/20"
            >
              <Text className="text-white font-bold text-[16px]">
                Log to Daily Diary
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setProduct(null);
                setScanned(false);
                setServingsStr("1");
              }}
              className="w-full rounded-2xl py-4 items-center mt-2 border border-slate-200 bg-white"
            >
              <Text className="text-slate-600 font-bold text-[15px]">
                Discard & Scan Again
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
