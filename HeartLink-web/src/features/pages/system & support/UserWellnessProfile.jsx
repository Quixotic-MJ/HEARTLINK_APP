import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Apple,
  ArrowLeft,
  Clock,
  Flame,
  HeartPulse,
  Moon,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import { useApiQuery } from "../../../hooks/useApiQuery";
import LoadError from "../../../components/ui/LoadError";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useAuth } from "../../../contexts/useAuth";
import { formatUserRef } from "../../../utils/formatUserRef";

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap";

const normalizeHssTier = (score, tier) => {
  if (score !== undefined && score !== null) {
    if (score >= 80) return "Stable";
    if (score >= 60) return "Moderate";
    if (score >= 50) return "Elevated Risk";
    return "Critical";
  }
  if (!tier) return "N/A";
  const t = tier.toLowerCase();
  if (t.includes("low")) return "Stable";
  if (t.includes("medium") || t.includes("mid") || t.includes("moderate")) return "Moderate";
  if (t.includes("high") || t.includes("elevated")) return "Elevated Risk";
  if (t.includes("critical")) return "Critical";
  return tier;
};

const UserWellnessProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserRole = user?.role || "admin";
  const [activeTab, setActiveTab] = useState("overview");

  const profileQuery = useApiQuery(`/api/users/${id}/profile`);
  // The timeline is extra: if it can't load, the tab just shows no events
  const timelineQuery = useApiQuery(`/api/admin/users/${id}/timeline`);
  const data = profileQuery.data ?? null;
  const timeline = timelineQuery.data || [];

  if (profileQuery.isPending) {
    return (
      <AdminLayout>
        <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
          <Skeleton className="h-9 w-36 rounded-[8px] bg-cal-surface-strong/60" />
          <Skeleton className="h-28 w-full rounded-[12px] bg-cal-surface-strong/60" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <Skeleton className="h-60 w-full rounded-[12px] bg-cal-surface-strong/60" />
            <Skeleton className="h-60 w-full rounded-[12px] bg-cal-surface-strong/60" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  // A real "not found" keeps its message; anything else (network, server) can be retried
  if (profileQuery.isError && profileQuery.error?.status !== 404) {
    return (
      <AdminLayout>
        <div className="mx-auto w-full max-w-[1440px] font-cal-sans text-cal-ink">
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <LoadError what="this profile" onRetry={profileQuery.refetch} />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="mx-auto w-full max-w-[1440px] font-cal-sans text-cal-ink">
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-10 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="mx-auto mb-3.5 flex h-10 w-10 items-center justify-center rounded-full border border-cal-error/25 bg-cal-error/10 text-cal-error">
              <AlertTriangle size={18} />
            </div>
            <h2 className="font-cal-display text-[20px] font-semibold tracking-[-0.4px] text-cal-ink">
              User not found
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-cal-muted">
              The requested wellness profile could not be located.
            </p>
            <button
              type="button"
              onClick={() => navigate("/users")}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
            >
              Back to directory
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const { profile, baselines } = data;
  const isActive = (profile.account_status || "").toLowerCase() === "active";

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "biometrics", label: "Biometrics & goals", icon: Activity },
    { id: "lifestyle", label: "Lifestyle & diet", icon: Apple },
    { id: "baselines", label: "Health baselines", icon: HeartPulse },
    { id: "timeline", label: "Health timeline", icon: Clock },
  ];

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        {/* Back Button */}
        <div>
          <button
            type="button"
            onClick={() => navigate("/users")}
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-medium text-cal-body hover:bg-cal-surface-card hover:text-cal-ink transition-colors cursor-pointer"
          >
            <ArrowLeft size={14.5} />
            <span>Back to directory</span>
          </button>
        </div>

        {/* Main Profile Header Card */}
        <div className="flex flex-col items-start justify-between gap-5 rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft font-cal-display text-[19px] font-semibold text-cal-ink">
              {profile.first_name ? profile.first_name.charAt(0).toUpperCase() : "P"}
            </div>
            <div>
              <h1 className="font-cal-display text-[26px] sm:text-[28px] font-semibold tracking-[-0.6px] leading-[1.15] text-cal-ink">
                User {formatUserRef(profile.id)}
              </h1>
              <p className="mt-0.5 text-[13px] text-cal-muted">
                Anonymized patient wellness &amp; baseline profile
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                {isActive ? (
                  <span className={`${PILL} border-cal-success/25 bg-cal-success/10 text-cal-ink`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-cal-success" />
                    <span className="capitalize">{profile.account_status || "Active"}</span>
                  </span>
                ) : (
                  <span className={`${PILL} border-cal-error/25 bg-cal-error/10 text-cal-ink`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-cal-error" />
                    <span className="capitalize">{profile.account_status || "Disabled"}</span>
                  </span>
                )}
                {profile.created_at && (
                  <span className="inline-flex items-center gap-1.5 font-cal-mono text-[12px] text-cal-muted">
                    <Clock size={12.5} />
                    <span>
                      Registered {new Date(profile.created_at).toLocaleDateString()}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {(currentUserRole === "admin" || currentUserRole === "medical_expert") && (
            <button
              type="button"
              onClick={() => navigate(`/patients/${profile.id}`)}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
            >
              <Stethoscope size={15} />
              <span>Open clinical logs</span>
            </button>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar Navigation */}
          <div className="lg:w-60 shrink-0">
            <nav
              aria-label="Wellness profile sections"
              className="sticky top-6 space-y-1 rounded-[12px] border border-cal-hairline bg-cal-canvas p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] select-none"
            >
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`group relative flex w-full items-center gap-2.5 rounded-[8px] px-3.5 py-2.5 text-left text-[13px] transition-colors cursor-pointer select-none ${
                      active
                        ? "text-white font-semibold"
                        : "font-medium text-cal-muted hover:bg-cal-surface-soft hover:text-cal-ink active:scale-[0.98]"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="wellness-drawer-active-tab"
                        className="absolute inset-0 rounded-[8px] bg-cal-primary shadow-[0_1px_3px_rgba(59,130,246,0.35)]"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 32,
                        }}
                      />
                    )}
                    <Icon
                      size={15}
                      className={`relative z-10 shrink-0 transition-transform duration-200 ${
                        active ? "scale-105 text-white" : "text-cal-muted group-hover:text-cal-ink"
                      }`}
                    />
                    <span className="relative z-10">{t.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="min-w-0 flex-1">
            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                <h2 className="font-cal-display text-[20px] font-semibold tracking-[-0.4px] text-cal-ink">
                  User overview
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <h3 className="mb-3 text-[12px] font-semibold text-cal-muted">
                      Privacy shield
                    </h3>
                    <div className="flex items-start gap-2.5 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-3.5">
                      <ShieldCheck size={16} className="mt-0.5 shrink-0 text-cal-ink" />
                      <div>
                        <p className="text-[13px] font-semibold text-cal-ink">
                          Anonymized for clinical privacy
                        </p>
                        <p className="mt-1 text-[12.5px] leading-[1.5] text-cal-muted">
                          Direct identifiers are shielded to protect patient privacy. Only baseline habits and wellness telemetry are shown here.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <h3 className="mb-3 text-[12px] font-semibold text-cal-muted">
                      Engagement
                    </h3>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[12px] font-medium text-cal-muted">
                          Onboarding status
                        </p>
                        <p className="mt-1 font-cal-display text-[22px] font-semibold tracking-[-0.4px] capitalize text-cal-ink">
                          {profile.onboarding_status || "Completed"}
                        </p>
                      </div>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
                        <Activity size={16} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BIOMETRICS */}
            {activeTab === "biometrics" && (
              <div className="space-y-4">
                <h2 className="font-cal-display text-[20px] font-semibold tracking-[-0.4px] text-cal-ink">
                  Biometrics &amp; goals
                </h2>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <p className="text-[12px] font-medium text-cal-muted">Height</p>
                    <p className="mt-1.5 font-cal-display text-[24px] font-semibold tracking-[-0.5px] text-cal-ink">
                      {profile.height_cm ?? "—"}{" "}
                      <span className="font-cal-sans text-[12px] font-normal text-cal-muted">
                        cm
                      </span>
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <p className="text-[12px] font-medium text-cal-muted">Weight</p>
                    <p className="mt-1.5 font-cal-display text-[24px] font-semibold tracking-[-0.5px] text-cal-ink">
                      {profile.weight_kg ?? "—"}{" "}
                      <span className="font-cal-sans text-[12px] font-normal text-cal-muted">
                        kg
                      </span>
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <p className="text-[12px] font-medium text-cal-muted">Sex</p>
                    <p className="mt-1.5 font-cal-display text-[22px] font-semibold tracking-[-0.4px] capitalize text-cal-ink">
                      {profile.sex || "N/A"}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <p className="text-[12px] font-medium text-cal-muted">Age</p>
                    <p className="mt-1.5 font-cal-display text-[24px] font-semibold tracking-[-0.5px] text-cal-ink">
                      {profile.date_of_birth
                        ? new Date().getFullYear() -
                          new Date(profile.date_of_birth).getFullYear()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <h3 className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold text-cal-ink">
                    <Flame size={14} className="text-cal-muted" />
                    <span>Primary health goals</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.health_goals && profile.health_goals.length > 0 ? (
                      profile.health_goals.map((goal) => (
                        <span
                          key={goal}
                          className="inline-flex items-center rounded-full border border-cal-hairline bg-cal-surface-soft px-3 py-1 text-[12.5px] font-medium capitalize text-cal-ink"
                        >
                          {goal}
                        </span>
                      ))
                    ) : (
                      <p className="text-[13px] text-cal-muted">
                        No specific health goals logged.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* LIFESTYLE & DIET */}
            {activeTab === "lifestyle" && (
              <div className="space-y-4">
                <h2 className="font-cal-display text-[20px] font-semibold tracking-[-0.4px] text-cal-ink">
                  Lifestyle &amp; diet profile
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <h3 className="mb-3.5 flex items-center gap-2 text-[12.5px] font-semibold text-cal-ink">
                      <Moon size={14} className="text-cal-muted" />
                      <span>Lifestyle habits</span>
                    </h3>
                    {baselines?.lifestyle ? (
                      <div className="divide-y divide-cal-hairline text-[13px]">
                        <div className="flex items-center justify-between py-2.5 first:pt-0">
                          <span className="text-cal-muted">Smoking status</span>
                          <span className="font-semibold capitalize text-cal-ink">
                            {baselines.lifestyle.smoking_status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2.5">
                          <span className="text-cal-muted">Avg. sleep</span>
                          <span className="font-cal-mono font-semibold text-cal-ink">
                            {baselines.lifestyle.avg_sleep_hours} h
                          </span>
                        </div>
                        {baselines.lifestyle.family_history !== undefined && (
                          <div className="flex items-center justify-between py-2.5 last:pb-0">
                            <span className="text-cal-muted">Family history</span>
                            <span className="font-semibold text-cal-ink">
                              {baselines.lifestyle.family_history ? "Yes" : "No"}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[13px] text-cal-muted">
                        No lifestyle baseline available.
                      </p>
                    )}
                  </div>

                  <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <h3 className="mb-3.5 flex items-center gap-2 text-[12.5px] font-semibold text-cal-ink">
                      <Apple size={14} className="text-cal-muted" />
                      <span>Dietary baseline</span>
                    </h3>
                    {baselines?.dietary ? (
                      <div className="divide-y divide-cal-hairline text-[13px]">
                        <div className="flex items-center justify-between py-2.5 first:pt-0">
                          <span className="text-cal-muted">Dietary practice</span>
                          <span className="font-semibold text-cal-ink">
                            {baselines.dietary.dietary_practice}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2.5">
                          <span className="text-cal-muted">Sodium frequency</span>
                          <span className="font-semibold capitalize text-cal-ink">
                            {baselines.dietary.sodium_frequency}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2.5 last:pb-0">
                          <span className="text-cal-muted">Allergies</span>
                          <span className="font-semibold text-cal-ink">
                            {baselines.dietary.allergies?.join(", ") || "None"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[13px] text-cal-muted">
                        No dietary baseline available.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* HEALTH BASELINES */}
            {activeTab === "baselines" && (
              <div className="space-y-4">
                <h2 className="font-cal-display text-[20px] font-semibold tracking-[-0.4px] text-cal-ink">
                  Health baselines
                </h2>
                {baselines?.clinical ? (
                  <>
                    <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                      <h3 className="mb-3.5 text-[12.5px] font-semibold text-cal-muted">
                        Core vitals
                      </h3>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                          <p className="text-[12px] font-medium text-cal-muted">Resting BP</p>
                          <p className="mt-1 font-cal-display text-[22px] font-semibold tracking-[-0.5px] text-cal-ink">
                            {baselines.clinical.resting_bp_mmhg || "—"}{" "}
                            <span className="font-cal-sans text-[11.5px] font-normal text-cal-muted">
                              mmHg
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[12px] font-medium text-cal-muted">Max HR</p>
                          <p className="mt-1 font-cal-display text-[22px] font-semibold tracking-[-0.5px] text-cal-ink">
                            {baselines.clinical.max_heart_rate_bpm || "—"}{" "}
                            <span className="font-cal-sans text-[11.5px] font-normal text-cal-muted">
                              bpm
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[12px] font-medium text-cal-muted">Cholesterol</p>
                          <p className="mt-1 font-cal-display text-[22px] font-semibold tracking-[-0.5px] text-cal-ink">
                            {baselines.clinical.serum_cholesterol || "—"}{" "}
                            <span className="font-cal-sans text-[11.5px] font-normal text-cal-muted">
                              mg/dL
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[12px] font-medium text-cal-muted">
                            Fasting blood sugar
                          </p>
                          <p className="mt-1 font-cal-display text-[20px] font-semibold tracking-[-0.4px] text-cal-ink">
                            {baselines.clinical.fasting_blood_sugar ? "Elevated" : "Normal"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                        <h3 className="mb-3 text-[12.5px] font-semibold text-cal-muted">
                          Reported conditions
                        </h3>
                        {baselines.clinical.diagnosed_conditions &&
                        baselines.clinical.diagnosed_conditions.length > 0 ? (
                          <ul className="space-y-2">
                            {baselines.clinical.diagnosed_conditions.map((cond, i) => (
                              <li
                                key={i}
                                className="flex items-center gap-2 text-[13px] font-semibold capitalize text-cal-ink"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-cal-ink" />
                                <span>{cond}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[13px] text-cal-muted">None reported.</p>
                        )}
                      </div>

                      <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                        <h3 className="mb-3 text-[12.5px] font-semibold text-cal-muted">
                          Health flags
                        </h3>
                        <div className="divide-y divide-cal-hairline text-[13px]">
                          <div className="flex items-center justify-between py-2 first:pt-0">
                            <span className="text-cal-muted">On medication</span>
                            <span className="font-semibold text-cal-ink">
                              {baselines.clinical.on_medication ? "Yes" : "No"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-cal-muted">Chest pain type</span>
                            <span className="font-semibold text-cal-ink">
                              {baselines.clinical.chest_pain_type || "None"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2 last:pb-0">
                            <span className="text-cal-muted">Exercise angina</span>
                            <span className="font-semibold text-cal-ink">
                              {baselines.clinical.exercise_angina ? "Yes" : "No"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center rounded-[12px] border border-cal-hairline bg-cal-canvas p-10 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <Stethoscope size={24} className="mb-2 text-cal-muted" />
                    <p className="text-[13.5px] font-medium text-cal-muted">
                      No health baselines recorded yet.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* HEALTH TIMELINE */}
            {activeTab === "timeline" && (
              <div className="space-y-4">
                <h2 className="font-cal-display text-[20px] font-semibold tracking-[-0.4px] text-cal-ink">
                  Chronological health timeline
                </h2>

                <div className="relative rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  {timeline && timeline.length > 0 ? (
                    <div className="relative ml-3 space-y-6 border-l border-cal-hairline pb-2 md:ml-4">
                      {timeline.map((item, index) => {
                        const normalizeTimelineType = (type) => {
                          if (!type) return "";
                          const lower = type.toLowerCase();
                          if (lower === "vitals") return "vital";
                          if (lower === "symptoms") return "symptom";
                          return lower;
                        };
                        const normalizedType = normalizeTimelineType(item.type);

                        let iconColor = "border-cal-hairline bg-cal-surface-soft text-cal-ink";
                        let Icon = Activity;
                        let typeLabel = "Log";

                        if (normalizedType === "vital") {
                          iconColor = "border-cal-error/25 bg-cal-error/10 text-cal-error";
                          Icon = HeartPulse;
                          typeLabel = "Vitals";
                        } else if (normalizedType === "symptom") {
                          iconColor = "border-cal-warning/35 bg-cal-warning/15 text-cal-ink";
                          Icon = AlertTriangle;
                          typeLabel = "Symptoms";
                        } else if (normalizedType === "meal") {
                          iconColor =
                            "border-cal-badge-emerald/35 bg-cal-badge-emerald/15 text-cal-ink";
                          Icon = Apple;
                          typeLabel = "Meal";
                        } else if (normalizedType === "exercise") {
                          iconColor =
                            "border-cal-badge-orange/35 bg-cal-badge-orange/15 text-cal-ink";
                          Icon = Flame;
                          typeLabel = "Exercise";
                        } else if (normalizedType === "sleep") {
                          iconColor =
                            "border-cal-badge-violet/30 bg-cal-badge-violet/10 text-cal-ink";
                          Icon = Moon;
                          typeLabel = "Sleep";
                        } else if (normalizedType === "hss") {
                          iconColor = "border-cal-hairline bg-cal-surface-card text-cal-ink";
                          Icon = ShieldCheck;
                          typeLabel = "HSS update";
                        }

                        return (
                          <div key={index} className="relative pl-6 md:pl-8">
                            <div
                              className={`absolute -left-[17px] top-0.5 flex h-8 w-8 items-center justify-center rounded-full border ${iconColor}`}
                            >
                              <Icon size={14} />
                            </div>

                            <div className="mb-1.5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                              <span className="text-[12px] font-semibold text-cal-ink">
                                {typeLabel}
                              </span>
                              <span className="font-cal-mono text-[11.5px] text-cal-muted">
                                {new Date(item.timestamp).toLocaleString()}
                              </span>
                            </div>

                            <div className="rounded-[10px] border border-cal-hairline bg-cal-surface-soft/60 p-3.5">
                              {normalizedType === "vital" && (
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                  {item.data.systolic && item.data.diastolic && (
                                    <div>
                                      <p className="text-[11.5px] font-medium text-cal-muted">
                                        Blood pressure
                                      </p>
                                      <p className="mt-0.5 font-cal-mono text-[13.5px] font-semibold text-cal-ink">
                                        {item.data.systolic}/{item.data.diastolic}{" "}
                                        <span className="font-cal-sans text-[11px] font-normal text-cal-muted">
                                          mmHg
                                        </span>
                                      </p>
                                    </div>
                                  )}
                                  {item.data.heart_rate && (
                                    <div>
                                      <p className="text-[11.5px] font-medium text-cal-muted">
                                        Heart rate
                                      </p>
                                      <p className="mt-0.5 font-cal-mono text-[13.5px] font-semibold text-cal-ink">
                                        {item.data.heart_rate}{" "}
                                        <span className="font-cal-sans text-[11px] font-normal text-cal-muted">
                                          bpm
                                        </span>
                                      </p>
                                    </div>
                                  )}
                                  {item.data.blood_sugar && (
                                    <div>
                                      <p className="text-[11.5px] font-medium text-cal-muted">
                                        Blood sugar
                                      </p>
                                      <p className="mt-0.5 font-cal-mono text-[13.5px] font-semibold text-cal-ink">
                                        {item.data.blood_sugar}{" "}
                                        <span className="font-cal-sans text-[11px] font-normal text-cal-muted">
                                          mg/dL
                                        </span>
                                      </p>
                                    </div>
                                  )}
                                  {item.data.weight_kg && (
                                    <div>
                                      <p className="text-[11.5px] font-medium text-cal-muted">
                                        Weight
                                      </p>
                                      <p className="mt-0.5 font-cal-mono text-[13.5px] font-semibold text-cal-ink">
                                        {item.data.weight_kg}{" "}
                                        <span className="font-cal-sans text-[11px] font-normal text-cal-muted">
                                          kg
                                        </span>
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {normalizedType === "symptom" && (
                                <div>
                                  <p className="text-[11.5px] font-medium text-cal-muted">
                                    Symptoms reported
                                  </p>
                                  <p className="mt-0.5 text-[13.5px] font-semibold capitalize text-cal-ink">
                                    {item.data.symptoms?.join(", ") || "No specific symptoms"}
                                  </p>
                                  {item.data.severity_map &&
                                    Object.keys(item.data.severity_map).length > 0 && (
                                      <p className="mt-1 text-[12px] text-cal-body">
                                        Severity:{" "}
                                        {Object.entries(item.data.severity_map)
                                          .map(([k, v]) => `${k.replace("_", " ")} (${v})`)
                                          .join(", ")}
                                      </p>
                                    )}
                                  {item.data.context && (
                                    <p className="mt-1 text-[12px] italic text-cal-muted">
                                      Context: &ldquo;{item.data.context}&rdquo;
                                    </p>
                                  )}
                                </div>
                              )}

                              {normalizedType === "meal" && (
                                <div>
                                  <p className="text-[13.5px] font-semibold text-cal-ink">
                                    {item.data.meal_name || "Logged meal"}
                                  </p>
                                  <p className="mt-0.5 font-cal-mono text-[12px] text-cal-muted">
                                    {item.data.calories ? `${item.data.calories} kcal` : ""}
                                    {item.data.calories && item.data.sodium_mg ? " · " : ""}
                                    {item.data.sodium_mg
                                      ? `Sodium: ${item.data.sodium_mg} mg`
                                      : ""}
                                  </p>
                                </div>
                              )}

                              {normalizedType === "exercise" && (
                                <div>
                                  <p className="text-[13.5px] font-semibold text-cal-ink">
                                    {item.data.routine_name || "Custom exercise"}
                                  </p>
                                  <div className="mt-1 flex flex-wrap gap-3 text-[12px] text-cal-muted">
                                    <span>
                                      <strong className="font-cal-mono font-semibold text-cal-ink">
                                        {item.data.duration_minutes}
                                      </strong>{" "}
                                      min duration
                                    </span>
                                    {item.data.status && (
                                      <span className="capitalize">
                                        Status:{" "}
                                        <strong className="font-semibold text-cal-ink">
                                          {item.data.status}
                                        </strong>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {normalizedType === "sleep" && (
                                <div className="flex flex-wrap gap-3 text-[12px] text-cal-muted">
                                  <span>
                                    <strong className="font-cal-mono font-semibold text-cal-ink">
                                      {item.data.duration_hours}
                                    </strong>{" "}
                                    hours slept
                                  </span>
                                  {item.data.quality && (
                                    <span className="capitalize">
                                      Quality:{" "}
                                      <strong className="font-semibold text-cal-ink">
                                        {item.data.quality}
                                      </strong>
                                    </span>
                                  )}
                                </div>
                              )}

                              {normalizedType === "hss" && (
                                <div className="flex items-center gap-4">
                                  <div>
                                    <p className="text-[11.5px] font-medium text-cal-muted">
                                      HSS tier updated
                                    </p>
                                    <p className="mt-0.5 text-[13.5px] font-semibold text-cal-ink">
                                      {normalizeHssTier(item.data.score, item.data.tier)}
                                    </p>
                                  </div>
                                  <div className="h-7 w-px bg-cal-hairline" />
                                  <div>
                                    <p className="text-[11.5px] font-medium text-cal-muted">
                                      Score
                                    </p>
                                    <p className="mt-0.5 font-cal-mono text-[13.5px] font-semibold text-cal-ink">
                                      {item.data.score}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Clock size={24} className="mb-2 text-cal-muted" />
                      <h3 className="text-[14px] font-semibold text-cal-ink">
                        No timeline data
                      </h3>
                      <p className="mt-1 max-w-sm text-[13px] text-cal-muted">
                        There are no recent logs, vital readings, or HSS updates recorded for this user.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserWellnessProfile;
