import React from "react";
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from "react-native-svg";

export default function HeartLogo({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Defs>
        <LinearGradient id="heartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#6EC1F5" />
          <Stop offset="100%" stopColor="#2E9AE8" />
        </LinearGradient>
      </Defs>

      {/* Heart shape */}
      <Path
        d="M256,410 C256,410 108,308 108,202 C108,148 150,106 204,106 C230,106 254,120 256,138 C258,120 282,106 308,106 C362,106 404,148 404,202 C404,308 256,410 256,410 Z"
        fill="url(#heartGrad)"
      />

      {/* Pulse / heartbeat line through the heart, in white for contrast */}
      <Path
        d="M150,246 L196,246 L216,196 L246,296 L276,216 L302,246 L362,246"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
