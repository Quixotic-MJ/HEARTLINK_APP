import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Crown, Users, Sparkles, Gift, Wallet, Info } from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import LoadError from "../../../components/ui/LoadError";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";
import { useApiQuery } from "../../../hooks/useApiQuery";
import { UI, FONTS } from "../../../styles/tokens";
import { KpiCard, PageHeader } from "../../../styles/designSystem";

// HL-084: HeartLink Premium for admins: the plan settings, who is on Premium, and every change.
// Checkout is a demo (test mode): no real money moves, so "revenue" is what test payments would have been.

const whole = (label, max) =>
  z.coerce.number({ message: `${label} must be a number.` }).int(`${label} must be a whole number.`).min(0, `${label} can't be negative.`).max(max, `${label} is at most ${max.toLocaleString()}.`);

const settingsSchema = z.object({
  monthly_price_php: whole("Monthly price", 100000),
  yearly_price_php: whole("Yearly price", 1000000),
  trial_days: whole("Trial length", 90),
  checkout_enabled: z.boolean(),
});

const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;

const dateLabel = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const PERIOD_WORDS = { monthly: "1 month", yearly: "1 year" };

function describeEvent(e) {
  switch (e.kind) {
    case "trial_started":
      return "Started the free trial";
    case "checkout":
      return `Paid ${peso(e.amount_php)} for ${PERIOD_WORDS[e.period] || e.period} with ${e.method === "gcash" ? "GCash" : "card"} (test)`;
    case "admin_granted":
      return `Given Premium${e.actor_name ? ` by ${e.actor_name}` : ""}`;
    case "admin_removed":
      return `Premium removed${e.actor_name ? ` by ${e.actor_name}` : ""}`;
    default:
      return e.kind;
  }
}

function PlanSettingsForm({ config }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(settingsSchema), defaultValues: config, mode: "onTouched" });
  const monthly = Number(watch("monthly_price_php")) || 0;
  const yearly = Number(watch("yearly_price_php")) || 0;
  const saving = monthly * 12 - yearly;

  const save = async (values) => {
    try {
      await apiFetch("/api/admin/premium/config", { method: "PUT", body: JSON.stringify(values) });
      toast.success("Premium settings saved", { description: "The app shows the new prices straight away." });
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't save the Premium settings.");
    }
  };

  const field = (name, label, suffix, hint) => (
    <div>
      <label htmlFor={name} className={UI.input.label}>{label}</label>
      <div className="relative">
        <input id={name} type="number" inputMode="numeric" min="0" {...register(name)} className={`${UI.input.text} pr-16`} aria-invalid={!!errors[name]} />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-ds-steel pointer-events-none">{suffix}</span>
      </div>
      {errors[name] ? <p className={UI.input.error}>{errors[name].message}</p> : hint ? <p className="text-[12px] text-ds-steel mt-1">{hint}</p> : null}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(save)} className={UI.card.root} noValidate>
      <div className={UI.card.header}>
        <div>
          <h2 className="text-[15px] font-semibold text-ds-ink m-0">Plan settings</h2>
          <p className="text-[13px] text-ds-slate m-0 mt-0.5">What patients see on the Premium screen in the app.</p>
        </div>
      </div>
      <div className="p-5 grid gap-4 sm:grid-cols-3">
        {field("monthly_price_php", "Monthly price", "PHP")}
        {field("yearly_price_php", "Yearly price", "PHP", saving > 0 ? `Patients save ${peso(saving)} against 12 months.` : "Yearly isn't cheaper than 12 months.")}
        {field("trial_days", "Free trial", "days", "0 turns the free trial off.")}
      </div>
      <label className="mx-5 mb-5 flex items-start gap-3 p-3.5 rounded-[8px] bg-ds-surface cursor-pointer">
        <input type="checkbox" {...register("checkout_enabled")} className="mt-0.5 w-4 h-4 accent-ds-primary cursor-pointer" />
        <span>
          <span className="block text-[14px] font-medium text-ds-ink">Open for new sign-ups</span>
          <span className="block text-[13px] text-ds-slate">When off, patients can&apos;t start a trial or pay. Anyone already on Premium keeps it.</span>
        </span>
      </label>
      <div className={UI.card.footer}>
        <span className="text-[12px] text-ds-steel flex items-center gap-1.5">
          <Info size={13} aria-hidden="true" /> Test mode: no real money is charged.
        </span>
        <button type="submit" disabled={!isDirty || isSubmitting} className={UI.button.primary}>
          {isSubmitting ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

function ChangesTable({ events }) {
  return (
    <div className={UI.card.root}>
      <div className={UI.card.header}>
        <div>
          <h2 className="text-[15px] font-semibold text-ds-ink m-0">Recent changes</h2>
          <p className="text-[13px] text-ds-slate m-0 mt-0.5">Trials, test payments, and Premium given or removed by admins.</p>
        </div>
      </div>
      {events.length === 0 ? (
        <p className="p-10 text-center text-[14px] text-ds-slate m-0">No Premium activity yet.</p>
      ) : (
        <div className={UI.table.container}>
          <table className={UI.table.root}>
            <thead className={UI.table.thead}>
              <tr>
                <th scope="col" className={UI.table.th}>When</th>
                <th scope="col" className={UI.table.th}>Patient</th>
                <th scope="col" className={UI.table.th}>What happened</th>
                <th scope="col" className={UI.table.th}>Premium until</th>
              </tr>
            </thead>
            <tbody className={UI.table.tbody}>
              {events.map((e) => (
                <tr key={e.id || `${e.user_id}-${e.created_at}`} className={UI.table.tr}>
                  <td className={`${UI.table.td} text-[13px] text-ds-slate whitespace-nowrap`}>{dateLabel(e.created_at)}</td>
                  <td className={`${UI.table.td} text-[14px] font-medium text-ds-ink`}>{e.user_name}</td>
                  <td className={`${UI.table.td} text-[14px] text-ds-ink`}>{describeEvent(e)}</td>
                  <td className={`${UI.table.td} text-[13px] text-ds-slate whitespace-nowrap`}>{e.kind === "admin_removed" ? "—" : dateLabel(e.premium_until)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const Premium = () => {
  const overview = useApiQuery("/api/admin/premium");
  const data = overview.data;

  return (
    <AdminLayout>
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        <PageHeader
          eyebrow="Users & feedback"
          eyebrowIcon={Crown}
          title="HeartLink Premium"
          description="Plan settings and who is on Premium. Give or remove Premium for one patient from Users › Manage."
        />

        {overview.isPending ? (
          <div className="space-y-4">
            <div className={UI.kpi.grid}>
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[74px] rounded-xl" />)}
            </div>
            <Skeleton className="h-[230px] rounded-xl" />
          </div>
        ) : overview.isError || !data ? (
          <div className={UI.card.root}>
            <LoadError what="Premium" onRetry={overview.refetch} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className={UI.kpi.grid}>
              <KpiCard label={`Premium members (of ${data.patients})`} value={data.premium_members} icon={Crown} iconBg="bg-ds-yellow" iconColor="text-ds-warm-text" iconBorder="border-ds-yellow" />
              <KpiCard label="On free trial" value={data.on_trial} icon={Sparkles} iconBg="bg-ds-sky" iconColor="text-ds-charcoal" iconBorder="border-ds-sky" />
              <KpiCard label="Given by admins" value={data.by_admin} icon={Gift} iconBg="bg-ds-mint" iconColor="text-ds-charcoal" iconBorder="border-ds-mint" />
              <KpiCard label="Test payments (total)" value={peso(data.demo_revenue_php)} icon={Wallet} iconBg="bg-ds-surface" iconColor="text-ds-slate" />
            </div>
            <PlanSettingsForm key={JSON.stringify(data.config)} config={data.config} />
            <ChangesTable events={data.events} />
            <p className="text-[12px] text-ds-steel flex items-center gap-1.5 m-0">
              <Users size={13} aria-hidden="true" /> Safety features stay free for every patient: check-ins, emergency warnings, clinics, reminders and the heart score.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Premium;
