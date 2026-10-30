import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Info, ShieldCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AdminLayout from "../../../components/layouts/adminLayout";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";
import { useApiQuery } from "../../../hooks/useApiQuery";
import LoadError from "../../../components/ui/LoadError";
import {
  AGREEMENT,
  CHECKUP,
  CONFIDENCE,
  DONE_CHIP,
  LANES,
  PROGRESS,
  REASONS,
  SCORERS,
  SECTION_EXPERT,
  SECTION_LABELS,
  TIERS,
  labelOf,
  waitingText,
} from "./reviewUi";

// HL-055 / HL-056: one review round. Every reviewer sees the same anonymized snapshot; each expert
// answers only their own section. The app's level stays hidden until the Cardiologist submits.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(d) ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : "";
};
const cap = (s) =>
  s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).replace(/_/g, " ") : "";

const choicePill = (selected) =>
  `h-9 px-3.5 rounded-full text-[13px] font-medium border transition-colors cursor-pointer ${
    selected
      ? "bg-cal-primary text-cal-on-primary border-cal-primary font-semibold"
      : "bg-cal-canvas text-cal-ink border-cal-hairline hover:bg-cal-surface-soft"
  }`;

const inputClass =
  "h-10 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[14px] text-cal-ink placeholder:text-cal-muted outline-none focus:border-cal-ink transition-colors";

const textareaClass =
  "w-full rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 py-2.5 text-[14px] leading-relaxed text-cal-ink placeholder:text-cal-muted outline-none focus:border-cal-ink transition-colors resize-none";

function Fact({ label, value }) {
  return (
    <div className="rounded-[8px] border border-cal-hairline/80 bg-cal-surface-soft px-3 py-2.5">
      <div className="text-[11.5px] font-medium text-cal-muted">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold text-cal-ink">
        {value || "Not given"}
      </div>
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
  const counts = ["Meal", "Exercise", "Sleep"].map((type) => [
    type,
    (data.timeline || []).filter((t) => t.type === type).length,
  ]);
  const p = data.patient || {};

  return (
    <section
      aria-label="Patient snapshot"
      className="flex flex-col gap-5 rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div>
        <h2 className="text-[16px] font-semibold text-cal-ink">What every reviewer sees</h2>
        <p className="mt-0.5 text-[13px] text-cal-muted">
          Frozen anonymized baseline and 30-day clinical telemetry
        </p>
      </div>

      {/* Baseline & Onboarding Facts */}
      <div className="grid grid-cols-2 gap-2.5">
        <Fact label="Age" value={p.age != null ? `${p.age}` : null} />
        <Fact label="Sex" value={cap(p.sex)} />
        <Fact label="Height" value={p.height_cm ? `${p.height_cm} cm` : null} />
        <Fact label="Weight" value={p.weight_kg ? `${p.weight_kg} kg` : null} />
        <Fact
          label="Smoking"
          value={
            ob.ever_smoked == null ? null : ob.ever_smoked ? ob.smoke_now || "Has smoked" : "Never"
          }
        />
        <Fact
          label="Alcohol"
          value={
            ob.ever_drank == null ? null : ob.ever_drank ? ob.drink_frequency || "Drinks" : "Never"
          }
        />
        <Fact label="Activity" value={ob.sedentary_hours ? `${weekly} min a week` : null} />
        <Fact label="Sitting per day" value={ob.sedentary_hours} />
        <Fact label="Sleep" value={ob.sleep_hours ? `${ob.sleep_hours} hours` : null} />
        <Fact label="Diet" value={cap(ob.diet_level)} />
        <Fact label="Salty food" value={cap(ob.salty_food_freq)} />
        <Fact label="Fried food" value={cap(ob.fried_food_freq)} />
      </div>

      {/* 30-Day Vitals Table */}
      <div className="space-y-2">
        <h3 className="text-[13.5px] font-semibold text-cal-ink">Readings, last 30 days</h3>
        {vitals.length === 0 ? (
          <p className="rounded-[8px] border border-dashed border-cal-hairline bg-cal-surface-soft px-3.5 py-3 text-[13px] text-cal-muted">
            No readings logged.
          </p>
        ) : (
          <div className="overflow-hidden rounded-[8px] border border-cal-hairline">
            <table className="w-full border-collapse text-[12.5px]">
              <thead className="border-b border-cal-hairline bg-cal-surface-soft">
                <tr className="text-left text-cal-muted">
                  <th scope="col" className="px-3 py-2 font-medium">
                    Date
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Blood pressure
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Heart rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cal-hairline bg-cal-canvas">
                {vitals.map((v, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-cal-body">{day(v.timestamp)}</td>
                    <td className="px-3 py-2 font-cal-mono font-semibold text-cal-ink tabular-nums">
                      {v.data?.systolic && v.data?.diastolic
                        ? `${v.data.systolic}/${v.data.diastolic}`
                        : "Not taken"}
                    </td>
                    <td className="px-3 py-2 font-cal-mono text-cal-body tabular-nums">
                      {v.data?.heart_rate ? `${v.data.heart_rate} bpm` : "Not taken"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 30-Day Symptoms */}
      <div className="space-y-1.5">
        <h3 className="text-[13.5px] font-semibold text-cal-ink">Symptoms logged</h3>
        {symptoms.length === 0 ? (
          <p className="text-[13px] text-cal-muted">None in the last 30 days.</p>
        ) : (
          <div className="space-y-1.5">
            {symptoms.map((s, i) => (
              <div
                key={i}
                className="rounded-[8px] border border-cal-hairline bg-cal-surface-soft px-3 py-2 text-[12.5px] text-cal-body"
              >
                <span className="font-cal-mono font-semibold text-cal-ink">
                  {day(s.timestamp)}:
                </span>{" "}
                {(s.data?.symptoms || []).filter((x) => !x.startsWith("None")).join(", ") || "None"}
                {s.data?.context ? ` (${cap(s.data.context)})` : ""}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Summary Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-medium text-cal-muted">Logged in 30d:</span>
        {counts.map(([t, n]) => (
          <span
            key={t}
            className="rounded-full bg-cal-surface-card px-2.5 py-0.5 font-cal-mono text-[11.5px] font-medium text-cal-ink"
          >
            {n} {t.toLowerCase()}
            {n === 1 ? "" : "s"}
          </span>
        ))}
      </div>

      <p className="border-t border-cal-hairline pt-3.5 text-[12px] leading-relaxed text-cal-muted">
        Frozen when the case opened. The app&apos;s own risk level stays hidden until the Cardiologist submits.
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
  const toggle = (code) =>
    setReasons((r) => (r.includes(code) ? r.filter((x) => x !== code) : [...r, code]));

  const submit = async () => {
    setTried(true);
    if (!valid) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/review-queue/${caseId}/cardiology`, {
        method: "POST",
        body: JSON.stringify({
          expert_tier: tier,
          expert_score: score === "" ? null : Number(score),
          reasons,
          confidence,
          checkup_flag: checkup,
          notes,
        }),
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
    <div className="flex flex-col gap-6">
      {/* Risk Level Selector */}
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 text-[13.5px] font-semibold text-cal-ink">
          Risk level <span className="font-normal text-cal-muted">(required)</span>
        </legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {TIERS.map((t) => {
            const active = tier === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => setTier(t)}
                className={`min-h-[44px] rounded-[8px] border px-3 text-[13.5px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? "border-cal-primary bg-cal-primary text-cal-on-primary"
                    : "border-cal-hairline bg-cal-canvas text-cal-ink hover:bg-cal-surface-soft"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Optional Numeric Score */}
      <div className="flex max-w-[280px] flex-col gap-1.5">
        <label htmlFor="expert-score" className="text-[13.5px] font-semibold text-cal-ink">
          Score, 1–100{" "}
          <span className="font-normal text-cal-muted">(optional, if confident)</span>
        </label>
        <input
          id="expert-score"
          type="number"
          min="1"
          max="100"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className={`${inputClass} font-cal-mono`}
          placeholder="e.g. 58"
        />
      </div>

      {/* Main Reasons Checklist */}
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 text-[13.5px] font-semibold text-cal-ink">
          Main reasons <span className="font-normal text-cal-muted">(select at least one)</span>
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {REASONS.map((r) => {
            const checked = reasons.includes(r.code);
            return (
              <label
                key={r.code}
                className={`flex min-h-[40px] items-center gap-2.5 rounded-[8px] border px-3 py-2 text-[13.5px] transition-colors cursor-pointer ${
                  checked
                    ? "border-cal-ink bg-cal-surface-soft font-medium text-cal-ink"
                    : "border-cal-hairline bg-cal-canvas text-cal-body hover:bg-cal-surface-soft"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(r.code)}
                  className="h-4 w-4 rounded accent-cal-primary"
                />
                <span>{r.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Confidence */}
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 text-[13.5px] font-semibold text-cal-ink">
          Confidence <span className="font-normal text-cal-muted">(required)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {CONFIDENCE.map((c) => (
            <button
              key={c.code}
              type="button"
              aria-pressed={confidence === c.code}
              onClick={() => setConfidence(c.code)}
              className={choicePill(confidence === c.code)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* In-Person Checkup */}
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 text-[13.5px] font-semibold text-cal-ink">
          In-person checkup <span className="font-normal text-cal-muted">(required)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {CHECKUP.map((c) => (
            <button
              key={c.code}
              type="button"
              aria-pressed={checkup === c.code}
              onClick={() => setCheckup(c.code)}
              className={choicePill(checkup === c.code)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-cal-muted">
          Recorded now. Patient reminders remain switched off until clinical wording is approved.
        </p>
      </fieldset>

      {/* Internal Note */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="expert-notes" className="text-[13.5px] font-semibold text-cal-ink">
          Internal note <span className="font-normal text-cal-muted">(staff only)</span>
        </label>
        <textarea
          id="expert-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={textareaClass}
          placeholder="What stood out in this case"
        />
      </div>

      {tried && !valid && (
        <p
          role="alert"
          className="rounded-[8px] border border-cal-error/25 bg-cal-error/5 px-3.5 py-2.5 text-[13px] font-medium text-cal-error"
        >
          Choose a risk level, at least one reason, a confidence level, and a checkup option.
        </p>
      )}

      <div>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="inline-flex h-10 items-center justify-center rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted"
        >
          {saving ? "Submitting…" : existing ? "Update review" : "Submit review"}
        </button>
      </div>
    </div>
  );
}

function CardiologyResult({ section, app, canEdit, onEdit }) {
  const agreement = AGREEMENT[section.tier_agreement];
  return (
    <div className="flex flex-col gap-5">
      {/* 3-Up Comparison Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[12px] border border-cal-hairline bg-cal-surface-soft p-4">
          <div className="text-[12px] font-medium text-cal-muted">Cardiologist</div>
          <div className="mt-1 font-cal-display text-[20px] font-semibold tracking-[-0.4px] text-cal-ink">
            {section.expert_tier}
          </div>
          <div className="mt-1 font-cal-mono text-[12px] text-cal-muted">
            {section.expert_score != null ? `Score ${section.expert_score}` : "No score given"}
          </div>
        </div>

        <div className="rounded-[12px] border border-cal-hairline bg-cal-surface-soft p-4">
          <div className="text-[12px] font-medium text-cal-muted">App said</div>
          <div className="mt-1 font-cal-display text-[20px] font-semibold tracking-[-0.4px] text-cal-ink">
            {app?.tier || "No level"}
          </div>
          <div className="mt-1 text-[12px] text-cal-muted">
            {app?.score != null ? (
              <span className="font-cal-mono">{`Score ${app.score} · `}</span>
            ) : null}
            {SCORERS[app?.scorer] || ""}
          </div>
        </div>

        <div
          className={`rounded-[12px] border p-4 ${
            agreement?.className || "border-cal-hairline bg-cal-surface-soft text-cal-ink"
          }`}
        >
          <div className="text-[12px] font-medium text-cal-muted">Comparison</div>
          <div className="mt-1 text-[15px] font-semibold text-cal-ink leading-snug">
            {agreement?.label || "Not comparable"}
          </div>
          <div className="mt-1 text-[11.5px] text-cal-muted">Computed automatically</div>
        </div>
      </div>

      {/* Structured Verdict Details */}
      <dl className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-2.5 rounded-[12px] border border-cal-hairline bg-cal-surface-soft p-4 text-[13px]">
        <dt className="font-medium text-cal-muted">Reasons</dt>
        <dd className="m-0 font-medium text-cal-ink">
          {(section.reasons || []).map((r) => labelOf(REASONS, r)).join(", ")}
        </dd>

        <dt className="font-medium text-cal-muted">Confidence</dt>
        <dd className="m-0 font-medium text-cal-ink">
          {labelOf(CONFIDENCE, section.confidence)}
        </dd>

        <dt className="font-medium text-cal-muted">Checkup</dt>
        <dd className="m-0 text-cal-ink">
          <span className="font-medium">{labelOf(CHECKUP, section.checkup_flag)}</span>{" "}
          <span className="text-cal-muted">(patient reminders are off for now)</span>
        </dd>

        <dt className="font-medium text-cal-muted">Counts as</dt>
        <dd className="m-0 text-cal-ink">
          {section.is_clinical
            ? "Clinical review (verified clinician)"
            : "Practice review (reviewer not verified yet)"}
        </dd>

        <dt className="font-medium text-cal-muted">Reviewer</dt>
        <dd className="m-0 text-cal-ink">
          {section.reviewer_name} ·{" "}
          <span className="font-cal-mono text-[12px] text-cal-muted">
            {day(section.updated_at || section.created_at)}
          </span>
        </dd>

        {section.notes ? (
          <>
            <dt className="font-medium text-cal-muted">Note</dt>
            <dd className="m-0 whitespace-pre-line text-cal-body">{section.notes}</dd>
          </>
        ) : null}
      </dl>

      {canEdit && (
        <div>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-10 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
          >
            Edit my review
          </button>
        </div>
      )}
    </div>
  );
}

const ITEM_VERDICTS = {
  nutrition: [
    { code: "ok", label: "Suitable" },
    { code: "no", label: "Not suitable" },
  ],
  exercise: [
    { code: "ok", label: "Suitable" },
    { code: "changes", label: "Suitable with changes" },
    { code: "no", label: "Not suitable" },
  ],
};

const VERDICT_BADGE = {
  ok: "bg-cal-success/10 text-cal-ink border-cal-success/25",
  changes: "bg-cal-warning/15 text-cal-ink border-cal-warning/30",
  no: "bg-cal-error/10 text-cal-error border-cal-error/25",
};

function ItemsSection({ caseId, section, items, saved, canSubmit, onSaved }) {
  const [editing, setEditing] = useState(!saved);
  const initial = Object.fromEntries(
    (saved?.item_verdicts || []).map((v) => [v.item_id, { verdict: v.verdict, note: v.note || "" }])
  );
  const [answers, setAnswers] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const options = ITEM_VERDICTS[section];
  const noun = section === "nutrition" ? "recipe" : "exercise";

  const set = (id, patch) => setAnswers((a) => ({ ...a, [id]: { ...(a[id] || {}), ...patch } }));
  const complete = items.every(
    (it) => answers[it.id]?.verdict && (answers[it.id].verdict === "ok" || (answers[it.id].note || "").trim())
  );

  const submit = async () => {
    setTried(true);
    if (!complete) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/review-queue/${caseId}/${section}`, {
        method: "POST",
        body: JSON.stringify({
          items: items.map((it) => ({
            item_id: it.id,
            verdict: answers[it.id].verdict,
            note: answers[it.id].note || "",
          })),
        }),
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
    return (
      <div className="rounded-[8px] border border-dashed border-cal-hairline bg-cal-surface-soft px-4 py-8 text-center text-[13.5px] text-cal-muted">
        The app recommends no {noun}s at this case&apos;s level, so there is nothing to check.
      </div>
    );
  }

  const showForm = canSubmit && editing;
  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-[13.5px] text-cal-muted">
        {showForm
          ? `Evaluate whether each ${noun} recommended by the app is suitable for this patient:`
          : saved
            ? `Checked by ${saved.reviewer_name} · ${saved.is_clinical ? "clinical" : "practice"} review`
            : `Waiting for the ${SECTION_EXPERT[section]}.`}
      </p>

      {items.map((it) => {
        const a = answers[it.id] || {};
        const savedVerdict = (saved?.item_verdicts || []).find((v) => v.item_id === it.id);
        return (
          <div
            key={it.id}
            className="flex flex-col gap-3 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-[14px] font-semibold text-cal-ink">{it.name}</span>
              {showForm ? (
                <div
                  role="group"
                  aria-label={`Verdict for ${it.name}`}
                  className="flex flex-wrap gap-1.5"
                >
                  {options.map((o) => (
                    <button
                      key={o.code}
                      type="button"
                      aria-pressed={a.verdict === o.code}
                      onClick={() => set(it.id, { verdict: o.code })}
                      className={choicePill(a.verdict === o.code)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              ) : savedVerdict ? (
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${
                    VERDICT_BADGE[savedVerdict.verdict] || "border-cal-hairline bg-cal-canvas text-cal-ink"
                  }`}
                >
                  {labelOf(options, savedVerdict.verdict)}
                </span>
              ) : null}
            </div>

            {showForm && a.verdict && a.verdict !== "ok" && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${section}-${it.id}`}
                  className="text-[12.5px] font-semibold text-cal-ink"
                >
                  {a.verdict === "changes" ? "What should change?" : "Why is it not suitable?"}
                </label>
                <input
                  id={`${section}-${it.id}`}
                  type="text"
                  value={a.note || ""}
                  onChange={(e) => set(it.id, { note: e.target.value })}
                  className={inputClass}
                />
              </div>
            )}

            {!showForm && savedVerdict?.note ? (
              <p className="text-[12.5px] text-cal-body">{savedVerdict.note}</p>
            ) : null}
          </div>
        );
      })}

      {showForm && tried && !complete && (
        <p
          role="alert"
          className="rounded-[8px] border border-cal-error/25 bg-cal-error/5 px-3.5 py-2.5 text-[13px] font-medium text-cal-error"
        >
          Give every {noun} a verdict, with a reason for any that are not simply suitable.
        </p>
      )}

      {showForm ? (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted"
          >
            {saving ? "Submitting…" : `Submit ${SECTION_LABELS[section].toLowerCase()}`}
          </button>
          <span className="text-[12px] text-cal-muted">
            Not-suitable items are recorded for this patient; hiding them in the app comes later.
          </span>
        </div>
      ) : canSubmit && saved ? (
        <div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex h-10 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
          >
            Edit my check
          </button>
        </div>
      ) : null}
    </div>
  );
}

const CaseReviewDetail = () => {
  const { roundId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const casePath = `/api/admin/review-queue/${roundId}`;
  const caseQuery = useApiQuery(casePath);
  const data = caseQuery.data ?? null;
  const error = !caseQuery.isError
    ? null
    : caseQuery.error?.status === 404
      ? "This case does not exist."
      : "Couldn't load this case.";
  const [pickedTab, setTab] = useState(null);
  const [editingCardio, setEditingCardio] = useState(false);

  // Until the reviewer picks a tab, open on their own section (or cardiology)
  const tab =
    pickedTab ??
    (data
      ? Object.keys(SECTION_LABELS).find((s) => data.viewer?.can_submit?.[s]) || "cardiology"
      : null);

  // The save returns the updated case: show it at once (the save also refreshes it from the server)
  const onSaved = (fresh) => {
    if (fresh) queryClient.setQueryData(["api", casePath], fresh);
    setEditingCardio(false);
  };

  const viewer = data?.viewer || {};
  const isAdmin = viewer.role === "admin";
  const isExpert = viewer.role === "medical_expert";
  const cardio = data?.sections?.cardiology;

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-5 font-cal-sans text-cal-ink">
        <div>
          <button
            type="button"
            onClick={() => navigate("/cases")}
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-card transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to queue</span>
          </button>
        </div>

        {error && caseQuery.error?.status !== 404 ? (
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-8">
            <LoadError what="this case" onRetry={caseQuery.refetch} />
          </div>
        ) : error ? (
          <div className="rounded-[12px] border border-cal-error/25 bg-cal-canvas p-6 text-[14px] font-semibold text-cal-error">
            {error}
          </div>
        ) : !data ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-72 rounded-[8px] bg-cal-surface-strong/70" />
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
              <Skeleton className="h-[460px] rounded-[12px] border border-cal-hairline bg-cal-canvas xl:col-span-5" />
              <Skeleton className="h-[460px] rounded-[12px] border border-cal-hairline bg-cal-canvas xl:col-span-7" />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Case Header */}
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-canvas px-3 py-1 text-[12px] font-medium text-cal-muted">
                <ShieldCheck size={13.5} className="text-cal-ink" />
                <span>Clinical evaluation round</span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.15] text-cal-ink">
                  {data.case_code}
                </h1>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${
                    LANES[data.lane]?.className || "border-cal-hairline bg-cal-surface-card text-cal-ink"
                  }`}
                >
                  {LANES[data.lane]?.dotClass && (
                    <span className={`h-1.5 w-1.5 rounded-full ${LANES[data.lane].dotClass}`} />
                  )}
                  {LANES[data.lane]?.label || data.lane}
                </span>

                {data.overdue && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-cal-error/30 bg-cal-error/10 px-2.5 py-0.5 text-[12px] font-semibold text-cal-error">
                    <AlertTriangle size={12} aria-hidden="true" />
                    <span>Overdue</span>
                  </span>
                )}

                {data.status === "complete" && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${DONE_CHIP}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-cal-success" />
                    <span>Complete</span>
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-[14px] text-cal-muted">
                {data.reason} · waiting{" "}
                <span className="font-cal-mono font-medium text-cal-ink">
                  {waitingText(data.waiting_hours)}
                </span>
              </p>
            </div>

            {/* Practice / Admin Callouts */}
            {isExpert && !viewer.verified_clinician && (
              <div className="flex items-start gap-2.5 rounded-[10px] border border-cal-warning/30 bg-cal-warning/10 px-4 py-3 text-[13px] text-cal-ink">
                <Info size={15} className="mt-0.5 shrink-0 text-cal-warning" aria-hidden="true" />
                <span>
                  Your account isn&apos;t verified as a clinician yet, so your reviews are saved as practice and left out of Model Check.
                </span>
              </div>
            )}

            {isAdmin && (
              <div className="flex items-center gap-2.5 rounded-[10px] border border-cal-hairline bg-cal-canvas px-4 py-3 text-[13px] text-cal-muted">
                <Info size={15} className="shrink-0 text-cal-muted" aria-hidden="true" />
                <span>Admins can follow multi-disciplinary progress here, while clinical scoring is submitted by medical experts.</span>
              </div>
            )}

            {/* Split Workspace: Snapshot Left + Discipline Tabs Right */}
            <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
              <div className="xl:col-span-5">
                <Snapshot data={data} />
              </div>

              <section
                aria-label="Review"
                className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)] xl:col-span-7"
              >
                {/* Section Switcher Header (Cal.com Nav-Pill-Group) */}
                <div className="border-b border-cal-hairline bg-cal-canvas px-5 py-3.5 select-none">
                  <div
                    role="tablist"
                    aria-label="Review sections"
                    className="relative inline-flex flex-wrap items-center gap-1 rounded-full border border-cal-hairline/80 bg-cal-surface-soft p-1 select-none"
                  >
                    {Object.keys(SECTION_LABELS).map((s) => {
                      const progress = PROGRESS[data.progress?.[s]] || PROGRESS.waiting;
                      const selected = tab === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          onClick={() => setTab(s)}
                          className={`group relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors cursor-pointer select-none ${
                            selected
                              ? "text-white font-semibold"
                              : "text-cal-muted hover:text-cal-ink active:scale-[0.98]"
                          }`}
                        >
                          {selected && (
                            <motion.div
                              layoutId="case-review-active-tab"
                              className="absolute inset-0 rounded-full bg-cal-primary shadow-[0_1px_3px_rgba(59,130,246,0.35)]"
                              transition={{
                                type: "spring",
                                stiffness: 420,
                                damping: 34,
                              }}
                            />
                          )}
                          <span className="relative z-10">{SECTION_LABELS[s]}</span>
                          <span
                            className={`relative z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                              selected
                                ? "bg-white/20 text-white border border-white/20"
                                : `border ${progress.className}`
                            }`}
                          >
                            {progress.dotClass && (
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  selected ? "bg-white" : progress.dotClass
                                }`}
                              />
                            )}
                            {progress.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-6">
                  {tab === "cardiology" &&
                    (viewer.can_submit?.cardiology && (!cardio || editingCardio) ? (
                      <CardiologyForm caseId={data.id} existing={cardio} onSaved={onSaved} />
                    ) : cardio ? (
                      <CardiologyResult
                        section={cardio}
                        app={data.app}
                        canEdit={viewer.can_submit?.cardiology}
                        onEdit={() => setEditingCardio(true)}
                      />
                    ) : (
                      <div className="rounded-[8px] border border-dashed border-cal-hairline bg-cal-surface-soft px-4 py-8 text-center text-[13.5px] text-cal-muted">
                        Waiting for the Cardiologist. Only a Cardiologist answers this section.
                      </div>
                    ))}

                  {tab === "nutrition" && (
                    <ItemsSection
                      key="nutrition"
                      caseId={data.id}
                      section="nutrition"
                      items={data.recommendations?.recipes || []}
                      saved={data.sections?.nutrition}
                      canSubmit={viewer.can_submit?.nutrition}
                      onSaved={onSaved}
                    />
                  )}

                  {tab === "exercise" && (
                    <ItemsSection
                      key="exercise"
                      caseId={data.id}
                      section="exercise"
                      items={data.recommendations?.exercises || []}
                      saved={data.sections?.exercise}
                      canSubmit={viewer.can_submit?.exercise}
                      onSaved={onSaved}
                    />
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
