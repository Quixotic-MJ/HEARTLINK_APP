import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useColorScheme } from 'nativewind';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OfflineSyncService } from '../utils/OfflineSyncService';

export default function OfflineBanner() {
  const netInfo = useNetInfo();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  
  const [slideAnim] = useState(new Animated.Value(-100));
  const prevOffline = useRef<boolean | null>(null);

  const isOffline = netInfo.type !== 'unknown' && netInfo.isInternetReachable === false;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOffline ? 0 : -100,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();

    // Trigger queue sync when reconnecting
    if (prevOffline.current === true && isOffline === false) {
      console.log("[OfflineBanner] Reconnected to internet! Triggering queue process...");
      OfflineSyncService.processQueue();
    }
    prevOffline.current = isOffline;
  }, [isOffline]);

  if (!isOffline && slideAnim.constructor.name === "AnimatedValue" /* simple check to unmount? No, let's keep it mounted and transform it out of view */) {
    // We can just keep it absolutely positioned and animated out
  }

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        transform: [{ translateY: slideAnim }],
        backgroundColor: isDark ? '#9A3412' : '#F59E0B',
        paddingTop: insets.top, // pad for notch
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 8 }}>
        <Feather name="wifi-off" size={14} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>
          No internet connection
        </Text>
      </View>
    </Animated.View>
  );
}
