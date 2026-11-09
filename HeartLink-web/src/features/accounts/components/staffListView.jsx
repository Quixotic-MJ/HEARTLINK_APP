import { useState } from "react";
import { BadgeCheck, Search, ShieldCheck, Stethoscope, UserPlus, X } from "lucide-react";
import { Skeleton } from "../../../components/ui/skeleton.jsx";
import LoadError from "../../../components/ui/loadError.jsx";
import { StatusBadge } from "../../../styles/designSystem.jsx";
import { UI } from "../../../styles/tokens.js";

const ROLE_FILTERS = [["all", "All roles"], ["admin", "System admin"], ["medical_expert", "Expert reviewer"]];
const isAdmin = (staff) => staff.role === "System Admin" || staff.db_role === "admin";
const isExpert = (staff) => staff.role === "Authorized Medical Expert" || staff.db_role === "medical_expert";

export default function StaffListView({ staffList = [], loading = false, error = false, onRetry, onOpenStaff, onCreateStaff }) {
  const [internalSearch, setInternalSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const roleCounts = {
    all: staffList.length,
    admin: staffList.filter(isAdmin).length,
    medical_expert: staffList.filter(isExpert).length,
  };
  const activeStaff = staffList.filter((staff) => staff.account_status === "active" || staff.status?.toLowerCase() === "active").length;
  const filtered = staffList.filter((staff) => {
    const search = internalSearch.toLowerCase();
    const matchSearch = [staff.name, staff.id, staff.email].some((value) => value?.toLowerCase().includes(search));
    const matchRole = filterRole === "all" || (filterRole === "admin" ? isAdmin(staff) : isExpert(staff));
    const matchStatus = filterStatus === "all" || (staff.account_status || staff.status || "unknown").toLowerCase() === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });
  const clearFilters = () => {
    setInternalSearch("");
    setFilterRole("all");
    setFilterStatus("all");
  };

  return (
    <section className={UI.card.root} aria-label="Staff directory" aria-busy={loading}>
      <div className="accounts-toolbar">
        <div role="group" aria-label="Filter staff by role" className="accounts-filter-group">
          {ROLE_FILTERS.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={filterRole === key} onClick={() => setFilterRole(key)}
              className={filterRole === key ? UI.button.primary : UI.button.ghost}>
              {label}<span className="text-xs tabular-nums">{loading ? "—" : roleCounts[key]}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={onCreateStaff} className={UI.button.primary}>
          <UserPlus size={16} aria-hidden="true" />Create staff account
        </button>
        <div className="workspace-search">
          <label htmlFor="staff-directory-search" className="sr-only">Search staff accounts</label>
          <Search size={15} aria-hidden="true" />
          <input id="staff-directory-search" type="search" placeholder="Search name, email or ID" value={internalSearch} onChange={(event) => setInternalSearch(event.target.value)} />
          {internalSearch && <button type="button" onClick={() => setInternalSearch("")} aria-label="Clear search" className="rounded-lg"><X size={15} aria-hidden="true" /></button>}
        </div>
        <label htmlFor="staff-status-filter" className="sr-only">Filter staff by status</label>
        <select id="staff-status-filter" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className={UI.input.select}>
          <option value="all">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option>
        </select>
      </div>
      <div className="accounts-context">
        <span>{loading ? "Loading staff accounts…" : <><strong>{filtered.length}</strong> of {staffList.length} staff shown</>}</span>
        <span>{!loading && <><strong>{activeStaff}</strong> enabled · </>}Active means sign-in access, not recent usage.</span>
      </div>
      <div className="w-full overflow-x-auto" role="region" aria-label="Staff accounts table" tabIndex={0}>
        <table className="accounts-table workspace-table w-full min-w-[780px] border-collapse text-left">
          <thead className="border-b border-cal-hairline bg-cal-surface-soft">
            <tr>{["Staff member", "Role & discipline", "Access", "Created", "Action"].map((label) => <th key={label} scope="col">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-cal-hairline">
            {loading ? [1, 2, 3].map((row) => <tr key={row}><td colSpan={5}><Skeleton className="h-10 w-full" /></td></tr>)
              : error ? <tr><td colSpan={5}><LoadError what="staff accounts" onRetry={onRetry} className="py-12" /></td></tr>
                : !filtered.length ? <tr><td colSpan={5} className="text-center">
                  <div className="py-10">
                    <p className="font-semibold">{staffList.length ? "No staff accounts match these filters" : "No staff accounts provisioned yet"}</p>
                    <p className="mt-1 text-cal-muted">{staffList.length ? "Clear the role, status or search filter to see all staff." : "Create a System Admin or Expert Reviewer account to get started."}</p>
                    {staffList.length > 0 && <button type="button" onClick={clearFilters} className={UI.button.secondary + " mx-auto mt-4"}>Reset filters</button>}
                  </div>
                </td></tr>
                  : filtered.map((staff) => (
                    <tr key={staff.id}>
                      <td>
                        <button type="button" onClick={() => onOpenStaff(staff)} className="text-left font-semibold hover:underline">{staff.name}</button>
                        <p className="text-xs text-cal-muted">{staff.email}</p>
                        <p className="mt-1 font-cal-mono text-[11px] text-cal-muted">{staff.id}</p>
                      </td>
                      <td><div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-cal-surface-soft px-2 py-1 text-xs">
                          {isAdmin(staff) ? <ShieldCheck size={13} aria-hidden="true" /> : isExpert(staff) ? <Stethoscope size={13} aria-hidden="true" /> : null}
                          {isAdmin(staff) ? "System Admin" : isExpert(staff) ? "Expert Reviewer" : staff.role}
                        </span>
                        {staff.expert_type && <span className="rounded-lg border border-cal-hairline px-2 py-1 text-xs">{staff.expert_type}</span>}
                        {staff.is_verified_clinician && <span title="Historical verification flag; not content approval" className="inline-flex items-center gap-1 rounded-lg bg-cal-success/10 px-2 py-1 text-xs"><BadgeCheck size={13} aria-hidden="true" />Verified</span>}
                      </div></td>
                      <td><StatusBadge status={staff.account_status || staff.status || "Unknown"} /></td>
                      <td className="whitespace-nowrap text-cal-muted">{staff.created_at ? new Date(staff.created_at).toLocaleDateString("en-US", {
                        month: "short", day: "2-digit", year: "numeric", timeZone: "Asia/Manila",
                      }) : "N/A"}</td>
                      <td><button type="button" onClick={() => onOpenStaff(staff)} aria-label={"Manage " + staff.name} className={UI.button.secondary}>Manage</button></td>
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
