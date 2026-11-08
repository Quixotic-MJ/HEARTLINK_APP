import {
  Activity,
  Bell,
  ChartColumn,
  CircleHelp,
  Crown,
  Dumbbell,
  Gauge,
  Megaphone,
  Settings,
  Users,
  Utensils,
} from "lucide-react";
import { canAccess, searchPathFor } from "./access.js";

const PAGES = [
  { path: "/dashboard", label: "Overview", section: "Workspace", icon: Gauge },
  {
    path: "/analytics",
    label: "Analytics",
    section: "Workspace",
    icon: ChartColumn,
  },
  {
    path: "/foods",
    label: "Food & Recipes",
    section: "Content",
    icon: Utensils,
    searchLabel: "recipes",
  },
  {
    path: "/exercises",
    label: "Exercise Library",
    section: "Content",
    icon: Dumbbell,
    searchLabel: "routines",
  },
  {
    path: "/broadcasts",
    label: "Announcements",
    section: "Content",
    icon: Megaphone,
  },
  {
    path: "/users",
    label: "Accounts & Staff",
    section: "Operations",
    icon: Users,
    searchLabel: "accounts",
  },
  {
    path: "/activity-log",
    label: "Activity Log",
    section: "Operations",
    icon: Activity,
  },
  {
    path: "/feedbacks",
    label: "Feedback & Reports",
    section: "Operations",
    icon: CircleHelp,
  },
  { path: "/premium", label: "Premium", section: "Operations", icon: Crown },
  {
    path: "/notifications",
    label: "Notifications",
    section: "Account",
    icon: Bell,
  },
  { path: "/settings", label: "Settings", section: "Account", icon: Settings },
];

export function portalNavigationFor(user) {
  return PAGES.filter((page) => canAccess(user, page.path));
}

export function portalSearchTargetsFor(user, pathname) {
  const preferred = searchPathFor(user);
  const rank = (page) =>
    page.path === pathname ? 0 : page.path === preferred ? 1 : 2;
  return portalNavigationFor(user)
    .filter((page) => page.searchLabel)
    .sort((a, b) => rank(a) - rank(b));
}
