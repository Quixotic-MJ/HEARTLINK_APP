import React from "react";
import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PASSWORD_RULES } from "../../lib/passwordRules";
import { useDs } from "../onboarding/useDs";

/** The password rules as tags under a new-password field, each turning green once it is met. */
export default function PasswordRuleTags({ password }: { password: string }) {
  const { c } = useDs();
  const rulesMet = PASSWORD_RULES.filter((rule) => rule.test(password)).length;

  return (
    <View
      className="flex-row flex-wrap"
      style={{ gap: 6, marginTop: 10 }}
      accessible={true}
      accessibilityLabel={`Password rules, ${rulesMet} of ${PASSWORD_RULES.length} met. ${PASSWORD_RULES.map(
        (rule) => `${rule.label}: ${rule.test(password) ? "met" : "not met"}`
      ).join(". ")}.`}
    >
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <View
            key={rule.label}
            className="flex-row items-center"
            style={{
              gap: 5,
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: met ? c.mint : c.surfaceAlt,
              borderWidth: 1,
              borderColor: c.hairline,
            }}
          >
            {met ? (
              <Feather name="check-circle" size={12} color={c.success} />
            ) : (
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: c.steel, marginHorizontal: 3 }} />
            )}
            <Text style={{ fontSize: 12.5, fontWeight: "600", color: met ? c.charcoal : c.slate }}>{rule.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
