import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  Lock,
  User,
  Activity,
  FileText,
  Save,
  Stethoscope,
  Clock,
  ChevronDown,
  Utensils,
} from "lucide-react";

const ExpertEvaluationModal = ({ isOpen, onClose, activeCase, onSave }) => {
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState("");
  const [expertHssScore, setExpertHssScore] = useState(80);
  const [recommendationFeedback, setRecommendationFeedback] = useState("");
  const [adjustmentReasons, setAdjustmentReasons] = useState([]);
  const [reviewerConfidence, setReviewerConfidence] = useState("medium");
  const [exerciseFeedbackStatus, setExerciseFeedbackStatus] = useState(null);
  const [exerciseFeedbackNotes, setExerciseFeedbackNotes] = useState("");
  const [recipeFeedbackStatus, setRecipeFeedbackStatus] = useState(null);
  const [recipeFeedbackNotes, setRecipeFeedbackNotes] = useState("");

  const [expandedRecipeId, setExpandedRecipeId] = useState(null);
  const [expandedExerciseId, setExpandedExerciseId] = useState(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  useEffect(() => {
    if (activeCase) {
      setNotes(activeCase.notes || "");
      setNotesError("");
      setRecommendationFeedback(activeCase.recommendation_feedback || "");
      setExpertHssScore(activeCase.expert_hss_score || activeCase.ml_predicted_hss || 80);
      setExpandedRecipeId(null);
      setExpandedExerciseId(null);
      setIsTimelineOpen(false);
      
      setAdjustmentReasons(activeCase.adjustment_reasons || []);
      setReviewerConfidence(activeCase.reviewer_confidence || "medium");
      setExerciseFeedbackStatus(activeCase.exercise_feedback?.status || null);
      setExerciseFeedbackNotes(activeCase.exercise_feedback?.notes || "");
      setRecipeFeedbackStatus(activeCase.recipe_feedback?.status || null);
      setRecipeFeedbackNotes(activeCase.recipe_feedback?.notes || "");
    }
  }, [activeCase, isOpen]);

  if (!isOpen || !activeCase) return null;

  const validateNotes = (text) => {
    if (!text || !text.trim()) {
      return "Risk interpretation notes are required and cannot be empty.";
    }
    if (text.trim().length < 10) {
      return "Risk interpretation notes must be at least 10 characters long.";
    }
    return "";
  };

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    setNotesError(validateNotes(val));
  };

  const handleAdjustmentReasonToggle = (code) => {
    if (code === "model_consistent") {
      if (adjustmentReasons.includes("model_consistent")) {
        setAdjustmentReasons([]);
      } else {
        setAdjustmentReasons(["model_consistent"]);
      }
    } else {
      let updated = adjustmentReasons.filter(r => r !== "model_consistent");
      if (updated.includes(code)) {
        updated = updated.filter(r => r !== code);
      } else {
        updated.push(code);
      }
      setAdjustmentReasons(updated);
    }
  };

  const handleSave = () => {
    const err = validateNotes(notes);
    if (err) {
      setNotesError(err);
      return;
    }
    if (onSave) {
      onSave({
        expert_hss_score: expertHssScore,
        notes: notes.trim(),
        recommendation_feedback: recommendationFeedback,
        adjustment_reasons: adjustmentReasons,
        reviewer_confidence: reviewerConfidence,
        exercise_feedback: {
          status: exerciseFeedbackStatus,
          notes: exerciseFeedbackNotes
        },
        recipe_feedback: {
          status: recipeFeedbackStatus,
          notes: recipeFeedbackNotes
        }
      });
    }
    onClose();
  };

  // Derive Expert Tier from Numeric Score
  const getDerivedTier = (score) => {
    if (score >= 80) return "Stable";
    if (score >= 60) return "Moderate";
    if (score >= 50) return "Elevated Risk";
    return "Critical";
  };

  const derivedExpertTier = getDerivedTier(expertHssScore);

  // Compute Timeline Aggregates
  const vitalsLogs = activeCase.timeline?.filter(t => t.type === "Vitals") || [];
  const symptomsLogs = activeCase.timeline?.filter(t => t.type === "Symptoms") || [];
  const exerciseLogs = activeCase.timeline?.filter(t => t.type === "Exercise") || [];
  const mealLogs = activeCase.timeline?.filter(t => t.type === "Meal") || [];
  const sleepLogs = activeCase.timeline?.filter(t => t.type === "Sleep") || [];

  const latestVitals = vitalsLogs[0]?.data || {};
  const recentBPText = latestVitals.systolic ? `${latestVitals.systolic}/${latestVitals.diastolic} mmHg` : null;
  const recentHRText = latestVitals.heart_rate ? `${latestVitals.heart_rate} bpm` : null;

  // Average values
  const avgSystolic = vitalsLogs.length > 0 
    ? Math.round(vitalsLogs.reduce((acc, v) => acc + (v.data.systolic || 120), 0) / vitalsLogs.length)
    : null;
  const avgDiastolic = vitalsLogs.length > 0 
    ? Math.round(vitalsLogs.reduce((acc, v) => acc + (v.data.diastolic || 80), 0) / vitalsLogs.length)
    : null;
  const avgHR = vitalsLogs.length > 0 
    ? Math.round(vitalsLogs.reduce((acc, v) => acc + (v.data.heart_rate || 72), 0) / vitalsLogs.length)
    : null;

  const totalSymptomsCount = symptomsLogs.length;
  
  // Render Simple Trend Charts
  const renderSimpleTrend = (readings, type) => {
    let values = [];
    if (type === "bp") {
      values = readings.map((r) => r.data.systolic).filter((v) => v !== undefined && v !== null);
    } else if (type === "hr") {
      values = readings.map((r) => r.data.heart_rate).filter((v) => v !== undefined && v !== null);
    }

    if (values.length < 2) {
      return <span className="text-[11px] text-[#8B9893] italic">Not enough recent telemetry readings.</span>;
    }

    values = [...values].reverse();

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = maxVal - minVal || 10;
    
    const width = 140;
    const height = 20;
    const padding = 2;
    
    const points = values.map((val, i) => {
      const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - minVal) / valRange) * (height - 2 * padding);
      return { x, y };
    });
    
    const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    
    return (
      <div className="flex items-center gap-3">
        <svg width={width} height={height} className="overflow-visible">
          <path d={pathData} fill="none" stroke="#5C6B66" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={i === points.length - 1 ? "#E8532E" : "#8B9893"} />
          ))}
        </svg>
        <span className="text-[11px] font-semibold text-[#152131]">
          Latest: {values[values.length - 1]}
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Panel */}
      <div className="relative w-full max-w-3xl bg-[#FFFFFF] max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden border border-[#DCE3DF] text-[#152131]">
        
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE3DF] bg-[#FFFFFF] shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[8px] bg-[#FBEAE6] border border-[#DCE3DF] text-[#E8532E] flex items-center justify-center shrink-0">
              <Stethoscope size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-[#5C6B66] font-mono flex items-center gap-1">
                  <Lock size={11} className="text-[#E8532E]" /> {activeCase.case_id}
                </span>
                <span className={`text-[9.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  activeCase.expert_hss_score !== null 
                    ? "bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8]" 
                    : "bg-[#FBEAE6] text-[#E8532E] border border-[#F5C7BD]"
                }`}>
                  {activeCase.expert_hss_score !== null ? "Evaluated" : "Pending Review"}
                </span>
              </div>
              <h3 
                className="text-[18px] font-medium text-[#152131] tracking-tight mt-0.5"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Expert Calibration Workspace
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#5C6B66] hover:text-[#152131] p-1.5 rounded-lg hover:bg-[#EDF1EF] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Evidence Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          
          {/* Privacy Guardrails Banner */}
          <div className="bg-[#E3EFEC] border border-[#C5DFD8] px-4 py-3 rounded-[8px] flex items-start gap-2.5 shrink-0">
            <ShieldCheck size={16} className="text-[#1B6E63] shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-[#1B6E63] leading-relaxed font-medium">
              Anonymization active. Personally Identifiable Information (PII) has been stripped. Renders strictly behavioral and telemetry vectors.
            </p>
          </div>

          {/* A. CASE SUMMARY */}
          <div className="bg-[#EDF1EF]/50 rounded-[10px] border border-[#DCE3DF] p-4.5 space-y-3">
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 flex items-center gap-1.5">
              <User size={12} className="text-[#E8532E]" /> A. Case demographics &amp; profile
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[12.5px] font-medium">
              <div>
                <p className="text-[10px] text-[#8B9893] uppercase font-semibold tracking-wider">Age</p>
                <p className="text-[#152131] font-semibold mt-0.5">{activeCase.core?.age} years</p>
              </div>
              <div>
                <p className="text-[10px] text-[#8B9893] uppercase font-semibold tracking-wider">Sex</p>
                <p className="text-[#152131] font-semibold capitalize mt-0.5">{activeCase.core?.sex}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#8B9893] uppercase font-semibold tracking-wider">Reported conditions</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {activeCase.clinical?.diagnosed_conditions?.length > 0 ? (
                    activeCase.clinical.diagnosed_conditions.map((cond, i) => (
                      <span key={i} className="text-[10px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] px-2 py-0.5 rounded-full">
                        {cond}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#8B9893] italic">None</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-[#8B9893] uppercase font-semibold tracking-wider">Smoking status</p>
                <p className="text-[#152131] font-semibold capitalize mt-0.5">{activeCase.onboarding?.smoke_now || "Never"}</p>
              </div>
            </div>
          </div>

          {/* B. CARDIOVASCULAR SNAPSHOT */}
          <div className="bg-[#EDF1EF]/50 rounded-[10px] border border-[#DCE3DF] p-4.5 space-y-3">
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 flex items-center gap-1.5">
              <Activity size={12} className="text-[#E8532E]" /> B. Cardiovascular baseline vitals
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12.5px]">
              <div className="bg-[#FFFFFF] p-3 rounded-[8px] border border-[#DCE3DF]">
                <p className="text-[10px] text-[#8B9893] uppercase font-semibold tracking-wider">Resting Blood Pressure</p>
                <p className="text-[#152131] font-bold mt-1 text-[13.5px]">{recentBPText || activeCase.clinical?.resting_bp_mmhg || "--"}</p>
              </div>
              <div className="bg-[#FFFFFF] p-3 rounded-[8px] border border-[#DCE3DF]">
                <p className="text-[10px] text-[#8B9893] uppercase font-semibold tracking-wider">Resting Heart Rate</p>
                <p className="text-[#152131] font-bold mt-1 text-[13.5px]">{recentHRText || `${activeCase.clinical?.max_heart_rate_bpm} bpm` || "--"}</p>
              </div>
              <div className="bg-[#FFFFFF] p-3 rounded-[8px] border border-[#DCE3DF]">
                <p className="text-[10px] text-[#8B9893] uppercase font-semibold tracking-wider">Medication Status</p>
                <p className="text-[#152131] font-semibold mt-1">{activeCase.clinical?.on_medication ? "Active Meds Logged" : "No Medication Logged"}</p>
              </div>
              <div className="bg-[#FFFFFF] p-3 rounded-[8px] border border-[#DCE3DF]">
                <p className="text-[10px] text-[#8B9893] uppercase font-semibold tracking-wider">Recent Symptoms</p>
                <p className="text-[#152131] font-bold mt-1 text-[13.5px]">{totalSymptomsCount} logged events</p>
              </div>
            </div>
          </div>

          {/* C. LONGITUDINAL TELEMETRY */}
          <div className="bg-[#EDF1EF]/50 rounded-[10px] border border-[#DCE3DF] p-4.5 space-y-4">
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 flex items-center gap-1.5">
              <Clock size={12} className="text-[#E8532E]" /> C. 30-Day longitudinal vitals &amp; telemetry
            </h4>

            {/* Compact Trends Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-[#FFFFFF] p-3 rounded-[8px] border border-[#DCE3DF] space-y-2">
                <p className="text-[10px] text-[#8B9893] uppercase font-semibold tracking-wider">Blood Pressure Trend (30 days)</p>
                {renderSimpleTrend(vitalsLogs, "bp")}
                {avgSystolic && (
                  <p className="text-[11px] text-[#5C6B66] font-medium">Average BP: {avgSystolic}/{avgDiastolic} mmHg</p>
                )}
              </div>
              <div className="bg-[#FFFFFF] p-3 rounded-[8px] border border-[#DCE3DF] space-y-2">
                <p className="text-[10px] text-[#8B9893] uppercase font-semibold tracking-wider">Heart Rate Trend (30 days)</p>
                {renderSimpleTrend(vitalsLogs, "hr")}
                {avgHR && (
                  <p className="text-[11px] text-[#5C6B66] font-medium">Average HR: {avgHR} bpm</p>
                )}
              </div>
            </div>

            {/* Other parameters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-[#DCE3DF] text-[12px]">
              <div>
                <p className="text-[10px] text-[#8B9893] uppercase font-semibold tracking-wider">Avg Sleep Hours</p>
                <p className="text-[#152131] font-semibold mt-0.5">
                  {sleepLogs.length > 0 
                    ? (sleepLogs.reduce((acc, s) => acc + (s.data.duration_hours || 7), 0) / sleepLogs.length).toFixed(1)
                    : activeCase.onboarding?.sleep_hours || "7.0"} hrs
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#8B9893] uppercase font-semibold tracking-wider">Avg Sodium Level</p>
                <p className="text-[#152131] font-semibold mt-0.5 capitalize">{activeCase.onboarding?.salty_food_freq || "Sometimes"}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#8B9893] uppercase font-semibold tracking-wider">Exercise Sessions</p>
                <p className="text-[#152131] font-semibold mt-0.5">{exerciseLogs.length} routines logged</p>
              </div>
              <div>
                <p className="text-[10px] text-[#8B9893] uppercase font-semibold tracking-wider">Total Logged Meals</p>
                <p className="text-[#152131] font-semibold mt-0.5">{mealLogs.length} entries</p>
              </div>
            </div>

            {/* Collapsible 30-Day Timeline Logs */}
            <div className="pt-2 border-t border-[#DCE3DF]">
              <button 
                onClick={() => setIsTimelineOpen(!isTimelineOpen)}
                className="flex items-center gap-1.5 text-[12px] text-[#E8532E] hover:text-[#C13E20] transition-colors font-semibold uppercase tracking-wider focus:outline-none cursor-pointer"
              >
                <ChevronDown size={14} className={`transform transition-transform ${isTimelineOpen ? "rotate-180" : ""}`} />
                {isTimelineOpen ? "Hide 30-day timeline feed" : "View detailed 30-day timeline feed"}
              </button>
              
              {isTimelineOpen && (
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto border border-[#DCE3DF] rounded-[8px] p-3 bg-[#FFFFFF]">
                  {activeCase.timeline && activeCase.timeline.length > 0 ? (
                    activeCase.timeline.map((item, index) => (
                      <div key={index} className="flex justify-between items-start border-b border-[#DCE3DF]/60 pb-2 last:border-0 last:pb-0 text-[12px]">
                        <div>
                          <span className="font-semibold text-[#152131] uppercase text-[9px] tracking-wider bg-[#EDF1EF] border border-[#DCE3DF] px-1.5 py-0.5 rounded">
                            {item.type}
                          </span>
                          <p className="text-[#5C6B66] mt-1 font-medium text-[11px]">
                            {item.type === "Vitals" && `BP ${item.data.systolic}/${item.data.diastolic} mmHg, HR ${item.data.heart_rate} bpm`}
                            {item.type === "Symptoms" && `Symptoms: ${item.data.symptoms?.join(", ")} (${item.data.context})`}
                            {item.type === "Meal" && `Meal: ${item.data.meal_name} (${item.data.calories} kcal, ${item.data.sodium_mg}mg Sodium)`}
                            {item.type === "Exercise" && `Exercise: ${item.data.routine_name} (${item.data.duration_minutes} min, ${item.data.status})`}
                            {item.type === "Sleep" && `Sleep: ${item.data.duration_hours} hrs (${item.data.quality})`}
                          </p>
                        </div>
                        <span className="text-[10px] text-[#8B9893] font-mono">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-[#8B9893] italic">No historical logs available.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* D. MODEL OUTPUT */}
          <div className="bg-[#EDF1EF]/50 rounded-[10px] border border-[#DCE3DF] p-4.5 space-y-4">
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 flex items-center gap-1.5">
              <FileText size={12} className="text-[#E8532E]" /> D. HeartLink ML model assessment
            </h4>
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <div className="w-full sm:w-1/3 text-center sm:border-r border-[#DCE3DF] pr-0 sm:pr-4">
                <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">
                  ML-Predicted HSS Score
                </p>
                <p 
                  className="text-4xl font-bold text-[#152131]"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {activeCase.ml_predicted_hss ?? "--"}
                </p>
                <span className="inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FFFFFF] text-[#E8532E] uppercase tracking-wider mt-1.5 border border-[#DCE3DF]">
                  {activeCase.ml_tier || "UNKNOWN"}
                </span>
              </div>
              <div className="w-full sm:w-2/3 space-y-2.5">
                <div>
                  <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-0.5">
                    Model Retraining Status
                  </p>
                  <p className="text-[11.5px] font-medium text-[#5C6B66] leading-relaxed bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] p-3">
                    Model retraining is performed offline. Submitted evaluations are archived as ground-truth calibration weights reference logs.
                  </p>
                </div>

                {activeCase.expert_hss_score !== null && (
                  <div className="pt-2 border-t border-[#DCE3DF] grid grid-cols-3 gap-2 text-[12px]">
                    <div>
                      <span className="text-[9px] text-[#8B9893] font-semibold uppercase">MODEL PREDICTED</span>
                      <p className="font-semibold text-[#152131]">{activeCase.ml_predicted_hss} ({activeCase.ml_tier})</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#8B9893] font-semibold uppercase">EXPERT CALIBRATED</span>
                      <p className="font-semibold text-[#1B6E63]">{activeCase.expert_hss_score} ({getDerivedTier(activeCase.expert_hss_score)})</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#8B9893] font-semibold uppercase">HSS DIFFERENCE</span>
                      <p className="font-bold text-[#152131]">Δ {Math.abs(activeCase.expert_hss_score - (activeCase.ml_predicted_hss || 0))} pts</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* E. EXPERT EVALUATION */}
          <div className="bg-[#EDF1EF]/50 rounded-[10px] border border-[#DCE3DF] p-4.5 space-y-4">
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 flex items-center gap-1.5">
              <Stethoscope size={12} className="text-[#E8532E]" /> E. Expert stability calibration
            </h4>

            {/* Slider Inputs */}
            <div>
              <label className="block text-[12.5px] font-semibold text-[#152131] mb-1 flex items-center gap-2">
                Expert Ground-Truth HSS Score
                <span className="text-[10px] text-[#E8532E] bg-[#FBEAE6] border border-[#DCE3DF] px-2 py-0.5 rounded-full font-bold tracking-wider">
                  {derivedExpertTier.toUpperCase()}
                </span>
              </label>
              <p className="text-[11px] text-[#5C6B66] mb-3 font-medium">
                Define the user's expert ground-truth HSS score (0-100) based on vital trends and clinical history.
              </p>
              
              <div className="flex items-center gap-4">
                 <input 
                    type="range" 
                    min="0" max="100" 
                    value={expertHssScore}
                    onChange={(e) => setExpertHssScore(parseInt(e.target.value))}
                    className="flex-1 accent-[#E8532E] cursor-pointer"
                 />
                 <div 
                   className="w-14 h-10 bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] flex items-center justify-center font-bold text-[#152131] text-[16px] shrink-0"
                   style={{ fontFamily: "'Fraunces', serif" }}
                 >
                    {expertHssScore}
                 </div>
              </div>
              
              <div className="grid grid-cols-4 text-center text-[9.5px] font-semibold uppercase pt-2.5 tracking-wider border-t border-[#DCE3DF] mt-3 text-[#8B9893]">
                <div className={expertHssScore < 50 ? "text-[#A93226] font-bold" : ""}>Critical (&lt;50)</div>
                <div className={expertHssScore >= 50 && expertHssScore < 60 ? "text-[#E8532E] font-bold" : ""}>Elevated Risk (50-59)</div>
                <div className={expertHssScore >= 60 && expertHssScore < 80 ? "text-[#A9741B] font-bold" : ""}>Moderate (60-79)</div>
                <div className={expertHssScore >= 80 ? "text-[#1B6E63] font-bold" : ""}>Stable (80-100)</div>
              </div>
            </div>

            {/* Reasons checkbox list */}
            <div className="pt-3 border-t border-[#DCE3DF] space-y-2.5">
              <label className="block text-[12.5px] font-semibold text-[#152131]">
                Why does your assessment differ from the model?
              </label>
              
              <div className="flex items-center gap-2.5 bg-[#FFFFFF] p-3 rounded-[8px] border border-[#DCE3DF]">
                <input
                  type="checkbox"
                  id="reason_model_consistent"
                  checked={adjustmentReasons.includes("model_consistent")}
                  onChange={() => handleAdjustmentReasonToggle("model_consistent")}
                  className="rounded text-[#E8532E] focus:ring-[#E8532E] h-4 w-4 bg-[#EDF1EF] border-[#DCE3DF] cursor-pointer"
                />
                <label htmlFor="reason_model_consistent" className="text-[12px] font-semibold text-[#152131] cursor-pointer">
                  Model assessment appears consistent with clinical observation
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1 pt-1">
                {[
                  { code: "blood_pressure_pattern", label: "Blood pressure pattern" },
                  { code: "heart_rate_pattern", label: "Heart-rate pattern" },
                  { code: "symptoms", label: "Symptoms" },
                  { code: "medication_related_factor", label: "Medication-related factor" },
                  { code: "activity_pattern", label: "Activity pattern" },
                  { code: "nutrition_sodium_pattern", label: "Nutrition / sodium pattern" },
                  { code: "sleep_pattern", label: "Sleep pattern" },
                  { code: "baseline_information", label: "Baseline information" },
                  { code: "other", label: "Other" },
                ].map((opt) => {
                  const isConsistent = adjustmentReasons.includes("model_consistent");
                  const isChecked = adjustmentReasons.includes(opt.code);
                  return (
                    <div key={opt.code} className={`flex items-center gap-2 ${isConsistent ? "opacity-30" : ""}`}>
                      <input
                        type="checkbox"
                        id={`reason_${opt.code}`}
                        checked={isChecked}
                        disabled={isConsistent}
                        onChange={() => handleAdjustmentReasonToggle(opt.code)}
                        className="rounded text-[#E8532E] focus:ring-[#E8532E] h-3.5 w-3.5 bg-[#EDF1EF] border-[#DCE3DF] cursor-pointer"
                      />
                      <label htmlFor={`reason_${opt.code}`} className="text-[11.5px] text-[#5C6B66] cursor-pointer font-medium">
                        {opt.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reviewer Confidence */}
            <div className="pt-3 border-t border-[#DCE3DF]">
              <label className="block text-[12.5px] font-semibold text-[#152131] mb-2">
                Reviewer confidence level
              </label>
              <div className="flex gap-4">
                {["low", "medium", "high"].map((level) => (
                  <label key={level} className="flex items-center gap-1.5 text-[12px] text-[#5C6B66] cursor-pointer capitalize font-semibold">
                    <input
                      type="radio"
                      name="reviewer_confidence"
                      value={level}
                      checked={reviewerConfidence === level}
                      onChange={(e) => setReviewerConfidence(e.target.value)}
                      className="text-[#E8532E] focus:ring-[#E8532E] h-3.5 w-3.5 bg-[#EDF1EF] border-[#DCE3DF] cursor-pointer"
                    />
                    {level}
                  </label>
                ))}
              </div>
            </div>

            {/* Reasoning text area */}
            <div className="pt-3 border-t border-[#DCE3DF]">
              <label className="block text-[12.5px] font-semibold text-[#152131] mb-1 flex items-center justify-between">
                <span>Risk Interpretation Notes <span className="text-[#E8532E] font-bold">*</span></span>
              </label>
              <p className="text-[11px] text-[#5C6B66] mb-2 font-medium">
                Explain the cardiovascular evidence behind your HSS assessment (minimum 10 characters).
              </p>
              <textarea
                rows="3"
                value={notes}
                onChange={handleNotesChange}
                className={`w-full px-3 py-2 text-[12.5px] bg-[#FFFFFF] border ${
                  notesError ? "border-[#A93226] focus:border-[#A93226]" : "border-[#DCE3DF] focus:border-[#152131]"
                } rounded-[8px] focus:outline-none text-[#152131] placeholder:text-[#8B9893] transition-colors resize-none leading-relaxed`}
                placeholder="Describe vitals spikes, symptoms frequency, sodium intake discrepancies…"
              />
              {notesError && (
                <span className="text-[11px] font-medium text-[#A93226] block mt-1 leading-normal">
                  {notesError}
                </span>
              )}
            </div>
          </div>

          {/* F. RECOMMENDATION REVIEW */}
          <div className="bg-[#EDF1EF]/50 rounded-[10px] border border-[#DCE3DF] p-4.5 space-y-4">
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 flex items-center gap-1.5">
              <Utensils size={12} className="text-[#E8532E]" /> F. Recommendation review &amp; prescription feedback
            </h4>
            <p className="text-[11px] text-[#5C6B66] font-medium">Review the recommended content generated by the ML pipeline for this user.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
              {/* Recipes */}
              <div className="bg-[#FFFFFF] p-3 rounded-[8px] border border-[#DCE3DF] flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Utensils size={11} className="text-[#E8532E]" /> Dietary Recommendations
                  </p>
                  {activeCase?.recommendations?.recipes?.length > 0 ? (
                    <ul className="space-y-1.5 mb-2.5">
                      {activeCase.recommendations.recipes.map((r) => (
                        <li key={r.id} className="bg-[#EDF1EF] rounded-[6px] border border-[#DCE3DF] overflow-hidden">
                          <button 
                            className="w-full text-left px-2.5 py-1.5 text-[11.5px] font-semibold text-[#152131] flex justify-between items-center hover:bg-[#DCE3DF] focus:outline-none cursor-pointer"
                            onClick={() => setExpandedRecipeId(expandedRecipeId === r.id ? null : r.id)}
                          >
                            <span>{r.name}</span>
                            <span className="text-[#5C6B66] font-normal text-[10px]">({r.sodium_mg}mg Sod)</span>
                          </button>
                          {expandedRecipeId === r.id && (
                            <div className="px-2.5 pb-2 pt-1 border-t border-[#DCE3DF] bg-[#FFFFFF] text-[11px] text-[#5C6B66] leading-relaxed">
                              <p className="italic text-[#8B9893]">{r.subtitle}</p>
                              <p className="mt-1 font-bold text-[10px] text-[#E8532E] uppercase">Heart Benefit:</p>
                              <p>{r.heart_benefit}</p>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-[#8B9893] italic mb-2.5">None recommended.</p>
                  )}
                </div>

                {/* Structured Recipe Feedback */}
                <div className="pt-2 border-t border-[#DCE3DF] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[#8B9893] uppercase">Appropriateness:</span>
                    <div className="flex gap-1">
                      {["appropriate", "needs_review"].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setRecipeFeedbackStatus(recipeFeedbackStatus === status ? null : status)}
                          className={`text-[10px] px-2 py-0.5 rounded-[5px] font-semibold uppercase border transition-colors cursor-pointer ${
                            recipeFeedbackStatus === status
                              ? "bg-[#E8532E] text-white border-[#E8532E]"
                              : "bg-[#EDF1EF] text-[#5C6B66] border-[#DCE3DF] hover:text-[#152131]"
                          }`}
                        >
                          {status === "appropriate" ? "Appropriate" : "Needs Review"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows="1"
                    value={recipeFeedbackNotes}
                    onChange={(e) => setRecipeFeedbackNotes(e.target.value)}
                    placeholder="Recipe suitability notes (optional)…"
                    className="w-full px-2.5 py-1 text-[11px] bg-[#EDF1EF] border border-[#DCE3DF] rounded-[6px] text-[#152131] placeholder:text-[#8B9893] focus:outline-none focus:border-[#152131] resize-none"
                  />
                </div>
              </div>

              {/* Exercises */}
              <div className="bg-[#FFFFFF] p-3 rounded-[8px] border border-[#DCE3DF] flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Activity size={11} className="text-[#E8532E]" /> Physical Recommendations
                  </p>
                  {activeCase?.recommendations?.exercises?.length > 0 ? (
                    <ul className="space-y-1.5 mb-2.5">
                      {activeCase.recommendations.exercises.map((e) => (
                        <li key={e.id} className="bg-[#EDF1EF] rounded-[6px] border border-[#DCE3DF] overflow-hidden">
                          <button 
                            className="w-full text-left px-2.5 py-1.5 text-[11.5px] font-semibold text-[#152131] flex justify-between items-center hover:bg-[#DCE3DF] focus:outline-none cursor-pointer"
                            onClick={() => setExpandedExerciseId(expandedExerciseId === e.id ? null : e.id)}
                          >
                            <span>{e.name}</span>
                            <span className="text-[#5C6B66] font-normal text-[10px]">({e.intensity} Int)</span>
                          </button>
                          {expandedExerciseId === e.id && (
                            <div className="px-2.5 pb-2 pt-1 border-t border-[#DCE3DF] bg-[#FFFFFF] text-[11px] text-[#5C6B66] leading-relaxed">
                              <p className="italic text-[#8B9893]">{e.description}</p>
                              <p className="mt-1 font-bold text-[10px] text-[#E8532E] uppercase">Target Goal:</p>
                              <p>{e.goal}</p>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-[#8B9893] italic mb-2.5">None recommended.</p>
                  )}
                </div>

                {/* Structured Exercise Feedback */}
                <div className="pt-2 border-t border-[#DCE3DF] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[#8B9893] uppercase">Appropriateness:</span>
                    <div className="flex gap-1">
                      {["appropriate", "needs_review"].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setExerciseFeedbackStatus(exerciseFeedbackStatus === status ? null : status)}
                          className={`text-[10px] px-2 py-0.5 rounded-[5px] font-semibold uppercase border transition-colors cursor-pointer ${
                            exerciseFeedbackStatus === status
                              ? "bg-[#E8532E] text-white border-[#E8532E]"
                              : "bg-[#EDF1EF] text-[#5C6B66] border-[#DCE3DF] hover:text-[#152131]"
                          }`}
                        >
                          {status === "appropriate" ? "Appropriate" : "Needs Review"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows="1"
                    value={exerciseFeedbackNotes}
                    onChange={(e) => setExerciseFeedbackNotes(e.target.value)}
                    placeholder="Exercise suitability notes (optional)…"
                    className="w-full px-2.5 py-1 text-[11px] bg-[#EDF1EF] border border-[#DCE3DF] rounded-[6px] text-[#152131] placeholder:text-[#8B9893] focus:outline-none focus:border-[#152131] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Recommendation appropriateness comment */}
            <div className="pt-2 border-t border-[#DCE3DF]">
              <label className="block text-[12px] font-semibold text-[#152131] mb-1">
                Prescription Appropriateness <span className="text-[#8B9893] font-normal ml-1">(Optional)</span>
              </label>
              <p className="text-[11px] text-[#5C6B66] mb-2 font-medium">Provide feedback regarding recommendation tier suitability for this user's baseline.</p>
              <textarea
                rows="2"
                value={recommendationFeedback}
                onChange={(e) => setRecommendationFeedback(e.target.value)}
                className="w-full px-3 py-2 text-[12.5px] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] text-[#152131] placeholder:text-[#8B9893] transition-colors resize-none leading-relaxed"
                placeholder="e.g. Recommended routine intensity is safe, but low sodium diet constraints need strict parameters…"
              />
            </div>
          </div>

          {/* Registry metadata block */}
          <div className="text-[10px] text-[#8B9893] font-mono flex flex-col gap-0.5 border-t border-[#DCE3DF] pt-3 px-1">
            <div>Calibration Reference Case: {activeCase.case_id}</div>
            <div>Active pipeline: transform_to_model_features (v1.0)</div>
            {activeCase.expert_hss_score !== null && (
              <div>Last reviewed by: {activeCase.reviewer_name || "Expert Reviewer"}</div>
            )}
          </div>
        </div>

        {/* Sticky Footer Actions */}
        <div className="px-6 py-3.5 border-t border-[#DCE3DF] bg-[#FFFFFF] flex justify-end gap-2.5 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] font-semibold text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] border border-[#DCE3DF] rounded-[8px] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 text-[12px] font-semibold text-white bg-[#E8532E] hover:bg-[#C13E20] rounded-[8px] shadow-2xs transition-colors cursor-pointer"
          >
            <Save size={13} /> <span>{activeCase.expert_hss_score !== null ? "Save changes" : "Submit evaluation"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpertEvaluationModal;
