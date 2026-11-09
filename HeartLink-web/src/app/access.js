// HL-034: which portal pages each staff member can open. The routes (app.jsx), the layout
// and the side menu all read these rules, so they can't disagree. They mirror the backend's
// HL-012 rules (backend/app/utils/security.py EXPERT_PERMISSIONS): Admins and Dietitians write recipes and only
// Dietitians approve them; Admins and Physical Therapists write exercises and only PTs approve them (HL-136).

// HL-074: one Admin role; Super Admin was merged into it.
export const ADMIN_ROLES = ["admin"];

const ADMINS = { roles: ADMIN_ROLES };
const ALL_STAFF = { roles: [...ADMIN_ROLES, "medical_expert"] };
export const EXPERT_TYPES = ["Cardiologist", "Dietitian", "Physical Therapist"];

/** Page rules by path. `expertTypes` lets medical experts of those types in as well. */
export const PAGE_ACCESS = {
  "/dashboard": ADMINS,
  "/analytics": ADMINS,
  "/foods": { roles: ADMIN_ROLES, expertTypes: ["Dietitian"] },
  "/exercises": { roles: ADMIN_ROLES, expertTypes: ["Physical Therapist"] },
  "/users": ADMINS,
  "/feedbacks": ADMINS,
  // Optional Premium access and read-only demo configuration
  "/premium": ADMINS,
  "/broadcasts": ADMINS,
  // Experts use notifications for content, account, and security work assigned to them.
  "/notifications": ALL_STAFF,
  // Own account/password only; this does not grant system or staff management.
  "/settings": ALL_STAFF,
  "/activity-log": ADMINS,
  // HL-055/056: case review and Model Check (cases show a case code, age and sex, not a name)
  "/cases": ALL_STAFF,
  "/calibration": ALL_STAFF,
  // HL-039/040, HL-107/136: patient records and care-team notes are for the care team (experts) only, not Admins
  "/patients": { roles: [], expertTypes: EXPERT_TYPES },
};

/** Pages with a detail page under them, e.g. "/patients/123" (one level only). */
const DETAIL_PAGES = ["/users", "/cases", "/patients"];

/** The rule for a path, matching "/users/123" to "/users". */
export function ruleFor(pathname) {
  const path = pathname.replace(/\/$/, "");
  const detail = DETAIL_PAGES.find((page) => new RegExp(`^${page}/[^/]+$`).test(path));
  const key = Object.hasOwn(PAGE_ACCESS, path) ? path : detail || null;
  return key ? PAGE_ACCESS[key] : null;
}

export function canAccess(user, pathname) {
  const rule = ruleFor(pathname);
  if (!rule) return false;
  const role = user?.role;
  if (rule.roles.includes(role)) return true;
  return role === "medical_expert" && !!rule.expertTypes?.includes(user?.expert_type);
}

export function searchPathFor(user) {
  if (ADMIN_ROLES.includes(user?.role)) return "/users";
  if (user?.role !== "medical_expert") return null;
  if (user?.expert_type === "Dietitian") return "/foods";
  if (user?.expert_type === "Physical Therapist") return "/exercises";
  return null;
}

export function safeNotificationRoute(user, route) {
  if (typeof route !== "string" || !route.startsWith("/") || route.startsWith("//")) return null;
  try {
    const origin = "https://portal.heartlink.invalid";
    const parsed = new URL(route, origin);
    if (parsed.origin !== origin || !ruleFor(parsed.pathname) || !canAccess(user, parsed.pathname)) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

const isExpert = (user, type) => user?.role === "medical_expert" && user?.expert_type === type;

export function canAuthorRecipes(user) {
  return ADMIN_ROLES.includes(user?.role) || isExpert(user, "Dietitian");
}

export function canAuthorExercises(user) {
  return ADMIN_ROLES.includes(user?.role) || isExpert(user, "Physical Therapist");
}

export function canReviewExercises(user) {
  return isExpert(user, "Physical Therapist");
}

export function canReviewRecipes(user) {
  return user?.role === "medical_expert" && user?.expert_type === "Dietitian";
}

/** Where someone lands after being turned away from a page. */
export function homeFor(user) {
  if (ADMIN_ROLES.includes(user?.role)) return "/dashboard";
  if (user?.role !== "medical_expert") return "/";
  if (user?.expert_type === "Dietitian") return "/foods";
  if (user?.expert_type === "Physical Therapist") return "/exercises";
  // HL-039: the Cardiologist dashboard
  if (user?.expert_type === "Cardiologist") return "/patients";
  return "/notifications";
}
