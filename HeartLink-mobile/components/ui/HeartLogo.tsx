import React from "react";
import Svg, { Defs, LinearGradient, Stop, G, Path } from "react-native-svg";
import { hues } from "../../constants/theme";

export default function HeartLogo({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="-132 -132 264 264" accessibilityRole="image" aria-label="HeartLink icon">
      <Defs>
        <LinearGradient id="hl-topright" gradientUnits="userSpaceOnUse" x1="0" y1="-122" x2="0" y2="30">
          <Stop offset="0" stopColor={hues.blue} />
          <Stop offset="0.30" stopColor={hues.blue} />
          <Stop offset="0.52" stopColor={hues.teal} />
          <Stop offset="0.68" stopColor={hues.success} />
          <Stop offset="0.81" stopColor={hues.lime} />
          <Stop offset="0.91" stopColor={hues.warning} />
          <Stop offset="1" stopColor={hues.warning} />
        </LinearGradient>
        <LinearGradient id="hl-bottomleft" gradientUnits="userSpaceOnUse" x1="0" y1="-30" x2="0" y2="122">
          <Stop offset="0" stopColor={hues.blue} />
          <Stop offset="0.45" stopColor={hues.blue} />
          <Stop offset="0.62" stopColor={hues.sky} />
          <Stop offset="0.78" stopColor={hues.teal} />
          <Stop offset="1" stopColor={hues.success} />
        </LinearGradient>
        <LinearGradient id="hl-bottomright" gradientUnits="userSpaceOnUse" x1="122" y1="0" x2="-32" y2="0">
          <Stop offset="0" stopColor={hues.success} />
          <Stop offset="0.30" stopColor={hues.lime} />
          <Stop offset="0.50" stopColor={hues.lime} />
          <Stop offset="0.70" stopColor={hues.lime} />
          <Stop offset="0.85" stopColor={hues.warning} />
          <Stop offset="1" stopColor={hues.warning} />
        </LinearGradient>
      </Defs>
      <G fill="none" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M -79.20,-25.46 L -96.17,-42.43 A 38 38 0 0 1 -42.43,-96.17 L 28.28,-25.46" stroke={hues.danger}/>
        <Path d="M 25.46,-79.20 L 42.43,-96.17 A 38 38 0 0 1 96.17,-42.43 L 25.46,28.28" stroke="url(#hl-topright)"/>
        <Path d="M -25.46,79.20 L -42.43,96.17 A 38 38 0 0 1 -96.17,42.43 L -25.46,-28.28" stroke="url(#hl-bottomleft)"/>
        <Path d="M 79.20,25.46 L 96.17,42.43 A 38 38 0 0 1 42.43,96.17 L -28.28,25.46" stroke="url(#hl-bottomright)"/>
      </G>
    </Svg>
  );
}
