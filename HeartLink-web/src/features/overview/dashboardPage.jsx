import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Bell, Check, Dumbbell, RotateCw, ShieldCheck, Users, Utensils } from "lucide-react";
import AdminLayout from "../../components/layouts/adminLayout.jsx";
import LoadError from "../../components/ui/loadError.jsx";
import WorkspaceCalendar from "../../components/ui/workspaceCalendar.jsx";
import { Skeleton } from "../../components/ui/skeleton.jsx";
import { QueryProgress } from "../../components/ui/queryProgress.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { UI } from "../../styles/tokens.js";
import RecipeImage from "../recipes/components/recipeImage.jsx";
import { RoutineMedia } from "../exercises/components/routineMedia.jsx";
import { resolveRoutineMediaUrl } from "../exercises/exerciseMedia.js";
import { BASE_URL } from "../../lib/api.js";
import { dashboardContent, contentLibraryLink } from "./dashboardContent.js";

const CONTENT_STATES = [
  ["draft", "Drafts"],
  ["archived", "Archived"],
  ["unknown_status", "Other status"],
];
const ACCOUNT_STATES = [["active", "Active"], ["disabled", "Disabled"], ["archived", "Archived"]];
const count = (value) => Number.isInteger(value) && value >= 0 ? value.toLocaleString() : "Unknown";
const listNames = (names) => names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/** A published recipe or exercise no expert approved yet: patients don't see it until one does. Named, so the Admin
 * knows which ones to open. */
function UnapprovedNote({ data, singular, expert }) {
  const n = data.published_without_review;
  if (!(n > 0)) return null;
  const names = Array.isArray(data.published_without_review_names) ? data.published_without_review_names : [];
  const what = n === 1 ? `1 published ${singular}` : `${count(n)} published ${singular}s`;
  return (
    <p className="home-library-attention" role="note">
      <strong><AlertTriangle size={14} aria-hidden="true" /> {`${what} ${n === 1 ? "isn't" : "aren't"} approved yet`}</strong>
      <span>{names.length ? `${listNames(names)}${n > names.length ? ", and more" : ""}. ` : ""}{`Patients don't see ${n === 1 ? "it" : "them"} until a ${expert} approves ${n === 1 ? "it" : "them"}, or an Admin unpublishes ${n === 1 ? "it" : "them"}.`}</span>
    </p>
  );
}

/** What each content card says, by where the item really is (dashboardContent.contentStage). */
function cardWords(item) {
  const expert = item.kind === "recipes" ? "Dietitian" : "Physical Therapist";
  switch (item.stage) {
    case "published": return { review: `${expert} approved`, footer: "Published to users" };
    case "approved": return { review: `${expert} approved`, footer: "Approved, not published yet" };
    case "unapproved": return { review: "Not approved yet", footer: "Published, but patients don't see it yet" };
    case "changes": return { review: `${expert} asked for changes`, footer: "Waiting for an Admin to edit it" };
    default: return { review: `Awaiting ${expert} review`, footer: "Waiting for review" };
  }
}
const selectRecipes = (response) => dashboardContent(response, "recipes");
const selectExercises = (response) => dashboardContent(response, "exercises");

function ContentCard({ item }) {
  const recipe = item.kind === "recipes";
  const published = item.status === "published" && item.expertValidated;
  const date = published ? item.reviewedAt : item.activityAt;
  const words = cardWords(item);
  return <article className={`home-content-card home-content-card--${item.kind}`}>
    <Link to={contentLibraryLink(item)} aria-label={`Open ${item.name} in the ${recipe ? "recipe" : "exercise"} library`}>
      <div className="home-content-media">
        {recipe ? <RecipeImage src={resolveRoutineMediaUrl(item.image, BASE_URL)} alt="" containerClassName="home-content-image" fallbackIconSize={34} fallbackIconClassName="home-content-fallback" /> : <RoutineMedia image={item.image} />}
      </div>
      <div className="home-content-body">
        <span className="home-content-kind">{recipe ? <Utensils size={12} aria-hidden="true" /> : <Dumbbell size={12} aria-hidden="true" />}{recipe ? "Recipe" : "Routine"}</span>
        <h3>{item.name}</h3>
        <p className="home-content-review"><ShieldCheck size={14} aria-hidden="true" />{words.review}</p>
        {date > 0 && <time dateTime={new Date(date).toISOString()}>{published ? "Approved " : "Updated "}{new Date(date).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" })}</time>}
        <div className="home-content-footer"><span>{words.footer}</span><ArrowRight size={16} aria-hidden="true" /></div>
      </div>
    </Link>
  </article>;
}

export default function Dashboard() {
  const { data, isPending, isFetching, isError, refetch } = useApiQuery("/api/admin/dashboard");
  const recipes = useApiQuery("/api/recipes", { select: selectRecipes });
  const exercises = useApiQuery("/api/exercises/", { select: selectExercises });
  const [contentView, setContentView] = useState(null);
  const contentQueries = [["recipes", recipes], ["routines", exercises]];
  const workflowItems = contentQueries.flatMap(([, query]) => query.isError ? [] : query.data ?? [])
    .sort((a, b) => b.activityAt - a.activityAt || a.name.localeCompare(b.name));
  const waiting = workflowItems.filter((item) => !item.expertValidated);
  const published = workflowItems.filter((item) => item.status === "published" && item.expertValidated);
  const contentComplete = contentQueries.every(([, query]) => !query.isPending && !query.isError);
  const contentPending = contentQueries.some(([, query]) => query.isPending);
  const fetching = isFetching || recipes.isFetching || exercises.isFetching;
  const selectedView = contentView ?? (waiting.length ? "waiting" : "published");
  const visibleContent = selectedView === "waiting" ? waiting : published;
  const refreshAll = () => Promise.all([refetch(), recipes.refetch(), exercises.refetch()]);
  const valid = data?.accounts && data?.content?.recipes && data?.content?.exercises;
  return (
    <AdminLayout>
      <div className="workspace workspace--operations workspace--refined workspace--plum home-overview mx-auto">
        <div className="home-overview-grid">
          <div className="home-overview-main">
            <section className="home-feature" aria-labelledby="home-feature-heading">
              <div><h2 id="home-feature-heading">Keep your libraries moving.</h2><p>See what is waiting for expert review and what was approved and published to users.</p><a href="#content-workflow">Explore content <ArrowRight size={15} aria-hidden="true" /></a></div>
              <div className="home-feature-art" aria-hidden="true"><span><Utensils size={31} strokeWidth={1.3} /><Check size={15} /></span><span><Dumbbell size={33} strokeWidth={1.3} /><Check size={15} /></span></div>
            </section>
            {isError || (!isPending && !valid) ? <LoadError what="the operational overview" onRetry={refetch} /> : isPending ? (
              <div role="status" aria-label="Loading account and content statuses" className="home-loading">
                <span className="sr-only">Loading account and content statuses…</span>
                <Skeleton className="h-24 w-full" /><Skeleton className="h-80 w-full" /><Skeleton className="h-32 w-full" />
              </div>
            ) : <>
              <div className="home-snapshot-heading"><h2>Workspace snapshot</h2><div><QueryProgress active={isFetching} label="Updating overview…" /><button type="button" className={`${UI.button.secondary} home-refresh`} onClick={refreshAll} disabled={fetching} aria-label={fetching ? "Refreshing dashboard" : "Refresh dashboard"} title="Refresh dashboard"><RotateCw size={15} aria-hidden="true" /></button></div></div>
              <dl className="home-snapshot">
                {[["Consumer accounts", data.accounts.consumers, Users, "accounts"], ["Staff accounts", data.accounts.staff, Users, "staff"], ["Recipes", data.content.recipes.total, Utensils, "recipes"], ["Routines", data.content.exercises.total, Dumbbell, "exercises"]].map(([label, value, Icon, tone]) => <div key={label} className={`home-stat home-stat--${tone}`}><dt><Icon size={21} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span></dt><dd>{count(value)}</dd></div>)}
              </dl>
            </>}
            <section id="content-workflow" className="home-content" aria-labelledby="content-workflow-feed-heading">
              <div className="home-section-heading"><div><h2 id="content-workflow-feed-heading">{selectedView === "waiting" ? "Waiting for expert review" : "Approved & published"}</h2><p>{selectedView === "waiting" ? "Drafts that still need the assigned expert's decision." : "The latest expert-approved content now available to users."}</p></div><QueryProgress active={recipes.isFetching || exercises.isFetching} label="Updating content…" /></div>
              <div className="home-content-tabs" role="group" aria-label="Content view">
                <button type="button" aria-pressed={selectedView === "waiting"} onClick={() => setContentView("waiting")}>Waiting for expert review{contentComplete && <span>{waiting.length}</span>}</button>
                <button type="button" aria-pressed={selectedView === "published"} onClick={() => setContentView("published")}>Approved & published{contentComplete && <span>{published.length}</span>}</button>
              </div>
              {contentQueries.map(([label, query]) => query.isError && <LoadError key={label} what={`approved ${label}`} onRetry={query.refetch} className="home-content-error" />)}
              {contentPending && <div role="status" aria-label="Loading approved content" className="home-content-loading"><span className="sr-only">Loading approved content…</span><Skeleton className="h-52 w-full" /><Skeleton className="h-52 w-full" /><Skeleton className="h-52 w-full" /></div>}
              {contentComplete && waiting.length === 0 && selectedView === "published" && <p className="home-content-context"><Check size={14} aria-hidden="true" />No content is waiting for expert review.</p>}
              {visibleContent.length > 0 ? <div className="home-content-grid">{visibleContent.slice(0, 3).map((item) => <ContentCard key={`${item.kind}-${item.id}`} item={item} />)}</div> : contentComplete && <div className="home-content-empty"><ShieldCheck size={25} strokeWidth={1.5} aria-hidden="true" /><h3>{selectedView === "waiting" ? "Nothing is waiting for review" : "No approved content yet"}</h3><p>{selectedView === "waiting" ? "New recipe and routine drafts will appear here until the assigned expert reviews them." : "Content appears here after the assigned expert approves it and it is published to users."}</p></div>}
              {visibleContent.length > 3 && <p className="home-content-limit">{contentComplete ? `Showing 3 of ${visibleContent.length} ${selectedView === "waiting" ? "items waiting for review" : "published approvals"}.` : "Showing the latest 3 available items."} Find the rest in your libraries.</p>}
              <div className="home-content-links"><Link to="/foods">Open recipe library <ArrowRight size={13} aria-hidden="true" /></Link><Link to="/exercises">Open exercise library <ArrowRight size={13} aria-hidden="true" /></Link></div>
            </section>
            {!isError && valid && <>
              <section className="home-libraries" aria-labelledby="content-workflow-heading">
                <div className="home-section-heading"><div><h2 id="content-workflow-heading">Library status</h2><p>Publication and review across your content.</p></div><Link to="/analytics">View analytics <ArrowRight size={14} aria-hidden="true" /></Link></div>
                <div className="home-library-grid">
                  {[["recipes", "Recipes", Utensils, "recipe"], ["exercises", "Routines", Dumbbell, "routine"]].map(([key, label, Icon, singular]) => (
                    <article key={key} className={`home-library home-library--${key}`} aria-label={`${label} publication and review status`}>
                      <div className="home-library-heading"><div><span className="home-library-icon"><Icon size={21} strokeWidth={1.6} aria-hidden="true" /></span><h3>{label}</h3></div>{key === "recipes" ? <Link to="/foods" aria-label="Open recipe library"><ArrowRight size={18} aria-hidden="true" /></Link> : <Link to="/exercises" aria-label="Open exercise library"><ArrowRight size={18} aria-hidden="true" /></Link>}</div>
                      <div className="home-publication">
                        <div><span>Published</span><strong>{count(data.content[key].published)}<small> / {count(data.content[key].total)}</small></strong></div>
                        {Number.isInteger(data.content[key].total) && data.content[key].total > 0 && Number.isInteger(data.content[key].published) && data.content[key].published >= 0 && data.content[key].published <= data.content[key].total ? <meter aria-label={`${label}: stored published records`} min={0} max={data.content[key].total} value={data.content[key].published}>{count(data.content[key].published)} of {count(data.content[key].total)}</meter> : <p className="home-meter-unavailable">Distribution unavailable</p>}
                      </div>
                      <dl className="home-library-states">{CONTENT_STATES.map(([state, name]) => <div key={state}><dt>{name}</dt><dd>{count(data.content[key][state])}</dd></div>)}</dl>
                      <dl className="home-library-reviews">{[["awaiting_review", "Awaiting review"], ["changes_requested", "Changes requested"], ["approval_recorded", "Approval on record"]].map(([state, name]) => <div key={state}><dt>{name}</dt><dd>{count(data.content[key][state])}</dd></div>)}</dl>
                      <UnapprovedNote data={data.content[key]} singular={singular} expert={key === "recipes" ? "Dietitian" : "Physical Therapist"} />
                    </article>
                  ))}
                </div>
              </section>
              <section className="home-panel" aria-labelledby="accounts-heading">
                <div className="home-panel-heading"><div><h2 id="accounts-heading">Account access</h2><p>Patients and staff. Active means the account can sign in, not that it&apos;s being used.</p></div><Link to="/users" className={UI.button.ghost}>Manage <ArrowRight size={14} aria-hidden="true" /></Link></div>
                <dl className="home-account-states">
                  {ACCOUNT_STATES.map(([state, label]) => <div key={state}><dt>{label}</dt><dd>{count(data.accounts[state])}</dd></div>)}
                  {data.accounts.unknown_status > 0 ? <div><dt>Status not recognised</dt><dd>{count(data.accounts.unknown_status)}</dd></div> : null}
                </dl>
                {data.accounts.unknown_role > 0 && <p className="home-data-note">{count(data.accounts.unknown_role)} account(s) have a role HeartLink doesn&apos;t recognise. Check them in Accounts &amp; Staff.</p>}
              </section>
              <p className="home-updated">{Number.isNaN(new Date(data.generated_at).getTime()) ? "Update time unavailable." : `Updated ${new Date(data.generated_at).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })}`}</p>
            </>}
          </div>
          <aside className="home-overview-rail">
            <WorkspaceCalendar />
            <section className="home-rail-note"><div><Bell size={20} strokeWidth={1.6} aria-hidden="true" /><h2>Workspace inbox</h2></div><p>Content reviews, account updates and security notices.</p><Link to="/notifications">Open inbox <ArrowRight size={14} aria-hidden="true" /></Link></section>
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}
