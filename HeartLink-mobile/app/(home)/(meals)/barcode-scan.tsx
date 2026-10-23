import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useToast } from "../../../contexts/ToastContext";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import DsButton from "../../../components/onboarding/DsButton";
import { useDs } from "../../../components/onboarding/useDs";
import { FoodHeader, OutlineButton } from "../../../components/food/FoodBits";

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

/** Why a look-up didn't find a product: not in the database, or the connection was too slow. */
type LookupProblem = "missing" | "slow" | null;

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BarcodeScanScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const { showToast } = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [torch, setTorch] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [problem, setProblem] = useState<LookupProblem>(null);

  const [scanLineAnim] = React.useState(() => new Animated.Value(0));
  const scanLock = React.useRef(false);

  useFocusEffect(
    useCallback(() => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 237, // Height of the scan frame (240) minus line thickness (3)
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );

      animation.start();

      return () => {
        animation.stop();
        scanLineAnim.setValue(0);
      };
    }, [scanLineAnim])
  );

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission, requestPermission]);

  const resetScanner = () => {
    scanLock.current = false;
    setScanned(false);
  };

  const handleBarcodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || loading || scanLock.current) return;
    scanLock.current = true;
    setScanned(true);
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(data)}.json`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const result = await response.json();

      if (result.status === 1 && result.product) {
        const prod = result.product;
        const n = prod.nutriments || {};

        // 1. Check if the database actually has "per serving" nutritional data
        const hasServingData = n["energy-kcal_serving"] !== undefined || n["energy_serving"] !== undefined || n["sodium_serving"] !== undefined;

        // 2. If serving data is completely missing, we are forced to fall back to 100g data.
        // We MUST explicitly label the serving size as "100g" so the user knows what they are multiplying.
        const finalServingSize = hasServingData ? (prod.serving_size || "1 serving") : "100g";

        const extractNutrient = (baseKey: string) => {
          // If we don't have serving data, forcefully extract the 100g data so the math aligns with our new label
          if (!hasServingData) {
             return n[`${baseKey}_100g`] ??
                    n[`${baseKey}_value`] ??
                    n[baseKey] ?? 0;
          }

          return n[`${baseKey}_serving`] ??
                 n[`${baseKey}_100g`] ??
                 n[`${baseKey}_value`] ??
                 n[`${baseKey}_prepared_serving`] ??
                 n[`${baseKey}_prepared_100g`] ??
                 n[baseKey] ?? 0;
        };

        const getUnitMultiplier = (baseKey: string) => {
          const unit = n[`${baseKey}_unit`];
          if (unit) {
            const lowerUnit = unit.toLowerCase().trim();
            if (lowerUnit === "mg" || lowerUnit === "milligram" || lowerUnit === "milligrams") return 1;
            if (lowerUnit === "µg" || lowerUnit === "mcg" || lowerUnit === "microgram") return 0.001;
            if (lowerUnit === "g" || lowerUnit === "gram" || lowerUnit === "grams") return 1000;
          }
          // Default OpenFoodFacts normalization is usually grams, so we cautiously multiply by 1000 if the unit field is missing
          return 1000;
        };

        const parsedProduct: ProductData = {
          product_name: prod.product_name || "Unknown product",
          brands: prod.brands || "Unknown brand",
          serving_size: finalServingSize,
          sodium_mg: extractNutrient("sodium") * getUnitMultiplier("sodium"),
          saturated_fat_g: extractNutrient("saturated-fat"),
          energy_kcal: extractNutrient("energy-kcal") || extractNutrient("energy"), // sometimes it's just 'energy'
          fiber_g: extractNutrient("fiber"),
          cholesterol_mg: extractNutrient("cholesterol") * getUnitMultiplier("cholesterol"),
          image_url: prod.image_front_url || prod.image_url || undefined,
        };

        router.push({
          pathname: "/(home)/(meals)/scan-result",
          params: { product: JSON.stringify(parsedProduct) }
        });

        // Reset scanner after a short delay so they can scan again if they go back
        setTimeout(resetScanner, 1000);
      } else {
        setProblem("missing");
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setProblem("slow");
      } else {
        showToast({ title: "Error", message: "An error occurred while fetching product data.", type: "error" });
        setTimeout(resetScanner, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Permission loading ──
  if (!permission) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.canvas }}>
        <ActivityIndicator size="large" color={c.steel} />
      </View>
    );
  }

  // ── Permission denied ──
  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas, justifyContent: "center", paddingHorizontal: 24, gap: 16 }}>
        <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
          <Feather name="camera-off" size={26} color={c.charcoal} />
        </View>
        <View style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "600", color: c.ink }}>Allow the camera</Text>
          <Text style={{ fontSize: 16, lineHeight: 24, color: c.slate }}>{"HeartLink needs the camera to read food barcodes. It isn't used for anything else."}</Text>
        </View>
        <DsButton label="Allow camera" onPress={requestPermission} />
        <DsButton label="Go back" variant="secondary" block onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <FoodHeader
        title="Scan a barcode"
        onBack={() => router.back()}
        right={
          <AnimatedButton
            onPress={() => setTorch(!torch)}
            accessibilityRole="switch"
            accessibilityState={{ checked: torch }}
            accessibilityLabel="Torch"
            style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: torch ? c.line : c.hairline, backgroundColor: torch ? c.tint : c.canvas, alignItems: "center", justifyContent: "center" }}
          >
            <Feather name={torch ? "zap" : "zap-off"} size={18} color={torch ? c.onTint : c.ink} />
          </AnimatedButton>
        }
      />

      {/* ══ CAMERA VIEW ══ */}
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20, gap: 12 }}>
          {/* Camera */}
          <View collapsable={false} style={{ flex: 1, borderRadius: 12, overflow: "hidden", position: "relative" }}>
            <CameraView
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr"],
              }}
              enableTorch={torch}
            />
            {/* Scan overlay */}
            <View style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", flexDirection: "column" }} pointerEvents="box-none">
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} pointerEvents="none" />
              <View style={{ flexDirection: "row", height: 240, alignSelf: "center" }} pointerEvents="box-none">
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} pointerEvents="none" />

                {/* Scan frame (The Hole) */}
                <View style={{ width: 240, height: 240, position: "relative", alignItems: "center", justifyContent: "center", overflow: "hidden" }} pointerEvents="box-none">
                  {/* Animated scan line */}
                  {!scanned && !loading && (
                    <Animated.View
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: 3,
                        backgroundColor: c.line,
                        opacity: 0.9,
                        transform: [{ translateY: scanLineAnim }],
                      }}
                    />
                  )}

                  {/* Corner marks */}
                  {[
                    { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
                    { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
                    { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
                    { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },
                  ].map((s, i) => (
                    <View key={i} style={{ position: "absolute", width: 28, height: 28, borderColor: "#ffffff", ...s }} />
                  ))}

                  {loading && (
                    <View style={{ backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12, padding: 16, alignItems: "center" }}>
                      <ActivityIndicator size="large" color="#ffffff" />
                      <Text style={{ color: "#ffffff", marginTop: 8, fontSize: 14 }}>Looking it up…</Text>
                    </View>
                  )}
                </View>

                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} pointerEvents="none" />
              </View>

              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center" }} pointerEvents="none">
                <View style={{ marginTop: 20, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 8 }}>
                  <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "500" }}>Hold the barcode inside the frame</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Type the number, or search instead */}
          {showManualInput ? (
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <TextInput
                value={manualBarcode}
                onChangeText={setManualBarcode}
                placeholder="Barcode number"
                placeholderTextColor={c.steel}
                keyboardType="numeric"
                accessibilityLabel="Barcode number"
                autoFocus
                style={{ flex: 1, height: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: c.hairlineStrong, borderRadius: 8, fontSize: 17, color: c.ink, backgroundColor: c.canvas }}
              />
              <DsButton
                label="Look up"
                block={false}
                disabled={!manualBarcode}
                onPress={() => {
                  setShowManualInput(false);
                  handleBarcodeScanned({ type: "manual", data: manualBarcode });
                }}
              />
              <AnimatedButton
                onPress={() => setShowManualInput(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
              >
                <Feather name="x" size={20} color={c.ink} />
              </AnimatedButton>
            </View>
          ) : (
            <View className="flex-row" style={{ gap: 8 }}>
              <OutlineButton label="Type the number" icon="edit-2" onPress={() => setShowManualInput(true)} />
              <OutlineButton label="Search food" icon="search" onPress={() => router.push("/(home)/(meals)/search-meal")} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={problem !== null}
        variant="info"
        icon={problem === "slow" ? "wifi-off" : "search"}
        title={problem === "slow" ? "Taking too long" : "Product not found"}
        message={
          problem === "slow"
            ? "The connection is slow, so the product didn't load. You can try again or estimate the meal yourself."
            : "This product isn't in the barcode database yet. You can scan again or estimate its nutrition yourself."
        }
        cancelLabel="Try again"
        confirmLabel="Estimate"
        onCancel={() => {
          setProblem(null);
          resetScanner();
        }}
        onConfirm={() => {
          setProblem(null);
          resetScanner();
          router.push("/(home)/(meals)/estimate-meal");
        }}
      />
    </SafeAreaView>
  );
}
