import { Link } from "react-router-dom";
import { ArrowRight, Dumbbell, RotateCw, Users, Utensils } from "lucide-react";
import AdminLayout from "../../components/layouts/adminLayout.jsx";
import LoadError from "../../components/ui/loadError.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { KpiCard, PageHeader } from "../../styles/designSystem.jsx";
import { UI } from "../../styles/tokens.js";

const CONTENT_STATES = [
  ["draft", "Drafts"],
  ["awaiting_review", "Awaiting review"],
  ["changes_requested", "Changes requested"],
  ["approval_recorded", "Approval recorded"],
  ["published", "Stored as published"],
  ["archived", "Archived"],
  ["unknown_status", "Unrecognised status"],
];

export default function Dashboard() {
  const { data, isPending, isFetching, isError, refetch } = useApiQuery(
    "/api/admin/dashboard",
  );
  const valid =
    data?.accounts && data?.content?.recipes && data?.content?.exercises;
  return (
    <AdminLayout>
      <div className={UI.page.container}>
        <PageHeader
          eyebrow="General Wellness workspace"
          title="Operational overview"
          description="Keep the content library and staff workspace moving. This view contains account and content statuses, not consumer health records."
          actions={
            <button
              type="button"
              className={UI.button.secondary}
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RotateCw size={15} aria-hidden="true" />
              {isFetching ? "Refreshing…" : "Refresh"}
            </button>
          }
        />
        {isError || (!isPending && !valid) ? (
          <LoadError what="the operational overview" onRetry={refetch} />
        ) : isPending ? (
          <p role="status" className="py-14 text-center text-cal-muted">
            Loading account and content statuses…
          </p>
        ) : (
          <>
            <div className={UI.kpi.grid}>
              <KpiCard
                label="Consumer accounts"
                value={data.accounts.consumers.toLocaleString()}
                icon={Users}
              />
              <KpiCard
                label="Staff accounts"
                value={data.accounts.staff.toLocaleString()}
                icon={Users}
              />
              <KpiCard
                label="Recipes"
                value={data.content.recipes.total.toLocaleString()}
                icon={Utensils}
              />
              <KpiCard
                label="Routines"
                value={data.content.exercises.total.toLocaleString()}
                icon={Dumbbell}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {[
                ["recipes", "Recipe workflow", "/foods", Utensils],
                ["exercises", "Routine workflow", "/exercises", Dumbbell],
              ].map(([kind, title, path, Icon]) => (
                <section
                  key={kind}
                  className={UI.card.root}
                  aria-labelledby={kind + "-heading"}
                >
                  <div className={UI.card.header}>
                    <h2
                      id={kind + "-heading"}
                      className="flex items-center gap-2 text-base font-semibold"
                    >
                      <Icon size={18} aria-hidden="true" />
                      {title}
                    </h2>
                    <Link to={path} className={UI.button.ghost}>
                      Open library <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                  <dl className="divide-y divide-cal-hairline px-5 text-sm">
                    {CONTENT_STATES.map(([key, label]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <dt className="text-cal-muted">{label}</dt>
                        <dd className="font-semibold tabular-nums">
                          {data.content[kind][key].toLocaleString()}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {data.content[kind].published_without_review > 0 && (
                    <p className="m-4 rounded-lg border border-cal-hairline bg-cal-surface-soft p-3 text-sm">
                      {data.content[kind].published_without_review} stored
                      published record(s) lack review metadata. Open the library
                      to check and correct their workflow state.
                    </p>
                  )}
                </section>
              ))}
            </div>
            <p className="my-4 text-sm leading-relaxed text-cal-muted">
              Updated{" "}
              {new Date(data.generated_at).toLocaleString("en-PH", {
                timeZone: "Asia/Manila",
              })}{" "}
              (Asia/Manila). Counts describe saved workflow states, not app
              availability. Approval recorded means review metadata is present;
              publication still requires complete, approved content.
            </p>
            <section
              className={UI.card.root}
              aria-labelledby="accounts-heading"
            >
              <div className={UI.card.header}>
                <h2 id="accounts-heading" className="text-base font-semibold">
                  Account status
                </h2>
                <Link to="/users" className={UI.button.ghost}>
                  Manage accounts <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
              <dl className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["active", "Active"],
                  ["disabled", "Disabled"],
                  ["archived", "Archived"],
                  ["unknown_status", "Unrecognised status"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <dt className="text-sm text-cal-muted">{label}</dt>
                    <dd className="mt-1 text-xl font-semibold tabular-nums">
                      {data.accounts[key].toLocaleString()}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="px-5 pb-5 text-sm text-cal-muted">
                All account roles are included. Active describes account access,
                not recent app usage.
                {data.accounts.unknown_role > 0 &&
                  ` ${data.accounts.unknown_role} account(s) have an unrecognised role.`}
              </p>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
