import { useState } from "react";
import { HeartPulse, MessagesSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "../../api";
import { useApiQuery } from "../../hooks/useApiQuery";
import ConfirmActionModal from "../modals/ConfirmActionModal";
import { UI } from "../../styles/tokens";
import { TAG } from "./vitals";
import { formatNoteTime } from "./noteTime";

// HL-039 / HL-040: the care team's notes on a patient. Cardiologists write guidance; Dietitians and
// Physical Therapists write to the shared thread. Everyone on the care team (and admins) reads both.
// The backend enforces the same rules (EXPERT_PERMISSIONS in backend/app/utils/security.py).
const MAX_LENGTH = 4000;
const ROLE_TAG = {
  Cardiologist: "bg-ds-rose text-ds-ink",
  Dietitian: "bg-ds-peach text-ds-warm-text",
  "Physical Therapist": "bg-ds-mint text-ds-charcoal",
};

function NoteList({ notes, empty, onDelete }) {
  if (!notes.length) return <p className="text-[14px] text-ds-slate">{empty}</p>;
  return (
    <ul className="space-y-3">
      {notes.map((note) => (
        <li key={note.id} className="rounded-xl border border-ds-hairline bg-ds-canvas px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[13px] font-semibold text-ds-ink">{note.author_name}</span>
            <span className={`${TAG} ${ROLE_TAG[note.author_expert_type] || "bg-ds-surface-alt text-ds-slate"}`}>{note.author_expert_type}</span>
            <time dateTime={note.created_at} className="text-[12px] text-ds-steel">{formatNoteTime(note.created_at)}</time>
            {note.is_mine && (
              <button
                type="button"
                onClick={() => onDelete(note)}
                aria-label="Remove this note"
                title="Remove"
                className="ml-auto p-1.5 rounded-[6px] text-ds-steel hover:text-ds-ink hover:bg-ds-surface cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[14px] leading-normal text-ds-charcoal whitespace-pre-line break-words">{note.body}</p>
        </li>
      ))}
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
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor={id} className={UI.input.label}>{label}</label>
      <textarea
        id={id}
        rows={3}
        maxLength={MAX_LENGTH}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className={UI.input.textarea}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-ds-steel">{text.length > MAX_LENGTH - 400 ? `${MAX_LENGTH - text.length} characters left` : ""}</span>
        <button type="submit" disabled={saving || !text.trim()} className={UI.button.primary}>
          {saving ? "Posting…" : buttonText}
        </button>
      </div>
    </form>
  );
}

export default function CareNotes({ patientId, expertType }) {
  const [removing, setRemoving] = useState(null);
  const isCardiologist = expertType === "Cardiologist";
  const isThreadMember = expertType === "Dietitian" || expertType === "Physical Therapist";

  // A post or delete through apiFetch refreshes this list by itself
  const notesQuery = useApiQuery(`/api/admin/patients/${patientId}/notes`, {
    select: (data) => ({ guidance: data.guidance || [], messages: data.messages || [] }),
  });
  const notes = notesQuery.data ?? null;
  const error = notesQuery.isError ? notesQuery.error?.data?.detail || "Couldn't load the care-team notes." : "";

  const post = (kind) => async (body) => {
    try {
      await apiFetch(`/api/admin/patients/${patientId}/notes`, { method: "POST", body: JSON.stringify({ kind, body }) });
      toast.success(kind === "guidance" ? "Guidance posted." : "Message posted.");
      return true;
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't post that. Please try again.");
      return false;
    }
  };

  const remove = async () => {
    try {
      await apiFetch(`/api/admin/patients/${patientId}/notes/${removing.id}`, { method: "DELETE" });
      toast.success("Note removed.");
      setRemoving(null);
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't remove that note.");
    }
  };

  if (error && !notes) {
    return <div className={`${UI.card.root} p-5 text-[14px] text-ds-slate`}>{error}</div>;
  }

  return (
    <div className="space-y-5">
      <section className={UI.card.root} aria-labelledby="guidance-title">
        <div className="px-5 pt-4 pb-3 border-b border-ds-hairline">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-[8px] bg-ds-rose text-ds-charcoal flex items-center justify-center shrink-0">
              <HeartPulse size={15} aria-hidden="true" />
            </span>
            <h2 id="guidance-title" className="text-[16px] font-semibold text-ds-ink">Cardiologist guidance</h2>
          </div>
          <p className="mt-1.5 text-[13px] text-ds-slate">
            Overall feedback on this patient. Dietitians and physical therapists see it when they approve recipes and exercises.
          </p>
        </div>
        <div className="p-5 space-y-4">
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
            <p className="text-[14px] text-ds-steel">Loading…</p>
          ) : (
            <NoteList notes={notes.guidance} empty="No guidance from a cardiologist yet." onDelete={setRemoving} />
          )}
        </div>
      </section>

      <section className={UI.card.root} aria-labelledby="thread-title">
        <div className="px-5 pt-4 pb-3 border-b border-ds-hairline">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-[8px] bg-ds-sky text-ds-charcoal flex items-center justify-center shrink-0">
              <MessagesSquare size={15} aria-hidden="true" />
            </span>
            <h2 id="thread-title" className="text-[16px] font-semibold text-ds-ink">Dietitian and PT notes</h2>
          </div>
          <p className="mt-1.5 text-[13px] text-ds-slate">
            {isThreadMember
              ? "A shared thread with the other dietitians and physical therapists on this patient."
              : "Dietitians and physical therapists talk about this patient here. You can read it."}
          </p>
        </div>
        <div className="p-5 space-y-4">
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
            <p className="text-[14px] text-ds-steel">Loading…</p>
          ) : (
            <NoteList notes={notes.messages} empty="No messages yet." onDelete={setRemoving} />
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
