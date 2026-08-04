import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  Lock,
  User,
  HeartPulse,
  Utensils,
  Activity,
  FileText,
  Save,
  Stethoscope,
  AlertTriangle,
} from "lucide-react";

const ExpertEvaluationModal = ({ isOpen, onClose, activeCase, onSave }) => {
  const [notes, setNotes] = useState("");
  const [expertCssScore, setExpertCssScore] = useState(50);
  const [recommendationFeedback, setRecommendationFeedback] = useState("");
  const [expandedRecipeId, setExpandedRecipeId] = useState(null);
  const [expandedExerciseId, setExpandedExerciseId] = useState(null);

  useEffect(() => {
    if (activeCase) {
      setNotes(activeCase.notes || "");
      setRecommendationFeedback(activeCase.recommendation_feedback || "");
      setExpertCssScore(activeCase.expert_css_score || activeCase.ml_predicted_css || 50);
      setExpandedRecipeId(null);
      setExpandedExerciseId(null);
    }
  }, [activeCase, isOpen]);

  if (!isOpen || !activeCase) return null;

  const handleSave = () => {
    if (onSave) {
      onSave({ expert_css_score: expertCssScore, notes, recommendation_feedback: recommendationFeedback });
    }
    onClose();
  };

  const getRiskBadgeColor = (category) => {
    if (category === "Critical") return "bg-red-50 text-red-600 border-red-100";
    if (category === "Warning") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-700 border-slate-100";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Panel - Centered */}
      <div className="relative w-full max-w-2xl bg-slate-50 max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100 shrink-0">
              <Stethoscope size={24} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2.5">
                Expert Evaluation Interface
                <span
                  className={`text-[9px] px-2.5 py-1 rounded-full border border-transparent tracking-widest uppercase ${getRiskBadgeColor(
                    activeCase.riskCategory
                  )}`}
                >
                  {activeCase.riskCategory}
                </span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 font-mono flex items-center gap-1.5">
                <Lock size={12} className="text-slate-400" /> {activeCase.case_id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          {/* Privacy Banner */}
          <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
            <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-emerald-800 uppercase tracking-[0.15em] mb-1">
                PRIVACY GUARDRAILS ACTIVE
              </p>
              <p className="text-[10px] text-emerald-700 leading-relaxed">
                All Personally Identifiable Information (PII) including names, contacts, and exact locations have been stripped. You are viewing strictly anonymized clinical and behavioral telemetry.
              </p>
            </div>
          </div>

          {/* Panel A (Patient Context) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <User size={13} /> Panel A: Patient Context
              </h4>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                    CORE DEMOGRAPHICS
                  </p>
                  <p className="text-xs font-semibold text-slate-900">
                    {activeCase.core?.age} yrs • {activeCase.core?.sex}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                    DIAGNOSED CONDITIONS
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeCase.clinical?.diagnosed_conditions?.length > 0 ? (
                      activeCase.clinical.diagnosed_conditions.map((cond, i) => (
                        <span key={i} className="text-[10px] font-medium text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm">
                          {cond}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500">None</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                   <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 border-b border-slate-100 pb-2">LIFESTYLE & DIETARY</p>
                   <div>
                     <p className="text-[9px] text-slate-400 uppercase mb-0.5">Smoking Status</p>
                     <p className="text-xs font-medium text-slate-800 capitalize">{activeCase.lifestyle?.smoking_status || "Unknown"}</p>
                   </div>
                   <div>
                     <p className="text-[9px] text-slate-400 uppercase mb-0.5">Avg Sleep</p>
                     <p className="text-xs font-medium text-slate-800">{activeCase.lifestyle?.avg_sleep_hours || "-"} hours</p>
                   </div>
                   <div>
                     <p className="text-[9px] text-slate-400 uppercase mb-0.5">Family History</p>
                     <p className="text-xs font-medium text-slate-800">{activeCase.lifestyle?.family_history ? "Yes" : "No"}</p>
                   </div>
                   <div>
                     <p className="text-[9px] text-slate-400 uppercase mb-0.5">Sodium Frequency</p>
                     <p className="text-xs font-medium text-slate-800 capitalize">{activeCase.dietary?.sodium_frequency || "Unknown"}</p>
                   </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                   <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 border-b border-slate-100 pb-2">CLINICAL METRICS</p>
                   <div>
                     <p className="text-[9px] text-slate-400 uppercase mb-0.5">Resting BP (mmHg)</p>
                     <p className="text-xs font-medium text-slate-800">{activeCase.clinical?.resting_bp_mmhg || "-"}</p>
                   </div>
                   <div>
                     <p className="text-[9px] text-slate-400 uppercase mb-0.5">Max HR (bpm)</p>
                     <p className="text-xs font-medium text-slate-800">{activeCase.clinical?.max_heart_rate_bpm || "-"}</p>
                   </div>
                   <div>
                     <p className="text-[9px] text-slate-400 uppercase mb-0.5">Chest Pain Type (0-3)</p>
                     <p className="text-xs font-medium text-slate-800">{activeCase.clinical?.chest_pain_type ?? "-"}</p>
                   </div>
                   <div>
                     <p className="text-[9px] text-slate-400 uppercase mb-0.5">Medication Active</p>
                     <p className="text-xs font-medium text-slate-800">{activeCase.clinical?.on_medication ? "Yes" : "No"}</p>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel B (Algorithmic Output) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-[10px] font-semibold text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                <Activity size={13} className="text-[#0f172a]" /> Panel B: Algorithmic Output
              </h4>
            </div>
            <div className="p-6 flex flex-col sm:flex-row gap-8 items-center">
              <div className="w-full sm:w-1/3 text-center sm:border-r border-slate-200 pr-0 sm:pr-4">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  ML-PREDICTED CSS
                </p>
                <p className="text-5xl font-bold text-slate-900 mb-2">
                  {activeCase.ml_predicted_css ?? "--"}
                </p>
              </div>
              <div className="w-full sm:w-2/3">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  SYSTEM ACTION TAKEN
                </p>
                <div className="text-xs font-medium text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                  User classified as {activeCase.ml_tier ? activeCase.ml_tier.toUpperCase() : "UNKNOWN"}. Wait for next model training to reflect your changes.
                </div>
              </div>
            </div>
          </div>

          {/* Panel C (System Prescriptions) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <HeartPulse size={13} className="text-rose-500" /> Panel C: System Prescriptions
              </h4>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-[10px] text-slate-500 mb-2">Based on the ML classification, the system recommends the following content. Please verify their appropriateness for this specific patient baseline.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Diet */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Utensils size={10} /> DIETARY PRESCRIPTIONS</p>
                  {activeCase?.recommendations?.recipes?.length > 0 ? (
                    <ul className="space-y-2">
                      {activeCase.recommendations.recipes.map((r) => (
                        <li key={r.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden transition-all">
                          <button 
                            className="w-full text-left px-3 py-2 text-xs font-medium text-slate-800 flex justify-between items-center hover:bg-slate-50 focus:outline-none"
                            onClick={() => setExpandedRecipeId(expandedRecipeId === r.id ? null : r.id)}
                          >
                            <span>{r.name}</span>
                            <span className="text-slate-400 font-normal text-[10px]">({r.sodium_mg}mg Sodium)</span>
                          </button>
                          {expandedRecipeId === r.id && (
                            <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/50">
                              <p className="text-[10px] text-slate-600 italic mb-2">{r.subtitle}</p>
                              
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-white p-1.5 rounded border border-slate-200"><p className="text-[8px] text-slate-400 uppercase">Calories</p><p className="text-[10px] font-semibold text-slate-700">{r.calories}</p></div>
                                <div className="bg-white p-1.5 rounded border border-slate-200"><p className="text-[8px] text-slate-400 uppercase">Sodium</p><p className="text-[10px] font-semibold text-slate-700">{r.sodium_mg}mg</p></div>
                                <div className="bg-white p-1.5 rounded border border-slate-200"><p className="text-[8px] text-slate-400 uppercase">Cholesterol</p><p className="text-[10px] font-semibold text-slate-700">{r.cholesterol_mg}mg</p></div>
                                <div className="bg-white p-1.5 rounded border border-slate-200"><p className="text-[8px] text-slate-400 uppercase">Sat. Fat</p><p className="text-[10px] font-semibold text-slate-700">{r.saturated_fat_g}g</p></div>
                              </div>
                              
                              <p className="text-[9px] font-semibold text-slate-500 uppercase mb-1">Heart Benefit</p>
                              <p className="text-[10px] text-slate-700 mb-3 leading-relaxed">{r.heart_benefit}</p>

                              <p className="text-[9px] font-semibold text-slate-500 uppercase mb-1">Key Ingredients</p>
                              <ul className="list-disc pl-3 text-[10px] text-slate-700 mb-3 space-y-0.5">
                                {r.ingredients?.map((ing, i) => (
                                  <li key={i}>{ing.amount} {ing.unit} {ing.name}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No dietary changes recommended.</p>
                  )}
                </div>

                {/* Exercise */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Activity size={10} /> PHYSICAL PRESCRIPTIONS</p>
                  {activeCase?.recommendations?.exercises?.length > 0 ? (
                    <ul className="space-y-2">
                      {activeCase.recommendations.exercises.map((e) => (
                        <li key={e.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden transition-all">
                          <button 
                            className="w-full text-left px-3 py-2 text-xs font-medium text-slate-800 flex justify-between items-center hover:bg-slate-50 focus:outline-none"
                            onClick={() => setExpandedExerciseId(expandedExerciseId === e.id ? null : e.id)}
                          >
                            <span>{e.name}</span>
                            <span className="text-slate-400 font-normal text-[10px]">({e.intensity} Intensity)</span>
                          </button>
                          {expandedExerciseId === e.id && (
                            <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/50">
                              <p className="text-[10px] text-slate-600 italic mb-2">{e.description}</p>
                              
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-white p-1.5 rounded border border-slate-200"><p className="text-[8px] text-slate-400 uppercase">Duration</p><p className="text-[10px] font-semibold text-slate-700">{e.duration_minutes} min</p></div>
                                <div className="bg-white p-1.5 rounded border border-slate-200"><p className="text-[8px] text-slate-400 uppercase">Type</p><p className="text-[10px] font-semibold text-slate-700">{e.type}</p></div>
                              </div>
                              
                              <p className="text-[9px] font-semibold text-slate-500 uppercase mb-1">Clinical Goal</p>
                              <p className="text-[10px] text-slate-700 mb-3 leading-relaxed">{e.goal}</p>

                              <p className="text-[9px] font-semibold text-slate-500 uppercase mb-1">Steps</p>
                              <ol className="list-decimal pl-3 text-[10px] text-slate-700 space-y-1">
                                {e.steps?.map((step, i) => (
                                  <li key={i}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No exercise recommended.</p>
                  )}
                </div>
              </div>

              {/* Recommendation Feedback */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Prescription Appropriateness <span className="text-slate-400 font-normal ml-1">(Optional)</span></span>
                </label>
                <textarea
                  rows="2"
                  value={recommendationFeedback}
                  onChange={(e) => setRecommendationFeedback(e.target.value)}
                  className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors resize-none leading-relaxed"
                  placeholder="e.g. The recommended chicken tinola has too much sodium for a patient with BP this high. Needs stricter low-sodium tier."
                />
              </div>
            </div>
          </div>

          {/* Panel D (Expert Calibration) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <FileText size={13} /> Panel D: Expert Calibration
              </h4>
              <span className="text-[8px] font-semibold text-slate-400 tracking-[0.2em] uppercase">
                UPDATES EXPERT_FEEDBACK TABLE
              </span>
            </div>
            <div className="p-5 space-y-6">
              {/* Expert CSS Score */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                  Expert Ground-Truth CSS Score <span className="text-[9px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase font-bold tracking-widest">Model Label</span>
                </label>
                <p className="text-[10px] text-slate-500 mb-4">
                  Based on the patient's baseline profile, what should their actual Clinical Stability Score (0-100) be?
                </p>
                <div className="flex items-center gap-4">
                   <input 
                      type="range" 
                      min="0" max="100" 
                      value={expertCssScore}
                      onChange={(e) => setExpertCssScore(parseInt(e.target.value))}
                      className="flex-1 accent-[#0f172a]"
                   />
                   <div className="w-16 h-11 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center font-bold text-[#0f172a]">
                      {expertCssScore}
                   </div>
                </div>
              </div>

              {/* Clinical Notes (Optional) */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Risk Interpretation Notes <span className="text-slate-400 font-normal ml-1">(Optional)</span></span>
                </label>
                <p className="text-[10px] text-slate-500 mb-3">
                  Document clinical reasoning or suggest rule-based threshold adjustments to refine the algorithm.
                </p>
                <textarea
                  rows="4"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors resize-none leading-relaxed"
                  placeholder="e.g. The CSS penalty for isolated dietary sodium without symptoms might be too aggressive..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 text-[11px] font-medium text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.99] shadow-sm shadow-slate-900/20"
            style={{ backgroundColor: "#0f172a" }}
          >
            <Save size={14} /> Submit Feedback to Calibrate
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpertEvaluationModal;
