// Deliberately invented fixtures, not clinical advice or copies of account records.
export const roles = {
  admin: { label: "Admin", role: "admin", home: "/dashboard", description: "Overview, content, accounts and operations" },
  dietitian: { label: "Dietitian", role: "medical_expert", expert_type: "Dietitian", home: "/foods", description: "Recipe review and your own workspace" },
  therapist: { label: "Physical Therapist", role: "medical_expert", expert_type: "Physical Therapist", home: "/exercises", description: "Routine review and your own workspace" },
  cardiologist: { label: "Cardiologist", role: "medical_expert", expert_type: "Cardiologist", home: "/notifications", description: "Notifications and account settings; no patient records" },
};

export function identity(role) {
  const selected = roles[role];
  return {
    user_id: `synthetic-${role}`, role: selected.role, expert_type: selected.expert_type,
    first_name: "Synthetic", last_name: selected.label, email: `${role}@example.test`,
    account_status: "active", must_change_password: false, created_at: "2026-11-09T01:00:00Z",
  };
}

const date = "2026-11-09T01:00:00Z";
const workflow = (index) => ({
  status: ["draft", "draft", "published", "archived"][index],
  expert_validated: index === 1 || index === 2,
  reviewed_by: index === 1 || index === 2 ? "synthetic-reviewer" : null,
  reviewed_at: index === 1 || index === 2 ? date : null,
  updated_at: date,
});

export const recipes = ["Garden rice bowl", "Herbed vegetable soup", "Ginger fish plate", "Archived bean salad"].map((name, index) => ({
  id: `synthetic-recipe-${index}`, name, ...workflow(index), category: index % 2 ? "Dinner" : "Lunch",
  servings: 2, prep_time_minutes: 25, difficulty: "Easy", calories: 220,
  sodium_mg: 120, saturated_fat_g: 1, cholesterol_mg: 0, fiber_g: 4,
  image_url: `/__preview/media/recipe-${index}.svg`, foodSourceType: "Home Recipe", tags: [],
  ingredients: [{ name: "Brown rice", amount: 1, unit: "cup" }, { name: "Carrot", amount: 1, unit: "pc" }],
  steps: ["Synthetic preparation step for layout review only.", "Have a qualified reviewer approve real instructions before publication."],
}));

export const exercises = ["Gentle mobility sample", "Seated movement sample", "Breathing layout sample", "Archived routine sample"].map((name, index) => ({
  id: `synthetic-routine-${index}`, name, ...workflow(index),
  description: "Illustrative layout content only. Not an exercise prescription.",
  type: "Stationary", intensity: "Low", setting: "Indoor", position: "Seated",
  duration_minutes: 1, media_url: `/__preview/media/exercise-${index}.svg`,
  difficulty_level: "Beginner", target_areas: [], tempo: "", category: "", setup_steps: [],
  rest_seconds: 0, skip_if: [], stop_if: [], guide_images: [],
  steps: [{ instruction: "Synthetic movement description for design review only.", mode: "time", duration_seconds: 60 }],
}));

const states = { total: 4, draft: 2, awaiting_review: 1, changes_requested: 0, approved_draft: 1, approval_recorded: 2,
  published: 1, archived: 1, unknown_status: 0, published_without_review: 0, published_without_review_names: [] };
export const dashboard = {
  accounts: { consumers: 3, staff: 4, active: 5, disabled: 1, archived: 1, unknown_status: 0, unknown_role: 0 },
  content: { recipes: { ...states, published_without_review: 1, published_without_review_names: ["Demo steamed fish"] }, exercises: states }, generated_at: date,
};
export const accounts = ["Demo account", "Demo Premium", "Demo disabled"].map((name, index) => ({
  id: `synthetic-account-${index}`, first_name: "Synthetic", last_name: name, role: "patient",
  account_status: index === 2 ? "disabled" : "active", created_at: date,
  plan: index === 1 ? "premium" : "free", premium_until: index === 1 ? "2099-01-01T00:00:00Z" : null,
}));
export const staff = Object.keys(roles).map((role) => ({ ...identity(role), id: `synthetic-${role}` }));
export const tickets = [{
  id: "synthetic-ticket", ticketId: "FB-1001", status: "Open", category: "Bug Report",
  adminNotes: "Synthetic internal note", updated_at: date, created_at: date,
  fullMessage: "Synthetic feedback: review how the library displays on a narrow screen.",
  userId: "synthetic-account-0", deviceMeta: { os: "Demo OS", appVersion: "preview", model: "Synthetic device" },
}];
export const broadcasts = [{
  id: "synthetic-notice", title: "Welcome to the design preview", message: "A synthetic announcement. Nothing will be sent to users.",
  type: "Maintenance", target_audience: "All Registered Accounts", display_publisher: "Synthetic Admin", created_at: date,
}];
export const activity = {
  items: [{ id: "synthetic-event", admin_name: "Synthetic Admin", action: "updated", target_type: "recipe",
    target_name: "Garden rice bowl", target_id: "synthetic-recipe-0", created_at: date }],
  total: 1, total_pages: 1, page: 1, page_size: 20, scope: "Synthetic operational metadata only", timezone: "Asia/Manila",
};
export const premium = {
  patients: 3, premium_members: 1, on_trial: 0, by_admin: 1, demo_revenue_php: 0,
  events_considered: 1, event_limit: 100, history_may_be_truncated: false, config_basis: "default",
  config: { monthly_price_php: 0, yearly_price_php: 0, trial_days: 0, checkout_enabled: false },
  events: [{ id: "synthetic-premium-event", user_id: "synthetic-account-1", user_name: "Synthetic Demo Premium",
    kind: "admin_granted", actor_name: "Synthetic Admin", created_at: date, premium_until: "2099-01-01T00:00:00Z" }],
};

export function notifications(role) {
  return { items: [{ id: "synthetic-notification", title: "Design preview is ready", type: "system", severity: "info",
    message: "All records are invented. Saves and account changes are intentionally blocked.",
    created_at: date, read_by: [`synthetic-${role}`], route: roles[role].home }], total: 1, unread_count: 0 };
}

export function illustration(kind) {
  const exercise = kind.startsWith("exercise-");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" role="img" aria-label="Synthetic ${exercise ? "movement" : "meal"} illustration">
    <rect width="640" height="420" fill="${exercise ? "#f5e8eb" : "#e8f0e7"}"/>
    ${exercise ? '<circle cx="320" cy="100" r="35" fill="#813749"/><path d="M320 146v115m0-85-100 55m100-55 100 55M320 261l-80 95m80-95 80 95" stroke="#813749" stroke-width="25" stroke-linecap="round" fill="none"/>' : '<ellipse cx="320" cy="215" rx="230" ry="155" fill="#fffdf7"/><ellipse cx="320" cy="215" rx="175" ry="115" fill="#b9cd9d"/><path d="M195 225q55-150 180-70t65 105q-140 75-245-35" fill="#537a58"/><circle cx="275" cy="210" r="37" fill="#de9a60"/><circle cx="375" cy="225" r="42" fill="#e4be70"/>'}
    <text x="320" y="398" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#394941">Synthetic illustration · not instructions</text></svg>`;
}
