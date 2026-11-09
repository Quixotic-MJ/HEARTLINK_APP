import { Search, X } from "lucide-react";
import { formatUserRef } from "../../../utils/formatUserRef.js";
import LoadError from "../../../components/ui/loadError.jsx";
import { StatusBadge } from "../../../styles/designSystem.jsx";
import { Skeleton } from "../../../components/ui/skeleton.jsx";
import { UI } from "../../../styles/tokens.js";

const FILTERS = [
  ["all", "All"],
  ["active", "Active"],
  ["disabled", "Disabled"],
  ["archived", "Archived"],
];

export default function UserListView({
  users,
  allUsers,
  searchQuery,
  onSearchChange,
  onClearSearch,
  filterStatus,
  onFilterChange,
  onOpenUser,
  loading,
  error = false,
  onRetry,
}) {
  const pool = allUsers || users;
  const clearSearch = () =>
    onClearSearch ? onClearSearch() : onSearchChange("");
  if (error) return <LoadError what="app accounts" onRetry={onRetry} />;
  return (
      <section className={UI.card.root} aria-label="App account directory" aria-busy={loading}>
        <div className="accounts-toolbar">
          <div
            role="group"
            aria-label="Filter app accounts"
            className="accounts-filter-group"
          >
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={filterStatus === key}
                onClick={() => onFilterChange(key)}
                className={filterStatus === key ? UI.button.primary : UI.button.ghost}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="workspace-search">
            <label htmlFor="user-directory-search" className="sr-only">
              Search app accounts
            </label>
            <Search
              size={15}
              aria-hidden="true"
            />
            <input
              id="user-directory-search"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by ID, name or phone"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="rounded-lg text-cal-muted"
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <div className="accounts-context">
          <span>{loading ? "Loading app accounts…" : <><strong>{users.length.toLocaleString()}</strong> of {pool.length.toLocaleString()} accounts shown</>}</span>
          <span>{!loading && <><strong>{pool.filter((u) => u.status === "Active").length.toLocaleString()}</strong> enabled · </>}Active means sign-in access, not recent usage.</span>
        </div>
        <div
          className="w-full overflow-x-auto"
          role="region"
          aria-label="App accounts table"
          tabIndex={0}
        >
          <table className="accounts-table workspace-table w-full min-w-[660px] border-collapse text-left text-sm">
            <thead className="bg-cal-surface-soft text-cal-muted">
              <tr>
                {[
                  "App user",
                  "Account reference",
                  "Registered",
                  "Access",
                  "Plan",
                  "Action",
                ].map((label) => (
                  <th key={label} scope="col" className="p-4 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cal-hairline">
              {loading ? (
                [1, 2, 3].map((row) => <tr key={row}><td colSpan={6}><Skeleton className="h-10 w-full" /></td></tr>)
              ) : users.length ? (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => onOpenUser(user)}
                        className="text-left font-semibold hover:underline"
                      >
                        {user.name}
                      </button>
                    </td>
                    <td className="p-4 font-cal-mono text-xs">
                      {formatUserRef(user.id)}
                    </td>
                    <td className="p-4">{user.regDate}</td>
                    <td className="p-4">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="p-4 text-cal-muted">
                      {user.isPremium
                        ? user.premiumSource === "trial"
                          ? "Premium trial"
                          : "Premium"
                        : "Free"}
                    </td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => onOpenUser(user)}
                        aria-label={"Manage " + user.name}
                        className={UI.button.secondary}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <p>
                      {pool.length
                        ? "No accounts match these filters."
                        : "No app accounts yet."}
                    </p>
                    {(searchQuery || filterStatus !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          onFilterChange("all");
                          clearSearch();
                        }}
                        className={UI.button.secondary + " mx-auto mt-4"}
                      >
                        Reset filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
  );
}
