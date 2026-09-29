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

## 2. Health Stability Score (HSS Scoring Engine)
**Where it's used:** The Main Dashboard pie chart.

**What it does:** 
It translates complex medical data (blood pressure, sleep, medicine, symptoms) into a single, easy-to-understand score out of 100.

**How it works (The Math):**
This is a **Composite Scoring Algorithm**. Every patient starts the day with a perfect baseline score of 100. As they log their daily activities, the engine deducts or adds points based on risk factors:

* **Formula snippet:** `HSS = 100 - (BP_Penalty) - (Symptom_Penalty) + (Mission_Bonus)`
* **Penalties:** 
  * If blood pressure is elevated: -15 points.
  * If they report severe chest pain: -30 points.
* **Bonuses:** 
  * If they complete a 15-minute exercise: +5 points.

**Example for Panelists:**
"Instead of forcing a non-medical user to interpret what '145 over 90' means, our Hybrid Scoring Engine automatically calculates the risk and outputs a simple score out of 100. If the score drops below 50, the pie chart turns red to warn them."

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