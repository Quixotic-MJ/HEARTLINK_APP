// ─── Philippine mobile numbers in "email or phone" fields ─────────────────────
// People type the same number in many ways: "0912 345 6789", "912-345-6789",
// "63 912 345 6789", "+63 912 345 6789". All of them mean +639123456789.

/** Only digits, spaces, dashes, dots, brackets and "+": the field holds a phone number, not an email. */
export const isPhoneLike = (value: string) => /^[+\d\s().-]+$/.test(value.trim()) && /\d/.test(value);

/** The 10 national digits ("9123456789"), with any "+63", "63" or "0" in front removed. */
export const nationalDigits = (value: string) => {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length > 10) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
};

/**
 * Formats a phone number as it is typed, keeping the prefix the person chose:
 * "09123456789" → "0912 345 6789", "+639123456789" → "+63 912 345 6789".
 * Emails (anything with letters or "@") are returned untouched. Never ends in a
 * space, so backspace always removes a digit.
 */
export const formatPhoneIdentifier = (text: string) => {
  if (!isPhoneLike(text)) return text;

  const hasPlus = text.trim().startsWith("+");
  let digits = text.replace(/\D/g, "");
  let lead = "";
  let joinLead = false;

  if (digits.startsWith("63")) {
    lead = hasPlus ? "+63" : "63";
    digits = digits.slice(2);
  } else if (hasPlus) {
    lead = "+";
    joinLead = true;
  } else if (digits.startsWith("0")) {
    lead = "0";
    joinLead = true;
    digits = digits.slice(1);
  }

  digits = digits.slice(0, 10);
  const groups = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean);

  if (!lead) return groups.join(" ");
  if (joinLead) {
    groups[0] = lead + (groups[0] ?? "");
    return groups.join(" ");
  }
  return [lead, ...groups].join(" ");
};

/** True when a phone-like value has a complete 10-digit Philippine mobile number. */
export const isCompletePhone = (value: string) => nationalDigits(value).length === 10;

/**
 * What to send to the server: phone numbers as "+639123456789" (the format accounts
 * are saved in), emails trimmed and lower-cased.
 */
export const normalizeIdentifier = (value: string) => {
  const trimmed = value.trim();
  if (isPhoneLike(trimmed)) return `+63${nationalDigits(trimmed)}`;
  return trimmed.toLowerCase();
};

