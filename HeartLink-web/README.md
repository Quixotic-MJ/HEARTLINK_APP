# HeartLink - Web Admin & Expert Portal

The administrative and clinical evaluator portal for HeartLink, built with React and Vite.

---

## 🛠️ Tech Stack & Requirements

* **Runtime:** Node.js v18+
* **Framework:** React 19
* **Build Tool:** Vite
* **Routing:** React Router DOM
* **Styling:** Tailwind CSS v4
* **Icons & UI:** Lucide React, Framer Motion, Sonner (Toasts)
* **Forms & Validation:** React Hook Form, Zod
* **Data Visualization:** Recharts

---

## 📁 Directory Architecture & Component Responsibilities

```text
HeartLink-web/
├── public/                 # Publicly accessible files like website icons (favicons) and raw images.
├── src/                    # The main folder containing all the website's source code.
│   ├── app/                
│   │   ├── App.jsx         # The main "map" of the website that decides which screen to show based on the web address.
│   │   └── main.jsx        # The starting point that initially loads the entire website into the browser.
│   ├── assets/             # Visual files like pictures, logos, and system-wide styles.
│   ├── components/         # Reusable building blocks (like standard buttons, pop-up windows, and data tables).
│   ├── contexts/           # System-wide memory (keeps track of important things like who is currently logged in).
│   ├── features/           # The actual screens and major sections (like the Dashboard, User Manager, and Recipe pages).
│   ├── styles/             # The core design rules that make the website look good (spacing, layouts, and colors).
│   ├── utils/              # Small helper tools used throughout the website (like a tool to format dates properly).
│   └── api.js              # The "messenger" that talks to the backend server to securely fetch or save information.
├── .env.example            # A template showing where developers should put secret passwords and API keys.
├── package.json            # The "recipe book" listing all external code tools the website needs to download to run.
├── vite.config.js          # Settings for the tool that bundles all this code together to make it fast.
└── README.md               # The manual you are reading right now!
```

## ⚙️ Environment Variables

Create a `.env` file in the root of the web directory based on `.env.example`:

```bash
cp .env.example .env
```

| Key | Description | Required | Example |
|-----|-------------|----------|---------|
| `VITE_API_URL` | Base URL pointing to the FastAPI backend | Yes | `http://localhost:8000` |
| `VITE_SUPABASE_URL` | Supabase project URL (for direct client bucket access) | Optional | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase anonymous key | Optional | `your-anon-key` |

### Example `.env` File

```env
# ==============================================================================
# HeartLink Web Admin / Medical Expert Portal Configuration (Vite / React)
# ==============================================================================

# Public API Gateway (FastAPI Backend URL)
VITE_API_URL=http://localhost:8000

# Public Supabase Client (Anon key only)
# IMPORTANT: NEVER place SUPABASE_SERVICE_ROLE_KEY here.
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 🚀 Local Setup & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

* The local server typically runs at `http://localhost:5173`.
* Follow the terminal output for the exact active URL.

## 👥 Portal Roles & Workflows

### 1. Evaluator / Medical Expert
* **Content Review:** Audit proposed food recipes and exercise regimens for cardiovascular safety.
* **Scoring Calibration:** Review baseline survey questions and risk threshold logic.

### 2. Administrator
* **User Management:** Oversee active user accounts and permissions.
* **Clinic Directory:** Maintain public clinic listings, contact numbers, and operating hours.
* **System Metrics:** Monitor overall platform usage and database activity.

## 📦 Build & Deployment

**Create a Production Build**

```bash
npm run build
```

This generates optimized static files inside the `dist/` folder.

**Preview the Production Build Locally**

```bash
npm run preview
```

**Deployment Configuration (e.g., Vercel)**

If deploying to a static host like Vercel, ensure single-page application (SPA) routing is handled so page reloads route through `index.html`. 

Create a `vercel.json` file in your root folder:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
