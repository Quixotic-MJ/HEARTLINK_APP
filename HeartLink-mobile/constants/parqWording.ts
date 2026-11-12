/**
 * The official PAR-Q+ 2025 wording, shown inside the app (owner's choice, 2026-11-12; permission requested from the
 * PAR-Q+ Collaboration, eparmedx@gmail.com).
 *
 * HOW TO FILL THIS IN (a team member, not Claude):
 * 1. Open the official form: https://eparmedx.com/wp-content/uploads/2025/01/PARQPlus2025Fillable.pdf
 * 2. For each entry below, copy the exact words from the place named in its comment, between the quotes.
 *    Copy everything, including any note in brackets under a question, and change nothing: the form's terms are
 *    "use the entire questionnaire, NO changes". Leave out only a question's number (like "1)" or "3b."): the app
 *    shows the number itself.
 * 3. In the app, any empty entry shows "[PAR-Q+ wording missing: ...]"; missingParqWording() lists them.
 *
 * Until an entry is filled in, the app shows "PAR-Q+ wording missing" in its place, so a half-done form is obvious.
 * The question numbers match the server (backend/app/services/exercise_screening.py: PAGE_ONE, SECTIONS).
 */
export const PARQ_WORDING: Record<string, string> = {
  // ── Page 1 ─────────────────────────────────────────────────────────────────────
  title: "The Physical Activity Readiness Questionnaire for Everyone", // Page 1, the form's full title at the top
  intro: "The health benefits of regular physical activity are clear; more people should engage in physical activity every day of the week. Participating in physical activity is very safe for MOST people. This questionnaire will tell you whether it is necessary for you to seek further advice from your doctor OR a qualified exercise professional before becoming more physically active.", // Page 1, the paragraph under the title
  page1_instructions: "Please read the 7 questions below carefully and answer each one honestly: check YES or NO.", // Page 1, the line telling you to read the 7 questions and check YES or NO
  "p1.q1": "Has your doctor ever said that you have a heart condition OR high blood pressure?", // Page 1, question 1 (with its two condition names)
  "p1.q2": "Do you feel pain in your chest at rest, during your daily activities of living, OR when you do physical activity?", // Page 1, question 2
  "p1.q3": "Do you lose balance because of dizziness OR have you lost consciousness in the last 12 months? Please answer NO if your dizziness was associated with over-breathing (including during vigorous exercise).", // Page 1, question 3, and the note under it
  "p1.q4": "Have you ever been diagnosed with another chronic medical condition (other than heart disease or high blood pressure)?", // Page 1, question 4
  "p1.q4_list": "PLEASE LIST CONDITION(S) HERE:", // Page 1, the "list condition(s) here" label under question 4
  "p1.q5": "Are you currently taking prescribed medications for a chronic medical condition?", // Page 1, question 5
  "p1.q5_list": "PLEASE LIST CONDITION(S) AND MEDICATIONS HERE:", // Page 1, the "list condition(s) and medications here" label
  "p1.q6": "Do you currently have (or have had within the past 12 months) a bone, joint, or soft tissue (muscle, ligament, or tendon) problem that could be made worse by becoming more physically active? Please answer NO if you had a problem in the past, but it does not limit your current ability to be physically active.", // Page 1, question 6, and the note under it
  "p1.q6_list": "PLEASE LIST CONDITION(S) HERE:", // Page 1, the "list condition(s) here" label under question 6
  "p1.q7": "Has your doctor ever said that you should only do medically supervised physical activity?", // Page 1, question 7
  "p1.all_no": "If you answered NO to all of the questions above, you are cleared for physical activity. Please sign the PARTICIPANT DECLARATION. You do not need to complete Pages 2 and 3.\n• Start becoming much more physically active – start slowly and build up gradually.\n• Follow Global Physical Activity Guidelines for your age (https://www.who.int/publications/i/item/9789240015128).\n• You may take part in a health and fitness appraisal.\n• If you are over the age of 45 yr and NOT accustomed to regular vigorous to maximal effort exercise, consult a qualified exercise professional before engaging in this intensity of exercise.\n• If you have any further questions, contact a qualified exercise professional.", // Page 1, the box for when you answered NO to all questions (all its lines)
  "p1.any_yes": "If you answered YES to one or more of the questions above, COMPLETE PAGES 2 AND 3.", // Page 1, the line telling you to complete pages 2 and 3
  delay: "Delay becoming more active if:\n• You are currently experiencing a temporary illness, such as a cold or fever. It is best to wait until you feel better.\n• You are pregnant. In this case, talk with your health care practitioner, physician, qualified exercise professional, and/or complete the ePARmed-X+ at www.eparmedx.com before becoming more physically active.\n• Your health changes. Answer the questions on Pages 2 and 3 of this document and/or talk to your health care practitioner, physician, or qualified exercise professional before proceeding with any physical activity program.", // Page 1, the "Delay becoming more active if" box (all three points)

  // ── Pages 2 and 3: the follow-up questions about medical conditions ───────────────
  follow_up_title: "FOLLOW-UP QUESTIONS ABOUT YOUR MEDICAL CONDITION(S)", // Page 2, the heading over the follow-up questions
  "s1": "Do you have Arthritis, Osteoporosis, or Back Problems?", // Page 2, question 1 (the condition question)
  "s1.a": "Do you have difficulty controlling your condition with medications or other physician-prescribed therapies? (Answer NO if you are not currently taking medications or other treatments)", // Page 2, question 1a, with its note
  "s1.b": "Do you have joint problems causing pain, a recent fracture or fracture caused by osteoporosis or cancer, displaced vertebra (e.g., spondylolisthesis), and/or spondylolysis/pars defect (a crack in the bony ring on the back of the spinal column)?", // Page 2, question 1b
  "s1.c": "Have you had steroid injections or taken steroid tablets regularly for more than 3 months?", // Page 2, question 1c
  "s2": "Do you currently have Cancer of any kind?", // Page 2, question 2
  "s2.a": "Does your cancer diagnosis include any of the following types: lung/bronchogenic, multiple myeloma (cancer of plasma cells), head, and/or neck?", // Page 2, question 2a
  "s2.b": "Are you currently receiving cancer therapy (such as chemotheraphy or radiotherapy)?", // Page 2, question 2b
  "s3": "Do you have a Heart or Cardiovascular Condition? This includes Coronary Artery Disease, Heart Failure, Diagnosed Abnormality of Heart Rhythm", // Page 2, question 3
  "s3.a": "Do you have difficulty controlling your condition with medications or other physician-prescribed therapies? (Answer NO if you are not currently taking medications or other treatments)", // Page 2, question 3a, with its note
  "s3.b": "Do you have an irregular heart beat that requires medical management? (e.g., atrial fibrillation, premature ventricular contraction)", // Page 2, question 3b, with its example
  "s3.c": "Do you have chronic heart failure?", // Page 2, question 3c
  "s3.d": "Do you have diagnosed coronary artery (cardiovascular) disease and have not participated in regular physical activity in the last 2 months?", // Page 2, question 3d
  "s4": "Do you currently have High Blood Pressure?", // Page 2, question 4
  "s4.a": "Do you have difficulty controlling your condition with medications or other physician-prescribed therapies? (Answer NO if you are not currently taking medications or other treatments)", // Page 2, question 4a, with its note
  "s4.b": "Do you have a resting blood pressure equal to or greater than 160/90 mmHg with or without medication? (Answer YES if you do not know your resting blood pressure)", // Page 2, question 4b, with its note
  "s5": "Do you have any Metabolic Conditions? This includes Type 1 Diabetes, Type 2 Diabetes, Pre-Diabetes", // Page 2, question 5
  "s5.a": "Do you often have difficulty controlling your blood sugar levels with foods, medications, or other physician-prescribed therapies?", // Page 2, question 5a
  "s5.b": "Do you often suffer from signs and symptoms of low blood sugar (hypoglycemia) following exercise and/or during activities of daily living? Signs of hypoglycemia may include shakiness, nervousness, unusual irritability, abnormal sweating, dizziness or light-headedness, mental confusion, difficulty speaking, weakness, or sleepiness.", // Page 2, question 5b, with its list of signs
  "s5.c": "Do you have any signs or symptoms of diabetes complications such as heart or vascular disease and/or complications affecting your eyes, kidneys, OR the sensation in your toes and feet?", // Page 2, question 5c
  "s5.d": "Do you have other metabolic conditions (such as current pregnancy-related diabetes, chronic kidney disease, or liver problems)?", // Page 2, question 5d
  "s5.e": "Are you planning to engage in what for you is unusually high (or vigorous) intensity exercise in the near future?", // Page 2, question 5e
  "s6": "Do you have any Mental Health Problems or Learning Difficulties? This includes Alzheimer’s, Dementia, Depression, Anxiety Disorder, Eating Disorder, Psychotic Disorder, Intellectual Disability, Down Syndrome", // Page 3, question 6
  "s6.a": "Do you have difficulty controlling your condition with medications or other physician-prescribed therapies? (Answer NO if you are not currently taking medications or other treatments)", // Page 3, question 6a, with its note
  "s6.b": "Do you have Down Syndrome AND back problems affecting nerves or muscles?", // Page 3, question 6b
  "s7": "Do you have a Respiratory Disease? This includes Chronic Obstructive Pulmonary Disease, Asthma, Pulmonary High Blood Pressure", // Page 3, question 7
  "s7.a": "Do you have difficulty controlling your condition with medications or other physician-prescribed therapies? (Answer NO if you are not currently taking medications or other treatments)", // Page 3, question 7a, with its note
  "s7.b": "Has your doctor ever said your blood oxygen level is low at rest or during exercise and/or that you require supplemental oxygen therapy?", // Page 3, question 7b
  "s7.c": "If asthmatic, do you currently have symptoms of chest tightness, wheezing, laboured breathing, consistent cough (more than 2 days/week), or have you used your rescue medication more than twice in the last week?", // Page 3, question 7c
  "s7.d": "Has your doctor ever said you have high blood pressure in the blood vessels of your lungs?", // Page 3, question 7d
  "s8": "Do you have a Spinal Cord Injury? This includes Tetraplegia and Paraplegia", // Page 3, question 8
  "s8.a": "Do you have difficulty controlling your condition with medications or other physician-prescribed therapies? (Answer NO if you are not currently taking medications or other treatments)", // Page 3, question 8a, with its note
  "s8.b": "Do you commonly exhibit low resting blood pressure significant enough to cause dizziness, light-headedness, and/or fainting?", // Page 3, question 8b
  "s8.c": "Has your physician indicated that you exhibit sudden bouts of high blood pressure (known as Autonomic Dysreflexia)?", // Page 3, question 8c
  "s9": "Have you had a Stroke? This includes Transient Ischemic Attack (TIA) or Cerebrovascular Event", // Page 3, question 9
  "s9.a": "Do you have difficulty controlling your condition with medications or other physician-prescribed therapies? (Answer NO if you are not currently taking medications or other treatments)", // Page 3, question 9a, with its note
  "s9.b": "Do you have any impairment in walking or mobility?", // Page 3, question 9b
  "s9.c": "Have you experienced a stroke or impairment in nerves or muscles in the past 6 months?", // Page 3, question 9c
  "s10": "Do you have any other medical condition not listed above or do you have two or more medical conditions?", // Page 3, question 10
  "s10.a": "Have you experienced a blackout, fainted, or lost consciousness as a result of a head injury within the last 12 months OR have you had a diagnosed concussion within the last 12 months?", // Page 3, question 10a
  "s10.b": "Do you have a medical condition that is not listed (such as epilepsy, neurological conditions, kidney problems)?", // Page 3, question 10b
  "s10.c": "Do you currently live with two or more medical conditions?", // Page 3, question 10c
  conditions_list: "PLEASE LIST YOUR MEDICAL CONDITION(S) AND ANY RELATED MEDICATIONS HERE:", // Page 3, the "list your medical condition(s) and any related medications here" label

  // ── Page 4: recommendations and the declaration ───────────────────────────────────
  "p4.all_no": "If you answered NO to all of the FOLLOW-UP questions (pgs. 2-3) about your medical condition, you are ready to become more physically active - sign the PARTICIPANT DECLARATION below:\n• It is advised that you consult a qualified exercise professional to help you develop a safe and effective physical activity plan to meet your health needs.\n• You are encouraged to start slowly and build up gradually - 20 to 60 minutes of low to moderate intensity exercise, 3-5 days per week including aerobic and muscle strengthening exercises.\n• As you progress, you should aim to accumulate 150 minutes or more of moderate intensity physical activity per week.\n• If you are over the age of 45 yr and NOT accustomed to regular vigorous to maximal effort exercise, consult a qualified exercise professional before engaging in this intensity of exercise.", // Page 4, the box for when you answered NO to all follow-up questions (all its lines)
  "p4.any_yes": "If you answered YES to one or more of the follow-up questions about your medical condition:\nYou should seek further information before becoming more physically active or engaging in a fitness appraisal. You should complete the specially designed online screening and exercise recommendations program - the ePARmed-X+ at www.eparmedx.com and/or visit a qualified exercise professional to work through the ePARmed-X+ and for further information.", // Page 4, the box for when you answered YES to one or more follow-up questions (all its lines)
  "p4.delay": "Delay becoming more active if:\n• You are currently experiencing a temporary illness, such as a cold or fever. It is best to wait until you feel better.\n• You are pregnant. In this case, talk to your health care practitioner, physician, qualified exercise professional, and/or complete the ePARmed-X+ at www.eparmedx.com before becoming more physically active.\n• Your health changes. Talk to your health care practitioner, physician, or qualified exercise professional before continuing with any physical activity program.", // Page 4, the "Delay becoming more active if" box
  terms: "You are encouraged to photocopy the PAR-Q+. You must use the entire questionnaire and NO changes are permitted.\nThe authors, the PAR-Q+ Collaboration, partner organizations, and their agents assume no liability for persons who undertake physical activity and/or make use of the PAR-Q+ or ePARmed-X+. If in doubt after completing the questionnaire, consult your doctor prior to physical activity.", // Page 4, the lines about photocopying and liability
  declaration: "All persons who have completed the PAR-Q+ please read and sign the declaration below.\nIf you are less than the legal age required for consent or require the assent of a care provider, your parent, guardian or care provider must also sign this form.\nI, the undersigned, have read, understood to my full satisfaction and completed this questionnaire. I acknowledge that this physical activity clearance is valid for a maximum of 12 months from the date it is completed and becomes invalid if my condition changes. I also acknowledge that the community/fitness center may retain a copy of this form for records. In these instances, it will maintain the confidentiality of the same, complying with applicable law.", // Page 4, the participant declaration paragraph ("I, the undersigned, ...")
  copyright: "Copyright © 2025 PAR-Q+ Collaboration", // The copyright line at the foot of each page
};

/** Where an entry comes from, for the "wording missing" placeholder. */
const LOCATION: Record<string, string> = {
  title: "page 1, title",
  intro: "page 1, introduction",
  page1_instructions: "page 1, instructions",
  follow_up_title: "page 2, heading",
  conditions_list: "page 3, conditions list",
  delay: "page 1, delay box",
  "p4.delay": "page 4, delay box",
  terms: "page 4, terms",
  declaration: "page 4, declaration",
  copyright: "copyright line",
};

/** Tidies what copying from the PDF leaves behind (tabs where its checkboxes were, doubled or stray spaces) without
 * changing a word. Line breaks typed as \n stay. */
export function tidyParqText(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").replace(/ ([?.,:;)])/g, "$1").trim())
    .join("\n")
    .trim();
}

export function parqText(id: string): string {
  const text = PARQ_WORDING[id];
  if (text && text.trim()) return tidyParqText(text);
  const where = LOCATION[id] ?? id.replace("p1.", "page 1, ").replace("p4.", "page 4, ").replace(/^s(\d+)\.?/, "follow-up $1");
  return `[PAR-Q+ wording missing: ${where}]`;
}

/** The entries still empty, so the team can see what's left to copy in. */
export function missingParqWording(): string[] {
  return Object.keys(PARQ_WORDING).filter((id) => !PARQ_WORDING[id].trim());
}
