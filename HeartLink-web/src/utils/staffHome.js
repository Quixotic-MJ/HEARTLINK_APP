export function staffHome(user) {
  if (user?.role !== "medical_expert") return "/dashboard";
  if (user?.expertType === "Dietitian") return "/foods";
  if (user?.expertType === "Physical Therapist") return "/exercises";
  return "/cases";
}
