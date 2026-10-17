import { useEffect, useState } from "react";
import { ArrowLeft, Stethoscope, AlertTriangle, Info } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AdminLayout from "../../../components/layouts/adminLayout";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";
import { UI, FONTS } from "../../../styles/designSystem";
import {
  LANES, SECTION_LABELS, SECTION_EXPERT, DONE_CHIP, PROGRESS, TIERS, REASONS, CONFIDENCE, CHECKUP,
  SCORERS, AGREEMENT, labelOf, waitingText,
} from "./reviewUi";

// HL-055 / HL-056: one review round. Every reviewer sees the same anonymized snapshot; each expert
// answers only their own section. The app's level stays hidden until the Cardiologist submits.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(d) ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : "";
};
const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).replace(/_/g, " ") : "");

const pill = (selected) =>
  `min-h-[40px] px-3.5 rounded-full text-[12.5px] font-semibold border transition-colors cursor-pointer ${
    selected ? "bg-[#0F172A] text-white border-[#0F172A]" : "bg-white text-[#0F172A] border-[#CBD5E1] hover:border-[#64748B]"
  }`;

function Fact({ label, value }) {
  return (
    <div>
      <div className="text-[11.5px] text-[#64748B]">{label}</div>
      <div className="text-[13px] font-semibold text-[#0F172A]">{value || "Not given"}</div>
    </div>
  );
}

function Snapshot({ data }) {
  const ob = data.onboarding || {};
  const weekly =
    (ob.vigorous_activity ? (ob.vigorous_days || 0) * (ob.vigorous_minutes || 0) : 0) +
    (ob.moderate_activity ? (ob.moderate_days || 0) * (ob.moderate_minutes || 0) : 0) +
    (ob.walk_bike_transport ? (ob.walk_bike_days || 0) * (ob.walk_bike_minutes || 0) : 0);
  const vitals = (data.timeline || []).filter((t) => t.type === "Vitals").slice(0, 7);
  const symptoms = (data.timeline || []).filter((t) => t.type === "Symptoms").slice(0, 5);
  const counts = ["Meal", "Exercise", "Sleep"].map((type) => [type, (data.timeline || []).filter((t) => t.type === type).length]);
  const p = data.patient || {};

  return (
    <section aria-label="Patient snapshot" className="flex-[1_1_320px] min-w-0 bg-white border border-[#E2E8F0] rounded-[10px] p-5 flex flex-col gap-4 shadow-2xs">
      <h2 className="text-[15px] font-semibold text-[#0F172A] m-0">What every reviewer sees</h2>
      <div className="grid grid-cols-2 gap-3">
        <Fact label="Age" value={p.age != null ? `${p.age}` : null} />
        <Fact label="Sex" value={cap(p.sex)} />
        <Fact label="Height" value={p.height_cm ? `${p.height_cm} cm` : null} />
        <Fact label="Weight" value={p.weight_kg ? `${p.weight_kg} kg` : null} />
        <Fact label="Smoking" value={ob.ever_smoked == null ? null : ob.ever_smoked ? ob.smoke_now || "Has smoked" : "Never"} />
        <Fact label="Alcohol" value={ob.ever_drank == null ? null : ob.ever_drank ? ob.drink_frequency || "Drinks" : "Never"} />
        <Fact label="Activity" value={ob.sedentary_hours ? `${weekly} min a week` : null} />
        <Fact label="Sitting per day" value={ob.sedentary_hours} />
        <Fact label="Sleep" value={ob.sleep_hours ? `${ob.sleep_hours} hours` : null} />
        <Fact label="Diet" value={cap(ob.diet_level)} />
        <Fact label="Salty food" value={cap(ob.salty_food_freq)} />
        <Fact label="Fried food" value={cap(ob.fried_food_freq)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-[13px] font-semibold text-[#0F172A] m-0">Readings, last 30 days</h3>
        {vitals.length === 0 ? (
          <p className="text-[12.5px] text-[#64748B] m-0">No readings logged.</p>
        ) : (
          <table className="w-full text-[12.5px] border-collapse">
            <thead>
              <tr className="text-left text-[#64748B]">
                <th scope="col" className="py-1 font-medium">Date</th>
                <th scope="col" className="py-1 font-medium">Blood pressure</th>
                <th scope="col" className="py-1 font-medium">Heart rate</th>
              </tr>
            </thead>
            <tbody>
              {vitals.map((v, i) => (
                <tr key={i} className="border-t border-[#F1F5F9]">
                  <td className="py-1.5">{day(v.timestamp)}</td>
                  <td className="py-1.5 font-semibold">{v.data?.systolic && v.data?.diastolic ? `${v.data.systolic}/${v.data.diastolic}` : "Not taken"}</td>
                  <td className="py-1.5">{v.data?.heart_rate || "Not taken"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-[13px] font-semibold text-[#0F172A] m-0">Symptoms logged</h3>
        {symptoms.length === 0 ? (
          <p className="text-[12.5px] text-[#64748B] m-0">None in the last 30 days.</p>
        ) : (
          symptoms.map((s, i) => (
            <p key={i} className="text-[12.5px] text-[#334155] m-0">
              <span className="font-semibold">{day(s.timestamp)}:</span>{" "}
              {(s.data?.symptoms || []).filter((x) => !x.startsWith("None")).join(", ") || "None"}
              {s.data?.context ? ` (${cap(s.data.context)})` : ""}
            </p>
          ))
        )}
      </div>

      <p className="text-[12px] text-[#64748B] m-0">
        Logged in 30 days: {counts.map(([t, n]) => `${n} ${t.toLowerCase()}${n === 1 ? "" : "s"}`).join(", ")}.
      </p>
      <p className="text-[11.5px] text-[#64748B] border-t border-[#E2E8F0] pt-3 m-0">
        Frozen when the case opened. The app's own risk level stays hidden until the Cardiologist submits.
      </p>
    </section>
  );
}

function CardiologyForm({ caseId, existing, onSaved }) {
  const [tier, setTier] = useState(existing?.expert_tier || "");
  const [score, setScore] = useState(existing?.expert_score ?? "");
  const [reasons, setReasons] = useState(existing?.reasons || []);
  const [confidence, setConfidence] = useState(existing?.confidence || "");
  const [checkup, setCheckup] = useState(existing?.checkup_flag || "");
  const [notes, setNotes] = useState(existing?.notes || "");
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  const valid = tier && confidence && checkup && reasons.length > 0;
  const toggle = (code) => setReasons((r) => (r.includes(code) ? r.filter((x) => x !== code) : [...r, code]));

  const submit = async () => {
    setTried(true);
    if (!valid) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/review-queue/${caseId}/cardiology`, {
        method: "POST",
        body: JSON.stringify({ expert_tier: tier, expert_score: score === "" ? null : Number(score), reasons, confidence, checkup_flag: checkup, notes }),
      });
      toast.success("Review submitted.");
      onSaved(res.case);
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't submit the review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="border-0 m-0 p-0">
        <legend className="text-[13px] font-semibold text-[#0F172A] mb-2">Risk level <span className="font-normal text-[#64748B]">(required)</span></legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TIERS.map((t) => (
            <button key={t} type="button" aria-pressed={tier === t} onClick={() => setTier(t)}
              className={`min-h-[48px] px-2 rounded-[10px] text-[13px] font-semibold border-2 transition-colors cursor-pointer ${tier === t ? "bg-[#0F172A] text-white border-[#0F172A]" : "bg-white text-[#0F172A] border-[#E2E8F0] hover:border-[#94A3B8]"}`}>
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5 max-w-[280px]">
        <label htmlFor="expert-score" className="text-[13px] font-semibold text-[#0F172A]">
          Score, 1–100 <span className="font-normal text-[#64748B]">(optional, only if confident)</span>
        </label>
        <input id="expert-score" type="number" min="1" max="100" value={score} onChange={(e) => setScore(e.target.value)} className={UI.input.text} placeholder="e.g. 58" />
      </div>

      <fieldset className="border-0 m-0 p-0">
        <legend className="text-[13px] font-semibold text-[#0F172A] mb-2">Main reasons <span className="font-normal text-[#64748B]">(at least one)</span></legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          {REASONS.map((r) => (
            <label key={r.code} className="flex items-center gap-2.5 min-h-[36px] text-[13px] text-[#0F172A] cursor-pointer">
              <input type="checkbox" checked={reasons.includes(r.code)} onChange={() => toggle(r.code)} className="w-4 h-4 accent-[#0F172A]" />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="border-0 m-0 p-0">
        <legend className="text-[13px] font-semibold text-[#0F172A] mb-2">Confidence <span className="font-normal text-[#64748B]">(required)</span></legend>
        <div className="flex flex-wrap gap-2">
          {CONFIDENCE.map((c) => (
            <button key={c.code} type="button" aria-pressed={confidence === c.code} onClick={() => setConfidence(c.code)} className={pill(confidence === c.code)}>{c.label}</button>
          ))}
        </div>
      </fieldset>

      <fieldset className="border-0 m-0 p-0">
        <legend className="text-[13px] font-semibold text-[#0F172A] mb-2">In-person checkup <span className="font-normal text-[#64748B]">(required)</span></legend>
        <div className="flex flex-wrap gap-2">
          {CHECKUP.map((c) => (
            <button key={c.code} type="button" aria-pressed={checkup === c.code} onClick={() => setCheckup(c.code)} className={pill(checkup === c.code)}>{c.label}</button>
          ))}
        </div>
        <p className="text-[12px] text-[#64748B] mt-2 mb-0">Recorded now. Patient reminders stay switched off until the adviser approves the wording.</p>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="expert-notes" className="text-[13px] font-semibold text-[#0F172A]">Internal note <span className="font-normal text-[#64748B]">(staff only)</span></label>
        <textarea id="expert-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={UI.input.textarea} placeholder="What stood out in this case" />
      </div>

      {tried && !valid && (
        <p role="alert" className="text-[12.5px] font-semibold text-[#A93226] m-0">Choose a risk level, at least one reason, a confidence and a checkup option.</p>
      )}
      <div>
        <button type="button" onClick={submit} disabled={saving} className={UI.button.primary}>{saving ? "Submitting…" : existing ? "Update review" : "Submit review"}</button>
      </div>
    </div>
  );
}

function CardiologyResult({ section, app, canEdit, onEdit }) {
  const agreement = AGREEMENT[section.tier_agreement];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border border-[#E2E8F0] rounded-[10px] p-3">
          <div className="text-[11.5px] text-[#64748B]">Cardiologist</div>
          <div className="text-[15px] font-semibold">{section.expert_tier}</div>
          <div className="text-[11.5px] text-[#64748B]">{section.expert_score != null ? `Score ${section.expert_score}` : "No score given"}</div>
        </div>
        <div className="border border-[#E2E8F0] rounded-[10px] p-3">
          <div className="text-[11.5px] text-[#64748B]">App said</div>
          <div className="text-[15px] font-semibold">{app?.tier || "No level"}</div>
          <div className="text-[11.5px] text-[#64748B]">{app?.score != null ? `Score ${app.score} · ` : ""}{SCORERS[app?.scorer] || ""}</div>
        </div>
        <div className={`border rounded-[10px] p-3 ${agreement?.className || "border-[#E2E8F0]"}`}>
          <div className="text-[11.5px]">Comparison</div>
          <div className="text-[15px] font-semibold">{agreement?.label || "Not comparable"}</div>
          <div className="text-[11.5px]">Computed, not typed</div>
        </div>
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[12.5px] m-0">
        <dt className="font-semibold">Reasons</dt><dd className="m-0">{(section.reasons || []).map((r) => labelOf(REASONS, r)).join(", ")}</dd>
        <dt className="font-semibold">Confidence</dt><dd className="m-0">{labelOf(CONFIDENCE, section.confidence)}</dd>
        <dt className="font-semibold">Checkup</dt><dd className="m-0">{labelOf(CHECKUP, section.checkup_flag)} (patient reminders are off for now)</dd>
        <dt className="font-semibold">Counts as</dt><dd className="m-0">{section.is_clinical ? "Clinical review (verified clinician)" : "Practice review (reviewer not verified yet)"}</dd>
        <dt className="font-semibold">Reviewer</dt><dd className="m-0">{section.reviewer_name} · {day(section.updated_at || section.created_at)}</dd>
        {section.notes ? (<><dt className="font-semibold">Note</dt><dd className="m-0 whitespace-pre-line">{section.notes}</dd></>) : null}
      </dl>
      {canEdit && (
        <div><button type="button" onClick={onEdit} className={UI.button.secondary}>Edit my review</button></div>
      )}
    </div>
  );
}

const ITEM_VERDICTS = {
  nutrition: [{ code: "ok", label: "Suitable" }, { code: "no", label: "Not suitable" }],
  exercise: [{ code: "ok", label: "Suitable" }, { code: "changes", label: "Suitable with changes" }, { code: "no", label: "Not suitable" }],
};
const VERDICT_TEXT = { ok: "text-[#14534B]", changes: "text-[#7A5414]", no: "text-[#8A1F17]" };

function ItemsSection({ caseId, section, items, saved, canSubmit, onSaved }) {
  const [editing, setEditing] = useState(!saved);
  const initial = Object.fromEntries((saved?.item_verdicts || []).map((v) => [v.item_id, { verdict: v.verdict, note: v.note || "" }]));
  const [answers, setAnswers] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const options = ITEM_VERDICTS[section];
  const noun = section === "nutrition" ? "recipe" : "exercise";

  const set = (id, patch) => setAnswers((a) => ({ ...a, [id]: { ...(a[id] || {}), ...patch } }));
  const complete = items.every((it) => answers[it.id]?.verdict && (answers[it.id].verdict === "ok" || (answers[it.id].note || "").trim()));

  const submit = async () => {
    setTried(true);
    if (!complete) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/review-queue/${caseId}/${section}`, {
        method: "POST",
        body: JSON.stringify({ items: items.map((it) => ({ item_id: it.id, verdict: answers[it.id].verdict, note: answers[it.id].note || "" })) }),
      });
      toast.success(`${SECTION_LABELS[section]} submitted.`);
      setEditing(false);
      onSaved(res.case);
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't submit.");
    } finally {
      setSaving(false);
    }
  };

  if (items.length === 0) {
    return <p className="text-[13px] text-[#64748B] m-0">The app recommends no {noun}s at this case's level, so there is nothing to check.</p>;
  }

  const showForm = canSubmit && editing;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-[#475569] m-0">
        {showForm
          ? `Is each ${noun} the app recommends suitable for this patient?`
          : saved
            ? `Checked by ${saved.reviewer_name} · ${saved.is_clinical ? "clinical" : "practice"} review`
            : `Waiting for the ${SECTION_EXPERT[section]}.`}
      </p>
      {items.map((it) => {
        const a = answers[it.id] || {};
        const savedVerdict = (saved?.item_verdicts || []).find((v) => v.item_id === it.id);
        return (
          <div key={it.id} className="border border-[#E2E8F0] rounded-[10px] p-3 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] font-semibold">{it.name}</span>
              {showForm ? (
                <div role="group" aria-label={`Verdict for ${it.name}`} className="flex flex-wrap gap-1.5">
                  {options.map((o) => (
                    <button key={o.code} type="button" aria-pressed={a.verdict === o.code} onClick={() => set(it.id, { verdict: o.code })} className={pill(a.verdict === o.code)}>{o.label}</button>
                  ))}
                </div>
              ) : savedVerdict ? (
                <span className={`text-[12.5px] font-semibold ${VERDICT_TEXT[savedVerdict.verdict]}`}>{labelOf(options, savedVerdict.verdict)}</span>
              ) : null}
            </div>
            {showForm && a.verdict && a.verdict !== "ok" && (
              <div className="flex flex-col gap-1">
                <label htmlFor={`${section}-${it.id}`} className="text-[12px] font-semibold">{a.verdict === "changes" ? "What should change?" : "Why is it not suitable?"}</label>
                <input id={`${section}-${it.id}`} type="text" value={a.note || ""} onChange={(e) => set(it.id, { note: e.target.value })} className={UI.input.text} />
              </div>
            )}
            {!showForm && savedVerdict?.note ? <p className="text-[12px] text-[#475569] m-0">{savedVerdict.note}</p> : null}
          </div>
        );
      })}
      {showForm && tried && !complete && (
        <p role="alert" className="text-[12.5px] font-semibold text-[#A93226] m-0">Give every {noun} a verdict, with a reason for any that are not simply suitable.</p>
      )}
      {showForm ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={submit} disabled={saving} className={UI.button.primary}>{saving ? "Submitting…" : `Submit ${SECTION_LABELS[section].toLowerCase()}`}</button>
          <span className="text-[12px] text-[#64748B]">Not-suitable items are recorded for this patient; hiding them in the app comes later.</span>
        </div>
      ) : canSubmit && saved ? (
        <div><button type="button" onClick={() => setEditing(true)} className={UI.button.secondary}>Edit my check</button></div>
      ) : null}
    </div>
  );
}

const CaseReviewDetail = () => {
  const { roundId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(null);
  const [editingCardio, setEditingCardio] = useState(false);

  useEffect(() => {
    apiFetch(`/api/admin/review-queue/${roundId}`, { bypassCache: true })
      .then((d) => {
        setData(d);
        const mine = Object.keys(SECTION_LABELS).find((s) => d.viewer?.can_submit?.[s]);
        setTab(mine || "cardiology");
      })
      .catch((e) => setError(e?.status === 404 ? "This case does not exist." : "Couldn't load this case."));
  }, [roundId]);

  const onSaved = (fresh) => {
    if (fresh) setData(fresh);
    setEditingCardio(false);
  };

  const viewer = data?.viewer || {};
  const isAdmin = viewer.role === "admin" || viewer.role === "super_admin";
  const isExpert = viewer.role === "medical_expert";
  const cardio = data?.sections?.cardiology;

  return (
    <AdminLayout>
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        <button type="button" onClick={() => navigate("/cases")} className={`${UI.button.ghost} mb-4`}>
          <ArrowLeft size={14} /> Back to queue
        </button>

        {error ? (
          <p className="text-[13px] text-[#A93226] font-semibold">{error}</p>
        ) : !data ? (
          <div className="flex flex-col gap-3"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 w-full" /></div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <span className={UI.page.eyebrow}><Stethoscope size={13} className="text-[#2E9AE8]" /> Case review</span>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className={UI.page.title}>{data.case_code}</h1>
                <span className={`text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${LANES[data.lane]?.className || ""}`}>{LANES[data.lane]?.label}</span>
                {data.overdue && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#A93226] text-white"><AlertTriangle size={11} aria-hidden="true" /> Overdue</span>
                )}
                {data.status === "complete" && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${DONE_CHIP}`}>Complete</span>}
              </div>
              <p className="text-[13px] text-[#475569] m-0">{data.reason} · waiting {waitingText(data.waiting_hours)}</p>
            </div>

            {isExpert && !viewer.verified_clinician && (
              <div className="flex items-start gap-2 text-[12.5px] bg-[#F6EDDD] text-[#7A5414] border border-[#EBD7B8] rounded-[8px] px-3 py-2.5">
                <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                Your account isn't verified as a clinician yet, so your reviews are saved as practice and left out of Model Check.
              </div>
            )}
            {isAdmin && (
              <div className="text-[12.5px] bg-[#EAF5FC] text-[#0F4C82] border border-[#CDE1F4] rounded-[8px] px-3 py-2.5">
                Admins can follow progress but cannot review cases.
              </div>
            )}

            <div className="flex flex-wrap gap-5 items-start">
              <Snapshot data={data} />

              <section aria-label="Review" className="flex-[2_1_480px] min-w-0 bg-white border border-[#E2E8F0] rounded-[10px] shadow-2xs">
                <div role="tablist" aria-label="Review sections" className="flex flex-wrap gap-1 px-2 pt-2 border-b border-[#E2E8F0]">
                  {Object.keys(SECTION_LABELS).map((s) => {
                    const progress = PROGRESS[data.progress?.[s]] || PROGRESS.waiting;
                    return (
                      <button key={s} type="button" role="tab" aria-selected={tab === s} onClick={() => setTab(s)}
                        className={`min-h-[44px] px-3.5 text-[13px] font-semibold border-b-[3px] cursor-pointer ${tab === s ? "border-[#2E9AE8] text-[#0F172A]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"}`}>
                        {SECTION_LABELS[s]}{" "}
                        <span className={`ml-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${progress.className}`}>{progress.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="p-5">
                  {tab === "cardiology" && (
                    viewer.can_submit?.cardiology && (!cardio || editingCardio) ? (
                      <CardiologyForm caseId={data.id} existing={cardio} onSaved={onSaved} />
                    ) : cardio ? (
                      <CardiologyResult section={cardio} app={data.app} canEdit={viewer.can_submit?.cardiology} onEdit={() => setEditingCardio(true)} />
                    ) : (
                      <p className="text-[13px] text-[#475569] m-0">Waiting for the Cardiologist. Only a Cardiologist answers this section.</p>
                    )
                  )}
                  {tab === "nutrition" && (
                    <ItemsSection key="nutrition" caseId={data.id} section="nutrition" items={data.recommendations?.recipes || []} saved={data.sections?.nutrition} canSubmit={viewer.can_submit?.nutrition} onSaved={onSaved} />
                  )}
                  {tab === "exercise" && (
                    <ItemsSection key="exercise" caseId={data.id} section="exercise" items={data.recommendations?.exercises || []} saved={data.sections?.exercise} canSubmit={viewer.can_submit?.exercise} onSaved={onSaved} />
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CaseReviewDetail;
