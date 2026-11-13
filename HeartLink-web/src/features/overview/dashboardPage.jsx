import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Dumbbell, RotateCw, Stethoscope, Users, Utensils } from "lucide-react";
import AdminLayout from "../../components/layouts/adminLayout.jsx";
import LoadError from "../../components/ui/loadError.jsx";
import WorkspaceCalendar from "../../components/ui/workspaceCalendar.jsx";
import { Skeleton } from "../../components/ui/skeleton.jsx";
import { QueryProgress } from "../../components/ui/queryProgress.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { PageHeader } from "../../styles/designSystem.jsx";
import { UI } from "../../styles/tokens.js";

// The Admin's overview: how many accounts and how much content there is, where each recipe and exercise is in the
// review process, and what needs someone's attention. Real counts only (the made-up "design preview" card is gone).
// Each recipe or exercise is in exactly one row, so the rows add up to the total.

const CONTENT_STATES = [
  ["awaiting_review", "Waiting for review"],
  ["changes_requested", "Changes requested"],
  ["approved_draft", "Approved, not published yet"],
  ["published", "Published"],
  ["archived", "Archived"],
];
const ACCOUNT_STATES = [["active", "Active"], ["disabled", "Disabled"], ["archived", "Archived"]];
const count = (value) => Number.isInteger(value) && value >= 0 ? value.toLocaleString() : "Unknown";
const listNames = (names) => names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/** A published recipe or exercise no expert approved yet: patients don't see it until one does. */
function UnapprovedNote({ kind, item, data, to, expert }) {
  const n = data.published_without_review;
  if (!(n > 0)) return null;
  const names = Array.isArray(data.published_without_review_names) ? data.published_without_review_names : [];
  const what = n === 1 ? `1 published ${item}` : `${count(n)} published ${item}s`;
  return (
    <div className="home-attention" role="note">
      <AlertTriangle size={16} aria-hidden="true" />
      <div>
        <p><strong>{`${what} ${n === 1 ? "isn't" : "aren't"} approved yet`}</strong>{names.length ? `: ${listNames(names)}${n > names.length ? ", and more" : ""}.` : "."}</p>
        <p>{`Patients don't see ${n === 1 ? "it" : "them"} until a ${expert} approves ${n === 1 ? "it" : "them"}, or an Admin unpublishes ${n === 1 ? "it" : "them"}.`} <Link to={to}>{`Open ${kind}`}</Link></p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isPending, isFetching, isError, refetch } = useApiQuery("/api/admin/dashboard");
  const valid = data?.accounts && data?.content?.recipes && data?.content?.exercises;
  const recipes = data?.content?.recipes;
  const exercises = data?.content?.exercises;
  const showUnknownContent = valid && (recipes.unknown_status > 0 || exercises.unknown_status > 0);
  return (
    <AdminLayout>
      <div className={`${UI.page.container} home-overview`}>
        <PageHeader
          eyebrow="General Wellness workspace"
          title="Overview"
          description="Accounts and content at a glance, and anything that needs your attention."
          actions={<button type="button" className={UI.button.secondary} onClick={() => refetch()} disabled={isFetching}>
            <RotateCw size={15} aria-hidden="true" />{isFetching ? "Refreshing…" : "Refresh"}
          </button>}
        />
        <div className="home-overview-grid">
          <div className="home-overview-main">
            {isError || (!isPending && !valid) ? <LoadError what="the overview" onRetry={refetch} /> : isPending ? (
              <div role="status" aria-label="Loading account and content statuses" className="home-loading">
                <span className="sr-only">Loading account and content statuses…</span>
                <Skeleton className="h-24 w-full" /><Skeleton className="h-80 w-full" /><Skeleton className="h-32 w-full" />
              </div>
            ) : <>
              <div className="home-snapshot-heading"><h2>At a glance</h2><QueryProgress active={isFetching} label="Updating overview…" /></div>
              <dl className="home-snapshot">
                {[
                  ["Patients", data.accounts.consumers, Users, "sky"],
                  ["Staff", data.accounts.staff, Stethoscope, "lavender"],
                  ["Recipes", recipes.total, Utensils, "peach"],
                  ["Exercises", exercises.total, Dumbbell, "mint"],
                ].map(([label, value, Icon, tint]) => (
                  <div key={label}>
                    <dt><span className={`home-badge home-badge-${tint}`}><Icon size={16} aria-hidden="true" /></span>{label}</dt>
                    <dd>{count(value)}</dd>
                  </div>
                ))}
              </dl>

              <section className="home-panel" aria-labelledby="content-workflow-heading">
                <div className="home-panel-heading"><div><h2 id="content-workflow-heading">Recipes and exercises</h2><p>Where each one is in the review process. Dietitians approve recipes and Physical Therapists approve exercises; patients only see published, approved ones.</p></div></div>
                <UnapprovedNote kind="Recipes" item="recipe" expert="Dietitian" data={recipes} to="/foods" />
                <UnapprovedNote kind="Exercises" item="exercise" expert="Physical Therapist" data={exercises} to="/exercises" />
                <div className="home-workflow-table-wrap"><table className="home-workflow-table">
                  <thead><tr><th scope="col">Status</th><th scope="col"><Link to="/foods"><Utensils size={15} aria-hidden="true" />Recipes <ArrowRight size={13} aria-hidden="true" /></Link></th><th scope="col"><Link to="/exercises"><Dumbbell size={15} aria-hidden="true" />Exercises <ArrowRight size={13} aria-hidden="true" /></Link></th></tr></thead>
                  <tbody>
                    {CONTENT_STATES.map(([key, label]) => <tr key={key}><th scope="row">{label}</th><td>{count(recipes[key])}</td><td>{count(exercises[key])}</td></tr>)}
                    {showUnknownContent ? <tr><th scope="row">Status not recognised</th><td>{count(recipes.unknown_status)}</td><td>{count(exercises.unknown_status)}</td></tr> : null}
                  </tbody>
                  <tfoot><tr><th scope="row">Total</th><td>{count(recipes.total)}</td><td>{count(exercises.total)}</td></tr></tfoot>
                </table></div>
              </section>

              <section className="home-panel" aria-labelledby="accounts-heading">
                <div className="home-panel-heading"><div><h2 id="accounts-heading">Account access</h2><p>Patients and staff. Active means the account can sign in, not that it&apos;s being used.</p></div><Link to="/users" className={UI.button.ghost}>Manage <ArrowRight size={14} aria-hidden="true" /></Link></div>
                <dl className="home-account-states">
                  {ACCOUNT_STATES.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{count(data.accounts[key])}</dd></div>)}
                  {data.accounts.unknown_status > 0 ? <div><dt>Status not recognised</dt><dd>{count(data.accounts.unknown_status)}</dd></div> : null}
                </dl>
                {data.accounts.unknown_role > 0 && <p className="home-data-note">{count(data.accounts.unknown_role)} account(s) have a role HeartLink doesn&apos;t recognise. Check them in Users.</p>}
              </section>
              <p className="home-updated">{Number.isNaN(new Date(data.generated_at).getTime()) ? "Update time unavailable." : `Updated ${new Date(data.generated_at).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })}, Manila time.`}</p>
            </>}
          </div>
          <aside className="home-overview-rail"><WorkspaceCalendar /><section className="home-rail-note"><h2>Keep work moving</h2><p>Experts write and approve recipes and exercises in their libraries; an Admin then publishes them for patients.</p><Link to="/notifications">Open your inbox <ArrowRight size={14} aria-hidden="true" /></Link></section></aside>
        </div>
      </div>
    </AdminLayout>
  );
}
