# HeartLink: Computations & Formulas Defense Guide
*A simplified cheat sheet for explaining the mathematical formulas and scoring algorithms used in the app.*

---

## 1. The Haversine Formula (GPS Distance Calculation)
**Where it's used:** The Clinic & Emergency Locator screen.

**What it does:** 
It calculates the exact straight-line distance between the patient's phone and a hospital.

**How it works (The Math):**
You can't just draw a flat line between two GPS points because the Earth is a sphere. The **Haversine Formula** uses trigonometry (sines and cosines) to calculate the distance *across the curve of the Earth*.

* **Formula snippet:** `a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)`
* **In Simple Terms:** The app takes the user's Latitude and Longitude, compares it to the clinic's Latitude and Longitude, applies the curve of the Earth (radius of 6,371 km), and spits out the exact distance in kilometers.

**Example for Panelists:**
"If a patient is in downtown Cebu and searches for a clinic, our app grabs their live GPS coordinates and runs the Haversine mathematical formula against every clinic in our database to find the closest one, factoring in the curvature of the Earth for accuracy."

---

## 2. Health Stability Score (The HSS Engine)
**Where it's used:** The Main Dashboard and overall patient health status.

**What it does:** 
It translates complex medical data into a single, easy-to-understand score from 1 to 100, which assigns the user into one of four risk tiers (Stable, Moderate, Elevated Risk, Critical).

**How it works (The Math & Algorithm):**
The app uses a 3-phase Hybrid Algorithm:

1. **Phase 1 (Machine Learning Baseline):** When a user onboards, their data (age, weight, smoking, conditions) is processed by a Logistic Regression model trained on real-world medical data. It predicts cardiovascular risk probability, which is mathematically inverted into a baseline score out of 100.
2. **Phase 2 (Vitals Algorithm):** When the user logs blood pressure (BP) and heart rate (HR), the system uses strict clinical guidelines (AHA/ACC). For example, a BP of 120/80 sets the base score to 78, while a Hypertensive Crisis (>=180/120) drops the score down to 25. High heart rates (tachycardia) deduct up to 8 points, unless the user indicates they just exercised.
3. **Phase 3 (Daily Lifestyle Composite):** Every day, the engine looks at the user's daily habits and applies a **maximum variance of +/- 20 points** to their score:
   * **Diet (Algorithm):** High sodium (>800mg) subtracts 3 points; low sodium (<140mg) adds 2 points.
   * **Exercise (Math):** `(Duration / 10) * Intensity Multiplier` (Vigorous exercise yields a 3x multiplier).
   * **Sleep (Logic):** Optimal sleep (7-9 hrs) gives +3 points. Too little (<5 hrs) or too much (>11 hrs) gives a -2 penalty.
   * **Clinical Warnings (Logic):** Severe symptoms (chest pain) deduct 10 points. Rapid, sudden weight gain (a clinical sign of fluid retention in heart failure) deducts 15 points.

**Example for Panelists:**
"Our Health Stability Score doesn't just guess. It uses Machine Learning to figure out the user's baseline, and then adjusts that baseline daily using hard medical mathematics. If a user logs a dangerously high blood pressure or eats way too much sodium, the algorithm calculates those penalties and updates their health tier instantly."

---

## 3. Blood Pressure Rule-Based Thresholds
**Where it's used:** The Daily Vitals Logger.

**What it does:** 
It checks if the patient's blood pressure is in a dangerous zone.

**How it works (The Math):**
This uses **Rule-Based Decision Logic** built on standard medical guidelines (like the AHA guidelines). It uses strict "If/Then" mathematical operators (`<`, `>`, `>=`).

* **Formula logic:**
  * **Normal:** Systolic < 120 AND Diastolic < 80
  * **Hypertension Stage 2:** Systolic >= 140 OR Diastolic >= 90
  * **Hypertensive Crisis:** Systolic >= 180 OR Diastolic >= 120
  * **Severe Hypotension (Too low):** Systolic < 90 OR Diastolic < 60

**Example for Panelists:**
"When the user types in their blood pressure, our Business Logic runs it through an 'If/Then' rule engine. If the math detects that `Systolic >= 180`, the app instantly triggers a full-screen Hypertensive Crisis warning."

---

## 4. Dietary Math & Portion Multipliers
**Where it's used:** The Recipe Logger & Barcode Scanner.

**What it does:** 
It recalculates nutrition facts on the fly when a patient eats more or less than a standard serving.

**How it works (The Math):**
This is a dynamic multiplier function. The database stores the raw base value (e.g., Sodium per 1 Serving). The user inputs how many servings they ate.

* **Formula:** `Total Sodium = (Base Sodium) * (Serving Size Multiplier)`
* **Example:** If a bowl of soup has 400mg of sodium per serving, and the user taps the `+` button to eat 1.5 servings.
* `Total Sodium = 400mg * 1.5 = 600mg`.

**Example for Panelists:**
"Our app doesn't just display static text. If a user eats 2.5 servings of a meal, our system uses a real-time multiplier formula to calculate the exact amount of sodium they ingested, and then subtracts that from their strict daily limit."

---

## 5. Smart Recommendation Engine
**Where it's used:** The Dashboard Feed (suggested recipes and exercises).

**What it does:** 
It dynamically curates and filters content to act as a digital health coach, ensuring the user only sees meals and workouts that are safe for their current heart condition and allergies.

**How it works (The Algorithm):**
The Recommendation Engine relies on Context-Aware Filtering and Dynamic Budget Prioritization:

1. **HSS Tier Filtering:** A recipe or exercise is mathematically blocked from appearing unless it is rated "Stable" (universally safe) or matches the user's specific real-time HSS Tier (e.g., Elevated Risk).
2. **Allergy & Diet Safeguards (Boolean Logic):** The engine cross-references recipe tags against the user's onboarding profile. If `recipe_tags CONTAINS user_allergy`, the item is completely stripped from the feed.
3. **Dynamic Sodium Budgeting (Sorting Algorithm):** 
   * The app calculates: `Remaining_Sodium = Daily_Limit - Consumed_Sodium_Today`
   * **If `Remaining_Sodium < 500mg`**: The user is entering a high-risk zone for the day. The algorithm intercepts the feed and completely re-sorts all recipes. It prioritizes (pushes to the top) only the absolute lowest-sodium meals that have been explicitly flagged as "Expert Validated."
4. **De-Duplication:** The engine filters out `Item ID`s that exist in today's activity logs so the user doesn't get recommended a workout they already completed an hour ago.

**Example for Panelists:**
"Our recommendation feed is smart. If the app detects that a patient has eaten 1,700mg of their 2,000mg daily sodium limit, the algorithm automatically recalculates their remaining budget. Since they have less than 500mg left, the algorithm immediately re-sorts the dashboard feed to push ultra-low sodium, expert-verified dinners to the very top, helping prevent a hypertensive spike."