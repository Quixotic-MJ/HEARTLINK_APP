import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Activity, User, HeartPulse, Stethoscope, 
  Apple, Flame, Moon, BookOpen, Clock, AlertTriangle, Users 
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import { apiFetch } from "../../../api";
import { useAuth } from "../../../contexts/AuthContext";
import { formatUserRef } from "../../../utils/formatUserRef";

const normalizeHssTier = (score, tier) => {
  if (score !== undefined && score !== null) {
    if (score >= 80) return "Stable";
    if (score >= 60) return "Moderate";
    if (score >= 50) return "Elevated Risk";
    return "Critical";
  }
  if (!tier) return "N/A";
  const t = tier.toLowerCase();
  if (t.includes("low")) return "Stable";
  if (t.includes("medium") || t.includes("mid") || t.includes("moderate")) return "Moderate";
  if (t.includes("high") || t.includes("elevated")) return "Elevated Risk";
  if (t.includes("critical")) return "Critical";
  return tier;
};

const UserWellnessProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserRole = user?.role || "admin";
  const [data, setData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileRes, timelineRes] = await Promise.all([
          apiFetch(`/api/users/${id}/profile`),
          apiFetch(`/api/admin/users/${id}/timeline`).catch(() => [])
        ]);
        setData(profileRes);
        setTimeline(timelineRes || []);
      } catch (err) {
        console.error("Failed to fetch user profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center gap-2 mb-6 text-slate-400">
          <ArrowLeft size={16} />
          <span className="text-xs uppercase tracking-widest font-semibold">Loading Profile...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="bg-rose-500/10 text-rose-400 p-8 rounded-2xl border border-rose-500/20 flex flex-col items-center justify-center text-center">
          <AlertTriangle size={32} className="mb-3 text-rose-400" />
          <h2 className="text-xl font-bold text-white">User Not Found</h2>
          <p className="text-sm mt-1 text-[#89899C]">The requested wellness profile could not be located.</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-[#E55F37] hover:bg-[#D4542E] text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm cursor-pointer">
            Go Back
          </button>
        </div>
      </AdminLayout>
    );
  }

  const { profile, baselines, care_team } = data;

  const tabs = [
    { id: "overview", label: "Overview", icon: <User size={16} /> },
    { id: "biometrics", label: "Biometrics & Goals", icon: <Activity size={16} /> },
    { id: "lifestyle", label: "Lifestyle & Diet", icon: <Apple size={16} /> },
    { id: "baselines", label: "Health Baselines", icon: <HeartPulse size={16} /> },
    { id: "timeline", label: "Health Timeline", icon: <Clock size={16} /> }
  ];

  return (
    <AdminLayout>
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[#89899C] hover:text-white transition-colors mb-6 group w-fit cursor-pointer"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Back to Users</span>
      </button>

      {/* Main Profile Header Card */}
      <div className="bg-[#1A1A1A] rounded-3xl p-8 border border-white/10 shadow-sm mb-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative overflow-hidden text-white">
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-[#36272B] text-[#E55F37] border border-[#E55F37]/30 flex items-center justify-center text-3xl font-extrabold shadow-md">
            {profile.first_name ? profile.first_name.charAt(0) : "P"}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">User {formatUserRef(profile.id)}</h1>
            <p className="text-[#89899C] font-mono text-sm mt-1">Anonymized for Clinical Privacy</p>
            <div className="flex items-center gap-3 mt-3">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${profile.account_status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                {profile.account_status}
              </span>
              <span className="text-xs font-medium text-[#89899C] flex items-center gap-1.5">
                <Clock size={12} /> Registered: {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Open Case Review (Authorized Roles Only) */}
        {(currentUserRole === "super_admin" || currentUserRole === "admin" || currentUserRole === "medical_expert") && (
          <button
            onClick={() => navigate(`/cases?patient_id=${profile.id}`)}
            className="flex items-center gap-2 bg-[#E55F37] hover:bg-[#D4542E] active:scale-[0.99] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-[#E55F37]/25 shrink-0 cursor-pointer relative z-10"
          >
            <Stethoscope size={14} /> Open Case Review
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 p-2 sticky top-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all mb-1 last:mb-0 cursor-pointer ${
                  activeTab === tab.id 
                  ? "bg-[#E55F37] text-white shadow-sm shadow-[#E55F37]/25 font-bold" 
                  : "text-[#89899C] hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className={`${activeTab === tab.id ? "text-white" : "text-[#89899C]"}`}>
                  {tab.icon}
                </div>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-white mb-6">User Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-white/10">
                  <h3 className="text-xs uppercase tracking-widest text-[#89899C] font-bold mb-4">Contact Info</h3>
                  <div className="space-y-3">
                    <div className="bg-[#21202E]/40 p-4 rounded-xl border border-white/10 flex items-start gap-3">
                      <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-white">Anonymized for Privacy</p>
                        <p className="text-xs text-[#89899C] leading-relaxed mt-1">
                          Email, phone number, and emergency contacts are hidden to protect user privacy. 
                          You may only view health data necessary for case review.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-white/10">
                  <h3 className="text-xs uppercase tracking-widest text-[#89899C] font-bold mb-4">Engagement</h3>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-[#89899C] uppercase tracking-wider mb-1 font-bold">Onboarding Status</p>
                      <p className="font-bold text-white capitalize text-base">{profile.onboarding_status}</p>
                    </div>
                    <Activity size={24} className="text-slate-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BIOMETRICS */}
          {activeTab === "biometrics" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-white mb-6">Biometrics & Goals</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/10 flex flex-col justify-center items-center text-center">
                  <p className="text-[10px] text-[#89899C] uppercase tracking-widest font-bold mb-2">Height</p>
                  <p className="text-2xl font-black text-white">{profile.height_cm} <span className="text-xs text-[#89899C] font-medium">cm</span></p>
                </div>
                <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/10 flex flex-col justify-center items-center text-center">
                  <p className="text-[10px] text-[#89899C] uppercase tracking-widest font-bold mb-2">Weight</p>
                  <p className="text-2xl font-black text-white">{profile.weight_kg} <span className="text-xs text-[#89899C] font-medium">kg</span></p>
                </div>
                <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/10 flex flex-col justify-center items-center text-center">
                  <p className="text-[10px] text-[#89899C] uppercase tracking-widest font-bold mb-2">Sex</p>
                  <p className="text-xl font-black text-white capitalize">{profile.sex}</p>
                </div>
                <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/10 flex flex-col justify-center items-center text-center">
                  <p className="text-[10px] text-[#89899C] uppercase tracking-widest font-bold mb-2">Age</p>
                  <p className="text-2xl font-black text-white">
                    {profile.date_of_birth ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-white/10">
                <h3 className="text-xs uppercase tracking-widest text-[#89899C] font-bold mb-4 flex items-center gap-2">
                  <Flame size={14} className="text-[#E55F37]" /> Primary Health Goals
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.health_goals && profile.health_goals.length > 0 ? (
                    profile.health_goals.map(goal => (
                      <span key={goal} className="px-4 py-2 bg-[#21202E] border border-white/10 rounded-xl text-xs font-bold text-white capitalize">
                        {goal}
                      </span>
                    ))
                  ) : (
                    <p className="text-[#89899C] text-xs">No specific health goals logged.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LIFESTYLE & DIET */}
          {activeTab === "lifestyle" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-white mb-6">Lifestyle & Diet Profile</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-white/10">
                  <h3 className="text-xs uppercase tracking-widest text-[#89899C] font-bold mb-5 flex items-center gap-2">
                    <Moon size={14} className="text-indigo-400" /> Lifestyle Habits
                  </h3>
                  {baselines.lifestyle ? (
                    <div className="space-y-4 text-xs">
                      <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="font-medium text-[#89899C]">Smoking Status</span>
                        <span className="font-bold text-white capitalize">{baselines.lifestyle.smoking_status}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="font-medium text-[#89899C]">Avg. Sleep</span>
                        <span className="font-bold text-white">{baselines.lifestyle.avg_sleep_hours} Hours</span>
                      </div>
                      {baselines.lifestyle.family_history !== undefined && (
                        <div className="flex justify-between items-center py-2">
                          <span className="font-medium text-[#89899C]">Family History</span>
                          <span className="font-bold text-white">{baselines.lifestyle.family_history ? "Yes" : "No"}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[#89899C] text-xs">No lifestyle baseline available.</p>
                  )}
                </div>

                <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-white/10">
                  <h3 className="text-xs uppercase tracking-widest text-[#89899C] font-bold mb-5 flex items-center gap-2">
                    <Apple size={14} className="text-emerald-400" /> Dietary Baseline
                  </h3>
                  {baselines.dietary ? (
                    <div className="space-y-4 text-xs">
                      <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="font-medium text-[#89899C]">Dietary Practice</span>
                        <span className="font-bold text-white">{baselines.dietary.dietary_practice}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="font-medium text-[#89899C]">Sodium Frequency</span>
                        <span className="font-bold text-white capitalize">{baselines.dietary.sodium_frequency}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="font-medium text-[#89899C]">Allergies</span>
                        <span className="font-bold text-white">
                          {baselines.dietary.allergies?.join(', ') || "None"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[#89899C] text-xs">No dietary baseline available.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* HEALTH BASELINES */}
          {activeTab === "baselines" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-white mb-6">Health Baselines</h2>
              {baselines.clinical ? (
                <>
                  <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-white/10 mb-6">
                    <h3 className="text-xs uppercase tracking-widest text-[#89899C] font-bold mb-4">Core Vitals</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <p className="text-[10px] text-[#89899C] uppercase tracking-wider mb-1 font-bold">Resting BP</p>
                        <p className="text-2xl font-black text-white">{baselines.clinical.resting_bp_mmhg || "--"} <span className="text-xs text-[#89899C] font-normal">mmHg</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#89899C] uppercase tracking-wider mb-1 font-bold">Max HR</p>
                        <p className="text-2xl font-black text-white">{baselines.clinical.max_heart_rate_bpm || "--"} <span className="text-xs text-[#89899C] font-normal">bpm</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#89899C] uppercase tracking-wider mb-1 font-bold">Cholesterol</p>
                        <p className="text-2xl font-black text-white">{baselines.clinical.serum_cholesterol || "--"} <span className="text-xs text-[#89899C] font-normal">mg/dL</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#89899C] uppercase tracking-wider mb-1 font-bold">Fasting Blood Sugar</p>
                        <p className="text-2xl font-black text-white">{baselines.clinical.fasting_blood_sugar ? "Elevated" : "Normal"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-white/10">
                      <h3 className="text-xs uppercase tracking-widest text-[#89899C] font-bold mb-4">Reported Health Conditions</h3>
                      {baselines.clinical.diagnosed_conditions && baselines.clinical.diagnosed_conditions.length > 0 ? (
                        <ul className="space-y-2">
                          {baselines.clinical.diagnosed_conditions.map((cond, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs font-bold text-slate-200 before:content-[''] before:w-1.5 before:h-1.5 before:bg-[#E55F37] before:rounded-full capitalize">
                              {cond}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-[#89899C]">None reported.</p>
                      )}
                    </div>
                    <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-white/10">
                      <h3 className="text-xs uppercase tracking-widest text-[#89899C] font-bold mb-4">Health Flags</h3>
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between items-center py-1">
                          <span className="font-medium text-[#89899C]">On Medication</span>
                          <span className="font-bold text-white">{baselines.clinical.on_medication ? "Yes" : "No"}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="font-medium text-[#89899C]">Chest Pain Type</span>
                          <span className="font-bold text-white">{baselines.clinical.chest_pain_type || "None"}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="font-medium text-[#89899C]">Exercise Angina</span>
                          <span className="font-bold text-white">{baselines.clinical.exercise_angina ? "Yes" : "No"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-[#1A1A1A] p-8 rounded-2xl border border-white/10 flex flex-col items-center text-center">
                  <Stethoscope size={24} className="text-slate-500 mb-2" />
                  <p className="text-[#89899C] text-xs font-medium">No health baselines recorded yet.</p>
                </div>
              )}
            </div>
          )}

          {/* HEALTH TIMELINE */}
          {activeTab === "timeline" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Clock size={20} className="text-[#E55F37]" />
                Chronological Health Timeline
              </h2>
              
              <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-white/10 relative">
                {timeline && timeline.length > 0 ? (
                  <div className="relative border-l border-white/10 ml-3 md:ml-4 space-y-8 pb-4">
                    {timeline.map((item, index) => {
                      const normalizeTimelineType = (type) => {
                        if (!type) return "";
                        const lower = type.toLowerCase();
                        if (lower === "vitals") return "vital";
                        if (lower === "symptoms") return "symptom";
                        return lower;
                      };
                      const normalizedType = normalizeTimelineType(item.type);

                      let iconColor = "bg-[#21202E] text-slate-400 border-white/10";
                      let Icon = Activity;
                      let typeLabel = "Log";
                      
                      if (normalizedType === "vital") {
                        iconColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                        Icon = HeartPulse;
                        typeLabel = "Vitals";
                      } else if (normalizedType === "symptom") {
                        iconColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                        Icon = AlertTriangle;
                        typeLabel = "Symptoms";
                      } else if (normalizedType === "meal") {
                        iconColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        Icon = Apple;
                        typeLabel = "Meal";
                      } else if (normalizedType === "exercise") {
                        iconColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                        Icon = Flame;
                        typeLabel = "Exercise";
                      } else if (normalizedType === "sleep") {
                        iconColor = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                        Icon = Moon;
                        typeLabel = "Sleep";
                      } else if (normalizedType === "hss") {
                        iconColor = "bg-[#36272B] text-[#E55F37] border-[#E55F37]/30";
                        Icon = ShieldCheck;
                        typeLabel = "HSS Update";
                      }

                      return (
                        <div key={index} className="relative pl-6 md:pl-8">
                          {/* Timeline Dot */}
                          <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full border flex items-center justify-center ${iconColor}`}>
                            <Icon size={14} />
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#89899C]">{typeLabel}</span>
                            <span className="text-xs text-slate-500 font-medium">{new Date(item.timestamp).toLocaleString()}</span>
                          </div>
                          
                          <div className="bg-[#161616] p-4 rounded-xl border border-white/10">
                            {normalizedType === "vital" && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {item.data.systolic && item.data.diastolic && (
                                  <div>
                                    <p className="text-[10px] text-[#89899C] uppercase tracking-wider mb-1 font-bold">Blood Pressure</p>
                                    <p className="text-sm font-bold text-white">{item.data.systolic}/{item.data.diastolic} <span className="text-[10px] text-[#89899C] font-normal">mmHg</span></p>
                                  </div>
                                )}
                                {item.data.heart_rate && (
                                  <div>
                                    <p className="text-[10px] text-[#89899C] uppercase tracking-wider mb-1 font-bold">Heart Rate</p>
                                    <p className="text-sm font-bold text-white">{item.data.heart_rate} <span className="text-[10px] text-[#89899C] font-normal">bpm</span></p>
                                  </div>
                                )}
                                {item.data.blood_sugar && (
                                  <div>
                                    <p className="text-[10px] text-[#89899C] uppercase tracking-wider mb-1 font-bold">Blood Sugar</p>
                                    <p className="text-sm font-bold text-white">{item.data.blood_sugar} <span className="text-[10px] text-[#89899C] font-normal">mg/dL</span></p>
                                  </div>
                                )}
                                {item.data.weight_kg && (
                                  <div>
                                    <p className="text-[10px] text-[#89899C] uppercase tracking-wider mb-1 font-bold">Weight</p>
                                    <p className="text-sm font-bold text-white">{item.data.weight_kg} <span className="text-[10px] text-[#89899C] font-normal">kg</span></p>
                                  </div>
                                )}
                              </div>
                            )}

                            {normalizedType === "symptom" && (
                              <div>
                                <p className="text-[10px] text-[#89899C] uppercase tracking-wider mb-1 font-bold">Symptoms Reported</p>
                                <p className="text-sm font-bold text-white capitalize">{item.data.symptoms?.join(", ") || "No specific symptoms"}</p>
                                {item.data.severity_map && Object.keys(item.data.severity_map).length > 0 && (
                                  <p className="text-xs text-[#89899C] mt-1 font-medium">
                                    Severity: {Object.entries(item.data.severity_map).map(([k, v]) => `${k.replace('_', ' ')} (${v})`).join(", ")}
                                  </p>
                                )}
                                {item.data.context && <p className="text-xs text-slate-400 mt-2 italic font-medium">Context: "{item.data.context}"</p>}
                              </div>
                            )}

                            {normalizedType === "meal" && (
                              <div>
                                <p className="text-sm font-bold text-white mb-1">{item.data.meal_name || "Logged Meal"}</p>
                                <p className="text-xs text-[#89899C] font-medium">
                                  {item.data.calories ? `${item.data.calories} kcal` : ""}
                                  {item.data.calories && item.data.sodium_mg ? " | " : ""}
                                  {item.data.sodium_mg ? `Sodium: ${item.data.sodium_mg} mg` : ""}
                                </p>
                              </div>
                            )}

                            {normalizedType === "exercise" && (
                              <div>
                                <p className="text-sm font-bold text-white mb-1">{item.data.routine_name || "Custom Exercise"}</p>
                                <div className="flex gap-4 mt-2">
                                  <p className="text-xs text-[#89899C]"><span className="font-bold text-white">{item.data.duration_minutes}</span> min duration</p>
                                  {item.data.status && (
                                    <p className="text-xs text-[#89899C] capitalize">Status: <span className="font-bold text-white">{item.data.status}</span></p>
                                  )}
                                </div>
                              </div>
                            )}

                            {normalizedType === "sleep" && (
                              <div>
                                <div className="flex gap-4">
                                  <p className="text-xs text-[#89899C]"><span className="font-bold text-white">{item.data.duration_hours}</span> hours slept</p>
                                  <p className="text-xs text-[#89899C] capitalize">Quality: <span className="font-bold text-white">{item.data.quality}</span></p>
                                </div>
                              </div>
                            )}

                            {normalizedType === "hss" && (
                              <div className="flex items-center gap-4">
                                <div>
                                  <p className="text-[10px] text-[#89899C] uppercase tracking-wider mb-1 font-bold">HSS Tier Updated</p>
                                  <p className="text-sm font-bold text-white">{normalizeHssTier(item.data.score, item.data.tier)}</p>
                                </div>
                                <div className="h-8 w-px bg-white/10"></div>
                                <div>
                                  <p className="text-[10px] text-[#89899C] uppercase tracking-wider mb-1 font-bold">Score</p>
                                  <p className="text-sm font-bold text-emerald-400">{item.data.score}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Clock size={32} className="text-slate-600 mb-3" />
                    <h3 className="text-sm font-bold text-white">No Timeline Data</h3>
                    <p className="text-xs text-[#89899C] mt-1 max-w-sm">
                      There are no recent logs, vital readings, or HSS updates for this user.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserWellnessProfile;

