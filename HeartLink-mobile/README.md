# HeartLink Mobile App 🫀

## App Purpose
The application aims to monitor and track users' dietary and lifestyle habits and provide personalized recommendations, including food recipes and exercise routines, based on the user's Health Stability Score to support cardiovascular health improvement.

## Developer Setup Guide

Follow these steps to get the full project up and running locally for development.

### 1. Start the Backend Server (FastAPI)
Open a terminal in the `backend` directory and run the following command to start the Python server:

```bash
cd ../backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Note: Ensure your virtual environment is activated and your backend dependencies are installed.*

### 2. Configure Environment Variables
If you are testing on a **physical device**, the mobile app needs to know your computer's local IP address to connect to the backend (since `localhost` points to the phone itself).
1. Open the `.env` file in the `HeartLink-mobile` directory.
2. Find your computer's local IPv4 address (e.g., run `ipconfig` on Windows or `ifconfig` on Mac).
3. Update the API URL:
   ```env
   EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:8000
   ```

### 3. Start the Mobile App (Expo)
Open a separate terminal in the `HeartLink-mobile` directory. First, ensure dependencies are installed, then run the Expo bundler:

```bash
npm install
npx expo start --tunnel -c
```

**Understanding the flags:**
- `--tunnel`: Allows you to test the app on your physical device using the Expo Go app, even if your phone and computer are on different Wi-Fi networks.
- `-c`: Clears the bundler cache to prevent stale code issues.

## Tech Stack
- **Framework**: React Native with [Expo](https://expo.dev)
- **Routing**: Expo Router (File-based routing)
- **Backend**: Python / FastAPI
