# HeartLink: Input-Process-Output (IPO) Defense Guide
*A simplified guide to help you answer panelist questions about how data moves through the app.*

---

## 1. App Launch & Offline Sync
**Input:** 
* Data saved on the phone locally (because there was no internet earlier).
* The phone's current internet connection status.

**Process (Business Logic):** 
* The system checks if the connection is restored.
* If yes, it quietly bundles all the offline logs and pushes them to the cloud database in the background without interrupting the user.

**Output:** 
* The cloud database is updated.
* The user sees the main Dashboard with fully synced, up-to-date information.

---

## 2. Account Registration
**Input:** 
* User's raw details (Name, email, phone number, and a new password).

**Process (Business Logic):** 
* The system checks the database to ensure the email and phone number aren't duplicates.
* It encrypts the password so it's safely hidden in the database.

**Output:** 
* A new, secure user account is created.
* The user is automatically logged in and routed to the Setup screen.

---

## 3. Baseline Setup (Initial Assessment)
**Input:** 
* The user's age, gender, exact medical conditions (e.g., Hypertension), and recent blood pressure readings.

**Process (Rule-Based System):** 
* The system uses clinical decision logic to set strict dietary limits (e.g., "If they have hypertension, limit sodium to 1500mg").
* It applies a **Scoring Algorithm** to calculate their very first Health Stability Score (HSS) based on those initial readings.

**Output:** 
* Personalized daily goals (target calories, max sodium, sleep hours).
* The user's starting Health Stability Score (HSS).

---

## 4. Main Dashboard Experience
**Input:** 
* Everything the user has done today (missions completed, vitals logged, meals eaten).
* Any new symptoms logged.

**Process (Hybrid Scoring Engine):** 
* The system merges their current daily logs with established clinical rules.
* It recalculates their Health Stability Score (HSS) in real-time. If it drops too low, the system flags their status as "Critical".

**Output:** 
* A dynamic pie chart showing the HSS score (Stable, Caution, or Critical).
* Progress bars showing how close they are to their daily goals.

---

## 5. Daily Missions Tracking
**Input:** 
* User taps on a mission (like logging sleep or adding a meal) and types in numbers (e.g., "7 hours of sleep").

**Process (Business Logic):** 
* The app verifies the numbers aren't impossible (e.g., you can't log 30 hours of sleep in a day).
* It marks the specific daily mission as "Completed".

**Output:** 
* A green checkmark appears on the dashboard.
* The overall daily progress bar fills up.

---

## 6. Trends & Analytics
**Input:** 
* The patient selects a specific timeframe (7, 14, or 30 days).
* The patient selects a specific stat to view (Heart Rate, Blood Pressure, Sodium).

**Process (Business Logic):** 
* The system queries the database for all logs within that exact timeframe.
* It crunches the math to find their "Best Day" (highest score) and their "Highest Sodium" day.

**Output:** 
* A smooth, interactive line graph mapping out their health history.
* A shareable PDF report generated upon request.

---

## 7. Explore & Discovery
**Input:** 
* A search keyword (e.g., "Salad") typed into the search bar, or a category pill tapped (e.g., "Exercise").

**Process (Business Logic):** 
* The app instantly filters through the entire database of recipes and exercises.
* It matches the letters typed and prepares to highlight them on the screen.

**Output:** 
* A filtered list of recipes or workouts.
* The exact letters they searched for are highlighted in yellow in the results.

---

## 8. Recipe Details & Food Logging
**Input:** 
* The user taps the `+` or `-` buttons to change the serving size they plan to eat.

**Process (Rule-Based System):** 
* The app dynamically multiplies the sodium, calories, and fats by the new serving size.
* **Decision Logic:** It constantly checks if the new sodium amount exceeds their safe per-meal limit (e.g., 140mg). If it does, it triggers a warning flag.

**Output:** 
* A red warning banner (if they went over the limit).
* The meal is logged and their daily sodium allowance is updated on the Dashboard.

---

## 9. Exercise Session
**Input:** 
* The user taps "Start Exercise".
* Halfway through, they tap 'Stop' and select "I have symptoms".

**Process (Rule-Based System):** 
* **Pre-check:** The app checks the user's current HSS score. If it's critical, the start button is completely locked to prevent cardiac strain.
* **Post-check:** If they stop early due to symptoms, the app immediately aborts the workout timer and flags the session as "Incomplete due to symptoms".

**Output:** 
* The workout stops.
* The app forces the user to the Symptom Logger screen so they can record what went wrong.

---

## 10. Symptom & Vitals Logger
**Input:** 
* Blood pressure numbers (Systolic/Diastolic), Heart Rate.
* A severity rating (1 to 10) dragged on a slider for a specific symptom (like Chest Pain).

**Process (Rule-Based System / Decision Logic):** 
* The app runs a sanity check (making sure the top BP number is higher than the bottom).
* It checks the numbers against strict clinical danger zones (e.g., >180/120 for Hypertensive Crisis).

**Output:** 
* If safe: The data is saved to their history.
* If dangerous: A full-screen red emergency modal pops up telling them to seek immediate medical help.

---

## 11. Barcode Food Scanner
**Input:** 
* The physical barcode of a food item captured by the phone's camera.

**Process (Business Logic):** 
* The app queries an external database (OpenFoodFacts API) using the barcode number.
* It extracts the nutritional data and normalizes the math (converting 100g data into "per serving" data if necessary).

**Output:** 
* The exact nutrition facts (calories, sodium) are displayed on the screen.
* If not found, it shows an alert offering the user to type it in manually.

---

## 12. Clinic & Emergency Locator
**Input:** 
* The user's live GPS coordinates (Latitude and Longitude).

**Process (Business Logic):** 
* The app pulls all clinics from the database.
* **Algorithm:** It calculates the "Haversine Distance" (the exact distance over the earth's curve) from the user to every single clinic.
* It sorts them mathematically from closest to farthest and checks if the current time matches their operating hours.

**Output:** 
* A sorted list of nearby clinics.
* "Directions" and "Call" buttons that link directly to Google Maps and the phone's dialer.

---

## 13. Expert Consultation Summary
**Input:** 
* A request from the user to view their 7-day summary.

**Process (Hybrid Scoring / Aggregation Engine):** 
* The app gathers hundreds of data points from the past week (BP logs, meals, missions).
* It calculates the rolling 7-day averages for blood pressure and heart rate.
* It scans the logs to count how many times a severe symptom occurred.

**Output:** 
* A clean, doctor-friendly dashboard summarizing their week.
* A button that generates a beautifully formatted PDF to AirDrop or email to their cardiologist.