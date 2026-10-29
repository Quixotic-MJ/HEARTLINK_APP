import { Link } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import { useApiQuery } from "../../hooks/useApiQuery";
import { formatUserRef } from "../../utils/formatUserRef";
import { formatNoteTime } from "./noteTime";

// HL-038/039: the newest Cardiologist guidance, shown beside the recipe and exercise approval panels so
// Dietitians and PTs can check new items against it.
export default function CardiologistGuidance({ limit = 3 }) {
  const guidance = useApiQuery(`/api/admin/patients/guidance/latest?limit=${limit}`, {
    select: (d) => (Array.isArray(d) ? d : []),
  });
  const notes = guidance.data ?? null;

  return (
    <section className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 font-cal-sans text-cal-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-badge-orange/20 text-cal-ink">
          <HeartPulse size={15} aria-hidden="true" />
        </span>
        <h4 className="font-cal-display text-[17px] font-semibold tracking-[-0.3px] text-cal-ink">
          Latest cardiologist guidance
        </h4>
      </div>
      <p className="text-[13px] text-cal-muted mb-3.5">
        Check this before approving. Open a patient to see all of their guidance.
      </p>

      {guidance.isError ? (
        // Saying "no guidance" here when it simply didn't load could lead to approving against advice
        <p className="rounded-[8px] border border-cal-warning/35 bg-cal-warning/10 px-3 py-2 text-[13.5px] text-cal-ink">
          Couldn&apos;t load the latest guidance.{" "}
          <button
            type="button"
            onClick={() => guidance.refetch()}
            className="font-semibold text-cal-ink underline underline-offset-2 hover:opacity-80 cursor-pointer"
          >
            Try again
          </button>
        </p>
      ) : notes === null ? (
        <p className="text-[13.5px] text-cal-muted">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-[13.5px] text-cal-muted">No guidance from a cardiologist yet.</p>
      ) : (
        <ul className="divide-y divide-cal-hairline">
          {notes.map((note) => (
            <li key={note.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline gap-x-2 text-[12px] text-cal-muted">
                <Link
                  to={`/patients/${note.patient_id}`}
                  className="font-cal-mono font-semibold text-cal-ink hover:underline"
                >
                  {formatUserRef(note.patient_id)}
                </Link>
                <span className="font-medium text-cal-body">{note.author_name}</span>
                <span className="font-cal-mono text-[11.5px] text-cal-muted-soft">
                  {formatNoteTime(note.created_at)}
                </span>
              </div>
              <p className="mt-1 text-[13.5px] leading-[1.55] text-cal-body whitespace-pre-line">
                {note.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
