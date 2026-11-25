// HL-168 (panel revision): "About this person" on a case, written as plain sentences for experts who aren't technical.
// Everything comes from the case as it was when it was picked (the server's "about" block and "patient").

import { shortDate } from "./reviewFlow.js";

const CONDITIONS = {
  heart_disease: "heart disease",
  stroke: "a stroke or mini-stroke",
  kidney_disease: "kidney disease",
  pregnancy: "pregnancy",
};

const joinWords = (words) =>
  words.length <= 1 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;

const TIMES = ["", "once", "twice"];
const times = (n) => TIMES[n] || `${n} times`;

export function personLine(patient) {
  const p = patient || {};
  const sex = p.sex === "female" ? "woman" : p.sex === "male" ? "man" : "person";
  const first = p.age != null ? `${p.age}-year-old ${sex}` : `A ${sex} (age not given)`;
  return [first, p.height_cm ? `${p.height_cm} cm` : null, p.weight_kg ? `${p.weight_kg} kg` : null]
    .filter(Boolean)
    .join(", ") + ".";
}

function yesNo(value, yes, no, unknown) {
  if (value === true) return yes;
  if (value === false) return no;
  return unknown;
}

export function medicineLine(about) {
  const a = about || {};
  const smoking = { now: "Smokes now.", "used to": "Used to smoke.", never: "Never smoked." }[a.smoking] || "Smoking: not answered.";
  return [
    yesNo(a.bp_medicine, "Takes blood pressure medicine.", "No blood pressure medicine.", "Blood pressure medicine: not answered."),
    yesNo(a.diabetes, "Has diabetes.", "No diabetes.", "Diabetes: not answered."),
    yesNo(a.cholesterol_medicine, "Takes cholesterol medicine.", "No cholesterol medicine.", "Cholesterol medicine: not answered."),
    smoking,
  ].join(" ");
}

export function labLines(about) {
  const labs = about?.labs || [];
  if (!labs.length) return ["No lab results."];
  return labs.map((lab) => {
    const when = shortDate(lab.test_date);
    const on = when ? ` (${when})` : "";
    if (lab.kind === "cholesterol") {
      const parts = [
        lab.total_cholesterol != null ? `total ${lab.total_cholesterol}` : null,
        lab.hdl != null ? `HDL ${lab.hdl}` : null,
        lab.ldl != null ? `LDL ${lab.ldl}` : null,
      ].filter(Boolean);
      return `Cholesterol test${on}: ${parts.join(", ") || "no numbers"} mg/dL.`;
    }
    if (lab.kind === "kidney") {
      if (lab.egfr != null) return `Kidney test${on}: eGFR ${lab.egfr}.`;
      return `Kidney test${on}: creatinine ${lab.creatinine ?? "not given"} mg/dL.`;
    }
    if (lab.kind === "blood_sugar") {
      const parts = [
        lab.fasting_glucose != null ? `fasting ${lab.fasting_glucose} mg/dL` : null,
        lab.hba1c != null ? `HbA1c ${lab.hba1c}%` : null,
      ].filter(Boolean);
      return `Blood sugar test${on}: ${parts.join(", ") || "no numbers"}.`;
    }
    return `Lab test${on}.`;
  });
}

export function bloodPressureLine(about) {
  const bp = about?.blood_pressure;
  if (!bp) return "No blood pressure readings in the last 30 days.";
  const count = bp.readings === 1 ? "1 reading" : `${bp.readings} readings`;
  return `Blood pressure, last 30 days: ${count}, average ${bp.average}, highest ${bp.highest}.`;
}

export function symptomsLine(about) {
  const entries = Object.entries(about?.symptoms || {});
  if (!entries.length) return "No symptoms logged.";
  return `Symptoms: ${entries.map(([name, n]) => `${name.toLowerCase()} ${times(n)}`).join(", ")}.`;
}

/** The health check (HL-164) in one sentence, and whether the case should be flagged. */
export function healthCheckView(about) {
  const hc = about?.health_check;
  if (!hc || !hc.asked) {
    return { text: "Not asked. This person set up HeartLink before the health check was added (Nov 23, 2026).", flag: false };
  }
  if (!hc.conditions?.length) return { text: "None of the conditions HeartLink isn't made for.", flag: false };
  const list = joinWords(hc.conditions.map((c) => CONDITIONS[c] || c));
  const ok = hc.doctor_cleared
    ? "Says their doctor said OK to use HeartLink (HeartLink can't check this)."
    : "Didn't say their doctor said OK.";
  return { text: `Ticked ${list}. ${ok}`, flag: true };
}

export const CONDITION_NOTE =
  "HeartLink isn't made for this condition, so its advice may not fit this person. Think about leaving this case out of the dataset.";
