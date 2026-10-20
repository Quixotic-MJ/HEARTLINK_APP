import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileCheck2, X } from "lucide-react";

export default function ContentReviewModal({ open, type, detail, expertType, onClose, onSubmit }) {
  const [decision, setDecision] = useState("approved");
  const [comments, setComments] = useState("");
  const [checked, setChecked] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const item = detail?.item;
  const sources = useMemo(() => item?.evidence_sources || [], [item]);
  if (!open || !item) return null;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!comments.trim()) return setError("Add review comments explaining your decision.");
    if (decision === "approved" && !checked.length) return setError("Confirm at least one evidence source before approval.");
    setSaving(true);
    try {
      await onSubmit({ decision, comments: comments.trim(), evidence_checked: checked });
      setDecision("approved"); setComments(""); setChecked([]);
    } catch (submitError) {
      setError(submitError?.message || "Could not record this review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Record expert review">
      <form onSubmit={submit} className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky-700">{expertType} review · Version {item.content_version || 1}</p><h2 className="mt-1 text-lg font-bold text-slate-950">{item.name}</h2><p className="mt-1 text-[12px] text-slate-500">Your decision is immutable and applies only to this exact {type} version.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
          {error && <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] font-medium text-rose-800"><AlertTriangle size={16} className="shrink-0" />{error}</div>}
          <fieldset><legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Decision</legend><div className="grid gap-2 sm:grid-cols-3">{[["approved","Approve"],["changes_requested","Request changes"],["rejected","Reject"]].map(([value,label]) => <label key={value} className={`cursor-pointer rounded-xl border p-3 text-center text-[12px] font-bold ${decision === value ? "border-sky-500 bg-sky-50 text-sky-800" : "border-slate-200 text-slate-600"}`}><input type="radio" name="decision" value={value} checked={decision === value} onChange={() => setDecision(value)} className="sr-only" />{label}</label>)}</div></fieldset>
          <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Evidence checked</p>{sources.length ? <div className="space-y-2">{sources.map((source, index) => { const key = source.url || source.title || `source-${index}`; return <label key={key} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><input type="checkbox" checked={checked.includes(key)} onChange={(event) => setChecked(event.target.checked ? [...checked, key] : checked.filter((value) => value !== key))} className="mt-0.5 h-4 w-4 accent-sky-600" /><span className="min-w-0 text-[12px]"><strong className="block text-slate-800">{source.title || "Evidence reference"}</strong>{source.url && <span className="mt-0.5 block truncate text-sky-700">{source.url}</span>}</span></label>; })}</div> : <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900"><AlertTriangle size={16} />No evidence sources are attached. Request changes before approval.</div>}</div>
          <label><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Review comments</span><textarea rows="5" value={comments} onChange={(event) => setComments(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" placeholder="Document evidence checked, safety concerns, and required revisions." /></label>
          <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-600"><FileCheck2 size={16} className="mt-0.5 shrink-0 text-sky-700" />Approval does not publish content. A Superadmin may publish only after every required specialization approves this version.</div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-bold text-slate-700">Cancel</button><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-sky-700 disabled:opacity-60"><CheckCircle2 size={15} />{saving ? "Recording…" : "Record decision"}</button></div>
      </form>
    </div>
  );
}
