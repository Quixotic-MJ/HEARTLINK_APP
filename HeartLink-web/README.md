# HeartLink - Web Admin & Expert Portal

The web portal for HeartLink staff: medical experts review patient cases, and admins manage users, content and the system. Built with React and Vite.

---

## 🛠️ Tech Stack & Requirements

* **Runtime:** Node.js 20+
* **Framework:** React 19
* **Build tool:** Vite
* **Routing:** React Router 7
* **Styling:** Tailwind CSS v4
* **UI:** Lucide icons, Framer Motion, Sonner (toasts)
* **Forms:** React Hook Form + Zod
* **Charts:** Recharts

---

## 📁 Directory Layout

```text
HeartLink-web/
├── public/                 # Icons and images served as-is.
├── src/
│   ├── app/App.jsx         # The page map: which screen shows for which address, and who may see it.
│   ├── api.js              # Talks to the backend. Sends the login cookie and the CSRF token.
│   ├── contexts/           # Shared state, mainly who is logged in (AuthContext).
│   ├── components/         # Reusable pieces: layouts, tables, pop-ups (modals).
│   ├── features/
│   │   ├── auth/           # Login and "Set your password" screens.
│   │   └── pages/          # The portal screens, grouped as overview, management,
│   │                       # clinical portal (case review, calibration) and system & support.
│   ├── styles/designSystem.js  # Shared colors, buttons, tables and page header.
│   └── utils/              # Small helpers.
├── Dockerfile              # dev stage (docker-compose) and prod stage (nginx).
├── nginx.conf              # Used by the prod Docker stage; forwards /api to the backend.
├── vercel.json             # Vercel settings: forwards /api to Railway, everything else to index.html.
├── vite.config.js          # Dev server; forwards /api to the backend.
└── .env.example
```

## ⚙️ Environment Variables

```bash
cp .env.example .env
```

| Key | What it does | Example |
|-----|--------------|---------|
| `VITE_API_URL` | Leave **empty**. The portal calls `/api/...` on its own address, which keeps the login cookie working. | *(empty)* |
| `VITE_PROXY_TARGET` | Where the dev server forwards `/api` calls (local backend). | `http://127.0.0.1:8000` |

**Why the API is "same-origin":** logins use an HttpOnly cookie with `SameSite=Strict` (HL-033), which browsers only send to the portal's own address. So `/api` is forwarded to the backend: by Vite during development, by `vercel.json` on Vercel, and by `nginx.conf` in the production Docker image.

The portal never talks to Supabase directly, so it needs no Supabase keys.

## 🚀 Local Setup

**With Docker:** see [../DOCKER.md](../DOCKER.md). The portal runs at http://localhost:5173.

**Without Docker:**
```bash
npm install
npm run dev
```
Open http://localhost:5173. The backend must be running on the address in `VITE_PROXY_TARGET`.

Other commands:
```bash
npm run lint      # check code style
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

## 👥 Who Sees What

| Role | Screens |
|------|---------|
| **Admin / Super Admin** | Dashboard, Analytics, Foods, Exercises, Users, Feedback, Broadcasts, Settings, Activity log, Notifications, Case review (follow the queue, draw the weekly sample), Calibration |
| **Medical Expert** | Case review (their own section), Calibration, Notifications |
| **Super Admin only** | Creating staff accounts (with a one-time temporary password) |

**Case review:** the Cardiologist gives the risk level and checkup flag, the Dietitian checks the recommended recipes, and the PT checks the recommended exercises. The app's own level stays hidden until the Cardiologist submits. The expert type is set when the staff account is created.

**First login:** staff with a temporary password must choose their own before they can use any page.

## 📦 Deployment (Vercel)

Vercel builds the `main` branch (`npm run build`, output `dist/`). `vercel.json` already:
* forwards `/api/*` and `/static/*` to the Railway backend, and
* sends every other address to `index.html`, so page reloads work.

No environment variables are needed on Vercel.
