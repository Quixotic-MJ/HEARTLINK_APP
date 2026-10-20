import React, { useState } from "react";
import {
  Search,
  ShieldCheck,
  Stethoscope,
  ChevronRight,
  UserPlus,
  Ban,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  Users,
  Shield,
} from "lucide-react";
import { Skeleton } from "../ui/Skeleton";

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
  const admins = staffList.filter((s) => s.role === "System Admin" || s.db_role === "admin").length;
  const experts = staffList.filter((s) => s.role === "Authorized Medical Expert" || s.db_role === "medical_expert").length;
  const activeStaff = staffList.filter((s) => s.account_status === "active" || s.status?.toLowerCase() === "active").length;

  const handleClearFilters = () => {
    setInternalSearch("");
    setFilterRole("all");
    setFilterStatus("all");
  };

  if (error) {
    return (
      <div className="bg-ds-canvas rounded-xl border border-ds-hairline p-10 flex flex-col items-center justify-center text-center ">
        <p className="text-[13px] font-semibold text-ds-ink mb-3">Unable to load staff accounts.</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 text-[12px] font-semibold text-white bg-ds-primary hover:bg-ds-primary-pressed rounded-[8px] transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  // Filtering
  const filtered = staffList.filter((s) => {
    const searchString = internalSearch.toLowerCase();
    const nameMatch = s.name?.toLowerCase().includes(searchString) || false;
    const idMatch = s.id?.toLowerCase().includes(searchString) || false;
    const emailMatch = s.email?.toLowerCase().includes(searchString) || false;
    const matchSearch = nameMatch || idMatch || emailMatch;

    // Role Match
    let matchRole = true;
    if (filterRole === "admin") {
      matchRole = s.role === "System Admin" || s.db_role === "admin";
    } else if (filterRole === "medical_expert") {
      matchRole = s.role === "Authorized Medical Expert" || s.db_role === "medical_expert";
    } else if (filterRole === "super_admin") {
      matchRole = s.role === "Super Admin" || s.db_role === "super_admin";
    }

    // Status Match
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
        <span className="bg-ds-mint text-ds-charcoal border border-ds-mint px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
          <CheckCircle2 size={10} /> Active
        </span>
      );
    }
    return (
      <span className="bg-ds-rose text-ds-ink border border-ds-rose px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
        <Ban size={10} /> Disabled
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const isExpert = role.includes("Expert") || role === "medical_expert";
    const isSuper = role.includes("Super") || role === "super_admin";
    
    let color = "bg-ds-surface text-ds-ink border-ds-hairline";
    let icon = <ShieldCheck size={11} />;
    
    if (isExpert) {
      color = "bg-ds-mint text-ds-charcoal border-ds-mint";
      icon = <Stethoscope size={11} />;
    } else if (isSuper) {
      color = "bg-ds-tint text-ds-on-tint border-ds-tint";
      icon = <ShieldCheck size={11} />;
    }

    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-[4px] border uppercase tracking-wider ${color}`}>
        {icon} {role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── METRICS ROW ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-ds-canvas border border-ds-hairline rounded-xl p-4 ">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider">Total Staff</p>
            <Users size={13} className="text-ds-steel" />
          </div>
          <p className="text-[26px] font-bold text-ds-ink leading-tight">
            {loading ? "…" : totalStaff}
          </p>
        </div>

        <div className="bg-ds-canvas border border-ds-hairline rounded-xl p-4 ">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider">System Admins</p>
            <Shield size={13} className="text-ds-ink" />
          </div>
          <p className="text-[26px] font-bold text-ds-ink leading-tight">
            {loading ? "…" : admins}
          </p>
        </div>

        <div className="bg-ds-canvas border border-ds-hairline rounded-xl p-4 ">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider">Expert Reviewers</p>
            <Stethoscope size={13} className="text-ds-charcoal" />
          </div>
          <p className="text-[26px] font-bold text-ds-charcoal leading-tight">
            {loading ? "…" : experts}
          </p>
        </div>

        <div className="bg-ds-canvas border border-ds-hairline rounded-xl p-4 ">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider">Active Staff</p>
            <CheckCircle2 size={13} className="text-ds-charcoal" />
          </div>
          <p className="text-[26px] font-bold text-ds-charcoal leading-tight">
            {loading ? "…" : activeStaff}
          </p>
        </div>
      </div>

      {/* ── STAFF DIRECTORY TABLE CARD ── */}
      <div className="bg-ds-canvas rounded-xl border border-ds-hairline flex flex-col overflow-hidden ">
        {/* Search, Filters, and Actions */}
        <div className="p-4 border-b border-ds-hairline bg-ds-canvas flex flex-col lg:flex-row justify-between items-center gap-3">
          <div className="flex flex-col sm:flex-row flex-1 w-full gap-2.5">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-steel pointer-events-none" />
              <input
                type="text"
                placeholder="Search staff by ID, name, or email…"
                value={internalSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-[13px] border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink transition-colors bg-ds-surface text-ds-ink placeholder:text-ds-steel"
              />
            </div>
            
            {/* Role Filter */}
            <div className="relative">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full sm:w-auto pl-3 pr-7 py-2 text-[12px] font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink appearance-none cursor-pointer hover:border-ds-steel transition-colors"
              >
                <option value="all">All Roles</option>
                <option value="admin">System Admin</option>
                <option value="medical_expert">Expert Reviewer</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <ChevronDown size={12} className="text-ds-steel" />
              </div>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-auto pl-3 pr-7 py-2 text-[12px] font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink appearance-none cursor-pointer hover:border-ds-steel transition-colors"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <ChevronDown size={12} className="text-ds-steel" />
              </div>
            </div>
          </div>

          <button
            onClick={onCreateStaff}
            className="flex items-center justify-center w-full lg:w-auto gap-2 bg-ds-primary hover:bg-ds-primary-pressed text-white font-semibold text-[13px] px-4 py-2 rounded-[8px] transition-colors shrink-0 cursor-pointer"
          >
            <UserPlus size={14} /> <span>Create staff account</span>
          </button>
        </div>

        {/* Directory Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-ds-hairline bg-ds-surface/40">
                <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                  Staff Member
                </th>
                <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                  Role
                </th>
                <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                  Status
                </th>
                <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                  Created
                </th>
                <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em] text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ds-hairline">
              {loading ? (
                [1, 2, 3].map((item) => (
                  <tr key={item} className="border-t border-ds-hairline/60">
                    <td className="py-3.5 px-5"><Skeleton className="w-32 h-4 bg-ds-hairline/70 rounded" /></td>
                    <td className="py-3.5 px-5"><Skeleton className="w-24 h-4 bg-ds-hairline/70 rounded" /></td>
                    <td className="py-3.5 px-5"><Skeleton className="w-16 h-4 bg-ds-hairline/70 rounded" /></td>
                    <td className="py-3.5 px-5"><Skeleton className="w-20 h-4 bg-ds-hairline/70 rounded" /></td>
                    <td className="py-3.5 px-5 text-right"><Skeleton className="w-16 h-7 ml-auto bg-ds-hairline/70 rounded-[6px]" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 px-5 text-center text-ds-slate text-[13px]">
                    <p className="mb-2 font-medium">
                      {totalStaff === 0 ? "No staff accounts found." : "No staff accounts match these filters."}
                    </p>
                    {totalStaff > 0 && (
                      <button
                        onClick={handleClearFilters}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-ds-ink border border-ds-hairline bg-ds-surface hover:bg-ds-hairline px-3 py-1.5 rounded-[6px] transition-colors cursor-pointer"
                      >
                        <RotateCcw size={11} /> Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((staff) => (
                  <tr
                    key={staff.id}
                    className="hover:bg-ds-surface/60 transition-colors group cursor-pointer"
                    onClick={() => onOpenStaff(staff)}
                  >
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-ds-tint text-ds-on-tint border border-ds-tint flex items-center justify-center font-bold text-xs shrink-0">
                          {staff.name?.charAt(0) || "S"}
                        </div>
                        <div>
                          <p className="text-ds-ink font-semibold text-[13px] group-hover:text-ds-primary transition-colors leading-tight">
                            {staff.name}
                          </p>
                          <span className="text-[11px] font-bold bg-ds-surface px-1.5 py-0.5 rounded text-ds-slate border border-ds-hairline uppercase tracking-wider">
                            {staff.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      <div className="flex flex-col items-start gap-1">
                        {getRoleBadge(staff.role)}
                        {staff.expert_type && (
                          <span className="text-[11px] font-semibold text-ds-charcoal bg-ds-mint px-1.5 py-0.5 rounded border border-ds-mint">
                            {staff.expert_type}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      {getStatusBadge(staff.account_status || staff.status)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      <span className="text-ds-slate text-[12px] font-medium">
                        {staff.created_at
                          ? new Date(staff.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                          : "N/A"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenStaff(staff)}
                        className="text-[12px] font-semibold px-2.5 py-1 rounded-[6px] border border-ds-hairline bg-ds-surface text-ds-ink hover:bg-ds-hairline transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        Manage <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffListView;
