import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Check, Info, ShieldCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AdminLayout from "../../components/layouts/adminLayout.jsx";
import { Skeleton } from "../../components/ui/skeleton.jsx";
import { apiFetch } from "../../lib/api.js";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import LoadError from "../../components/ui/loadError.jsx";
import { TAG, exerciseCheckView, riskBand, riskPercent } from "../careTeam/vitals.js";
import {
  AGREEMENT,
  CHECKUP,
  CONFIDENCE,
  PROGRESS,
  REASONS,
  RISK_BANDS,
  RISK_KINDS,
  SECTION_EXPERT,
  SECTION_LABELS,
  labelOf,
} from "./reviewUi.js";
import { STEPS, shortDate, stageLabel } from "./reviewFlow.js";
import { CardiologyWizard, ItemsWizard } from "./reviewForms.jsx";
import { resultSentence } from "./reviewQuestions.js";
import {
  CONDITION_NOTE,
  bloodPressureLine,
  healthCheckView,
  labLines,
  medicineLine,
  personLine,
  symptomsLine,
} from "./aboutPerson.js";
import { ExerciseLogPanel, FoodLogPanel } from "./caseReviewLogPanels.jsx";
import { datasetStatusView, verdictSummary } from "./caseDataset.js";
import { itemFacts } from "./caseReviewLogs.js";

// HL-055 / HL-056: one review round. Every reviewer sees the same anonymized snapshot; each expert
// answers only their own section. HL-153: the Cardiologist gives the Heart risk band they would give; the app's Heart
// risk stays hidden until they submit, then the two are compared.

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
  // The server counts every log, including the ones this reviewer's role doesn't see in detail (2026-11-18)
  const counts = ["Meal", "Exercise", "Sleep"].map((type) => [
    type,
    data.log_counts?.[type] ?? (data.timeline || []).filter((t) => t.type === type).length,
  ]);
  const p = data.patient || {};

  const about = data.about || {};
  const healthCheck = healthCheckView(about);

  return (
    <section
      aria-label="About this person"
      className="flex flex-col gap-5 rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div>
        <h2 className="text-[16px] font-semibold text-cal-ink">About this person</h2>
        <p className="mt-0.5 text-[13px] text-cal-muted">
          As it was when this case was picked. Names and contact details are hidden.
        </p>
      </div>

      {/* HL-168: the facts in plain sentences */}
      <div className="flex flex-col gap-2 text-[14.5px] leading-relaxed text-cal-ink">
        <p className="font-semibold">{personLine(p)}</p>
        <p>{medicineLine(about)}</p>
        {labLines(about).map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p>{bloodPressureLine(about)}</p>
        <p>{symptomsLine(about)}</p>
      </div>

      {/* HL-164 / HL-168: the health check */}
      <div
        className={`rounded-[10px] border px-4 py-3 text-[13.5px] ${
          healthCheck.flag ? "border-cal-warning/35 bg-cal-warning/10" : "border-cal-hairline bg-cal-surface-soft"
        }`}
      >
        <div className="font-semibold text-cal-ink">Health check</div>
        <p className="mt-0.5 text-cal-body">{healthCheck.text}</p>
        {healthCheck.flag && (
          <p className="mt-1.5 flex items-start gap-1.5 font-medium text-cal-ink">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-cal-warning" aria-hidden="true" />
            <span>{CONDITION_NOTE}</span>
          </p>
        )}
      </div>

      <details className="group rounded-[10px] border border-cal-hairline px-4 py-3">
        <summary className="cursor-pointer select-none text-[13.5px] font-semibold text-cal-ink">
          See all answers and readings
        </summary>
        <div className="mt-4 flex flex-col gap-5">
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
        </div>
      </details>

      <p className="border-t border-cal-hairline pt-3.5 text-[12px] leading-relaxed text-cal-muted">
        The app&apos;s own heart risk stays hidden until the Cardiologist answers, so it can&apos;t sway them.
      </p>
    </section>
  );
}

function CardiologyResult({ section, app, canEdit, onEdit }) {
  // HL-153: the Cardiologist's Heart risk band vs the app's. Older reviews gave a habits-style level instead.
  const older = !section.expert_risk_band;
  const agreement = AGREEMENT[older ? section.tier_agreement : section.risk_agreement];
  return (
    <div className="flex flex-col gap-5">
      {/* HL-168: what the app said, in one plain sentence */}
      {!older && (
        <p className="rounded-[10px] border border-cal-hairline bg-cal-surface-soft px-4 py-3.5 text-[15px] font-medium leading-relaxed text-cal-ink">
          {resultSentence(section.expert_risk_band, app?.risk)}
        </p>
      )}
      {/* 3-Up Comparison Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[12px] border border-cal-hairline bg-cal-surface-soft p-4">
          <div className="text-[12px] font-medium text-cal-muted">Cardiologist</div>
          <div className="mt-1 font-cal-display text-[20px] font-semibold tracking-[-0.4px] text-cal-ink">
            {older ? section.expert_tier : riskBand(section.expert_risk_band).label}
          </div>
          <div className="mt-1 font-cal-mono text-[12px] text-cal-muted">
            {older
              ? "Older review (habits level)"
              : section.expert_risk_percent != null
                ? `Their estimate ${riskPercent(section.expert_risk_percent)}`
                : "No % given"}
          </div>
        </div>

        <div className="rounded-[12px] border border-cal-hairline bg-cal-surface-soft p-4">
          <div className="text-[12px] font-medium text-cal-muted">App&apos;s Heart risk</div>
          <div className="mt-1 font-cal-display text-[20px] font-semibold tracking-[-0.4px] text-cal-ink">
            {app?.risk ? riskBand(app.risk.band).label : "None to compare"}
          </div>
          <div className="mt-1 text-[12px] text-cal-muted">
            {app?.risk ? (
              <>
                <span className="font-cal-mono">{riskPercent(app.risk.percent)}</span>
                {` · ${RISK_KINDS[app.risk.kind] || ""}`}
              </>
            ) : (
              "Under 30, over 79, or not worked out when the case opened"
            )}
          </div>
          {/* The habits score, extra information only */}
          {app?.score != null && (
            <div className="mt-2 border-t border-cal-hairline pt-2 text-[12px] text-cal-muted">
              Habits score <span className="font-cal-mono font-semibold text-cal-ink">{app.score}</span>
              {app.tier ? ` (${app.tier})` : ""}
            </div>
          )}
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
          <div className="mt-1 text-[11.5px] text-cal-muted">
            {older ? "Older review: compared with the habits level, not counted" : "Computed automatically"}
          </div>
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
          <span className="font-medium">{labelOf(CHECKUP, section.checkup_flag)}</span>
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
  // HL-168: one recipe or exercise per screen, then "Check your answers"
  if (showForm) {
    return (
      <ItemsWizard
        caseId={caseId}
        section={section}
        items={items}
        saved={saved}
        onSaved={(fresh) => {
          setEditing(false);
          onSaved(fresh);
        }}
        onCancel={saved ? () => setEditing(false) : undefined}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-[13.5px] text-cal-muted">
        {showForm
          ? `Evaluate whether each ${noun} recommended by the app is suitable for this user:`
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
              <div className="flex min-w-0 items-center gap-3">
                {it.image_url ? (
                  <img
                    src={it.image_url}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-[8px] border border-cal-hairline object-cover"
                    loading="lazy"
                  />
                ) : null}
                <div className="min-w-0">
                  <span className="text-[14px] font-semibold text-cal-ink">{it.name}</span>
                  {itemFacts(it, section === "nutrition" ? "recipe" : "exercise").length ? (
                    <p className="mt-0.5 text-[12.5px] text-cal-muted">
                      {itemFacts(it, section === "nutrition" ? "recipe" : "exercise").join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>
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
            Not-suitable items are recorded for this user.
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

// HL-168: where this case is in the four steps (pick, check, approve, results)
function CaseSteps({ stage, outcome }) {
  const current = stage === "check" ? 1 : stage === "approve" ? 2 : 3;
  return (
    <ol aria-label="Where this case is" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STEPS.map((s, i) => {
        const done = i < current || (i === 3 && stage === "done");
        const here = i === current && stage !== "done";
        const label = i === 3 && stage === "done" ? stageLabel({ stage, outcome }) : s.label;
        return (
          <li
            key={s.key}
            aria-current={here ? "step" : undefined}
            className={`flex items-center gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-[13.5px] ${
              here ? "border-cal-primary bg-cal-primary/10 font-semibold text-cal-ink" : "border-cal-hairline bg-cal-canvas text-cal-muted"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                done ? "bg-cal-success text-white" : here ? "bg-cal-primary text-cal-on-primary" : "bg-cal-surface-card text-cal-ink"
              }`}
            >
              {done ? <Check size={13} aria-hidden="true" /> : s.number}
            </span>
            <span>
              {label}
              {here ? <span className="sr-only"> (this case is here)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
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
      <div className="workspace workspace--operations mx-auto w-full max-w-[1440px] space-y-5 font-cal-sans text-cal-ink">
        <div>
          <button
            type="button"
            onClick={() => navigate("/cases")}
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-card transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to cases</span>
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
                <span>Case review</span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.15] text-cal-ink">
                  {data.case_code}
                </h1>
                <span className="inline-flex items-center rounded-full border border-cal-hairline bg-cal-surface-card px-2.5 py-0.5 text-[12px] font-medium text-cal-ink">
                  {stageLabel(data)}
                </span>
                {data.older && (
                  <span className="inline-flex items-center rounded-full border border-cal-hairline bg-cal-surface-soft px-2.5 py-0.5 text-[12px] font-medium text-cal-muted">
                    Older case
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-[14px] text-cal-muted">
                {shortDate(data.opened_at) ? `Picked ${shortDate(data.opened_at)}` : "Picked for review"}
              </p>
            </div>

            <CaseSteps stage={data.stage} outcome={data.outcome} />

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
                <span>Admins can follow each case here. Only the Cardiologist, the Dietitian and the Physical Therapist answer.</span>
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
                      <CardiologyWizard
                        caseId={data.id}
                        existing={cardio}
                        onSaved={onSaved}
                        onCancel={cardio ? () => setEditingCardio(false) : undefined}
                      />
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
                    <div className="flex flex-col gap-6">
                      <FoodLogPanel timeline={data.timeline} count={data.log_counts?.Meal ?? 0} />
                      <ItemsSection
                        key="nutrition"
                        caseId={data.id}
                        section="nutrition"
                        items={data.recommendations?.recipes || []}
                        saved={data.sections?.nutrition}
                        canSubmit={viewer.can_submit?.nutrition}
                        onSaved={onSaved}
                      />
                    </div>
                  )}

                  {tab === "exercise" && (
                    <div className="flex flex-col gap-6">
                      <ExerciseLogPanel timeline={data.timeline} count={data.log_counts?.Exercise ?? 0} />
                      <div>
                        {data.exercise_check && <ExerciseCheckLine check={data.exercise_check} />}
                        <ItemsSection
                          key="exercise"
                          caseId={data.id}
                          section="exercise"
                          items={data.recommendations?.exercises || []}
                          saved={data.sections?.exercise}
                          canSubmit={viewer.can_submit?.exercise}
                          onSaved={onSaved}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* HL-165: the Cardiologist approves the case before it joins the dataset (once the Cardiologist has reviewed) */}
            {cardio ? <DatasetPanel data={data} onSaved={onSaved} /> : null}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};


// HL-165 (panel revision): the Cardiologist approves a case before it can be used as a dataset. They see what would go
// in (the setup answers on the left, the app's Heart risk, their own band, and the Dietitian's and PT's checks), then
// approve it or leave it out with a reason. Everyone else sees the status. Feedback to the patient is not affected.
const DATASET_TONE = {
  done: "border-cal-success/25 bg-cal-success/10",
  out: "border-cal-hairline bg-cal-surface-soft",
  waiting: "border-cal-warning/30 bg-cal-warning/10",
};

function DatasetPanel({ data, onSaved }) {
  const dataset = data.dataset || {};
  const view = datasetStatusView(dataset);
  const [leaving, setLeaving] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const cardio = data.sections?.cardiology;
  const appRisk = data.app?.risk;
  const food = verdictSummary(data.sections?.nutrition);
  const exercise = verdictSummary(data.sections?.exercise);

  const decide = async (decision) => {
    if (decision === "leave_out" && !note.trim()) {
      toast.error("Say why this case is left out.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/review-queue/${data.id}/dataset`, {
        method: "POST",
        body: JSON.stringify({ decision, note: decision === "leave_out" ? note.trim() : "" }),
      });
      toast.success(decision === "approve" ? "Approved for the dataset." : "Left out of the dataset.");
      setLeaving(false);
      setNote("");
      onSaved(res.case);
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't save your decision.");
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    ["Your Heart risk band", cardio?.expert_risk_band ? `${labelOf(RISK_BANDS, cardio.expert_risk_band)}${cardio.expert_risk_percent != null ? ` (${cardio.expert_risk_percent}%)` : ""}` : "Not given"],
    ["The app's Heart risk", appRisk ? `${labelOf(RISK_BANDS, appRisk.band)}${appRisk.percent != null ? ` (${appRisk.percent}%)` : ""}` : "None (outside ages 30 to 79)"],
    ["Food check (Dietitian)", food || (data.progress?.nutrition === "not_needed" ? "Nothing to check" : "Not done yet")],
    ["Exercise check (Physical Therapist)", exercise || (data.progress?.exercise === "not_needed" ? "Nothing to check" : "Not done yet")],
  ];

  return (
    <section
      aria-label="Use for the dataset"
      className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[16px] font-semibold text-cal-ink">Use for the dataset</h2>
        <span className={`${TAG} ${DATASET_TONE[view.tone]}`}>{view.label}</span>
      </div>
      <p className="mt-1.5 text-[13.5px] text-cal-muted">{view.detail}</p>
      {dataset.can_decide && healthCheckView(data.about).flag && (
        <p className="mt-3 flex items-start gap-2 rounded-[10px] border border-cal-warning/35 bg-cal-warning/10 px-4 py-3 text-[13.5px] font-medium text-cal-ink">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-cal-warning" aria-hidden="true" />
          <span>
            {healthCheckView(data.about).text} {CONDITION_NOTE}
          </span>
        </p>
      )}

      {dataset.can_decide ? (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-[13.5px] text-cal-body">
            Check the data and every reviewer&apos;s feedback before this case is used to check or train the app&apos;s
            estimate. The setup answers are on the left.
          </p>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <dt className="text-[12px] text-cal-muted">{k}</dt>
                <dd className="text-[14px] font-medium text-cal-ink">{v}</dd>
              </div>
            ))}
          </dl>

          {leaving ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="dataset-note" className="text-[12.5px] font-semibold text-cal-ink">
                Why should this case be left out?
              </label>
              <textarea
                id="dataset-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={textareaClass}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => decide("leave_out")}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted"
                >
                  {saving ? "Saving…" : "Leave it out"}
                </button>
                <button
                  type="button"
                  onClick={() => setLeaving(false)}
                  className="inline-flex h-10 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => decide("approve")}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted"
              >
                {saving ? "Saving…" : view.status === "approved" ? "Approve again" : "Approve for the dataset"}
              </button>
              <button
                type="button"
                onClick={() => setLeaving(true)}
                className="inline-flex h-10 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
              >
                Leave it out
              </button>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

// 2026-11-12: the patient's exercise safety check (PAR-Q+) today. The exercises listed below are the ones it allows,
// as in the app (HL-123): the result decides, never the score.
function ExerciseCheckLine({ check }) {
  const view = exerciseCheckView(check);
  const answered = check.answered_at ? new Date(check.answered_at) : null;
  const when =
    answered && !Number.isNaN(answered.getTime())
      ? answered.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
      : null;
  return (
    <div className="mb-4 rounded-[8px] border border-cal-hairline bg-cal-surface-soft px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="font-medium text-cal-ink">Exercise safety check (PAR-Q+):</span>
        <span className={`${TAG} ${view.className}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${view.dotClass}`} />
          <span>{view.label}</span>
        </span>
        {when && <span className="text-cal-muted">Answered {when}</span>}
      </div>
      <p className="mt-1.5 text-[12.5px] text-cal-muted">
        {view.detail} The exercises below are the ones this result allows in the app.
      </p>
    </div>
  );
}

export default CaseReviewDetail;
