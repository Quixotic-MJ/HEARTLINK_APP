// HL-168 (panel revision): case review as one clear flow. An admin picks this week's random sample, the three experts
// check each case, the Cardiologist approves it for the dataset, and Model Check shows the results. Nobody monitors
// users here, and nothing is sent to them.

export const PURPOSE =
  "Experts check HeartLink's advice on a random sample of users. Their answers become the research dataset. Nobody here monitors users, and nothing is sent to them.";

export const STEPS = [
  { key: "pick", number: 1, label: "Pick", hint: "picked" },
  { key: "check", number: 2, label: "Check", hint: "being checked" },
  { key: "approve", number: 3, label: "Approve", hint: "waiting for approval" },
  { key: "results", number: 4, label: "Results", hint: "in the dataset" },
];

/** The count on each step, from the server's summary. */
export function stepCounts(steps) {
  const s = steps || {};
  return { pick: s.picked ?? 0, check: s.check ?? 0, approve: s.approve ?? 0, results: s.approved ?? 0 };
}

/** The cases a step shows. "Pick" shows every case picked; "Results" shows the finished ones. */
export function casesForStep(items, step) {
  if (step === "check") return items.filter((i) => i.stage === "check");
  if (step === "approve") return items.filter((i) => i.stage === "approve");
  if (step === "results") return items.filter((i) => i.stage === "done");
  return items;
}

/** Whether this case waits for the signed-in expert. The Cardiologist also approves finished cases. */
export function isMyTurn(item, section) {
  if (!section) return false;
  if (item.sections?.[section] === "waiting") return true;
  return section === "cardiology" && item.stage === "approve";
}

/** Where a case is, in plain words. */
export function stageLabel(item) {
  if (item.stage === "check") return "Being checked";
  if (item.stage === "approve") return "Waiting for approval";
  if (item.outcome === "approved") return "In the dataset";
  if (item.outcome === "left_out") return "Left out";
  if (item.outcome === "practice") return "Practice review (not used)";
  return "Finished";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDate(iso) {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : null;
}

export function lastPickedText(iso) {
  const day = shortDate(iso);
  return day ? `Last picked ${day}` : "No cases picked yet";
}

/** "3 cases are waiting for you." */
export function waitingForYou(count) {
  if (!count) return "Nothing is waiting for you right now.";
  return count === 1 ? "1 case is waiting for you." : `${count} cases are waiting for you.`;
}

/** The three points of the first-time help, for the signed-in person. */
export function helpPoints(section, isAdmin) {
  if (section === "cardiology") {
    return [
      "Read \"About this person\": their answers, medicines, lab results and readings.",
      "Answer 4 short questions: how likely a heart attack or stroke is, why, how sure you are, and whether you'd advise a checkup.",
      "Submit. When the Dietitian and the Physical Therapist have answered too, approve the case for the dataset or leave it out.",
    ];
  }
  if (section === "nutrition") {
    return [
      "Read \"About this person\": their answers, diet and meals.",
      "For each recipe the app suggests, say whether you'd suggest it to this person.",
      "Check your answers and submit.",
    ];
  }
  if (section === "exercise") {
    return [
      "Read \"About this person\": their answers, exercise safety check and activity.",
      "For each exercise the app suggests, say whether it suits this person.",
      "Check your answers and submit.",
    ];
  }
  if (isAdmin) {
    return [
      "Pick this week's cases: up to 5 random users from each heart risk level.",
      "The Cardiologist, the Dietitian and the Physical Therapist each answer their part.",
      "The Cardiologist approves finished cases for the dataset. Model Check shows the results.",
    ];
  }
  return [
    "Your account has no expert type yet, so you can read cases but not answer them.",
    "Ask an admin to set your expert type in Accounts & Staff.",
    "Names and contact details are always hidden.",
  ];
}
