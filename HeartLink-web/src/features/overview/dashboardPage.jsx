import { Link } from "react-router-dom";
import { ArrowRight, Dumbbell, RotateCw, Users, Utensils } from "lucide-react";
import AdminLayout from "../../components/layouts/adminLayout.jsx";
import LoadError from "../../components/ui/loadError.jsx";
import WorkspaceCalendar from "../../components/ui/workspaceCalendar.jsx";
import { Skeleton } from "../../components/ui/skeleton.jsx";
import { QueryProgress } from "../../components/ui/queryProgress.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { PageHeader } from "../../styles/designSystem.jsx";
import { UI } from "../../styles/tokens.js";
import ScoreDesignPreview from "./scoreDesignPreview.jsx";

const CONTENT_STATES = [
  ["draft", "Drafts"], ["awaiting_review", "Awaiting review"],
  ["changes_requested", "Changes requested"], ["published", "Stored as published"],
  ["archived", "Archived"], ["unknown_status", "Unrecognised status"],
];
const count = (value) => Number.isInteger(value) && value >= 0 ? value.toLocaleString() : "Unknown";

export default function Dashboard() {
  const { data, isPending, isFetching, isError, refetch } = useApiQuery("/api/admin/dashboard");
  const valid = data?.accounts && data?.content?.recipes && data?.content?.exercises;
  return (
    <AdminLayout>
      <div className={`${UI.page.container} home-overview`}>
        <PageHeader
          eyebrow="General Wellness workspace"
          title="Operational overview"
          description="A clear view of saved accounts, content and the next steps in your workspace."
          actions={<button type="button" className={UI.button.secondary} onClick={() => refetch()} disabled={isFetching}>
            <RotateCw size={15} aria-hidden="true" />{isFetching ? "Refreshing…" : "Refresh"}
          </button>}
        />
        <div className="home-overview-grid">
          <div className="home-overview-main">
            {isError || (!isPending && !valid) ? <LoadError what="the operational overview" onRetry={refetch} /> : isPending ? (
              <div role="status" aria-label="Loading account and content statuses" className="home-loading">
                <span className="sr-only">Loading account and content statuses…</span>
                <Skeleton className="h-24 w-full" /><Skeleton className="h-80 w-full" /><Skeleton className="h-32 w-full" />
              </div>
            ) : <>
              <div className="home-snapshot-heading"><h2>Workspace snapshot</h2><QueryProgress active={isFetching} label="Updating overview…" /></div>
              <dl className="home-snapshot">
                {[["Consumer accounts", data.accounts.consumers, Users], ["Staff accounts", data.accounts.staff, Users], ["Recipes", data.content.recipes.total, Utensils], ["Routines", data.content.exercises.total, Dumbbell]].map(([label, value, Icon]) => <div key={label}><dt><Icon size={15} aria-hidden="true" />{label}</dt><dd>{count(value)}</dd></div>)}
              </dl>
              <section className="home-panel" aria-labelledby="content-workflow-heading">
                <div className="home-panel-heading"><div><h2 id="content-workflow-heading">Content workflow</h2><p>Saved states across your two libraries.</p></div></div>
                <div className="home-workflow-table-wrap"><table className="home-workflow-table">
                  <thead><tr><th scope="col">Saved state</th><th scope="col"><Link to="/foods"><Utensils size={15} aria-hidden="true" />Recipes <ArrowRight size={13} aria-hidden="true" /></Link></th><th scope="col"><Link to="/exercises"><Dumbbell size={15} aria-hidden="true" />Routines <ArrowRight size={13} aria-hidden="true" /></Link></th></tr></thead>
                  <tbody>{CONTENT_STATES.map(([key, label]) => <tr key={key}><th scope="row">{label}</th><td>{count(data.content.recipes[key])}</td><td>{count(data.content.exercises[key])}</td></tr>)}</tbody>
                </table></div>
                <div className="home-review-metadata">
                  <h3>Approval recorded</h3><p><strong>{count(data.content.recipes.approval_recorded)}</strong> recipes · <strong>{count(data.content.exercises.approval_recorded)}</strong> routines</p>
                  <p>Review metadata is present, including on published records. This is not a separate workflow state or a count ready to publish.</p>
                </div>
                {[["recipes", "recipe"], ["exercises", "routine"]].map(([key, label]) => data.content[key].published_without_review > 0 && <p key={key} className="home-data-note">{count(data.content[key].published_without_review)} stored published {label} record(s) lack review metadata. Open the library to check their workflow state.</p>)}
              </section>
              <section className="home-panel" aria-labelledby="accounts-heading">
                <div className="home-panel-heading"><div><h2 id="accounts-heading">Account access</h2><p>All roles. Access status does not describe recent app usage.</p></div><Link to="/users" className={UI.button.ghost}>Manage <ArrowRight size={14} aria-hidden="true" /></Link></div>
                <dl className="home-account-states">{[["active", "Active"], ["disabled", "Disabled"], ["archived", "Archived"], ["unknown_status", "Unrecognised status"]].map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{count(data.accounts[key])}</dd></div>)}</dl>
                {data.accounts.unknown_role > 0 && <p className="home-data-note">{count(data.accounts.unknown_role)} account(s) have an unrecognised role.</p>}
              </section>
              <p className="home-updated">{Number.isNaN(new Date(data.generated_at).getTime()) ? "Update time unavailable." : `Updated ${new Date(data.generated_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} (Asia/Manila).`} Counts describe saved states, not app availability.</p>
            </>}
            <ScoreDesignPreview compact />
          </div>
          <aside className="home-overview-rail"><WorkspaceCalendar /><section className="home-rail-note"><h2>Keep work moving</h2><p>Create and edit in each library. Specialists review the saved revision before Admin publication.</p><Link to="/notifications">Open your inbox <ArrowRight size={14} aria-hidden="true" /></Link></section></aside>
        </div>
      </div>
    </AdminLayout>
  );
}
