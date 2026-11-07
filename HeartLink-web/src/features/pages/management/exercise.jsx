import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Archive, Dumbbell, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../../components/layouts/adminLayout";
import ExerciseFormModal from "../../../components/modals/ExerciseFormModal";
import ConfirmActionModal from "../../../components/modals/ConfirmActionModal";
import LoadError from "../../../components/ui/LoadError";
import { apiFetch } from "../../../api";
import { useApiQuery } from "../../../hooks/useApiQuery";
import { useAuth } from "../../../contexts/useAuth";

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
const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-cal-hairline bg-cal-canvas px-3 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft disabled:opacity-50 disabled:cursor-not-allowed";
const control =
  "min-h-10 rounded-[10px] border border-cal-hairline bg-cal-canvas px-3 text-[14px] text-cal-ink";

export default function Exercises() {
  const { user } = useAuth();
  const canAuthor = user?.role === "admin";
  const canReview =
    user?.role === "medical_expert" &&
    user?.expert_type === "Physical Therapist";
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const [status, setStatus] = useState("all");
  const [review, setReview] = useState("all");
  const [modal, setModal] = useState({ open: false, item: null });
  const [archiveItem, setArchiveItem] = useState(null);
  const query = useApiQuery("/api/exercises/", { select: toExercises });
  const routines = query.data ?? EMPTY;
  const filtered = routines.filter((routine) => {
    const match = `${routine.name} ${routine.description || ""}`
      .toLowerCase()
      .includes(search.toLowerCase().trim());
    return (
      match &&
      (status === "all" || routine.status === status) &&
      (review === "all" ||
        (review === "approved"
          ? routine.expertValidated
          : !routine.expertValidated && routine.status !== "archived"))
    );
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

  return (
    <AdminLayout>
      <div className="mx-auto max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-cal-muted">
              <Dumbbell size={16} aria-hidden="true" /> Content library
            </p>
            <h2 className="font-cal-display text-[30px] font-semibold tracking-[-0.6px]">
              {canReview ? "Routine review" : "Exercise library"}
            </h2>
            <p className="mt-2 max-w-[65ch] text-[14px] leading-relaxed text-cal-muted">
              {canReview
                ? "Review the complete movement timeline, equipment and instructions. Your decision applies to the revision you open."
                : "Author beginner routines, respond to PT feedback, and publish the approved revision."}
            </p>
          </div>
          {canAuthor && (
            <button
              type="button"
              onClick={() => setModal({ open: true, item: null })}
              className={`${button} border-transparent bg-cal-primary text-cal-on-primary hover:bg-cal-primary-active`}
            >
              <Plus size={16} aria-hidden="true" /> Create routine
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Total routines", routines.length],
            [
              "Published",
              routines.filter(
                (r) => r.status === "published" && r.expertValidated,
              ).length,
            ],
            ["PT approved", routines.filter((r) => r.expertValidated).length],
            [
              "Awaiting review",
              routines.filter(
                (r) => !r.expertValidated && r.status !== "archived",
              ).length,
            ],
          ].map(([label, count]) => (
            <div
              key={label}
              className="rounded-[16px] border border-cal-hairline bg-cal-canvas p-5"
            >
              <p className="text-[13px] text-cal-muted">{label}</p>
              <p className="mt-2 text-[28px] font-semibold tabular-nums">
                {query.isPending ? "—" : count}
              </p>
            </div>
          ))}
        </div>
        <section
          aria-label="Routine library"
          className="overflow-hidden rounded-[16px] border border-cal-hairline bg-cal-canvas"
        >
          <div className="flex flex-wrap items-center gap-3 border-b border-cal-hairline p-4">
            <label className="flex min-w-0 flex-1 items-center gap-2">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Search routines</span>
              <input
                value={search}
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
                placeholder="Search routines"
                className={`${control} w-full min-w-[140px]`}
              />
            </label>
            <label>
              <span className="sr-only">Publication status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={control}
              >
                {["all", "draft", "published", "archived"].map((value) => (
                  <option key={value} value={value}>
                    {value === "all"
                      ? "All statuses"
                      : value[0].toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Review status</span>
              <select
                value={review}
                onChange={(e) => setReview(e.target.value)}
                className={control}
              >
                <option value="all">All reviews</option>
                <option value="pending">Awaiting review</option>
                <option value="approved">PT approved</option>
              </select>
            </label>
          </div>
          {query.isError ? (
            <LoadError what="the routine library" onRetry={query.refetch} />
          ) : query.isPending ? (
            <p role="status" className="p-8 text-cal-muted">
              Loading routines…
            </p>
          ) : filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead className="border-b border-cal-hairline bg-cal-surface-soft text-[12px] text-cal-muted">
                  <tr>
                    {[
                      "Routine",
                      "Timeline",
                      "Review & publication",
                      "Actions",
                    ].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-5 py-3 font-medium"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-cal-hairline">
                  {filtered.map((routine) => (
                    <tr key={routine.id}>
                      <td className="max-w-[340px] px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            setModal({ open: true, item: routine })
                          }
                          className="text-left font-semibold text-cal-ink underline-offset-4 hover:underline"
                        >
                          {routine.name || "Untitled routine"}
                        </button>
                        <p className="mt-1 text-[13px] text-cal-muted">
                          {routine.type || "Type not set"} ·{" "}
                          {routine.setting || "Setting not set"}
                        </p>
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
                        <span className="rounded-full bg-cal-surface-soft px-2.5 py-1 text-[12px] font-medium">
                          {routine.status}
                        </span>
                        <p className="mt-2 text-[13px] text-cal-muted">
                          {routine.expertValidated
                            ? "PT approved"
                            : routine.reviewNote
                              ? "Changes requested"
                              : "Awaiting PT review"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setModal({ open: true, item: routine })
                            }
                            className={button}
                          >
                            {canReview ? "Review" : "Open"}
                          </button>
                          {canAuthor && (
                            <button
                              type="button"
                              onClick={() => setArchiveItem(routine)}
                              className={button}
                            >
                              {routine.status === "archived"
                                ? "Restore"
                                : "Archive"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          isOpen={!!archiveItem}
          onClose={() => setArchiveItem(null)}
          title={
            archiveItem?.status === "archived"
              ? "Restore routine to draft?"
              : "Archive routine?"
          }
          description="Existing activity history stays intact. Publication still requires approval of the current revision."
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
