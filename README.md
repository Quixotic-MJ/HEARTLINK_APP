# HeartLink 🫀

Welcome to the HeartLink Monorepo! This repository contains all three major components of the HeartLink system:
1. **Backend**: FastAPI (Python) Server
2. **Web Admin**: React (Vite) Dashboard
3. **Mobile App**: React Native (Expo) Patient App

Below are the step-by-step instructions for collaborators to set up their local development environment.

---

## 🏗️ 1. Backend Setup (API)

The backend handles all core logic, data processing, and serves the API for both the web and mobile apps. It uses **FastAPI**.

### Requirements
- Python 3.9 or newer

### Setup Steps
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. (Optional but Recommended) Create and activate a Python virtual environment:
   - **Windows:** `python -m venv venv` then `venv\Scripts\activate`
   - **Mac/Linux:** `python3 -m venv venv` then `source venv/bin/activate`
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server (with live-reloading enabled):
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
5. The API should now be running at `http://localhost:8000`. You can view the automatic API documentation at `http://localhost:8000/docs`.

---

## 💻 2. Web Admin Setup (Dashboard)

The web dashboard is used by medical professionals/system admins to manage exercises, view analytics, and monitor system status. It is built with **React** and **Vite**.

### Requirements
- Node.js (v18 or newer recommended)

### Setup Steps
1. Open a **new terminal tab** and navigate to the web directory:
   ```bash
   cd HeartLink-web
   ```
2. Install the Node modules:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. The web app should now be accessible in your browser at the URL shown in the terminal (usually `http://localhost:5173`).

---

## 📱 3. Mobile App Setup (Patient App)

The mobile app is designed for patients to log symptoms, perform exercises, and monitor their CSS (Cardiovascular Stability State) score. It is built using **React Native** and **Expo**.

### Requirements
- Node.js (v18 or newer recommended)
- [Expo Go](https://expo.dev/client) app installed on your physical iOS/Android device (or you can use an Android Studio Emulator / iOS Simulator)

### Setup Steps
1. Open a **new terminal tab** and navigate to the mobile directory:
   ```bash
   cd HeartLink-mobile
   ```
2. Install the Node modules:
   ```bash
   npm install
   ```
3. Start the Expo bundler:
   ```bash
   npx expo start
   ```
4. A QR code will appear in the terminal. Scan it with your phone's camera (iOS) or the Expo Go app (Android) to open the mobile app!

---

## 🤝 Workflow Tips for Collaborators
- **Ensure the Backend is running first!** Both the Web and Mobile apps fetch data from the local FastAPI backend. If the backend is off, the apps will not load data.
- **Environment Variables**: Ensure you check for any `.env` files if required for the backend or frontend to point to the correct `EXPO_PUBLIC_API_URL` or database URIs.
