import React from "react";
import { View, ViewProps, Platform, StyleProp, ViewStyle } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useColorScheme } from "nativewind";

interface ScreenWrapperProps extends ViewProps {
  children: React.ReactNode;
  edges?: Edge[];
  withScrollView?: boolean;
  withKeyboardAvoidance?: boolean;
  contentContainerClassName?: string;
  scrollBounces?: boolean;
  safeAreaClassName?: string;
}

export function ScreenWrapper({
  children,
  edges = ["top", "bottom"], // Default to fully safe
  withScrollView = true,
  withKeyboardAvoidance = false,
  className = "",
  contentContainerClassName = "flex-grow px-6 pt-4 pb-8",
  scrollBounces = false,
  safeAreaClassName = "flex-1 bg-background",
  ...props
}: ScreenWrapperProps) {
  const { colorScheme } = useColorScheme();
  
  const content = withKeyboardAvoidance ? (
    <KeyboardAwareScrollView
      contentContainerClassName={contentContainerClassName}
      showsVerticalScrollIndicator={false}
      enableOnAndroid={true}
      extraScrollHeight={Platform.OS === "ios" ? 40 : 60}
      keyboardShouldPersistTaps="handled"
      bounces={scrollBounces}
      style={props.style}
    >
      {children}
    </KeyboardAwareScrollView>
  ) : withScrollView ? (
    <View className={contentContainerClassName} style={props.style}>
      {children}
    </View>
  ) : (
    <View className={`flex-1 ${className}`} style={props.style} {...props}>
      {children}
    </View>
  );

  return (
    <SafeAreaView className={safeAreaClassName} edges={edges}>
      <StatusBar 
        style={colorScheme === "dark" ? "light" : "dark"} 
        backgroundColor="transparent" 
        translucent={true} 
      />
      {content}
    </SafeAreaView>
  );
}
