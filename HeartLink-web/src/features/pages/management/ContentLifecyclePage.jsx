import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Archive, ArrowRight, CheckCircle2, ClipboardCheck, Edit3, Eye,
  FileClock, Filter, Loader2, Plus, RefreshCw, Search, Send, ShieldAlert, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../../components/layouts/adminLayout";
import { apiFetch } from "../../../api";
import { useAuth } from "../../../contexts/AuthContext";
import ContentEditorModal from "../../content/components/ContentEditorModal";
import ContentReviewModal from "../../content/components/ContentReviewModal";
import PatientPreviewModal from "../../content/components/PatientPreviewModal";
import {
  audienceLabel, CONTENT_CONFIG, errorMessage, normalizeContent, STATUS_LABELS, STATUS_STYLES,
} from "../../content/contentModel";

const staffCanAccess = (type, user) => {
  if (["admin", "super_admin"].includes(user?.role)) return true;
  if (user?.role !== "medical_expert") return false;
  if (user.expertType === "Cardiologist") return true;
  return user.expertType === CONTENT_CONFIG[type].requiredExpert;
};

const formatDate = (value) => value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";

function StatusBadge({ status }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}>{STATUS_LABELS[status] || status}</span>;
}

function StatCard({ label, value, icon: Icon, tone = "sky" }) {
  const tones = { sky: "bg-sky-50 text-sky-700", amber: "bg-amber-50 text-amber-700", emerald: "bg-emerald-50 text-emerald-700", slate: "bg-slate-100 text-slate-600" };
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p></div><span className={`rounded-xl p-2.5 ${tones[tone]}`}><Icon size={18} /></span></div></div>;
}

function changedFields(current, previous) {
  if (!current || !previous) return [];
  const ignored = new Set(["updated_at", "created_at", "status", "expert_validated", "content_version", "change_notes"]);
  return Object.keys(current).filter((key) => !ignored.has(key) && JSON.stringify(current[key]) !== JSON.stringify(previous[key]));
}

function DetailPanel({ detail, user, onEdit, onPreview, onAction, busy }) {
  if (!detail) return <aside className="hidden min-h-[520px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-[13px] text-slate-500 xl:flex">Select an item to inspect its review state, history, and patient preview.</aside>;
  const item = detail.item;
  const isEditor = ["admin", "super_admin"].includes(user?.role);
  const isExpert = user?.role === "medical_expert";
  const canReview = isExpert && item.status === "in_review" && detail.approval?.required_specializations?.includes(user.expertType) && !detail.current_reviews?.some((review) => review.reviewer_id === user.id);
  const versions = detail.versions || [];
  return (
    <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={item.status} /><span className="text-[10px] font-bold text-slate-500">VERSION {item.content_version || 1}</span></div><h2 className="mt-3 text-lg font-bold text-slate-950">{item.name}</h2><p className="mt-1 text-[12px] leading-5 text-slate-500">{audienceLabel(item.intended_audiences)}</p></div><button onClick={onPreview} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Patient preview"><Eye size={17} /></button></div></div>
      <div className="max-h-[calc(100vh-270px)] space-y-5 overflow-y-auto p-5">
        <section><h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Approval requirements</h3><div className="mt-2 space-y-2">{detail.approval?.required_specializations?.map((specialization) => { const decision = detail.approval.decisions?.[specialization]; return <div key={specialization} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-[12px]"><span className="font-semibold text-slate-700">{specialization}</span><span className={`inline-flex items-center gap-1 font-bold ${decision === "approved" ? "text-emerald-700" : decision ? "text-amber-700" : "text-slate-500"}`}>{decision === "approved" ? <CheckCircle2 size={14} /> : <FileClock size={14} />}{decision ? STATUS_LABELS[decision] || decision.replaceAll("_", " ") : "Awaiting review"}</span></div>; })}</div></section>
        {!!detail.publish_blockers?.length && <section className="rounded-xl border border-amber-200 bg-amber-50 p-3"><h3 className="flex items-center gap-2 text-[12px] font-bold text-amber-900"><ShieldAlert size={15} />Publication blockers</h3><ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-5 text-amber-800">{detail.publish_blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></section>}
        <section><h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Review history</h3>{detail.reviews?.length ? <div className="mt-2 space-y-2">{detail.reviews.map((review) => <div key={review.id} className="rounded-lg border border-slate-200 p-3"><div className="flex items-center justify-between gap-2"><strong className="text-[12px] text-slate-800">{review.reviewer_name} · {review.reviewer_specialization}</strong><span className={`text-[10px] font-bold ${review.decision === "approved" ? "text-emerald-700" : "text-amber-700"}`}>{review.decision.replaceAll("_", " ")}</span></div><p className="mt-1 text-[11px] leading-5 text-slate-600">{review.comments}</p><p className="mt-1 text-[10px] text-slate-400">Version {review.content_version} · {formatDate(review.reviewed_at)}</p></div>)}</div> : <p className="mt-2 text-[12px] text-slate-500">No expert decision has been recorded.</p>}</section>
        <section><h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Version comparison</h3>{versions.length ? <div className="mt-2 space-y-2">{versions.slice(0, 4).map((version, index) => { const fields = changedFields(version.snapshot, versions[index + 1]?.snapshot); return <div key={version.id || version.content_version} className="rounded-lg border border-slate-200 p-3"><div className="flex justify-between text-[11px]"><strong className="text-slate-800">Version {version.content_version}</strong><span className="text-slate-400">{formatDate(version.created_at)}</span></div><p className="mt-1 text-[11px] text-slate-600">{version.change_notes || "No change note supplied."}</p>{fields.length > 0 && <p className="mt-1 text-[10px] text-sky-700">Changed: {fields.slice(0, 6).map((field) => field.replaceAll("_", " ")).join(", ")}{fields.length > 6 ? ` +${fields.length - 6} more` : ""}</p>}</div>; })}</div> : <p className="mt-2 text-[12px] text-slate-500">Version history begins after migration or the next saved draft.</p>}</section>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 p-4">
        {isEditor && item.status !== "archived" && <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700"><Edit3 size={14} />Edit new version</button>}
        {isEditor && ["draft", "changes_requested"].includes(item.status) && <button disabled={busy} onClick={() => onAction("submit")} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-60"><Send size={14} />Submit for review</button>}
        {canReview && <button disabled={busy} onClick={() => onAction("review")} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-60"><ClipboardCheck size={14} />Record review</button>}
        {user?.role === "super_admin" && item.status === "approved" && <button disabled={busy} onClick={() => onAction("publish")} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-60"><ShieldCheck size={14} />Publish</button>}
        {user?.role === "super_admin" && ["published", "approved"].includes(item.status) && <button disabled={busy} onClick={() => onAction("archive")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 disabled:opacity-60"><Archive size={14} />Archive</button>}
        {isEditor && item.status === "archived" && <button disabled={busy} onClick={() => onAction("restore")} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-60"><RefreshCw size={14} />Restore to draft</button>}
      </div>
    </aside>
  );
}

export default function ContentLifecyclePage({ type }) {
  const config = CONTENT_CONFIG[type];
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [overview, setOverview] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("search") || "");
  const [statusFilter, setStatusFilter] = useState(user?.role === "medical_expert" ? "in_review" : "all");
  const [editorItem, setEditorItem] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const load = useCallback(async (preferredId = null) => {
    setLoading(true);
    try {
      const [contentResult, workflowResult] = await Promise.all([
        apiFetch(config.endpoint, { bypassCache: true }),
        apiFetch(`/api/content-workflow/overview?content_type=${type}`, { bypassCache: true }),
      ]);
      const normalized = (Array.isArray(contentResult) ? contentResult : contentResult?.data || []).map((item) => normalizeContent(type, item));
      setItems(normalized); setOverview(workflowResult || {});
      const nextId = preferredId && normalized.some((item) => item.id === preferredId) ? preferredId : normalized[0]?.id;
      setSelectedId(nextId || null);
      if (nextId) setDetail(await apiFetch(`/api/content-workflow/${type}/${nextId}`, { bypassCache: true }));
      else setDetail(null);
    } catch (error) {
      toast.error(`Could not load ${config.plural}`, { description: errorMessage(error, "Apply migration 023 and restart the API before testing this workflow.") });
      setItems([]); setOverview({}); setDetail(null);
    } finally { setLoading(false); }
  }, [config.endpoint, config.plural, type]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(null), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selectItem = async (item) => {
    setSelectedId(item.id); setDetail(null);
    try { setDetail(await apiFetch(`/api/content-workflow/${type}/${item.id}`, { bypassCache: true })); }
    catch (error) { toast.error("Could not load workflow details", { description: errorMessage(error) }); }
  };

  const visibleItems = useMemo(() => items.filter((item) => {
    if (user?.role === "medical_expert" && user.expertType === "Cardiologist" && !item.requiresCardiologistReview) return false;
    const matchesQuery = !query.trim() || item.name.toLowerCase().includes(query.toLowerCase()) || (item.category || item.type || "").toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === "all" || item.status === statusFilter);
  }), [items, query, statusFilter, user]);

  const counts = useMemo(() => ({
    drafts: items.filter((item) => ["draft", "changes_requested"].includes(item.status)).length,
    review: items.filter((item) => item.status === "in_review").length,
    approved: items.filter((item) => item.status === "approved").length,
    published: items.filter((item) => item.status === "published").length,
  }), [items]);

  if (!staffCanAccess(type, user)) return <AdminLayout><div className="mx-auto mt-20 max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm"><ShieldAlert className="mx-auto text-amber-600" size={32} /><h1 className="mt-4 text-xl font-bold text-slate-950">Review queue not assigned</h1><p className="mt-2 text-[13px] leading-6 text-slate-600">This queue is assigned to {config.requiredExpert} reviewers. Your specialization is {user?.expertType || "not configured"}.</p></div></AdminLayout>;

  const saveDraft = async (payload) => {
    try {
      if (editorItem) await apiFetch(`${config.endpoint.replace(/\/$/, "")}/${editorItem.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await apiFetch(config.endpoint, { method: "POST", body: JSON.stringify(payload) });
      toast.success(editorItem ? "New draft version saved" : `${config.singular[0].toUpperCase() + config.singular.slice(1)} draft created`);
      setEditorOpen(false); setEditorItem(null); await load(editorItem?.id);
    } catch (error) { throw new Error(errorMessage(error, `Could not save the ${config.singular} draft.`), { cause: error }); }
  };

  const action = async (name, reviewPayload) => {
    if (name === "review") { setReviewOpen(true); return; }
    setBusy(true);
    try {
      await apiFetch(`/api/content-workflow/${type}/${detail.item.id}/${name === "submitReview" ? "reviews" : name}`, { method: "POST", body: reviewPayload ? JSON.stringify(reviewPayload) : undefined });
      const message = { submit: "Submitted for expert review", publish: "Published to patients", archive: "Content archived", restore: "New draft cycle created", submitReview: "Expert decision recorded" }[name];
      toast.success(message); setReviewOpen(false); await load(detail.item.id);
    } catch (error) { const message = errorMessage(error); if (name === "submitReview") throw new Error(message, { cause: error }); toast.error("Workflow action failed", { description: message }); }
    finally { setBusy(false); }
  };

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">{config.eyebrow}</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-slate-950">{config.title}</h1><p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-600">{config.description}</p></div>{["admin", "super_admin"].includes(user?.role) && <button onClick={() => { setEditorItem(null); setEditorOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-[12px] font-bold text-white shadow-sm hover:bg-sky-700"><Plus size={15} />Create {config.singular} draft</button>}</header>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="Draft work" value={counts.drafts} icon={Edit3} tone="slate" /><StatCard label="In review" value={counts.review} icon={FileClock} tone="sky" /><StatCard label="Ready to publish" value={counts.approved} icon={ShieldCheck} tone="amber" /><StatCard label="Published" value={counts.published} icon={CheckCircle2} tone="emerald" /></div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.8fr)]">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row"><label className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-sky-500" placeholder={`Search ${config.plural}…`} /></label><label className="relative"><Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-w-44 appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-[12px] font-semibold text-slate-700"><option value="all">All workflow states</option>{Object.entries(STATUS_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><button onClick={() => load(selectedId)} className="rounded-lg border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50" title="Refresh"><RefreshCw size={15} /></button></div>
            {loading ? <div className="flex min-h-[420px] items-center justify-center text-slate-500"><Loader2 className="animate-spin" size={22} /></div> : visibleItems.length ? <div className="divide-y divide-slate-100">{visibleItems.map((item) => { const flow = overview[item.id] || {}; const selected = selectedId === item.id; return <button key={item.id} onClick={() => selectItem(item)} className={`grid w-full gap-3 p-4 text-left transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center ${selected ? "bg-sky-50/60 ring-1 ring-inset ring-sky-200" : ""}`}><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate text-[13px] font-bold text-slate-900">{item.name}</h3>{item.requiresCardiologistReview && <span title="Cardiologist review required" className="shrink-0 text-amber-600"><ShieldAlert size={14} /></span>}</div><p className="mt-1 truncate text-[11px] text-slate-500">{item.category || item.type} · {audienceLabel(item.audiences)}</p></div><div className="flex items-center gap-2 sm:block sm:text-right"><StatusBadge status={item.status} /><p className="mt-1 text-[10px] font-medium text-slate-400">Version {item.contentVersion}</p></div><div className="flex items-center justify-between gap-3 sm:justify-end"><span className={`inline-flex items-center gap-1 text-[10px] font-bold ${flow.approval?.approved ? "text-emerald-700" : "text-slate-500"}`}>{flow.approval?.approved ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}{flow.approval?.approved ? "Approved" : `${flow.approval?.missing_approvals?.length || 0} approval${flow.approval?.missing_approvals?.length === 1 ? "" : "s"} due`}</span><ArrowRight size={15} className="text-slate-300" /></div></button>; })}</div> : <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center"><FileClock size={30} className="text-slate-300" /><h3 className="mt-3 text-[14px] font-bold text-slate-800">No {config.plural} in this view</h3><p className="mt-1 text-[12px] text-slate-500">Change the workflow filter or create a new draft.</p></div>}
          </section>
          <DetailPanel detail={detail} user={user} busy={busy} onEdit={() => { setEditorItem(detail.item); setEditorOpen(true); }} onPreview={() => setPreviewOpen(true)} onAction={action} />
        </div>
      </div>
      {editorOpen && <ContentEditorModal open type={type} item={editorItem} onClose={() => { setEditorOpen(false); setEditorItem(null); }} onSave={saveDraft} />}
      {reviewOpen && <ContentReviewModal open type={type} detail={detail} expertType={user?.expertType} onClose={() => setReviewOpen(false)} onSubmit={(payload) => action("submitReview", payload)} />}
      {previewOpen && <PatientPreviewModal open type={type} detail={detail} onClose={() => setPreviewOpen(false)} />}
    </AdminLayout>
  );
}
