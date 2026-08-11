import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import YoutubePlayer from "react-native-youtube-iframe";
import { Colors } from "../../constants/theme";

const { width } = Dimensions.get("window");

export interface ExerciseActiveProps {
  routine: any;
  onFinish: () => void;
  onClose: () => void;
  onSymptoms: () => void;
}

function getYoutubeVideoId(url: string) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
}

export function ExerciseActive({
  routine,
  onFinish,
  onClose,
  onSymptoms
}: ExerciseActiveProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const activeBg = Colors[isDark ? "dark" : "light"].tint;

  const hasVideo = !!routine.videoUrl;
  const guideImages = Array.isArray(routine.guideImages) && routine.guideImages.length > 0 
    ? routine.guideImages 
    : (routine.image ? [routine.image] : []);
  const hasGuide = guideImages.length > 0;
  
  const [activeTab, setActiveTab] = useState<"Guide" | "Video">(hasGuide ? "Guide" : "Video");
  const [videoFailed, setVideoFailed] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [containerWidth, setContainerWidth] = useState(width - 40);

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentImageIndex(Math.round(index));
  };

  const renderMedia = () => {
    if (activeTab === "Video" && hasVideo && !videoFailed) {
      const videoId = getYoutubeVideoId(routine.videoUrl);
      if (videoId) {
        return (
          <View 
            style={{ width: containerWidth, aspectRatio: 16 / 9, backgroundColor: "#0f172a" }}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          >
            <YoutubePlayer
              height={containerWidth * (9 / 16)}
              width={containerWidth}
              play={true}
              videoId={videoId}
              onError={() => setTimeout(() => setVideoFailed(true), 0)}
              initialPlayerParams={{ controls: false, modestbranding: true }}
            />
          </View>
        );
      }
    }

    if ((activeTab === "Guide" || videoFailed) && hasGuide) {
      return (
        <View 
          className="w-full relative bg-slate-100 dark:bg-slate-800" 
          style={{ aspectRatio: 16 / 9 }}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            className="w-full h-full"
          >
            {guideImages.map((img: string, idx: number) => (
              <View key={idx} style={{ width: containerWidth, aspectRatio: 16 / 9 }} className="overflow-hidden">
                <Image 
                  source={{ uri: img }} 
                  className="absolute inset-0 w-full h-full" 
                  resizeMode="cover"
                />
                <View className="absolute inset-0 bg-slate-900/10" />
              </View>
            ))}
          </ScrollView>
          
          {/* Pagination Indicator */}
          {guideImages.length > 1 && (
            <View className="absolute bottom-3 left-0 right-0 flex-row justify-center items-center gap-1.5">
              <View className="bg-black/50 px-3 py-1 rounded-full">
                <Text className="text-white text-[11px] font-bold tracking-widest">
                  {currentImageIndex + 1} / {guideImages.length}
                </Text>
              </View>
            </View>
          )}
        </View>
      );
    }

    return (
      <View className="w-full items-center justify-center bg-slate-100 dark:bg-slate-800" style={{ aspectRatio: 16 / 9 }}>
        <Feather name="image" size={32} color={isDark ? "#475569" : "#cbd5e1"} className="mb-2" />
        <Text className="text-slate-400 font-medium text-[13px] tracking-wide uppercase">Visuals Unavailable</Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* HEADER SECTION */}
      <View 
        className="w-full relative" 
        style={{ 
          paddingTop: Math.max(insets.top, 10), 
          paddingBottom: 24,
          backgroundColor: isDark ? "#0f172a" : "#1e293b" 
        }}
      >
        <View className="flex-row items-center px-4">
           {/* Close Button */}
           <TouchableOpacity 
             onPress={onClose} 
             className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
           >
             <Feather name="x" size={22} color="#fff" />
           </TouchableOpacity>
           
           {/* Title */}
           <View className="flex-1 px-4 items-center">
             <Text 
               className="text-white font-semibold text-[17px] text-center" 
               numberOfLines={2}
               adjustsFontSizeToFit
               minimumFontScale={0.8}
             >
               {routine.title}
             </Text>
           </View>
           
           {/* Spacer */}
           <View className="w-10 h-10" />
        </View>
      </View>

      {/* MAIN CONTENT CARD */}
      <View className="flex-1 bg-white dark:bg-slate-900 rounded-t-3xl -mt-5 shadow-sm relative overflow-hidden">
        
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pt-8 pb-56">
          
          {hasVideo && hasGuide && (
            <View className="flex-row items-center justify-center mb-5 gap-12">
              <TouchableOpacity onPress={() => setActiveTab("Guide")} className="items-center">
                <Text className={`text-[15px] font-bold mb-1.5 ${activeTab === "Guide" ? "" : "text-slate-400 dark:text-slate-500"}`} style={activeTab === "Guide" ? { color: activeBg } : {}}>GUIDE</Text>
                {activeTab === "Guide" && <View className="h-0.5 w-6 rounded-full" style={{ backgroundColor: activeBg }} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab("Video")} className="items-center">
                <Text className={`text-[15px] font-bold mb-1.5 ${activeTab === "Video" ? "" : "text-slate-400 dark:text-slate-500"}`} style={activeTab === "Video" ? { color: activeBg } : {}}>VIDEO</Text>
                {activeTab === "Video" && <View className="h-0.5 w-6 rounded-full" style={{ backgroundColor: activeBg }} />}
              </TouchableOpacity>
            </View>
          )}

          <View className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden mb-8" style={{ aspectRatio: 16 / 9 }}>
            {renderMedia()}
          </View>

          <View className="mb-8">
            <Text className="text-[28px] font-black text-slate-900 dark:text-white mb-2">{routine.title}</Text>
            {routine.goal ? (
              <Text className="text-[16px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {routine.goal}
              </Text>
            ) : null}
          </View>

          <View className="mb-6">
            <Text className="text-[14px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
              How to Perform
            </Text>
            
            <View className="gap-y-6">
              {routine.steps && routine.steps.map((step: any, idx: number) => (
                <View key={idx} className="flex-row">
                  <View className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mr-4 mt-1">
                    <Text className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{idx + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[17px] font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                      {typeof step === 'string' ? step.trim() : (step.instruction || '').trim()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

        </ScrollView>

        {/* BOTTOM ACTIONS */}
        <View 
          className="absolute bottom-0 w-full bg-white/95 dark:bg-slate-900/95 items-center justify-center" 
          style={{ paddingBottom: Math.max(insets.bottom, 20), paddingTop: 16, paddingHorizontal: 20 }}
        >
          {/* Primary Action */}
          <TouchableOpacity 
            onPress={onFinish} 
            className="w-full py-4 mb-3 rounded-xl items-center justify-center shadow-sm" 
            style={{ backgroundColor: activeBg }}
          >
            <Text className="text-[16px] font-bold text-white tracking-wide">
              FINISH EXERCISE
            </Text>
          </TouchableOpacity>

          {/* Secondary Safety Escape Hatch */}
          <TouchableOpacity onPress={onSymptoms} className="py-2 px-4 mb-2">
            <Text className="text-[14px] font-semibold text-slate-400 dark:text-slate-500 underline">
              Feeling unwell?
            </Text>
          </TouchableOpacity>
          
        </View>
      </View>
    </View>
  );
}
