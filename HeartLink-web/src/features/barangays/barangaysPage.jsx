import { useState } from "react";
import { House, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../components/layouts/adminLayout.jsx";
import { Skeleton } from "../../components/ui/skeleton.jsx";
import LoadError from "../../components/ui/loadError.jsx";
import { WorkspaceHeader } from "../../components/ui/workspaceHeader.jsx";
import { apiFetch } from "../../lib/api.js";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import BarangayModal from "./components/barangayModal.jsx";
import { statusOf } from "./barangayForm.js";

// HL-171 (panel revision): Barangay contacts. Admins add each barangay's emergency hotline and tick it once they've
// called it. The app shows each user their nearest barangay (found on the phone by location) with a Call button for
// checked numbers only.

const NO_ROWS = [];
const FILTERS = [
  ["all", "All"],
  ["unchecked", "Not checked"],
  ["none", "No number"],
  ["hidden", "Hidden"],
];
const STATUS_TONE = {
  checked: "border-cal-success/25 bg-cal-success/10",
  unchecked: "border-cal-warning/30 bg-cal-warning/10",
  none: "border-cal-hairline bg-cal-surface-soft",
};

export default function Barangays() {
  const list = useApiQuery("/api/admin/barangays", { select: (d) => (Array.isArray(d) ? d : []) });
  const rows = list.data ?? NO_ROWS;
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null); // null = closed, {} = new, row = edit

  const visible = (r) => r.active !== false;
  const counts = {
    all: rows.filter(visible).length,
    unchecked: rows.filter((r) => visible(r) && statusOf(r).key === "unchecked").length,
    none: rows.filter((r) => visible(r) && statusOf(r).key === "none").length,
    hidden: rows.filter((r) => !visible(r)).length,
  };
  const needle = query.trim().toLowerCase();
  const shown = rows
    .filter((r) => (filter === "hidden" ? !visible(r) : visible(r) && (filter === "all" || statusOf(r).key === filter)))
    .filter((r) => !needle || `${r.name} ${r.city || ""}`.toLowerCase().includes(needle));

  const toggleHidden = async (r) => {
    try {
      await apiFetch(`/api/admin/barangays/${r.id}`, { method: "PUT", body: JSON.stringify({ active: !visible(r) }) });
      toast.success(visible(r) ? `${r.name} is hidden from the app.` : `${r.name} is shown in the app again.`);
      list.refetch();
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't save. Try again.");
    }
  };

  return (
    <AdminLayout>
      <div className="workspace workspace--operations mx-auto w-full max-w-[1200px] space-y-6 font-cal-sans text-cal-ink">
        <WorkspaceHeader
          icon={House}
          title="Barangay contacts"
          description="Each user's app shows their nearest barangay, found by their phone's location. Only numbers you've called and checked get a Call button."
        >
          <button
            type="button"
            onClick={() => setEditing({})}
            className="flex h-10 items-center gap-2 rounded-[8px] bg-cal-primary px-5 text-[14px] font-semibold text-cal-on-primary cursor-pointer"
          >
            <Plus size={15} />
            <span>Add a barangay</span>
          </button>
        </WorkspaceHeader>

        <section className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cal-hairline px-4 py-3.5 sm:px-5">
            <div role="group" aria-label="Show" className="inline-flex flex-wrap rounded-full border border-cal-hairline bg-cal-surface-soft p-1">
              {FILTERS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium cursor-pointer ${
                    filter === key ? "bg-cal-primary text-cal-on-primary" : "text-cal-muted hover:text-cal-ink"
                  }`}
                >
                  <span>{label}</span>
                  <span className="font-cal-mono text-[11.5px] tabular-nums opacity-80">{list.isPending ? "—" : counts[key]}</span>
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <label htmlFor="barangay-search" className="sr-only">Find a barangay</label>
              <Search size={14.5} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cal-muted" />
              <input
                id="barangay-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a barangay"
                className="h-9 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas pl-9 pr-3 text-[13.5px] outline-none focus:border-cal-ink"
              />
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className="border-b border-cal-hairline bg-cal-surface-soft">
                <tr>
                  {["Barangay", "Hotline", "Status", "Location"].map((h) => (
                    <th key={h} scope="col" className="px-5 py-3 text-[12px] font-medium text-cal-muted">{h}</th>
                  ))}
                  <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cal-hairline">
                {list.isPending ? (
                  [0, 1, 2].map((n) => (
                    <tr key={n}>
                      <td colSpan={5} className="px-5 py-4">
                        <Skeleton className="h-9 w-full rounded-[8px] bg-cal-surface-strong/60" />
                      </td>
                    </tr>
                  ))
                ) : list.isError ? (
                  <tr>
                    <td colSpan={5}>
                      <LoadError what="the barangays" onRetry={list.refetch} className="py-12" />
                    </td>
                  </tr>
                ) : shown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-[14px] text-cal-muted">
                      {rows.length === 0 ? "No barangays yet. Click \"Add a barangay\"." : "No barangay matches."}
                    </td>
                  </tr>
                ) : (
                  shown.map((r) => {
                    const s = statusOf(r);
                    const phones = [r.hotline_1, r.hotline_2].filter(Boolean);
                    return (
                      <tr key={r.id} className="hover:bg-cal-surface-soft/70">
                        <td className="px-5 py-3.5">
                          <div className="text-[14px] font-semibold text-cal-ink">{r.name}</div>
                          <div className="text-[12px] text-cal-muted">{r.city || "Cebu City"}</div>
                        </td>
                        <td className="px-5 py-3.5 font-cal-mono text-[13px] text-cal-ink">
                          {phones.length ? phones.join(", ") : <span className="font-cal-sans text-cal-muted">None yet</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[12px] font-medium text-cal-ink ${STATUS_TONE[s.key]}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-cal-body">
                          {r.latitude == null ? (
                            <span className="font-medium text-cal-error">No location (hidden from the app)</span>
                          ) : r.location_kind === "hall" ? (
                            "Barangay hall"
                          ) : (
                            "Approximate (middle of the barangay)"
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditing(r)}
                              aria-label={`Edit ${r.name}`}
                              className="inline-flex h-9 items-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-semibold hover:bg-cal-surface-soft cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleHidden(r)}
                              aria-label={`${visible(r) ? "Hide" : "Show"} ${r.name}`}
                              className="inline-flex h-9 items-center rounded-[8px] px-3 text-[13px] font-semibold text-cal-muted hover:text-cal-ink cursor-pointer"
                            >
                              {visible(r) ? "Hide" : "Show"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-[12.5px] text-cal-muted">
          Locations come from OpenStreetMap, a public map. HeartLink never sees where a user is: their phone picks the nearest barangay itself.
        </p>
      </div>

      {editing ? (
        <BarangayModal
          row={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.refetch();
          }}
        />
      ) : null}
    </AdminLayout>
  );
}
