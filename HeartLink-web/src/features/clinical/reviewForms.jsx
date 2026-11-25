import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "../../lib/api.js";
import { itemFacts } from "./caseReviewLogs.js";
import {
  ADVISE_CHECKUP,
  CARDIO_QUESTIONS,
  HOW_SURE,
  ITEM_CHOICES,
  PLAIN_REASONS,
  RISK_LEVELS,
  cardioAnswered,
  cardioSummary,
  itemAnswered,
  itemCounter,
  itemQuestion,
  noteQuestion,
  validPercent,
} from "./reviewQuestions.js";

// HL-168 (panel revision): the expert answers one question at a time, checks their answers, then submits. Same saves as
// before (POST /review-queue/{id}/cardiology, /nutrition, /exercise).

const PRIMARY =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14.5px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted disabled:cursor-not-allowed";
const SECONDARY =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[14px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer";
const INPUT =
  "h-11 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[14.5px] text-cal-ink placeholder:text-cal-muted outline-none focus:border-cal-ink transition-colors";

const bigChoice = (selected) =>
  `flex min-h-[56px] w-full items-center gap-3 rounded-[10px] border px-4 py-3 text-left transition-colors cursor-pointer ${
    selected
      ? "border-cal-primary bg-cal-primary/10 ring-1 ring-cal-primary"
      : "border-cal-hairline bg-cal-canvas hover:bg-cal-surface-soft"
  }`;

function Dot({ on }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
        on ? "border-cal-primary bg-cal-primary" : "border-cal-hairline-strong bg-cal-canvas"
      }`}
    >
      {on ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
    </span>
  );
}

/** One question: a counter, the question, the answers, and Back / Next. */
function QuestionFrame({ counter, title, hint, children, onBack, onNext, nextLabel = "Next", nextDisabled, busy }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-[12.5px] font-medium text-cal-muted">{counter}</div>
        <h3 className="mt-1 text-[19px] font-semibold leading-snug tracking-[-0.3px] text-cal-ink">{title}</h3>
        {hint ? <p className="mt-1 text-[13.5px] text-cal-muted">{hint}</p> : null}
      </div>
      {children}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cal-hairline pt-4">
        {onBack ? (
          <button type="button" onClick={onBack} className={SECONDARY}>
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={onNext} disabled={nextDisabled || busy} className={PRIMARY}>
          <span>{busy ? "Saving…" : nextLabel}</span>
          {!busy && nextLabel === "Next" ? <ArrowRight size={15} /> : null}
        </button>
      </div>
    </div>
  );
}

function Summary({ rows }) {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-3 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-4 text-[14px] sm:grid-cols-[180px_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-cal-muted">{k}</dt>
          <dd className="m-0 whitespace-pre-line font-medium text-cal-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// --- Cardiologist ---------------------------------------------------------------------------------------------------

export function CardiologyWizard({ caseId, existing, onSaved, onCancel }) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState({
    band: existing?.expert_risk_band || "",
    percent: existing?.expert_risk_percent ?? "",
    reasons: existing?.reasons || [],
    confidence: existing?.confidence || "",
    checkup: existing?.checkup_flag || "",
    notes: existing?.notes || "",
  });
  const [ownNumber, setOwnNumber] = useState(existing?.expert_risk_percent != null);
  const [saving, setSaving] = useState(false);
  const set = (patch) => setA((x) => ({ ...x, ...patch }));
  const total = CARDIO_QUESTIONS.length;
  const q = CARDIO_QUESTIONS[step];
  const back = step > 0 ? () => setStep(step - 1) : onCancel;

  const submit = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/review-queue/${caseId}/cardiology`, {
        method: "POST",
        body: JSON.stringify({
          expert_risk_band: a.band,
          expert_risk_percent: a.percent === "" ? null : Number(a.percent),
          reasons: a.reasons,
          confidence: a.confidence,
          checkup_flag: a.checkup,
          notes: a.notes,
        }),
      });
      toast.success("Thank you. Your answers are saved.");
      onSaved(res.case);
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't save your answers. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (step === total) {
    return (
      <QuestionFrame
        counter="Last step"
        title="Check your answers"
        hint="Go back to change anything. You can also edit your answers later."
        onBack={() => setStep(total - 1)}
        onNext={submit}
        nextLabel={existing ? "Save my changes" : "Submit"}
        busy={saving}
      >
        <Summary rows={cardioSummary(a)} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cardio-note" className="text-[13.5px] font-semibold text-cal-ink">
            Anything else? <span className="font-normal text-cal-muted">(optional, only the care team sees it)</span>
          </label>
          <textarea
            id="cardio-note"
            rows={3}
            value={a.notes}
            onChange={(e) => set({ notes: e.target.value })}
            className="w-full rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 py-2.5 text-[14px] text-cal-ink outline-none focus:border-cal-ink resize-none"
          />
        </div>
      </QuestionFrame>
    );
  }

  return (
    <QuestionFrame
      counter={`Question ${step + 1} of ${total}`}
      title={q.title}
      hint={q.hint}
      onBack={back}
      onNext={() => setStep(step + 1)}
      nextDisabled={!cardioAnswered(q.key, a)}
    >
      {q.key === "risk" && (
        <div className="flex flex-col gap-3">
          <div role="radiogroup" aria-label="Heart risk" className="grid gap-2.5 sm:grid-cols-2">
            {RISK_LEVELS.map((l) => (
              <button
                key={l.code}
                type="button"
                role="radio"
                aria-checked={a.band === l.code}
                onClick={() => set({ band: l.code })}
                className={bigChoice(a.band === l.code)}
              >
                <Dot on={a.band === l.code} />
                <span>
                  <span className="block text-[15px] font-semibold text-cal-ink">{l.label}</span>
                  <span className="block text-[13px] text-cal-muted">{l.meaning}</span>
                </span>
              </button>
            ))}
          </div>
          {ownNumber ? (
            <div className="flex max-w-[340px] flex-col gap-1.5">
              <label htmlFor="cardio-percent" className="text-[13.5px] font-semibold text-cal-ink">
                Your own number, out of 100 people <span className="font-normal text-cal-muted">(optional)</span>
              </label>
              <input
                id="cardio-percent"
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={a.percent}
                onChange={(e) => set({ percent: e.target.value })}
                className={INPUT}
                placeholder="For example 6.5"
              />
              {a.percent !== "" && !validPercent(a.percent) ? (
                <p role="alert" className="text-[12.5px] font-medium text-cal-error">
                  Enter a number between 0.1 and 100.
                </p>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOwnNumber(true)}
              className="self-start text-[13.5px] font-semibold text-cal-ink underline underline-offset-2 cursor-pointer"
            >
              Add your own number (optional)
            </button>
          )}
        </div>
      )}

      {q.key === "reasons" && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {PLAIN_REASONS.map((r) => {
            const on = a.reasons.includes(r.code);
            return (
              <label key={r.code} className={bigChoice(on)}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    set({ reasons: on ? a.reasons.filter((x) => x !== r.code) : [...a.reasons, r.code] })
                  }
                  className="h-5 w-5 shrink-0 accent-cal-primary"
                />
                <span className="text-[14.5px] font-medium text-cal-ink">{r.label}</span>
              </label>
            );
          })}
        </div>
      )}

      {q.key === "sure" && (
        <div role="radiogroup" aria-label="How sure" className="grid gap-2.5 sm:grid-cols-3">
          {HOW_SURE.map((o) => (
            <button
              key={o.code}
              type="button"
              role="radio"
              aria-checked={a.confidence === o.code}
              onClick={() => set({ confidence: o.code })}
              className={bigChoice(a.confidence === o.code)}
            >
              <Dot on={a.confidence === o.code} />
              <span className="text-[14.5px] font-semibold text-cal-ink">{o.label}</span>
            </button>
          ))}
        </div>
      )}

      {q.key === "checkup" && (
        <div role="radiogroup" aria-label="See a doctor in person" className="grid gap-2.5">
          {ADVISE_CHECKUP.map((o) => (
            <button
              key={o.code}
              type="button"
              role="radio"
              aria-checked={a.checkup === o.code}
              onClick={() => set({ checkup: o.code })}
              className={bigChoice(a.checkup === o.code)}
            >
              <Dot on={a.checkup === o.code} />
              <span className="text-[14.5px] font-semibold text-cal-ink">{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </QuestionFrame>
  );
}

// --- Dietitian and Physical Therapist -------------------------------------------------------------------------------

export function ItemsWizard({ caseId, section, items, saved, onSaved, onCancel }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(
    Object.fromEntries((saved?.item_verdicts || []).map((v) => [v.item_id, { verdict: v.verdict, note: v.note || "" }]))
  );
  const [saving, setSaving] = useState(false);
  const kind = section === "nutrition" ? "recipe" : "exercise";
  const set = (id, patch) => setAnswers((x) => ({ ...x, [id]: { ...(x[id] || {}), ...patch } }));
  const back = index > 0 ? () => setIndex(index - 1) : onCancel;

  const submit = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/review-queue/${caseId}/${section}`, {
        method: "POST",
        body: JSON.stringify({
          items: items.map((it) => ({ item_id: it.id, verdict: answers[it.id].verdict, note: answers[it.id].note || "" })),
        }),
      });
      toast.success("Thank you. Your answers are saved.");
      onSaved(res.case);
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't save your answers. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (index === items.length) {
    const label = (code) => ITEM_CHOICES.find((c) => c.code === code)?.label || code;
    return (
      <QuestionFrame
        counter="Last step"
        title="Check your answers"
        hint="Go back to change anything. You can also edit your answers later."
        onBack={() => setIndex(items.length - 1)}
        onNext={submit}
        nextLabel={saved ? "Save my changes" : "Submit"}
        busy={saving}
      >
        <Summary
          rows={items.map((it) => {
            const ans = answers[it.id] || {};
            return [it.name, `${label(ans.verdict)}${ans.note?.trim() ? `\n${ans.note.trim()}` : ""}`];
          })}
        />
      </QuestionFrame>
    );
  }

  const it = items[index];
  const ans = answers[it.id] || {};
  const facts = itemFacts(it, kind);
  return (
    <QuestionFrame
      counter={itemCounter(section, index, items.length)}
      title={itemQuestion(section)}
      onBack={back}
      onNext={() => setIndex(index + 1)}
      nextDisabled={!itemAnswered(ans)}
    >
      <div className="flex items-center gap-3.5 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-4">
        {it.image_url ? (
          <img src={it.image_url} alt="" className="h-16 w-16 shrink-0 rounded-[8px] border border-cal-hairline object-cover" />
        ) : null}
        <div className="min-w-0">
          <div className="text-[16px] font-semibold text-cal-ink">{it.name}</div>
          {facts.length ? <p className="mt-0.5 text-[13px] text-cal-muted">{facts.join(", ")}</p> : null}
        </div>
      </div>
      <div role="radiogroup" aria-label={itemQuestion(section)} className="grid gap-2.5 sm:grid-cols-3">
        {ITEM_CHOICES.map((o) => (
          <button
            key={o.code}
            type="button"
            role="radio"
            aria-checked={ans.verdict === o.code}
            onClick={() => set(it.id, { verdict: o.code })}
            className={bigChoice(ans.verdict === o.code)}
          >
            <Dot on={ans.verdict === o.code} />
            <span className="text-[14.5px] font-semibold text-cal-ink">{o.label}</span>
          </button>
        ))}
      </div>
      {ans.verdict && ans.verdict !== "ok" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`note-${it.id}`} className="text-[13.5px] font-semibold text-cal-ink">
            {noteQuestion(ans.verdict)}
          </label>
          <input
            id={`note-${it.id}`}
            type="text"
            value={ans.note || ""}
            onChange={(e) => set(it.id, { note: e.target.value })}
            className={INPUT}
          />
        </div>
      ) : null}
    </QuestionFrame>
  );
}
