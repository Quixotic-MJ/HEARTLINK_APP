import { Search, X } from "lucide-react";
import { formatUserRef } from "../../utils/formatUserRef";
import LoadError from "../ui/LoadError";
import { KpiCard, StatusBadge } from "../../styles/designSystem";
import { UI } from "../../styles/tokens";

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
  if (loading)
    return (
      <p role="status" className="py-14 text-center text-cal-muted">
        Loading app accounts…
      </p>
    );
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard label="App accounts" value={pool.length.toLocaleString()} />
        <KpiCard
          label="Active accounts"
          value={pool
            .filter((u) => u.status === "Active")
            .length.toLocaleString()}
        />
      </div>
      <p className="text-sm text-cal-muted">
        Account access and support metadata only. Active means enabled access,
        not recent app usage.
      </p>
      <section className={UI.card.root} aria-label="App account directory">
        <div className={UI.card.header}>
          <div
            role="group"
            aria-label="Filter app accounts"
            className="flex flex-wrap gap-1"
          >
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={filterStatus === key}
                onClick={() => onFilterChange(key)}
                className={
                  filterStatus === key ? UI.button.primary : UI.button.ghost
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <label htmlFor="user-directory-search" className="sr-only">
              Search app accounts
            </label>
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cal-muted"
            />
            <input
              id="user-directory-search"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by ID, name or phone"
              className={UI.input.search + " pr-10"}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-1 top-1 h-8 w-8 rounded-lg text-cal-muted"
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <div
          className="w-full overflow-x-auto"
          role="region"
          aria-label="App accounts table"
          tabIndex={0}
        >
          <table className="w-full min-w-[660px] border-collapse text-left text-sm">
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
              {users.length ? (
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
    </div>
  );
}
