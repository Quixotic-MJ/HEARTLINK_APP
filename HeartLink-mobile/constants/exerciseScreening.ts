/**
 * HL-093: the pre-exercise safety check. HeartLink's own wording, pending the physiotherapist's review. Not PAR-Q+:
 * its questions can't be reproduced or changed without permission. The ids match the server's
 * (backend/app/services/exercise_screening.py). Any "yes" pauses active workouts and exercise suggestions.
 */
export const SCREENING_QUESTIONS = [
  { id: "heart_condition", text: "Has a doctor told you that you have a heart condition, or have you had a stroke?" },
  { id: "chest_pain", text: "Do you get chest pain, either when you're active or at rest?" },
  { id: "fainting", text: "In the past year, have you fainted or felt so dizzy that you nearly fell?" },
  { id: "doctor_limit", text: "Has a doctor told you to avoid exercise, or to exercise only with supervision?" },
  { id: "joint_problem", text: "Do you have a bone, joint or muscle problem that exercise could make worse?" },
] as const;

export type ScreeningQuestionId = (typeof SCREENING_QUESTIONS)[number]["id"];
export type ScreeningAnswers = Record<ScreeningQuestionId, boolean>;
export type ScreeningStatus = { answered: boolean; needs_assessment: boolean; cleared: boolean; paused: boolean };
