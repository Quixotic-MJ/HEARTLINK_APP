import { useEffect, useState } from "react";
import { Stethoscope, RefreshCw, Shuffle, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AdminLayout from "../../../components/layouts/adminLayout";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";
import { useAuth } from "../../../contexts/AuthContext";
import { UI, FONTS, PageHeader } from "../../../styles/designSystem";
import { LANES, SECTION_LABELS, SECTION_EXPERT, PROGRESS, waitingText, mySection } from "./reviewUi";

// HL-054 / HL-055: the case review queue. Urgent first, then re-reviews, then the weekly sample.
const Cases = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [urgentHours, setUrgentHours] = useState(48);
  const [loading, setLoading] = useState(true);
  const [lane, setLane] = useState("all");
  const [busy, setBusy] = useState(null);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const section = mySection(user);

  const fetchQueue = () => apiFetch("/api/admin/review-queue", { bypassCache: true });
  const applyQueue = (data) => {
    setItems(data?.items || []);
    setUrgentHours(data?.urgent_review_hours || 48);
  };
  const load = () => fetchQueue().then(applyQueue).catch(() => toast.error("Couldn't load the review queue."));

  useEffect(() => {
    let alive = true;
    fetchQueue()
      .then((data) => alive && applyQueue(data))
      .catch(() => toast.error("Couldn't load the review queue."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const refresh = async () => {
    setBusy("refresh");
    try {
      const res = await apiFetch("/api/admin/review-queue/refresh", { method: "POST" });
      toast.success(res.opened || res.upgraded ? `Queue updated: ${res.opened} new, ${res.upgraded} moved to urgent.` : "Queue is up to date.");
      await load();
    } catch {
      toast.error("Couldn't refresh the queue.");
    } finally {
      setBusy(null);
    }
  };

  const drawSample = async () => {
    setBusy("sample");
    try {
      const res = await apiFetch("/api/admin/review-queue/sample", { method: "POST" });
      toast.success(res.opened ? `Added ${res.opened} cases to the sample lane.` : "No patients are due for sampling right now.");
      await load();
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't draw the sample.");
    } finally {
      setBusy(null);
    }
  };

  const counts = {
    all: items.length,
    urgent: items.filter((i) => i.lane === "urgent").length,
    rereview: items.filter((i) => i.lane === "rereview").length,
    sample: items.filter((i) => i.lane === "sample").length,
  };
  const shown = lane === "all" ? items : items.filter((i) => i.lane === lane);

  const yourPart = section
    ? `Your part: the ${SECTION_LABELS[section]} section of each case.`
    : isAdmin
      ? "You can follow progress and draw the weekly sample. Reviewing is for medical experts."
      : "Your account has no expert type yet, so you can view cases but not review them.";

  return (
    <AdminLayout>
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        <PageHeader
          eyebrow="Clinical portal"
          eyebrowIcon={Stethoscope}
          title="Case review"
          description="Urgent cases first, then re-reviews, then the weekly sample. Names, phone numbers and emails are hidden."
          actions={
            <>
              <button type="button" onClick={refresh} disabled={busy !== null} className={UI.button.secondary}>
                <RefreshCw size={14} className={busy === "refresh" ? "animate-spin" : ""} />
                <span>Check for new cases</span>
              </button>
              {isAdmin && (
                <button type="button" onClick={drawSample} disabled={busy !== null} className={UI.button.primary}>
                  <Shuffle size={14} />
                  <span>Draw this week's sample</span>
                </button>
              )}
            </>
          }
        />

        <p className="text-[13px] font-semibold text-ds-ink -mt-3 mb-4">{yourPart}</p>

        <div className={UI.card.root}>
          <div className={UI.card.header}>
            <div role="group" aria-label="Filter by lane" className="flex flex-wrap gap-2">
              {[["all", "All"], ["urgent", "Urgent"], ["rereview", "Re-review"], ["sample", "Sample"]].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={lane === key}
                  onClick={() => setLane(key)}
                  className={`min-h-[36px] px-3.5 rounded-full text-[12.5px] font-semibold border transition-colors cursor-pointer ${
                    lane === key ? "bg-ds-ink text-white border-ds-ink" : "bg-ds-canvas text-ds-ink border-ds-hairline hover:border-ds-steel"
                  }`}
                >
                  {label} ({counts[key]})
                </button>
              ))}
            </div>
            <span className="text-[12px] text-ds-slate">Urgent cases should be reviewed within {urgentHours} hours.</span>
          </div>

          <div className={UI.table.container}>
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead className={UI.table.thead}>
                <tr>
                  <th scope="col" className={UI.table.th}>Case</th>
                  <th scope="col" className={UI.table.th}>Why it is here</th>
                  <th scope="col" className={UI.table.th}>Waiting</th>
                  {Object.keys(SECTION_LABELS).map((s) => (
                    <th key={s} scope="col" className={UI.table.th}>{SECTION_LABELS[s]}</th>
                  ))}
                  <th scope="col" className={UI.table.th}><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody className={UI.table.tbody}>
                {loading ? (
                  [0, 1, 2].map((n) => (
                    <tr key={n}>
                      <td colSpan={7} className={UI.table.td}><Skeleton className="h-8 w-full" /></td>
                    </tr>
                  ))
                ) : shown.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-5 text-center text-[13px] text-ds-slate">
                      {items.length === 0
                        ? "No open cases. Urgent cases appear on their own; admins can draw the weekly sample."
                        : "No cases in this lane."}
                    </td>
                  </tr>
                ) : (
                  shown.map((c) => {
                    const mine = section && c.sections[section] === "waiting";
                    const pendingChecks = ["nutrition", "exercise"].filter((s) => c.sections[s] === "waiting").map((s) => SECTION_LABELS[s].toLowerCase());
                    return (
                      <tr key={c.id} className={UI.table.tr}>
                        <td className={UI.table.td}>
                          <div className="text-[13px] font-semibold text-ds-ink">{c.case_code}</div>
                          <div className="text-[12px] text-ds-slate">
                            {[c.age != null ? `${c.age}` : null, c.sex ? c.sex.charAt(0).toUpperCase() + c.sex.slice(1) : null].filter(Boolean).join(" · ") || "Age not given"}
                          </div>
                        </td>
                        <td className={UI.table.td}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${LANES[c.lane]?.className || ""}`}>
                              {LANES[c.lane]?.label || c.lane}
                            </span>
                            {c.overdue && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-ds-danger text-white border-ds-danger">
                                <AlertTriangle size={11} aria-hidden="true" /> Overdue
                              </span>
                            )}
                          </div>
                          <div className="text-[12.5px] text-ds-charcoal mt-1">{c.reason}</div>
                          {c.status === "complete" && (
                            <div className="text-[12px] font-semibold text-ds-charcoal mt-1">
                              Cardiology done · waiting for {pendingChecks.join(" and ")}
                            </div>
                          )}
                        </td>
                        <td className={`${UI.table.td} text-[12.5px] text-ds-charcoal whitespace-nowrap`}>{waitingText(c.waiting_hours)}</td>
                        {Object.keys(SECTION_LABELS).map((s) => (
                          <td key={s} className={UI.table.td}>
                            <span className={`text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${PROGRESS[c.sections[s]]?.className || ""}`}>
                              {PROGRESS[c.sections[s]]?.label || c.sections[s]}
                            </span>
                          </td>
                        ))}
                        <td className={UI.table.td}>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => navigate(`/cases/${c.id}`)}
                              className={mine ? UI.button.primary : UI.button.secondary}
                              aria-label={`${mine ? "Review" : "Open"} ${c.case_code}`}
                            >
                              {mine ? "Review" : "Open"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[12px] text-ds-slate mt-3">
          A case counts for Model Check as soon as the {SECTION_EXPERT.cardiology} submits, and stays in this queue until the food and exercise checks are done too.
        </p>
      </div>
    </AdminLayout>
  );
};

export default Cases;
