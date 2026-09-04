import React from "react";
import Svg, { Path } from "react-native-svg";

// Same path data as the web favicon/icon mark — keep these in sync if either changes.
export default function HeartLogo({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50 90 C50 90 8 54 8 30 C8 14 21 4 36 4 C44 4 50 11 50 18 L50 90 Z" fill="#E8532E" />
      <Path d="M50 90 C50 90 92 54 92 30 C92 14 79 4 64 4 C56 4 50 11 50 18 L50 90 Z" fill="#8A1F1A" />
    </Svg>
  );
}
