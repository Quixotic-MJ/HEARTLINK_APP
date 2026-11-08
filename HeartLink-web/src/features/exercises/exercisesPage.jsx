import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Archive,
  Dumbbell,
  Edit2,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../components/layouts/adminLayout.jsx";
import ExerciseFormModal from "./components/exerciseFormModal.jsx";
import ConfirmActionModal from "../../components/modals/confirmActionModal.jsx";
import LoadError from "../../components/ui/loadError.jsx";
import { apiFetch } from "../../lib/api.js";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useAuth } from "../../contexts/useAuth.js";

import { RoutineMedia } from "./components/routineMedia.jsx";
import { LibraryActionsMenu } from "../../components/ui/libraryActionsMenu.jsx";
import { LibraryBanner } from "../../components/ui/libraryBanner.jsx";
import { LibraryWorkflowTabs } from "../../components/ui/libraryWorkflowTabs.jsx";
import {
  libraryWorkflowCounts,
  matchesLibraryWorkflow,
} from "../../utils/libraryWorkflow.js";
import { LibraryViewSwitch } from "../../components/ui/libraryViewSwitch.jsx";

const EMPTY = [];
const toExercises = (response) =>
  (Array.isArray(response) ? response : response?.data || []).map((row) => ({
    ...row,
    duration: row.duration_minutes,
    mediaUrl: row.media_url || "",
    videoUrl: row.video_url || "",
    guideImages: row.guide_images || [],
    expertValidated: !!(
      row.expert_validated &&
      row.reviewed_by &&
      row.reviewed_at
    ),
    setupSteps: row.setup_steps || [],
    restSeconds: row.rest_seconds || 0,
    skipIf: row.skip_if || [],
    stopIf: row.stop_if || [],
    easierVersion: row.easier_version || "",
    effortHint: row.effort_hint || "",
    reviewNote: row.review_note || "",
    reviewedAt: row.reviewed_at,
    updatedAt: row.updated_at,
  }));

export default function Exercises() {
  const { user } = useAuth();
  const canAuthor = user?.role === "admin";
  const canReview =
    user?.role === "medical_expert" &&
    user?.expert_type === "Physical Therapist";
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const [status, setStatus] = useState("all");
  const [view, setView] = useState("grid");
  const [modal, setModal] = useState({ open: false, item: null });
  const [archiveItem, setArchiveItem] = useState(null);
  const query = useApiQuery("/api/exercises/", { select: toExercises });
  const routines = query.data ?? EMPTY;
  const statusCounts = libraryWorkflowCounts(routines);
  const filtered = routines.filter((routine) => {
    const match = `${routine.name} ${routine.description || ""}`
      .toLowerCase()
      .includes(search.toLowerCase().trim());
    return match && matchesLibraryWorkflow(routine, status);
  });
  const close = () => setModal({ open: false, item: null });
  const save = async (data) => {
    const item = modal.item;
    const result = await apiFetch(
      item ? `/api/exercises/${item.id}` : "/api/exercises/",
      {
        method: item ? "PUT" : "POST",
        body: JSON.stringify(
          item ? { ...data, expectedUpdatedAt: item.updatedAt } : data,
        ),
      },
    );
    toast.success(
      data.status === "published" ? "Routine published" : "Routine saved",
    );
    return result;
  };
  const changeStatus = async (item, next) => {
    await apiFetch(`/api/exercises/${item.id}`, {
      method: "PUT",
      body: JSON.stringify({ status: next, expectedUpdatedAt: item.updatedAt }),
    });
    toast.success(
      next === "archived" ? "Routine archived" : "Routine restored to draft",
    );
  };

  const renderActions = (routine) => (
    <LibraryActionsMenu
      name={routine.name}
      actions={[
        {
          label: canAuthor
            ? "Edit routine"
            : canReview && routine.status !== "archived"
              ? "Review routine"
              : "View routine",
          icon: Edit2,
          onSelect: () => setModal({ open: true, item: routine }),
        },
        ...(canAuthor &&
        ["draft", "published", "archived"].includes(routine.status)
          ? [
              {
                label:
                  routine.status === "archived"
                    ? "Restore to draft"
                    : "Archive",
                icon: Archive,
                onSelect: () => setArchiveItem(routine),
              },
            ]
          : []),
      ]}
    />
  );

  return (
    <AdminLayout>
      <div className="workspace workspace--exercise mx-auto max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        <LibraryBanner
          icon={Dumbbell}
          title={canReview ? "Routine review" : "Exercise library"}
          description={
            canReview
              ? "Review the movement, timing and instructions of the saved revision."
              : "Movement with a clear purpose. Build beginner routines, refine with PT feedback, and publish the approved revision."
          }
          unavailable={query.isPending || query.isError}
          stats={[
            ["All routines", routines.length],
            ["Ready to publish", statusCounts.approved],
            [
              "Published",
              routines.filter((item) => item.status === "published").length,
            ],
          ]}
          action={
            canAuthor && (
              <button
                type="button"
                onClick={() => setModal({ open: true, item: null })}
              >
                <Plus size={17} aria-hidden="true" />
                Create routine
              </button>
            )
          }
        />
        <section aria-label="Routine library" className="library-panel">
          <div className="library-toolbar">
            <div className="workspace-search-row">
              <LibraryViewSwitch value={view} onChange={setView} />
              <label className="workspace-search">
                <Search size={16} aria-hidden="true" />
                <span className="sr-only">Search routines</span>
                <input
                  type="search"
                  value={search}
                  placeholder="Search routines"
                  onChange={(e) =>
                    setParams(
                      (prev) => {
                        const next = new URLSearchParams(prev);
                        if (e.target.value) next.set("search", e.target.value);
                        else next.delete("search");
                        return next;
                      },
                      { replace: true },
                    )
                  }
                />
              </label>
              {(search || status !== "all") && (
                <button
                  type="button"
                  className="workspace-toolbar-button"
                  onClick={() => {
                    setParams(
                      (prev) => {
                        const next = new URLSearchParams(prev);
                        next.delete("search");
                        return next;
                      },
                      { replace: true },
                    );
                    setStatus("all");
                  }}
                >
                  <RotateCcw size={14} aria-hidden="true" /> Reset filters
                </button>
              )}
            </div>
            <div className="library-workflow-row">
              <LibraryWorkflowTabs
                value={status}
                onChange={setStatus}
                counts={statusCounts}
                unavailable={query.isPending || query.isError}
                label="Filter routines by status"
              />
              <p className="library-results" role="status">
                {query.isPending || query.isError
                  ? "Counts unavailable"
                  : `${filtered.length} of ${routines.length} routines`}
              </p>
            </div>
          </div>
          {query.isError ? (
            <LoadError what="the routine library" onRetry={query.refetch} />
          ) : query.isPending ? (
            <p role="status" className="p-8 text-cal-muted">
              Loading routines…
            </p>
          ) : filtered.length ? (
            view === "grid" ? (
              <div className="library-grid" aria-label="Routine gallery">
                {filtered.map((routine) => (
                  <article key={routine.id} className="library-card">
                    <button
                      type="button"
                      className="library-card-media"
                      aria-label={`Preview ${routine.name}`}
                      onClick={() => setModal({ open: true, item: routine })}
                    >
                      <RoutineMedia
                        image={routine.mediaUrl}
                        video={routine.videoUrl}
                      />
                    </button>
                    <div className="library-card-body">
                      <div className="flex items-start justify-between gap-2">
                        <h3>
                          <button
                            type="button"
                            onClick={() =>
                              setModal({ open: true, item: routine })
                            }
                          >
                            {routine.name || "Untitled routine"}
                          </button>
                        </h3>
                        <span
                          className="workspace-pill"
                          data-status={routine.status}
                        >
                          {routine.status}
                        </span>
                      </div>
                      <p className="library-card-description">
                        {routine.type || "Type not set"} ·{" "}
                        {routine.setting || "Setting not set"}
                      </p>
                      <div className="library-card-facts">
                        <span>
                          {routine.duration
                            ? `${routine.duration} min`
                            : "Duration not set"}
                        </span>
                        <span>{routine.position || "Position not set"}</span>
                      </div>
                      <div className="library-card-footer">
                        <span className="library-card-review">
                          <ShieldCheck size={14} aria-hidden="true" />
                          {routine.expertValidated
                            ? "PT approved"
                            : routine.reviewNote
                              ? "Changes requested"
                              : "Awaiting review"}
                        </span>
                        {renderActions(routine)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div
                className="overflow-x-auto"
                role="region"
                aria-label="Routine list"
                tabIndex={0}
              >
                <table className="workspace-table w-full min-w-[760px] text-left text-[14px]">
                  <thead className="border-b border-cal-hairline bg-cal-surface-soft text-[12px] text-cal-muted">
                    <tr>
                      {["Routine", "Timeline", "PT review", "Actions"].map(
                        (label) => (
                          <th
                            key={label}
                            scope="col"
                            className="px-5 py-3 font-medium"
                          >
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cal-hairline">
                    {filtered.map((routine) => (
                      <tr key={routine.id}>
                        <td className="max-w-[440px] px-5 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              className="routine-list-media"
                              aria-label={`Preview media for ${routine.name}`}
                              onClick={() =>
                                setModal({ open: true, item: routine })
                              }
                            >
                              <RoutineMedia
                                image={routine.mediaUrl}
                                video={routine.videoUrl}
                              />
                            </button>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setModal({ open: true, item: routine })
                                  }
                                  className="text-left font-semibold text-cal-ink underline-offset-4 hover:underline"
                                >
                                  {routine.name || "Untitled routine"}
                                </button>
                                <span
                                  className="workspace-pill"
                                  data-status={routine.status}
                                >
                                  {routine.status}
                                </span>
                              </div>
                              <p className="mt-1 text-[13px] text-cal-muted">
                                {routine.type || "Type not set"} ·{" "}
                                {routine.setting || "Setting not set"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="tabular-nums">
                            {routine.duration
                              ? `${routine.duration} min`
                              : "Duration not set"}
                          </span>
                          <p className="mt-1 text-[13px] text-cal-muted">
                            {routine.position || "Position not set"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="library-card-review">
                            <ShieldCheck size={13} aria-hidden="true" />
                            {routine.expertValidated
                              ? "PT approved"
                              : routine.reviewNote
                                ? "Changes requested"
                                : "Awaiting PT review"}
                          </p>
                        </td>
                        <td className="px-5 py-4">{renderActions(routine)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="p-10 text-center">
              <p className="font-semibold">
                {routines.length ? "No matching routines" : "No routines yet"}
              </p>
              <p className="mt-2 text-[14px] text-cal-muted">
                {canAuthor
                  ? "Create a draft or adjust your filters."
                  : "Routines available for your review will appear here."}
              </p>
            </div>
          )}
        </section>
        <ExerciseFormModal
          isOpen={modal.open}
          onClose={close}
          exercise={modal.item}
          canAuthor={canAuthor}
          isPT={canReview}
          onSave={save}
          onReview={(data) =>
            apiFetch(`/api/exercises/${modal.item.id}/review`, {
              method: "POST",
              body: JSON.stringify(data),
            }).then((result) => {
              toast.success(
                data.decision === "approve"
                  ? "Revision approved"
                  : "Changes requested",
              );
              return result;
            })
          }
        />
        <ConfirmActionModal
          className="workspace workspace--exercise"
          variant="warning"
          entityInfo={
            archiveItem
              ? {
                  name: archiveItem.name,
                  email: archiveItem.type,
                  avatar: (
                    <RoutineMedia
                      image={archiveItem.mediaUrl}
                      video={archiveItem.videoUrl}
                    />
                  ),
                }
              : null
          }
          impactDetails={
            archiveItem?.status === "archived"
              ? ["Publishing again requires approval of the current revision."]
              : [
                  "Restore it to Draft from the Archived tab when needed.",
                  "Publishing again requires approval of the current revision.",
                ]
          }
          isOpen={!!archiveItem}
          onClose={() => setArchiveItem(null)}
          title={
            archiveItem?.status === "archived"
              ? "Restore routine to draft?"
              : "Archive routine?"
          }
          description={
            archiveItem?.status === "archived"
              ? "Return this routine to Draft for review. It will not be published automatically."
              : "Remove this routine from app discovery. Existing activity history stays intact; this does not delete the routine."
          }
          confirmText={
            archiveItem?.status === "archived"
              ? "Restore to draft"
              : "Archive routine"
          }
          icon={Archive}
          onConfirm={async () => {
            try {
              await changeStatus(
                archiveItem,
                archiveItem.status === "archived" ? "draft" : "archived",
              );
            } catch (error) {
              toast.error("Could not change routine status", {
                description: error?.data?.detail || "Please try again.",
              });
              throw error;
            }
          }}
        />
      </div>
    </AdminLayout>
  );
}
