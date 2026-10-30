import { useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Skeleton } from "../ui/Skeleton";
import LoadError from "../ui/LoadError";

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap";

const ROLE_TABS = [
  ["all", "All roles"],
  ["admin", "System admin"],
  ["medical_expert", "Expert reviewer"],
];

const EXPERT_BADGE = {
  Cardiologist: "border-cal-badge-orange/35 bg-cal-badge-orange/15 text-cal-ink",
  Dietitian: "border-cal-badge-emerald/35 bg-cal-badge-emerald/15 text-cal-ink",
  "Physical Therapist": "border-cal-badge-pink/30 bg-cal-badge-pink/10 text-cal-ink",
};

const getAvatarSurface = (staff) => {
  if (staff.role === "System Admin" || staff.db_role === "admin") {
    return "bg-cal-badge-violet/15 text-cal-ink";
  }
  if (staff.expert_type === "Cardiologist") return "bg-cal-badge-orange/20 text-cal-ink";
  if (staff.expert_type === "Dietitian") return "bg-cal-badge-emerald/20 text-cal-ink";
  if (staff.expert_type === "Physical Therapist") return "bg-cal-badge-pink/15 text-cal-ink";
  return "bg-cal-surface-card text-cal-ink";
};

const staffInitials = (name) =>
  (name || "S")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "S";

const StaffListView = ({
  staffList = [],
  loading = false,
  error = false,
  onRetry,
  onOpenStaff,
  onCreateStaff,
}) => {
  const [internalSearch, setInternalSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const totalStaff = staffList.length;
  const admins = staffList.filter(
    (s) => s.role === "System Admin" || s.db_role === "admin"
  ).length;
  const experts = staffList.filter(
    (s) => s.role === "Authorized Medical Expert" || s.db_role === "medical_expert"
  ).length;
  const activeStaff = staffList.filter(
    (s) => s.account_status === "active" || s.status?.toLowerCase() === "active"
  ).length;

  const roleCounts = {
    all: totalStaff,
    admin: admins,
    medical_expert: experts,
  };

  const handleClearFilters = () => {
    setInternalSearch("");
    setFilterRole("all");
    setFilterStatus("all");
  };

  // Filtering
  const filtered = staffList.filter((s) => {
    const searchString = internalSearch.toLowerCase();
    const nameMatch = s.name?.toLowerCase().includes(searchString) || false;
    const idMatch = s.id?.toLowerCase().includes(searchString) || false;
    const emailMatch = s.email?.toLowerCase().includes(searchString) || false;
    const matchSearch = nameMatch || idMatch || emailMatch;

    let matchRole = true;
    if (filterRole === "admin") {
      matchRole = s.role === "System Admin" || s.db_role === "admin";
    } else if (filterRole === "medical_expert") {
      matchRole = s.role === "Authorized Medical Expert" || s.db_role === "medical_expert";
    }

    let matchStatus = true;
    const itemStatus = (s.account_status || s.status || "active").toLowerCase();
    if (filterStatus !== "all") {
      matchStatus = itemStatus === filterStatus;
    }

    return matchSearch && matchRole && matchStatus;
  });

  const getStatusBadge = (status) => {
    const norm = status?.toLowerCase();
    if (norm === "active") {
      return (
        <span className={`${PILL} border-cal-success/25 bg-cal-success/10 text-cal-ink`}>
          <span className="h-1.5 w-1.5 rounded-full bg-cal-success" />
          <span>Active</span>
        </span>
      );
    }
    return (
      <span className={`${PILL} border-cal-error/25 bg-cal-error/10 text-cal-ink`}>
        <span className="h-1.5 w-1.5 rounded-full bg-cal-error" />
        <span>Disabled</span>
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const isExpert = role?.includes("Expert") || role === "medical_expert";
    const isAdmin = role === "System Admin" || role === "admin";

    if (isAdmin) {
      return (
        <span className={`${PILL} border-cal-badge-violet/30 bg-cal-badge-violet/10 text-cal-ink`}>
          <ShieldCheck size={12} />
          <span>System Admin</span>
        </span>
      );
    }
    if (isExpert) {
      return (
        <span className={`${PILL} border-cal-hairline bg-cal-surface-soft text-cal-ink`}>
          <Stethoscope size={12} />
          <span>Expert Reviewer</span>
        </span>
      );
    }
    return (
      <span className={`${PILL} border-cal-hairline bg-cal-surface-card text-cal-ink`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6 font-cal-sans text-cal-ink">
      {/* ── 1. KPI METRICS STRIP ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium text-cal-muted">Total staff</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
              <Users size={14.5} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none text-cal-ink">
            {loading ? "—" : totalStaff}
          </div>
          <div className="mt-2 text-[12px] text-cal-muted">Provisioned portal members</div>
        </div>

        <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium text-cal-muted">System admins</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-badge-violet/30 bg-cal-badge-violet/10 text-cal-ink">
              <Shield size={14.5} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none text-cal-ink">
            {loading ? "—" : admins}
          </div>
          <div className="mt-2 text-[12px] text-cal-muted">Platform governance access</div>
        </div>

        <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium text-cal-muted">Expert reviewers</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-badge-emerald/35 bg-cal-badge-emerald/15 text-cal-ink">
              <Stethoscope size={14.5} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none text-cal-ink">
            {loading ? "—" : experts}
          </div>
          <div className="mt-2 text-[12px] text-cal-muted">Cardiology, dietetics &amp; PT</div>
        </div>

        <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium text-cal-muted">Active staff</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-success/25 bg-cal-success/10 text-cal-success">
              <CheckCircle2 size={14.5} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none text-cal-ink">
            {loading ? "—" : activeStaff}
          </div>
          <div className="mt-2 text-[12px] text-cal-muted">Authorized to sign in</div>
        </div>
      </div>

      {/* ── 2. STAFF DIRECTORY TABLE CARD ───────────────────────────────── */}
      <section className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-cal-hairline bg-cal-canvas px-4 py-3.5 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
          <div
            role="group"
            aria-label="Filter staff by role"
            className="relative inline-flex w-fit flex-wrap items-center gap-1 rounded-[16px] sm:rounded-full border border-cal-hairline/80 bg-cal-surface-soft p-1"
          >
            {ROLE_TABS.map(([key, label]) => {
              const active = filterRole === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilterRole(key)}
                  className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors cursor-pointer select-none ${
                    active
                      ? "text-white font-semibold"
                      : "text-cal-muted hover:text-cal-ink"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="staff-role-filter-tab"
                      className="absolute inset-0 rounded-full bg-cal-primary shadow-xs"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                  <span
                    className={`relative z-10 font-cal-mono text-[11.5px] tabular-nums ${
                      active ? "text-white/90 font-medium" : "text-cal-muted-soft"
                    }`}
                  >
                    {loading ? "—" : roleCounts[key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative flex-1 sm:w-64 sm:flex-initial">
              <label htmlFor="staff-directory-search" className="sr-only">
                Search staff accounts
              </label>
              <Search
                size={14.5}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cal-muted"
              />
              <input
                id="staff-directory-search"
                type="text"
                placeholder="Search name, email, or ID…"
                value={internalSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
                className="h-9 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas pl-9 pr-8 text-[13px] text-cal-ink placeholder:text-cal-muted focus:border-cal-ink focus:outline-none transition-colors"
              />
              {internalSearch && (
                <button
                  type="button"
                  onClick={() => setInternalSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-cal-muted hover:bg-cal-surface-card hover:text-cal-ink cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative">
              <label htmlFor="staff-status-filter" className="sr-only">
                Filter staff by status
              </label>
              <select
                id="staff-status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 appearance-none rounded-[8px] border border-cal-hairline bg-cal-canvas pl-3 pr-8 text-[13px] font-medium text-cal-ink focus:border-cal-ink focus:outline-none cursor-pointer"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cal-muted"
              />
            </div>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={onCreateStaff}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-4 text-[13px] font-semibold text-cal-on-primary transition-colors shrink-0 cursor-pointer"
            >
              <UserPlus size={14.5} />
              <span>Create staff account</span>
            </button>
          </div>
        </div>

        {/* Directory Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead className="border-b border-cal-hairline bg-cal-surface-soft">
              <tr>
                <th scope="col" className="px-5 py-3 text-[12px] font-medium text-cal-muted">
                  Staff member
                </th>
                <th scope="col" className="px-4 py-3 text-[12px] font-medium text-cal-muted">
                  Role &amp; discipline
                </th>
                <th scope="col" className="px-4 py-3 text-[12px] font-medium text-cal-muted">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-[12px] font-medium text-cal-muted">
                  Created
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 text-right text-[12px] font-medium text-cal-muted"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cal-hairline">
              {loading ? (
                [1, 2, 3].map((item) => (
                  <tr key={item}>
                    <td colSpan={5} className="px-5 py-4">
                      <Skeleton className="h-9 w-full rounded-[8px] bg-cal-surface-strong/60" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={5}>
                    <LoadError what="staff accounts" onRetry={onRetry} className="py-12" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center">
                    <p className="text-[14px] font-semibold text-cal-ink">
                      {totalStaff === 0
                        ? "No staff accounts provisioned yet"
                        : "No staff accounts match these filters"}
                    </p>
                    <p className="mt-1 text-[13px] text-cal-muted">
                      {totalStaff === 0
                        ? "Create a System Admin or Medical Expert account to get started."
                        : "Clear the active role, status, or search filter to see all staff."}
                    </p>
                    {totalStaff > 0 && (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                      >
                        <RotateCcw size={13} />
                        <span>Reset filters</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((staff) => (
                  <tr
                    key={staff.id}
                    onClick={() => onOpenStaff(staff)}
                    className="group hover:bg-cal-surface-soft/80 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline text-[12px] font-semibold ${getAvatarSurface(
                            staff
                          )}`}
                        >
                          {staffInitials(staff.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold text-cal-ink group-hover:underline">
                            {staff.name}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-cal-muted">
                            {staff.email && <span className="truncate">{staff.email}</span>}
                            <span className="font-cal-mono text-[11px] text-cal-muted-soft">
                              {staff.id}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {getRoleBadge(staff.role)}
                        {staff.expert_type && (
                          <span
                            className={`${PILL} ${
                              EXPERT_BADGE[staff.expert_type] ||
                              "border-cal-hairline bg-cal-surface-card text-cal-ink"
                            }`}
                          >
                            {staff.expert_type}
                          </span>
                        )}
                        {staff.is_verified_clinician && (
                          <span
                            title="Verified clinician (reviews count in Model Check)"
                            className={`${PILL} border-cal-success/25 bg-cal-success/10 text-cal-ink`}
                          >
                            <BadgeCheck size={12} className="text-cal-success" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 align-middle">
                      {getStatusBadge(staff.account_status || staff.status)}
                    </td>

                    <td className="px-4 py-3.5 align-middle">
                      <span className="font-cal-mono text-[12.5px] text-cal-muted">
                        {staff.created_at
                          ? new Date(staff.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            })
                          : "N/A"}
                      </span>
                    </td>

                    <td
                      className="px-5 py-3.5 text-right align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onOpenStaff(staff)}
                        className="inline-flex items-center gap-1 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 py-1.5 text-[12.5px] font-semibold text-cal-ink group-hover:border-cal-primary group-hover:bg-cal-primary group-hover:text-cal-on-primary hover:border-cal-primary hover:bg-cal-primary hover:text-cal-on-primary transition-colors cursor-pointer"
                      >
                        <span>Manage</span>
                        <ChevronRight size={13.5} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default StaffListView;
