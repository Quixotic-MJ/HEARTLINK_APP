import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import { apiFetch } from "../../api";
import { formatUserRef } from "../../utils/formatUserRef";
import { formatNoteTime } from "./noteTime";

// HL-038/039: the newest Cardiologist guidance, shown beside the recipe and exercise approval panels so
// Dietitians and PTs can check new items against it.
export default function CardiologistGuidance({ limit = 3 }) {
  const [notes, setNotes] = useState(null);

  useEffect(() => {
    let alive = true;
    apiFetch(`/api/admin/patients/guidance/latest?limit=${limit}`, { bypassCache: true })
      .then((data) => alive && setNotes(Array.isArray(data) ? data : []))
      .catch(() => alive && setNotes([]));
    return () => {
      alive = false;
    };
  }, [limit]);

  return (
    <section className="border border-ds-hairline rounded-xl px-4 py-3.5">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-7 h-7 rounded-[8px] bg-ds-rose text-ds-charcoal flex items-center justify-center shrink-0">
          <HeartPulse size={15} aria-hidden="true" />
        </span>
        <h4 className="text-[16px] font-semibold">Latest cardiologist guidance</h4>
      </div>
      <p className="text-[13px] text-ds-slate mb-3">Check this before approving. Open a patient to see all of their guidance.</p>

      {notes === null ? (
        <p className="text-[14px] text-ds-steel">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-[14px] text-ds-charcoal">No guidance from a cardiologist yet.</p>
      ) : (
        <ul className="divide-y divide-ds-hairline-soft">
          {notes.map((note) => (
            <li key={note.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline gap-x-2 text-[12px] text-ds-slate">
                <Link to={`/patients/${note.patient_id}`} className="font-semibold text-ds-link hover:underline">
                  {formatUserRef(note.patient_id)}
                </Link>
                <span>{note.author_name}</span>
                <span>{formatNoteTime(note.created_at)}</span>
              </div>
              <p className="mt-1 text-[14px] leading-normal text-ds-charcoal whitespace-pre-line">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
