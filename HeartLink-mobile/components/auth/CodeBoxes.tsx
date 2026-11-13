import React, { useRef, useState } from "react";
import { View, TextInput, Platform, NativeSyntheticEvent, TextInputKeyPressEventData } from "react-native";
import { useDs } from "../onboarding/useDs";

export const CODE_LENGTH = 6;

interface Props {
  /** One digit (or "") per box */
  digits: string[];
  onChange: (digits: string[]) => void;
  hasError?: boolean;
  editable?: boolean;
  autoFocus?: boolean;
}

/** Six boxes for an emailed code. A whole code pasted or filled in from the email spreads across the boxes. */
export default function CodeBoxes({ digits, onChange, hasError = false, editable = true, autoFocus = true }: Props) {
  const { c } = useDs();
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(autoFocus ? 0 : null);

  const handleChange = (value: string, index: number) => {
    const typed = value.replace(/\D/g, "");
    if (typed.length >= CODE_LENGTH) {
      onChange(typed.slice(0, CODE_LENGTH).split(""));
      inputRefs.current[CODE_LENGTH - 1]?.focus();
      return;
    }
    // Typing over a filled box keeps only the newest digit
    const digit = typed.slice(-1);
    const next = [...digits];
    next[index] = digit;
    onChange(next);
    if (digit !== "" && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === "Backspace" && digits[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {digits.map((digit, index) => {
        const isFocused = focusedIndex === index;
        return (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            value={digit}
            onChangeText={(v) => handleChange(v, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex((current) => (current === index ? null : current))}
            autoFocus={autoFocus && index === 0}
            keyboardType="number-pad"
            // The first box takes a whole code from autofill or paste
            maxLength={index === 0 ? CODE_LENGTH : 2}
            textContentType={index === 0 ? "oneTimeCode" : "none"}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            selectTextOnFocus
            editable={editable}
            accessibilityLabel={`Code digit ${index + 1} of ${CODE_LENGTH}`}
            style={{
              flex: 1,
              height: 56,
              borderRadius: 10,
              textAlign: "center",
              fontSize: 24,
              fontWeight: "700",
              color: c.ink,
              padding: 0,
              backgroundColor: hasError ? c.rose : isFocused ? c.tint : digit ? c.surfaceAlt : c.canvas,
              borderWidth: isFocused || hasError ? 2 : 1.5,
              borderColor: hasError ? c.danger : isFocused ? c.primary : digit ? c.hairlineStrong : c.hairline,
              textAlignVertical: "center",
              ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
            }}
          />
        );
      })}
    </View>
  );
}
