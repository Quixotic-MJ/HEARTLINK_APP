import {
  Search,
  ShieldCheck,
  Heart,
  Ban,
  CheckCircle2,
  Activity,
  UserCheck,
  AlertTriangle,
  ChevronDown,
  Users,
  AlertCircle,
  Crown,
} from "lucide-react";
import { formatUserRef } from "../../utils/formatUserRef";
import { Skeleton } from "../ui/Skeleton";

// HL-084: the patient's plan; Premium shows its end date on hover
const getPlanBadge = (user) =>
  user.isPremium ? (
    <span
      title={user.premiumUntil ? `Premium until ${new Date(user.premiumUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : undefined}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider bg-ds-yellow text-ds-warm-text border border-ds-yellow"
    >
      <Crown size={10} /> {user.premiumSource === "trial" ? "Trial" : "Premium"}
    </span>
  ) : (
    <span className="text-[12px] text-ds-steel">Free</span>
  );

const UserListView = ({
  users,
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterChange,
  onOpenUser,
  loading,
}) => {
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "Active" || u.status === "active").length;
  const elevatedRisk = users.filter((u) => u.hssScore !== null && u.hssScore !== undefined && u.hssScore < 60).length;
  const evaluated = users.filter((u) => u.reviewStatus === "Evaluated").length;

  const getStatusBadge = (status) => {
    if (status === "Active" || status === "active") {
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

  const getHssBadge = (score) => {
    if (score === null || score === undefined) {
      return (
        <span className="bg-ds-surface text-ds-steel border border-ds-hairline px-2 py-0.5 rounded-[4px] text-[11px] font-semibold uppercase tracking-wider w-fit inline-block">
          N/A
        </span>
      );
    }

    let standardTier;
    let colorClasses;

    if (score >= 80) {
      standardTier = "Stable";
      colorClasses = "bg-ds-mint text-ds-charcoal border-ds-mint";
    } else if (score >= 60) {
      standardTier = "Moderate";
      colorClasses = "bg-ds-yellow text-ds-warm-text border-ds-yellow-bold";
    } else if (score >= 50) {
      standardTier = "Elevated Risk";
      colorClasses = "bg-ds-tint text-ds-on-tint border-ds-tint";
    } else {
      standardTier = "Critical";
      colorClasses = "bg-ds-rose text-ds-ink border-ds-rose";
    }

    return (
      <span className={`${colorClasses} border px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit`}>
        <Heart size={10} className="fill-current" /> {score} ({standardTier})
      </span>
    );
  };

  const getActivityBadge = (activity) => {
    if (activity === "Recently Active") {
      return (
        <span className="bg-ds-mint text-ds-charcoal border border-ds-mint px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
          <Activity size={10} /> Active
        </span>
      );
    } else if (activity === "Inactive") {
      return (
        <span className="bg-ds-yellow text-ds-warm-text border border-ds-yellow-bold px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
          <AlertTriangle size={10} /> Inactive
        </span>
      );
    } else if (activity === "Sparse Data" || activity === "Sparse") {
      return (
        <span className="bg-ds-tint text-ds-on-tint border border-ds-tint px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
          <AlertTriangle size={10} /> Sparse
        </span>
      );
    }
    return (
      <span className="bg-ds-surface text-ds-slate border border-ds-hairline px-2 py-0.5 rounded-[4px] text-[11px] font-semibold uppercase tracking-wider w-fit">
        New
      </span>
    );
  };

  const getOnboardingBadge = (status) => {
    if (status === "Complete" || status === "complete") {
      return (
        <span className="bg-ds-surface text-ds-ink border border-ds-hairline px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
          <UserCheck size={10} /> Done
        </span>
      );
    }
    return (
      <span className="bg-ds-yellow text-ds-warm-text border border-ds-yellow-bold px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider w-fit">
        Pending
      </span>
    );
  };

  const getReviewBadge = (status) => {
    if (status === "Evaluated") {
      return (
        <span className="bg-ds-mint text-ds-charcoal border border-ds-mint px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
          <ShieldCheck size={10} /> Evaluated
        </span>
      );
    }
    return (
      <span className="bg-ds-yellow text-ds-warm-text border border-ds-yellow-bold px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider w-fit">
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── METRICS ROW ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-ds-canvas border border-ds-hairline rounded-xl p-4 ">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider">Total Patients</p>
            <Users size={13} className="text-ds-steel" />
          </div>
          <p className="text-[26px] font-bold text-ds-ink leading-tight">
            {loading ? "…" : totalUsers}
          </p>
        </div>

        <div className="bg-ds-canvas border border-ds-hairline rounded-xl p-4 ">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider">Active Accounts</p>
            <CheckCircle2 size={13} className="text-ds-charcoal" />
          </div>
          <p className="text-[26px] font-bold text-ds-charcoal leading-tight">
            {loading ? "…" : activeUsers}
          </p>
        </div>

        <div className="bg-ds-canvas border border-ds-hairline rounded-xl p-4 ">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider">Elevated Risk</p>
            <AlertCircle size={13} className="text-ds-primary" />
          </div>
          <p className="text-[26px] font-bold text-ds-primary leading-tight">
            {loading ? "…" : elevatedRisk}
          </p>
        </div>

        <div className="bg-ds-canvas border border-ds-hairline rounded-xl p-4 ">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider">Evaluated</p>
            <ShieldCheck size={13} className="text-ds-ink" />
          </div>
          <p className="text-[26px] font-bold text-ds-ink leading-tight">
            {loading ? "…" : evaluated}
          </p>
        </div>
      </div>

      {/* ── USERS DIRECTORY TABLE CARD ── */}
      <div className="bg-ds-canvas rounded-xl border border-ds-hairline flex flex-col overflow-hidden ">
        {/* Search & Filter bar */}
        <div className="p-4 border-b border-ds-hairline bg-ds-canvas flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-steel pointer-events-none" />
            <input
              type="text"
              placeholder="Search by ID, name, or phone…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-[13px] border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink transition-colors bg-ds-surface text-ds-ink placeholder:text-ds-steel"
            />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => onFilterChange(e.target.value)}
              className="pl-3 pr-7 py-2 text-[12px] font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink appearance-none cursor-pointer hover:border-ds-steel transition-colors"
            >
              <option value="all">All Accounts</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="premium">Premium</option>
              <option value="free">Free plan</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
              <ChevronDown size={12} className="text-ds-steel" />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-ds-hairline bg-ds-surface/40">
                <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                  Patient Name
                </th>
                <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                  User ID
                </th>
                <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                  HSS Score
                </th>
                <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                  Activity
                </th>
                <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                  Account
                </th>
                <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                  Plan
                </th>
                <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                  Onboarding
                </th>
                <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                  Review
                </th>
                <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em] text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ds-hairline">
              {loading ? (
                [1, 2, 3, 4, 5].map((item) => (
                  <tr key={item} className="border-t border-ds-hairline/60">
                    <td className="py-3.5 px-5"><Skeleton className="w-28 h-4 bg-ds-hairline/70 rounded" /></td>
                    <td className="py-3.5 px-5"><Skeleton className="w-16 h-4 bg-ds-hairline/70 rounded" /></td>
                    <td className="py-3.5 px-5"><Skeleton className="w-20 h-4 bg-ds-hairline/70 rounded" /></td>
                    <td className="py-3.5 px-5"><Skeleton className="w-20 h-4 bg-ds-hairline/70 rounded" /></td>
                    <td className="py-3.5 px-5"><Skeleton className="w-16 h-4 bg-ds-hairline/70 rounded" /></td>
                    <td className="py-3.5 px-5"><Skeleton className="w-12 h-4 bg-ds-hairline/70 rounded" /></td>
                    <td className="py-3.5 px-5"><Skeleton className="w-16 h-4 bg-ds-hairline/70 rounded" /></td>
                    <td className="py-3.5 px-5"><Skeleton className="w-16 h-4 bg-ds-hairline/70 rounded" /></td>
                    <td className="py-3.5 px-5 text-right"><Skeleton className="w-16 h-7 ml-auto bg-ds-hairline/70 rounded-[6px]" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 px-5 text-center text-ds-slate text-[13px]">
                    No user accounts match the search or filter settings.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-ds-surface/60 transition-colors group cursor-pointer"
                    onClick={() => onOpenUser(user)}
                  >
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-ds-tint text-ds-on-tint border border-ds-tint flex items-center justify-center font-bold text-xs shrink-0">
                          {user.name?.charAt(0) || "P"}
                        </div>
                        <p className="text-ds-ink font-semibold text-[13px] group-hover:text-ds-primary transition-colors">
                          {user.name}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      <span className="text-[11px] font-bold bg-ds-surface px-2 py-0.5 rounded-[5px] text-ds-ink border border-ds-hairline uppercase tracking-wider">
                        {formatUserRef(user.id)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      {getHssBadge(user.hssScore, user.hssTier)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      {getActivityBadge(user.activityStatus)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      {getPlanBadge(user)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      {getOnboardingBadge(user.onboardingStatus)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle">
                      {getReviewBadge(user.reviewStatus)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenUser(user)}
                        className="text-[12px] font-semibold px-2.5 py-1 rounded-[6px] border border-ds-hairline bg-ds-surface text-ds-ink hover:bg-ds-hairline transition-colors cursor-pointer"
                      >
                        Manage
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

export default UserListView;
