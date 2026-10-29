import { useState } from "react";
import { HeartPulse, MessagesSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "../../api";
import { useApiQuery } from "../../hooks/useApiQuery";
import ConfirmActionModal from "../modals/ConfirmActionModal";
import LoadError from "../ui/LoadError";
import { Skeleton } from "../ui/Skeleton";
import { TAG } from "./vitals";
import { formatNoteTime } from "./noteTime";

// HL-039 / HL-040: the care team's notes on a patient. Cardiologists write guidance; Dietitians and
// Physical Therapists write to the shared thread. Everyone on the care team (and admins) reads both.
// The backend enforces the same rules (EXPERT_PERMISSIONS in backend/app/utils/security.py).
const MAX_LENGTH = 4000;

const ROLE_TAG = {
  Cardiologist: "border-cal-badge-orange/35 bg-cal-badge-orange/15 text-cal-ink",
  Dietitian: "border-cal-badge-emerald/35 bg-cal-badge-emerald/15 text-cal-ink",
  "Physical Therapist": "border-cal-badge-pink/30 bg-cal-badge-pink/10 text-cal-ink",
};

const ROLE_AVATAR = {
  Cardiologist: "bg-cal-badge-orange/20 text-cal-ink",
  Dietitian: "bg-cal-badge-emerald/20 text-cal-ink",
  "Physical Therapist": "bg-cal-badge-pink/15 text-cal-ink",
};

function authorInitials(name) {
  return (
    (name || "CT")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "CT"
  );
}

function NoteList({ notes, empty, onDelete }) {
  if (!notes.length) {
    return (
      <div className="rounded-[10px] border border-dashed border-cal-hairline bg-cal-surface-soft/60 px-4 py-6 text-center">
        <p className="text-[13.5px] text-cal-muted">{empty}</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {notes.map((note) => {
        const avatarTone =
          ROLE_AVATAR[note.author_expert_type] || "bg-cal-surface-card text-cal-ink";
        const tagTone =
          ROLE_TAG[note.author_expert_type] ||
          "border-cal-hairline bg-cal-surface-card text-cal-muted";

        return (
          <li
            key={note.id}
            className="rounded-[10px] border border-cal-hairline bg-cal-surface-soft/50 p-3.5"
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cal-hairline text-[11px] font-semibold ${avatarTone}`}
              >
                {authorInitials(note.author_name)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[13px] font-semibold text-cal-ink">
                    {note.author_name}
                  </span>
                  <span className={`${TAG} ${tagTone}`}>{note.author_expert_type}</span>
                  <time
                    dateTime={note.created_at}
                    className="font-cal-mono text-[11.5px] text-cal-muted"
                  >
                    {formatNoteTime(note.created_at)}
                  </time>
                  {note.is_mine && (
                    <button
                      type="button"
                      onClick={() => onDelete(note)}
                      aria-label="Remove this note"
                      title="Remove"
                      className="ml-auto flex h-7 w-7 items-center justify-center rounded-[6px] text-cal-muted hover:bg-cal-surface-card hover:text-cal-error transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <p className="mt-1.5 text-[13.5px] leading-[1.55] text-cal-body whitespace-pre-line break-words">
                  {note.body}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Composer({ id, label, placeholder, buttonText, onPost }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    const ok = await onPost(text.trim());
    setSaving(false);
    if (ok) setText("");
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-2.5 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-3.5"
    >
      <label htmlFor={id} className="block text-[12.5px] font-semibold text-cal-ink">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        maxLength={MAX_LENGTH}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-y rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 py-2.5 text-[13.5px] leading-[1.5] text-cal-ink placeholder:text-cal-muted focus:border-cal-ink focus:outline-none transition-colors"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="font-cal-mono text-[11.5px] text-cal-muted">
          {text.length > MAX_LENGTH - 400 ? `${MAX_LENGTH - text.length} chars left` : ""}
        </span>
        <button
          type="submit"
          disabled={saving || !text.trim()}
          className="inline-flex h-9 items-center justify-center rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-4 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted disabled:cursor-not-allowed"
        >
          {saving ? "Posting…" : buttonText}
        </button>
      </div>
    </form>
  );
}

export default function CareNotes({ patientId, expertType }) {
  const [removing, setRemoving] = useState(null);
  const isCardiologist = expertType === "Cardiologist";
  const isThreadMember =
    expertType === "Dietitian" || expertType === "Physical Therapist";

  // A post or delete through apiFetch refreshes this list by itself
  const notesQuery = useApiQuery(`/api/admin/patients/${patientId}/notes`, {
    select: (data) => ({
      guidance: data.guidance || [],
      messages: data.messages || [],
    }),
  });
  const notes = notesQuery.data ?? null;

  const post = (kind) => async (body) => {
    try {
      await apiFetch(`/api/admin/patients/${patientId}/notes`, {
        method: "POST",
        body: JSON.stringify({ kind, body }),
      });
      toast.success(kind === "guidance" ? "Guidance posted." : "Message posted.");
      return true;
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't post that. Please try again.");
      return false;
    }
  };

  const remove = async () => {
    try {
      await apiFetch(`/api/admin/patients/${patientId}/notes/${removing.id}`, {
        method: "DELETE",
      });
      toast.success("Note removed.");
      setRemoving(null);
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't remove that note.");
    }
  };

  if (notesQuery.isError && !notes) {
    return (
      <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <LoadError
          what="the care-team notes"
          onRetry={notesQuery.refetch}
          className="py-10"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 font-cal-sans text-cal-ink">
      {/* ─── 1. CARDIOLOGIST GUIDANCE ──────────────────────────────────────── */}
      <section
        aria-labelledby="guidance-title"
        className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <div className="border-b border-cal-hairline px-5 pt-4 pb-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-badge-orange/20 text-cal-ink">
                <HeartPulse size={15} aria-hidden="true" />
              </span>
              <h2
                id="guidance-title"
                className="font-cal-display text-[18px] font-semibold tracking-[-0.35px] text-cal-ink"
              >
                Cardiologist guidance
              </h2>
            </div>
            {notes && (
              <span className="inline-flex items-center rounded-full border border-cal-hairline bg-cal-surface-soft px-2.5 py-0.5 font-cal-mono text-[11.5px] font-medium tabular-nums text-cal-muted">
                {notes.guidance.length}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[13px] leading-[1.45] text-cal-muted">
            Overall feedback on this patient. Dietitians and physical therapists see it when they approve recipes and exercises.
          </p>
        </div>

        <div className="space-y-4 p-5">
          {isCardiologist && (
            <Composer
              id="guidance-body"
              label="Add guidance"
              placeholder="e.g. BP has been above 140/90 for two weeks. Keep sodium under 1,500 mg a day; light walking only, no heavy lifting."
              buttonText="Post guidance"
              onPost={post("guidance")}
            />
          )}
          {notes === null ? (
            <div className="space-y-2.5">
              <Skeleton className="h-16 w-full rounded-[10px] bg-cal-surface-strong/60" />
              <Skeleton className="h-16 w-full rounded-[10px] bg-cal-surface-strong/60" />
            </div>
          ) : (
            <NoteList
              notes={notes.guidance}
              empty="No guidance from a cardiologist yet."
              onDelete={setRemoving}
            />
          )}
        </div>
      </section>

      {/* ─── 2. DIETITIAN & PT SHARED THREAD ───────────────────────────────── */}
      <section
        aria-labelledby="thread-title"
        className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <div className="border-b border-cal-hairline px-5 pt-4 pb-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-badge-violet/15 text-cal-ink">
                <MessagesSquare size={15} aria-hidden="true" />
              </span>
              <h2
                id="thread-title"
                className="font-cal-display text-[18px] font-semibold tracking-[-0.35px] text-cal-ink"
              >
                Dietitian and PT notes
              </h2>
            </div>
            {notes && (
              <span className="inline-flex items-center rounded-full border border-cal-hairline bg-cal-surface-soft px-2.5 py-0.5 font-cal-mono text-[11.5px] font-medium tabular-nums text-cal-muted">
                {notes.messages.length}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[13px] leading-[1.45] text-cal-muted">
            {isThreadMember
              ? "A shared thread with the other dietitians and physical therapists on this patient."
              : "Dietitians and physical therapists coordinate on this patient here. Read-only for your role."}
          </p>
        </div>

        <div className="space-y-4 p-5">
          {isThreadMember && (
            <Composer
              id="message-body"
              label="Write to the care team"
              placeholder={
                expertType === "Dietitian"
                  ? "e.g. Moved her to the low-sodium breakfast plan; please keep morning walks short until lunch."
                  : "e.g. Started the 10-minute walk, 3 times a week. Let me know if meals change on exercise days."
              }
              buttonText="Post message"
              onPost={post("message")}
            />
          )}
          {notes === null ? (
            <div className="space-y-2.5">
              <Skeleton className="h-16 w-full rounded-[10px] bg-cal-surface-strong/60" />
            </div>
          ) : (
            <NoteList
              notes={notes.messages}
              empty="No messages yet."
              onDelete={setRemoving}
            />
          )}
        </div>
      </section>

      <ConfirmActionModal
        isOpen={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        title="Remove this note?"
        description="The care team won't see it any more. HeartLink keeps a record that it was removed."
        confirmText="Remove note"
        variant="danger"
      />
    </div>
  );
}
