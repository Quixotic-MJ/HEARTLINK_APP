# Running HeartLink with Docker

Docker runs the **backend API** and the **web admin portal** on your computer with one command, with no Python or Node setup. The **mobile app** still runs outside Docker (Expo Go on your phone), and the **database** is the shared Supabase project in the cloud.

| What | Where it runs | Address on your computer |
|---|---|---|
| Backend API (FastAPI) | Docker container `heartlink_backend` | http://localhost:8000 |
| Web admin portal (Vite) | Docker container `heartlink_web` | http://localhost:5173 |
| Mobile app (Expo) | Your terminal + Expo Go on your phone | Scan the QR code |
| Database, logins, file storage | Supabase (cloud) | Shared by everyone |

> **Read this first:** your local backend uses the **same Supabase database as the live app**. Anything you create, edit or delete locally is real. Use obviously fake test accounts ("Test Patient 1"), and never run database scripts or migrations unless the team agreed on it (see [backend/supabase/README.md](backend/supabase/README.md)).

---

## 1. One-time setup

### Install
1. **Docker Desktop**: https://www.docker.com/products/docker-desktop/
   - On Windows, accept the **WSL 2** option during install, then restart.
   - Open Docker Desktop once and wait until it says **Engine running**.
2. **Git**: https://git-scm.com/downloads
3. For the mobile app only: **Node.js 20+** and the **Expo Go** app on your phone.

### Get the code
```bash
git clone git@github.com:Quixotic-MJ/HEARTLINK_APP.git
cd HEARTLINK_APP
git checkout staging
```
Tip: clone into a normal folder, **not inside OneDrive or Google Drive**. Syncing folders make Docker slow and can lock files.

### Add the backend secrets
```bash
cp backend/.env.example backend/.env
```
Open `backend/.env` and fill in the values. Ask the project lead for them **in a private message**:
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SECRET_KEY`.

Also set:
```env
DATABASE_MODE=supabase
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081
```
Never commit `backend/.env`. Git already ignores it.

The web portal needs **no** `.env` file in Docker; Docker tells it where the backend is.

---

## 2. Start everything
From the project folder:
```bash
docker compose up --build
```
The first build takes about 5–10 minutes. Later starts take seconds. You are ready when the log shows `Uvicorn running on http://0.0.0.0:8000` and Vite's `Local: http://localhost:5173/`.

Check it works:
- http://localhost:8000/health shows `{"status":"ok"}`
- http://localhost:8000/docs shows the API documentation
- http://localhost:5173 shows the admin portal login

Both apps **reload by themselves** when you save a file.

---

## 3. Connect the mobile app
The phone reaches the backend through your computer's Wi-Fi address, not `localhost`.

1. Find your computer's address:
   - Windows: run `ipconfig` and copy the **IPv4 Address** under **Wi-Fi** (for example `192.168.1.25`).
   - macOS: **System Settings → Wi-Fi → Details → IP address**.
2. Create `HeartLink-mobile/.env` (copy `HeartLink-mobile/.env.example`) with:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.25:8000
   ```
3. Start the app:
   ```bash
   cd HeartLink-mobile
   npm install
   npx expo start
   ```
4. Scan the QR code with Expo Go. The phone must be on the **same Wi-Fi** as your computer.
5. Quick check: open `http://192.168.1.25:8000/health` in your **phone's browser**. If that loads, the app will connect.

Local sign-up uses the code **123456** (see `DEV_OTP_*` in `backend/.env.example`).

---

## 4. Everyday commands

| I want to… | Run |
|---|---|
| Start in the background | `docker compose up -d` |
| Watch the backend log | `docker compose logs -f backend` |
| Stop everything | `docker compose down` |
| Rebuild after `requirements.txt` or `package.json` changed | `docker compose up --build` |
| Run the backend tests | `docker compose exec backend python -m pytest tests -q` |
| Open a shell in the backend | `docker compose exec backend sh` |
| Start completely fresh (rebuilds `node_modules`) | `docker compose down -v` then `docker compose up --build` |

---

## 5. Troubleshooting

| Problem | Fix |
|---|---|
| `failed to connect to the docker API` | Docker Desktop is not running. Open it and wait for **Engine running**. |
| `port is already allocated` (8000 or 5173) | Something else uses that port, often a backend you started by hand. Stop it, or run `docker compose down` and try again. |
| Backend exits with `SECRET_KEY` or Supabase errors | `backend/.env` is missing or incomplete. See step 1. |
| Portal login keeps sending you back to the login page | Open the portal at **http://localhost:5173** exactly (not `127.0.0.1` or your IP), so the login cookie matches. |
| Saved changes don't show up | Polling is on by default. Wait 1–2 seconds. If it still doesn't reload, run `docker compose restart`. |
| Web shows errors about missing packages after a pull | Someone added a package. Run `docker compose down -v` then `docker compose up --build`. |
| Phone can't reach the backend | Same Wi-Fi as the computer? Correct IPv4 in `HeartLink-mobile/.env`? Restart Expo with `npx expo start -c`. On Windows, allow **Docker Desktop** through the firewall on Private networks. |
| Everything is very slow on Windows | Move the project out of OneDrive, or clone it inside WSL (`\\wsl$\...`). |

---

## How the pieces fit
- `docker-compose.yml` builds two containers from `backend/Dockerfile` and `HeartLink-web/Dockerfile` (its `dev` stage).
- The project folders are mounted into the containers, so your edits are live; nothing is copied back and forth.
- The portal calls the API on its own address (`/api/...`), and Vite forwards those calls to the backend container. This keeps the secure login cookie working.
- Production does **not** use this file. Railway builds `backend/Dockerfile`, Vercel builds the web portal, and `HeartLink-web/Dockerfile` also has a `prod` stage (nginx) if the portal ever needs to run as a container.
