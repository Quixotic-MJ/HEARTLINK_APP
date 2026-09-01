import React from "react";
import Svg, { Path } from "react-native-svg";

interface HeartLogoProps {
  size?: number;
}

export default function HeartLogo({ size = 20 }: HeartLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Left facet (Warm Coral Orange-Red #F66127) */}
      <Path
        d="M50 86 C48.5 84 12 55 12 32 C12 18 23 8 36 8 C43.5 8 48 13 50 18.5 L50 86 Z"
        fill="#F66127"
      />
      {/* Right facet (Deep Vibrant Red #D82A1E) */}
      <Path
        d="M50 18.5 C52 13 56.5 8 64 8 C77 8 88 18 88 32 C88 55 51.5 84 50 86 L50 18.5 Z"
        fill="#D82A1E"
      />
    </Svg>
  );
}
