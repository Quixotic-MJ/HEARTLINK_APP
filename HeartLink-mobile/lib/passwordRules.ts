// The password rules for a new password (sign-up and reset), shown as tags that turn green as each is met.
// The server checks length, a number and a symbol too (backend/app/utils/password_policy.py).

export const PASSWORD_RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: "16+ characters", test: (pw) => pw.length >= 16 },
  { label: "Upper & lowercase", test: (pw) => /[A-Z]/.test(pw) && /[a-z]/.test(pw) },
  { label: "A number", test: (pw) => /\d/.test(pw) },
  { label: "A symbol (! # $)", test: (pw) => /[^A-Za-z0-9\s]/.test(pw) },
];

export const meetsPasswordRules = (pw: string) => PASSWORD_RULES.every((rule) => rule.test(pw));
