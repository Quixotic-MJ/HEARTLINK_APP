import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Crown,
  Gift,
  Info,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import LoadError from "../../../components/ui/LoadError";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";
import { useApiQuery } from "../../../hooks/useApiQuery";

// HL-084: HeartLink Premium for admins: the plan settings, who is on Premium, and every change.
// Checkout is a demo (test mode): no real money moves, so "revenue" is what test payments would have been.

const whole = (label, max) =>
  z.coerce
    .number({ message: `${label} must be a number.` })
    .int(`${label} must be a whole number.`)
    .min(0, `${label} can't be negative.`)
    .max(max, `${label} is at most ${max.toLocaleString()}.`);

const settingsSchema = z.object({
  monthly_price_php: whole("Monthly price", 100000),
  yearly_price_php: whole("Yearly price", 1000000),
  trial_days: whole("Trial length", 90),
  checkout_enabled: z.boolean(),
});

const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;

const dateLabel = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const PERIOD_WORDS = { monthly: "1 month", yearly: "1 year" };

const EVENT_FILTERS = [
  ["all", "All activity"],
  ["checkout", "Payments"],
  ["trial_started", "Trials"],
  ["admin", "Admin changes"],
];

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold leading-none whitespace-nowrap";

function describeEvent(e) {
  switch (e.kind) {
    case "trial_started":
      return "Started the free trial";
    case "checkout":
      return `Paid ${peso(e.amount_php)} for ${
        PERIOD_WORDS[e.period] || e.period
      } with ${e.method === "gcash" ? "GCash" : "card"} (test)`;
    case "admin_granted":
      return `Given Premium${e.actor_name ? ` by ${e.actor_name}` : ""}`;
    case "admin_removed":
      return `Premium removed${e.actor_name ? ` by ${e.actor_name}` : ""}`;
    default:
      return e.kind;
  }
}

function getEventBadge(kind) {
  switch (kind) {
    case "checkout":
      return {
        label: "Test payment",
        tone: "border-cal-success/25 bg-cal-success/10 text-cal-ink",
        dot: "bg-cal-success",
      };
    case "trial_started":
      return {
        label: "Free trial",
        tone: "border-cal-badge-violet/30 bg-cal-badge-violet/15 text-cal-ink",
        dot: "bg-cal-badge-violet",
      };
    case "admin_granted":
      return {
        label: "Granted",
        tone: "border-cal-warning/35 bg-cal-warning/15 text-cal-ink",
        dot: "bg-cal-warning",
      };
    case "admin_removed":
      return {
        label: "Removed",
        tone: "border-cal-hairline bg-cal-surface-card text-cal-muted",
        dot: "bg-cal-muted",
      };
    default:
      return {
        label: kind,
        tone: "border-cal-hairline bg-cal-surface-soft text-cal-ink",
        dot: "bg-cal-muted",
      };
  }
}

function PlanSettingsForm({ config }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: config,
    mode: "onTouched",
  });

  const watched = useWatch({ control });
  const monthly = Number(watched?.monthly_price_php ?? config.monthly_price_php) || 0;
  const yearly = Number(watched?.yearly_price_php ?? config.yearly_price_php) || 0;
  const checkoutEnabled = Boolean(
    watched?.checkout_enabled ?? config.checkout_enabled
  );
  const saving = monthly * 12 - yearly;

  const save = async (values) => {
    try {
      await apiFetch("/api/admin/premium/config", {
        method: "PUT",
        body: JSON.stringify(values),
      });
      toast.success("Premium settings saved", {
        description: "The mobile app shows the updated prices straight away.",
      });
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't save the Premium settings.");
    }
  };

  const renderField = (name, label, suffix, hint) => {
    const hasErr = Boolean(errors[name]);
    return (
      <div>
        <label
          htmlFor={name}
          className="mb-1.5 block text-[13px] font-medium text-cal-ink"
        >
          {label}
        </label>
        <div className="relative">
          <input
            id={name}
            type="number"
            inputMode="numeric"
            min="0"
            {...register(name)}
            aria-invalid={hasErr}
            className={`h-10 w-full rounded-[8px] border bg-cal-canvas pl-3.5 pr-16 font-cal-mono text-[14px] tabular-nums text-cal-ink outline-none transition-colors ${
              hasErr
                ? "border-cal-error focus:border-cal-error"
                : "border-cal-hairline focus:border-cal-ink"
            }`}
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-cal-mono text-[12px] font-medium uppercase text-cal-muted">
            {suffix}
          </span>
        </div>
        {hasErr ? (
          <p className="mt-1 text-[12px] font-medium text-cal-error">
            {errors[name].message}
          </p>
        ) : hint ? (
          <p className="mt-1 text-[12px] text-cal-muted">{hint}</p>
        ) : null}
      </div>
    );
  };

  return (
    <form
      onSubmit={handleSubmit(save)}
      noValidate
      className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cal-hairline px-5 py-4">
        <div>
          <h3 className="text-[15px] font-semibold text-cal-ink">
            Plan settings
          </h3>
          <p className="mt-0.5 text-[12.5px] text-cal-muted">
            What patients see on the Premium screen in the mobile app.
          </p>
        </div>

        <span
          className={`${PILL} ${
            checkoutEnabled
              ? "border-cal-success/25 bg-cal-success/10 text-cal-ink"
              : "border-cal-warning/35 bg-cal-warning/15 text-cal-ink"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              checkoutEnabled ? "bg-cal-success" : "bg-cal-warning"
            }`}
          />
          <span>
            {checkoutEnabled ? "Open for sign-ups" : "Sign-ups paused"}
          </span>
        </span>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {renderField(
            "monthly_price_php",
            "Monthly price",
            "PHP",
            "Standard monthly billing rate."
          )}
          {renderField(
            "yearly_price_php",
            "Yearly price",
            "PHP",
            saving > 0
              ? `Patients save ${peso(saving)} against 12 months.`
              : "Yearly isn't cheaper than 12 months."
          )}
          {renderField(
            "trial_days",
            "Free trial",
            "days",
            "0 turns the free trial off."
          )}
        </div>

        <label className="flex items-start gap-3 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-4 cursor-pointer transition-colors hover:bg-cal-surface-card/60">
          <input
            type="checkbox"
            {...register("checkout_enabled")}
            className="mt-0.5 h-4 w-4 rounded border-cal-hairline accent-cal-primary cursor-pointer"
          />
          <span>
            <span className="block text-[13.5px] font-semibold text-cal-ink">
              Open for new sign-ups
            </span>
            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-cal-muted">
              When off, patients can&apos;t start a trial or pay. Anyone already
              on Premium keeps their access.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cal-hairline bg-cal-surface-soft/50 px-5 py-3.5">
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-cal-muted">
          <Info size={14} className="shrink-0 text-cal-muted" aria-hidden="true" />
          <span>Test mode: no real money is charged.</span>
        </span>

        <button
          type="submit"
          disabled={!isDirty || isSubmitting}
          className="inline-flex h-10 items-center justify-center rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[13.5px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

function ChangesTable({ events = [] }) {
  const [filterKind, setFilterKind] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: events.length,
      checkout: events.filter((e) => e.kind === "checkout").length,
      trial_started: events.filter((e) => e.kind === "trial_started").length,
      admin: events.filter(
        (e) => e.kind === "admin_granted" || e.kind === "admin_removed"
      ).length,
    }),
    [events]
  );

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((e) => {
      const matchesKind =
        filterKind === "all" ||
        (filterKind === "admin"
          ? e.kind === "admin_granted" || e.kind === "admin_removed"
          : e.kind === filterKind);
      const matchesSearch =
        !q ||
        (e.user_name || "").toLowerCase().includes(q) ||
        (e.actor_name || "").toLowerCase().includes(q) ||
        describeEvent(e).toLowerCase().includes(q);
      return matchesKind && matchesSearch;
    });
  }, [events, filterKind, searchQuery]);

  return (
    <section className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="space-y-3 border-b border-cal-hairline px-4 py-4 sm:px-5">
        <div>
          <h3 className="text-[15px] font-semibold text-cal-ink">
            Recent changes
          </h3>
          <p className="mt-0.5 text-[12.5px] text-cal-muted">
            Trials, test payments, and Premium granted or removed by admins.
          </p>
        </div>

        {events.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 select-none">
            <div
              role="group"
              aria-label="Filter Premium activity"
              className="relative inline-flex flex-wrap items-center gap-1 rounded-[16px] sm:rounded-full border border-cal-hairline/80 bg-cal-surface-soft p-1 select-none"
            >
              {EVENT_FILTERS.map(([key, label]) => {
                const active = filterKind === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilterKind(key)}
                    className={`group relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors cursor-pointer select-none ${
                      active
                        ? "text-white font-semibold"
                        : "text-cal-muted hover:text-cal-ink active:scale-[0.98]"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="premium-filter-active-tab"
                        className="absolute inset-0 rounded-full bg-cal-primary shadow-[0_1px_3px_rgba(59,130,246,0.35)]"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 34,
                        }}
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                    <span
                      className={`relative z-10 font-cal-mono text-[11.5px] tabular-nums rounded-full px-1.5 py-0.5 transition-colors ${
                        active
                          ? "bg-white/20 text-white font-medium border border-white/20"
                          : "bg-cal-surface-card text-cal-muted-soft"
                      }`}
                    >
                      {counts[key]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-72">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cal-muted-soft"
              />
              <input
                type="text"
                aria-label="Search Premium activity"
                placeholder="Search patient or event…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas pl-9 pr-8 text-[13.5px] text-cal-ink placeholder:text-cal-muted-soft focus:border-cal-ink focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-cal-muted hover:text-cal-ink cursor-pointer"
                >
                  <X size={13.5} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-muted">
            <Crown size={18} />
          </div>
          <p className="text-[14px] font-semibold text-cal-ink">
            No Premium activity yet
          </p>
          <p className="max-w-sm text-[13px] text-cal-muted">
            Trials, test payments, and admin grants will appear here as patients
            enroll.
          </p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
          <p className="text-[14px] font-semibold text-cal-ink">
            No activity matches your filter
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterKind("all");
              setSearchQuery("");
            }}
            className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-cal-primary px-4 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
          >
            <RotateCcw size={13.5} />
            <span>Reset filters</span>
          </button>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-cal-hairline bg-cal-surface-soft/70">
                <th
                  scope="col"
                  className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted"
                >
                  When
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted"
                >
                  Patient
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted"
                >
                  What happened
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 sm:px-5 text-right text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted"
                >
                  Premium until
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cal-hairline">
              {filteredEvents.map((e) => {
                const badge = getEventBadge(e.kind);
                return (
                  <tr
                    key={e.id || `${e.user_id}-${e.created_at}`}
                    className="transition-colors hover:bg-cal-surface-soft/70"
                  >
                    <td className="px-4 py-3.5 sm:px-5 align-middle font-cal-mono text-[12.5px] tabular-nums text-cal-muted whitespace-nowrap">
                      {dateLabel(e.created_at)}
                    </td>
                    <td className="px-4 py-3.5 sm:px-5 align-middle text-[13.5px] font-semibold text-cal-ink">
                      {e.user_name}
                    </td>
                    <td className="px-4 py-3.5 sm:px-5 align-middle">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`${PILL} ${badge.tone}`}>
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${badge.dot}`}
                          />
                          <span>{badge.label}</span>
                        </span>
                        <span className="text-[13.5px] text-cal-ink">
                          {describeEvent(e)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 sm:px-5 text-right align-middle font-cal-mono text-[12.5px] tabular-nums text-cal-muted whitespace-nowrap">
                      {e.kind === "admin_removed"
                        ? "—"
                        : dateLabel(e.premium_until)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const Premium = () => {
  const overview = useApiQuery("/api/admin/premium");
  const data = overview.data;

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        {/* ─── 1. EDITORIAL PAGE HEADER ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-canvas px-3 py-1 text-[12px] font-medium text-cal-muted">
              <Crown size={13.5} className="text-cal-ink" />
              <span>Users &amp; feedback · Subscription plans</span>
            </div>
            <h2 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.15] text-cal-ink">
              HeartLink Premium
            </h2>
            <p className="mt-1.5 max-w-[64ch] text-[14px] leading-[1.5] text-cal-muted">
              Plan settings and who is on Premium. Give or remove Premium for an
              individual patient from Users &rsaquo; Manage.
            </p>
          </div>

          <Link
            to="/users"
            className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors"
          >
            <Users size={15} className="text-cal-muted" />
            <span>Manage patient accounts</span>
            <ArrowUpRight size={14} className="text-cal-muted" />
          </Link>
        </div>

        {/* ─── 2. BODY: LOADING / ERROR / CONTENT ───────────────────────────── */}
        {overview.isPending ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  className="h-28 rounded-[12px] bg-cal-surface-card"
                />
              ))}
            </div>
            <Skeleton className="h-72 rounded-[12px] bg-cal-surface-card" />
            <Skeleton className="h-64 rounded-[12px] bg-cal-surface-card" />
          </div>
        ) : overview.isError || !data ? (
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-8">
            <LoadError what="Premium" onRetry={overview.refetch} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 4-Column KPI Summary Strip */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-cal-muted">
                    Premium members
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-warning/35 bg-cal-warning/15 text-cal-ink">
                    <Crown size={14.5} aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
                  {data.premium_members}
                </div>
                <div className="mt-2 text-[12px] text-cal-muted">
                  of{" "}
                  <span className="font-cal-mono font-medium tabular-nums text-cal-ink">
                    {data.patients}
                  </span>{" "}
                  registered patients
                </div>
              </div>

              <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-cal-muted">
                    On free trial
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-badge-violet/30 bg-cal-badge-violet/15 text-cal-ink">
                    <Sparkles size={14.5} aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
                  {data.on_trial}
                </div>
                <div className="mt-2 text-[12px] text-cal-muted">
                  Active trial period
                </div>
              </div>

              <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-cal-muted">
                    Given by admins
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-success/25 bg-cal-success/10 text-cal-success">
                    <Gift size={14.5} aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
                  {data.by_admin}
                </div>
                <div className="mt-2 text-[12px] text-cal-muted">
                  Complimentary access
                </div>
              </div>

              <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-cal-muted">
                    Test payments (total)
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
                    <Wallet size={14.5} aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
                  {peso(data.demo_revenue_php)}
                </div>
                <div className="mt-2 text-[12px] text-cal-muted">
                  Simulated checkout volume
                </div>
              </div>
            </div>

            {/* Plan Settings Form */}
            <PlanSettingsForm
              key={JSON.stringify(data.config)}
              config={data.config}
            />

            {/* Activity Audit Table */}
            <ChangesTable events={data.events} />

            {/* Clinical Safety Guarantee Banner */}
            <div className="flex items-center gap-2.5 rounded-[10px] border border-cal-hairline bg-cal-surface-soft px-4 py-3 text-[13px] text-cal-muted">
              <ShieldCheck
                size={15.5}
                className="shrink-0 text-cal-success"
                aria-hidden="true"
              />
              <span>
                Safety features stay free for every patient: check-ins,
                emergency warnings, clinics, reminders, and the heart score.
              </span>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Premium;
