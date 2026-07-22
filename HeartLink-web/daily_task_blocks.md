# HeartLink 20-Day Sprint: Daily Task Blocks

This document is your day-by-day roadmap. **Your goal is simple: complete the tasks for the current day. Once every checkbox for that day is ticked, you are done for the day.** 

> [!NOTE]
> **Strategy Update:** We are prioritizing polishing the App Flow, Logic, and User Experience (UX) first while using the existing `mock_db.py`. Once the frontend feels perfect and 100% functional with mock data, we will move on to the Database Migration phase.

---

## 📱 Phase 1: Mobile App Core Logic & Flow (Mock DB)
*Goal: Ensure the mobile app can perform all core actions and logic using the existing FastAPI mock backend.*

### Day 1: Mobile Authentication Flow
- [ ] Connect Mobile Login & Registration screens to the Backend Auth API (using mock DB).
- [ ] Implement secure token storage (e.g., `AsyncStorage`) and test logging in/out.
- [ ] Set up routing to protect authenticated screens (redirect to login if not authenticated).

### Day 2: Dashboard & Profile Data Flow
- [ ] Fetch mock user data and display it on the Mobile Profile screen.
- [ ] Connect the Dashboard to show current metrics (e.g., latest health log, Cardiovascular Stability Score).
- [ ] Ensure profile updates reflect immediately on the dashboard.

### Day 3: Health Logs & Tracking Logic
- [ ] Wire up the Health Logs UI (Add/Edit/View) to the mock backend.
- [ ] Ensure users can log Blood Pressure/Heart Rate and see their history update without refreshing.

### Day 4: Meals, Recipes, & Exercises Flow
- [ ] Connect the Meals screen to log daily meals via the API.
- [ ] Connect the Exercises screen to log workouts.
- [ ] Connect the Recipes screen to display the mock recipe recommendations.

### Day 5: Clinics Locator & Logic Review
- [ ] Connect the Clinics screen to fetch and display nearby clinics.
- [ ] **End of Phase 1 Check:** Walk through the entire mobile app. Ensure every button does what it's supposed to do and data flows correctly using the mock backend.

---

## ✨ Phase 2: Mobile User Experience (UX) Polish
*Goal: Make the mobile app look and feel premium, responsive, and error-proof.*

### Day 6: Loading States & Skeletons
- [ ] Add skeleton loaders or spinners to the Dashboard, Meals, and Health Logs while data is fetching.
- [ ] Ensure buttons have a "loading" state (e.g., a spinner on the Login button when pressed).

### Day 7: Error Handling & Form Validation
- [ ] Add graceful error handling (e.g., "Network Error" alerts if the backend is off).
- [ ] Add form validation (e.g., red text if the user enters an invalid email format or empty fields).
- [ ] Show success messages (e.g., "Meal logged successfully!").

### Day 8: Animations & Micro-interactions
- [ ] Add subtle animations (like smooth transitions between screens, or a heart pulse animation on the dashboard).
- [ ] Improve button tap feedback (opacity change or slight scale-down when pressed).

### Day 9: Responsive Design Testing
- [ ] Test the UI on different screen sizes (small phones vs. large phones).
- [ ] Fix any overflowing text, squished images, or overlapping buttons.

---

## 💻 Phase 3: Admin Web Portal (Logic & Polish)
*Goal: Build out and polish the admin dashboard using the mock data.*

### Day 10: Admin Auth & Global Dashboard
- [ ] Web: Implement the Admin Login screen.
- [ ] Web: Build out the main dashboard view with charts or metric cards displaying mock stats.

### Day 11: User Management & Data Tables
- [ ] Web: Build a Data Table to list all mocked users.
- [ ] Web: Implement sorting, filtering, and pagination for the user list.
- [ ] Web: Add the logic to view a specific user's details or ban/suspend accounts.

### Day 12: Content Management (Recipes/Clinics)
- [ ] Web: Build interfaces for admins to manage (Add/Edit/Delete) Recipes.
- [ ] Web: Build interfaces for admins to manage Clinics data.

### Day 13: Admin Web UX Polish
- [ ] Web: Add "Toast" notifications for success/error actions.
- [ ] Web: Improve the sidebar navigation and ensure the layout is clean, modern, and accessible.

---

## ⚙️ Phase 4: Database Migration & ML Integration
*Goal: Now that the app feels perfect, swap out `mock_db.py` for a real database and finalize ML.*

### Day 14: Real Database Setup
- [ ] Choose and set up your database (e.g., PostgreSQL or MongoDB).
- [ ] Configure the database connection in your FastAPI backend.
- [ ] Create the database models/schemas.

### Day 15: Auth & Profile DB Migration
- [ ] Migrate the User and Auth logic to the real database.
- [ ] Update `/api/auth` and `/api/profile` endpoints. Test via the polished Mobile App.

### Day 16: Health Logs & Dashboard DB Migration
- [ ] Update `/api/health_logs` and Dashboard APIs to fetch/save data from the real DB.
- [ ] Verify the Mobile Dashboard still works perfectly.

### Day 17: Content DB Migration (Meals, Recipes, Clinics)
- [ ] Update `/api/meals`, `/api/exercises`, and `/api/clinics` endpoints to use the real DB.
- [ ] **Bye Mock DB:** Completely remove or bypass `mock_db.py`. 

### Day 18: Machine Learning Integration
- [ ] Backend: Ensure the `ml` module's Cardiovascular Stability Score and recommendations (Recipes/Exercises) are calculating correctly against real DB data.

### Day 19: Landing Page Polish
- [ ] Update the `landing` page with final text and screenshots of your polished app.
- [ ] Verify the landing page is mobile-responsive and SEO-ready.

### Day 20: Pre-Launch QA (End-to-End Testing)
- [ ] Test the entire flow across Mobile and Admin Web using the real Database and ML models.
- [ ] **Celebrate! You are ready to deploy.**
